export type GameEvents = {
    'dialog:trigger': { eventId: string; args?: Record<string, any> };
    'dialog:continue': { eventId: string; choice: number };
    'dialog:end': { eventId: string };
    'npc:interact': { eventId: string };
    'player:move': { x: number; y: number; z: number };
    // добавляй свои события ниже по мере роста проекта
  };