export default srcUrl => ctx => {
  const {useApp, useLoadingManager, useAudioManager} = ctx;
  const loadingManager = useLoadingManager();
  const audioManager = useAudioManager();

  const app = useApp();
  app.name = srcUrl.match(/([^\/]*)$/)[1];
  app.description = '';

  (async () => {
    const audio = new Audio(srcUrl);
    audio.loop = true;
    const volumeAttribute = app.getComponent('volume') ?? 1;
    audio.volume = volumeAttribute;
    audio.oncanplaythrough = async () => {
      await Promise.all([
        loadingManager.waitForFinish(),
        audioManager.waitForStart(),
      ]);
      try {
        await audio.play();
      } catch(err) {
        console.warn('audio play error', err.stack);
      }
    };
    audio.onerror = err => {
      console.warn('audioload error', err.stack);
    };
    audio.style.cssText = `\
      position: absolute;
      visibility: hidden;
      pointer-events: none;
    `;
    document.body.appendChild(audio);
  })();

  return app;
};