"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Recognize = void 0;

require("core-js/modules/es.array.sort.js");

require("core-js/modules/es.number.to-fixed.js");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Meyda = require('meyda');

var DynamicTimeWarping = require('dynamic-time-warping');

class Recognize {
  /******************************************************************************
  * Local Recognition and MFCC/DTW calculations 
  * MFCC by Meyda: https://github.com/meyda/meyda
  * DTW: https://github.com/GordonLesti/dynamic-time-warping
  ******************************************************************************/
  // you can try and tune these variables
  // 40   / 70

  /**
   * train the system, assume that the passed audio data in the buffer fits the transcript
   * @param {*} _buffer 
   * @param {*} transcript 
   * @param {*} setStateFunc 
   */
  static train(_buffer, transcript, setStateFunc, word) {
    setStateFunc("training");
    this.buffer = _buffer;
    Meyda.bufferSize = this.bufferSize; // calculate mfcc data

    this.bufferMfcc = this.createMfccMetric(); // save current mfcc for future recognitions

    this.mfccHistoryArr.push({
      mfcc: this.bufferMfcc,
      transcript: transcript,
      word
    });
    if (!this.mfccHistoryCunters[transcript] && this.mfccHistoryCunters[transcript] !== 0) this.mfccHistoryCunters[transcript] = 0;
    this.mfccHistoryCunters[transcript]++;
    setStateFunc("training saved");
    return true;
  }
  /**
   * try to recognize what the audio data in the buffer is
   * @param {*} _buffer 
   * @param {*} setStateFunc 
   */


  static recognize(_buffer, setStateFunc) {
    this.buffer = _buffer;
    Meyda.bufferSize = this.bufferSize; // calculate mfcc data

    this.bufferMfcc = this.createMfccMetric(); // console.log(this.bufferMfcc);

    this.startTime = Utils.getTimestamp();
    setStateFunc("recognizing"); // calculate DTW distance from all available trained data

    this.calculateDistanceArr(); // get closest one using knn

    var knnClosest;

    if (this.K_factor <= this.mfccHistoryArr.length) {
      knnClosest = this.getMostSimilarKnn(this.mfccDistArr, this.compareMfcc, this.K_factor);
      if (knnClosest && (this.mfccHistoryCunters[knnClosest.transcript] < this._minNumberOfVariants || knnClosest.confidence < this._minKnnConfidence)) knnClosest = null;

      if (knnClosest && knnClosest.transcript !== "") {
        this.knnClosestGlobal = knnClosest;
      }
    } // validate that we have minimal recognition confidence


    if (!knnClosest || knnClosest.confidence < 0.5) {
      this.endTime = Utils.getTimestamp();
      setStateFunc("not recognized");
      return null;
    } else {
      knnClosest.processTime = Utils.getTimestamp() - this.startTime;
    }

    setStateFunc("recognized"); // console.log(knnClosest);

    return knnClosest;
  }

  /**
   * calculate DTW distance from dictionary mfcc history
   */
  static calculateDistanceArr() {
    this.mfccDistArr = [];

    for (var i = 0; i < this.mfccHistoryArr.length; i++) {
      if (this.isInDictionary(this.mfccHistoryArr[i].transcript)) {
        var dtw = new DynamicTimeWarping(this.mfccHistoryArr[i].mfcc, this.bufferMfcc, this.EuclideanDistance);
        var dist = dtw.getDistance();
        this.mfccDistArr.push({
          dist: dist,
          transcript: this.mfccHistoryArr[i].transcript,
          word: this.mfccHistoryArr[i].word
        });
      }
    }
  }
  /**
   * search in dictionary
   */


  static isInDictionary(word) {
    for (var i = 0; i < this.dictionary.length; i++) {
      if (this.dictionary[i] === word) return true;
    }

    return false;
  }
  /**
   * get the most similar transcript from audio mfcc history array, using Knn Algorithm
   * @param {*} Items 
   * @param {*} CompFunc 
   * @param {*} k 
   */


  static getMostSimilarKnn(Items, CompFunc, k) {
    if (!Items || Items.length === 0) return;
    if (k > Items.length) return;
    console.log('check 3', Items.length);
    var items = Items;
    var compFunc = CompFunc;
    items.sort(compFunc);
    var kArr = items.slice(0, k);
    console.log('check 4', kArr);
    var simArr = [];
    var maxElm = {
      transcript: '',
      weight: 0,
      confidence: 0,
      word: -1
    };

    for (var i = 0; i < kArr.length; i++) {
      if (kArr[i].dist > this._minDTWDist) {
        console.log('continue;');
        continue;
      }

      if (!simArr[kArr[i].transcript]) simArr[kArr[i].transcript] = {
        weight: 1000 / kArr[i].dist
      };else {
        simArr[kArr[i].transcript].weight = simArr[kArr[i].transcript].weight + 1000 / kArr[i].dist;
      }

      if (maxElm.weight < simArr[kArr[i].transcript].weight) {
        maxElm = {
          transcript: kArr[i].transcript,
          weight: simArr[kArr[i].transcript].weight,
          word: kArr[i].word
        };
      }
    }

    console.log('check similar array', simArr, kArr);
    if (maxElm && maxElm.transcript === '') maxElm = null;

    if (maxElm) {
      // calculate confidence
      var sum = 0,
          count = 0;

      for (i = 0; i < items.length; i++) {
        if (items[i].transcript === maxElm.transcript) {
          sum = sum + items[i].dist;
          count++;
        }
      }

      maxElm.confidence = this.getGaussianKernel(sum / count).toFixed(4);
    } // console.log('check 2',maxElm);


    return maxElm;
  } // 


  static getGaussianKernel(t) {
    return Math.pow(Math.E, -1 / 2 * Math.pow(t / 1000, 2));
  }
  /**
   * calculate audio buffer mfcc data
   */


  static createMfccMetric() {
    var mfccMetricArr = [];

    for (var i = 0; i < this._buffArrSize; i++) {
      if (this.buffer[i] && this.buffer[i].length === this.bufferSize) {
        var mfccMetric = Meyda.extract("mfcc", this.buffer[i]);
        mfccMetricArr.push(mfccMetric);
      }
    } // console.log('mfcc coefficients: ',mfccMetricArr);


    return mfccMetricArr;
  }
  /**
   * Euclidean Distance between two victors
   * @param {*} p 
   * @param {*} q 
   */


  static EuclideanDistance(p, q) {
    var d = 0;
    if (p.length !== q.length) return -1;

    for (var i = 0; i < p.length; i++) {
      d = d + Math.pow(p[i] - q[i], 2);
    }

    return Math.sqrt(d);
  }
  /**
   * Mfcc object comparison
   * @param {*} a 
   * @param {*} b 
   */


  static compareMfcc(a, b) {
    if (a.dist < b.dist) return -1;
    if (a.dist > b.dist) return 1;
    return 0;
  }

} // modules.export.Recognize = Recognize;


exports.Recognize = Recognize;

_defineProperty(Recognize, "startTime", null);

_defineProperty(Recognize, "endTime", null);

_defineProperty(Recognize, "calibMode", false);

_defineProperty(Recognize, "mfccHistoryArr", []);

_defineProperty(Recognize, "mfccHistoryCunters", []);

_defineProperty(Recognize, "dictionary", ['A', 'B', 'C']);

_defineProperty(Recognize, "bufferSize", 2048);

_defineProperty(Recognize, "_buffArrSize", 40);

_defineProperty(Recognize, "_minNumberOfVariants", 2);

_defineProperty(Recognize, "_minKnnConfidence", 0);

_defineProperty(Recognize, "_minDTWDist", 3000);

_defineProperty(Recognize, "K_factor", 6);

_defineProperty(Recognize, "mfccDistArr", []);

_defineProperty(Recognize, "knnClosestGlobal", {});

_defineProperty(Recognize, "bufferMfcc", null);

_defineProperty(Recognize, "buffer", null);

_defineProperty(Recognize, "saveRecognizedFeature", () => {
  if (Recognize.knnClosestGlobal && Recognize.knnClosestGlobal.transcript !== "") {
    // save current mfcc for next recognitions
    Recognize.mfccHistoryArr.push({
      mfcc: Recognize.bufferMfcc,
      transcript: Recognize.knnClosestGlobal.transcript
    });
    if (!Recognize.mfccHistoryCunters[Recognize.knnClosestGlobal.transcript] && Recognize.mfccHistoryCunters[Recognize.knnClosestGlobal.transcript] !== 0) Recognize.mfccHistoryCunters[Recognize.knnClosestGlobal.transcript] = 0;
    Recognize.mfccHistoryCunters[Recognize.knnClosestGlobal.transcript]++;
  }
});