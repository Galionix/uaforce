import { Scene } from "@babylonjs/core";
import { SceneController } from "./SceneController";
import { AdvancedDynamicTexture, Control, TextBlock } from "@babylonjs/gui";

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
    let loadedGUI = await advancedTexture.parseFromURLAsync(
      "/guiTexture1.json"
    );
    this.gui = loadedGUI;

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
