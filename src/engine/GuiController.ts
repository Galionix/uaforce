import { AdvancedDynamicTexture, Control, Slider, TextBlock } from '@babylonjs/gui';

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
    let loadedGUI = await advancedTexture.parseFromSnippetAsync("4O9F56#8");
    // let loadedGUI = await advancedTexture.parseFromURLAsync('guiTexture (4).json')

    this.gui = loadedGUI;

    this.prepareMenus();
  }
  isTouchDevice() {
    const res = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    // alert(res)
    return res;
  }
  bindClickHandler(controlName: string, callback: () => void) {
    const control = this.getGuiControlOrFail(controlName);

    control.onPointerClickObservable.add(() => {
      // Автоматический клик-звук
      this.sceneController.soundController.SoundsAudios.sfx.ui.click.play();

      // Твой кастомный код
      callback();
    });
  }
  prepareMenus() {
    const MainMenu = this.getGuiControlOrFail<TextBlock>("MainMenu");
    MainMenu.isVisible = false;
    // const isTouchDevice = () => "ontouchstart" in window;
    const burger = this.getGuiControlOrFail<TextBlock>("burger");
    const textBlock = this.getGuiControlOrFail<TextBlock>("Textblock");
    const SettingsView = this.getGuiControlOrFail<TextBlock>("SettingsView");
    SettingsView.isVisible = false;

    textBlock.onPointerClickObservable.add(() => {
      this.toggleMainMenu();
    });
    burger.isVisible = this.isTouchDevice();
    console.log("MainMenu: ", MainMenu);

    this.bindClickHandler("continue_game", () => {
      const MainMenu = this.getGuiControlOrFail<TextBlock>("MainMenu");
      MainMenu.isVisible = false;
    });
    /*
        this.bindClickHandler("", () => {});
    */

    this.bindClickHandler("open_settings", () => {
      const SettingsView = this.getGuiControlOrFail<TextBlock>("SettingsView");
      SettingsView.isVisible = true;
    });

    this.bindClickHandler("settings_submit_button", () => {
      const SettingsView = this.getGuiControlOrFail<TextBlock>("SettingsView");
      SettingsView.isVisible = false;
    });

    this.bindClickHandler("Fullscreen", () => {
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
    const musicVolumeSLider = this.getGuiControlOrFail<Slider>(
      "music_volume_slider"
    );
    musicVolumeSLider.onValueChangedObservable.add((value) => {
      console.log("value: ", value);
      if(!this.sceneController.soundController.initialized) return
      this.sceneController.soundController.setMusicVolume(
        value === 0 ? 0 : value / 100
      );
    });
    musicVolumeSLider.value = this.sceneController.soundController.musicVolume * 100
    const sfx_volume_slider = this.getGuiControlOrFail<Slider>(
      "sfx_volume_slider"
    );
    sfx_volume_slider.value = this.sceneController.soundController.sfxVolume * 100
    sfx_volume_slider.onValueChangedObservable.add((value) => {
      console.log("value: ", value);
      if(!this.sceneController.soundController.initialized) return

      this.sceneController.soundController.setSFXVolume(
        value === 0 ? 0 : value / 100
      );
    });
  }
  toggleMainMenu() {
    const SettingsView = this.getGuiControlOrFail<TextBlock>("SettingsView");
    if (SettingsView.isVisible) {
      SettingsView.isVisible = false;
      return;
    }
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
