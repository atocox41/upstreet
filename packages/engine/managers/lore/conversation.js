import {
  aiProxyHost,
} from '../../endpoints.js';
import {
  emotes,
} from '../emote/emotes.js';
import {
  emotions,
} from '../emote/emotions.js';
import {
  cleanLowercase,
} from '../../util.js';
import {
  Message,
} from './message.js';
import {
  Lore,
} from './lore-manager.js';
import {
  // messageTypes,
  messageTypesArray,
} from './messages.jsx';

//

export class Conversation extends EventTarget {
  constructor({
    aiClient,
    loreManager = null,
    lore = new Lore(),
    messages = [],
  }) {
    super();

    this.aiClient = aiClient;
    this.loreManager = loreManager;
    this.#lore = lore;
    this.#messages = messages;
  }
  #lore = null;
  #messages = [];
  
  #getAllPlayers() {
    const {
      loreManager,
    } = this;
    const {
      engine,
    } = loreManager;
    const {
      playersManager,
      npcManager,
    } = engine;

    const allPlayers = playersManager.getAllPlayers()
      .concat(
        Array.from(npcManager.npcPlayers)
      );
    return allPlayers;
  }
  getAppCompleter({
    localPlayerId,
    app,
    physicsId,
  }) {
    const {
      appType,
    } = app;
    switch (appType) {
      case 'vrm': {
        const allPlayers = this.#getAllPlayers();
        const allPlayerAppSpecs = allPlayers.map(player => {
          return {
            player,
            apps: Array.from(player.appManager.apps.values()),
          };
        });
        const player = allPlayerAppSpecs.find(playerSpec => {
          const {
            apps,
          } = playerSpec;
          return apps.includes(app);
        })?.player ?? null;
        if (player) {
          const {playerId} = player;
          const completer = {
            object: player.avatar.modelBones.Head,
            completeFn: async () => {
              return await this.#completeInspectPlayer({
                localPlayerId,
                playerId,
              });
            },
          };
          return completer;
        } else {
          console.warn('no player associated with app', app);
          throw new Error('no player associated with app');
        }
      }
      case 'character360': {
        const allPlayers = this.#getAllPlayers();
        const allPlayerAppSpecs = allPlayers.map(player => {
          return {
            player,
            apps: Array.from(player.appManager.apps.values()),
          };
        });
        const player = allPlayerAppSpecs.find(playerSpec => {
          const {
            apps,
          } = playerSpec;
          return apps.includes(app);
        })?.player ?? null;
        if (player) {
          const {playerId} = player;
          const completer = {
            object: player.avatar.modelBones.Head,
            completeFn: async () => {
              return await this.#completeInspectPlayer({
                localPlayerId,
                playerId,
              });
            },
          };
          return completer;
        } else {
          console.warn('no player associated with app', app);
          throw new Error('no player associated with app');
        }
      }
      default: {
        let targetSpec = app.spec;
        const {
          loreManager,
        } = this;
        const {
          engine,
        } = loreManager;
        const {
          physicsTracker,
        } = engine;
        const physicsObject = physicsTracker.getPhysicsObjectByPhysicsId(physicsId);
        if (physicsObject.name || physicsObject.description) {
          targetSpec = {
            name: physicsObject.name,
            description: physicsObject.description,
          };
        }
        const completer = {
          object: app,
          completeFn: async () => {
            return await this.#completeInspectTarget({
              localPlayerId,
              targetSpec,
            });
          },
        };
        return completer;
      }
    }
  }
  async #completeInspectPlayer({
    localPlayerId,
    playerId,
  }) {
    const localPlayerSpec = this.#lore.getPlayerSpec(localPlayerId);
    /* if (!localPlayerSpec) {
      debugger;
    } */
    const remotePlayerSpec = this.#lore.getPlayerSpec(playerId);
    /* if (!remotePlayerSpec) {
      debugger;
    } */

    const messageSpec = {
      role: 'user',
      content: `\
${localPlayerSpec.name} starts a conversation with:
${remotePlayerSpec.name}
${remotePlayerSpec.description}
Make the response something that is likely to lead to an interesting conversation.
`,
    };
    const triggerMessage = new Message({
      spec: messageSpec,
      conversation: this,
    });
    return await this.completeMessage(triggerMessage.getRaw());
  }
  async #completeInspectTarget({
    localPlayerId,
    targetSpec,
  }) {
    const localPlayerSpec = this.#lore.getPlayerSpec(localPlayerId);

    const commentString = targetSpec.name || targetSpec.description;
    if (!commentString) {
      console.log('missing', {
        commentString,
      });
      debugger;
    }
    const messageSpec = {
      role: 'user',
      content: `\
${localPlayerSpec.name} comments on: ${commentString}
Make the response interesting, rather than literal.
`,
    };
    const triggerMessage = new Message({
      spec: messageSpec,
      conversation: this,
    });
    return await this.completeMessage(triggerMessage.getRaw());
  }
  async nextMessage(opts) {
    const messages = this.getMessages(opts).map(m => m.getRaw());
    const message = await this.completeMessages(messages, opts);
    return message;
  }
  getMessages({
    functionName = null,
    playerSpec = null,
  } = {}) {
    const setting = this.#lore.getSetting();

    //

    const playerSpecsArray = this.#lore.getPlayerSpecs();

    //
    
    const loreItems = this.#lore.getLoreItems();

    //

    const playerNames = playerSpecsArray
      .map(playerSpec => cleanLowercase(playerSpec.name));
    const playerName = playerSpecsArray.length > 0 ?
      playerNames[0]
    :
      'character_name';

    //

    const targetPlayerNames = playerNames;
    const targetPlayerName = playerSpecsArray.length > 1 ?
      cleanLowercase(playerNames[1])
    :
      'target_character_name';
    
    //

    const locationNames = [
      cleanLowercase('Home'),
    ];
    const targetLocationName = locationNames[0];

    //

    let validFunctions = messageTypesArray.map(({format}) => format);
    const exampleOpts = {
      characterName: playerName,
      targetCharacterName: targetPlayerName,
      targetLocationName: targetLocationName,
    };
    let validFunctionExamples = messageTypesArray.map(({example}) => example(exampleOpts));
    const argOpts = {
      characterNames: playerNames,
      targetCharacterNames: targetPlayerNames,
      emotes,
      emotions,
      locationNames,
    };
    let validFunctionArguments = messageTypesArray.map(({args}) => args(argOpts));
    
    if (functionName) {
      validFunctions = validFunctions.filter(s => {
        return s.includes(':' + functionName + ':');
      });
      validFunctionExamples = validFunctionExamples.filter(s => {
        return s.includes(':' + functionName + ':');
      });
      validFunctionArguments = validFunctionArguments.filter(s => {
        return s.includes(':' + functionName + ':');
      });
    }

    //

    let validCharacters = playerSpecsArray;
    if (playerSpec) {
      validCharacters = validCharacters.filter(character => {
        return character.name === playerSpec.name;
      });
    }

    //

    const systemMessage = `\
Your job is to write AvatarML scripts.
AvatarML is a language for scripting virtual avatars.

# AvatarML specification

Each line of AvatarML specifies an action for an avatar to take.
The general format is:
${validFunctions.map(functionArgument => `\
${functionArgument}
`).join('\n')}

## Examples

${validFunctionExamples.map(functionExample => `\
${functionExample}
`).join('\n')}

${messageTypesArray.map((messageType, i) => {
  const functionArguments = validFunctionArguments[i];
  return `\
The valid ${messageType.name} arguments are:
${functionArguments.join(' ')}
`;
})}

${setting ? `# Setting
The current scene where the action takes place:

${setting.name}
${setting.description}
` : ''}

# Characters
Here are the characters in the AvatarML scene:

${validCharacters.map(({name, bio}) => `\
## Name
${JSON.stringify(name)}
## Bio
${bio || ''}
`).join('\n')}

AvatarML commands always refer to the character's full name exactly (without quotes).

# Lore items
Lore items that can be used for scene context:

${loreItems.map(({name, description}) => `\
- ${name}: ${description}\
`).join('\n')}

# Imporant director's notes
- You must ALWAYS reply in AvatarML format, as specified above.
- Do not repeat lines characters have already said.
- Each character should follow their personality according to their biography.
- Progress the story with story beats, with new events following on from the previous ones.
`;

    const messages = [
      {
        role: 'system',
        content: systemMessage,
      },
    ]
    .map(spec => new Message({
      spec,
      conversation: this,
    }))
    .concat(this.#messages);
    return messages;
  }
  getMessagesRawFinal({
    functionName = null,
    playerSpec = null,
    text = '',
  } = {}) {
    const messages = [];

    let s = '';
    if (playerSpec) {
      s += `The next character to act should be: ${playerSpec.name}`;
    }
    if (functionName) {
      if (s) {
        s += '\n';
      }
      s += `The next character's action should be: ${functionName}`;
    }
    if (text) {
      if (s) {
        s += '\n';
      }
      s += `The next line of dialogue should be: ${text}`;
    }

    const content = `\
Continue the conversation.${s ? `\n${s}` : ''}
`;
    const finalMessage = {
      role: 'user',
      content,
    };
    messages.push(finalMessage);
    return messages;
  }
  async completeMessage(nextMessage, opts = {}) {
    const message = await this.completeMessages([
      nextMessage,
    ], opts);
    return message;
  }
  async completeMessages(messages, opts) {
    const message = await this.#getCompletion(messages, opts);
    return message;
  }

  //

  async #getApiCompletion(messages) {
    const {
      // modelType,
      modelName,
    } = this.aiClient;

    const response = await fetch(`https://${aiProxyHost}/api/ai/chat/completions`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        model: modelName,
        messages,
        stop: ['\n'],
      }),
    });

    const j = await response.json();
    const message = j.choices[0].message.content;
    return message;
  }
  async #getCompletion(mainMessages = [], opts = {}) {
    const {
      modelType,
      // modelName,
    } = this.aiClient;

    if (modelType === 'openai') {
      const _getMessageSpec = async () => {
        const messages = [
          ...this.getMessages(opts).map(m => m.getRaw()),
          ...mainMessages,
          ...this.getMessagesRawFinal(opts),
        ];
        // console.log('get completion', messages);
        const message = await this.#getApiCompletion(messages);
        return message;
      };
      const messageSpec = await _getMessageSpec();

      const message = new Message({
        spec: {
          role: 'assistant',
          content: messageSpec,
        },
        conversation: this,
      });
      this.#addMessage(message);
      return message;
    } else {
      throw new Error('unsupported ai client model type: ' + JSON.stringify(modelType));
    }
  }
  async getNextMessageOptions() {
    const lastMessages = this.getMessages();
    const lastMessage = lastMessages[lastMessages.length - 1];
    const playerName = lastMessage.getPlayerName();
    const optionsMessage = {
      role: 'user',
      content: `\
Present a list of options the next character could SPEAK, in the following format:
::RESPONSE_OPTIONS:::option|option|option|option
Generate up to 4 options.
The options should be 2-5 words long. They should be lines of dialogue the character can SPEAK.
The next line should start with ::RESPONSE_OPTIONS:::
`,
    };
    const messages = [
      ...lastMessages.map(m => m.getRaw()),
      optionsMessage,
    ];
    const message = await this.#getApiCompletion(messages);
    const match = message.match(/:::(.+)$/);
    const options = match ? match[1].split('|') : ['...'];
    return options;
  }
  #addMessage(message) {
    this.#messages.push(message);

    this.dispatchEvent(new MessageEvent('message', {
      data: {
        message,
      },
    }));
  }
  injectPlayerMessage(
    playerSpec,
    text,
  ) {
    const message = new Message({
      spec: {
        role: 'assistant',
        content: `:${playerSpec.name}::SPEAK:::${text}`,
      },
      conversation: this,
    });
    this.#addMessage(message);
  }
  injectAnonymousMessage(
    text,
  ) {
    return this.nextMessage({
      text,
    });
  }
  close() {
    this.dispatchEvent(new MessageEvent('close'));
  }
}