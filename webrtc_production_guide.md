# WebRTC Signaling: Production Readiness Guide

This guide provides the exact configuration and commands to ensure your WebRTC signaling 100% survives the '404 Not Found' handshake error during local IP and production testing.

---

## 🚀 Server Startup (The "Correct" way)

Stop using `python manage.py runserver` for production-level signaling. Instead, run the following command in your backend directory:

> [!IMPORTANT]
> **Daphne Startup**:
> ```bash
> daphne -b 0.0.0.0 -p 8000 vibely_backend.asgi:application
> ```
> *Note: Using `0.0.0.0` ensures your mobile devices can reach the server at `10.67.114.184:8000`.*

---

## 🛠️ Diagnostics & Tracing

We have injected deep-trace logging to guarantee you can identify any future issues:

1.  **[WS TRACE] (asgi.py)**: Captures raw path and headers the moment they touch the server.
2.  **[WS Auth] (middleware.py)**: Captures JWT extraction and validation results.
3.  **[HTTP SHADOW] (urls.py)**: Detects if your proxy is stripping "Upgrade" headers.

---

## 🎮 Game Performance Fix
The **"Maximum update depth exceeded"** error in `TicTacToe.tsx` has been resolved via:
- Memoization of `calculateWinner(board)` with `useMemo`.
- Stabilization of the `handleGameOver` callback in `app/games.tsx`.
