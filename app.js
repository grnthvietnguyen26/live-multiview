(() => {
  const MAX_LIBRARY = 30;
  const MAX_ACTIVE = 9;
  const state = {
    page: 'create',
    theme: localStorage.getItem('gm_theme') === 'light' ? 'light' : 'dark',
    draftName: '',
    draft: [],
    notice: '',
    link: null,
    layout: 'focus',
    split: 60,
    focus: 0,
    hear: 'off',
    viewersOpen: false,
    viewerMap: {},
    providers: { youtube: false, twitch: false },
    pickerOpen: false,
    offsetText: '',
    quality: 'auto',
    syncKind: '',
    syncCounts: null,
    arrange: false,
    canEdit: false,
    saveKind: '',
    saveError: '',
    lang: localStorage.getItem('gm_lang') === 'en' ? 'en' : 'vi',
    poll: null,
    me: null,
  };
  const ytPlayers = new Map();
  const twPlayers = new Map();
  const mounting = new Set();
  let enforceTimer = null;
  let ytReady = null;

  const I18N = {
    vi: {
      createLink: 'Tạo link', admin: 'Admin', guest: 'Chưa đăng nhập', light: 'Sáng', dark: 'Tối',
      createTitle: 'Tạo một màn hình xem chung',
      createLede: 'Thêm tối đa {max} luồng. Chỉ {play} luồng được phát cùng lúc. Link mang theo cả bộ này. Máy chủ không lưu gì.',
      name: 'Tên', namePh: 'Ví dụ: Day Dream Day 1',
      pasteLabel: 'Dán link YouTube, Twitch, Facebook hoặc TikTok. Mỗi dòng một link.',
      addList: 'Thêm vào danh sách', draftMeta: '{n}/{max} trong link · {play}/{active} đang phát',
      emptyDraft: 'Chưa có luồng.', createShare: 'Tạo link chia sẻ', remove: 'Bỏ',
      skipBad: 'Bỏ qua link không đọc được: {url}',
      tooManyPlay: 'Chỉ phát {n} luồng cùng lúc. Bỏ chọn một luồng khác trước.',
      needOne: 'Thêm ít nhất một luồng.', missingLink: 'Không thấy link',
      playingMeta: '{play} đang phát · {n} trong link', pick: 'Chọn luồng', copy: 'Sao chép link', copied: 'Đã chép',
      viewers: 'Người xem', unknown: 'Không rõ', offline: 'Không live', upcoming: 'Sắp live',
      playing: 'Đang phát', inLink: 'Trong link', layout: 'Layout', focus: 'Focus', cols2: '2 cột', cols3: '3 cột',
      arrange: 'Sửa vị trí', saveLayout: 'Lưu layout', dragHint: 'Kéo thanh tiêu đề',
      mainSize: 'Ô lớn', wide: 'Rộng', wideHint: 'Chiếm hai cột',
      unsaved: 'Chưa lưu', saving: 'Đang lưu…', saved: 'Đã lưu vào link',
      sound: 'Sound', hearAll: 'Bật tất cả', muteAll: 'Tắt tất cả',
      muted: 'Đang tắt tiếng', hearingAll: 'Đang nghe tất cả', hearing: 'Đang nghe: {title}',
      time: 'Thời gian', toNow: 'Đến hiện tại', fromStart: 'Từ đầu', seek: 'Tua',
      quality: 'Chất lượng', qualityAuto: 'Tự động', colStatus: 'Trạng thái',
      syncMoved: '{n} luồng đã tua', syncEnded: '{n} luồng dừng ở cuối', syncSkipped: '{n} luồng không tua được',
      syncNone: 'Không có luồng để tua', syncBad: 'Nhập 300, 5p hoặc 05:00',
      drawerTitle: 'Người xem từng luồng', colStream: 'Luồng', colPlatform: 'Nền tảng',
      drawerNote: 'Sắp live chưa có số. Không rõ không bị tính là 0.',
      tiktokBody: 'TikTok LIVE không nhúng được.', tiktokOpen: 'Mở TikTok',
      setupTitle: 'Tạo admin', setupLede: 'Chỉ tạo một lần, khi hệ thống chưa có tài khoản.',
      username: 'Tên đăng nhập', password: 'Mật khẩu',
      loginLede: 'Đăng nhập để xem lịch sử link. Người xem thường không thấy bảng này.',
      login: 'Đăng nhập', history: 'Lịch sử link', logout: 'Thoát',
      colName: 'Tên', colLink: 'Link', colCreator: 'Người tạo', colOpens: 'Lượt mở', colUniques: 'Người khác nhau', colCreated: 'Lúc tạo',
      noLinks: 'Chưa có link.', platforms: 'Nền tảng',
      ytNote: 'YouTube phát được. Số người xem cần FFM_YT_API_KEY trên server. Hiện {state}.',
      ytOn: 'đã có key', ytOff: 'chưa có key, nên hiện Không rõ',
      twNote: 'Twitch phát được. Số người xem cần FFM_TWITCH_CLIENT_ID và FFM_TWITCH_CLIENT_SECRET. Hiện {state}.',
      twOn: 'đã có', twOff: 'chưa có',
      fbNote: 'Facebook nhúng video công khai. Số người xem thường cần quyền của Page, nên mặc định là Không rõ.',
      ttNote: 'TikTok LIVE không có trình phát nhúng công khai. Ô đó chỉ là lối mở sang TikTok.',
      changePw: 'Đổi mật khẩu admin', currentPw: 'Mật khẩu hiện tại', newPw: 'Mật khẩu mới', changePwBtn: 'Đổi mật khẩu', pwDone: 'Đã đổi mật khẩu.',
      requestFailed: 'Request failed',
    },
    en: {
      createLink: 'Create link', admin: 'Admin', guest: 'Not signed in', light: 'Light', dark: 'Dark',
      createTitle: 'Create a shared screen',
      createLede: 'Add up to {max} streams. Only {play} play at once. The link carries the whole set. The server stores nothing.',
      name: 'Name', namePh: 'e.g. Day Dream Day 1',
      pasteLabel: 'Paste YouTube, Twitch, Facebook, or TikTok links. One per line.',
      addList: 'Add to list', draftMeta: '{n}/{max} in the link · {play}/{active} playing',
      emptyDraft: 'No streams yet.', createShare: 'Create share link', remove: 'Remove',
      skipBad: 'Skipped a link that could not be read: {url}',
      tooManyPlay: 'Only {n} streams can play at once. Turn another one off first.',
      needOne: 'Add at least one stream.', missingLink: 'Link not found',
      playingMeta: '{play} playing · {n} in the link', pick: 'Choose streams', copy: 'Copy link', copied: 'Copied',
      viewers: 'Viewers', unknown: 'Unknown', offline: 'Offline', upcoming: 'Upcoming',
      playing: 'Playing', inLink: 'In the link', layout: 'Layout', focus: 'Focus', cols2: '2 col', cols3: '3 col',
      arrange: 'Rearrange', saveLayout: 'Save layout', dragHint: 'Drag the title bar',
      mainSize: 'Main', wide: 'Wide', wideHint: 'Span two columns',
      unsaved: 'Not saved', saving: 'Saving…', saved: 'Saved to this link',
      sound: 'Sound', hearAll: 'Unmute all', muteAll: 'Mute all',
      muted: 'Muted', hearingAll: 'Hearing all', hearing: 'Hearing: {title}',
      time: 'Time', toNow: 'To now', fromStart: 'From start', seek: 'Seek',
      quality: 'Quality', qualityAuto: 'Auto', colStatus: 'Status',
      syncMoved: '{n} seeked', syncEnded: '{n} stopped at the end', syncSkipped: '{n} could not be seeked',
      syncNone: 'Nothing to seek', syncBad: 'Enter 300, 5p, or 05:00',
      drawerTitle: 'Viewers by stream', colStream: 'Stream', colPlatform: 'Platform',
      drawerNote: 'Upcoming streams have no count. Unknown is not counted as 0.',
      tiktokBody: 'TikTok LIVE cannot be embedded.', tiktokOpen: 'Open TikTok',
      setupTitle: 'Create admin', setupLede: 'This only happens once, before any account exists.',
      username: 'Username', password: 'Password',
      loginLede: 'Sign in to see link history. Viewers do not see this page.',
      login: 'Sign in', history: 'Link history', logout: 'Log out',
      colName: 'Name', colLink: 'Link', colCreator: 'Creator', colOpens: 'Opens', colUniques: 'Unique people', colCreated: 'Created',
      noLinks: 'No links yet.', platforms: 'Platforms',
      ytNote: 'YouTube can play. Viewer counts need FFM_YT_API_KEY on the server. Right now: {state}.',
      ytOn: 'a key is set', ytOff: 'no key, so counts show as Unknown',
      twNote: 'Twitch can play. Viewer counts need FFM_TWITCH_CLIENT_ID and FFM_TWITCH_CLIENT_SECRET. Right now: {state}.',
      twOn: 'set', twOff: 'not set',
      fbNote: 'Facebook embeds public videos. Viewer counts usually need Page permission, so they stay Unknown.',
      ttNote: 'TikTok LIVE has no public embed player. That cell only opens TikTok.',
      changePw: 'Change admin password', currentPw: 'Current password', newPw: 'New password', changePwBtn: 'Change password', pwDone: 'Password changed.',
      requestFailed: 'Request failed',
    },
  };
  const VI_ERR = {
    'Link not found': 'Không thấy link',
    'Add at least one stream': 'Thêm ít nhất một luồng.',
    'Name is at most 80 characters': 'Tên tối đa 80 ký tự.',
    'At most 30 streams': 'Tối đa 30 luồng.',
    'At most 9 streams can play at once': 'Chỉ phát 9 luồng cùng lúc.',
    'Each stream must be an object': 'Mỗi luồng phải là một object.',
    'Invalid username or password': 'Sai tên đăng nhập hoặc mật khẩu.',
    'Log in first': 'Đăng nhập trước đã.',
    'Admin only': 'Chỉ admin.',
    'Current password is wrong': 'Mật khẩu hiện tại không đúng.',
    'Setup is already done': 'Đã tạo admin rồi.',
    'Password must be at least 6 characters': 'Mật khẩu ít nhất 6 ký tự.',
    'Request failed': 'Không gọi được máy chủ.',
    'Chỉ người tạo link mới lưu được layout': 'Chỉ người tạo link mới lưu được layout',
  };
  const EN_ERR = {
    'Chỉ người tạo link mới lưu được layout': 'Only the person who created this link can save the layout',
  };

  function t(key, vars) {
    const pack = I18N[state.lang] || I18N.vi;
    let text = pack[key] || I18N.vi[key] || key;
    if (vars) {
      Object.keys(vars).forEach((name) => {
        text = text.split('{' + name + '}').join(String(vars[name]));
      });
    }
    return text;
  }

  function explain(message) {
    const text = String(message || '');
    const table = state.lang === 'en' ? EN_ERR : VI_ERR;
    if (table[text]) return table[text];
    if (state.lang === 'vi' && text.indexOf('Unsupported link: ') === 0) {
      return 'Link không hỗ trợ: ' + text.slice('Unsupported link: '.length);
    }
    return text;
  }

  function clampSplit(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 60;
    return Math.max(48, Math.min(75, Math.round(number)));
  }

  function toggleSpan(index) {
    const stream = playingAt(index);
    if (!stream) return;
    stream.span = stream.span === 2 ? 1 : 2;
    const card = document.querySelector(`[data-card="${index}"]`);
    if (card) card.dataset.span = String(stream.span);
    const button = card && card.querySelector('.wide-btn');
    if (button) button.classList.toggle('is-on', stream.span === 2);
    state.saveKind = 'dirty';
    const note = $('#saveStatus');
    if (note) note.textContent = saveText();
  }

  function saveText() {
    if (!state.canEdit) return state.saveKind === 'error' ? state.saveError : '';
    if (state.saveKind === 'dirty') return t('unsaved');
    if (state.saveKind === 'saving') return t('saving');
    if (state.saveKind === 'saved') return t('saved');
    if (state.saveKind === 'error') return state.saveError;
    return '';
  }

  function syncText() {
    if (state.syncKind === 'bad') return t('syncBad');
    if (state.syncKind === 'none') return t('syncNone');
    if (state.syncKind !== 'done' || !state.syncCounts) return '';
    const bits = [];
    if (state.syncCounts.moved) bits.push(t('syncMoved', { n: state.syncCounts.moved }));
    if (state.syncCounts.ended) bits.push(t('syncEnded', { n: state.syncCounts.ended }));
    if (state.syncCounts.skipped) bits.push(t('syncSkipped', { n: state.syncCounts.skipped }));
    return bits.join(' · ') || t('syncNone');
  }

  function langButtons() {
    return ['vi', 'en'].map((code) => (
      `<button class="btn${state.lang === code ? ' is-on' : ''}" data-lang="${code}" type="button">${code.toUpperCase()}</button>`
    )).join('');
  }

  const $ = (sel) => document.querySelector(sel);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

  function keyOf(stream) {
    return stream.platform + ':' + stream.externalId;
  }

  function formatCount(value) {
    if (typeof value !== 'number') return t('unknown');
    if (value >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(value);
  }

  function parseSource(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;
    let url;
    try {
      url = new URL(text.includes('://') ? text : 'https://' + text);
    } catch (err) {
      return null;
    }
    let host = url.hostname.toLowerCase().replace(/^www\./, '');
    const parts = url.pathname.split('/').filter(Boolean);
    if (['youtu.be', 'youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      let id = '';
      if (host === 'youtu.be') id = parts[0] || '';
      else if (parts[0] === 'watch') id = url.searchParams.get('v') || '';
      else if (['live', 'embed', 'shorts'].includes(parts[0])) id = parts[1] || '';
      id = id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
      if (id.length < 6) return null;
      return { platform: 'youtube', url: text, externalId: id, label: '', active: false };
    }
    if (host === 'twitch.tv' || host === 'm.twitch.tv') {
      const channel = (parts[0] || '').toLowerCase();
      if (!channel || ['videos', 'directory', 'settings', 'subscriptions'].includes(channel)) return null;
      return { platform: 'twitch', url: text, externalId: channel, label: '', active: false };
    }
    if (['facebook.com', 'm.facebook.com', 'fb.watch', 'fb.com'].includes(host)) {
      return { platform: 'facebook', url: text, externalId: text.slice(0, 180), label: '', active: false };
    }
    if (['tiktok.com', 'm.tiktok.com', 'vm.tiktok.com'].includes(host)) {
      return { platform: 'tiktok', url: text, externalId: (url.pathname || text).slice(0, 180), label: '', active: false };
    }
    return null;
  }

  async function api(path, options) {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(explain(data.error || t('requestFailed')));
    return data;
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('gm_theme', theme);
  }

  function applyLang(lang) {
    state.lang = lang === 'en' ? 'en' : 'vi';
    document.documentElement.lang = state.lang;
    localStorage.setItem('gm_lang', state.lang);
  }

  const PLATFORM_CODE = { youtube: 'y', twitch: 't', facebook: 'f', tiktok: 'k' };
  const CODE_PLATFORM = { y: 'youtube', t: 'twitch', f: 'facebook', k: 'tiktok' };

  function bytesToToken(bytes) {
    let bin = '';
    bytes.forEach((byte) => { bin += String.fromCharCode(byte); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function tokenToBytes(token) {
    const pad = token.length % 4 === 0 ? '' : '='.repeat(4 - (token.length % 4));
    const bin = atob(token.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function streamUrl(platform, externalId, url) {
    if (platform === 'youtube') return 'https://www.youtube.com/watch?v=' + externalId;
    if (platform === 'twitch') return 'https://www.twitch.tv/' + externalId;
    return url || externalId;
  }

  function encodeRoom(name, payload) {
    const body = {
      n: String(name || 'Multiview').slice(0, 80),
      l: payload.layout === '2' || payload.layout === '3' ? payload.layout : 'focus',
      s: clampSplit(payload.split),
      v: (payload.streams || []).slice(0, MAX_LIBRARY).map((stream) => {
        const row = [
          PLATFORM_CODE[stream.platform] || 'y',
          String(stream.externalId || '').slice(0, 180),
          String(stream.label || '').slice(0, 80),
          stream.active ? 1 : 0,
          stream.span === 2 ? 2 : 1,
        ];
        if (stream.platform === 'facebook' || stream.platform === 'tiktok') {
          row.push(String(stream.url || '').slice(0, 500));
        }
        return row;
      }),
    };
    return bytesToToken(new TextEncoder().encode(JSON.stringify(body)));
  }

  function decodeRoom(token) {
    try {
      const body = JSON.parse(new TextDecoder().decode(tokenToBytes(token)));
      if (!body || !Array.isArray(body.v) || !body.v.length) return null;
      const seen = new Set();
      const streams = [];
      body.v.slice(0, MAX_LIBRARY).forEach((row) => {
        if (!Array.isArray(row)) return;
        const platform = CODE_PLATFORM[row[0]];
        const externalId = String(row[1] || '').slice(0, 180);
        if (!platform || !externalId) return;
        const key = platform + ':' + externalId;
        if (seen.has(key)) return;
        seen.add(key);
        streams.push({
          platform,
          externalId,
          label: String(row[2] || '').slice(0, 80),
          active: !!row[3],
          span: row[4] === 2 ? 2 : 1,
          url: streamUrl(platform, externalId, row[5]),
        });
      });
      if (!streams.length) return null;
      const active = streams.filter((stream) => stream.active);
      if (active.length > MAX_ACTIVE) {
        let left = MAX_ACTIVE;
        streams.forEach((stream) => {
          stream.active = stream.active && left > 0;
          if (stream.active) left -= 1;
        });
      } else if (!active.length) {
        streams.slice(0, MAX_ACTIVE).forEach((stream) => { stream.active = true; });
      }
      return {
        name: String(body.n || 'Multiview').slice(0, 80) || 'Multiview',
        layout: body.l === '2' || body.l === '3' ? body.l : 'focus',
        split: clampSplit(body.s),
        streams,
      };
    } catch (err) {
      return null;
    }
  }

  function navItems() {
    const items = [
      ['/', t('createLink'), state.page === 'create'],
    ];
    return items.map(([href, label, active]) => (
      `<a class="nav-item${active ? ' is-active' : ''}" href="${href}" data-nav="${href}">${label}</a>`
    )).join('');
  }

  function bindChrome() {
    const themeBtn = $('#themeBtn');
    if (themeBtn) {
      themeBtn.onclick = () => {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
        if (state.page === 'watch' && state.link) {
          themeBtn.textContent = state.theme === 'dark' ? t('light') : t('dark');
          return;
        }
        route();
      };
    }
    document.querySelectorAll('[data-nav]').forEach((link) => {
      link.onclick = (event) => {
        event.preventDefault();
        history.pushState({}, '', link.getAttribute('href'));
        route();
      };
    });
    document.querySelectorAll('.sidebar-brand').forEach((link) => {
      link.onclick = (event) => {
        event.preventDefault();
        history.pushState({}, '', '/');
        route();
      };
    });
    document.querySelectorAll('[data-lang]').forEach((button) => {
      button.onclick = () => {
        if (button.dataset.lang === state.lang) return;
        applyLang(button.dataset.lang);
        if (state.page === 'watch' && state.link) {
          paintWatchCopy();
          return;
        }
        showCreate();
      };
    });
  }

  function shell(main, mode) {
    const themeLabel = state.theme === 'dark' ? t('light') : t('dark');
    const brand = `
      <a class="sidebar-brand" href="/">
        <strong>Live Multiview</strong>
      </a>
    `;
    if (mode === 'watch') {
      $('#app').innerHTML = `
        <div class="watch-shell">
          <header class="watch-bar">
            ${brand}
            <nav class="watch-nav">${navItems()}</nav>
            <div class="spacer" style="flex:1"></div>
            ${langButtons()}
            <button class="btn" id="themeBtn" type="button">${themeLabel}</button>
          </header>
          ${main}
        </div>
      `;
    } else {
      $('#app').innerHTML = `
        <div class="app-shell">
          <aside class="sidebar">
            ${brand}
            <nav class="sidebar-nav">${navItems()}</nav>
            <div class="sidebar-footer">
              ${langButtons()}
              <button class="btn" id="themeBtn" type="button">${themeLabel}</button>
            </div>
          </aside>
          <div class="app-main">${main}</div>
        </div>
      `;
    }
    bindChrome();
  }

  function activeStreams(streams) {
    return (streams || []).filter((stream) => stream.active).slice(0, MAX_ACTIVE);
  }

  function showCreate() {
    stopRoom();
    state.page = 'create';
    const rows = state.draft.map((stream, index) => `
      <div class="stream-row">
        <input type="checkbox" data-check="${index}" ${stream.active ? 'checked' : ''}>
        <span class="badge">${esc(stream.platform)}</span>
        <span>${esc(stream.label || stream.externalId)}</span>
        <button class="btn" type="button" data-remove="${index}">${t('remove')}</button>
      </div>
    `).join('');
    const playing = state.draft.filter((stream) => stream.active).length;
    shell(`
      <main class="page">
        <h1 class="page-title">${t('createTitle')}</h1>
        <p class="lede">${t('createLede', { max: MAX_LIBRARY, play: MAX_ACTIVE })}</p>
        <div class="panel stack">
          <label class="field">${t('name')}
            <input id="linkName" type="text" maxlength="80" value="${esc(state.draftName)}" placeholder="${esc(t('namePh'))}">
          </label>
          <label class="field">${t('pasteLabel')}
            <textarea id="pasteBox" placeholder="https://youtu.be/..."></textarea>
          </label>
          <div class="row">
            <button class="btn btn-primary" id="addBtn" type="button">${t('addList')}</button>
            <span class="meta">${t('draftMeta', { n: state.draft.length, max: MAX_LIBRARY, play: playing, active: MAX_ACTIVE })}</span>
          </div>
          ${state.notice ? `<p class="error">${esc(state.notice)}</p>` : ''}
          <div class="stream-list">${rows || `<p class="meta">${t('emptyDraft')}</p>`}</div>
          <div class="row">
            <button class="btn btn-primary" id="createBtn" type="button">${t('createShare')}</button>
          </div>
        </div>
      </main>
    `);
    $('#addBtn').onclick = addDraft;
    $('#createBtn').onclick = createLink;
    document.querySelectorAll('[data-check]').forEach((box) => {
      box.onchange = () => toggleDraft(Number(box.dataset.check), box.checked);
    });
    document.querySelectorAll('[data-remove]').forEach((button) => {
      button.onclick = () => {
        state.draft.splice(Number(button.dataset.remove), 1);
        showCreate();
      };
    });
  }

  function addDraft() {
    const name = $('#linkName').value.trim();
    state.draftName = name;
    const lines = $('#pasteBox').value.split(/\s+/).map((line) => line.trim()).filter(Boolean);
    const rejected = [];
    lines.forEach((line) => {
      const source = parseSource(line);
      if (!source) {
        rejected.push(line);
        return;
      }
      if (state.draft.some((item) => keyOf(item) === keyOf(source))) return;
      if (state.draft.length >= MAX_LIBRARY) return;
      const playing = state.draft.filter((item) => item.active).length;
      source.active = playing < MAX_ACTIVE;
      state.draft.push(source);
    });
    state.notice = rejected.length ? t('skipBad', { url: rejected[0] }) : '';
    showCreate();
  }

  function toggleDraft(index, checked) {
    state.draftName = $('#linkName').value.trim();
    const playing = state.draft.filter((item) => item.active).length;
    if (checked && !state.draft[index].active && playing >= MAX_ACTIVE) {
      state.notice = t('tooManyPlay', { n: MAX_ACTIVE });
      showCreate();
      return;
    }
    state.draft[index].active = checked;
    state.notice = '';
    showCreate();
  }

  function createLink() {
    state.draftName = $('#linkName').value.trim();
    state.notice = '';
    if (!state.draft.length) {
      state.notice = t('needOne');
      showCreate();
      return;
    }
    const token = encodeRoom(state.draftName, { layout: 'focus', split: 60, streams: state.draft });
    history.pushState({}, '', '/w/' + token);
    route();
  }

  function stopRoom() {
    if (state.poll) clearInterval(state.poll);
    state.poll = null;
    if (enforceTimer) clearInterval(enforceTimer);
    enforceTimer = null;
    ytPlayers.forEach((player) => {
      try { player.destroy(); } catch (err) { /* player already gone */ }
    });
    ytPlayers.clear();
    twPlayers.clear();
    mounting.clear();
  }

  function streamTitle(stream) {
    const item = state.viewerMap[keyOf(stream)];
    if (stream.label) return stream.label;
    if (item && item.title) return item.title;
    if (stream.platform === 'facebook' || stream.platform === 'tiktok') {
      try {
        const url = new URL(stream.url.includes('://') ? stream.url : 'https://' + stream.url);
        const bits = url.pathname.split('/').filter(Boolean).slice(-2);
        return bits.join('/') || stream.platform;
      } catch (err) {
        return stream.platform;
      }
    }
    return stream.externalId;
  }

  function isLive(stream) {
    const item = state.viewerMap[keyOf(stream)];
    return !!(item && item.status === 'live');
  }

  function platformBadge(stream) {
    return `<span class="badge${isLive(stream) ? ' is-live' : ''}">${esc(stream.platform)}</span>`;
  }

  function paintViewers() {
    if (state.page !== 'watch' || !state.link) return;
    const streams = state.link.payload.streams;
    const total = knownTotal(streams);
    const button = document.querySelector('#viewTotal strong');
    if (button) button.textContent = total == null ? t('unknown') : formatCount(total);
    document.querySelectorAll('[data-count]').forEach((node) => {
      const stream = streams.find((item) => keyOf(item) === node.dataset.count);
      if (stream) node.textContent = viewerText(stream);
    });
    const body = document.querySelector('#viewerPanel tbody');
    if (body) {
      body.innerHTML = streams.map((stream) => `
        <tr>
          <td>${esc(streamTitle(stream))}</td>
          <td>${platformBadge(stream)}</td>
          <td>${esc(viewerText(stream))}</td>
          <td>${stream.active ? t('playing') : t('inLink')}</td>
        </tr>
      `).join('');
    }
    document.querySelectorAll('.player').forEach((card) => {
      const stream = playingAt(Number(card.dataset.card));
      if (!stream) return;
      const title = card.querySelector('.cap b');
      if (title && !stream.label) title.textContent = streamTitle(stream);
      const badge = card.querySelector('.cap .badge');
      if (badge) badge.classList.toggle('is-live', isLive(stream));
    });
  }

  function viewerText(stream) {
    if (stream.platform === 'facebook' || stream.platform === 'tiktok') return t('unknown');
    const item = state.viewerMap[keyOf(stream)];
    if (!item) return '…';
    if (item.status === 'offline') return t('offline');
    if (item.status === 'upcoming') return t('upcoming');
    return formatCount(item.viewers);
  }

  function knownTotal(streams) {
    let sum = 0;
    let any = false;
    streams.forEach((stream) => {
      const item = state.viewerMap[keyOf(stream)];
      if (item && typeof item.viewers === 'number') {
        sum += item.viewers;
        any = true;
      }
    });
    return any ? sum : null;
  }

  async function showWatch(slug) {
    stopRoom();
    state.page = 'watch';
    state.hear = 'off';
    state.focus = 0;
    state.viewersOpen = false;
    state.arrange = false;
    state.viewerMap = {};
    const room = decodeRoom(slug);
    if (!room) {
      shell(`<main class="page"><h1 class="page-title">${t('missingLink')}</h1><p class="lede">${esc(t('missingLink'))}</p></main>`);
      return;
    }
    state.link = { name: room.name, slug, payload: room };
    state.layout = room.layout;
    state.split = room.split;
    state.canEdit = false;
    const streams = state.link.payload.streams;
    const playing = activeStreams(streams);
    state.focus = Math.min(state.focus, Math.max(playing.length - 1, 0));
    renderWatch();
    await mountPlayers();
    await refreshViewers();
    state.poll = setInterval(refreshViewers, 60000);
  }

  function renderWatch() {
    const streams = state.link.payload.streams;
    const playing = activeStreams(streams);
    if (state.focus >= playing.length) state.focus = 0;
    const total = knownTotal(streams);
    const panelRows = streams.map((stream) => `
      <tr>
        <td>${esc(streamTitle(stream))}</td>
        <td>${platformBadge(stream)}</td>
        <td>${esc(viewerText(stream))}</td>
        <td>${stream.active ? t('playing') : t('inLink')}</td>
      </tr>
    `).join('');
    const pickerRows = streams.map((stream, index) => `
      <label class="stream-row">
        <input type="checkbox" data-pick="${index}" ${stream.active ? 'checked' : ''}>
        <span class="badge">${esc(stream.platform)}</span>
        <span>${esc(streamTitle(stream))}</span>
        <span></span>
      </label>
    `).join('');
    const audible = soundLabel(playing);
    shell(`
      <main class="watch-page">
        <div class="watch-head">
          <div>
            <h1 class="page-title">${esc(state.link.name)}</h1>
            <p class="meta" id="watchMeta">${t('playingMeta', { play: playing.length, n: streams.length })}</p>
          </div>
          <div class="head-actions">
            <button class="btn" id="pickerBtn" type="button" data-i18n="pick">${t('pick')}</button>
            <button class="btn" id="copyBtn" type="button" data-i18n="copy">${t('copy')}</button>
            <button class="view-total ${state.viewersOpen ? 'is-on' : ''}" id="viewTotal" type="button">
              <strong>${esc(total == null ? t('unknown') : formatCount(total))}</strong>
              <span data-i18n="viewers">${t('viewers')}</span>
            </button>
          </div>
        </div>
        <div class="toolbar">
          <section class="tool-group">
            <span class="tool-label" data-i18n="layout">${t('layout')}</span>
            <button class="btn ${state.layout === 'focus' ? 'is-on' : ''}" data-layout="focus" type="button" data-i18n="focus">${t('focus')}</button>
            <button class="btn ${state.layout === '2' ? 'is-on' : ''}" data-layout="2" type="button" data-i18n="cols2">${t('cols2')}</button>
            <button class="btn ${state.layout === '3' ? 'is-on' : ''}" data-layout="3" type="button" data-i18n="cols3">${t('cols3')}</button>
            <label class="split-label" id="splitWrap" ${state.layout === 'focus' ? '' : 'hidden'}>
              <span data-i18n="mainSize">${t('mainSize')}</span>
              <input id="splitRange" type="range" min="48" max="75" value="${state.split}">
              <span id="splitValue">${state.split}%</span>
            </label>
            <button class="btn ${state.arrange ? 'is-on' : ''}" id="arrangeBtn" type="button" data-i18n="arrange" ${state.layout === 'focus' ? 'hidden' : ''}>${t('arrange')}</button>
            ${state.canEdit ? `<button class="btn" id="saveLayoutBtn" type="button" data-i18n="saveLayout">${t('saveLayout')}</button>` : ''}
            <span class="meta" id="arrangeHint">${state.arrange ? t('dragHint') : ''}</span>
            <span class="meta" id="saveStatus">${esc(saveText())}</span>
          </section>
          <section class="tool-group">
            <span class="tool-label" data-i18n="sound">${t('sound')}</span>
            <button class="btn ${state.hear === 'all' ? 'is-on' : ''}" id="allBtn" type="button" data-i18n="hearAll">${t('hearAll')}</button>
            <button class="btn ${state.hear === 'off' ? 'is-on' : ''}" id="muteBtn" type="button" data-i18n="muteAll">${t('muteAll')}</button>
            <span class="sound-status" id="soundStatus">${esc(audible)}</span>
          </section>
          <section class="tool-group">
            <span class="tool-label" data-i18n="time">${t('time')}</span>
            <button class="btn" id="nowBtn" type="button" data-i18n="toNow">${t('toNow')}</button>
            <button class="btn" id="startBtn" type="button" data-i18n="fromStart">${t('fromStart')}</button>
            <input id="syncOffset" type="text" placeholder="300, 5p, 05:00" value="${esc(state.offsetText)}">
            <button class="btn" id="syncBtn" type="button" data-i18n="seek">${t('seek')}</button>
            <span class="meta" id="syncStatus">${esc(syncText())}</span>
          </section>
          <section class="tool-group">
            <span class="tool-label" data-i18n="quality">${t('quality')}</span>
            <select id="qualityPick">
              <option value="auto" data-i18n="qualityAuto">${t('qualityAuto')}</option>
              <option value="hd2160">2160p</option>
              <option value="hd1440">1440p</option>
              <option value="hd1080">1080p</option>
              <option value="hd720">720p</option>
              <option value="large">480p</option>
              <option value="medium">360p</option>
            </select>
          </section>
        </div>
        <div class="panel stream-list" id="pickerPanel" style="margin-top:0" ${state.pickerOpen ? '' : 'hidden'}>${pickerRows}</div>
        <div class="watch-stage-row ${state.viewersOpen ? 'has-drawer' : ''}">
          <div class="stage ${state.arrange ? 'is-arranging' : ''}" data-layout="${esc(state.layout)}" style="--split:${state.split}fr;--thumb:${(100 - state.split) / 2}fr"></div>
          <aside class="view-drawer" id="viewerPanel" ${state.viewersOpen ? '' : 'hidden'}>
            <div class="drawer-title" data-i18n="drawerTitle">${t('drawerTitle')}</div>
            <table>
              <thead><tr><th data-i18n="colStream">${t('colStream')}</th><th data-i18n="colPlatform">${t('colPlatform')}</th><th data-i18n="viewers">${t('viewers')}</th><th data-i18n="colStatus">${t('colStatus')}</th></tr></thead>
              <tbody>${panelRows}</tbody>
            </table>
            <p class="meta note" data-i18n="drawerNote">${t('drawerNote')}</p>
          </aside>
        </div>
      </main>
    `, 'watch');
    bindWatch();
    placeCards();
  }

  function playerCard(stream, index) {
    const tiktok = stream.platform === 'tiktok';
    return `
      <article class="player" data-card="${index}" data-key="${esc(keyOf(stream))}" data-span="${stream.span === 2 ? 2 : 1}">
        <div class="cap">
          ${platformBadge(stream)}
          <b>${esc(streamTitle(stream))}</b>
          <span class="spacer"></span>
          <button class="wide-btn${stream.span === 2 ? ' is-on' : ''}" data-wide="${index}" type="button" draggable="false" title="${esc(t('wideHint'))}" data-i18n="wide">${t('wide')}</button>
          <span data-count="${esc(keyOf(stream))}">${esc(viewerText(stream))}</span>
        </div>
        <div class="screen">
          ${tiktok ? '' : `<div class="hit" data-focus="${index}"></div>`}
          <div class="frame" id="frame-${index}">
            ${tiktok ? `<div class="fallback"><div><p>${esc(t('tiktokBody'))}</p><a href="${esc(stream.url)}" target="_blank" rel="noopener">${esc(t('tiktokOpen'))}</a></div></div>` : ''}
          </div>
        </div>
      </article>
    `;
  }

  function paintWatchCopy() {
    document.querySelectorAll('[data-nav]').forEach((link) => {
      link.textContent = link.getAttribute('href') === '/admin' ? t('admin') : t('createLink');
    });
    document.querySelectorAll('[data-lang]').forEach((button) => {
      button.classList.toggle('is-on', button.dataset.lang === state.lang);
    });
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    const themeBtn = $('#themeBtn');
    if (themeBtn) themeBtn.textContent = state.theme === 'dark' ? t('light') : t('dark');
    const meta = $('#watchMeta');
    if (meta && state.link) {
      const streams = state.link.payload.streams;
      meta.textContent = t('playingMeta', { play: activeStreams(streams).length, n: streams.length });
    }
    const hint = $('#arrangeHint');
    if (hint) hint.textContent = state.arrange ? t('dragHint') : '';
    const save = $('#saveStatus');
    if (save) save.textContent = saveText();
    const sync = $('#syncStatus');
    if (sync) sync.textContent = syncText();
    document.querySelectorAll('.wide-btn').forEach((button) => {
      button.title = t('wideHint');
    });
    syncSoundUi();
    paintViewers();
  }

  function placeCards() {
    const playing = activeStreams(state.link.payload.streams);
    const stage = $('.stage');
    if (!stage) return;
    const keep = new Set(playing.map((stream) => keyOf(stream)));
    stage.querySelectorAll('.player').forEach((card) => {
      if (!keep.has(card.dataset.key)) {
        destroyPlayer(card.dataset.key);
        card.remove();
      }
    });
    playing.forEach((stream, index) => {
      const key = keyOf(stream);
      let card = stage.querySelector('.player[data-key="' + key + '"]');
      if (!card) {
        const wrap = document.createElement('div');
        wrap.innerHTML = playerCard(stream, index).trim();
        card = wrap.firstElementChild;
        stage.appendChild(card);
      }
      card.dataset.card = String(index);
      card.dataset.span = stream.span === 2 ? '2' : '1';
      const frame = card.querySelector('.frame');
      if (frame) frame.id = 'frame-' + index;
      const current = index === state.focus;
      card.classList.toggle('is-current', current);
      const hit = card.querySelector('.hit');
      if (hit) {
        hit.dataset.focus = String(index);
        hit.hidden = state.arrange || (current && shouldHear(index));
      }
      const wide = card.querySelector('.wide-btn');
      if (wide) {
        wide.dataset.wide = String(index);
        wide.classList.toggle('is-on', stream.span === 2);
      }
      if (card.parentElement !== stage) stage.appendChild(card);
      bindDrag(card);
    });
    const ordered = [...stage.querySelectorAll('.player')];
    const sameOrder = ordered.length === playing.length && ordered.every((card, index) => card.dataset.key === keyOf(playing[index]));
    if (!sameOrder) {
      playing.forEach((stream) => {
        const card = stage.querySelector('.player[data-key="' + keyOf(stream) + '"]');
        if (card) stage.appendChild(card);
      });
    }
    bindCardClicks();
  }

  function parseOffset(raw) {
    const text = String(raw || '').trim().toLowerCase();
    if (!text) return null;
    const clock = text.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (clock) {
      if (clock[3] != null) return (Number(clock[1]) * 3600) + (Number(clock[2]) * 60) + Number(clock[3]);
      return (Number(clock[1]) * 60) + Number(clock[2]);
    }
    const minutes = text.match(/^(\d+(?:\.\d+)?)\s*(p|phút|m|min)$/);
    if (minutes) return Math.round(Number(minutes[1]) * 60);
    const seconds = text.match(/^(\d+(?:\.\d+)?)\s*(s|giây|sec)?$/);
    if (seconds) return Math.round(Number(seconds[1]));
    return null;
  }

  function noteSync(moved, ended, skipped) {
    state.syncCounts = { moved, ended, skipped };
    state.syncKind = (moved || ended || skipped) ? 'done' : 'none';
    const status = $('#syncStatus');
    if (status) status.textContent = syncText();
  }

  function seekPlayers(target) {
    const playing = activeStreams(state.link.payload.streams);
    let moved = 0;
    let ended = 0;
    let skipped = 0;
    playing.forEach((stream, index) => {
      const player = ytPlayers.get(keyOf(stream));
      if (stream.platform !== 'youtube' || !player || typeof player.seekTo !== 'function') {
        skipped += 1;
        return;
      }
      let duration = 0;
      try { duration = Number(player.getDuration()) || 0; } catch (err) { duration = 0; }
      try {
        if (target === 'start') {
          player.seekTo(0, true);
          if (typeof player.playVideo === 'function') player.playVideo();
          moved += 1;
        } else if (target === 'now') {
          if (duration > 1) {
            player.seekTo(duration, true);
            if (typeof player.playVideo === 'function') player.playVideo();
            moved += 1;
          } else skipped += 1;
        } else if (duration > 1 && target >= duration) {
          player.seekTo(Math.max(duration - 0.25, 0), true);
          if (typeof player.playVideo === 'function') player.playVideo();
          ended += 1;
        } else {
          player.seekTo(Math.max(target, 0), true);
          if (typeof player.playVideo === 'function') player.playVideo();
          moved += 1;
        }
      } catch (err) {
        skipped += 1;
      }
    });
    noteSync(moved, ended, skipped);
  }

  function bindDrag(card) {
    const cap = card.querySelector('.cap');
    const arranging = state.arrange && state.layout !== 'focus';
    card.draggable = false;
    if (cap) cap.draggable = arranging;
    if (cap) {
      cap.ondragstart = arranging ? (event) => {
        event.dataTransfer.setData('text/plain', card.dataset.card);
        event.dataTransfer.effectAllowed = 'move';
        card.classList.add('is-dragging');
      } : null;
      cap.ondragend = () => card.classList.remove('is-dragging');
    }
    card.ondragover = arranging ? (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    } : null;
    card.ondrop = arranging ? (event) => {
      event.preventDefault();
      const from = Number(event.dataTransfer.getData('text/plain'));
      const to = Number(card.dataset.card);
      if (!Number.isNaN(from) && from !== to) reorderPlaying(from, to);
    } : null;
  }

  function reorderPlaying(from, to) {
    const streams = state.link.payload.streams;
    const active = streams.filter((stream) => stream.active);
    const next = active.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    let cursor = 0;
    state.link.payload.streams = streams.map((stream) => (stream.active ? next[cursor++] : stream));
    state.saveKind = 'dirty';
    placeCards();
    const save = $('#saveStatus');
    if (save) save.textContent = saveText();
  }

  async function saveLayout() {
    state.saveKind = 'saving';
    const status = $('#saveStatus');
    if (status) status.textContent = saveText();
    try {
      const data = await api('/api/watch-links/' + encodeURIComponent(state.link.slug), {
        method: 'POST',
        body: JSON.stringify({
          layout: state.layout,
          split: state.split,
          streams: state.link.payload.streams,
        }),
      });
      state.link = data.link;
      state.split = clampSplit(data.link.payload && data.link.payload.split);
      state.canEdit = true;
      state.saveKind = 'saved';
    } catch (err) {
      state.saveKind = 'error';
      state.saveError = explain(err.message);
    }
    const note = $('#saveStatus');
    if (note) note.textContent = saveText();
  }

  function focusStream(index) {
    state.focus = index;
    state.hear = 'focus';
    placeCards();
    applyAudio();
    syncSoundUi();
  }

  function syncSoundUi() {
    const playing = activeStreams(state.link ? state.link.payload.streams : []);
    const status = $('#soundStatus');
    if (status) status.textContent = soundLabel(playing);
    const allBtn = $('#allBtn');
    const muteBtn = $('#muteBtn');
    if (allBtn) allBtn.classList.toggle('is-on', state.hear === 'all');
    if (muteBtn) muteBtn.classList.toggle('is-on', state.hear === 'off');
  }

  function soundLabel(playing) {
    if (state.hear === 'off' || !playing.length) return t('muted');
    if (state.hear === 'all') return t('hearingAll');
    return t('hearing', { title: streamTitle(playing[state.focus] || playing[0]) });
  }

  function bindWatch() {
    document.querySelectorAll('[data-layout]').forEach((button) => {
      button.onclick = () => {
        const next = button.dataset.layout;
        if (next === state.layout) return;
        state.layout = next;
        if (next === 'focus') state.arrange = false;
        state.saveKind = 'dirty';
        const stage = document.querySelector('.stage');
        if (stage) {
          stage.dataset.layout = next;
          stage.classList.toggle('is-arranging', state.arrange && next !== 'focus');
        }
        const splitWrap = $('#splitWrap');
        const arrangeBtn = $('#arrangeBtn');
        if (splitWrap) splitWrap.hidden = next !== 'focus';
        if (arrangeBtn) {
          arrangeBtn.hidden = next === 'focus';
          arrangeBtn.classList.toggle('is-on', state.arrange);
        }
        document.querySelectorAll('[data-layout]').forEach((item) => {
          item.classList.toggle('is-on', item.dataset.layout === next);
        });
        const hint = $('#arrangeHint');
        if (hint) hint.textContent = state.arrange ? t('dragHint') : '';
        const note = $('#saveStatus');
        if (note) note.textContent = saveText();
        placeCards();
      };
    });
    const arrangeBtn = $('#arrangeBtn');
    if (arrangeBtn) {
      arrangeBtn.onclick = () => {
        state.arrange = !state.arrange;
        arrangeBtn.classList.toggle('is-on', state.arrange);
        const stage = document.querySelector('.stage');
        if (stage) stage.classList.toggle('is-arranging', state.arrange);
        const hint = $('#arrangeHint');
        if (hint) hint.textContent = state.arrange ? t('dragHint') : '';
        placeCards();
      };
    }
    const saveBtn = $('#saveLayoutBtn');
    if (saveBtn) saveBtn.onclick = () => saveLayout();
    const splitRange = $('#splitRange');
    if (splitRange) {
      splitRange.oninput = () => {
        state.split = clampSplit(splitRange.value);
        const label = $('#splitValue');
        if (label) label.textContent = state.split + '%';
        const stage = document.querySelector('.stage[data-layout="focus"]');
        if (stage) {
          stage.style.setProperty('--split', state.split + 'fr');
          stage.style.setProperty('--thumb', ((100 - state.split) / 2) + 'fr');
        }
        state.saveKind = 'dirty';
        const note = $('#saveStatus');
        if (note) note.textContent = saveText();
      };
    }
    $('#pickerBtn').onclick = () => {
      state.pickerOpen = !state.pickerOpen;
      const panel = $('#pickerPanel');
      if (panel) panel.hidden = !state.pickerOpen;
    };
    $('#copyBtn').onclick = async () => {
      const token = encodeRoom(state.link.name, {
        layout: state.layout,
        split: state.split,
        streams: state.link.payload.streams,
      });
      const url = location.origin + '/w/' + token;
      history.replaceState({}, '', '/w/' + token);
      state.link.slug = token;
      try {
        await navigator.clipboard.writeText(url);
        $('#copyBtn').textContent = t('copied');
      } catch (err) {
        $('#copyBtn').textContent = t('copied');
        window.prompt(t('copy'), url);
      }
    };
    $('#allBtn').onclick = () => {
      state.hear = 'all';
      applyAudio();
      placeCards();
      syncSoundUi();
    };
    $('#muteBtn').onclick = () => {
      state.hear = 'off';
      applyAudio();
      placeCards();
      syncSoundUi();
    };
    $('#nowBtn').onclick = () => seekPlayers('now');
    $('#startBtn').onclick = () => seekPlayers('start');
    const offsetInput = $('#syncOffset');
    if (offsetInput) offsetInput.oninput = () => { state.offsetText = offsetInput.value; };
    const qualityPick = $('#qualityPick');
    if (qualityPick) {
      qualityPick.value = state.quality;
      qualityPick.onchange = () => {
        state.quality = qualityPick.value;
        reloadYouTubeQuality();
        applyStreamQuality();
      };
    }
    $('#syncBtn').onclick = () => {
      const seconds = parseOffset(state.offsetText);
      if (seconds == null) {
        state.syncKind = 'bad';
        const status = $('#syncStatus');
        if (status) status.textContent = syncText();
        return;
      }
      seekPlayers(seconds);
    };
    $('#viewTotal').onclick = () => {
      state.viewersOpen = !state.viewersOpen;
      const row = document.querySelector('.watch-stage-row');
      const panel = $('#viewerPanel');
      if (row) row.classList.toggle('has-drawer', state.viewersOpen);
      if (panel) panel.hidden = !state.viewersOpen;
      $('#viewTotal').classList.toggle('is-on', state.viewersOpen);
    };
    bindCardClicks();
  }

  function bindCardClicks() {
    document.querySelectorAll('[data-focus]').forEach((hit) => {
      hit.onclick = () => {
        if (state.arrange && state.layout !== 'focus') return;
        focusStream(Number(hit.dataset.focus));
      };
    });
    document.querySelectorAll('.cap').forEach((cap) => {
      const card = cap.closest('[data-card]');
      if (!card) return;
      cap.onclick = () => {
        if (state.arrange && state.layout !== 'focus') return;
        focusStream(Number(card.dataset.card));
      };
    });
    document.querySelectorAll('[data-wide]').forEach((button) => {
      button.onmousedown = (event) => event.stopPropagation();
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSpan(Number(button.dataset.wide));
      };
    });
    document.querySelectorAll('[data-pick]').forEach((box) => {
      box.onchange = () => pickStream(Number(box.dataset.pick), box.checked);
    });
  }

  function pickStream(index, checked) {
    const streams = state.link.payload.streams;
    const playing = streams.filter((stream) => stream.active).length;
    if (checked && !streams[index].active && playing >= MAX_ACTIVE) {
      boxCheckedBack(index);
      return;
    }
    if (!checked && playing <= 1 && streams[index].active) {
      boxCheckedBack(index);
      return;
    }
    const before = activeStreams(streams);
    const focused = before[state.focus];
    streams[index].active = checked;
    const after = activeStreams(streams);
    if (focused && after.indexOf(focused) >= 0) state.focus = after.indexOf(focused);
    else {
      state.focus = 0;
      state.hear = 'off';
    }
    const meta = $('#watchMeta');
    if (meta) meta.textContent = t('playingMeta', { play: after.length, n: streams.length });
    placeCards();
    mountPlayers();
    applyAudio();
  }

  function boxCheckedBack(index) {
    const box = document.querySelector(`[data-pick="${index}"]`);
    if (box) box.checked = state.link.payload.streams[index].active;
  }

  function shouldHear(index) {
    if (state.hear === 'all') return true;
    if (state.hear === 'focus') return index === state.focus;
    return false;
  }

  function destroyPlayer(key) {
    const yt = ytPlayers.get(key);
    if (yt) {
      try { yt.destroy(); } catch (err) { /* already gone */ }
      ytPlayers.delete(key);
    }
    twPlayers.delete(key);
  }

  function applyAudio() {
    activeStreams(state.link ? state.link.payload.streams : []).forEach((stream, index) => {
      const hear = shouldHear(index);
      const yt = ytPlayers.get(keyOf(stream));
      if (yt) {
        try {
          if (hear) {
            yt.unMute();
            yt.setVolume(100);
          } else {
            yt.mute();
            yt.setVolume(0);
          }
        } catch (err) { /* player not ready */ }
      }
      const tw = twPlayers.get(keyOf(stream));
      if (tw) {
        try {
          tw.setMuted(!hear);
          tw.setVolume(hear ? 1 : 0);
        } catch (err) { /* player not ready */ }
      }
    });
  }

  function silenceQuiet() {
    activeStreams(state.link ? state.link.payload.streams : []).forEach((stream, index) => {
      if (shouldHear(index)) return;
      const player = ytPlayers.get(keyOf(stream));
      if (!player) return;
      try {
        player.mute();
        player.setVolume(0);
      } catch (err) { /* player not ready */ }
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing && existing.dataset.ready === '1') {
        resolve();
        return;
      }
      const script = existing || document.createElement('script');
      script.src = src;
      script.onload = () => {
        script.dataset.ready = '1';
        resolve();
      };
      script.onerror = () => reject(new Error('Script failed'));
      if (!existing) document.head.appendChild(script);
    });
  }

  function loadYouTube() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (!ytReady) {
      ytReady = new Promise((resolve) => {
        const previous = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (previous) previous();
          resolve();
        };
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      });
    }
    return ytReady;
  }

  async function mountPlayers() {
    const playing = activeStreams(state.link.payload.streams);
    const todo = playing.filter((stream) => {
      const key = keyOf(stream);
      return !ytPlayers.has(key) && !twPlayers.has(key) && !mounting.has(key);
    });
    if (!todo.length) return;
    todo.forEach((stream) => mounting.add(keyOf(stream)));
    try {
      if (todo.some((stream) => stream.platform === 'youtube')) await loadYouTube();
      if (todo.some((stream) => stream.platform === 'twitch')) {
        try { await loadScript('https://player.twitch.tv/js/embed/v1.js'); } catch (err) { /* iframe fallback below */ }
      }
      todo.forEach((stream) => {
        const index = playing.indexOf(stream);
        const frame = document.getElementById('frame-' + index);
        if (!frame || frame.querySelector('iframe')) return;
        if (stream.platform === 'youtube') mountYouTube(frame, stream, index);
        else if (stream.platform === 'twitch') mountTwitch(frame, stream, index);
        else if (stream.platform === 'facebook') mountFacebook(frame, stream);
      });
    } finally {
      todo.forEach((stream) => mounting.delete(keyOf(stream)));
    }
    if (enforceTimer) clearInterval(enforceTimer);
    enforceTimer = setInterval(silenceQuiet, 700);
  }

  function stopPlayersOnly() {
    ytPlayers.forEach((player) => {
      try { player.destroy(); } catch (err) { /* already destroyed */ }
    });
    ytPlayers.clear();
    twPlayers.clear();
  }

  function youtubeQualityName(level) {
    return {
      hd2160: 'hd2160',
      hd1440: 'hd1440',
      hd1080: 'hd1080',
      hd720: 'hd720',
      large: 'large',
      medium: 'medium',
    }[level] || 'default';
  }

  function reloadYouTubeQuality() {
    const suggested = youtubeQualityName(state.quality);
    activeStreams(state.link ? state.link.payload.streams : []).forEach((stream) => {
      if (stream.platform !== 'youtube') return;
      const player = ytPlayers.get(keyOf(stream));
      if (!player || typeof player.loadVideoById !== 'function') return;
      let time = 0;
      let name = suggested;
      try { time = Number(player.getCurrentTime()) || 0; } catch (err) { time = 0; }
      try {
        const available = player.getAvailableQualityLevels() || [];
        if (name !== 'default' && available.length && available.indexOf(name) < 0 && name === 'hd1440' && available.indexOf('highres') >= 0) {
          name = 'highres';
        }
      } catch (err) { /* levels not ready */ }
      try {
        player.loadVideoById({
          videoId: stream.externalId,
          startSeconds: time > 1 ? time : 0,
          suggestedQuality: name,
        });
        player.mute();
        player.setVolume(0);
      } catch (err) { /* player not ready */ }
    });
    applyAudio();
  }

  function applyStreamQuality() {
    const level = state.quality || 'auto';
    const wantHeight = { hd2160: 2160, hd1440: 1440, hd1080: 1080, hd720: 720, large: 480, medium: 360 }[level];
    twPlayers.forEach((player) => {
      try {
        if (typeof player.getQualities !== 'function' || typeof player.setQuality !== 'function') return;
        const list = player.getQualities() || [];
        if (level === 'auto') {
          const auto = list.find((item) => String(item.group || item.name || '').toLowerCase() === 'auto');
          if (auto) player.setQuality(auto.group || auto.name);
          return;
        }
        const ranked = list.map((item) => {
          const label = String(item.name || item.group || '');
          const height = Number(item.height) || Number((label.match(/(\d{3,4})p/) || [])[1]) || 0;
          return { item, height };
        }).filter((row) => row.height);
        ranked.sort((a, b) => Math.abs(a.height - wantHeight) - Math.abs(b.height - wantHeight));
        if (ranked[0]) player.setQuality(ranked[0].item.group || ranked[0].item.name);
      } catch (err) { /* qualities not ready */ }
    });
  }

  function mountYouTube(frame, stream, index) {
    frame.innerHTML = '';
    const slot = document.createElement('div');
    frame.appendChild(slot);
    const player = new YT.Player(slot, {
      videoId: stream.externalId,
      playerVars: {
        autoplay: 1,
        mute: 1,
        enablejsapi: 1,
        origin: location.origin,
        rel: 0,
        modestbranding: 1,
        vq: youtubeQualityName(state.quality),
      },
      events: {
        onReady: (event) => {
          try {
            const data = event.target.getVideoData();
            if (data && data.title) {
              state.viewerMap[keyOf(stream)] = {
                ...(state.viewerMap[keyOf(stream)] || {}),
                title: data.title,
              };
              const title = frame.closest('.player').querySelector('.cap b');
              if (title && !stream.label) title.textContent = data.title;
            }
          } catch (err) { /* title not ready */ }
          event.target.mute();
          event.target.setVolume(0);
          applyAudio();
          paintViewers();
        },
        onStateChange: () => silenceQuiet(),
      },
    });
    ytPlayers.set(keyOf(stream), player);
  }

  function mountTwitch(frame, stream, index) {
    frame.innerHTML = '';
    if (window.Twitch && window.Twitch.Player) {
      const slot = document.createElement('div');
      slot.id = 'twitch-' + index;
      frame.appendChild(slot);
      const player = new Twitch.Player(slot.id, {
        channel: stream.externalId,
        parent: [location.hostname],
        muted: true,
        autoplay: true,
      });
      twPlayers.set(keyOf(stream), player);
      if (window.Twitch.Player.READY) {
        player.addEventListener(window.Twitch.Player.READY, () => applyStreamQuality());
      }
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.src = `https://player.twitch.tv/?channel=${encodeURIComponent(stream.externalId)}&parent=${encodeURIComponent(location.hostname)}&muted=true&autoplay=true`;
    iframe.allow = 'autoplay; fullscreen';
    frame.appendChild(iframe);
  }

  function mountFacebook(frame, stream) {
    frame.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.facebook.com/plugins/video.php?href='
      + encodeURIComponent(stream.url)
      + '&show_text=false&mute=1&autoplay=true';
    iframe.allow = 'autoplay; fullscreen';
    iframe.allowFullscreen = true;
    frame.appendChild(iframe);
  }

  async function refreshViewers() {
    if (!state.link) return;
    const streams = state.link.payload.streams;
    const youtube = streams.filter((stream) => stream.platform === 'youtube').map((stream) => stream.externalId);
    const twitch = streams.filter((stream) => stream.platform === 'twitch').map((stream) => stream.externalId);
    const params = new URLSearchParams();
    if (youtube.length) params.set('youtube', youtube.join(','));
    if (twitch.length) params.set('twitch', twitch.join(','));
    if ([...params.keys()].length) {
      try {
        const data = await api('/api/viewership?' + params.toString());
        state.providers = data.providers || state.providers;
        (data.items || []).forEach((item) => {
          const previous = state.viewerMap[item.platform + ':' + item.id] || {};
          state.viewerMap[item.platform + ':' + item.id] = {
            ...previous,
            ...item,
            title: item.title || previous.title || null,
          };
        });
      } catch (err) {
        streams.forEach((stream) => {
          if (stream.platform === 'youtube' || stream.platform === 'twitch') {
            const previous = state.viewerMap[keyOf(stream)] || {};
            state.viewerMap[keyOf(stream)] = { ...previous, viewers: null, status: 'unknown' };
          }
        });
      }
    }
    paintViewers();
  }

  function playingAt(index) {
    return activeStreams(state.link ? state.link.payload.streams : [])[index];
  }

  async function showAdmin() {
    stopRoom();
    state.page = 'admin';
    let meta;
    try {
      meta = await api('/api/meta');
    } catch (err) {
      shell(`<main class="page"><p class="error">${esc(err.message)}</p></main>`);
      return;
    }
    state.me = meta.me || null;
    if (meta.needsSetup) {
      shell(`
        <main class="page">
          <h1 class="page-title">${t('setupTitle')}</h1>
          <p class="lede">${t('setupLede')}</p>
          <form class="panel stack" id="setupForm">
            <label class="field">${t('username')}<input name="username" type="text" autocomplete="username"></label>
            <label class="field">${t('password')}<input name="password" type="password" autocomplete="new-password"></label>
            <button class="btn btn-primary" type="submit">${t('setupTitle')}</button>
            <p class="error" id="formError"></p>
          </form>
        </main>
      `);
      $('#setupForm').onsubmit = async (event) => {
        event.preventDefault();
        const body = Object.fromEntries(new FormData(event.target));
        try {
          const data = await api('/api/setup', { method: 'POST', body: JSON.stringify(body) });
          state.me = data.me || null;
          showAdmin();
        } catch (err) {
          $('#formError').textContent = err.message;
        }
      };
      return;
    }
    if (!meta.me || meta.me.role !== 'admin') {
      shell(`
        <main class="page">
          <h1 class="page-title">${t('admin')}</h1>
          <p class="lede">${t('loginLede')}</p>
          <form class="panel stack" id="loginForm">
            <label class="field">${t('username')}<input name="username" type="text" autocomplete="username"></label>
            <label class="field">${t('password')}<input name="password" type="password" autocomplete="current-password"></label>
            <button class="btn btn-primary" type="submit">${t('login')}</button>
            <p class="error" id="formError"></p>
          </form>
        </main>
      `);
      $('#loginForm').onsubmit = async (event) => {
        event.preventDefault();
        const body = Object.fromEntries(new FormData(event.target));
        try {
          const data = await api('/api/login', { method: 'POST', body: JSON.stringify(body) });
          state.me = data.me || null;
          showAdmin();
        } catch (err) {
          $('#formError').textContent = err.message;
        }
      };
      return;
    }
    const data = await api('/api/admin/links');
    const rows = (data.links || []).map((link) => `
      <tr>
        <td>${esc(link.name)}</td>
        <td><a href="/w/${esc(link.slug)}">/w/${esc(link.slug)}</a></td>
        <td>${esc(link.creator)}</td>
        <td>${link.opens}</td>
        <td>${link.uniques}</td>
        <td>${esc(link.createdAt)}</td>
      </tr>
    `).join('');
    const providers = data.providers || {};
    shell(`
      <main class="page stack">
        <div class="row">
          <h1 class="page-title">${t('history')}</h1>
          <span class="meta">${esc(meta.me.username)}</span>
          <button class="btn" id="logoutBtn" type="button">${t('logout')}</button>
        </div>
        <div class="panel" style="overflow:auto;padding:0">
          <table class="data-table">
            <thead><tr><th>${t('colName')}</th><th>${t('colLink')}</th><th>${t('colCreator')}</th><th>${t('colOpens')}</th><th>${t('colUniques')}</th><th>${t('colCreated')}</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="6">${t('noLinks')}</td></tr>`}</tbody>
          </table>
        </div>
        <div class="panel stack">
          <strong>${t('platforms')}</strong>
          <p class="meta">${t('ytNote', { state: providers.youtube ? t('ytOn') : t('ytOff') })}</p>
          <p class="meta">${t('twNote', { state: providers.twitch ? t('twOn') : t('twOff') })}</p>
          <p class="meta">${t('fbNote')}</p>
          <p class="meta">${t('ttNote')}</p>
        </div>
        <form class="panel stack" id="passwordForm">
          <strong>${t('changePw')}</strong>
          <label class="field">${t('currentPw')}<input name="current" type="password" autocomplete="current-password"></label>
          <label class="field">${t('newPw')}<input name="password" type="password" autocomplete="new-password"></label>
          <button class="btn btn-primary" type="submit">${t('changePwBtn')}</button>
          <p id="formError"></p>
        </form>
      </main>
    `);
    $('#logoutBtn').onclick = async () => {
      await api('/api/logout', { method: 'POST', body: '{}' });
      state.me = null;
      showAdmin();
    };
    $('#passwordForm').onsubmit = async (event) => {
      event.preventDefault();
      const body = Object.fromEntries(new FormData(event.target));
      try {
        await api('/api/me/password', { method: 'POST', body: JSON.stringify(body) });
        $('#formError').textContent = t('pwDone');
        $('#formError').className = 'meta';
      } catch (err) {
        $('#formError').textContent = err.message;
        $('#formError').className = 'error';
      }
    };
    document.querySelectorAll('.data-table a').forEach((link) => {
      link.onclick = (event) => {
        event.preventDefault();
        history.pushState({}, '', link.getAttribute('href'));
        route();
      };
    });
  }

  function route() {
    applyTheme(state.theme);
    applyLang(state.lang);
    const path = location.pathname;
    if (path.startsWith('/w/')) {
      const slug = decodeURIComponent(path.slice(3).split('/')[0] || '');
      showWatch(slug);
      return;
    }
    showCreate();
  }

  window.addEventListener('popstate', route);
  applyTheme(state.theme);
  applyLang(state.lang);
  route();
})();
