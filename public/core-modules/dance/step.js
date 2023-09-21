// import SMParse from './sm-parse.js';

//

import {
  BasicPitch,
} from '@spotify/basic-pitch';
import {
  addPitchBendsToNoteEvents,
  noteFramesToTime,
  outputToNotesPoly,
} from '@spotify/basic-pitch/esm/toMidi.js';
import {
  Note,
  Chord,
  Midi,
} from 'tonal';

//

// var audioAiHost = `/api/choreograph`;
var getSm = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext({
    sampleRate: 22050,
  });
  const audioData = await audioContext.decodeAudioData(arrayBuffer.slice());
  // convert to mono
  const channelDatas = [];
  for (let j = 0; j < audioData.numberOfChannels; j++) {
    channelDatas.push(audioData.getChannelData(j));
  }
  const monoAudioData = audioContext.createBuffer(1, audioData.length, audioData.sampleRate);
  const monoChannelData = monoAudioData.getChannelData(0);
  for (let j = 0; j < audioData.length; j++) {
    let v = 0;
    for (let k = 0; k < channelDatas.length; k++) {
      v += channelDatas[k][j];
    }
    v /= channelDatas.length;
    monoChannelData[j] = v;
  }



  const frames = [];
  const onsets = [];
  const contours = [];
  let pct;
  const basicPitch = new BasicPitch('/weights/basic-pitch/model.json');
  console.log('pitch 1');
  await basicPitch.evaluateModel(
    monoAudioData,
    (f, o, c) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    (p) => {
      pct = p;
    },
  );
  console.log('pitch 2', {
    frames,
    onsets,
    contours,
    pct,
  });



  // outputToNotesPoly(
  //   frames: number[][],
  //   onsets: number[][],
  //   onsetThresh: number = 0.5,
  //   frameThresh: number = 0.15,
  //   minNoteLen: number = 11,
  //   inferOnsets: boolean = true,
  //   maxFreq: Optional<number> = null,
  //   minFreq: Optional<number> = null,
  //   melodiaTrick: boolean = true,
  //   energyTolerance: number = 11,
  // )
  let notes = noteFramesToTime(
    addPitchBendsToNoteEvents(
      contours,
      outputToNotesPoly(
        frames,
        onsets,
        0.5,
        0.3,
        5,
        // true,
        // 0,
        // 3000,
        // true,
      ),
    ),
  );
  notes = notes.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
  const pitches = notes.map(note => Midi.midiToNoteName(note.pitchMidi));
  const freqs = notes.map(note => Midi.midiToFreq(note.pitchMidi));
  const pitchesString = pitches.join(' ');
  // globalThis.pitchesString = pitchesString;
  console.log('got notes', {notes, pitches});






  /* const fd = new FormData();
  fd.append('audio_file', file);
  const difficulties = [
    'Beginner',
    'Easy',
    'Medium',
    'Hard',
    'Challenge',
  ];
//   const difficulty = difficulties[2];
  const difficulty = difficulties[4];
  fd.append('diff_coarse', difficulty);

  const res = await fetch(audioAiHost, {
    method: 'POST',
    body: fd,
  });
  const text = await res.text();
  const sm = new SMParse(text);
  console.log('got sm', sm);
  return sm; */
};
export const testStep = async () => {
  const res = await fetch('https://local.webaverse.com:4443/audio/musician.mp3');
  const file = await res.blob();
  const sm = await getSm(file);
  return sm;
};
