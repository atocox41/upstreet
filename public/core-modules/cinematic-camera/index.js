import * as THREE from 'three';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
// const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localEuler = new THREE.Euler();
const localEuler2 = new THREE.Euler();

//

// const y180Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
const cinematicCameraScript = {
  avatars: [
    {
      position: new THREE.Vector3(-2, 30, -10),
      quaternion: new THREE.Quaternion(),
      name: 'uni',
      // avatarUrl: '/avatars/default_1933.vrm',
      avatarUrl: '/avatars/scilly_drophunter_v31.10_Guilty.vrm',
      voiceEndpoint: 'elevenlabs:uni',
    },
    {
      position: new THREE.Vector3(-3, 30, -10),
      quaternion: new THREE.Quaternion(),
      name: 'drake',
      avatarUrl: '/avatars/default_2185.vrm',
      voiceEndpoint: 'elevenlabs:kaido',
    },
  ],
  script: [
    {
      startPosition: [0, 20, 0],
      startEuler: [0, 0, 0],
      endPosition: [0, 30, -100],
      endEuler: [0, 0.1, 0.1],
      duration: 5 * 1000,
    },
    {
      endPosition: [30, 50, -200],
      endEuler: [-0.1, -0.2, -0.2],
      duration: 5 * 1000,
    },
    {
      endPosition: [150, 30, -450],
      endEuler: [0, -Math.PI*0.4, -0.2],
      duration: 10 * 1000,
    },
    {
      endPosition: [420, 6, -500],
      endEuler: [0, -Math.PI*0.4, -0.1],
      duration: 7 * 1000,
    },
    {
      endPosition: [540, 1, -530],
      endEuler: [0, -Math.PI*0.4, -0.1],
      duration: 5 * 1000,
    },
    {
      endPosition: [800, 40, -550],
      endEuler: [0, -Math.PI*0.7, -0.1],
      duration: 10 * 1000,
    },
  ],
};
for (let i = 0; i < cinematicCameraScript.script.length; i++) {
  const script = cinematicCameraScript.script[i];
  if (!script.startPosition) {
    script.startPosition = cinematicCameraScript.script[i - 1].endPosition;
  }
  if (!script.startEuler) {
    script.startEuler = cinematicCameraScript.script[i - 1].endEuler;
  }
}

const useCinematicCamera = (ctx) => {
  const {
    useCameraManager,
    useEngineRenderer,
    useImportManager,
    // useAvatar,
    useLoadingManager,
  } = ctx;

  //

  const cameraManager = useCameraManager();
  const engineRenderer = useEngineRenderer();
  const importManager = useImportManager();
  // const Avatar = useAvatar();
  const loadingManager = useLoadingManager();

  //

  const {scene, camera} = engineRenderer;
  let scriptNodeIndex = 0;
  let scriptNode = cinematicCameraScript.script[scriptNodeIndex];
  const startTime = performance.now();
  let scriptNodeStartTime = startTime;

  cameraManager.setControllerFn(() => {
    const now = performance.now();

    // advance to the next script node
    if (now >= scriptNodeStartTime + scriptNode.duration) {
      scriptNodeIndex++;
      if (scriptNodeIndex < cinematicCameraScript.script.length) {
        scriptNodeStartTime += scriptNode.duration;
        scriptNode = cinematicCameraScript.script[scriptNodeIndex];
      } else {
        scriptNodeIndex = 0;
        scriptNodeStartTime = now;
        scriptNode = cinematicCameraScript.script[scriptNodeIndex];
      }
    }
    const currentScriptNodeTime = now - scriptNodeStartTime;
    const currentScriptNodeFactor = currentScriptNodeTime / scriptNode.duration;

    // lerp position
    camera.position.fromArray(scriptNode.startPosition).lerp(
      localVector2.fromArray(scriptNode.endPosition),
      currentScriptNodeFactor,
    );
    // slerp rotation
    camera.quaternion.setFromEuler(
      localEuler.setFromVector3(
        localVector3.fromArray(scriptNode.startEuler),
        'YXZ',
      ),
    ).slerp(
      localQuaternion2.setFromEuler(
        localEuler2.setFromVector3(
          localVector3.fromArray(scriptNode.endEuler),
          'YXZ',
        ),
      ),
      currentScriptNodeFactor,
    );

    camera.updateMatrixWorld();
    return camera;
  });

  ctx.waitUntil((async () => {
    return;

    const avatars = await Promise.all(cinematicCameraScript.avatars.map(async avatar => {
      const {
        position,
        quaternion,
        name,
        avatarUrl,
        voiceEndpoint,
      } = avatar;

      await loadingManager.waitForFinish();
      
      const app = importManager.createApp();
      sceneq.add(app);

      const avatarApp = await importManager.createAppAsync({
        app,
        
        position,
        quaternion,
        
        // start_url: avatarUrl,
        type: 'application/npc',
        content: {
          name,
          avatarUrl,
          voiceEndpoint,
        },
      });
      // console.log('loaded avatar', avatarApp);

      cameraManager.setControllerFn(() => {
        // const now = performance.now();
        // avatarApp.npc.avatar.modelBones.Head;

        const p = new THREE.Vector3();
        const q = new THREE.Quaternion();
        const s = new THREE.Vector3();
        avatarApp.npc.avatar.modelBones.Head.matrixWorld.decompose(p, q, s);

        p.add(new THREE.Vector3(0, 0, 1).applyQuaternion(q));
        // q.multiply(y180Quaternion);

        camera.position.copy(p);
        camera.quaternion.copy(q);
        // console.log('lol', avatarApp.npc.avatar.modelBones.Head.position.toArray());
        camera.updateMatrixWorld();
      });

      // avatarApp.updateMatrixWorld();
      return avatarApp;
    }));
    const femaleAvatar = avatars[0];
    const maleAvatar = avatars[1];

    (async () => {
      const faceposeAction = femaleAvatar.npc.actionManager.addAction({
        type: 'facepose',
        // emotion: 'angry',
        emotion: 'sorrow',
        value: 1,
      });

      await femaleAvatar.npc.playAudioStream(`hey... we've been going in circles!`);
      await maleAvatar.npc.playAudioStream(`oh sorry, I just couldn't help myself...`);
    })();
  })());
};

const CinematicCamera = (ctx) => {
  useCinematicCamera(ctx);

  const app = ctx.useApp();
  return app;
};
export default CinematicCamera;