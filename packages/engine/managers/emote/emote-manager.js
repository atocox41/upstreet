// import {playersManager} from '../players-manager.js';
import {
  emoteAnimations,
} from '../../avatars/animationHelpers.js';
import {
  emotes,
} from './emotes.js';

//

export class EmoteManager {
  constructor({
    playersManager,
    // ioBus,
  }) {
    // if (!playersManager || !ioBus) {
    //   console.warn('missing', {
    //     playersManager,
    //     ioBus,
    //   });
    //   debugger;
    // }

    this.playersManager = playersManager;
    // this.ioBus = ioBus;

    /* this.ioBus.registerHandler('triggerEmote', e => {
      this.triggerEmote(e.emote);
    }); */

    this.emoteTimeouts = new Map();
  }

  /* getEmoteSpec(emoteName) {
    const emoteHardName = emoteName.replace(/Soft$/, '');
    const emote = emotes.find(emote => emote.name === emoteHardName);
    return emote;
  } */

  triggerEmote(emoteName, player = this.playersManager.getLocalPlayer()) {
    return new Promise((accept, reject) => {
      // const emoteSpec = this.getEmoteSpec(emoteName);
      // const emoteHardName = emoteSpec.name;
      const emoteHardName = emoteName.replace(/Soft$/, '');

      // clear old emote
      const oldEmoteAction = player.actionManager.getActionType('emote');
      oldEmoteAction && player.actionManager.removeAction(oldEmoteAction);
      const oldFaceposeAction = player.actionManager.getActionType('facepose');
      oldFaceposeAction && player.actionManager.removeAction(oldFaceposeAction);

      const oldEmoteTimeout = this.emoteTimeouts.get(player);
      if (oldEmoteTimeout) {
        clearTimeout(oldEmoteTimeout);
        this.emoteTimeouts.delete(player);
      }

      // add new emote
      const newEmoteAction = {
        type: 'emote',
        animation: emoteHardName,
      };
      player.actionManager.addAction(newEmoteAction);

      const newFacePoseAction = {
        type: 'facepose',
        emotion: emoteHardName,
      };
      player.actionManager.addAction(newFacePoseAction);

      const emoteAnimation = emoteAnimations[emoteHardName];
      const emoteAnimationDuration = emoteAnimation.duration;
      const newEmoteTimeout = setTimeout(() => {
        const emoteAction = player.actionManager.findAction(action => action.type === 'emote' && action.animation === emoteHardName);
        player.actionManager.removeAction(emoteAction);
        const facePoseAction = player.actionManager.findAction(action => action.type === 'facepose' && action.emotion === emoteHardName);
        player.actionManager.removeAction(facePoseAction);
        this.emoteTimeouts.delete(player);

        accept();
      }, emoteAnimationDuration * 1000);
      this.emoteTimeouts.set(player, newEmoteTimeout);
    });
  }
}
// export {
//   emotes,
// };
// const emoteManager = new EmoteManager();
// export default emoteManager;