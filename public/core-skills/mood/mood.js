export default ctx => async agentMessage => {
  const {
    useCompanionRenderSpec,
    useVoiceOutputManager,
  } = ctx;
  const companionRenderSpec = useCompanionRenderSpec();
  const voiceOutputManager = useVoiceOutputManager();

  // console.log('companion mood 1');
  agentMessage.addLockUnlock((lockCb) => voiceOutputManager.waitForTurn(lockCb));
  // console.log('companion mood 2');
  agentMessage.addEventListener('play', e => {
    // console.log('companion mood 3');
    e.waitUntil(async () => {
      // console.log('companion mood 4');
      const mood = agentMessage.value;
      companionRenderSpec.emoteManager.setMood(mood);
      // console.log('companion mood 5');
    });
  });
};