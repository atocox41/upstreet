export class VolumeTracker {
    static sampleCount = 512;
    constructor() {
      this.volumeArray = new Float64Array(VolumeTracker.sampleCount).fill(0);
      this.volumeIndex = 0;
      this.volumeSamples = 0;
    }
    getAvgVolume() {
      if (this.volumeSamples > 0) {
        const volumeSum = this.volumeArray.reduce((a, b) => a + b, 0);
        return volumeSum / this.volumeSamples;
      } else {
        return 0;
      }
    }
    getMaxVolume() {
      if (this.volumeSamples > 0) {
        let max = -Infinity;
        for (let i = 0; i < this.volumeArray.length; i++) {
          const volume = this.volumeArray[i];
          if (volume > max) {
            max = volume;
          }
        }
        return max;
      } else {
        return 0;
      }
    }
    sampleVolume(volume) {
      this.volumeArray[this.volumeIndex] = volume;
      this.volumeIndex = (this.volumeIndex + 1) % this.volumeArray.length;
      this.volumeSamples = Math.min(this.volumeSamples + 1, this.volumeArray.length);
    }
  }