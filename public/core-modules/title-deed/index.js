import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useScene, usePhysics, useActivate, useParticleSystem, useLocalPlayer, useFrame, useWear, useUse, useCleanup, getNextInstanceId} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const emptyArray = [];
const fnEmptyArray = () => emptyArray;

// const localVector = new THREE.Vector3();

// const _makeNameUrl = name => `${urlPrefix}${name}-spritesheet.ktx2`;
const particleName = 'Elements - Energy 017 Charge Up noCT noRSZ.mov';
const explosionName = 'Elements - Energy 119 Dissapear noCT noRSZ.mov';
const explosion2Name = 'Elements - Explosion 014 Hit Radial MIX noCT noRSZ.mov';
const particleNames = [
  particleName,
  explosionName,
  explosion2Name,
];

export default e => {
  const app = useApp();
  const scene = useScene();
  const particleSystemManager = useParticleSystem();

  app.name = 'flower';

  class ParticleEmitter2 extends THREE.Object3D {
    constructor(particleSystem) {
      super();

      this.particleSystem = particleSystem;

      this.timeout = null;
      const now = performance.now()
      this.resetNextUpdate(now);
      this.particles = [];
    }
    resetNextUpdate(now) {
      this.lastParticleTimestamp = now;
      this.nextParticleDelay = Math.random() * 100;
    }
    update(timestamp) {
      const localPlayer = useLocalPlayer();
      const now = timestamp;
      const timeDiff = now - this.lastParticleTimestamp;
      const duration = 1000;

      const _removeParticles = () => {
        this.particles = this.particles.filter(particle => {
          const timeDiff = now - particle.startTime;
          if (timeDiff < duration) {
            return true;
          } else {
            particle.destroy();
            return false;
          }
        });
      };
      _removeParticles();
      if (wearing) {
        const _addParticles = () => {
          if (timeDiff >= this.nextParticleDelay) {
            const particleName = particleNames[Math.floor(Math.random() * particleNames.length)];
            const particle = this.particleSystem.addParticle(particleName, {
              duration,
            });
            particle.offset = new THREE.Vector3((-0.5 + Math.random()) * 2, (-0.5 + Math.random()) * 2, (-0.5 + Math.random()) * 2);
            this.particles.push(particle);

            this.resetNextUpdate(timestamp);
          }
        };
        _addParticles();
        const _updateParticles = () => {
          if (this.particles.length > 0) {
            for (const particle of this.particles) {
              particle.position.copy(localPlayer.position)
                .add(particle.offset)
              particle.update();
            }
          }
        };
        _updateParticles();
      }
    }
  }

  let particleSystem = null;
  let particleEmitter2 = null;
  ((async () => {
    particleSystem = particleSystemManager.createParticleSystem(particleNames);
    await particleSystem.waitForLoad();
    
    scene.add(particleSystem);
    particleSystem.updateMatrixWorld();

    particleEmitter2 = new ParticleEmitter2(particleSystem);
  })());

  let flowerApp = null;
  e.waitUntil((async () => {
    let u2 = `${baseUrl}Group2_Orchid.glb`;
    const m = await metaversefile.import(u2);
    flowerApp = metaversefile.createApp({
      name: u2,
    });
    flowerApp.position.copy(app.position);
    flowerApp.quaternion.copy(app.quaternion);
    flowerApp.scale.copy(app.scale);
    flowerApp.updateMatrixWorld();
    flowerApp.name = 'flower';
    flowerApp.getPhysicsObjectsOriginal = flowerApp.getPhysicsObjects;
    flowerApp.getPhysicsObjects = fnEmptyArray;
    
    const components = [
      {
        "key": "instanceId",
        "value": getNextInstanceId(),
      },
      {
        "key": "contentId",
        "value": u2,
      },
      {
        "key": "physics",
        "value": true,
      },
      {
        "key": "wear",
        "value": {
          "boneAttachment": "leftHand",
          "position": [0, 0, 0],
          "quaternion": [0.4999999999999999, -0.5, -0.5, 0.5000000000000001]
        }
      },
      {
        "key": "aim",
        "value": {}
      },
      {
        "key": "use",
        "value": {
          "animation": "magic",
          "boneAttachment": "leftHand",
          "position": [0, 0, 0],
          "quaternion": [0.4999999999999999, -0.5, -0.5, 0.5000000000000001],
          "scale": [1, 1, 1]
        }
      }
    ];
    
    for (const {key, value} of components) {
      flowerApp.setComponent(key, value);
    }
    await flowerApp.addModule(m);
    scene.add(flowerApp);
    
    flowerApp.addEventListener('use', e => {
      console.log('flower use');
    });
  })());

  app.getPhysicsObjects = () => {
    return flowerApp ? flowerApp.getPhysicsObjectsOriginal() : [];
  };
  
  let wearing = false;
  useWear(e => {
    const {wear} = e;

    flowerApp.position.copy(app.position);
    flowerApp.quaternion.copy(app.quaternion);
    flowerApp.scale.copy(app.scale);
    flowerApp.updateMatrixWorld();
    
    flowerApp.dispatchEvent({
      ...e,
    });

    wearing = wear;
  });
  
  useUse(e => {
    if (e.use && flowerApp) {
      flowerApp.use();
    }
  });

  useFrame(({timestamp}) => {
    if (!wearing) {
      if (flowerApp) {
        flowerApp.position.copy(app.position);
        flowerApp.quaternion.copy(app.quaternion);
        flowerApp.updateMatrixWorld();
      }
    } else {
      if (flowerApp) {
        app.position.copy(flowerApp.position);
        app.quaternion.copy(flowerApp.quaternion);
        app.updateMatrixWorld();
      }
    }

    // particleEmitter.update(timestamp);
    particleEmitter2 && particleEmitter2.update(timestamp);
  });

  useCleanup(() => {
    if (flowerApp) {
      scene.remove(flowerApp);
      flowerApp.destroy();
    }
    if (particleSystem) {
      scene.remove(particleSystem);
      particleSystem.destroy();
    }
  });
  
  return app;
};