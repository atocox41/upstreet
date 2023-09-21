// import {
//   makeId,
//   makePromise,
// } from '../../util.js';
// import {
//   VoiceEndpointVoicer,
//   VoiceEndpoint,
// } from '../../audio/voice-output/voice-endpoint-voicer.js';
// import {
//   voiceEndpointBaseUrl,
// } from '../../endpoints.js';

//

const narratorVoiceId = `1Cg9Oc_K9UDe5WgVDAcaCSbbBoo-Npj1E`; // 'Discord'

//

/* const _getEmotion = text => {
  let match;
  if (match = text.match(/(😃|😊|😁|😄|😆|(?:^|\s)lol(?:$|\s))/)) {
    match.emotion = 'joy';
    return match;
  } else if (match = text.match(/(😉|😜|😂|😍|😎|😏|😇|❤️|💗|💕|💞|💖|👽)/)) {
    match.emotion = 'fun';
    return match;
  } else if (match = text.match(/(😞|😖|😒|😱|😨|😰|😫)/)) {
    match.emotion = 'sorrow';
    return match;
  } else if (match = text.match(/(😠|😡|👿|💥|💢)/)) {
    match.emotion = 'angry';
    return match;
  } else if (match = text.match(/(😐|😲|😶)/)) {
    match.emotion = 'neutral';
    return match;
  } else {
    return null;
  }
}; */

//

export class ChatManager extends EventTarget {
  constructor({
    playersManager,
    audioManager,
    voiceQueueManager,
    // ioBus,
  }) {
    super();

    if (!playersManager || !audioManager || !voiceQueueManager) {
      console.warn('missing arguments', {
        playersManager,
        audioManager,
        voiceQueueManager,
      });
      debugger;
    }

    this.playersManager = playersManager;
    this.audioManager = audioManager;
    this.voiceQueueManager = voiceQueueManager;
    // this.ioBus = ioBus;

    this.messages = [];

    /* { // XXX read in voice commands
      const localPlayer = this.playersManager.getLocalPlayer();
      localPlayer.voiceInput.addEventListener('speech', e => {
        const {
          transcript,
        } = e.data;
        // console.log('local player speech', transcript);
        // globalThis.testChatGpt(transcript);

        // this.chatManager.addMessage(transcript, {
        //   timeout: 3000,
        // });
        this.addMessage(transcript);
      });
    } */
  
    // this.ioBus.registerHandler('chat', e => {
    //   const {
    //     text,
    //   } = e;
    //   this.addMessage(text);
    // });

    /* this.narratorVoicer = (() => {
      const url = `${voiceEndpointBaseUrl}?voice=${encodeURIComponent(narratorVoiceId)}`;
      const voiceEndpoint = new VoiceEndpoint(url);
      const fakePlayer = {
        avatar: {
          isAudioEnabled: () => {
            return true;
          },
          getAudioInput: () => {
            return this.audioManager.audioContext.destination;
          },
        },
      };
      const narratorVoicer = new VoiceEndpointVoicer({
        voiceEndpoint,
        player: fakePlayer,
        audioManager: this.audioManager,
      });
      return narratorVoicer;
    })(); */
  }

  getMessages() {
    return this.messages;
  }
  addMessage(message, {
    source = '',
  } = {}) {
    this.messages.push(message);

    this.dispatchEvent(new MessageEvent('message', {
      data: {
        message,
        source,
      },
    }));

    if (source !== 'agent' && typeof globalThis.readChat === 'function') {
      const messageSpec = message.getSpec();
      globalThis.readChat(messageSpec);
    }
  }

  /* addMessage(message, opts) {
    // const chatId = makeId(5);
    const localPlayer = this.playersManager.getLocalPlayer();
    // const m = {
    //   type: 'chat',
    //   chatId,
    //   playerId: localPlayer.playerId,
    //   playerName: localPlayer.name,
    //   message,
    // };
    // return this.addPlayerMessage(localPlayer, m, opts);
    return this.addPlayerMessage(localPlayer, message, opts);
  }
  addNarratorMessage({
    name,
    description,
    message,
  }, {timeout = 3000} = {}) {
    const messageId = makeId(5);

    (async () => {
      this.ioBus.sendMessage('narratorMessageAdd', {
        name,
        description,
        message,
      });

      const preloadedMessage = this.narratorVoicer.preloadMessage(message);
      await this.voiceQueueManager.waitForVoiceTurn(async () => {
        this.ioBus.sendMessage('narratorMessageVoiceStart', {
          messageId,
          name,
          description,
          message,
        });

        this.dispatchEvent(new MessageEvent('voicestart', {
          data: {
            message,
            fullText: message,
          },
        }));
        const result = await this.narratorVoicer.start(preloadedMessage);

        this.ioBus.sendMessage('narratorMessageVoiceEnd', {
          messageId,
          name,
          description,
          message,
        });
        
        this.dispatchEvent(new MessageEvent('voiceend', {
          data: {
            fullText: message,
          },
        }));
      });
    })();
  }
  addPlayerEmotionMessage(player, message, emotions, {timeout = 3000} = {}) {
    const chatId = makeId(5);
    const m = {
      type: 'chat',
      chatId,
      playerId: player.playerId,
      playerName: player.name,
      message,
      emotions,
    };
    player.actionManager.addAction(m);

    const faceposeActions = [];
    for (let i = 0; i < emotions.length; i++) {
      const value = emotions[i];
      if (value > 0) {
        const faceposeAction = player.actionManager.addAction({
          type: 'facepose',
          emotion: `emotion-${i}`,
          value,
        });
        console.log('add face pose action', faceposeAction);
        faceposeActions.push(faceposeAction);
      }
    }
    
    this.dispatchEvent(new MessageEvent('messageadd', {
      data: {
        player,
        message: m,
      },
    }));

    const localTimeout = setTimeout(() => {
      this.removePlayerMessage(player, m);
      for (const faceposeAction of faceposeActions) {
        player.actionManager.removeAction(faceposeAction);
      }
    }, timeout);
    m.cleanup = () => {
      clearTimeout(localTimeout);
    };
    
    return m;
  }
  addPlayerMessage(player, message, opts) {
    return this.addPlayerEmotionMessage(player, message, [], opts);
  }

  removePlayerMessage(player, m) {
    m.cleanup();
    
    const action = player.actionManager.findAction(action => action.chatId === m.chatId);
    if (action) {
      player.actionManager.removeAction(action);
    } else {
      console.warn('remove unknown message action 2', m);
    }
    
    this.dispatchEvent(new MessageEvent('messageremove', {
      data: {
        player,
        message: m,
      },
    }));
  }

  removeMessage(m) {
    const localPlayer = this.playersManager.getLocalPlayer();
    this.removePlayerMessage(localPlayer, m);
  } */
}