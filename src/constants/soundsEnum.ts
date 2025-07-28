import { StaticSound } from '@babylonjs/core';

export type SoundType = {
  id: string;
  link: string;
  sound?: StaticSound;
};
const enum soundList {
  theme = "theme",
  step1 = "step1",
  step2 = "step2",
  step3 = "step3",
  wind = "wind",
}
export const SoundsMap: Record<keyof typeof soundList, SoundType> = {
  theme: {
    id: soundList.theme,
    link: "sounds/music/top_dungeon.mp3",
  },
  step1: {
    id: soundList.step1,
    link: "sounds/sfx/player/footsteps/stepstone_3.wav",
  },
  step2: {
    id: soundList.step2,
    link: "sounds/sfx/player/footsteps/stepstone_4.wav",
  },
  step3: {
    id: soundList.step3,
    link: "sounds/sfx/player/footsteps/stepstone_5.wav",
  },
  wind: {
    id: soundList.wind,
    link: "sounds/sfx/player/footsteps/wind.mp3",
  },
};
