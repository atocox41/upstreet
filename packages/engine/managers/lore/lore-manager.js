import {
  Message,
} from './message.js';
import {
  Conversation,
} from './conversation.js';
import Fuse from 'fuse.js';

//

const maxHistoryMessges = 10;

//

const makePlayerSearchString = ({playerId, playerSpec}) => {
  const {
    name,
    bio,
  } = playerSpec;
  // return `${playerId}\n${name}\n${bio}`;
  return `${playerId}\n${name}`;
}
const makeItemSearchString = ({itemId, itemSpec}) => {
  const {
    name,
    description,
  } = itemSpec;
  // return `${itemId}\n${name}\n${description}`;
  return `${itemId}\n${name}`;
};

//

export class Lore extends EventTarget {
  #settings = [];
  
  #loreItems = [];

  #playerSpecs = new Map();
  #players = new Map();

  #itemSpecs = new Map();
  #itemObjects = new Map();

  #fusePlayers = new Fuse([], {
    includeScore: true,
    // includeMatches: true,
  });
  #fuseItems = new Fuse([], {
    includeScore: true,
    // includeMatches: true,
  });

  constructor({
    settings = [],
    
    loreItems = [],

    playerSpecs = new Map(),
    players = new Map(),

    itemSpecs = new Map(),
    itemObjects = new Map(),
  } = {}) {
    super();

    this.#settings = structuredClone(settings);

    this.#loreItems = structuredClone(loreItems);
    
    this.#playerSpecs = structuredClone(playerSpecs);
    this.#players = structuredClone(players);

    this.#itemSpecs = structuredClone(itemSpecs);
    this.#itemObjects = structuredClone(itemObjects);
  }
  clone() {
    return new Lore({
      settings: this.#settings,

      loreItems: this.#loreItems,
      
      playerSpecs: this.#playerSpecs,
      players: this.#players,

      itemSpecs: this.#itemSpecs,
      itemObjects: this.#itemObjects,
    });
  }

  toJSON() {
    return {
      settings: this.#settings,
      loreItems: this.#loreItems,
      playerSpecs: Object.entries(this.#playerSpecs)
        .map(([playerId, playerSpec]) => ({
          ...playerSpec,
          id: playerId,
        })),
      itemSpecs: Object.entries(this.#itemSpecs)
        .map(([itemId, itemSpec]) => ({
          ...itemSpec,
          id: itemId,
        })),
    };
  }

  addSetting(setting) {
    this.#settings.push(setting);
  }
  getSetting() {
    return this.#settings[0] ?? null;
  }
  removeSetting(setting) {
    const index = this.#settings.indexOf(setting);
    if (index !== -1) {
      this.#settings.splice(index, 1);
    } else {
      console.warn('setting not found', setting);
    }
  }

  getLoreItems() {
    return this.#loreItems;
  }
  addLoreItem(loreItem) {
    this.#loreItems.push(loreItem);

    this.dispatchEvent(new MessageEvent('update'));
  }
  removeLoreItem(loreItem) {
    const index = this.#loreItems.indexOf(loreItem);
    if (index !== -1) {
      this.#loreItems.splice(index, 1);
    } else {
      console.warn('lore item not found', loreItem);
    }

    this.dispatchEvent(new MessageEvent('update'));
  }

  getPlayerSpec(playerId) {
    return this.#playerSpecs.get(playerId);
  }
  getPlayer(playerId) {
    return this.#players.get(playerId);
  }
  getPlayerSpecs() {
    return Array.from(this.#playerSpecs.entries())
      .map(([playerId, playerSpec]) => ({
        ...playerSpec,
        id: playerId,
      }));
  }
  addPlayerSpec(playerId, playerSpec, player) {
    this.#playerSpecs.set(playerId, playerSpec);
    this.#players.set(playerId, player);

    const searchString = makePlayerSearchString({playerId, playerSpec});
    this.#fusePlayers.add(searchString);
  }
  removePlayerSpec(playerId) {
    const playerSpec = this.#playerSpecs.get(playerId);

    this.#playerSpecs.delete(playerId);
    this.#players.delete(playerId);

    const searchString = makePlayerSearchString({playerId, playerSpec});
    this.#fusePlayers.remove(d => d === searchString);

    this.dispatchEvent(new MessageEvent('update'));
  }

  getItemSpec(itemId) {
    return this.#itemSpecs.get(itemId);
  }
  getItemObject(itemId) {
    return this.#itemObjects.get(itemId);
  }
  getItemSpecs() {
    return Array.from(this.#itemSpecs.entries())
      .map(([itemId, itemSpec]) => ({
        ...itemSpec,
        id: itemId,
      }));
  }
  addItemSpec(itemId, itemSpec, object) {
    this.#itemSpecs.set(itemId, itemSpec);
    this.#itemObjects.set(itemId, object);

    const searchString = makeItemSearchString({itemId, itemSpec});
    this.#fuseItems.add(searchString);
  }
  removeItemSpec(itemId) {
    const itemSpec = this.#itemSpecs.get(itemId);

    this.#itemSpecs.delete(itemId);
    this.#itemObjects.delete(itemId);

    const searchString = makeItemSearchString({itemId, itemSpec});
    this.#fuseItems.remove(d => d === searchString);

    this.dispatchEvent(new MessageEvent('update'));
  }

  searchPlayers(q) {
    const results = this.#fusePlayers.search(q);
    return results;
  }
  searchItems(q) {
    const results = this.#fuseItems.search(q);
    return results;
  }
}

//

export function createAnonymousChatMessage({
  playerName,
  message,
}) {
  const m = new Message({
    spec: {
      role: 'assistant',
      content: `:${playerName}::SPEAK:::${message}`,
    },
    conversation: null,
  });
  return m;
}
export function createAnonymousEmotionMessage({
  playerName,
  emotion,
}) {
  const m = new Message({
    spec: {
      role: 'assistant',
      content: `:${playerName}::EMOTION=${emotion}:::`,
    },
    conversation: null,
  });
  return m;
}
export function createAnonymousEmoteMessage({
  playerName,
  emote,
}) {
  const m = new Message({
    spec: {
      role: 'assistant',
      content: `:${playerName}::EMOTE=${emote}:::`,
    },
    conversation: null,
  });
  return m;
}
export function createAnonymousTalkToMessage({
  playerName,
  target,
}) {
  const m = new Message({
    spec: {
      role: 'assistant',
      content: `:${playerName}::TALKTO=${target}:::`,
    },
    conversation: null,
  });
  return m;
}
export function createAnonymousFaceTowardMessage({
  playerName,
  target,
}) {
  const m = new Message({
    spec: {
      role: 'assistant',
      content: `:${playerName}::FACETOWARD=${target}:::`,
    },
    conversation: null,
  });
  return m;
}
export function createAnonymousMoveToMessage({
  playerName,
  target,
}) {
  const m = new Message({
    spec: {
      role: 'assistant',
      content: `:${playerName}::MOVETO=${target}:::`,
    },
    conversation: null,
  });
  return m;
}
export function createAnonymousLookAtMessage({
  playerName,
  target,
}) {
  const m = new Message({
    spec: {
      role: 'assistant',
      content: `:${playerName}::LOOKAT=${target}:::`,
    },
    conversation: null,
  });
  return m;
}
export function createChatMessageFromSpec({
  playerName = '',
  command = '',
  commandArgument = '',
  message = '',
}) {
  const content = `:${playerName}::${command}${commandArgument ? `=${commandArgument}` : ''}:::${message}`;
  console.log('got content', {
    content,
  });
  const m = new Message({
    spec: {
      role: 'assistant',
      content,
    },
    conversation: null,
  });
  return m;
  
}

//

export class LoreManager extends EventTarget {
  constructor({
    context,
    engine,
    // playersManager,
    // npcManager,
    chatManager,
  }) {
    super();

    if (!context || !engine /*|| !playersManager || !npcManager*/ || !chatManager) {
      console.warn('missing arguments', {
        context,
        engine,
        // playersManager,
        // npcManager,
        chatManager,
      });
      throw new Error('missing arguments');
    }

    this.context = context;
    this.engine = engine;
    // this.playersManager = playersManager;
    // this.npcManager = npcManager;
    this.chatManager = chatManager;

    this.#lore = new Lore();
  }
  #lore = null;

  getLore() {
    return this.#lore;
  }

  createAnonymousChatMessage() {
    return createAnonymousChatMessage.apply(this, arguments);
  }
  createAnonymousEmotionMessage() {
    return createAnonymousEmotionMessage.apply(this, arguments);
  }
  createAnonymousEmoteMessage() {
    return createAnonymousEmoteMessage.apply(this, arguments);
  }
  createAnonymousTalkToMessage() {
    return createAnonymousTalkToMessage.apply(this, arguments);
  }
  createAnonymousFaceTowardMessage() {
    return createAnonymousFaceTowardMessage.apply(this, arguments);
  }
  createAnonymousMoveToMessage() {
    return createAnonymousMoveToMessage.apply(this, arguments);
  }
  createAnonymousLookAtMessage() {
    return createAnonymousLookAtMessage.apply(this, arguments);
  }
  createChatMessageFromSpec() {
    return createChatMessageFromSpec.apply(this, arguments);
  }

  addSetting(...args) {
    return this.#lore.addSetting(...args);
  }
  removeSetting(...args) {
    return this.#lore.removeSetting(...args);
  }

  addLoreItem(...args) {
    return this.#lore.addLoreItem(...args);
  }
  removeLoreItem(...args) {
    return this.#lore.removeLoreItem(...args);
  }

  addPlayerSpec(playerId, playerSpec) {
    if (!playerSpec.name) {
      debugger;
    }
    return this.#lore.addPlayerSpec(playerId, playerSpec);
  }
  removePlayerSpec(playerId) {
    return this.#lore.removePlayerSpec(playerId);
  }

  addItemSpec(...args) {
    return this.#lore.addItemSpec(...args);
  }
  removeItemSpec(...args) {
    return this.#lore.removeItemSpec(...args);
  }

  searchPlayers(...args) {
    return this.#lore.searchPlayers(...args);
  }
  searchItems(...args) {
    return this.#lore.searchItems(...args);
  }

  createConversation(options) {
    const {
      aiClient,
    } = this.context;
    const lore = this.#lore;
    const conversationSpec = {
      aiClient,
      lore,
      loreManager: this,
      messages: [],
    };
    if (options?.messages) {
      const chatManager = this.chatManager;
      const messages = chatManager.getMessages();
      conversationSpec.messages = messages.slice(-maxHistoryMessges);
    }
    return new Conversation(conversationSpec);
  }
}