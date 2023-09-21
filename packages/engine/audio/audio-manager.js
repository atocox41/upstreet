import * as THREE from 'three';
// import {getAudioContext} from 'wsrtc/ws-audio-context.js';
import microphoneWorklet from './microphone-worklet.js?worker';
import wsInjectWorklet from './ws-inject-worklet.js?worker';
import wsInputWorklet from './ws-input-worklet.js?worker';
import wsOutputWorklet from './ws-output-worklet.js?worker';
import beatDetectionWorklet from './beat-detection-worklet.js?worker';

//

const getFnUrl = fn => fn.toString().match(/"(.+?)"/)[1];

//

const microphoneWorkletUrl = getFnUrl(microphoneWorklet);
const wsInjectWorkletUrl = getFnUrl(wsInjectWorklet);
const wsInputWorkletUrl = getFnUrl(wsInputWorklet);
const wsOutputWorkletUrl = getFnUrl(wsOutputWorklet);
const beatDetectionWorkletUrl = getFnUrl(beatDetectionWorklet);
export const loadWorkletModules = async audioContext => {
  const audioWorkletPromises = [
    audioContext.audioWorklet.addModule(microphoneWorkletUrl),
    audioContext.audioWorklet.addModule(wsInjectWorkletUrl),
    audioContext.audioWorklet.addModule(wsInputWorkletUrl),
    audioContext.audioWorklet.addModule(wsOutputWorkletUrl),
    audioContext.audioWorklet.addModule(beatDetectionWorkletUrl),
  ];
  
  await Promise.all(audioWorkletPromises);
};

//

export class AudioManager {
  constructor({
    audioContext,
  }) {
    this.audioContext = audioContext;
    this.audioContext.gain = this.audioContext.createGain();
    this.audioContext.gain.connect(this.audioContext.destination);

    //

    this.audioListener = new THREE.AudioListener();
    this.positionalAudio = new THREE.PositionalAudio(this.audioListener);

    //

    this.loadPromise = loadWorkletModules(this.audioContext);
  }

  setVolume(volume) {
    this.audioContext.gain.gain.value = volume;
  }

  playBuffer(audioBuffer) {
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(this.audioContext.destination);
    sourceNode.start();
  }

  playSpatialBuffer(audioBuffer, object) {
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(this.audioContext.destination);
    sourceNode.start();
  }

  async enumerateDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices;
  }

  async getUserMedia(opts) {
    const mediaStream = await navigator.mediaDevices.getUserMedia(opts);
    return mediaStream;
  }

  update() {
    this.audioListener.updateMatrixWorld();
  }

  async waitForLoad() {
    await this.loadPromise;
  }
  async waitForStart() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}