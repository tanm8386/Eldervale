import type { Character, WorldState } from '../types';

export class RealmConnection {
  socket: WebSocket | null = null;
  state: WorldState | null = null;
  timeOffset = 0;
  ping = 0;
  stopped = false;
  token: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private retry = 0;
  private generation = 0;
  onMessage: (message: any) => void = () => {};
  onStatus: (status: string) => void = () => {};

  connect(character?: Character, token?: string | null) {
    this.stopped = false;
    if (token) this.token = token;
    const generation = ++this.generation;
    this.socket?.close();
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.onStatus('connecting');
    const url = new URL('/world', window.location.href);
    url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.onopen = () => {
      if (generation !== this.generation) return;
      this.send({ type: 'hello', character, token: this.token });
    };
    socket.onmessage = (event) => {
      if (generation !== this.generation) return;
      const message = JSON.parse(event.data);
      if (message.type === 'welcome') {
        this.token = message.token;
        localStorage.setItem('eldervale-token', message.token);
        this.timeOffset = message.serverTime - Date.now();
        this.retry = 0;
        this.onStatus('online');
        this.heartbeat = setInterval(() => this.send({ type: 'ping', sent: Date.now() }), 5000);
      } else if (message.type === 'state') {
        this.state = message;
        this.timeOffset = message.time - Date.now();
      } else if (message.type === 'pong') {
        this.ping = Date.now() - message.sent;
        this.timeOffset = message.time + this.ping / 2 - Date.now();
      } else if (message.type === 'replaced' || message.type === 'character-required') {
        this.stopped = true;
        if (message.type === 'character-required') {
          this.token = null;
          localStorage.removeItem('eldervale-token');
        }
      }
      this.onMessage(message);
    };
    socket.onclose = () => {
      if (generation !== this.generation) return;
      if (this.heartbeat) clearInterval(this.heartbeat);
      if (this.stopped) {
        this.onStatus('offline');
        return;
      }
      this.onStatus('reconnecting');
      this.reconnectTimer = setTimeout(
        () => this.connect(this.token ? undefined : character),
        Math.min(10000, 1200 * 1.5 ** this.retry++),
      );
    };
    socket.onerror = () => socket.close();
  }

  send(message: Record<string, unknown>) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  close() {
    this.stopped = true;
    this.generation++;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.socket?.close();
    this.socket = null;
    this.state = null;
  }

  get now() {
    return Date.now() + this.timeOffset;
  }
}
