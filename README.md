# speech-processing-and-recognition-react

Speech Processing Module for react.
- Record speech signals using computer microphone.
- Convert blob to wav files.
- Compute MFCC coefficients of signal.
- Training model for speech recognition.
- Define your own dictionary and train the application.
- Recognize spoken speech based on trained data.

### About
The library mainly uses mfcc coefficients for storing the speech features. For recognition, it uses dynamic time warping using euclidean distance along with KNN modelling.<br/>
The library is best suited for the recognition of a smaller set of vocabulary with fairly distinguishing features across the trained vocabulary.

### Installation:
<code>
npm i speech-processing-and-recognition-react
</code>

### Basic usage:
By default, the flow of the program includes first training letters A,B,C by providing 3 samples of each. Post that you can try recognition. You may also add the recognized features to the dataset for better accuracy. <br/>

Importing the library:
<code>
import {SpeechProcessing, Rwcognize} from 'speech-processing-and-recognition-react';
</code>

