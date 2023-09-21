export default ctx => {
  const {
    useApp,
    useRealmManager,
    useAudioManager,
    useLoaders,
  } = ctx;

  const app = useApp();
  const realmManager = useRealmManager();
  const audioManager = useAudioManager();
  const loaders = useLoaders();
  // console.log('got loaders', loaders);
  const {
    gltfLoader,
    fbxLoader,
  } = loaders;

  ctx.waitUntil((async () => {
    // load target vrm
    const rootScene = realmManager.getRootRealm();

    // const position = new THREE.Vector3(0, 0, 0);
    // const quaternion = y180Quaternion;

    // const vrmApp = await rootScene.appManager.addAppAsync({
    //   position,
    //   quaternion,
    //   contentId: '/public/avatars/Stevia_cl_a_1.03.vrm',
    // });
    const vrmObject = await new Promise((accept, reject) => {
      gltfLoader.load('./public/avatars/Stevia_cl_a_1.03.vrm', o => {
        // accept(o.scene);
        accept(o);
      }, function onprogress() {}, reject);
    });
    const {
      // skinnedMeshes,
      skeleton,
      modelBones,
      // foundModelBones,
      // flipZ,
      // flipY,
      // flipLeg,
      // tailBones,
      // armature,
      // armatureQuaternion,
      // armatureMatrixInverse,
      // retargetedAnimations,
    } = Avatar.bindAvatar(vrmObject);

    // console.log('got vrm app', vrmApp);
    const vrmApp = vrmObject.scene;
    vrmApp.traverse(o => {
      if (o.isMesh) {
        o.frustumCulled = false;
      }
    });
    rootScene.add(vrmApp);

    // extract mesh from vrm
    // let mesh = null;
    // vrmApp.traverse(o => {
    //   if (mesh === null && o.isMesh) {
    //     mesh = o;
    //   }
    // });
    // const {skeleton} = mesh;
    const {bones} = skeleton;

    console.log('loaded vrm app', bones);

    // load animation fbx

    const fbxSrc = await new Promise((accept, reject) => {
      fbxLoader.load('./public/animations/edge.fbx', accept, function onprogress() {}, reject);
    });
    // console.log('load 2', fbxSrc);
    // const srcAnimation = fbxSrc.animations[0];

    // console.log('loaded fbx animation', [
    //   srcAnimation,
    //   // dstAnimation,
    // ]);

    const {audioContext} = audioManager;

    const audioRes = await fetch('/audio/everything3.mp3');
    // const audioBlob = await audioRes.blob();
    const arrayBuffer = await audioRes.arrayBuffer();
    const audioBuffer = await new Promise((accept, reject) => {
      audioContext.decodeAudioData(arrayBuffer, accept, reject);
    });
    const audioBufferSourceNode = audioContext.createBufferSource();
    audioBufferSourceNode.buffer = audioBuffer;
    // const audio = new Audio('/audio/everything3.mp3');
    // await new Promise((accept, reject) => {
    //   audio.addEventListener('canplaythrough', accept);
    //   audio.addEventListener('error', reject);
    // });

    // start animating
    const animateVrmFbx = makeFbxAnimator({
      fbxSrc,
      skeleton,
      modelBones,
    });

    // if the audio context is suspended wait for audio context to start
    if (audioContext.state !== 'running') {
      const click = () => {
        audioContext.resume();
        console.log('resumed audio context');

        cleanup();
      };
      window.addEventListener('click', click);

      const cleanup = () => {
        window.removeEventListener('click', click);
      };

      await new Promise((accept, reject) => {
        const statechange = () => {
          audioContext.removeEventListener('statechange', statechange);
          accept();

          cleanup();
        };
        audioContext.addEventListener('statechange', statechange);

        const cleanup = () => {
          audioContext.removeEventListener('statechange', statechange);
        };
      });

      cleanup();
    }

    // console.log('continued');
    audioBufferSourceNode.connect(audioContext.destination);
    audioBufferSourceNode.start();

    // const startTime = performance.now();
    const recurse = () => {
      frame = requestAnimationFrame(recurse);

      // const now = performance.now();
      // const timeDiff = now - startTime;
      // const t = timeDiff / 1000;
      const t = audioContext.currentTime;
      animateVrmFbx(t);

      modelBones.Root.updateMatrixWorld();
    };
    let frame = requestAnimationFrame(recurse);

    // play audio
    // audio.play();
  })());

  return app;
};