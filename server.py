#!/usr/bin/env python3
"""Live Multiview.

The share link is the whole room. This server does not store rooms,
accounts, or visits. Viewer counts are optional and need API keys:

  FFM_YT_API_KEY
  FFM_TWITCH_CLIENT_ID
  FFM_TWITCH_CLIENT_SECRET
"""

import json
import os
import re
import traceback
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
HOST = os.environ.get('FFM_HOST', '127.0.0.1')
PORT = int(os.environ.get('FFM_PORT', '8770'))
YT_API_KEY = os.environ.get('FFM_YT_API_KEY', '').strip()
TWITCH_CLIENT_ID = os.environ.get('FFM_TWITCH_CLIENT_ID', '').strip()
TWITCH_CLIENT_SECRET = os.environ.get('FFM_TWITCH_CLIENT_SECRET', '').strip()
STATIC = {
    '/': 'index.html',
    '/index.html': 'index.html',
    '/app.css': 'app.css',
    '/app.js': 'app.js',
}
MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
}
viewership_cache = {}
twitch_token = {'value': None, 'exp': 0}


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def now():
    return datetime.now(timezone.utc)


def http_json(url, headers=None, data=None, timeout=8):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as err:
        detail = err.read().decode('utf-8', 'replace')[:300]
        raise ApiError(502, f'Upstream {err.code}: {detail}')
    except urllib.error.URLError as err:
        raise ApiError(502, f'Upstream unreachable: {err.reason}')


def youtube_viewers(ids):
    if not ids:
        return []
    if not YT_API_KEY:
        return [{'platform': 'youtube', 'id': vid, 'viewers': None, 'title': None, 'status': 'unknown'} for vid in ids]
    now_ts = now().timestamp()
    fresh = []
    missing = []
    for vid in ids:
        cached = viewership_cache.get(('youtube', vid))
        if cached and cached[0] > now_ts:
            fresh.append(cached[1])
        else:
            missing.append(vid)
    if missing:
        query = urllib.parse.urlencode({
            'part': 'liveStreamingDetails,snippet',
            'id': ','.join(missing[:50]),
            'key': YT_API_KEY,
        })
        try:
            payload = http_json('https://www.googleapis.com/youtube/v3/videos?' + query)
        except ApiError:
            payload = {'items': []}
            for vid in missing:
                row = {'platform': 'youtube', 'id': vid, 'viewers': None, 'title': None, 'status': 'unknown'}
                viewership_cache[('youtube', vid)] = (now_ts + 30, row)
                fresh.append(row)
            missing = []
        by_id = {item.get('id'): item for item in payload.get('items') or []}
        for vid in missing:
            item = by_id.get(vid) or {}
            details = item.get('liveStreamingDetails') or {}
            snippet = item.get('snippet') or {}
            broadcast = str(snippet.get('liveBroadcastContent') or '').lower()
            viewers = details.get('concurrentViewers')
            if viewers is not None:
                try:
                    viewers = int(viewers)
                    status = 'live'
                except (TypeError, ValueError):
                    viewers = None
                    status = 'unknown'
            elif broadcast == 'upcoming':
                viewers = None
                status = 'upcoming'
            elif broadcast == 'live':
                viewers = None
                status = 'unknown'
            elif item:
                viewers = None
                status = 'offline'
            else:
                viewers = None
                status = 'unknown'
            row = {
                'platform': 'youtube',
                'id': vid,
                'viewers': viewers,
                'title': snippet.get('title'),
                'status': status,
            }
            viewership_cache[('youtube', vid)] = (now_ts + 45, row)
            fresh.append(row)
    order = {vid: i for i, vid in enumerate(ids)}
    fresh.sort(key=lambda row: order.get(row['id'], 0))
    return fresh


def twitch_app_token():
    if not TWITCH_CLIENT_ID or not TWITCH_CLIENT_SECRET:
        return None
    if twitch_token['value'] and twitch_token['exp'] > now().timestamp() + 60:
        return twitch_token['value']
    body = urllib.parse.urlencode({
        'client_id': TWITCH_CLIENT_ID,
        'client_secret': TWITCH_CLIENT_SECRET,
        'grant_type': 'client_credentials',
    }).encode('utf-8')
    try:
        payload = http_json('https://id.twitch.tv/oauth2/token', data=body)
    except ApiError:
        return None
    twitch_token['value'] = payload.get('access_token')
    twitch_token['exp'] = now().timestamp() + int(payload.get('expires_in') or 0)
    return twitch_token['value']


def twitch_viewers(logins):
    if not logins:
        return []
    token = twitch_app_token()
    if not token:
        return [{'platform': 'twitch', 'id': login, 'viewers': None, 'title': None, 'status': 'unknown'} for login in logins]
    now_ts = now().timestamp()
    fresh = []
    missing = []
    for login in logins:
        cached = viewership_cache.get(('twitch', login))
        if cached and cached[0] > now_ts:
            fresh.append(cached[1])
        else:
            missing.append(login)
    if missing:
        query = urllib.parse.urlencode([('user_login', login) for login in missing[:100]])
        try:
            payload = http_json(
                'https://api.twitch.tv/helix/streams?' + query,
                headers={'Client-Id': TWITCH_CLIENT_ID, 'Authorization': 'Bearer ' + token},
            )
        except ApiError:
            payload = {'data': []}
        by_login = {str(item.get('user_login') or '').lower(): item for item in payload.get('data') or []}
        for login in missing:
            item = by_login.get(login)
            if not item:
                row = {'platform': 'twitch', 'id': login, 'viewers': None, 'title': None, 'status': 'offline'}
            else:
                row = {
                    'platform': 'twitch',
                    'id': login,
                    'viewers': int(item.get('viewer_count') or 0),
                    'title': item.get('title'),
                    'status': 'live',
                }
            viewership_cache[('twitch', login)] = (now_ts + 60, row)
            fresh.append(row)
    order = {login: i for i, login in enumerate(logins)}
    fresh.sort(key=lambda row: order.get(row['id'], 0))
    return fresh


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, fmt, *args):
        print(f'{self.address_string()} {fmt % args}')

    def do_GET(self):
        try:
            path = urlparse(self.path).path
            if path == '/api/viewership':
                self.viewership()
            else:
                self.static(path)
        except Exception:
            traceback.print_exc()
            self.json(500, {'error': 'Server error'})

    def viewership(self):
        query = parse_qs(urlparse(self.path).query)
        youtube_ids = []
        for raw in query.get('youtube', []):
            for piece in raw.split(','):
                vid = re.sub(r'[^A-Za-z0-9_-]', '', piece)[:32]
                if len(vid) >= 6 and vid not in youtube_ids:
                    youtube_ids.append(vid)
        twitch_ids = []
        for raw in query.get('twitch', []):
            for piece in raw.split(','):
                login = re.sub(r'[^a-z0-9_]', '', piece.lower())[:40]
                if login and login not in twitch_ids:
                    twitch_ids.append(login)
        items = youtube_viewers(youtube_ids) + twitch_viewers(twitch_ids)
        known = [item['viewers'] for item in items if isinstance(item.get('viewers'), int)]
        self.json(200, {
            'items': items,
            'knownTotal': sum(known) if known else None,
            'providers': {
                'youtube': bool(YT_API_KEY),
                'twitch': bool(TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET),
            },
        })

    def static(self, path):
        if path.startswith('/w/'):
            name = 'index.html'
        else:
            name = STATIC.get(path)
        if not name:
            self.send_error(404)
            return
        file_path = ROOT / name
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', MIME.get(file_path.suffix, 'application/octet-stream'))
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def json(self, status, obj):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f'Live Multiview on http://{HOST}:{PORT}/')
    server.serve_forever()


if __name__ == '__main__':
    main()
