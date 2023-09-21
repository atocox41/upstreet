export default ctx => async agentMessage => {
  const {
    useCompanionRenderSpec,
    useVoiceOutputManager,
  } = ctx;
  const companionRenderSpec = useCompanionRenderSpec();
  const voiceOutputManager = useVoiceOutputManager();

  // console.log('companion emote 1');
  agentMessage.addLockUnlock((lockCb) => voiceOutputManager.waitForTurn(lockCb));
  // console.log('companion emote 2');
  agentMessage.addEventListener('play', e => {
    // console.log('companion emote 3');
    e.waitUntil(async () => {
      // console.log('companion emote 4');
      const emotion = agentMessage.value;
      companionRenderSpec.emoteManager.setEmotion(emotion);
      // console.log('companion emote 5');
    });
  });
};