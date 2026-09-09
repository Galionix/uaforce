import {World} from './world.ts';
import {HEROES,type HeroId} from './content.ts';
/** Uses the existing mission geometry; practice never grants campaign unlocks or records. */
export function practiceWorld(hero:HeroId){
 const w=new World(0,HEROES.map(h=>h.id),hero);
 w.player.x=hero==='it-army'?w.mission.radio-6:12;w.checkpoint=w.player.x;
 w.mode='playing';return w;
}
