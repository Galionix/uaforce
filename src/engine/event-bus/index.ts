import type { GameEvents } from './event-types';
type EventCallback<T> = (payload: T) => void;

export class TypedEventBus<TEvents extends Record<string, any>> {
  private listeners: {
    [K in keyof TEvents]?: EventCallback<TEvents[K]>[];
  } = {};

  on<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);
  }

  off<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter(cb => cb !== callback);
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]) {
    this.listeners[event]?.forEach(cb => cb(payload));
  }

  clear<K extends keyof TEvents>(event: K) {
    delete this.listeners[event];
  }
}

export const GlobalEventBus = new TypedEventBus<GameEvents>();
