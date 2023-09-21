export default ctx => async agentMessage => {
  const {
    useAiAgentController,
    useVoiceOutputManager,
  } = ctx;
  const aiAgentController = useAiAgentController();
  const voiceOutputManager = useVoiceOutputManager();

  agentMessage.addLockUnlock((lockCb) => voiceOutputManager.waitForTurn(lockCb));
  agentMessage.addEventListener('play', e => {
    aiAgentController.stop();
  });
};