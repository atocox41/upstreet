import React, {
  useState,
  useEffect,
} from 'react';
// import * as THREE from 'three';
// import classnames from 'classnames';

import {
  dragStartType,
} from '../../../pages/components/drag-and-drop/dragstart.js';

import styles from '../../../styles/InventoryUi.module.css';

//

const items = [
  {
    name: 'Lisk.glb',
    preview_url: `https://friddlbqibjnxjoxeocc.supabase.co/storage/v1/object/public/public/previews/529227bb7283b4770afb6f60bed91e61f2dcf94d13ac950b3defd899f8150be8.vrm.png`,
    start_url: '/models/The_Basilik_v3.glb',
  },
  {
    name: 'Scillia.npc',
    preview_url: `https://friddlbqibjnxjoxeocc.supabase.co/storage/v1/object/public/public/previews/529227bb7283b4770afb6f60bed91e61f2dcf94d13ac950b3defd899f8150be8.vrm.png`,
    start_url: '/characters/scillia.npc',
  },
  {
    name: 'Solar Witch.npc',
    preview_url: `https://friddlbqibjnxjoxeocc.supabase.co/storage/v1/object/public/public/previews/529227bb7283b4770afb6f60bed91e61f2dcf94d13ac950b3defd899f8150be8.vrm.png`,
    start_url: '/characters/solarwitch.npc',
  },
  {
    name: 'silsword.js',
    preview_url: `https://friddlbqibjnxjoxeocc.supabase.co/storage/v1/object/public/public/previews/529227bb7283b4770afb6f60bed91e61f2dcf94d13ac950b3defd899f8150be8.vrm.png`,
    start_url: '/core-modules/silsword/index.js',
  },
  {
    name: 'hovercraft.glb',
    preview_url: `https://friddlbqibjnxjoxeocc.supabase.co/storage/v1/object/public/public/previews/529227bb7283b4770afb6f60bed91e61f2dcf94d13ac950b3defd899f8150be8.vrm.png`,
    start_url: '/core-modules/hovercraft/hovercraft.glb',
  },
  {
    name: 'skybox.blockadelabsskybox',
    preview_url: `https://friddlbqibjnxjoxeocc.supabase.co/storage/v1/object/public/public/previews/529227bb7283b4770afb6f60bed91e61f2dcf94d13ac950b3defd899f8150be8.vrm.png`,
    start_url: '/blockadelabsskyboxes/world.blockadelabsskybox',
  },
  {
    name: 'wrench.item360',
    preview_url: `https://friddlbqibjnxjoxeocc.supabase.co/storage/v1/object/public/public/previews/529227bb7283b4770afb6f60bed91e61f2dcf94d13ac950b3defd899f8150be8.vrm.png`,
    start_url: '/item360/wrench.item360',
  },
];
export const DebugUi = ({
  // engine,

  // supabaseClient,

  // sessionUserId,
  // address,

  // localStorageManager,

  onClose,
}) => {
  return (
    <div className={styles.inventoryUi}>
      <div className={styles.row}>
        <div className={styles.h}>Debug</div>
        <div className={styles.icon} onClick={e => {
          e.preventDefault();
          e.stopPropagation();

          onClose();
        }}>
          <img className={styles.img} src='/assets/x.svg' draggable={false} />
        </div>
      </div>
      <div className={styles.content}>
        {items.map((item, i) => {
          return (
            <div className={styles.item} onDragStart={e => {
              const type = item.name.match(/\.([^\.]+)$/)[1];
              dragStartType(type)(e, item);
            }} draggable key={i}>
              <img src={item.preview_url} className={styles.previewImg} draggable={false} />
              <div className={styles.name}>{item.name}</div>
              {/* <nav className={styles.iconBtn}>
                <img className={styles.img} src='/assets/x.svg' draggable={false} />
              </nav> */}
            </div>
          );
        })}
      </div>
    </div>
  );
};