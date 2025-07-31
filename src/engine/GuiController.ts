import { AdvancedDynamicTexture, Control, TextBlock } from '@babylonjs/gui';

import { SceneController } from './SceneController';

export class GuiController {
  sceneController: SceneController;
  private gui?: AdvancedDynamicTexture;

  isFullscreen = false;
  constructor(sceneController: SceneController) {
    this.sceneController = sceneController;
  }
  async loadGui() {
    let advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      "GUI",
      true,
      this.sceneController.scene
    );
    let loadedGUI = await advancedTexture.parseFromSnippetAsync("4O9F56#6");
    // let loadedGUI = await advancedTexture.parseFromURLAsync('guiTexture (4).json')

    this.gui = loadedGUI;

    this.prepareMenus();
  }
  isTouchDevice() {
    const res = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    // alert(res)
    return res;
  }

  prepareMenus() {
    const MainMenu = this.getGuiControlOrFail<TextBlock>("MainMenu");
    MainMenu.isVisible = false;
    // const isTouchDevice = () => "ontouchstart" in window;
    const burger = this.getGuiControlOrFail<TextBlock>("burger");
    const textBlock = this.getGuiControlOrFail<TextBlock>("Textblock");

    textBlock.onPointerClickObservable.add(() => {
      this.toggleMainMenu();
    });
    burger.isVisible = this.isTouchDevice();
    console.log("MainMenu: ", MainMenu);
    const continue_game = this.getGuiControlOrFail<TextBlock>("continue_game");
    continue_game.onPointerClickObservable.add(() => {
      const MainMenu = this.getGuiControlOrFail<TextBlock>("MainMenu");
      MainMenu.isVisible = false;
    });

    const fulscreen = this.getGuiControlOrFail("Fullscreen");

    fulscreen.onPointerClickObservable.add(() => {
      if (!this.isFullscreen) {
        this.sceneController.canvas.parentElement?.requestFullscreen();
        this.isFullscreen = true;
      } else {
        document.exitFullscreen();
        this.isFullscreen = false;
      }
      // adt is your AdvancedDynamicTexture, engine is your Babylon.js engine
      window.addEventListener("resize", () => {
        if (!this.gui) return;

        this.gui.scaleTo(
          this.sceneController._engine.getRenderWidth(),
          this.sceneController._engine.getRenderHeight()
        );
      });
    });
  }
  toggleMainMenu() {
    const MainMenu = this.getGuiControlOrFail<TextBlock>("MainMenu");
    MainMenu.isVisible = !MainMenu.isVisible;
  }
  getGuiControlOrFail<T extends Control>(controlName: string): T {
    if (!this.gui) throw new Error("no GUI");
    const tb = this.gui.getControlByName(controlName);
    if (!tb) throw new Error("no " + controlName + " in GUI");
    return tb as T;
  }
  setCurrentLocation(location: string) {
    const textBlock = this.getGuiControlOrFail<TextBlock>("Textblock");
    textBlock.text = "You are now here: " + location;
  }
}
