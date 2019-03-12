'use strict';

var fs = require('fs');
var entities = require('html-entities').AllHtmlEntities;
var request = require('request');
var striptags = require('striptags');
var constants = require('./constants');
var htmlparser = require('htmlparser2');

var htmlParser = function () {
    return {
        getHTML : function (fileName, callback) {
            var url = constants.contactsUrl;
            var outputText = '';
            request(url, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    //console.log(body) // Show the HTML for the Google homepage. 
                    var output = false;
                    var parser = new htmlparser.Parser({
                        onopentag: function(tagname, attribs){
                            if(tagname === "div" && attribs.class === "text-content editable text-1"){
                                output = true;
                            }
                        },
                        ontext: function(text){
                            if(output == true){
                                console.log(text);
                                outputText += text;
                            }
                            
                        },
                        onclosetag: function(tagname){
                            if(tagname === "div") {
                                output = false;
                            }
                        }
                    }, {decodeEntities: true});
                    parser.write(body);
                    parser.end();
                    callback(null, body, outputText); 
                }
            });   
        }
    };
}();

module.exports = htmlParser;
