import {
    AudioEngineV2, CreateAudioEngineAsync, CreateSoundAsync, SoundState, StaticSound
} from '@babylonjs/core';
import { RESOURCES } from '@ex/constants/resources';

import { ResourceStore } from './stores/ResourceStore';

type ReplaceLeaves<T, LeafType> = {
  [K in keyof T]: T[K] extends string
    ? LeafType
    : ReplaceLeaves<T[K], LeafType>;
};
type AudioMap = ReplaceLeaves<typeof RESOURCES.audio, StaticSound>;
export class SoundController {
  initialized = false;
  soundEngine?: AudioEngineV2;
  musicVolume = 1;
  sfxVolume = 1;
  resourceStore: ResourceStore;
  constructor() {
    this.resourceStore = new ResourceStore();
  }
  // Sounds = RESOURCES.audio
  _SoundsAudios: AudioMap | null = null;
  get SoundsAudios(): AudioMap {
    // console.log("this.initialized: ", this.initialized);
    if (this.initialized && !this._SoundsAudios) {
      throw new Error("Sound map not initialized!");
    }
    // @ts-ignore wtf is this
    return this._SoundsAudios;
  }
  footstepsSounds: StaticSound[] = [];

  async loadSoundsTree<T extends typeof RESOURCES.audio>(
    RESOURCES: T
  ): Promise<AudioMap> {
    const result: any = {};

    for (const key in RESOURCES) {
      const value = RESOURCES[key];

      if (typeof value === "string") {
        // Конечный путь — грузим sound
        const source = await this.resourceStore.getFile(value);
        if (!source) {
          throw new Error(
            "Source file for " +
              value +
              " wasnt retrieved from resource storage!!!"
          );
        }
        const blobUrl = URL.createObjectURL(source);

        result[key] = await CreateSoundAsync(value, blobUrl);
        // this.Sounds[key].sound = sound;
        // }
      } else {
        // Рекурсивно обходим вложенность
        result[key] = await this.loadSoundsTree(value as any);
      }
    }

    return result;
  }

  setSFXVolume(value?: number) {
    if (value !== undefined) {
      this.sfxVolume = value;
    }
    this.SoundsAudios.sfx.player.footsteps.stepstone_3.setVolume(
      0.1 * this.sfxVolume
    );
    this.SoundsAudios.sfx.player.footsteps.stepstone_4.setVolume(
      0.1 * this.sfxVolume
    );
    this.SoundsAudios.sfx.player.footsteps.stepstone_5.setVolume(
      0.1 * this.sfxVolume
    );
    this.SoundsAudios.sfx.ui.click.setVolume(
      0.1 * this.sfxVolume
    );
    this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].setVolume(
      0.5 * this.sfxVolume
    );
  }
  // player(){
  //   return {
  //     guiClick : () =>{
  //       this.SoundsAudios.sfx.ui.click.play()
  //     }
  //   }
  // }
  setMusicVolume(value?: number) {
    if (value !== undefined) {
      this.musicVolume = value;
    }
    this.SoundsAudios.music["Medieval Music – Cobblestone Village"].setVolume(
      0.1 * this.musicVolume
    );
  }
  async asyncInit() {
    const audioEngine = await CreateAudioEngineAsync();

    this._SoundsAudios = await this.loadSoundsTree(RESOURCES.audio);
    console.log("this._SoundsAudios: ", this._SoundsAudios);
    // Wait until audio engine is ready to play sounds.
    await audioEngine.unlockAsync();

    this.footstepsSounds = [
      this.SoundsAudios.sfx.player.footsteps.stepstone_3,
      this.SoundsAudios.sfx.player.footsteps.stepstone_4,
      this.SoundsAudios.sfx.player.footsteps.stepstone_5,
    ];
    this.initialized = true;
    this.soundEngine = audioEngine;
    this.setSFXVolume();
    this.setMusicVolume()
  }

  playTheme() {
    // console.log('this.Sounds.theme: ', this.Sounds.theme);
    this.SoundsAudios.music["Medieval Music – Cobblestone Village"].play();
  }
  get engine() {
    return this.soundEngine;
  }
  // get sounds() {
  //   return this.Sounds;
  // }
  fallCount = 0;
  playFall() {
    if (!this.initialized) return;
    if (
      this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].state !==
      SoundState.Started
    )
      this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].play();
    this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].playbackRate =
      this.fallCount;
    this.fallCount += 0.001;
  }
  stopFall() {
    if (!this._SoundsAudios) return;

    this.fallCount = 0;
    this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].playbackRate =
      this.fallCount;
    if (
      this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].state ===
      SoundState.Started
    )
      this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].stop();
  }
  playFootsteps(sprint?: boolean) {
    const anyStarted = this.footstepsSounds.some(
      (sound) => sound?.state === SoundState.Started
    );
    const allStopped = this.footstepsSounds.every(
      (sound) => sound?.state === SoundState.Stopped
    );
    if (!anyStarted) {
      // const random = Math.random() * (this.footstepsSounds.length - 0) + 0;
      const random = Math.floor(Math.random() * this.footstepsSounds.length);
      if (this.footstepsSounds[random]) {
        if (sprint) {
          this.footstepsSounds[random].playbackRate = 1.5;
        } else {
          this.footstepsSounds[random].playbackRate = 1;
        }
        this.footstepsSounds[random].play();
      }
    }

    if (allStopped) {
      // this.Sounds.step1.sound?.play();
      const random = Math.floor(Math.random() * this.footstepsSounds.length);
      if (this.footstepsSounds[random]) {
        if (sprint) {
          this.footstepsSounds[random].playbackRate = 1.5;
        } else {
          this.footstepsSounds[random].playbackRate = 1;
        }
        this.footstepsSounds[random].play();
      }
    }
  }
}
