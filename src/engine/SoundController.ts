import {
    AudioEngineV2, CreateAudioEngineAsync, CreateSoundAsync, SoundState
} from '@babylonjs/core';
import { SoundsMap, SoundType } from '@ex/constants/soundsEnum';

export class SoundController {
  soundEngine?: AudioEngineV2;

  Sounds = SoundsMap;
  footstepsSounds = [
    // this.Sounds.step1.sound,
    this.Sounds.step2.sound,
    // this.Sounds.step3.sound,
  ];
  async asyncInit() {
    const audioEngine = await CreateAudioEngineAsync();

    (
      Object.entries(SoundsMap) as [keyof typeof SoundsMap, SoundType][]
    ).forEach(async ([key, value]) => {
      const sound = await CreateSoundAsync(
        this.Sounds[key].id,
        this.Sounds[key].link
      );
      this.Sounds[key].sound = sound;
    });

    // Wait until audio engine is ready to play sounds.
    await audioEngine.unlockAsync();
    this.footstepsSounds = [
      this.Sounds.step1.sound,
      this.Sounds.step2.sound,
      this.Sounds.step3.sound,
    ];
    this.soundEngine = audioEngine;
  }
  get engine() {
    return this.soundEngine;
  }
  get sounds() {
    return this.Sounds;
  }
  playFootsteps(sprint?: boolean) {
    const anyStarted = this.footstepsSounds.some(
      (sound) => sound?.state === SoundState.Started
    );
    const allStopped = this.footstepsSounds.every(
      (sound) => sound?.state === SoundState.Stopped
    );
    console.log("footstepsSounds: ", this.footstepsSounds);
    if (!anyStarted) {
      // const random = Math.random() * (this.footstepsSounds.length - 0) + 0;
      const random = Math.floor(Math.random() * this.footstepsSounds.length);
      console.log("anyStarted random: ", random);
      if (this.footstepsSounds[random]) {
        if (sprint) {
          this.footstepsSounds[random].playbackRate = 1.5;
        }
        else{
          this.footstepsSounds[random].playbackRate = 1;

        }
        this.footstepsSounds[random].play();
      }
    }

    if (allStopped) {
      // this.Sounds.step1.sound?.play();
      const random = Math.floor(Math.random() * this.footstepsSounds.length);
      console.log("allStopped random: ", random);
      if (this.footstepsSounds[random]) {
        if (sprint) {
          this.footstepsSounds[random].playbackRate = 1.5;
        }
        else{
          this.footstepsSounds[random].playbackRate = 1;

        }
        this.footstepsSounds[random].play();
      }
    }
  }
}
