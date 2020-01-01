'use strict'

const Alexa = require('alexa-sdk');
const feedHelper = require('./feedHelper');
const constants = require('./constants');
const audioEventHandlers = require('./audioEventHandlers');

/**
 * This skill built with the Amazon Alexa Skills Kit.
 */

// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    const alexa = Alexa.handler(event, context);
    alexa.appId = constants.appId;
    alexa.dynamoDBTableName = constants.dynamoDBTableName;
    alexa.registerHandlers(
        handlers,
        audioEventHandlers,
        startModeEventHandlers
    );
    alexa.execute();
};

//////////////////////////////////

let feed = [];
exports.feed = feed;

const startModeEventHandlers = Alexa.CreateStateHandler(constants.states.START_MODE, {
    'Unhandled': function () {
        console.log('Unhandled');
        const cardTitle = 'Christ Church Unhandled';
        const speechOutput = 'Sorry, I could not understand. You can say, Next or Previous to navigate through the playlist.';
        const repromptText = 'Sorry, I could not understand. You can say, Next or Previous to navigate through the playlist.';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady');
    }
});

exports.startModeEventHandlers = startModeEventHandlers;

const handlers = {
    'NewSession' : function () {
        fetchFeed.call(this, constants.feedFileName, constants.sermonUrl, (data, items) => {
            feed = items;
            if (this.event.request.type === 'LaunchRequest') {
                this.emit('LaunchRequest');
            } else if (this.event.request.type === 'IntentRequest') {
                let intentName = this.event.request.intent.name;
                console.log('NewSession with intent: ', intentName);
                this.emitWithState(intentName);
            } else {
                console.log('Unexpected request : ' + this.event.request.type);
            }
        });
    },
    'LaunchRequest': function () {
        console.log('LaunchRequest');
        const cardTitle = 'Welcome to Christ Church';
        const speechOutput = 'Welcome to the Christ Church skill. You can say ' +
            'play the latest sermon, ' +
            'list sermons, ' +
            'upcoming events, ' +
            'contact information, ' +
            'service times, ' +
            'or main menu.';
        const repromptText = 'Would you like me to play the latest sermon?';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady');
    },
    'MainMenuIntent': function () {
        console.log('MainMenuIntent');
        const cardTitle = 'Christ Church Main Menu';
        const speechOutput = 'Main Menu options are: play the latest sermon, list sermons, upcoming vents, contact information, and service times. Or you can say Cancel to exit the skill.';
        const repromptText = 'Again you can say: latest sermon, play the latest sermon, upcoming vents, contact information, and service times. Or you can say Cancel to exit the skill.';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady');
    },
    'UpcomingEventsIntent': function () {
        console.log('UpcomingEventsIntent');
        const cardTitle = 'Christ Church Upcoming Events';
        const speechOutput = 'Sorry, but Upcoming Events is not ready for use yet, please check back in the future.';
        this.response.speak(speechOutput).cardRenderer(cardTitle, speechOutput, null);
        this.emit('MainMenuIntent');
    },
    'ContactInformationIntent': function () {
        console.log('ContactInformationIntent');
        const cardTitle = 'Christ Church Contact Information';
        const speechOutput = 'To Contact Christ Church ' +
            'in East Moline call (309) 755-2508, or Silvis call (309) 792-0977.';
        const repromptText = 'Again for East Moline call (309)-755-2508, or Silvis call (309) 792-0977.';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady');
    },
    'ServiceTimesIntent': function () {
        console.log('ServiceTimesIntent');
        const cardTitle = 'Christ Church Service Times';
        const speechOutput = 'Christ Church East Moline Campus services are Blue Grass service Saturdays at 5pm, ' +
            'and Traditional Worship on Sunday at 8am and 9:15am, as well as a contemporary service and sunday school at 10:35am. ' +
            'Silvis Campus has a Traditional Service at 10:45am.';
        const repromptText = 'Again Christ Church East Moline Campus services are Blue Grass service Saturdays at 5pm, ' +
            'and Traditional Worship on Sunday at 8am and 9:15am, as well as a contemporary service and sunday school at 10:35am. ' +
            'Silvis Campus has a Traditional Service at 10:45am.';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady');
    },
    'ListSermonsIntent': function () {
        console.log('ListSermonsIntent');
        const itemList = sermonListHelper(feed);
        const itemCardList = sermonCardListHelper(feed);
        const cardTitle = 'Christ Church Sermon List';
        const speechOutput = 'The last three sermons are ' + itemList;
        const cardContent = 'The last three sermons are: \n' + itemCardList;
        const repromptText = 'Would you like me to play the latest sermon';
        this.emit(':askWithCard', speechOutput, repromptText, cardTitle, cardContent, null);
    },
    'AMAZON.YesIntent': function () {
        console.log('YesIntent');
        this.attributes['index'] = 0;
        this.attributes['latestPodcastTitle'] = feed[0].title;
        this.attributes['latestPodcastUrl'] = feed[0].url;
        this.attributes['latestPodcastImage'] = feed[0].imageUrl;
        this.attributes['latestPodcastAuthor'] = feed[0].author;
        controller.play.call(this);
    },
    'AMAZON.NoIntent': function () {
        console.log('NoIntent');
        const speechOutput = 'Ok then. If you would like to hear the list of sermons, say list sermons, or say main menu for other options.';
        this.response.speak(speechOutput);
        this.emit(':responseReady');
    },
    'PlaySermonByIndexIntent': function () {
        console.log('PlaySermonByIndexIntent');
        let index = 0;
        if (this.event.request.intent.slots.Index && this.event.request.intent.slots.Index.value) {
            index = parseInt(this.event.request.intent.slots.Index.value);
            index--;
        }
        this.attributes['index'] = index;
        this.attributes['latestPodcastTitle'] = feed[index].title;
        this.attributes['latestPodcastUrl'] = feed[index].url;
        this.attributes['latestPodcastImage'] = feed[index].imageUrl;
        this.attributes['latestPodcastAuthor'] = feed[index].author;
        console.log('play sermon by index = ', this.attributes);
        controller.play.call(this);
    },
    'PlayLatestSermonIntent': function () {
        console.log('PlayLatestSermonIntent');
        let index = 0;
        this.attributes['index'] = index;
        this.attributes['latestPodcastTitle'] = feed[index].title;
        this.attributes['latestPodcastUrl'] = feed[index].url;
        this.attributes['latestPodcastImage'] = feed[index].imageUrl;
        this.attributes['latestPodcastAuthor'] = feed[index].author;
        console.log('play latest sermon = ', this.attributes);
        controller.play.call(this);
    },
    'PlayCommandIssued': function () {
        console.log('PlayCommandIssued');
        controller.play.call(this)
    },
    'PauseCommandIssued': function () {
        console.log('PauseCommandIssued');
        controller.stop.call(this)
    },
    'NextCommandIssued': function () {
        console.log('NextCommandIssued');
        controller.playNext.call(this)
    },
    'PreviousCommandIssued': function () {
        console.log('PreviousCommandIssued');
        controller.playPrevious.call(this)
    },
    'AMAZON.NextIntent': function () {
        console.log('NextIntent');
        controller.playNext.call(this)
    },
    'AMAZON.PreviousIntent': function () {
        console.log('PreviousIntent');
        controller.playPrevious.call(this)
    },
    'AMAZON.PauseIntent': function () {
        console.log('PauseIntent');
        controller.pause.call(this)
    },
    'AMAZON.StopIntent': function () {
        console.log('StopIntent');
        controller.stop.call(this)
    },
    'AMAZON.CancelIntent': function () {
        console.log('CancelIntent');
        controller.stop.call(this)
    },
    'AMAZON.ResumeIntent': function () {
        console.log('ResumeIntent');
        controller.resume.call(this)
    },
    'AMAZON.LoopOnIntent': function () {
        console.log('LoopOnIntent');
        controller.loopOn.call(this)
    },
    'AMAZON.LoopOffIntent': function () {
        console.log('LoopOffIntent');
        controller.loopOff.call(this)
    },
    'AMAZON.ShuffleOnIntent': function () {
        console.log('ShuffleOnIntent');
        controller.shuffleOn.call(this)
    },
    'AMAZON.ShuffleOffIntent': function () {
        console.log('ShuffleOffIntent');
        controller.shuffleOff.call(this)
    },
    'AMAZON.StartOverIntent': function () {
        console.log('StartOverIntent');
        controller.startOver.call(this)
    },
    'AMAZON.HelpIntent': function () {
        console.log('HelpIntent');
        // This will called while audio is playing and a user says "ask <invocation_name> for help"
        const cardTitle = 'Christ Church Help';
        const speechOutput = 'Ok, I can help you with the Christ Church Skill. ' +
            'You can say help, what is the latest sermon, or play the latest sermon, stop or cancel.';
        const repromptText = 'You can say help, what is the latest sermon, or play the latest sermon, stop or cancel.';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function () {
        console.log('SessionEndedRequest');
        const cardTitle = 'Session Ended';
        const speechOutput = 'Thank you for using the Christ Church skill, making Christ Famous in the Quad Cities!';
        // Setting this to true ends the session and exits the skill.
        this.emit(':tellWithCard', speechOutput, cardTitle, speechOutput, null);
    },
    'Unhandled': function () {
        console.log('Unhandled');
        const cardTitle = 'Christ Church Unhandled';
        const speechOutput = 'Sorry, I could not understand. You can say, Next or Previous to navigate through the playlist.';
        const repromptText = 'Sorry, I could not understand. You can say, Next or Previous to navigate through the playlist.';
        this.response.speak(speechOutput).listen(repromptText).cardRenderer(cardTitle, speechOutput, null);
        this.emit(':responseReady');
    }
};

function fetchFeed(fileName, url, callback) {
    const fileNameKey = 'fileName';
    feedHelper.getFeed(fileName, url, (err, data, items) => {
        if (err) {
            this.emit('reportError');
        } else {
            if (data) {
                // Call new item notification to compute number of new items available
                callback(data, items);
            } else {
                console.log('Feed parsed is empty');
                this.emit('feedEmptyError');
            }
        }
    });
}

function sermonListHelper(items) {
    let itemList = '';
    let index = 0;
    while (index < constants.sermonsPerPage) {
        itemList += (index + 1) + constants.breakTime['100'] + items[index].title + constants.breakTime['200'];
        index++;
    }
    itemList += ' Which one would you like to hear?';
    return itemList;
}

function sermonCardListHelper(items) {
    let itemCardList = '';
    let index = 0;
    while (index < constants.sermonsPerPage) {
        itemCardList += (index + 1) + ') ' + items[index].title + ' \n';
        index++;
    }
    itemCardList += ' Which one would you like to hear?';
    return itemCardList;
}

const controller = function () {
    return {
        play: function () {
            console.log('controller.play = ', this.attributes);
            console.log('request event = ', this.event);

            if (this.attributes['playbackFinished']) {
                // Reset to top of the playlist when reached end.
                this.attributes['index'] = 0;
                this.attributes['offsetInMilliseconds'] = 0;
                this.attributes['playbackIndexChanged'] = true;
                this.attributes['playbackFinished'] = false;
            }

            let token = this.attributes['index'];
            let playBehavior = 'REPLACE_ALL';
            this.attributes['latestPodcastUrl'] = feed[this.attributes['index']].url;
            this.attributes['latestPodcastTitle'] = feed[this.attributes['index']].title;
            this.attributes['latestPodcastAuthor'] = feed[this.attributes['index']].author;
            let offsetInMilliseconds = 0;
            // Since play behavior is REPLACE_ALL, enqueuedToken attribute need to be set to null.
            this.attributes['enqueuedToken'] = null;

            const cardTitle = 'Playing ' + this.attributes.latestPodcastTitle;
            const cardContent = 'By  ' + this.attributes.latestPodcastAuthor;
            console.log('feed item: ', feed[this.attributes['index']]);
            this.response.
                speak(`Playing ${feed[this.attributes['index']].title} by ${feed[this.attributes['index']].author} recorded on ${feed[this.attributes['index']].date}`).
                cardRenderer(cardTitle, cardContent, feed[this.attributes['index']].imageUrl.largeImageUrl).
                audioPlayerPlay(playBehavior, this.attributes.latestPodcastUrl, token, null, offsetInMilliseconds);
            this.emit(':responseReady');
        },
        pause: function () {
            console.log('controller.pause = ', this.attributes);
            console.log('request event = ', this.event);
            this.attributes.offsetInMilliseconds = this.event.request.offsetInMilliseconds;
            this.response.
                speak(`Pausing ${feed[this.attributes['index']].title}`).
                audioPlayerStop();
            this.emit(':responseReady');
        },
        resume: function () {
            console.log('controller.resume = ', this.attributes);
            console.log('request event = ', this.event);
            let token = this.attributes.index;
            let playBehavior = 'REPLACE_ALL';
            let offsetInMilliseconds = this.attributes.offsetInMilliseconds;
            // Since play behavior is REPLACE_ALL, enqueuedToken attribute need to be set to null.
            this.attributes['enqueuedToken'] = null;
            let cardTitle = 'Rusuming ' + this.attributes.latestPodcastTitle;
            let cardContent = 'By ' + this.attributes.latestPodcastAuthor;
            this.response.
                speak(`Resuming play of ${feed[this.attributes['index']].title}`).
                cardRenderer(cardTitle, cardContent, feed[this.attributes['index']].imageUrl.largeImageUrl).
                audioPlayerPlay(playBehavior, this.attributes.latestPodcastUrl, token, null, offsetInMilliseconds);
            this.emit(':responseReady');
        },
        stop: function () {
            console.log('controller.stop = ', this.attributes);
            console.log('request event = ', this.event);
            const cardTitle = 'Thanks for using the Christ Church skill!';
            const speechOutput = 'Thank you for using the Christ Church skill, making Christ Famous in the Quad Cities!';
            this.response.
                audioPlayerStop().
                audioPlayerClearQueue("CLEAR_ALL");
            this.emit(':tellWithCard', speechOutput, cardTitle, speechOutput, null);
        },
        playNext: function () {
            console.log('controller.playNext = ', this.attributes);
            console.log('request event = ', this.event);
            let index = this.attributes['index'];
            index += 1;
            // Check for last audio file.
            if (index === feed.length) {
                // Reached at the end. Thus reset state to start mode and stop playing.
                this.handler.state = constants.states.START_MODE;

                const message = 'You have reached the end of the playlist.';
                this.response.speak(message).audioPlayerStop();
                return this.emit(':responseReady');
            }
            // Set values to attributes.
            this.attributes['index'] = index;
            this.attributes['offsetInMilliseconds'] = 0;
            this.attributes['playbackIndexChanged'] = true;
            controller.play.call(this);
        },
        playPrevious: function () {
            console.log('controller.playPrevious = ', this.attributes);
            console.log('request event = ', this.event);
            let index = this.attributes['index'];
            index -= 1;
            // Check for last audio file.
            if (index === -1) {
                // Reached at the end. Thus reset state to start mode and stop playing.
                this.handler.state = constants.states.START_MODE;

                const message = 'You have reached the start of the playlist.';
                this.response.speak(message).audioPlayerStop();
                return this.emit(':responseReady');
            }
            this.attributes['index'] = index;
            this.attributes['offsetInMilliseconds'] = 0;
            this.attributes['playbackIndexChanged'] = true;
            controller.play.call(this);
        },
        loopOn: function () {
            console.log('controller.loopOn = ', this.attributes);
            const message = 'Loop is not supported for the Christ Church skill.';
            this.response.speak(message);
            this.emit(':responseReady');
        },
        loopOff: function () {
            console.log('controller.loopOff = ', this.attributes);
            const message = 'Loop is not supported for the Christ Church skill.';
            this.response.speak(message);
            this.emit(':responseReady');
        },
        shuffleOn: function () {
            console.log('controller.shuffleOn = ', this.attributes);
            const message = 'Shuffle is not supported for the Christ Church skill.';
            this.response.speak(message);
            this.emit(':responseReady');
        },
        shuffleOff: function () {
            console.log('controller.shuffleOff = ', this.attributes);
            const message = 'Shuffle is not supported for the Christ Church skill.';
            this.response.speak(message);
            this.emit(':responseReady');
        },
        startOver: function () {
            console.log('controller.startOver = ', this.attributes);
            this.attributes['offsetInMilliseconds'] = 0;
            controller.play.call(this);
        },
        reset: function () {
            console.log('controller.reset = ', this.attributes);
            this.attributes['index'] = 0;
            this.attributes['offsetInMilliseconds'] = 0;
            this.attributes['playbackIndexChanged'] = true;
            controller.play.call(this);
        }
    }
}();
