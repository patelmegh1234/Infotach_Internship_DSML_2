/**
 * AtmoGraph — Live WebSocket Service
 * ====================================
 * Connects to the FastAPI WebSocket endpoint (/ws)
 * and distributes real-time disruption & prediction updates across the UI.
 *
 * Part of Issue #7 (Megh Patel — Team Leader)
 */

export type WebSocketStatus = 'connected' | 'connecting' | 'disconnected';

export interface WebSocketMessage {
  type: string;
  event?: any;
  disruption?: any;
  predictions?: any[];
  disruption_id?: string;
  client_id?: string;
  timestamp?: string;
  [key: string]: any;
}

type MessageListener = (msg: WebSocketMessage) => void;
type StatusListener = (status: WebSocketStatus) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private messageListeners: Set<MessageListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private status: WebSocketStatus = 'disconnected';
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private clientId: string = `client_${Math.random().toString(36).substring(2, 9)}`;

  constructor() {
    // Only attempt browser WebSocket connection when running in window
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  private getWebSocketUrl(): string {
    const envWs = import.meta.env.VITE_WS_URL as string | undefined;
    if (envWs) {
      return envWs.endsWith('/') ? `${envWs}${this.clientId}` : `${envWs}/${this.clientId}`;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (window.location.port === '5173' || window.location.port === '3000') {
      return `ws://localhost:8000/ws/${this.clientId}`;
    }
    return `${protocol}//${window.location.host}/ws/${this.clientId}`;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');
    const url = this.getWebSocketUrl();

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus('connected');
        if (this.reconnectTimer) {
          window.clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        // Start ping heartbeat
        this.pingInterval = window.setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.messageListeners.forEach((listener) => listener(data));
        } catch {
          // ignore non-JSON frames
        }
      };

      this.ws.onclose = () => {
        this.cleanup();
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.cleanup();
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };
    } catch {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private cleanup(): void {
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 4000);
  }

  private setStatus(newStatus: WebSocketStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((fn) => fn(newStatus));
    }
  }

  public getStatus(): WebSocketStatus {
    return this.status;
  }

  public subscribe(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }
}

export const wsService = new WebSocketService();
