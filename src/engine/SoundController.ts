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
    this.Sounds.step1.sound?.setVolume(.3)
    this.Sounds.step2.sound?.setVolume(.3)
    this.Sounds.step3.sound?.setVolume(.3)
    this.footstepsSounds = [
      this.Sounds.step1.sound,
      this.Sounds.step2.sound,
      this.Sounds.step3.sound,
    ];
    this.soundEngine = audioEngine;
  }

  playTheme() {
    console.log('this.Sounds.theme: ', this.Sounds.theme);
    this.Sounds.theme.sound?.setVolume(0.1)
    // this.Sounds.theme.sound?.play()
  }
  get engine() {
    return this.soundEngine;
  }
  get sounds() {
    return this.Sounds;
  }
  fallCount = 0;
  playFall() {
    if (!this.Sounds.wind.sound) return;
    if (this.Sounds.wind.sound?.state !== SoundState.Started)
      this.Sounds.wind.sound?.play();
    this.Sounds.wind.sound.playbackRate = this.fallCount;
    this.fallCount += 0.001;
    console.log('this.fallCount: ', this.fallCount);
  }
  stopFall() {
    if (!this.Sounds.wind.sound) return;

    this.fallCount = 0;
    this.Sounds.wind.sound.playbackRate = this.fallCount;
    if (this.Sounds.wind.sound?.state === SoundState.Started)
      this.Sounds.wind.sound?.stop();
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
