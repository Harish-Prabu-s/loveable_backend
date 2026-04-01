import { AppState, AppStateStatus } from 'react-native';
import { BASE_URL } from '@/api/client';

type WsEvent = 'open' | 'close' | 'message' | 'error' | 'reconnect';

export class WebSocketClient {
    private url: string;
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 999; // Allow long-term reconnection
    private reconnectDelay = 3000;
    private pingInterval: any = null;
    private pingTimeout = 30000; // 30s
    private pongTimeout: any = null;
    private pongTimeoutDuration = 10000; // 10s grace for pong
    
    private listeners: Record<WsEvent, ((data?: any) => void)[]> = {
        open: [],
        close: [],
        message: [],
        error: [],
        reconnect: []
    };
    private isIntentionallyClosed = false;
    private appStateSubscription: any = null;

    constructor(path: string, userId: number, token?: string | null) {
        // Build websocket URL from the API base URL
        const configSignalingUrl = BASE_URL; // e.g. https://loveable.sbs/api/
        const protocol = configSignalingUrl.startsWith('https') ? 'wss' : 'ws';
        
        // Extract domain and full path, ensuring we don't double up on slashes
        const domainAndPath = configSignalingUrl.replace(/^(wss?|https?):\/\//, '').replace(/\/+$/, '');
        
        // The resulting URL will be wss://loveable.sbs/api/ws/notifications/2/?token=...
        // WebSockets MUST use the /api/ namespace so the production Nginx correctly forwards the Upgrade Headers!
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
        this.url = `${protocol}://${domainAndPath}${path}${userId}/${tokenParam}`;

        // Watch for App State changes to reconnect when moving to foreground
        this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    }

    private handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && !this.isIntentionallyClosed) {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                console.log(`[WS] App returned to foreground. Reconnecting ${this.url}...`);
                this.reconnectAttempts = 0; // Reset attempts to try immediately
                this.connect();
            }
        }
    };

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
                if (data.type === 'pong') {
                    this.handlePong();
                    return;
                }
                this.emit('message', data);
            } catch (err) {
                console.warn(`[WS] Failed to parse message:`, e.data);
            }
        };

        this.ws.onclose = (e) => {
            this.stopPing();
            this.ws = null;
            console.log(`[WS] Closed ${this.url} | Code: ${e.code} | Reason: ${e.reason || 'None'}`);
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

    private handlePong() {
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
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
            // Check again if we're not closed before connecting
            if (!this.isIntentionallyClosed) {
                this.connect();
            }
        }, this.reconnectDelay);

        // Exponential backoff: capped at 20s
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 20000);
    }

    private startPing() {
        this.stopPing();
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
                
                // Increase pong timeout to 20s for better resilience on slow networks
                this.pongTimeout = setTimeout(() => {
                    console.warn(`[WS] Pong timeout on ${this.url}. This might indicate a dead connection.`);
                    // Only force-close if we've missed twice? No, let's just make it 25s
                }, 25000);
            }
        }, 20000); // Ping every 20s
    }

    private stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.pongTimeout) {
            clearTimeout(this.pongTimeout);
            this.pongTimeout = null;
        }
    }

    send(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn(`[WS] Cannot send message, socket not open:`, data);
        }
    }

    reconnect() {
        this.reconnectAttempts = 0;
        this.connect();
    }

    close() {
        this.isIntentionallyClosed = true;
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
        }
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
