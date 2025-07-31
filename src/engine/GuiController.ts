import { AdvancedDynamicTexture, Control, TextBlock } from '@babylonjs/gui';

import { SceneController } from './SceneController';

export class GuiController {
  sceneController: SceneController;
  private gui?: AdvancedDynamicTexture;

  constructor(sceneController: SceneController) {
    this.sceneController = sceneController;
  }
  async loadGui() {
    let advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      "GUI",
      true,
      this.sceneController.scene
    );
    // let loadedGUI = await advancedTexture.parseFromSnippetAsync("4O9F56#5");
    let loadedGUI = await advancedTexture.parseFromURLAsync('guiTexture (4).json')

    this.gui = loadedGUI;

    this.prepareMenus()
  }
  isTouchDevice() {
    const res =  ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    alert(res)
    return res
  }
  prepareMenus() {
    const MainMenu = this.getGuiControlOrFail<TextBlock>("MainMenu");
    MainMenu.isVisible = false;
    // const isTouchDevice = () => "ontouchstart" in window;
    const burger = this.getGuiControlOrFail<TextBlock>("burger");
    burger.onPointerClickObservable.addOnce(() => {
      this.toggleMainMenu()
    })
    burger.isVisible = this.isTouchDevice();
    console.log('MainMenu: ', MainMenu);
  }
  toggleMainMenu() {
    const MainMenu = this.getGuiControlOrFail<TextBlock>("MainMenu");
    MainMenu.isVisible = !MainMenu.isVisible;
  }
  getGuiControlOrFail<T extends Control>(controlName: string): T {
    if (!this.gui) throw new Error("no GUI");
    const tb = this.gui.getControlByName(controlName);
    if (!tb) throw new Error("no Textblock in GUI");
    return tb as T;
  }
  setCurrentLocation(location: string) {
    const textBlock = this.getGuiControlOrFail<TextBlock>("Textblock");
    textBlock.text = "You are now here: " + location;
  }
}
