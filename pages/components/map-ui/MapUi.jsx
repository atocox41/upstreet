import React, {
  useState,
  useEffect,
} from 'react';
import * as THREE from 'three';
import {
  ethers,
} from 'ethers';

import styles from '../../../styles/InventoryUi.module.css';

import {
  chunkSize,
  segments,
  gridHeight,
  customChunkType,
} from '../../../packages/engine/managers/land/land-manager.js';
import {
  infuraProjectId,
} from '../../../packages/engine/constants/auth.js';
import TitleDeedABI from '../../../packages/engine/ethereum/abis/title-deed-abi.json';
import LandClaimABI from '../../../packages/engine/ethereum/abis/land-claim-abi.json';
import contractAddresses from '../../../packages/engine/ethereum/contract-addresses.json';
const titleDeedAddress = contractAddresses.titleDeed;
const landClaimAddress = contractAddresses.landClaim;

import {
  createClient,
} from '../../../packages/engine/clients/alchemy-client.js';
import {
  ensureEthereum,
} from '../metamask-auth-ui/MetamaskAuthUi.jsx';
import { jsonParse } from '../../../packages/engine/util';

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector2D = new THREE.Vector2();
const localPlane = new THREE.Plane();
const localRaycaster = new THREE.Raycaster();

//

const mapMinHeight = 120;
const mapMaxHeight = 800;

//

const raycastPoint = (e, renderer, camera, target) => {
  const pixelRatio = renderer.getPixelRatio();
  return raycastCoord(
    (e.clientX / (renderer.domElement.width / pixelRatio)),
    -(e.clientY / (renderer.domElement.height / pixelRatio)),
    camera,
    target,
  );
};
const raycastCoord = (x, y, camera, target) => {
  localRaycaster.setFromCamera(localVector2D.set(
    x * 2 - 1,
    y * 2 + 1,
  ), camera);
  localPlane.setFromNormalAndCoplanarPoint(
    localVector.set(0, 1, 0),
    localVector2.set(0, gridHeight, 0),
  );
  const intersection = localRaycaster.ray.intersectPlane(localPlane, target);
  return intersection;
};

//

export const MapUi = ({
  engine,

  mode,
  setMode,

  address,
}) => {
  // console.log('load address', {
  //   address,
  // });

  // state
  const [dragStart, setDragStart] = useState(null);
  const [dragDelta, setDragDelta] = useState(null);
  const [dragDistance, setDragDistance] = useState(null);
  const [cameraStartPosition, setCameraStartPosition] = useState(null);
  const [hoverPointStartPosition, setHoverPointStartPosition] = useState(null);

  const [selectCoords, setSelectCoords] = useState(null);
  const [ownerState, setOwnerState] = useState(null);
  const [claimState, setClaimState] = useState(null);
  const [titleDeeds, setTitleDeeds] = useState([]);
  const [numUnclaimedLands, setNumUnclaimedLands] = useState(0);
  const [epoch, setEpoch] = useState(0);

  const [tokenEpoch, setTokenEpoch] = useState(0);

  const [alchemy, setAlchemy] = useState(createClient);

  // helper methods

  const getContractsAsync = async () => {
    await ensureEthereum();

    // Create a Web3Provider
    const provider = globalThis.ethereum ?
      new ethers.providers.Web3Provider(window.ethereum)
    :
      new ethers.providers.InfuraProvider(
        'homestead',
        infuraProjectId,
      );
    // Get the signer
    const signer = provider.getSigner();
    // Create a contract instances
    const titleDeed = new ethers.Contract(titleDeedAddress, TitleDeedABI, signer);
    const landClaim = new ethers.Contract(landClaimAddress, LandClaimABI, signer);
    return {
      titleDeed,
      landClaim,
    };
  };

  // effects

  // read locations
  useEffect(() => {
    const tokenMap = new Map();
    (async () => {
      const range = 1000;
      const maxTokenId = 5000;
      for (let i = 0; i < maxTokenId; i += range) {
        const startTokenId = i + '';
        const endTokenId = (i + range) + '';
        const u = `https://map-api.upstreet.ai/t/${startTokenId}-${endTokenId}`;
        const res = await fetch(u);
        const json = await res.json();
        for (let j = 0; j < json.length; j++) {
          const {
            id,
            location,
            owner,
          } = json[j];
          tokenMap.set(id, {
            location,
            owner,
          });
        }
      }

      const {
        landManager,
      } = engine;
      landManager.setMapTokenMap(tokenMap);
      landManager.setMapAddress(address);
    })();
  }, [
    tokenEpoch,
  ]);

  // read address
  useEffect(() => {
    const {
      landManager,
    } = engine;
    landManager.setMapAddress(address);
  }, [
    address,
    tokenEpoch,
  ]);

  // bind camera
  useEffect(() => {
    if (engine) {
      let frame;
      const recurse = () => {
        frame = requestAnimationFrame(() => {
          recurse();

          const {engineRenderer, landManager} = engine;
          const {camera} = engineRenderer;
          landManager.setMapCameraPosition(camera.position);
        });
      };
      recurse();

      return () => {
        cancelAnimationFrame(frame);
      };
    }
  }, [
    engine,
  ]);

  // bind events
  useEffect(() => {
    if (engine) {
      const {
        engineRenderer,
        ioManager,
        pointerLockManager,
        landManager,
        playersManager,
      } = engine;
      const {renderer, camera} = engineRenderer;
      // const canvas = renderer.domElement;

      const mousedown = e => {
        e.preventDefault();
        e.stopPropagation();

        const intersection = raycastPoint(e, renderer, camera, localVector);
        if (intersection) {
          setDragStart([
            intersection.x,
            intersection.z,
          ]);
          setDragDelta([0, 0]);
          setDragDistance(0);

          const newCameraPosition = camera.position.toArray();
          setCameraStartPosition(newCameraPosition);
          const newHoverPoint = landManager.getMapHoverPoint(localVector).toArray();
          setHoverPointStartPosition(newHoverPoint);
        }
      };
      const mouseup = e => {
        e.preventDefault();
        e.stopPropagation();

        if (dragStart && dragDistance < 10) {
          const chunkX = Math.floor(hoverPointStartPosition[0] / chunkSize);
          const chunkZ = Math.floor(hoverPointStartPosition[2] / chunkSize);

          const px = chunkX * chunkSize;
          const pz = chunkZ * chunkSize;

          landManager.setMapSelectPoint(
            localVector.set(
              px,
              0,
              pz,
            ),
          );
        }

        setDragStart(null);
        setDragDelta(null);
        setDragDistance(null);
      };
      const mousemove = e => {
        if (dragStart) {
          e.preventDefault();
          e.stopPropagation();

          const {
            movementX,
            movementY,
          } = e;

          const newDragDistance = dragDistance + Math.sqrt(movementX * movementX + movementY * movementY);
          setDragDistance(newDragDistance);

          camera.position.fromArray(cameraStartPosition);
          camera.updateMatrixWorld();

          const intersection = raycastPoint(e, renderer, camera, localVector);
          if (intersection) {
            const dragEnd = [
              intersection.x,
              intersection.z,
            ];

            const landManagerMapOffset = localVector.set(
              cameraStartPosition[0] + dragStart[0] - dragEnd[0],
              cameraStartPosition[1],
              cameraStartPosition[2] + dragStart[1] - dragEnd[1],
            );
            landManager.setMapOffset(landManagerMapOffset);
          }
        } else {
          const intersection = raycastPoint(e, renderer, camera, localVector);

          if (intersection) {
            landManager.setMapHoverPoint(
              localVector2.set(
                intersection.x,
                0,
                intersection.z,
              )
            );
          }
        }
      };
      const click = e => {
        e.preventDefault();
        e.stopPropagation();
      };
      const dblclick = e => {
        e.preventDefault();
        e.stopPropagation();

        const intersection = raycastPoint(e, renderer, camera, localVector);

        if (intersection) {
          const localPlayer = playersManager.getLocalPlayer();
          localPlayer.characterPhysics.setPosition(intersection);

          pointerLockManager.requestPointerLock();

          setMode('play');
        }
      };
      const wheel = e => {
        const {
          deltaY,
        } = e;

        const landManagerMapOffset = landManager.getMapOffset(localVector);
        landManagerMapOffset.y += deltaY;
        landManagerMapOffset.y = Math.min(Math.max(landManagerMapOffset.y, mapMinHeight), mapMaxHeight);
        landManager.setMapOffset(landManagerMapOffset);
      };
      ioManager.registerEventHandler('pointerdown', mousedown);
      ioManager.registerEventHandler('pointerup', mouseup);
      ioManager.registerEventHandler('pointermove', mousemove);
      ioManager.registerEventHandler('click', click);
      ioManager.registerEventHandler('dblclick', dblclick);
      ioManager.registerEventHandler('wheel', wheel);

      // listen for key events
      const keydown = e => {
        switch (e.key) {
          case 'Escape': {
            e.preventDefault();
            e.stopPropagation();

            landManager.setMapSelectPoint(null);
            break;
          }
        }
      };
      document.addEventListener('keydown', keydown);

      // listen for window unfocus
      const blur = e => {
        setDragStart(null);
        setDragDelta(null);
        setDragDistance(null);
      };
      globalThis.addEventListener('blur', blur);

      return () => {
        ioManager.unregisterEventHandler('pointerdown', mousedown);
        ioManager.unregisterEventHandler('pointerup', mouseup);
        ioManager.unregisterEventHandler('pointermove', mousemove);
        ioManager.unregisterEventHandler('click', click);
        ioManager.unregisterEventHandler('dblclick', dblclick);
        ioManager.unregisterEventHandler('wheel', wheel);

        document.removeEventListener('keydown', keydown);

        globalThis.removeEventListener('blur', blur);
      };
    }
  }, [
    engine,
    dragStart,
    dragDelta,
    dragDistance,
    cameraStartPosition,
    hoverPointStartPosition,
    selectCoords,
  ]);

  // bind select coords
  useEffect(() => {
    if (engine) {
      const {
        landManager,
      } = engine;

      const selectpointupdate = e => {
        const {
          point,
        } = e.data;
        if (point) {
          const [x, y, z] = point;

          const chunkX = Math.floor(x / chunkSize);
          const chunkZ = Math.floor(z / chunkSize);

          const newSelectCoords = [
            chunkX,
            chunkZ,
          ];
          setSelectCoords(newSelectCoords);
        } else {
          setSelectCoords(null);
        }
      };
      landManager.addEventListener('selectpointupdate', selectpointupdate);

      return () => {
        landManager.removeEventListener('selectpointupdate', selectpointupdate);
      };
    }
  }, [
    engine,
    selectCoords,
  ]);

  // update select coords claim state
  useEffect(() => {
    setClaimState(null);

    const {landManager} = engine;
    landManager.setMapColor(0x000000);

    if (selectCoords) {
      let live = true;
      (async () => {
        try {
          const {
            titleDeed,
            landClaim,
          } = await getContractsAsync();
          if (!live) return;

          const location = JSON.stringify(selectCoords);
          const result = await landClaim.getLocationTokenId(location);
          if (!live) return;

          const [
            claimed,
            tokenIdBigNumber,
          ] = result;
          if (claimed) {
            // check if the token is claimed + owned by us
            let owner = await titleDeed.ownerOf(tokenIdBigNumber);
            if (!live) return;

            owner = owner.toLowerCase();

            if (owner === address) {
              setClaimState('claimed');

              landManager.setMapColor(0x00FF00);
            } else {
              setClaimState('owned');

              landManager.setMapColor(0xFF0000);
            }
          } else {
            setClaimState('unclaimed');

            landManager.setMapColor(0xFFFFFF);
          }
        } catch(err) {
          setClaimState('error');
        }
      })();

      return () => {
        live = false;
      };
    } else {
      setClaimState(null);
    }
  }, [
    engine,
    selectCoords,
    epoch,
  ]);

  // update current owner
  useEffect(() => {
    if (selectCoords) {
      let live = true;

      (async () => {
        const {
          landClaim,
          titleDeed,
        } = await getContractsAsync();
        if (!live) return;

        const location = JSON.stringify(selectCoords);
        const result = await landClaim.getLocationTokenId(location);
        const [
          claimed,
          tokenIdBigNumber,
        ] = result;

        if (claimed) {
          // const result2 = await alchemy.nft.getOwnersForNft(titleDeedAddress, tokenIdBigNumber);
          const owner = await titleDeed.ownerOf(tokenIdBigNumber)
          if (!live) return;

          // const {
          //   owners,
          // } = result2;
          // console.log("owener", owners)
          // setOwnerState(owners[0] || null);
          setOwnerState(owner || null)
        } else {
          setOwnerState(null);
        }
      })();

      return () => {
        live = false;
      };
    }
  }, [
    selectCoords,
  ]);

  // update title deeds
  useEffect(() => {
    if (address) {
      let live = true;

      (async () => {
        const titledeedNfts = await getOwnedTitleDeedNftsAsync(address);
        if (!live) return;

        if (titledeedNfts.length > 0) {
          const [
            claimedTitleDeedNfts,
            unclaimedTitleDeedNfts,
          ] = await filterTitleDeedNftClaimsAsync(titledeedNfts);
          if (!live) return;

          setTitleDeeds(titledeedNfts);
          setNumUnclaimedLands(unclaimedTitleDeedNfts.length);
        } else {
          setNumUnclaimedLands(0);
        }
      })();

      return () => {
        live = false;
      };
    }
  }, [
    address,
    epoch,
  ]);

  //

  const getOwnedTitleDeedNftsAsync = async (address) => {
    const titledeedNfts = [];
    let pageKey;
    let first = true;
    for (;;) {
      const o = await alchemy.nft.getNftsForOwner(
        address,
        {
          contractAddresses: [
            titleDeedAddress,
          ],
          pageKey,
        },
      );
      let {
        ownedNfts: _titledeedNfts,
        pageKey: _pageKey,
      } = o;
      if (_titledeedNfts.length > 0 || first) {
        titledeedNfts.push.apply(titledeedNfts, _titledeedNfts);
        pageKey = _pageKey;
        first = false;

        if (!pageKey) {
          break;
        }
      } else {
        break;
      }
    }
    return titledeedNfts;
  };
  const filterTitleDeedNftClaimsAsync = async (titledeedNfts) => {
    const {
      titleDeed,
      landClaim,
    } = await getContractsAsync();

    let claimedTitleDeedNfts = [];
    let unclaimedTitleDeedNfts = [];
    for (let i = 0; i < titledeedNfts.length; i++) {
      const ownedNft = titledeedNfts[i];
      const {
        tokenId,
      } = ownedNft;
      const result = await landClaim.getTokenIdLocation(tokenId);
      if (result) {
        ownedNft.location = result;
        claimedTitleDeedNfts.push(ownedNft);
      } else {
        unclaimedTitleDeedNfts.push(ownedNft);
      }
    }
    return [
      claimedTitleDeedNfts,
      unclaimedTitleDeedNfts,
    ];
  };
  const claim = async (coords) => {
    const {
      titleDeed,
      landClaim,
    } = await getContractsAsync();
    const location = JSON.stringify(coords);

    const titledeedNfts = await getOwnedTitleDeedNftsAsync(address);
    if (titledeedNfts.length > 0) {
      const [
        claimedTitleDeedNfts,
        unclaimedTitleDeedNfts,
      ] = await filterTitleDeedNftClaimsAsync(titledeedNfts);

      // claim the first token
      if (unclaimedTitleDeedNfts.length > 0) {
        const ownedUnclaimedNft = unclaimedTitleDeedNfts[0];
        const {
          tokenId,
        } = ownedUnclaimedNft;
        const tx = await landClaim.claim(tokenId, location);
        const receipt = await tx.wait();
      } else {
        throw new Error('no unclaimed tokens owned');
      }
    } else {
      throw new Error('no claimable tokens owned');
    }
  };
  const unclaim = async (coords) => {
    const {
      titleDeed,
      landClaim,
    } = await getContractsAsync();
    const location = JSON.stringify(coords);

    // get the tokenId from the location
    const result = await landClaim.getLocationTokenId(location);
    const [
      claimed,
      tokenIdBigNumber,
    ] = result;
    // console.log('got claimed', [claimed, tokenIdBigNumber.toNumber()]);

    const tokenId = tokenIdBigNumber.toNumber();
    if (claimed) {
      const tx = await landClaim.unclaimTokenId(tokenId);
      const receipt = await tx.wait();
    }
  };

  //

  return (
    <div className={styles.mapUi}>
      {selectCoords && (<div className={styles.parcelUi}>
        <div className={styles.row}>
          <label className={styles.label}>
            <span className={styles.text}>Land parcel</span>
          </label>

          <div className={styles.coords}>{selectCoords.join(', ')}</div>
        </div>

        {ownerState && <div className={styles.row}>
          <label className={styles.label}>
            <span className={styles.text}>Owner</span>
          </label>

          <div className={styles.coords}>
            <a
              href={`https://opensea.io/${ownerState}`}
              target="_blank"
            >{ownerState}</a>
          </div>
        </div>}

        <div className={styles.row}>
          <div className={styles.spacer} />

          <button className={styles.button} onClick={async e => {
            if (claimState === 'unclaimed') {
              setClaimState('working');

              try {
                await claim(selectCoords);
              } catch (err) {
                console.warn(err);
              }

              setEpoch(epoch + 1);
            } else if (claimState === 'claimed') {
              setClaimState('working');

              try {
                await unclaim(selectCoords);
              } catch (err) {
                console.warn(err);
              }

              setEpoch(epoch + 1);
            } else {
              console.log('nothing');
            }
          }} disabled={!claimState || ['locked', 'working', 'error', 'owned'].includes(claimState) || (claimState !== 'claimed' && numUnclaimedLands === 0)}>
            <div className={styles.background} />
            <span className={styles.text}>
              {(() => {
                switch (claimState) {
                  case 'claimed': return 'Unclaim';
                  case 'unclaimed': {
                    if (numUnclaimedLands > 0) {
                      return 'Claim';
                    } else {
                      return 'No title deeds available';
                    }
                  }
                  case 'owned': return 'Owned';
                  case 'error': return 'Error';
                  case 'working': return 'Working...';
                  default: return 'Loading...';
                }
              })()}
            </span>
          </button>
        </div>
      </div>)}

      {address && titleDeeds.length > 0 && (<div className={styles.titleDeedUi}>
        <div className={styles.row}>
          <label className={styles.label}>
            <span className={styles.text}>Owned title deeds</span>

            <div className={styles.titleDeeds}>
              {titleDeeds.map((titleDeed, i) => {
                return <div className={styles.titleDeed} key={i}>
                  <a
                    href={`https://opensea.io/assets/ethereum/${titleDeedAddress}/${titleDeed.tokenId}`}
                    className={styles.title}
                    target='_blank'
                  >{titleDeed.title}</a>
                  <span className={styles.location} onClick={e => {
                    const location = jsonParse(titleDeed.location);
                    if (location !== null) {
                      const {landManager} = engine;
                      
                      const mapOffset = landManager.getMapOffset(localVector);

                      // set the new position
                      mapOffset.x = location[0] * chunkSize;
                      mapOffset.z = location[1] * chunkSize;
                      // mapOffset.y = mapMinHeight + (mapMaxHeight - mapMinHeight) * 0.25;
                      mapOffset.y = mapMinHeight * 2;
                      // mapOffset.y = 70;

                      landManager.setMapHoverPoint(
                        mapOffset
                      );
                      landManager.setMapSelectPoint(
                        mapOffset
                      );

                      mapOffset.x += chunkSize / 2;
                      mapOffset.z += chunkSize / 2;

                      landManager.setMapOffset(mapOffset);
                    }
                  }}>{titleDeed.location || 'unbound'}</span>
                </div>
              })}
            </div>
          </label>
        </div>
        <div className={styles.spacer} />
      </div>)}

      {!selectCoords && (<div className={styles.tooltipUi}>
        <div className={styles.tooltip}>Click map to select land</div>
      </div>)}
    </div>
  );
};
