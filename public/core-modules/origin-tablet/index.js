// import * as THREE from 'three';
// import easing from './easing.js';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useScene, useActivate, useChatManager, useLoreAI, getNextInstanceId, useLoaders, usePhysics, useCleanup} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const otLore = `\
# Origin Tablet overview

The origin tablets are ancient holy devices. They are rocks with symbols on them.
They give out information about the world, with 100% accuracy.
However, they also have a tendency to create self-fulfilling prophecies.
`;
const loreSpeechPrompt = `\
${otLore}

# Scene 1

A character activates the tablet.

Character 1:`;
const loreTextPrompt = `\
${otLore}

# Prophecy Transcript

Here are some prophecies the origin tablets have generated:

-`;

export default () => {
  const app = useApp();
  const scene = useScene();
  const chatManager = useChatManager();
  const loreAI = useLoreAI();
  // const physics = usePhysics();

  app.name = 'originTablet';

  // let activateCb = null;
  // let frameCb = null;
  useActivate(() => {
    (async () => {
      for (;;) {
        const speechResult = await loreAI.generate(loreSpeechPrompt, {
          end: `\n`,
        });
        console.log('speech result', {speechResult});
        if (speechResult) {
          chatManager.addMessage(speechResult);
          break;
        } else {
          console.warn('empty result; retrying...');
          continue;
        }
      }
    })();
    (async () => {
      await loreAI.generate(loreTextPrompt, {
      // end: '\n',
    });
    })();
  });
  /* useFrame(() => {
    frameCb && frameCb();
  }); */

  // let physicsIds = [];
  let pillarApp = null;
  (async () => {
    const u = `${baseUrl}Origin_Tablets_Pillar_V2_avaer_hax.glb`;
    const m = await metaversefile.import(u);
    pillarApp = metaversefile.createApp({
      name: u,
    });
    app.add(pillarApp);
    pillarApp.updateMatrixWorld();
    
    pillarApp.instanceId = getNextInstanceId();
    /* pillarApp.position.copy(app.position);
    pillarApp.quaternion.copy(app.quaternion);
    pillarApp.scale.copy(app.scale);
    pillarApp.updateMatrixWorld(); */
    pillarApp.setComponent('physics', true);
    await pillarApp.addModule(m);
  })();

  app.getPhysicsObjects = () => pillarApp ? pillarApp.getPhysicsObjects() : [];
  
  /* useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
  }); */

  return app;
};
