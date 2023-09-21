import * as THREE from 'three';
import React from 'react';
import classnames from 'classnames';
import {
  emotes,
} from '../emote/emotes.js';
import {
  emotions,
} from '../emote/emotions.js';

//

export const messageTypesArray = [
  {
    name: 'SPEAK',
    format: `:{character_name}::SPEAK:::{chat_message}`,
    example: ({
      characterName,
    }) => `:${characterName}::SPEAK:::Hey guys, what's up?`,
    args: ({
      characterNames,
    }) => characterNames,
    render: ({
      styles,
      key,
      characterName,
      commandArgument,
      message,
    }) => (
      <div className={classnames(
        styles.chatMessage,
        styles.say,
      )} key={key}>
        <span className={styles.name}>{characterName}</span>
        <span className={styles.text}>: {message}</span>
      </div>
    ),
    execute: async ({
      messageObject,
      message,
      player,
      voiceQueueManager,
    }) => {
      const stream = player.voicer.getStream(message);

      await voiceQueueManager.waitForTurn(async () => {
        await player.playAudioStream(stream, {
          onStart: () => {
            messageObject.dispatchEvent(new MessageEvent('playStart', {
              data: {
                player,
              },
            }));
          },
          onEnd: () => {
            messageObject.dispatchEvent(new MessageEvent('playEnd', {
              data: {
                player,
              },
            }));
          },
        });
      });
    },
  },
  {
    name: 'EMOTE',
    format: `:{character_name}::EMOTE={emote}:::{chat_message}`,
    example: ({characterName}) => `:${characterName}::EMOTE=${emotes[0]}:::No way!`,
    args: ({
      emotes,
    }) => emotes,
    render: ({
      styles,
      key,
      characterName,
      commandArgument,
      message,
    }) => (
      <div className={classnames(
        styles.chatMessage,
        styles.emote,
      )} key={key}>
        <span className={styles.text}>*</span>
        <span className={styles.name}>{characterName}</span>
        <span className={styles.text}> emotes </span>
        <span className={styles.value}>{commandArgument}</span>
        <span className={styles.text}>*</span>
      </div>
    ),
    execute: async ({
      commandArgument,
      player,
      emoteManager,
    }) => {
      const emote = commandArgument;
      if (emote) {
        emoteManager.triggerEmote(emote, player);
      } else {
        console.warn('invalid emote', commandArgument);
      }
    },
  },
  {
    name: 'EMOTION',
    format: `:{character_name}::EMOTION={emotion}:::{chat_message}`,
    example: ({characterName}) => `:${characterName}::EMOTION=${emotions[0]}:::Sounds good.`,
    args: ({
      emotions,
    }) => emotions,
    render: ({
      styles,
      key,
      characterName,
      commandArgument,
      message,
    }) => (
      <div className={classnames(
        styles.chatMessage,
        styles.emote,
      )} key={key}>
        <span className={styles.text}>*</span>
        <span className={styles.name}>{characterName}</span>
        <span className={styles.text}> change emotion to </span>
        <span className={styles.value}>{commandArgument}</span>
        <span className={styles.text}>*</span>
      </div>
    ),
    execute: async ({
      commandArgument,
      player,
    }) => {
      const emotion = commandArgument;
      if (emotions.includes(emotion)) {
        const faceposeAction = player.actionManager.addAction({
          type: 'facepose',
          emotion,
          value: 1,
        });

        setTimeout(() => {
          player.actionManager.removeAction(faceposeAction);
        }, 2000);
      } else {
        console.warn('invalid emotion', emotion);
      }
    },
  },
  {
    name: 'TALKTO',
    format: `:{character_name}::TALKTO={target}:::{chat_message}`,
    example: ({
      characterName,
      targetCharacterName,
    }) => `:${characterName}::TALKTO=${targetCharacterName}:::Hey there, how are you?`,
    args: ({
      targetCharacterNames,
    }) => targetCharacterNames,
    render: ({
      styles,
      key,
      characterName,
      commandArgument,
      message,
    }) => (
      <div className={classnames(
        styles.chatMessage,
        styles.emote,
      )} key={key}>
        <span className={styles.text}>*</span>
        <span className={styles.name}>{characterName}</span>
        <span className={styles.text}> talks to </span>
        <span className={styles.value}>{commandArgument}</span>
        <span className={styles.text}>*</span>
      </div>
    ),
    execute: async ({
      commandArgument,
      player,
    }) => {
      const target = commandArgument;
      /* const targetObject = getFuzzyTargetObject({
        localPlayer: player,
        target,
        playersManager: this.playersManager,
        loreManager: this.loreManager,
        npcManager: this.npcManager,
        physicsTracker: this.physicsTracker,
      }); */

      const timestamp = performance.now();
      player.characterBehavior.addTalkToAction(
        target,
        timestamp,
      );
    },
  },
  {
    name: 'FACETOWARD',
    format: `:{character_name}::FACETOWARD={target}:::{chat_message}`,
    example: ({
      characterName,
      targetCharacterName,
    }) => `:${characterName}::FACETOWARD=${targetCharacterName}:::Wait, what's this?`,
    args: ({
      targetCharacterNames,
    }) => targetCharacterNames,
    render: ({
      styles,
      key,
      characterName,
      commandArgument,
      message,
    }) => (
      <div className={classnames(
        styles.chatMessage,
        styles.emote,
      )} key={key}>
        <span className={styles.text}>*</span>
        <span className={styles.name}>{characterName}</span>
        <span className={styles.text}> faces toward </span>
        <span className={styles.value}>{commandArgument}</span>
        <span className={styles.text}>*</span>
      </div>
    ),
    execute: async ({
      // commandArgument,
      player,
      targetObject,

      // playersManager,
      // loreManager,
      // npcManager,
      // physicsTracker,
    }) => {
      // const target = commandArgument;
      // const targetObject = getFuzzyTargetObject({
      //   localPlayer: player,
      //   target,
      //   playersManager: this.playersManager,
      //   loreManager: this.loreManager,
      //   npcManager: this.npcManager,
      //   physicsTracker: this.physicsTracker,
      // });
      const targetPosition = targetObject.position;

      const timestamp = performance.now();
      player.characterBehavior.addFaceTowardAction(
        targetPosition,
        timestamp,
      );
    },
  },
  {
    name: 'MOVETO',
    format: `:{character_name}::MOVETO={target}:::{chat_message}`,
    example: ({
      characterName,
      targetLocationName,
    }) => `:${characterName}::MOVETO=${targetLocationName}:::Yeah... I'm going home.`,
    args: ({
      targetCharacterNames,
    }) => targetCharacterNames,
    render: ({
      styles,
      key,
      characterName,
      commandArgument,
      message,
    }) => (
      <div className={classnames(
        styles.chatMessage,
        styles.emote,
      )} key={key}>
        <span className={styles.text}>*</span>
        <span className={styles.name}>{characterName}</span>
        <span className={styles.text}> moves to </span>
        <span className={styles.value}>{commandArgument}</span>
        <span className={styles.text}>*</span>
      </div>
    ),
    execute: async ({
      // commandArgument,
      player,
      targetObject,

      // playersManager,
      // loreManager,
      // npcManager,
      // physicsTracker,
    }) => {
      // const target = commandArgument;
      // const targetObject = getFuzzyTargetObject({
      //   localPlayer: player,
      //   target,
      //   playersManager: this.playersManager,
      //   loreManager: this.loreManager,
      //   npcManager: this.npcManager,
      //   physicsTracker: this.physicsTracker,
      // });
      console.log('move to', targetObject);
      if (targetObject) {
        const targetPosition = targetObject.position;

        // console.log('got', targetObject);
        const bbox2 = targetObject.physicsMesh ?
          new THREE.Box3()
            .setFromBufferAttribute(targetObject.physicsMesh.geometry.attributes.position)
            .applyMatrix4(targetObject.physicsMesh.matrixWorld)
        :
          null;

        /* const {scene} = this.engineRenderer;

        const hitMap = getHitMap({
          localPlayer: player,
          playersManager: this.playersManager,
          npcManager: this.npcManager,
        });

        const mesh = makeHitMesh(hitMap);
        scene.add(mesh);
        mesh.updateMatrixWorld();

        const floorPosition = player.position.clone()
          .add(new THREE.Vector3(0, -player.avatar.height, 0));
        // console.log('got target object', targetObject);
        
        targetObject.physicsMesh.visible = true;
        scene.add(targetObject);
        targetObject.updateMatrixWorld();

        const size2 = bbox2.getSize(new THREE.Vector3());
        // mesh for the bounding box
        const bboxMesh2 = new THREE.Mesh(
          new THREE.BoxBufferGeometry(1, 1, 1),
          new THREE.MeshPhongMaterial({
            color: 0xff0000,
          }),
        );
        bboxMesh2.position.set(
          (bbox2.min.x + bbox2.max.x)/2,
          (bbox2.min.y + bbox2.max.y)/2,
          (bbox2.min.z + bbox2.max.z)/2,
        );
        bboxMesh2.scale.copy(size2);
        scene.add(bboxMesh2);
        bboxMesh2.updateMatrixWorld();

        const line = getLine(
          hitMap,
          floorPosition,
          targetPosition,
        );

        if (line.length > 0) {
          const geometry = makePathLineGeometry(line);
          const map = new THREE.TextureLoader()
            .load(`/images/arrowtail.png`);
          const material = new THREE.MeshBasicMaterial({
            map,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.frustumCulled = false;
          mesh.visible = geometry.attributes.position.array.length > 0;
          scene.add(mesh);
          mesh.updateMatrixWorld();
        } */

        const timestamp = performance.now();
        player.characterBehavior.addWaypointAction(
          targetPosition,
          timestamp,
          {
            boundingBox: bbox2,
          },
        );
      }
    },
  },
  {
    name: 'LOOKAT',
    format: `:{character_name}::LOOKAT={target}:::{chat_message}`,
    example: ({
      characterName,
      targetLocationName,
    }) => `:${characterName}::LOOKAT=${targetLocationName}:::Yeah... I'm going home.`,
    args: ({
      targetCharacterNames,
    }) => targetCharacterNames,
    render: ({
      styles,
      key,
      characterName,
      commandArgument,
      message,
    }) => (
      <div className={classnames(
        styles.chatMessage,
        styles.emote,
      )} key={key}>
        <span className={styles.text}>*</span>
        <span className={styles.name}>{characterName}</span>
        <span className={styles.text}> looks at </span>
        <span className={styles.value}>{commandArgument}</span>
        <span className={styles.text}>*</span>
      </div>
    ),
    execute: async ({
      // commandArgument,
      player,
      targetObject,

      // playersManager,
      // loreManager,
      // npcManager,
      // physicsTracker,
    }) => {
      // const target = commandArgument;
      // const targetObject = getFuzzyTargetObject({
      //   localPlayer: player,
      //   target,
      //   playersManager: this.playersManager,
      //   loreManager: this.loreManager,
      //   npcManager: this.npcManager,
      //   physicsTracker: this.physicsTracker,
      // });
      if (targetObject) {
        const targetPosition = targetObject.position;

        // console.log('got', targetObject);
        const bbox2 = targetObject.physicsMesh ?
          new THREE.Box3()
            .setFromBufferAttribute(targetObject.physicsMesh.geometry.attributes.position)
            .applyMatrix4(targetObject.physicsMesh.matrixWorld)
        :
          null;

        /* const {scene} = this.engineRenderer;

        const hitMap = getHitMap({
          localPlayer: player,
          playersManager: this.playersManager,
          npcManager: this.npcManager,
        });

        const mesh = makeHitMesh(hitMap);
        scene.add(mesh);
        mesh.updateMatrixWorld();

        const floorPosition = player.position.clone()
          .add(new THREE.Vector3(0, -player.avatar.height, 0));
        // console.log('got target object', targetObject);
        
        targetObject.physicsMesh.visible = true;
        scene.add(targetObject);
        targetObject.updateMatrixWorld();

        const size2 = bbox2.getSize(new THREE.Vector3());
        // mesh for the bounding box
        const bboxMesh2 = new THREE.Mesh(
          new THREE.BoxBufferGeometry(1, 1, 1),
          new THREE.MeshPhongMaterial({
            color: 0xff0000,
          }),
        );
        bboxMesh2.position.set(
          (bbox2.min.x + bbox2.max.x)/2,
          (bbox2.min.y + bbox2.max.y)/2,
          (bbox2.min.z + bbox2.max.z)/2,
        );
        bboxMesh2.scale.copy(size2);
        scene.add(bboxMesh2);
        bboxMesh2.updateMatrixWorld();

        const line = getLine(
          hitMap,
          floorPosition,
          targetPosition,
        );

        if (line.length > 0) {
          const geometry = makePathLineGeometry(line);
          const map = new THREE.TextureLoader()
            .load(`/images/arrowtail.png`);
          const material = new THREE.MeshBasicMaterial({
            map,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.frustumCulled = false;
          mesh.visible = geometry.attributes.position.array.length > 0;
          scene.add(mesh);
          mesh.updateMatrixWorld();
        } */

        const timestamp = performance.now();
        player.characterBehavior.addWaypointAction(
          targetPosition,
          timestamp,
          {
            boundingBox: bbox2,
          },
        );
      }
    },
  },
];
export const messageTypes = (() => {
  const result = {};
  for (const messageType of messageTypesArray) {
    result[messageType.name] = messageType;
  }
  return result;
})();
export const messageTypeNames = messageTypesArray.map(m => m.name);

//

export const messageToPlayerName = (m) => {
  const spec = m.getSpec();
  const {
    characterName,
  } = spec;
  return characterName;
};
export const messageToCommandName = (m) => {
  const {
    command,
  } = m.getSpec();
  return command;
};
export const messageToReact = (m, opts) => {
  const {
    styles,
    key = null,
  } = (opts ?? {});

  const spec = m.getSpec();
  if (!spec) {
    const raw = m.getRaw();
    console.warn('failed to parse spec', raw);
    debugger;
    return null;
  }
  const {
    command,
    characterName,
    commandArgument,
    message,
  } = spec;

  const messageType = messageTypesArray.find(({name}) => name === command);
  if (messageType) {
    const renderFn = messageType.render;
    return renderFn({
      styles,
      key,
      characterName,
      commandArgument,
      message,
    });
  } else {
    console.warn('unknown message type', command, spec);
    return null;
  }
};
export const messageToText = (m) => {
  const spec = m.getSpec();
  return spec.message;
};