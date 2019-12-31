"use strict";

module.exports = Object.freeze({

    appId : 'amzn1.ask.skill.2a02e04b-3e36-41f0-81f1-c86c9dd60ad0',

    dynamoDBTableName : 'ask-christ-church',

    feedFileName : 'feed.json',

    //  States
    states : {
        START_MODE : '_START_MODE',
        PLAY_MODE : '_PLAY_MODE'
    },

    //  Custom constants
    terminate : 'TERMINATE',

    //  Speech break time
    breakTime : {
        '50' : '<break time = "50ms"/>',
        '100' : '<break time = "100ms"/>',
        '200' : '<break time = "200ms"/>',
        '250' : '<break time = "250ms"/>',
        '300' : '<break time = "300ms"/>',
        '500' : '<break time = "500ms"/>'
    },

    // Time in minutes after which feeds fetched again.
    updateFeedTime : 5,

    sermonUrl : 'http://christchurcheastmoline.cloversites.com/podcast/b20a63f3-f8f6-49c0-937f-5ee6c806bf69.xml',

    sermonsPerPage : 3,
});
