export default ctx => async agentMessage => {
    const {
      useVoiceOutputManager,
      useCompanionSettings,
    } = ctx;

    const voiceOutputManager = useVoiceOutputManager();
    const companionSettingsClient = useCompanionSettings();
    
    agentMessage.addLockUnlock((lockCb) => voiceOutputManager.waitForTurn(lockCb));
    agentMessage.addEventListener('play', e => {
      const settingsChangeRequest = agentMessage.value.toLowerCase().replace(/\s/g, '');
      const split = settingsChangeRequest.split('=');
      if (split.length !== 2)
        return

      let setting = split[0];
      let value = split[1];
      if (setting === 'volume') {
        try{
          value = parseInt(value);
        } catch (e){
          return;
        }
      } else if (setting === 'closed_captioning') {
        setting = 'closedCaptioning';
        if (value === 'true' || value === 'false')
          value = value === 'true';
        else
          return;
      } else{
        return;
      }
      console.log('settingsChangeRequest', setting, value);
      companionSettingsClient.setSetting(setting, value);
    });
  };


