import * as THREE from 'three';
import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import styles from '../../../styles/Adventure.module.css';

import physicsManager from '../../../packages/engine/physics/physics-manager.js';

//

// const localVector = new THREE.Vector3();
const localEuler = new THREE.Euler();

//

export const TransformControlsUi = ({
  engine,
  app,
  setApp,

  onChange,
}) => {
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [positionZ, setPositionZ] = useState(0);
  const [eulerX, setEulerX] = useState(0);
  const [eulerY, setEulerY] = useState(0);
  const [eulerZ, setEulerZ] = useState(0);
  const [eulerOrder, setEulerOrder] = useState('YXZ');
  const [scaleX, setScaleX] = useState(1);  
  const [scaleY, setScaleY] = useState(1);
  const [scaleZ, setScaleZ] = useState(1);

  // bind app attach
  useEffect(() => {
    if (app) {
      setPositionX(app.position.x);
      setPositionY(app.position.y);
      setPositionZ(app.position.z);

      localEuler.setFromQuaternion(app.quaternion, eulerOrder);
      setEulerX(localEuler.x);
      setEulerY(localEuler.y);
      setEulerZ(localEuler.z);

      setScaleX(app.scale.x);
      setScaleY(app.scale.y);
      setScaleZ(app.scale.z);
    }
  }, [
    app,
  ]);

  // bind transform controls to app
  useEffect(() => {
    if (engine && app) {
      const {transformControlsManager} = engine;
      const transformControls = transformControlsManager.createTransformControls();
      transformControls.attach(app);

      transformControls.addEventListener('change', e => {
        app.updateMatrixWorld();
        _updateAppPhysics(app);

        setPositionX(app.position.x);
        setPositionY(app.position.y);
        setPositionZ(app.position.z);

        localEuler.setFromQuaternion(app.quaternion, eulerOrder);
        setEulerX(localEuler.x);
        setEulerY(localEuler.y);
        setEulerZ(localEuler.z);

        setScaleX(app.scale.x);
        setScaleY(app.scale.y);
        setScaleZ(app.scale.z);

        onChange && onChange();
      });

      return () => {
        transformControls.detach();

        transformControlsManager.destroyTransformControls(transformControls);
      };
    }
  }, [
    engine,
    app,
  ]);

  //

  const _updateAppPhysics = app => {
    const physicsScene = physicsManager.getScene();
    const {physicsTracker} = engine;

    const physicsObjects = physicsTracker.getAppPhysicsObjects(app);
    for (const physicsObject of physicsObjects) {
      physicsTracker.syncPhysicsObjectTransformToApp(physicsObject);
      physicsScene.setTransform(physicsObject);
    }
  };

  //

  return (
    <div className={styles.transformControls}>
      <label className={styles.label}>
        <span className={styles.text}>p.x</span>
        <input type='number' step={1} value={positionX} onChange={e => {
          const value = parseFloat(e.target.value);
          app.position.x = value;
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setPositionX(value);

          onChange && onChange();
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>p.y</span>
        <input type='number' step={1} value={positionY} onChange={e => {
          const value = parseFloat(e.target.value);
          app.position.y = value;
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setPositionY(value);
          
          onChange && onChange();
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>p.z</span>
        <input type='number' step={1} value={positionZ} onChange={e => {
          const value = parseFloat(e.target.value);
          app.position.z = value;
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setPositionZ(value);
          
          onChange && onChange();
        }} />
      </label>

      <hr/>

      <label className={styles.label}>
        <span className={styles.text}>r.x</span>
        <input type='number' step={0.1} value={eulerX} onChange={e => {
          const value = parseFloat(e.target.value);
          localEuler.set(value, eulerY, eulerZ, eulerOrder);
          app.quaternion.setFromEuler(localEuler);
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setEulerX(value);
          
          onChange && onChange();
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>r.y</span>
        <input type='number' step={0.1} value={eulerY} onChange={e => {
          const value = parseFloat(e.target.value);
          localEuler.set(eulerX, value, eulerZ, eulerOrder);
          app.quaternion.setFromEuler(localEuler);
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setEulerY(value);
          
          onChange && onChange();
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>r.z</span>
        <input type='number' step={0.1} value={eulerZ} onChange={e => {
          const value = parseFloat(e.target.value);
          localEuler.set(eulerX, eulerY, value, eulerOrder);
          app.quaternion.setFromEuler(localEuler);
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setEulerZ(value);
          
          onChange && onChange();
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>r.order</span>
        <select value={eulerOrder} onChange={e => {
          const value = e.target.value;
          
          localEuler.set(eulerX, eulerY, eulerZ, eulerOrder);

          setEulerOrder(value);

          localEuler.reorder(value);
          setEulerX(localEuler.x);
          setEulerY(localEuler.y);
          setEulerZ(localEuler.z);

          onChange && onChange();
        }}>
          <option value='XYZ'>XYZ</option>
          <option value='YZX'>YZX</option>
          <option value='ZXY'>ZXY</option>
          <option value='XZY'>XZY</option>
          <option value='YXZ'>YXZ</option>
          <option value='ZYX'>ZYX</option>
        </select>
      </label>

      <hr/>

      <label className={styles.label}>
        <span className={styles.text}>s.x</span>
        <input type='number' step={0.1} value={scaleX} onChange={e => {
          const value = parseFloat(e.target.value);
          app.scale.x = value;
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setScaleX(value);
          
          onChange && onChange();
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>s.y</span>
        <input type='number' step={0.1} value={scaleY} onChange={e => {
          const value = parseFloat(e.target.value);
          app.scale.y = value;
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setScaleY(value);
          
          onChange && onChange();
        }} />
      </label>
      <label className={styles.label}>
        <span className={styles.text}>s.z</span>
        <input type='number' step={0.1} value={scaleZ} onChange={e => {
          const value = parseFloat(e.target.value);
          app.scale.z = value;
          app.updateMatrixWorld();
          _updateAppPhysics(app);
          setScaleZ(value);
          
          onChange && onChange();
        }} />
      </label>

      <hr/>

      <div className={styles.row}>
        <button className={styles.button} onClick={e => {
          setApp(null);

          const appManager = engine.getAppManager();
          appManager.removeApp(app);
        }}>
          <div className={styles.background} />
          <span className={styles.text}>Remove</span>
        </button>
      </div>
    </div>
  );
};