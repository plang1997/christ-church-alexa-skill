'use strict'

var Alexa = require('alexa-sdk');
var feedHelper = require('./feedHelper');
var htmlHelper = require('./htmlHelper');
var constants = require('./constants');

/**
 * This skill built with the Amazon Alexa Skills Kit.
 */

// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    var alexa = Alexa.handler(event, context);
    //alexa.appId = "amzn1.ask.skill.8e4ca0ff-3eef-43a7-ad75-145e8a6c6d01";
    alexa.registerHandlers(handlers);
    alexa.execute();
};

//////////////////////////////////

var handlers = {
    'LaunchRequest' : function () {
        var cardTitle = 'Welcome to Christ Church';
        var speechOutput = 'Welcome to the Christ Church Skill. ' +
            'You can say play the latest sermon, list sermons, or main menu.';
        var repromptText = 'Would you like me to play the latest sermon?';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady');
    },
    'MainMenuIntent' : function () {
        var cardTitle = 'Christ Church Main Menu';
        var speechOutput = 'Main Menu options are: ' +
            'Upcoming Events, Service Times, Latest Sermons, and Contact Information.';
        var repromptText = 'Again you can say, Upcoming Events, Service Times, Latest Sermons, and Contact Information.';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady');
    },
    'UpcomingEventsIntent' : function () {
        var cardTitle = 'Christ Church Upcoming Events';
        var speechOutput = 'Upcoming Events at Christ Church are, ' +
            'No upcoming events found.';
        var repromptText = 'Again Upcoming Events at Christ Church are, ' +
            'No upcoming events found';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady');
    },
    'ContactInformationIntent' : function () {
        fetchHTML.call(this, (html, outputText) => {
            var cardTitle = 'Christ Church Contact Information';
            var speechOutput = outputText;
            var repromptText = outputText;
            this.emit(':ask', speechOutput, repromptText);
        });
    },
    'OldContactInformationIntent' : function () {
        var cardTitle = 'Christ Church Contact Information';
        var speechOutput = 'To Contact Christ Church ' +
            'in East Moline call (309) 755-2508, or Silvis call (309) 792-0977.';
        var repromptText = 'Again for East Moline call (309)-755-2508, or Silvis call (309) 792-0977.';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady');
    },
    'ServiceTimesIntent' : function () {
        var cardTitle = 'Christ Church Service Times';
        var speechOutput = 'Christ Church East Moline Campus services are Saturdays at 5pm, ' +
            'and Traditional Worship on Sunday at 8am and 9:15am, as well as a contemporary service and sunday school at 10:35am. ' +
            'Silvis Campus has a Traditional Service at 9:15am, and a Contemporary Service at 10:35am.';
        var repromptText = 'Again Christ Church East Moline Campus services are Saturdays at 5pm, ' +
            'and Traditional Worship on Sunday at 8am and 9:15am, as well as a contemporary service and sunday school at 10:35am. ' +
            'Silvis Campus has a Traditional Service at 9:15am, and a Contemporary Service at 10:35am.';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady'); 
    },
    'LatestSermonIntent' : function () {
        var cardTitle = 'Christ Church Latest Sermon';
        fetchFeed.call(this, (data, items) => {
            var cardTitle = 'Christ Church Latest Sermon';
            var speechOutput = 'The latest sermon is ' + 
                items[0].title + ' by Christ Church given on ' + items[0].date + ', ' +
            'Would you like me to play it?';
            const repromptText = 'Would you like me to play the latest sermon?';
            this.emit(':askWithCard', speechOutput, repromptText, cardTitle, speechOutput, null);
        });
    },
    'ListSermonsIntent' : function () {
        fetchFeed.call(this, (data, items) => {
            //this.attributes['items'] = items;
            var itemsPerPage = 3;
            this.attributes['listIndex'] = 0;
            var itemList = sermonListHelper(items, this.attributes.listIndex);
            var itemCardList = sermonCardListHelper(items, this.attributes.listIndex)
            var cardTitle = 'Christ Church Sermon List';
            var speechOutput = 'The last three sermons are ' + itemList;
            var cardContent = 'The last three sermons are: \n' + itemCardList;
            var repromptText = 'Would you like me to play the latest sermon';
            this.emit(':askWithCard', speechOutput, repromptText, cardTitle, cardContent, null);
        });
    },
    'AMAZON.YesIntent' : function () {
        fetchFeed.call(this, (data, items) => {  
            this.attributes['latestPodcastTitle'] = items[0].title;
            this.attributes['latestPodcastUrl'] = items[0].url;
            this.attributes['latestPodcastDesc'] = items[0].description;
            controller.play.call(this);
        });         
    },
    'AMAZON.NoIntent' : function () {
        var speechOutput = 'Ok then. ' +
            'If you would like to hear the list of sermons, say list sermons, or say main menut for other options.';
        this.response.speak(speechOutput);
        this.emit(':responseReady');
    },
    'PlaySermonByIndexIntent' : function () {
        var index = 0;
        if (this.event.request.intent.slots.Index && this.event.request.intent.slots.Index.value) {
            index = parseInt(this.event.request.intent.slots.Index.value);
            index--;
        }
        var cardTitle = 'Playing Latest Sermon';
 
        this.attributes['sermonFeedFile'] = 'sermon_feed.json';
        this.attributes['offset'] = 0;
        
        fetchFeed.call(this, (data, items) => {  
            this.attributes['latestPodcastTitle'] = items[index].title;
            this.attributes['latestPodcastUrl'] = items[index].url;
            this.attributes['latestPodcastDesc'] = items[index].description;
            controller.play.call(this);
        });   
    },
    'PlayLatestSermonIntent' : function () {        
        var cardTitle = 'Playing Latest Sermon';
        this.attributes['sermonFeedFile'] = 'sermon_feed.json';
        this.attributes['offset'] = 0;
        fetchFeed.call(this, (data, items) => {  
            this.attributes['latestPodcastTitle'] = items[0].title;
            this.attributes['latestPodcastUrl'] = items[0].url;
            this.attributes['latestPodcastDesc'] = items[0].description;
            this.attributes['latestPodcastImage'] = items[0].imageUrl;
            controller.play.call(this);
        });   
    },
    'AMAZON.NextIntent' : function () { controller.playNext.call(this) },
    'AMAZON.PreviousIntent' : function () { controller.playPrevious.call(this) },
    'AMAZON.PauseIntent' : function () { controller.pause.call(this) },
    'AMAZON.StopIntent' : function () { controller.stop.call(this) },
    'AMAZON.CancelIntent' : function () { controller.stop.call(this) },
    'AMAZON.ResumeIntent' : function () { controller.resume.call(this) },
    'AMAZON.LoopOnIntent' : function () { controller.loopOn.call(this) },
    'AMAZON.LoopOffIntent' : function () { controller.loopOff.call(this) },
    'AMAZON.ShuffleOnIntent' : function () { controller.shuffleOn.call(this) },
    'AMAZON.ShuffleOffIntent' : function () { controller.shuffleOff.call(this) },
    'AMAZON.StartOverIntent' : function () { controller.startOver.call(this) },
    'AMAZON.HelpIntent' : function () {
        // This will called while audio is playing and a user says "ask <invocation_name> for help"
        var cardTitle = 'Christ Church Help';
        var speechOutput = 'Ok, I can help you with the Christ Church Skill. ' +
            'You can say help, what is the latest sermon, or play the latest sermon, stop or cancel.';
        var repromptText = 'You can say help, what is the latest sermon, or play the latest sermon, stop or cancel.';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady');
    },
    'SessionEndedRequest' : function () {
        var cardTitle = 'Session Ended';
        var speechOutput = 'Thank you for using the Christ Church skill, making Christ Famous in the Quad Cities!';
        // Setting this to true ends the session and exits the skill.
        this.emit(':tellWithCard', speechOutput, cardTitle, speechOutput, null);
    },
    'Unhandled' : function () {
        var cardTitle = 'Christ Church Unhandled';
        var speechOutput = 'Sorry, I could not understand. You can say, Next or Previous to navigate through the playlist.';
        var repromptText = 'Sorry, I could not understand. You can say, Next or Previous to navigate through the playlist.';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit('responseReady');
    }
};

function fetchHTML(callback) {
    var fileNameKey = 'fileName';
    var versionIdKey = 'versionId';

    // Call feedHelper to fetch feeds
    htmlHelper.getHTML(null, (err, html, data) => {
        if (err) {
            this.emit('reportError');
        } else {
            if (data) {
                this.attributes['htmlLength'] = html.length;
                this.attributes['outputLength'] = data.length;
                // Call new item notification to compute number of new items available
                callback(html, data);
            } else {
                console.log('HTML parsed is empty');
                this.emit('htmlEmptyError');
            }
        }
    });
};

function fetchFeed(callback) {
    var fileNameKey = 'fileName';
    var versionIdKey = 'versionId';

    // Call feedHelper to fetch feeds
    feedHelper.getFeed(this.attributes[fileNameKey],(err, data, items) => {
        if (err) {
            this.emit('reportError');
        } else {
            if (data) {
                this.attributes['feedLength'] = items.length;
                // Call new item notification to compute number of new items available
                callback(data, items);
            } else {
                console.log('Feed parsed is empty');
                this.emit('feedEmptyError');
            }
        }
    });
};

function sermonListHelper(items, listIndex) {
    var itemList = '';
    if(listIndex) { 
         var index = listIndex;
    } else {
        var index = 0;
    }
    while(index < constants.sermonsPerPage) {
        itemList += (++index) + constants.breakTime['100'] + items[index].title + constants.breakTime['200'];
    };
    itemList += ' Which one would you like to hear?';
    return itemList;
};

function sermonCardListHelper(items, listIndex) {
    var itemCardList = '';
    if(listIndex) { 
         var index = listIndex;
    } else {
        var index = 0;
    }
    while(index < constants.sermonsPerPage) {
        itemCardList += (++index) + ') ' + items[index].title + ' \n';
    };
    itemCardList += ' Which one would you like to hear?';
    return itemCardList;
};

var controller = function () {
    return {
        play: function () {
            /*
             *  Using the function to begin playing audio when:
             *      Play Audio intent invoked.
             *      Resuming audio when stopped/paused.
             *      Next/Previous commands issued.
             */
        
            if (this.attributes['playbackFinished']) {
                // Reset to top of the playlist when reached end.
                this.attributes['index'] = 0;
                this.attributes['offsetInMilliseconds'] = 0;
                this.attributes['playbackIndexChanged'] = true;
                this.attributes['playbackFinished'] = false;
            }
            var token = String(0);
            var playBehavior = 'REPLACE_ALL';
            var offsetInMilliseconds = 0;
            var index = this.attributes[0];
            // Since play behavior is REPLACE_ALL, enqueuedToken attribute need to be set to null.
            this.attributes['enqueuedToken'] = null;

            var cardTitle = 'Playing ' + this.attributes.latestPodcastTitle;
            var cardContent = 'Playing ' + this.attributes.latestPodcastDesc;
            this.response.cardRenderer(cardTitle, cardContent, null);
            this.response.audioPlayerPlay(playBehavior, this.attributes.latestPodcastUrl, token, null, offsetInMilliseconds);
            this.emit(':responseReady'); 
        },
        pause: function () {        
            const cardTitle = 'Pausing Latest Sermon';
            const speechOutput = 'Paused latest sermon. ' +
                'You can say resume, main menu, stop, or cancel.';
            const repromptText = 'You can say resume, main menu, stop, or cancel.';
            this.response.audioPlayerStop();
            this.emit(':responseReady');
        },
        resume: function () {
            var cardTitle = 'Resume Latest Sermon';
            var token = String(0);
            var playBehavior = 'REPLACE_ALL';
            var offsetInMilliseconds = 0;
            var index = this.attributes['index'];
            // Since play behavior is REPLACE_ALL, enqueuedToken attribute need to be set to null.
            this.attributes['enqueuedToken'] = null;

            var cardTitle = 'Rusuming ' + this.attributes.latestPodcastTitle;
            var cardContent = 'Resuming ' + this.attributes.latestPodcastTitle;
            const speechOutput = 'Resuming ' + items[index].title + ', by Christ Church, from ' + items[index].date; 
            this.response.cardRenderer(cardTitle, cardContent, null);
            this.response.audioPlayerPlay(playBehavior, this.attributes.latestPodcastUrl, token, null, offsetInMilliseconds);
            this.emit(':responseReady'); 
        },
        stop: function () {
            /*
             *  Issuing AudioPlayer.Stop directive to stop the audio.
             *  Attributes already stored when AudioPlayer.Stopped request received.
             */
            var cardTitle = 'Good Bye!'
            var speechOutput = 'Thank you for using the Christ Church skill, making Christ Famous in the Quad Cities!';
            this.response.audioPlayerStop();
            this.emit(':tellWithCard', speechOutput, cardTitle, speechOutput, null);
        },
        playNext: function () {
            /*
             *  Called when AMAZON.NextIntent or PlaybackController.NextCommandIssued is invoked.
             *  Index is computed using token stored when AudioPlayer.PlaybackStopped command is received.
             *  If reached at the end of the playlist, choose behavior based on "loop" flag.
             */
            var index = this.attributes['index'];
            index += 1;
            // Check for last audio file.
            if (index === audioData.length) {
                if (this.attributes['loop']) {
                    index = 0;
                } else {
                    // Reached at the end. Thus reset state to start mode and stop playing.
                    this.handler.state = constants.states.START_MODE;

                    var message = 'You have reached at the end of the playlist.';
                    this.response.speak(message).audioPlayerStop();
                    return this.emit(':responseReady');
                }
            }
            // Set values to attributes.
            this.attributes['index'] = index;
            this.attributes['offsetInMilliseconds'] = 0;
            this.attributes['playbackIndexChanged'] = true;

            controller.play.call(this);
        },
        playPrevious: function () {
            /*
             *  Called when AMAZON.PreviousIntent or PlaybackController.PreviousCommandIssued is invoked.
             *  Index is computed using token stored when AudioPlayer.PlaybackStopped command is received.
             *  If reached at the end of the playlist, choose behavior based on "loop" flag.
             */
            var index = this.attributes['index'];
            index -= 1;
            // Check for last audio file.
            if (index === -1) {
                if (this.attributes['loop']) {
                    index = audioData.length - 1;
                } else {
                    // Reached at the end. Thus reset state to start mode and stop playing.
                    this.handler.state = constants.states.START_MODE;

                    var message = 'You have reached at the start of the playlist.';
                    this.response.speak(message).audioPlayerStop();
                    return this.emit(':responseReady');
                }
            }
            // Set values to attributes.
            this.attributes['index'] = index;
            this.attributes['offsetInMilliseconds'] = 0;
            this.attributes['playbackIndexChanged'] = true;

            controller.play.call(this);
        },
        loopOn: function () {
            // Turn on loop play.
            this.attributes['loop'] = true;
            var message = 'Loop turned on.';
            this.response.speak(message);
            this.emit(':responseReady');
        },
        loopOff: function () {
            // Turn off looping
            this.attributes['loop'] = false;
            var message = 'Loop turned off.';
            this.response.speak(message);
            this.emit(':responseReady');
        },
        shuffleOn: function () {
            // Turn on shuffle play.
            this.attributes['shuffle'] = true;
            shuffleOrder((newOrder) => {
                // Play order have been shuffled. Re-initializing indices and playing first song in shuffled order.
                this.attributes['playOrder'] = newOrder;
                this.attributes['index'] = 0;
                this.attributes['offsetInMilliseconds'] = 0;
                this.attributes['playbackIndexChanged'] = true;
                controller.play.call(this);
            });
        },
        shuffleOff: function () {
            // Turn off shuffle play. 
            if (this.attributes['shuffle']) {
                this.attributes['shuffle'] = false;
                // Although changing index, no change in audio file being played as the change is to account for reordering playOrder
                this.attributes['index'] = this.attributes['playOrder'][this.attributes['index']];
                this.attributes['playOrder'] = Array.apply(null, {length: audioData.length}).map(Number.call, Number);
            }
            controller.play.call(this);
        },
        startOver: function () {
            // Start over the current audio file.
            this.attributes['offsetInMilliseconds'] = 0;
            controller.play.call(this);
        },
        reset: function () {
            // Reset to top of the playlist.
            this.attributes['index'] = 0;
            this.attributes['offsetInMilliseconds'] = 0;
            this.attributes['playbackIndexChanged'] = true;
            controller.play.call(this);
        }
    }
}();