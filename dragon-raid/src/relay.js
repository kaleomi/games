// 熙梦弹幕助手连接（ws://127.0.0.1:端口），协议与凌霄守山一致
// 只用助手给出的用户ID字段，不按昵称合并身份。

export function stableId(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? String(value) : '';
  if (typeof value !== 'string') return '';
  const s = value.trim();
  return s && s !== '0' && s.length <= 256 ? s : '';
}

function avatarOf(u) {
  const raw = u.avatar ?? u.avatarThumb ?? u.avatar_thumb ?? '';
  const v = typeof raw === 'string' ? raw : (raw?.urlList?.[0] || raw?.url_list?.[0] || '');
  try { const url = new URL(v); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}

export function normalizeMessage(message) {
  if (!message || typeof message !== 'object') return null;
  const u = message.user;
  let user = null;
  if (u && typeof u === 'object' && !Array.isArray(u)) {
    const id = [u.id, u.secUid, u.sec_uid, u.id_str, u.uid].map(stableId).find(Boolean) || '';
    user = { id, name: String(u.name ?? u.nickname ?? '').slice(0, 24), avatar: avatarOf(u) };
  }
  const out = { ...message, user };
  const g = message.gift;
  if (g && typeof g === 'object' && !Array.isArray(g)) {
    out.gift = {
      ...g,
      id: g.id ?? g.giftId ?? g.gift_id,
      name: g.name ?? g.giftName ?? g.gift_name,
      count: g.count ?? g.repeatCount ?? g.repeat_count ?? g.comboCount ?? g.combo_count ?? message.repeatCount ?? message.repeat_count ?? message.comboCount ?? message.combo_count,
      price: g.price ?? g.diamondCount ?? g.diamond_count,
      type: g.type ?? g.giftType ?? g.gift_type,
      repeatEnd: g.repeatEnd ?? g.repeat_end ?? message.repeatEnd ?? message.repeat_end,
    };
  }
  return out;
}

export function groupId(message) {
  const g = message.gift || {};
  const id = String(g.groupId ?? g.group_id ?? g.comboId ?? g.streakId ?? message.groupId ?? message.group_id ?? message.comboId ?? message.combo_id ?? '').trim();
  return id === '0' ? '' : id;
}

// 连击礼物计数：助手转发的是累计数量，这里换算成本次新增数量（逻辑同凌霄守山 gift-counter）
export class GiftCounter {
  constructor() { this.rows = new Map(); }
  count(message, now) {
    const g = message.gift || {};
    const count = Math.min(10000, Math.max(0, Math.floor(Number(g.count) || 0)));
    if (!count) return 0;
    const group = groupId(message), end = Number(g.repeatEnd) === 1;
    if ((g.type != null && Number(g.type) !== 1) || (!group && g.type == null && g.repeatEnd == null)) return count;
    const key = JSON.stringify([String(message.user?.id || ''), String(g.id || g.name || ''), group]);
    let old = this.rows.get(key);
    if (old && now - old.time > 30000 && !group) old = null;
    let amount;
    if (group) amount = Math.max(0, count - (old?.count || 0));
    else if (!old || old.closed) amount = count;
    else if (!end && (count === 1 || count < old.count)) amount = count;
    else amount = Math.max(0, count - old.count);
    const high = group ? Math.max(count, old?.count || 0) : (!end && (count === 1 || count < (old?.count || 0)) ? count : Math.max(count, old?.count || 0));
    this.rows.delete(key);
    this.rows.set(key, { count: high, closed: end || (group && old?.closed) || false, time: now });
    while (this.rows.size > 1000) this.rows.delete(this.rows.keys().next().value);
    return amount;
  }
}

class Seen {
  constructor(max = 6000) { this.max = max; this.set = new Set(); }
  has(k) { return this.set.has(k); }
  add(k) { this.set.add(k); if (this.set.size > this.max) this.set.delete(this.set.values().next().value); }
}

const FALLBACK_PRICE = { 小心心: 1, 墨镜: 99 };

// 把一条已归一化的助手消息分发给 handlers；返回处理类型
export function routeMessage(msg, handlers, state) {
  if (!msg || !msg.method) return null;
  const method = String(msg.method);
  const id = msg.id != null ? String(msg.id) : '';
  if (method === 'WebcastChatMessage') {
    if (id) { const k = 'c:' + id; if (state.seen.has(k)) return 'dup'; state.seen.add(k); }
    if (!msg.user?.id) return null;
    handlers.chat?.(msg.user, String(msg.content || ''));
    return 'chat';
  }
  if (method === 'WebcastLikeMessage') {
    if (id) { const k = 'l:' + id; if (state.seen.has(k)) return 'dup'; state.seen.add(k); }
    if (!msg.user?.id) return null;
    const parsed = String(msg.content || '').match(/点赞了[（(](\d+)[)）]/);
    const count = Math.floor(Number(msg.count ?? parsed?.[1] ?? 1));
    handlers.like?.(msg.user, count);
    return 'like';
  }
  if (method === 'WebcastGiftMessage') {
    const g = msg.gift;
    if (!g) return null;
    if (!msg.user?.id) { handlers.unknownGift?.(msg.user?.name || '神秘人', g.name || '礼物'); return 'unknown'; }
    const frame = 'g:' + JSON.stringify([id, msg.user.id, String(g.id || g.name || ''), groupId(msg), g.count, g.repeatEnd, g.type]);
    if (id && state.seen.has(frame)) return 'dup';
    if (id) state.seen.add(frame);
    const amount = state.counter.count(msg, state.now());
    if (!amount) return 'combo';
    const rawPrice = g.price ?? FALLBACK_PRICE[g.name];
    handlers.gift?.(msg.user, { name: String(g.name || '礼物'), price: Number(rawPrice), count: amount, id: String(g.id || '') });
    return 'gift';
  }
  if (method === 'WebcastControlMessage' && Number(msg.room?.status) === 3) { handlers.liveEnd?.(); return 'end'; }
  return null;
}

export class Relay {
  constructor(handlers) {
    this.handlers = handlers;
    this.port = 8765;
    this.ws = null;
    this.status = 'offline';
    this.error = '';
    this.room = '';
    this.received = 0;
    this.wanted = false;
    this.retry = 0;
    this.timer = null;
    this.state = { seen: new Seen(), counter: new GiftCounter(), now: () => Date.now() };
  }

  connect(port = this.port) {
    this.port = port; this.wanted = true; this.open();
  }

  disconnect() {
    this.wanted = false;
    clearTimeout(this.timer); clearInterval(this.metaTimer);
    if (this.ws) { try { this.ws.close(); } catch { /* 忽略 */ } this.ws = null; }
    this.setStatus('offline');
  }

  setStatus(s, err = '') { this.status = s; this.error = err; this.handlers.status?.(s, err); }

  open() {
    if (!this.wanted) return;
    this.setStatus('connecting');
    let ws;
    try { ws = new WebSocket(`ws://127.0.0.1:${this.port}`); }
    catch (e) { this.setStatus('error', e.message); return this.schedule(); }
    this.ws = ws;
    ws.onopen = () => {
      if (ws !== this.ws) return;
      this.retry = 0;
      this.setStatus('connected');
      ws.send(JSON.stringify({ channel: 'dycast-extension', protocol: 1, type: 'hello', role: 'virtual-gift' }));
      const ask = () => { if (ws.readyState === 1) ws.send(JSON.stringify({ channel: 'dycast-extension', protocol: 1, type: 'request-users', requestId: 'starship-room' })); };
      ask(); clearInterval(this.metaTimer); this.metaTimer = setInterval(ask, 15000);
    };
    ws.onmessage = ev => {
      if (ws !== this.ws) return;
      let value; try { value = JSON.parse(typeof ev.data === 'string' ? ev.data : ''); } catch { return; }
      const list = Array.isArray(value) ? value : [value];
      for (const raw of list.slice(0, 1000)) {
        try {
          if (raw?.channel === 'dycast-extension') { if (raw.type === 'user-snapshot') this.meta(raw); continue; }
          if (raw?.roomNum && !raw.method) { this.meta(raw); continue; }
          const r = routeMessage(normalizeMessage(raw), this.handlers, this.state);
          if (r && r !== 'dup') this.received++;
        } catch (e) { console.warn('消息处理失败', e); }
      }
    };
    ws.onerror = () => { if (ws === this.ws) this.error = '连不上熙梦：请先打开熙梦并连接直播间；浏览器询问「访问本地网络」时点允许'; };
    ws.onclose = () => {
      if (ws !== this.ws) return;
      this.ws = null; clearInterval(this.metaTimer);
      this.setStatus(this.wanted ? 'reconnecting' : 'offline', this.error);
      this.schedule();
    };
  }

  meta(m) {
    const room = String(m.room?.roomNum || m.roomNum || '').trim();
    if (/^\d{3,24}$/.test(room) && room !== this.room) { this.room = room; this.handlers.room?.(room); }
  }

  schedule() {
    if (!this.wanted) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.open(), Math.min(15000, 1000 * 2 ** Math.min(4, this.retry++)));
  }
}
