import {
  Parser,
} from '../../ai-agent/utils/avatarml-stream-parser.js';
import {
  messageTypes,

  messageToPlayerName,
  messageToCommandName,
  messageToReact,
  messageToText,
} from './messages.jsx';

const parser = new Parser();

export class Message extends EventTarget {
  constructor({
    spec,
    conversation,
  }) {
    super();

    this.#spec = spec;
    this.#conversation = conversation;
  }
  #spec = null;
  #conversation = null;

  getRaw() {
    return this.#spec;
  }
  getSpec() {
    return parser.parse(this.#spec.content)[0] ?? null;
  }
  getConversation() {
    return this.#conversation;
  }

  getId() {
    debugger;
    // return MessageRenderer.getId(this);
  }
  getName() {
    debugger;
    // return MessageRenderer.getName(this);
  }

  getPlayerName() {
    return messageToPlayerName(this);
  }
  getCommandName() {
    return messageToCommandName(this);
  }

  toReact(opts) {
    return messageToReact(this, opts);
    // return MessageRenderer.toReact(this, opts);
  }
  toText() {
    return messageToText(this);
    // return MessageRenderer.toText(this);
  }
}