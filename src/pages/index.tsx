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
import { Game } from '@ex/engine/Game';
// import { GameEngine } from "@ex/engine/class";

const debug = true;





export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const initializeBabylon = async () => {
      if (!canvasRef.current) return;

      const game = new Game(
        canvasRef.current,
        /* this is to load or not debug layer, need to fix to do it auto mode. for dev - include, for production - disable*/
        true
      );
      if (debug) game.toggleDebugLayer();
      game.onKeyboardObservable.add((e) => {
        console.log("e: ", e);
        if (e.type === KeyboardEventTypes.KEYDOWN) {
          if (e.event.ctrlKey) {
            if (e.event.key === "i") {
              game.toggleDebugLayer();
            }
          }
        }
      });
    };
    initializeBabylon();
  }, []);

  return (
    <>
      <canvas
        id="canvas"
        ref={canvasRef}
        style={{ width: "100%", height: "100vh" }}
      ></canvas>
    </>
  );
}
