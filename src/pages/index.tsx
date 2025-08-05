import { RefObject, useEffect, useRef, useState } from 'react';

import { HavokPlugin } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic';
import { RESOURCE_PATHS } from '@ex/constants/resources';
import { Game } from '@ex/engine/Game';
import { loadAllResources } from '@ex/engine/stores/loadAllResources';
import { Button } from '@ex/ReactComponents/Button/Button';
import { ProgressBar } from '@ex/ReactComponents/ProgressBar/ProgressBar';

// import { ResourceLoaderController } from './ResourceLoaderController';
const manualStart = process.env.NODE_ENV === 'production';
// const manualStart = true;
const debug = true;

const initializeBabylon = async (
  canvasRef: RefObject<HTMLCanvasElement | null>
) => {
  if (!canvasRef.current) return;
  const havokInstance = await HavokPhysics();
  const hk = new HavokPlugin(true, havokInstance);

  // @ts-ignore
  globalThis.HK = havokInstance;
  const game = new Game(
    canvasRef.current,
    hk,
    /* this is to load or not debug layer, need to fix to do it auto mode. for dev - include, for production - disable*/
    true
  );
  await game.asyncInit();
  if (debug) await game.toggleDebugLayer();
};
export default function Home() {
  const [loadInfo, setLoadInfo] = useState({
    current: 0,
    total: RESOURCE_PATHS.length,
    message: "Started",
  });
  const [showButton, setShowButton] = useState(manualStart);
  useEffect(() => {
    registerBuiltInLoaders();
  }, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (manualStart) return;
    loadAllResources(setLoadInfo, () => setShowButton(false)).then(() =>
      initializeBabylon(canvasRef)
    );
  }, []);

  return (
    <div>
      {showButton ? (
        <div id="global-loading">
          <button
            onClick={async () => {
              await loadAllResources(setLoadInfo, () =>
                setShowButton(false)
              ).then(() => initializeBabylon(canvasRef));
            }}
          >
            Start
          </button>
        </div>
      ) : (
        <div id="global-loading">
          <p>Loading</p>
          <ProgressBar
            current={loadInfo.current}
            message={loadInfo.message}
            total={loadInfo.total}
          />
          <Button text='Clear cache and reload' onClick={() => {
            // clear indexeddb cache
            indexedDB.deleteDatabase('ChunksDB');
            indexedDB.deleteDatabase('ResourcesDB');
            // indexedDB.deleteDatabase('ex-dialogs');
            // indexedDB.deleteDatabase('ex-maps');
            window.location.reload()
          }}
            />
        </div>
      )}
      <canvas
        id="canvas"
        ref={canvasRef}
        style={{ width: "100%", height: "100vh" }}
      ></canvas>
    </div>
  );
}
