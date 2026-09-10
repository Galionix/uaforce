import {TouchState} from './touch-state.ts';
import type { Actions } from './world';
export type Command = 'jump' | 'fire' | 'special' | 'ultimate' | 'interact' | 'pause';
export type Pad = { index: number; id: string; mapping: string; connected: boolean; axes: readonly number[]; buttons: readonly { pressed: boolean; value: number }[] };
export type Bindings = { keys: Record<Command | 'left' | 'right', string>; buttons: Record<Command, number>; moveAxis: number; deadzone: number };
export const DEFAULTS: Bindings = { keys: { left: 'KeyA', right: 'KeyD', jump: 'Space', fire: 'KeyJ', special: 'KeyE', ultimate: 'KeyQ', interact: 'KeyF', pause: 'Escape' }, buttons: { jump: 0, fire: 7, special: 5, ultimate: 6, interact: 2, pause: 9 }, moveAxis: 0, deadzone: .2 };
export const freshBindings = (): Bindings => structuredClone(DEFAULTS);
/** Never label PlayStation interaction as Xbox X: it looks like the jump cross. */
export function padButtonLabel(index:number,id=''){
 const sony=/054c|sony|dualsense|dualshock|playstation/i.test(id);
 const xbox=/045e|xbox|xinput/i.test(id);
 const ps:Record<number,string>={0:'✕',1:'○',2:'□',3:'△',4:'L1',5:'R1',6:'L2',7:'R2',9:'Options'};
 const xb:Record<number,string>={0:'A',1:'B',2:'X',3:'Y',4:'LB',5:'RB',6:'LT',7:'RT',9:'Start'};
 return sony?(ps[index]??String(index)):xbox?(xb[index]??String(index)):ps[index]?`${xb[index]} / ${ps[index]}`:`Кнопка ${index}`;
}
export function axis(value: number | undefined, deadzone: number) {
  if (!Number.isFinite(value)) return 0;
  const magnitude = Math.min(1, Math.abs(value!));
  return magnitude <= deadzone ? 0 : Math.sign(value!) * (magnitude - deadzone) / (1 - deadzone);
}
export function padActions(pad: Pad | null, bindings: Bindings) {
  const pressed = (i: number) => !!pad?.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > .45);
  const move = pressed(14) ? -1 : pressed(15) ? 1 : axis(pad?.axes[bindings.moveAxis], bindings.deadzone);
  return { move, climb: -axis(pad?.axes[1],bindings.deadzone)||(pressed(12)?1:pressed(13)?-1:0),
    jump: pressed(bindings.buttons.jump), fire: pressed(bindings.buttons.fire), special: pressed(bindings.buttons.special), ultimate: pressed(bindings.buttons.ultimate), interact: pressed(bindings.buttons.interact), pause: pressed(bindings.buttons.pause), up: pressed(12) || axis(pad?.axes[1],bindings.deadzone) < -.35, down: pressed(13) || axis(pad?.axes[1],bindings.deadzone) > .35, confirm: pressed(0) };
}
/** Immediate navigation, then a deliberate held-stick/D-pad repeat. */
export class MenuRepeat {
  private direction=0;private remaining=0;
  clear(){this.direction=0;this.remaining=0;}
  step(up:boolean,down:boolean,dt:number){
    const direction=Number(down)-Number(up);
    if(!direction){this.clear();return 0;}
    if(direction!==this.direction){this.direction=direction;this.remaining=.4;return direction;}
    this.remaining-=dt;if(this.remaining>0)return 0;
    this.remaining=.12;return direction;
  }
}
export class Edges {
  private previous: Record<string, boolean> = {};
  take(name: string, down: boolean) { const edge = down && !this.previous[name]; this.previous[name] = down; return edge; }
  clear() { this.previous = {}; }
}
export function loadBindings(text: string | null): Bindings {
  const result = freshBindings();
  try {
    const saved = JSON.parse(text ?? '{}');
    for (const key of Object.keys(result.keys) as (keyof Bindings['keys'])[]) if (typeof saved.keys?.[key] === 'string' && /^[A-Za-z0-9]+$/.test(saved.keys[key])) result.keys[key] = saved.keys[key];
    for (const key of Object.keys(result.buttons) as Command[]) if (Number.isInteger(saved.buttons?.[key]) && saved.buttons[key] >= 0 && saved.buttons[key] < 64) result.buttons[key] = saved.buttons[key];
    if (Number.isInteger(saved.moveAxis) && saved.moveAxis >= 0 && saved.moveAxis < 16) result.moveAxis = saved.moveAxis;
    if (typeof saved.deadzone === 'number' && saved.deadzone >= .05 && saved.deadzone <= .5) result.deadzone = saved.deadzone;
  } catch { /* Damaged or old settings fall back to usable defaults. */ }
  return result;
}
export class Input {
  bindings = freshBindings();
  keys = new Set<string>();
  pad: Pad | null = null;
  pads: Pad[] = [];
  selected = -1;
  source: 'keyboard' | 'gamepad' | 'touch' = 'keyboard';
  readonly touch=new TouchState();
  onDisconnect = () => {};
  onCapture = () => {};
  capture: { kind: 'key' | 'button'; action: keyof Bindings['keys'] } | null = null;
  private edges = new Edges();
  private taps = new Set<string>();
  private blockedKeys = new Set<string>();
  private controller = new AbortController();
  private hadPad = false;
  private previousPadId = '';
  private released = false;
  private releasedActions = new Set<string>();
  private menuRepeat = new MenuRepeat();
  constructor(canvas: HTMLCanvasElement) {
    try { this.bindings = loadBindings(localStorage.getItem('uaforce.controls.v1')); } catch { /* Private storage may be blocked. */ }
    const options = { signal: this.controller.signal };
    window.addEventListener('keydown', e => {
      if(this.blockedKeys.has(e.code)&&e.repeat){e.preventDefault();return;}
      if(!e.repeat)this.blockedKeys.delete(e.code);
      if (this.capture && e.code === 'Escape') { e.preventDefault();this.capture=null;this.clear();this.onCapture();return; }
      if (this.capture?.kind === 'key') {
        e.preventDefault();
        if (e.code !== 'Escape') { this.bindings.keys[this.capture.action] = e.code; this.save(); }
        this.capture = null; this.clear(); this.onCapture(); return;
      }
      if (e.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (Object.values(this.bindings.keys).includes(e.code) || ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyS'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code); if (!e.repeat) this.taps.add(e.code); this.source = 'keyboard';
    }, options);
    window.addEventListener('keyup', e => {this.keys.delete(e.code);this.blockedKeys.delete(e.code);}, options);
    canvas.addEventListener('contextmenu', e => e.preventDefault(), options);
    window.addEventListener('blur', () => this.clear(), options);
  }
  save() { try { localStorage.setItem('uaforce.controls.v1', JSON.stringify(this.bindings)); } catch { /* Gameplay works without persistence. */ } }
  clear() { this.touch.clear();for(const key of this.keys)this.blockedKeys.add(key);this.keys.clear();this.taps.clear();this.edges.clear(); this.released = false;this.releasedActions.clear();this.menuRepeat.clear(); }
  poll(dt=1/60) {
    try { this.pads = Array.from(navigator.getGamepads?.() ?? []).filter((pad): pad is Gamepad => !!pad?.connected); } catch { this.pads = []; }
    this.pad = this.pads.find(p => p.index === this.selected) ?? this.pads[0] ?? null;
    const identity = this.pad ? `${this.pad.index}:${this.pad.id}` : '';
    if (identity !== this.previousPadId) { if(this.hadPad)this.onDisconnect();this.edges.clear(); this.released = false;this.releasedActions.clear();this.menuRepeat.clear(); this.previousPadId = identity; }
    this.hadPad = !!this.pad;
    const p = padActions(this.pad, this.bindings);
    for(const action of [...Object.keys(this.bindings.buttons),'confirm'] as (Command|'confirm')[])if(!p[action])this.releasedActions.add(action);
    const neutral=!this.pad?.buttons.some(b=>b.pressed||b.value>.45);
    if (neutral) this.released = true;
    if (this.capture?.kind === 'button' && this.pad) {
      const index = this.pad.buttons.findIndex(b => b.pressed || b.value > .6);
      if (index >= 0 && this.released) { this.bindings.buttons[this.capture.action as Command] = index; this.capture = null; this.save(); this.clear(); this.onCapture(); }
    }
    if (Math.abs(p.move) > .1 || p.up || p.down || p.fire || p.jump || p.special || p.ultimate || p.interact || p.pause) this.source = 'gamepad';
    const key = (action: keyof Bindings['keys']) => this.keys.has(this.bindings.keys[action]) || this.taps.has(this.bindings.keys[action]);
    const uiTyping = document.activeElement instanceof HTMLElement && ['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName);
    const suppressed = !!this.capture || uiTyping || document.hidden || !document.hasFocus();
    if(suppressed)this.touch.clear();
    const touch=this.touch.sample();
    const keyboardMove = (key('right') || this.keys.has('ArrowRight') ? 1 : 0) - (key('left') || this.keys.has('ArrowLeft') ? 1 : 0);
    const move = suppressed ? 0 : keyboardMove || touch.move || p.move;
    const down = (action: Command) => !suppressed && (key(action) || (action!=='pause'&&!!touch[action]) || (this.releasedActions.has(action) && p[action]));
    const jump = this.edges.take('jump', down('jump'));
    const special = this.edges.take('special', down('special'));
    const ultimate = this.edges.take('ultimate', down('ultimate'));
    const menuDirection=this.menuRepeat.step(!suppressed&&(p.up||this.keys.has('ArrowUp')||this.taps.has('ArrowUp')),!suppressed&&(p.down||this.keys.has('ArrowDown')||this.taps.has('ArrowDown')),dt);
    const result = {
      action: { move, climb:suppressed?0:((this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)-(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0))||touch.climb||p.climb, jump, jumpHeld:down('jump'), special, ultimate, fire: down('fire'), interact: down('interact') } as Actions,
      pause: this.edges.take('pause', down('pause')),
      up: menuDirection<0, down: menuDirection>0,
      confirm: this.edges.take('confirm', !suppressed && this.releasedActions.has('confirm') && p.confirm),
    };
    this.taps.clear();
    return result;
  }
  destroy() { this.controller.abort(); this.clear(); }
}
