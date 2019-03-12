'use strict';

var FeedParser = require('feedparser');
var fs = require('fs');
var entities = require('html-entities').AllHtmlEntities;
var request = require('request');
var striptags = require('striptags');
var constants = require('./constants');

var feedParser = function () {
    return {
        getFeed : function (fileName, callback) {
            var url = constants.sermonUrl;
            var req = request(url);
            var feedparser = new FeedParser(null);
            var items = [];

            req.on('response', function (res) {
                var stream = this;
                if (res.statusCode === 200) {
                    stream.pipe(feedparser);
                } else {
                    return stream.emit('error', new Error('Bad status code'));
                }
            });

            req.on('error', function (err) {
                return callback(err, null);
            });

            // Received stream. parse through the stream and create JSON Objects for each item
            feedparser.on('readable', function() {
                var stream = this;
                var item;
                while (item = stream.read()) {
                    var feedItem = {};
                    // Process feedItem item and push it to items data if it exists
                    if (item['title'] && item['date']) {
                        feedItem['title'] = item['title'];
                        feedItem['title'] = entities.decode(striptags(feedItem['title']));
                        feedItem['title'] = feedItem['title'].trim();
                        feedItem['title'] = feedItem['title'].replace(/[&]/g,'and').replace(/[<>]/g,'');
                        
                        feedItem['date'] = new Date(item['date']).toDateString();

                        if (item['description']) {
                            feedItem['description'] = item['description'];
                            feedItem['description'] = entities.decode(striptags(feedItem['description']));
                            feedItem['description'] = feedItem['description'].trim();
                            feedItem['description'] = feedItem['description'].replace(/[&]/g,'and').replace(/[<>]/g,'').replace(/[“]/g,'').replace(/["]/g,'');
                        }

                        if (item['link']) {
                            feedItem['link'] = item['link'];
                        }

                        if (item['enclosures'][0].url) {
                            feedItem['url'] = item['enclosures'][0].url;
                            feedItem['url'] = feedItem['url'].replace('http','https');
                        }

                        if (item.image.url) {
                            feedItem['imageUrl'] = {};
                            feedItem.imageUrl['smallImageUrl'] = item.image.url.replace('http:','https:');
                            feedItem.imageUrl['largeImageUrl'] = item.image.url.replace('http:','https:');
                        }
                        
                        items.push(feedItem);
                    }
                }
            });

            // All items parsed. Store items in S3 and return items
            feedparser.on('end', function () {
                var count = 0;
                items.sort(function (a, b) {
                    return new Date(b.date) - new Date(a.date);
                });
                items.forEach(function (feedItem) {
                    feedItem['count'] = count++;
                });
                stringifyFeeds(items, (feedData) => {
                    callback(null, feedData, items);
                });
            });

            feedparser.on('error', function(err) {
                callback(err, null);
            });
        },
        stringifyItems : function (items, callback) {
            stringifyFeeds(items, function (feedData) {
                callback(feedData);
            })
        }
    };
}();

module.exports = feedParser;

function stringifyFeeds(items, callback) {
    // Structure items before storing into S3 file.
    var feedData = '[';
    for (var i = 0; i < items.length; i++) {
        feedData += JSON.stringify(items[i]) + ', ';
    }
    var dataLength = feedData.length;
    feedData = feedData.substring(0, dataLength-2) + ']';
    callback(feedData);
};
