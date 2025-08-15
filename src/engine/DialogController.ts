import { Story } from 'inkjs';

import { GlobalEventBus } from './event-bus';
import { Game } from './Game';
import { GuiController } from './GuiController';

type DialogResource = {
  id: string; // Имя или ID диалога
  storyContent: any; // JSON контент Ink
};

type DialogContext = {
  story: Story;
  meshId: string; // ID или ссылка на привязанный меш
};

type EventBinding = {
  dialogId: string;
  knotName?: string;
};

export class DialogController {
  private dialogMap: Map<string, DialogResource> = new Map();
  private activeDialogs: Map<string, DialogContext> = new Map();
  private eventBindings: Map<string, EventBinding> = new Map();
  private guiController: GuiController;

  public activeDialogId: string = ''
  constructor(game: Game) {
    if (!game._sceneController?.guiController)
      throw new Error("Error creation DialogController");
    this.guiController = game._sceneController.guiController;

    GlobalEventBus.on("dialog:trigger", ({ eventId, args }) => {
        // if(this.activeDialogs )
      this.guiController.openDialogGUI();
      const dialogResponse = this.triggerEvent(eventId, args);
      console.log('dialogResponse: ', dialogResponse);
      if(!dialogResponse) return

    //   console.log('dialogResponse.text: ', dialogResponse.text);
      // console.log(this.triggerEvent(eventId, args))
      this.guiController.appendToDialogGui(
        eventId,
        dialogResponse.text.join(),
        dialogResponse.choices
      );
      // this.triggerEvent(eventId, args);
    });
    GlobalEventBus.on('dialog:continue', ({ eventId, choice })=>{
        const continueRes = this.continueDialog(eventId, choice)
        console.log('continueRes: ', continueRes);
        this.guiController.appendToDialogGui(
            eventId,
            continueRes.text.at(-1) || '',
            continueRes.choices
          );

    //     return {
    //     eventId: 'pressT',
    //     choice: choice.index
    //     // args: { reputation: 2 }
    //   }
    });
  }

  getStoryVariables(dialogId: string, variableId: string){
    const story =  this.activeDialogs.get(dialogId)
    if(!story) throw new Error("no such story: "+ dialogId)
        const getVarResult = story.story.variablesState.GetVariableWithName(variableId)
    if(getVarResult) return (getVarResult as any).value
  }
  // Загружает диалоги (Ink JSON) асинхронно и регистрирует
  async loadDialog(id: string, loader: () => Promise<any>) {
    const storyContent = await loader();
    this.dialogMap.set(id, { id, storyContent });
    console.log("this.dialogMap: ", this.dialogMap);
  }

  // Привязывает диалог к мешу (по ID)
  bindDialogToMesh(dialogId: string, meshId: string) {
    if (!this.dialogMap.has(dialogId)) {
      throw new Error(`Dialog ${dialogId} not found`);
    }
    const resource = this.dialogMap.get(dialogId)!;
    const story = new Story(resource.storyContent);
    this.activeDialogs.set(meshId, { story, meshId });
  }

  // Связывает игровое событие с конкретным диалогом
  bindEventToDialog(eventId: string, dialogId: string, knotName?: string) {
    if (!this.dialogMap.has(dialogId)) {
      throw new Error(`Dialog ${dialogId} not loaded`);
    }
    this.eventBindings.set(eventId, { dialogId, knotName });
  }

  // Вызываешь, когда в игре происходит событие (триггер)
  triggerEvent(eventId: string, args?: Record<string, any>) {
    console.log("eventId: ", eventId);
    const binding = this.eventBindings.get(eventId);
    console.log("binding: ", binding);
    if (!binding) {
      throw new Error(`No dialog bound to event ${eventId}`);
    }

    const { dialogId, knotName } = binding;
    if(this.activeDialogId === dialogId) return
    this.activeDialogId = dialogId
    // Привяжем Story к мешу, если ещё не привязан
    if (!this.activeDialogs.has(eventId)) {
      this.bindDialogToMesh(dialogId, eventId);
    }

    // Запустим диалог через твой startDialog
    return this.startDialog(eventId, knotName, args);
  }

  // Вызывает диалог для конкретного меша
  startDialog(meshId: string, knotName?: string, args?: Record<string, any>) {
    const context = this.activeDialogs.get(meshId);
    if (!context) {
      throw new Error(`No dialog bound to mesh ${meshId}`);
    }

    const { story } = context;

    // Установим переменные Ink, если есть
    if (args) {
      for (const [key, value] of Object.entries(args)) {
        story.variablesState.$(key, value);
      }
    }

    // Перейти к нужному узлу, если указан
    if (knotName) {
      story.ChoosePathString(knotName);
    }

    // Прогоняем первую порцию текста
    const output: (string | null)[] = [];
    while (story.canContinue) {
      output.push(story.Continue());
    }

    const choices = story.currentChoices.map((choice, index) => ({
      index,
      text: choice.text,
    }));

    return {
      text: output,
      choices,
    };
  }

  // Продолжить выбранную ветку
  continueDialog(meshId: string, choiceIndex: number) {
    const context = this.activeDialogs.get(meshId);
    if (!context) {
      throw new Error(`No dialog bound to mesh ${meshId}`);
    }

    const { story } = context;

    story.ChooseChoiceIndex(choiceIndex);

    const output: (string | null)[] = [];
    while (story.canContinue) {
      output.push(story.Continue());
    }

    const choices = story.currentChoices.map((choice, index) => ({
      index,
      text: choice.text,
    }));

    return {
      text: output,
      choices,
    };
  }

  // Сбросить диалог
  endDialog(meshId: string) {
    // this.activeDialogs.delete(meshId);
    this.activeDialogId = ''
  }
}
