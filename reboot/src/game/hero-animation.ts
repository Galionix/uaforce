/** Locomotion owns the pose while moving; holding fire must not freeze the feet. */
export type HeroPose={grounded:boolean;ladder:number;wallClimbing:boolean;cast:number;attack:number;reloading:number};
export function heroFrame(p:HeroPose,clock:number,moving:boolean){
 if(p.ladder>=0||p.wallClimbing)return 6+Math.floor(clock*6)%2;
 if(!p.grounded)return 3;
 if(moving)return [1,0,2,0][Math.floor(clock*12)%4];
 if(p.cast>0)return p.cast>.35?4:5;
 if(p.attack>0)return 5;
 if(p.reloading>0)return Math.floor(clock*2)%2?4:0;
 return 0;
}
