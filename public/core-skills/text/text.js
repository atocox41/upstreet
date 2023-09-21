import {
  normalizeText,
} from '../../../packages/engine/utils/companion-utils.js';

export default ctx => async agentMessage => {
  const {
    useNpcPlayer,
    useVoiceStreamManager,
    useVoiceOutputManager,
    useCompanionOutput,
  } = ctx;
  const npcPlayer = useNpcPlayer();
  const voiceStreamManager = useVoiceStreamManager();
  const voiceOutputManager = useVoiceOutputManager();
  const companionOutput = useCompanionOutput();

  //

  const text = agentMessage.value;
  const voiceText = normalizeText(text);
  const streamPromise = (async () => {
    if (voiceText) {
      const stream = await voiceStreamManager.waitForTurn(async () => {
        return npcPlayer.voicer.getStream(voiceText);
      });
      return stream;
    } else {
      return null;
    }
  })();

  agentMessage.addLockUnlock((lockCb) => voiceOutputManager.waitForTurn(lockCb));
  agentMessage.addEventListener('play', e => {
    e.waitUntil(async () => {
      const _playText = () => {
        if (text) {
          if (companionOutput) {
            companionOutput.pushBotMessage(agentMessage);
          }
        }
      };
      const _playVoice = async () => {
        if (voiceText) {
          const {
            signal,
          } = agentMessage;

          const stream = await streamPromise;
          await companionOutput.pushStream(stream, {
            signal,
          });
        }
      };

      _playText();
      await _playVoice();
    });
  });
};