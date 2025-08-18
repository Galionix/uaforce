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
type AudioMap = ReplaceLeaves<typeof RESOURCES.audios, StaticSound>;
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

  // Footstep sequence system
  private footstepSequences: { left: StaticSound; right: StaticSound }[][] = [];
  private currentSequenceIndex = 0;
  private currentStepInSequence = 0; // 0 = left, 1 = right
  private isFootstepPlaying = false;
  private footstepTimer: number | null = null;

  /**
   * Create sound sequences from paired left-right sounds
   * @param sequences Array of left-right sound pairs
   * @returns Array of sequence arrays with left-right pairs
   */
  private createSoundSequences(sequences: { left: StaticSound; right: StaticSound }[][]): { left: StaticSound; right: StaticSound }[][] {
    if (!this._SoundsAudios) return [];
    return sequences.filter(sequence =>
      sequence.every(pair => pair.left && pair.right)
    );
  }

  /**
   * Play the next sound in the current footstep sequence
   * @param volume Volume multiplier
   * @param playbackRate Playback rate
   */
  private playNextFootstepInSequence(volume: number = 0.3, playbackRate: number = 1): void {
    if (this.footstepSequences.length === 0 || this.isFootstepPlaying) return;

    const currentSequence = this.footstepSequences[this.currentSequenceIndex];
    if (!currentSequence || currentSequence.length === 0) return;

    // Get random pair from current sequence
    const randomPairIndex = Math.floor(Math.random() * currentSequence.length);
    const soundPair = currentSequence[randomPairIndex];

    // Play left or right based on current step
    const soundToPlay = this.currentStepInSequence === 0 ? soundPair.left : soundPair.right;

    if (soundToPlay) {
      this.isFootstepPlaying = true;
      soundToPlay.setVolume(volume * this.sfxVolume);
      soundToPlay.playbackRate = playbackRate;
      soundToPlay.play();

      // Wait for sound to finish before allowing next step
      soundToPlay.onEndedObservable.addOnce(() => {
        this.isFootstepPlaying = false;

        // Advance to next step in sequence
        this.currentStepInSequence = (this.currentStepInSequence + 1) % 2;

        // If we completed a left-right pair, potentially switch to new sequence
        if (this.currentStepInSequence === 0) {
          // 30% chance to switch to a new random sequence
          if (Math.random() < 0.3) {
            this.currentSequenceIndex = Math.floor(Math.random() * this.footstepSequences.length);
          }
        }
      });
    }
  }

  /**
   * Utility method to play a random sound from an array of sounds
   * @param sounds Array of StaticSound objects
   * @param volume Volume multiplier (will be multiplied by sfxVolume)
   * @param playbackRate Optional playback rate (default: 1)
   */
  private playRandomSound(sounds: StaticSound[], volume: number = 0.6, playbackRate: number = 1): void {
    if (!this._SoundsAudios || sounds.length === 0) return;

    // Filter out null/undefined sounds
    const validSounds = sounds.filter(sound => sound);
    if (validSounds.length === 0) return;

    const randomIndex = Math.floor(Math.random() * validSounds.length);
    const selectedSound = validSounds[randomIndex];

    if (selectedSound) {
      selectedSound.setVolume(volume * this.sfxVolume);
      selectedSound.playbackRate = playbackRate;
      selectedSound.play();
    }
  }

  /**
   * Utility method to play a single sound with volume and playback rate
   * @param sound The StaticSound to play
   * @param volume Volume multiplier (will be multiplied by sfxVolume)
   * @param playbackRate Optional playback rate (default: 1)
   */
  private playSingleSound(sound: StaticSound, volume: number = 0.6, playbackRate: number = 1): void {
    if (!this._SoundsAudios || !sound) return;

    sound.setVolume(volume * this.sfxVolume);
    sound.playbackRate = playbackRate;
    sound.play();
  }

  /**
   * Utility method to stop a sound if it's currently playing
   * @param sound The StaticSound to stop
   */
  private stopSoundIfPlaying(sound: StaticSound): void {
    if (sound && sound.state === SoundState.Started) {
      sound.stop();
    }
  }

  /**
   * Create a sound group from a path in the audio map
   * @param pathCallback Function that takes the audio map and returns an array of sounds
   * @returns Array of StaticSound objects
   */
  private createSoundGroup(pathCallback: (audioMap: AudioMap) => StaticSound[]): StaticSound[] {
    if (!this._SoundsAudios) return [];
    return pathCallback(this._SoundsAudios).filter(sound => sound);
  }

  async loadSoundsTree<T extends typeof RESOURCES.audios>(
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

    // Update legacy footsteps volume
    // this.footstepsSounds.forEach(sound=>sound.setVolume(0.3 * this.sfxVolume))

    // Note: Sequence footsteps volume is handled dynamically in playNextFootstepInSequence
    // this.SoundsAudios.sfx.player.footsteps.stepstone_3.setVolume(
    //   0.1 * this.sfxVolume
    // );
    // this.SoundsAudios.sfx.player.footsteps.stepstone_4.setVolume(
    //   0.1 * this.sfxVolume
    // );
    // this.SoundsAudios.sfx.player.footsteps.stepstone_5.setVolume(
    //   0.1 * this.sfxVolume
    // );
    // this.SoundsAudios.sfx.ui.click.setVolume(
    //   0.1 * this.sfxVolume
    // );
    // this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].setVolume(
    //   0.5 * this.sfxVolume
    // );
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
    // this.SoundsAudios.music["Medieval Music – Cobblestone Village"].setVolume(
    //   0.1 * this.musicVolume
    // );
  }
  async asyncInit() {
    const audioEngine = await CreateAudioEngineAsync();

    this._SoundsAudios = await this.loadSoundsTree(RESOURCES.audios);
    console.log("this._SoundsAudios: ", this._SoundsAudios);
    // Wait until audio engine is ready to play sounds.
    await audioEngine.unlockAsync();

    // Initialize old footsteps array (keeping for backward compatibility)
    this.footstepsSounds = [
      // this.SoundsAudios.sfx.player.footsteps['gassy-footstep1'],
      // this.SoundsAudios.sfx.player.footsteps['grassy-footstep2'],
      // this.SoundsAudios.sfx.player.footsteps['grassy-footstep3'],
      // this.SoundsAudios.sfx.player.footsteps['grassy-footstep4'],
    ];

    // Initialize footstep sequences (left-right pairs)
    this.footstepSequences = [
      // Sand footsteps sequence
      [
        {
          left: this._SoundsAudios.player.footsteps["Fantozzi-SandL1"],
          right: this._SoundsAudios.player.footsteps["Fantozzi-SandR1"]
        },
        {
          left: this._SoundsAudios.player.footsteps["Fantozzi-SandL2"],
          right: this._SoundsAudios.player.footsteps["Fantozzi-SandR2"]
        },
        {
          left: this._SoundsAudios.player.footsteps["Fantozzi-SandL3"],
          right: this._SoundsAudios.player.footsteps["Fantozzi-SandR3"]
        }
      ],
      // Stone footsteps sequence
      [
        {
          left: this._SoundsAudios.player.footsteps["Fantozzi-StoneL1"],
          right: this._SoundsAudios.player.footsteps["Fantozzi-StoneR1"]
        },
        {
          left: this._SoundsAudios.player.footsteps["Fantozzi-StoneL2"],
          right: this._SoundsAudios.player.footsteps["Fantozzi-StoneR2"]
        },
        {
          left: this._SoundsAudios.player.footsteps["Fantozzi-StoneL3"],
          right: this._SoundsAudios.player.footsteps["Fantozzi-StoneR3"]
        }
      ]
    ];

    // Start with random sequence
    this.currentSequenceIndex = Math.floor(Math.random() * this.footstepSequences.length);

    this.initialized = true;
    this.soundEngine = audioEngine;
    this.setSFXVolume();
    this.setMusicVolume()
  }

  playTheme() {
    // console.log('this.Sounds.theme: ', this.Sounds.theme);
    // this.SoundsAudios.music["Medieval Music – Cobblestone Village"].play();
  }
  get engine() {
    return this.soundEngine;
  }
  // get sounds() {
  //   return this.Sounds;
  // }
  fallCount = 0;
  playFall() {
    // if (!this.initialized) return;
    // if (
    //   this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].state !==
    //   SoundState.Started
    // )
    //   this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].play();
    // this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].playbackRate =
    //   this.fallCount;
    // this.fallCount += 0.001;
  }
  stopFall() {
    if (!this._SoundsAudios) return;

    this.fallCount = 0;
    // this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].playbackRate =
    //   this.fallCount;
    // if (
    //   this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].state ===
    //   SoundState.Started
    // )
    //   this.SoundsAudios.sfx.player.behaviour["fallSound(wind2)"].stop();
  }
  /**
   * Play footsteps using the sequence system (left-right pattern)
   * @param sprint Whether player is sprinting
   */
  playFootsteps(sprint?: boolean) {
    if (this.footstepSequences.length === 0) return;

    // Don't play if previous footstep is still playing
    if (this.isFootstepPlaying) return;

    const playbackRate = sprint ? 1.5 : 1;
    this.playNextFootstepInSequence(0.4, playbackRate);
  }

  /**
   * Start continuous footstep playback while moving
   * @param sprint Whether player is sprinting
   */
  startFootstepLoop(sprint?: boolean) {
    if (this.footstepTimer) return; // Already looping

    const playbackRate = sprint ? 1.5 : 1;
    const interval = sprint ? 300 : 500; // Faster footsteps when sprinting

    // Play first footstep immediately
    this.playFootsteps(sprint);

    // Set up interval for continuous footsteps
    this.footstepTimer = window.setInterval(() => {
      if (!this.isFootstepPlaying) {
        this.playFootsteps(sprint);
      }
    }, interval);
  }

  /**
   * Stop continuous footstep playback
   */
  stopFootstepLoop() {
    if (this.footstepTimer) {
      clearInterval(this.footstepTimer);
      this.footstepTimer = null;
    }
  }

  /**
   * Play a random death sound
   */
  playDeath() {
    const deathSounds = this.createSoundGroup(audio => [
      audio.player.deathh,
      audio.player.die1,
      audio.player.die2
    ]);

    this.playRandomSound(deathSounds, 0.7);
  }

  /**
   * Play spawn/respawn sound (using snare as spawn sound)
   */
  playSpawn() {
    if (!this._SoundsAudios) return;

    this.playSingleSound(this.SoundsAudios.sfx.snare, 0.5);
  }

  /**
   * Play a random jump sound
   */
  playJump() {
    const jumpSounds = this.createSoundGroup(audio => [
      audio.player.jumps["slightscream-06"],
      audio.player.jumps["slightscream-07"],
      audio.player.jumps["slightscream-08"],
      audio.player.jumps["slightscream-09"],
      audio.player.jumps["slightscream-10"],
      audio.player.jumps["slightscream-11"],
      audio.player.jumps["slightscream-12"],
      audio.player.jumps["slightscream-13"],
      audio.player.jumps["slightscream-14"],
      audio.player.jumps["slightscream-15"]
    ]);

    this.playRandomSound(jumpSounds, 0.4);
  }

  /**
   * Play UI click sound for menu interactions
   */
  playUIClick() {
    if (!this._SoundsAudios) return;

    this.playSingleSound(this.SoundsAudios.sfx.ui["Menu Selection Click"], 0.3);
  }

  /**
   * Play a random landing sound when player hits the ground after falling
   * @param impactStrength Optional impact strength to adjust volume (0-2.0)
   */
  playLanding(impactStrength?: number) {
    const landingSounds = this.createSoundGroup(audio => [
      audio.player.fall_sounds.impactfall1,
      audio.player.fall_sounds.ledge,
      audio.player.fall_sounds.ledge2
    ]);

    // Adjust volume based on impact strength (0.4 minimum, 1.0 maximum)
    const baseVolume = 0.8;
    const volume = impactStrength
      ? Math.max(0.4, Math.min(1.0, baseVolume * (impactStrength / 2.0)))
      : baseVolume;

    this.playRandomSound(landingSounds, volume);
  }

  /**
   * Play a random pain sound (for taking damage)
   */
  playPain() {
    const painSounds = this.createSoundGroup(audio => [
      audio.player.pain1,
      audio.player.pain2,
      audio.player.pain3,
      audio.player.pain4,
      audio.player.pain5,
      audio.player.pain6,
      audio.player.painh,
      audio.player.paino
    ]);

    this.playRandomSound(painSounds, 0.6);
  }
  playReload(){
    const reloadSounds = this.createSoundGroup(audio => [
      audio.guns.reload
    ]);

    this.playRandomSound(reloadSounds, 0.6);
  }

  playShot(){
    const shotSounds = this.createSoundGroup(audio => [
      audio.guns.pistol,
      // audio.guns.rifle,
      // audio.guns.shotgun,
      // audio.guns.cg1
    ]);

    this.playRandomSound(shotSounds, 0.3);
  }

  /**
   * Example of how to easily add more sound categories using the utilities
   * This shows the pattern for adding new sound types in the future
   */
  // playUIHover() {
  //   const hoverSounds = this.createSoundGroup(audio => [
  //     audio.sfx.ui.hover1,
  //     audio.sfx.ui.hover2,
  //     // ... more hover sounds
  //   ]);
  //   this.playRandomSound(hoverSounds, 0.2);
  // }
  //
  // playAmbientNature() {
  //   const natureSounds = this.createSoundGroup(audio => [
  //     audio.ambient.nature.birds,
  //     audio.ambient.nature.wind,
  //     // ... more nature sounds
  //   ]);
  //   this.playRandomSound(natureSounds, 0.8);
  // }
}
