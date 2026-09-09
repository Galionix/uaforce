import test from 'node:test';import assert from 'node:assert/strict';
import {assetUrl} from '../src/game/assets.ts';
test('development retains original paths; release resolves encoded filenames and falls back safely',()=>{
 assert.equal(assetUrl('/assets/audio/river.wav'),'/assets/audio/river.wav');
 Object.defineProperty(globalThis,'__UAFORCE_ASSETS__',{value:{'/assets/audio/Menu Selection Click.wav':'/media/click-123.mp3'},configurable:true});
 try{assert.equal(assetUrl('/assets/audio/Menu%20Selection%20Click.wav'),'/media/click-123.mp3');assert.equal(assetUrl('/unknown.png'),'/unknown.png');}finally{delete (globalThis as any).__UAFORCE_ASSETS__;}
});
