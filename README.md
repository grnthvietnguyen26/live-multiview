# Live Multiview

Watch several live streams on one page. The share link carries the room. Nothing is stored on the server, and there is no admin account.

```bash
python3 server.py
```

Open http://127.0.0.1:8770/

Viewer counts stay unknown until you set `FFM_YT_API_KEY` and, for Twitch, `FFM_TWITCH_CLIENT_ID` plus `FFM_TWITCH_CLIENT_SECRET`.
