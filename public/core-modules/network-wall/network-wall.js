import * as THREE from 'three';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localBox = new THREE.Box3();

//

const width = 30000;
const height = 20;
const depth = 30000;
const opacity = 0.2;

//

const createWallMesh = ({
  color,
}) => {
  const planeGeometry = new THREE.PlaneBufferGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({
    color,
    opacity,
    transparent: true,
  });
  const mesh = new THREE.Mesh(
    planeGeometry,
    material,
  );
  return mesh;
};

//

export default ctx => {
  const {
    useApp,
    useLocalPlayer,
    useEngine,
    useEndpoints,
    usePlayersManager,
    useChatManager,
    useLoreManager,
    useCleanup,
  } = ctx;

  const app = useApp();

  const engine = useEngine();
  const endpoints = useEndpoints();
  const playerManager = usePlayersManager();
  const chatManager = useChatManager();
  const loreManager = useLoreManager();

  //

  const wallOffset = new THREE.Vector3(0, 0, 2);

  //

  const redWallMesh = createWallMesh({
    color: 0xFF0000,
  });
  redWallMesh.position.copy(wallOffset);
  app.add(redWallMesh);
  redWallMesh.updateMatrixWorld();

  const blueWallMesh = createWallMesh({
    color: 0x0000FF,
  });
  blueWallMesh.position.copy(wallOffset);
  blueWallMesh.quaternion.setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.PI
  );
  app.add(blueWallMesh);
  blueWallMesh.updateMatrixWorld();

  ctx.waitUntil((async () => {
    const multiplayer = engine.createMultiplayer();
    app.add(multiplayer);
    multiplayer.updateMatrixWorld();

    await multiplayer.connectMultiplayer({
      endpoint_url: endpoints.multiplayerEndpointUrl,
    });

    // bind chat
    {
      multiplayer.addEventListener('chat', e => {
        const {
          // type,
          message: spec,
          playerId,
          // target,
        } = e;

        const localPlayer = playerManager.getLocalPlayer();
        if (localPlayer.playerId !== playerId) {
          const {
            characterName,
            command,
            commandArgument,
            message,
          } = spec;
          const m = loreManager.createChatMessageFromSpec({
            characterName,
            command,
            commandArgument,
            message,
          });
          chatManager.addMessage(m);
        }
      });
      chatManager.addEventListener('message', e => {
        const {
          message: m,
          source,
        } = e.data;

        const spec = m.getSpec();
        const localPlayer = playerManager.getLocalPlayer();
        if (spec.characterName === localPlayer.playerSpec.name.toLowerCase() && source === 'local') {
          const spec = m.getSpec();
          multiplayer.sendMessage(spec);
        }
      });
    }

    const keyBoxes = [
      {
        key: 'wall-front',
        box: new THREE.Box3(
          new THREE.Vector3(-width / 2, 0, 0),
          new THREE.Vector3(width / 2, height, depth / 2),
        ).translate(wallOffset),
      },
      {
        key: 'wall-back',
        box: new THREE.Box3(
          new THREE.Vector3(-width / 2, 0, -depth / 2),
          new THREE.Vector3(width / 2, height, 0),
        ).translate(wallOffset),
      },
    ];
    const tracker = multiplayer.createTracker({
      getKeySpec: () => {
        const localPlayer = useLocalPlayer();
        const position = localPlayer.position;

        app.matrixWorld.decompose(
          localVector,
          localQuaternion,
          localVector2,
        );
        const realmsKeys = keyBoxes
          .filter(keyBox => {
            // note: this is not a full matrix transform; it doesn't include rotation or scale
            return localBox.copy(keyBox.box)
              .translate(localVector)
              .containsPoint(position);
          })
          .map(keyBox => keyBox.key);
        const rootRealmKey = realmsKeys.length > 0 ? realmsKeys[0] : null;
        return {
          realmsKeys,
          rootRealmKey,
        };
      },
    });
    useCleanup(() => {
      tracker.stop();
    });
    console.log('got multiplayer tracker');
  })());

  //

  return app;
};