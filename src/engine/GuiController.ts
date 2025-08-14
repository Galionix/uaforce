import {
    AdvancedDynamicTexture, Button, Control, Slider, StackPanel, TextBlock
} from '@babylonjs/gui';

import { GlobalEventBus } from './event-bus';
import { SceneController } from './SceneController';

export class GuiController {
  sceneController: SceneController;
  private gui?: AdvancedDynamicTexture;
  private dialogGUI?: AdvancedDynamicTexture;
  dialogItems: (Button | TextBlock)[] = [];

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
    // let loadedGUI = await advancedTexture.parseFromSnippetAsync("4O9F56#8");
    let loadedGUI = await advancedTexture.parseFromURLAsync(
      "guiTexture (6).json"
    );
    let advancedDialogTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      "Dialog GUI",
      true,
      this.sceneController.scene
    );
    let loadedDialogGUI = await advancedDialogTexture.parseFromSnippetAsync(
      "Z6073K#2"
    );
    this.dialogGUI = loadedDialogGUI;
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
      // this.sceneController.soundController.SoundsAudios.sfx.ui.click.play();

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
      if (!this.sceneController.soundController.initialized) return;
      this.sceneController.soundController.setMusicVolume(
        value === 0 ? 0 : value / 100
      );
    });
    musicVolumeSLider.value =
      this.sceneController.soundController.musicVolume * 100;
    const sfx_volume_slider =
      this.getGuiControlOrFail<Slider>("sfx_volume_slider");
    sfx_volume_slider.value =
      this.sceneController.soundController.sfxVolume * 100;
    sfx_volume_slider.onValueChangedObservable.add((value) => {
      console.log("value: ", value);
      if (!this.sceneController.soundController.initialized) return;

      this.sceneController.soundController.setSFXVolume(
        value === 0 ? 0 : value / 100
      );
    });
    const mainDialogGui = this.getDialogGuiControlOrFail("dialog-gui");
    mainDialogGui.isVisible = false;
    console.log("mainDialogGui: ", mainDialogGui);
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
  getDialogGuiControlOrFail<T extends Control>(controlName: string): T {
    if (!this.dialogGUI) throw new Error("no dialogGUI");
    const tb = this.dialogGUI.getControlByName(controlName);
    if (!tb) throw new Error("no " + controlName + " in dialogGUI");
    return tb as T;
  }
  setCurrentLocation(location: string) {
    const textBlock = this.getGuiControlOrFail<TextBlock>("Textblock");
    textBlock.text = "You are now here: " + location;
  }
  openDialogGUI() {
    const mainDialogGui = this.getDialogGuiControlOrFail("dialog-gui");
    mainDialogGui.isVisible = true;
  }
  closeDialogGUI() {
    const mainDialogGui = this.getDialogGuiControlOrFail("dialog-gui");
    mainDialogGui.isVisible = false;
    const StackPanel = this.getDialogGuiControlOrFail<StackPanel>("StackPanel");
    StackPanel.children.forEach((ch) => ch.dispose());
    StackPanel.children.forEach((ch) => ch.markAsDirty(true));
    this.dialogItems.forEach((item) => item.dispose());
    this.dialogItems.forEach((item) => item.markAsDirty(true));
    StackPanel.markAllAsDirty();
    this.dialogItems = [];
  }
  // appendToDialogGuiEndOption(){

  // }
  appendToDialogGui(
    id: string,
    text: string,
    choices: {
      index: number;
      text: string;
    }[]
  ) {

    // TODO: this logic is messy. needs refactoring
    if (!choices.length) {
      this.sceneController.game.dialogController.endDialog(id);
      this.closeDialogGUI();
      // this.activeDialogId
      const choseFarewell =
        this.sceneController.game.dialogController.getStoryVariables(
          id,
          "chose_farewell"
        );
      // const choseFarewell = story.variablesState.get("chose_farewell");
      // console.log("Прощался ли игрок:", choseFarewell); // true / false
    }
    const StackPanel = this.getDialogGuiControlOrFail<StackPanel>("StackPanel");

    StackPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    StackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    const text1 = new TextBlock("some-text", text);
    text1.height = "100%"; // Обязательно!
    text1.textWrapping = 1;
    text1.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    text1.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    text1.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    text1.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    text1.resizeToFit = true;
    this.dialogItems.push(text1);
    // text1
    // text1.color = "white";
    // text1.fontSize = 24;
    text1.parent = StackPanel;
    // StackPanel
    console.log("text1: ", text1);
    StackPanel.addControl(text1);

    // const buttonChoice = new Button("choice-");

    const buttons: Button[] = [];
    choices.forEach((choice, index) => {
      const buttonChoice = Button.CreateSimpleButton(
        "choice-" + choice.index,
        choice.text
      );
      this.dialogItems.push(buttonChoice);
      if (!buttonChoice.textBlock) return;
      buttonChoice.textBlock.text = choice.text;
      buttonChoice.textBlock.textWrapping = 1;
      buttonChoice.height = "40px"; // Обязательно!
      buttonChoice.parent = StackPanel;
      buttonChoice.metadata = {
        enabled: true,
      };
      // this.bindClickHandler()
      buttonChoice.onPointerClickObservable.addOnce(() => {
        if (!buttonChoice.metadata.enabled) return;
        // buttons
        buttons.forEach((btn) => {
          if (btn !== buttonChoice) {
            btn.isVisible = false;
          }
          btn.metadata.enabled = false;
        });
        console.log("buttons: ", buttons);
        // Автоматический клик-звук
        // this.sceneController.soundController.SoundsAudios.sfx.ui.click.play();
        // this.sceneController.game.dialogController.continueDialog(id, choice.index)
        GlobalEventBus.emit("dialog:continue", {
          eventId: id,
          choice: choice.index,
        });
      });
      StackPanel.addControl(buttonChoice);
      buttons.push(buttonChoice);
    });

    // const buttonChoice = Button.CreateSimpleButton(
    //   "end-dialog",
    //   'Say bye'
    // );
    // if (!buttonChoice.textBlock) return;
    // buttonChoice.textBlock.text = 'Say bye';
    // buttonChoice.textBlock.textWrapping = 1;
    // buttonChoice.height = "40px"; // Обязательно!
    // buttonChoice.parent = StackPanel;
    // this.dialogItems.push(buttonChoice)
    // buttonChoice.onPointerClickObservable.addOnce(() => {
    //   console.log('StackPanel.children: ', StackPanel.children);
    //   // if (!buttonChoice.metadata.enabled) return;
    //   // // buttons
    //   // buttons.forEach((btn) => {
    //   //   if (btn !== buttonChoice) {
    //   //     btn.isVisible = false;
    //   //   }
    //   //   btn.metadata.enabled = false;
    //   // });
    //   // console.log("buttons: ", buttons);
    //   // Автоматический клик-звук
    //   this.sceneController.soundController.SoundsAudios.sfx.ui.click.play();
    //   // this.sceneController.game.dialogController.continueDialog(id, choice.index)
    //   // GlobalEventBus.emit("dialog:end", {
    //   //   eventId: id,
    //   //   // choice: choice.index,
    //   // });
    //   this.closeDialogGUI()
    // });
    // StackPanel.addControl(buttonChoice);
    console.log("StackPanel: ", StackPanel);
    // StackPanel.add
  }
}
