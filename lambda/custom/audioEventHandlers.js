const Alexa = require('alexa-sdk');
const constants = require('./constants');

let {feed} = require('./index');

// Binding audio handlers to PLAY_MODE State since they are expected only in this mode.
const audioEventHandlers = Alexa.CreateStateHandler(constants.states.PLAY_MODE, {
  PlaybackStarted() {
    /*
     * AudioPlayer.PlaybackStarted Directive received.
     * Confirming that requested audio file began playing.
     * Storing details in dynamoDB using attributes.
     */
    this.attributes['token'] = getToken.call(this);
    this.attributes['index'] = getIndex.call(this);
    this.attributes['playbackFinished'] = false;
    console.log('PlaybackStarted', this.attributes);
    this.emit(':saveState', true);
  },
  PlaybackFinished() {
    /*
     * AudioPlayer.PlaybackFinished Directive received.
     * Confirming that audio file completed playing.
     * Storing details in dynamoDB using attributes.
     */
    this.attributes['playbackFinished'] = true;
    this.attributes['enqueuedToken'] = false;

    console.log('PlaybackFinished', this.attributes);
    this.emit(':saveState', true);
  },
  PlaybackStopped() {
    /*
     * AudioPlayer.PlaybackStopped Directive received.
     * Confirming that audio file stopped playing.
     * Storing details in dynamoDB using attributes.
     */
    this.attributes['token'] = getToken.call(this);
    this.attributes['index'] = getIndex.call(this);
    this.attributes['offsetInMilliseconds'] = getOffsetInMilliseconds.call(this);

    console.log('PlaybackStopped', this.attributes);
    this.emit(':saveState', true);
  },
  PlaybackNearlyFinished() {
    /*
     * AudioPlayer.PlaybackNearlyFinished Directive received.
     * Using this opportunity to enqueue the next audio
     * Storing details in dynamoDB using attributes.
     * Enqueuing the next audio file.
     */
    if (this.attributes['enqueuedToken']) {
      /*
       * Since AudioPlayer.PlaybackNearlyFinished Directive are prone to be delivered multiple times during the
       * same audio being played.
       * If an audio file is already enqueued, exit without enqueuing again.
       */
      return this.context.succeed(true);
    }

    let enqueueIndex = this.attributes['index'];
    enqueueIndex += 1;
    // Checking if  there are any items to be enqueued.
    if (enqueueIndex === items.length) {
      if (this.attributes['loop']) {
        // Enqueueing the first item since looping is enabled.
        enqueueIndex = 0;
      } else {
        // Nothing to enqueue since reached end of the list and looping is disabled.
        return this.context.succeed(true);
      }
    }
    // Setting attributes to indicate item is enqueued.
    this.attributes['enqueuedToken'] = String(this.attributes['playOrder'][enqueueIndex]);

    let enqueueToken = this.attributes['enqueuedToken'];
    let playBehavior = 'ENQUEUE';
    let podcast = feed[this.attributes['playOrder'][enqueueIndex]];
    let expectedPreviousToken = this.attributes['token'];
    let offsetInMilliseconds = 0;

    this.response.audioPlayerPlay(
      playBehavior,
      podcast.url,
      enqueueToken,
      expectedPreviousToken,
      offsetInMilliseconds
    );

    console.log('PlaybackNearlyFinished', this.attributes);
    this.emit(':responseReady');
  },
  PlaybackFailed() {
    //  AudioPlayer.PlaybackNearlyFinished Directive received. Logging the error.
    console.log("Playback Failed : %j", this.event.request.error);
    this.context.succeed(true);
  }
});

module.exports = audioEventHandlers;

function getToken() {
  // Extracting token received in the request.
  return this.event.request.token;
}

function getIndex() {
  // Extracting index from the token received in the request.
  return parseInt(this.event.request.token);
  //let tokenValue = parseInt(this.event.request.token);
  //console.log('tokenValue = ', tokenValue);
  //return this.attributes['playOrder'].indexOf(tokenValue);
}

function getOffsetInMilliseconds() {
  // Extracting offsetInMilliseconds received in the request.
  return this.event.request.offsetInMilliseconds;
}
