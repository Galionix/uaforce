import type {InfantryKind} from './infantry.ts';
export type Point={x:number;y:number};
export type OperationLayout={
 spawn:Point;exitY:number;radioY:number;
 checkpoints:Point[];allies:Point[];ammo:Point[];medkits:Point[];
 ladders:{x:number;bottom:number;top:number}[];
 surfaces:{left:number;right:number;top:number;depth?:number;kind:'stone'|'earth'|'platform';permanent?:boolean}[];
 props:{x:number;y:number;kind:'crate'|'barrel'|'wall'}[];
 guards:{x:number;y:number;role:InfantryKind;commander?:boolean}[];
 rooms:{left:number;right:number;bottom:number;top:number}[];
 /** Artist-facing traversal checkpoints, also used by the silent route verification. */
 route:Point[];
};
