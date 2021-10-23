"use strict";

require("core-js/modules/web.dom-collections.iterator.js");

require("core-js/modules/es.array-buffer.slice.js");

require("core-js/modules/es.typed-array.float32-array.js");

require("core-js/modules/es.typed-array.sort.js");

require("core-js/modules/es.typed-array.to-locale-string.js");

require("core-js/modules/es.promise.js");

require("core-js/modules/web.dom-collections.iterator.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("core-js/modules/es.array-buffer.slice.js");

require("core-js/modules/es.typed-array.float32-array.js");

require("core-js/modules/es.typed-array.sort.js");

require("core-js/modules/es.typed-array.to-locale-string.js");

require("core-js/modules/es.promise.js");

var _react = _interopRequireWildcard(require("react"));

require("./SpeechProcessing.css");

var _utils = require("./utils.js");

var _reactBootstrap = require("react-bootstrap");

var _Recognize = require("./Recognize");

function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== "function") return null;
  var cacheBabelInterop = new WeakMap();
  var cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}

function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }

  if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
    return {
      default: obj
    };
  }

  var cache = _getRequireWildcardCache(nodeInterop);

  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }

  var newObj = {};
  var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;

  for (var key in obj) {
    if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
      var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;

      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }

  newObj.default = obj;

  if (cache) {
    cache.set(obj, newObj);
  }

  return newObj;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var hark = require('hark');

class SpeechProcessing extends _react.Component {
  constructor(props) {
    super(props);

    _defineProperty(this, "onMediaSuccess", stream => {
      if (!this.state.trained) {
        this.setState({
          currentTrainingIndex: 0,
          msg: "say the next word loud and clear, and wait until we process it.  ===>   " + _Recognize.Recognize.dictionary[0]
        });
      }

      this.audioContextType = window.AudioContext || window.webkitAudioContext;
      this.localStream = stream;
      this.track = this.localStream.getTracks()[0]; // create the MediaStreamAudioSourceNode
      // Setup Audio Context

      this.context = new this.audioContextType();
      var source = this.context.createMediaStreamSource(this.localStream); // create a ScriptProcessorNode

      if (!this.context.createScriptProcessor) {
        this.node = this.context.createJavaScriptNode(_Recognize.Recognize.bufferSize, this.numChannels, this.numChannels);
      } else {
        this.node = this.context.createScriptProcessor(_Recognize.Recognize.bufferSize, this.numChannels, this.numChannels);
      } // listen to the audio data, and record into the buffer, this is important to catch the fraction of second before the speech started.


      this.node.onaudioprocess = e => {
        var left = e.inputBuffer.getChannelData(0);
        if (!this.recording) return;

        if (this.leftchannel.length < _Recognize.Recognize._buffArrSize) {
          this.leftchannel.push(new Float32Array(left));
          this.recordingLength += this.bufferSize;
        } else {
          this.leftchannel.splice(0, 1);
          this.leftchannel.push(new Float32Array(left));
        }
      }; // connect the ScriptProcessorNode with the input audio


      source.connect(this.node);
      this.node.connect(this.context.destination); // hark: https://github.com/otalk/hark
      // detect a speech start

      this.speechHark = hark(this.localStream, {
        interval: this._harkInterval,
        threshold: this._threshold,
        play: false,
        recoredInterval: this._stopRecTimeout
      });
      this.speechHark.on('speaking', () => {
        this.setState({
          statusMsg: "recoding"
        });
        setTimeout(() => {
          this.stopRec();
        }, this._stopRecTimeout);
      });
      this.speechHark.on('stopped_speaking', () => {});
    });

    _defineProperty(this, "stopRec", () => {
      this.setState({
        statusMsg: 'stopped recoding'
      });
      this.recording = false;
      var internalLeftChannel = this.leftchannel.slice(0);
      var internalRecordingLength = this.recordingLength; // create blob to process it

      var blob = _utils.Utils.bufferToBlob(internalLeftChannel, internalRecordingLength); // console.log('blob created', blob, this.recordingLength, this.leftchannel);


      if (!blob) return; // create a WAV file to listen to the recorded data

      _utils.Utils.getVoiceFile(blob, 0);

      this.setState({
        statusMsg: 'wav file made'
      });
      var reader = new window.FileReader();
      reader.readAsDataURL(blob); // read the blob and start processing according to the system state (trained or not)

      reader.onloadend = () => {
        this.setState({
          statusMsg: 'trained state: ' + this.state.trained
        });

        if (this.state.trained) {
          let result = _Recognize.Recognize.recognize(internalLeftChannel, this.setStateMsgFunc);

          if (result) {
            this.setState({
              msg: /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, "\"Great! the result is ", '===>', " ", result.transcript, " ", '<===', " try more.\"", /*#__PURE__*/_react.default.createElement("br", null), /*#__PURE__*/_react.default.createElement("button", {
                onClick: () => _Recognize.Recognize.saveRecognizedFeature()
              }, "Add feature to dataset"))
            }); // console.log(result.transcript);
            // console.log(this.props);
            // this.props.handleRecognizedMove(result.transcript + '');
          } else {
            this.setState({
              msg: "Didn't Got it! please try to Again loud and clear."
            });
          } // console.log(result);

        } else {
          let success = _Recognize.Recognize.train(internalLeftChannel, _Recognize.Recognize.dictionary[this.state.currentTrainingIndex % _Recognize.Recognize.dictionary.length], this.setStateMsgFunc, this.state.currentTrainingIndex > _Recognize.Recognize.dictionary.length ? 2 : 1);

          this.traingNextWord(success);
        }
      };

      this.leftchannel.length = 0;
      this.recordingLength = 0;
      this.recording = true;
    });

    _defineProperty(this, "traingNextWord", success => {
      if (success) {
        // next word
        let i = this.state.currentTrainingIndex + 1; // console.log('state: ', this.state.trained);

        if (this.state.trained || i > _Recognize.Recognize.dictionary.length * 3 - 1) {
          this.setState({
            trained: true,
            currentTrainingIndex: i,
            msg: "training is finished, now we will try to guess what you are trying to say from the trained vocabulary.",
            modeMsg: "recognizing mode"
          });
        } else {
          this.setState({
            currentTrainingIndex: i,
            msg: "#" + i / _Recognize.Recognize.dictionary.length + "Good! say the next word loud and clear, and wait until we process it.  ===>  " + _Recognize.Recognize.dictionary[i % _Recognize.Recognize.dictionary.length]
          });
        }
      } else {
        this.setState({
          msg: "we didn't got it, try again, say the next word loud and clear, and wait until we process it.    " + _Recognize.Recognize.dictionary[this.state.currentTrainingIndex % _Recognize.Recognize.dictionary.length]
        });
      }
    });

    _defineProperty(this, "setStateMsgFunc", msg => {
      this.setState({
        statusMsg: msg
      });
    });

    _defineProperty(this, "stopUserMediaTrack", () => {
      if (this.track) this.track.stop();
    });

    _defineProperty(this, "stopListening", () => {
      this.recording = false;

      if (this.leftchannel) {
        this.leftchannel.length = 0;
        this.leftchannel = [];
      }

      this.localStream = null;
      this.recordingLength = 0;
      if (this.speechHark) this.speechHark.stop();
      if (this.stopUserMediaTrack) this.stopUserMediaTrack();
    });

    _defineProperty(this, "start", () => {
      this.startListening(); // console.log(this.state);

      if (!this.state.trained) {
        this.setState({
          modeMsg: "training mode"
        });
      } else {
        this.setState({
          modeMsg: "recognizing mode"
        });
      }
    });

    _defineProperty(this, "stop", () => {
      this.stopListening();
      this.setState({
        statusMsg: "stoped",
        isModeSelected: false
      });
    });

    _defineProperty(this, "recognize", () => {
      this.setState({
        // currentTrainingIndex: 100000,
        isModeSelected: true,
        trained: true
      });
    });

    _defineProperty(this, "train", () => {
      this.setState({
        currentTrainingIndex: 0,
        trained: false,
        isModeSelected: true
      });
    });

    this.state = {
      msg: "",
      modeMsg: "",
      statusMsg: "",
      trained: true,
      currentTrainingIndex: null,
      isModeSelected: false,
      result: ''
    };
    /******************************************************************************************************/

    /*********  Voice *********/

    this.audioContextType = null;
    this.localstream = null;
    this.context = null;
    this.track = null;
    this.node = null;
    this.recording = true;
    this.speechHark = null;
    this.leftchannel = [];
    /********* Settings *********/

    this._stopRecTimeout = 1000;
    this._threshold = -50; // voice dB

    this._harkInterval = 100;
    this.recordingLength = 0;
    this.numChannels = 1;
  }
  /**
   * This function will run if the microphone was successfully acquired.
   * Here we record the data and make a signal when there is a speech start recognized
   */

  /**
   * Start listening to media devices
   */


  async startListening() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });
    this.onMediaSuccess(stream);
  }

  render() {
    return /*#__PURE__*/_react.default.createElement("div", {
      className: "SpeechProcessing"
    }, !this.state.isModeSelected && /*#__PURE__*/_react.default.createElement("div", {
      className: "row"
    }, "Choose mode:", /*#__PURE__*/_react.default.createElement("button", {
      onClick: this.recognize
    }, "Recognition"), /*#__PURE__*/_react.default.createElement("button", {
      onClick: this.train
    }, "Training")), this.state.isModeSelected && /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, " ", /*#__PURE__*/_react.default.createElement("h2", {
      style: {
        color: 'Violet'
      }
    }, "Click on record to start the game"), /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement(_reactBootstrap.Button, {
      style: {
        height: '45px',
        width: '150px',
        backgroundColor: 'Red',
        margin: '10px',
        padding: '5px'
      },
      onClick: this.start
    }, "Record"), /*#__PURE__*/_react.default.createElement(_reactBootstrap.Button, {
      style: {
        height: '45px',
        width: '150px',
        backgroundColor: 'Violet',
        margin: '10px',
        padding: '5px'
      },
      onClick: this.stop
    }, "Stop")), /*#__PURE__*/_react.default.createElement("div", {
      className: "msgs"
    }, /*#__PURE__*/_react.default.createElement("span", null, this.state.modeMsg)), /*#__PURE__*/_react.default.createElement("div", {
      className: "msgs"
    }, /*#__PURE__*/_react.default.createElement("span", null, this.state.msg)), /*#__PURE__*/_react.default.createElement("div", {
      className: "msgs"
    }, /*#__PURE__*/_react.default.createElement("span", null, this.state.statusMsg)), /*#__PURE__*/_react.default.createElement("div", {
      id: "audios-container"
    })));
  }

} // modules.export.SpeechProcessing = SpeechProcessing;


var _default = SpeechProcessing;
exports.default = _default;