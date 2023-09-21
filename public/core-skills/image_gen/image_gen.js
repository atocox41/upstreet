import { imageModels } from "../../../packages/engine/constants/model-constants";
import { extractFieldValue, uploadFile } from "../../../packages/engine/utils/companion-utils";
export default ctx => async agentMessage => {
    const {
      useVoiceOutputManager,
      useAiAgentController,
    } = ctx;
    const voiceOutputManager = useVoiceOutputManager();
    const aiAgentController = useAiAgentController();
    agentMessage.addLockUnlock((lockCb) => voiceOutputManager.waitForTurn(lockCb));
    agentMessage.addEventListener('play', e => {
      e.waitUntil(async () => {
        if(agentMessage.value.includes('GENERATE_IMAGE:: TRUE')) {
          const generateImage = async (promptObject) => {
            const fd = await imageModels[0].handleFn(promptObject);
            console.log(fd);
            const res = await fetch(imageModels[0].endpointUrl, {
              method: 'POST',
              body: fd,
            })
            const blob = await res.blob();
            let image = await uploadFile(blob);
            let valueData = `[SENT_BY:: ${agentMessage.user}], [IMAGE_DESCRIPTION:: ${promptObject}], [URL:: ${image}], [GENERATE_IMAGE:: FALSE]`;
            const timestamp = Date.now();
            const memoryData = {
              user: agentMessage.user,
              type: 'IMAGE',
              value: valueData,
              timestamp,
              importance: 5,
            };
            const memoryBundle = await aiAgentController.pushMemory(memoryData);
            memoryBundle.commit();
          }
          let prompt = extractFieldValue(agentMessage.value, 'IMAGE_DESCRIPTION');
          await generateImage(prompt);
        }
      });
    }); 
  };