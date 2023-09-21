import {
  whisperTranscribe,
} from '../helpers/WhisperTranscribe.js';

//

export class VoiceTranscriber extends EventTarget {
  constructor() {
    super();

    this.running = false;
    this.queue = [];
    this.lastPrompt = '';

    this.abortController = new AbortController();
  }
  #pushTranscribePromise(p) {
    (async () => {
      if (!this.running) {
        this.running = true;

        try {
          const text = await p;
          if (this.abortController.signal.aborted) return;

          this.lastPrompt = text;
          
          this.dispatchEvent(
            new MessageEvent('transcribe', {
              data: {
                text,
              },
            })
          );
        } catch (err) {
          this.lastPrompt = '';
          console.warn('clear last prompt due to error', err);
        }

        this.running = false;

        if (this.queue.length > 0) {
          const p = this.queue.shift();
          this.#pushTranscribePromise(p);
        }
      } else {
        this.queue.push(p);
      }
    })();
  }
  pushData(blob) {
    const start = performance.now();

    const transcribePromise = whisperTranscribe(blob, this.lastPrompt);
    this.#pushTranscribePromise(transcribePromise);

    transcribePromise.then(() => {
      const end = performance.now();
      const timeDiff = end - start;
      console.log('transcribe time', timeDiff);
    });
  }
  close() {
    this.abortController.abort(/* abortError */);
  }
}