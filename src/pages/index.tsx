import {
  ArcRotateCamera,
  Camera,
  Engine,
  HemisphericLight,
  KeyboardEventTypes,
  MeshBuilder,
  Scene,
  Vector3,
} from "@babylonjs/core";
import { Geist, Geist_Mono } from "next/font/google";
import { useEffect, useRef } from "react";
import { Inspector } from "@babylonjs/inspector";
import { Game } from "@ex/engine/Game";
import { useStore } from "@ex/zustand/store";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";
import HavokPhysics from "@babylonjs/havok";
import { HavokPlugin } from "@babylonjs/core";

const debug = true;

export default function Home() {
  useEffect(() => {
    registerBuiltInLoaders();
  }, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const store = useStore();
  useEffect(() => {
    const initializeBabylon = async () => {
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
      await game.asyncInit()
      if (debug) game.toggleDebugLayer();
      // game.onKeyboardObservable.add((e) => {
      //   console.log("e: ", e);
      //   if (e.type === KeyboardEventTypes.KEYDOWN) {
      //     if (e.event.ctrlKey) {
      //       if (e.event.key === "i") {
      //         game.toggleDebugLayer();
      //       }
      //     }
      //   }
      // });
    };
    initializeBabylon();
  }, []);

  return (
    <>
      <div id="global-loading">
        <p>Loading</p>
      </div>
      <canvas
        id="canvas"
        ref={canvasRef}
        style={{ width: "100%", height: "100vh" }}
      ></canvas>
    </>
  );
}
