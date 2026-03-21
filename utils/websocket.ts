import Constants from 'expo-constants';

type WsEvent = 'open' | 'close' | 'message' | 'error' | 'reconnect';

export class WebSocketClient {
    private url: string;
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000; // Start with 3s
    private pingInterval: any = null;
    private pingTimeout = 30000; // 30s
    private listeners: Record<WsEvent, ((data?: any) => void)[]> = {
        open: [],
        close: [],
        message: [],
        error: [],
        reconnect: []
    };
    private isIntentionallyClosed = false;

    constructor(path: string, userId: number) {
        const configSignalingUrl = Constants.expoConfig?.extra?.signalingUrl || 'ws://localhost:8000';
        // Handle secure websocket if needed (ngrok etc)
        const protocol = configSignalingUrl.startsWith('https') ? 'wss' : 
                         configSignalingUrl.startsWith('http') ? 'ws' : 'ws';
        const cleanUrl = configSignalingUrl.replace(/^https?:\/\//, '');
        this.url = `${protocol}://${cleanUrl}${path}${userId}/`;
    }

    connect() {
        if (this.ws) {
            this.ws.close();
        }

        this.isIntentionallyClosed = false;
        console.log(`[WS] Connecting to ${this.url}...`);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log(`[WS] Connected to ${this.url}`);
            this.reconnectAttempts = 0;
            this.reconnectDelay = 3000;
            this.startPing();
            this.emit('open');
        };

        this.ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'pong') return;
                this.emit('message', data);
            } catch (err) {
                console.warn(`[WS] Failed to parse message:`, e.data);
            }
        };

        this.ws.onclose = (e) => {
            this.stopPing();
            this.ws = null;
            this.emit('close', e);

            if (!this.isIntentionallyClosed) {
                this.attemptReconnect();
            }
        };

        this.ws.onerror = (err) => {
            console.warn(`[WS] Error on ${this.url}:`, err);
            this.emit('error', err);
        };
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`[WS] Max reconnect attempts reached for ${this.url}`);
            return;
        }

        this.reconnectAttempts++;
        console.log(`[WS] Reconnecting to ${this.url} in ${this.reconnectDelay}ms (Attempt ${this.reconnectAttempts})...`);
        this.emit('reconnect', { attempt: this.reconnectAttempts, delay: this.reconnectDelay });

        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);

        // Exponential backoff: 3s, 6s, 10s (max)
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 10000);
    }

    private startPing() {
        this.stopPing();
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, this.pingTimeout);
    }

    private stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    send(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn(`[WS] Cannot send message, socket not open:`, data);
        }
    }

    close() {
        this.isIntentionallyClosed = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.stopPing();
    }

    on(event: WsEvent, callback: (data?: any) => void) {
        this.listeners[event].push(callback);
    }

    off(event: WsEvent, callback: (data?: any) => void) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    private emit(event: WsEvent, data?: any) {
        this.listeners[event].forEach(cb => cb(data));
    }
}
