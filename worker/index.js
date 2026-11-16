// Worker Eve Marly : sert le site (dossier src), mesure les visites (sans cookie),
// gère le catalogue dynamique (produits masqués / ajoutés) et l'administration.
// Toutes les données vivent dans un Durable Object SQLite : aucun réglage manuel.

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});
const CATS = ['Porte-jarretelles', 'Ensembles', 'Soutiens-gorge', 'Bodies', 'Nuisettes', 'Kimonos', 'Culottes', 'Pyjamas'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, n) => String(s == null ? '' : s).replace(/[\\"<>\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const euros = n => n.toFixed(2).replace('.', ',') + ' €';
const slugify = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|scrapy|facebookexternalhit|whatsapp|telegram/i;

function parisParts(ts) {
  const p = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ts));
  const g = t => p.find(x => x.type === t).value;
  return { day: `${g('year')}-${g('month')}-${g('day')}`, hour: parseInt(g('hour'), 10) };
}
function uaInfo(ua) {
  ua = ua || '';
  const device = /ipad|tablet|android(?!.*mobile)/i.test(ua) ? 'Tablette' : /mobi|iphone|android/i.test(ua) ? 'Mobile' : 'Ordinateur';
  const browser = /edg\//i.test(ua) ? 'Edge' : /opr\/|opera/i.test(ua) ? 'Opera' : /samsungbrowser/i.test(ua) ? 'Samsung' : /firefox|fxios/i.test(ua) ? 'Firefox' : /instagram/i.test(ua) ? 'Instagram' : /fban|fbav/i.test(ua) ? 'Facebook' : /tiktok|musical_ly/i.test(ua) ? 'TikTok' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : 'Autre';
  const os = /iphone|ipad|ipod/i.test(ua) ? 'iOS' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Autre';
  return { device, browser, os };
}
function source(ref) {
  if (!ref) return 'Direct';
  let h; try { h = new URL(ref).hostname.replace(/^www\./, ''); } catch { return 'Direct'; }
  if (!h || /evemarly\.com$|workers\.dev$/.test(h)) return '';
  if (/google\./.test(h)) return 'Google';
  if (/instagram\.com$/.test(h)) return 'Instagram';
  if (/tiktok\.com$/.test(h)) return 'TikTok';
  if (/facebook\.com$|fb\.com$/.test(h)) return 'Facebook';
  if (/bing\.com$/.test(h)) return 'Bing';
  if (/pinterest\./.test(h)) return 'Pinterest';
  return h.slice(0, 60);
}
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function sha(s) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
async function pbkdf(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256));
}
const rand = n => hex(crypto.getRandomValues(new Uint8Array(n)));

export class Store {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS hits(id INTEGER PRIMARY KEY, ts INTEGER, day TEXT, hour INTEGER, path TEXT, ref TEXT, country TEXT, device TEXT, browser TEXT, os TEXT, vid TEXT, sid TEXT);
      CREATE INDEX IF NOT EXISTS hits_day ON hits(day);
      CREATE INDEX IF NOT EXISTS hits_ts ON hits(ts);
      CREATE TABLE IF NOT EXISTS sessions(sid TEXT PRIMARY KEY, day TEXT, first INTEGER, last INTEGER, pages INTEGER, path TEXT, entry TEXT, ref TEXT, country TEXT, device TEXT);
      CREATE INDEX IF NOT EXISTS ses_day ON sessions(day);
      CREATE INDEX IF NOT EXISTS ses_last ON sessions(last);
      CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT);
      CREATE TABLE IF NOT EXISTS hidden(slug TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS added(slug TEXT PRIMARY KEY, data TEXT, ts INTEGER);
      CREATE TABLE IF NOT EXISTS waitlist(email TEXT PRIMARY KEY, ts INTEGER, source TEXT, country TEXT);
    `);
  }
  all(q, ...b) { return this.sql.exec(q, ...b).toArray(); }
  get(k) { const r = this.all('SELECT v FROM kv WHERE k=?', k); return r.length ? r[0].v : null; }
  set(k, v) { this.sql.exec('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', k, String(v)); }

  async fetch(request) {
    const url = new URL(request.url), p = url.pathname, m = request.method;
    try {
      if (p === '/api/t' && m === 'POST') return this.track(request);
      if (p === '/api/catalog') return json(this.catalog());
      if (p === '/api/waitlist' && m === 'POST') return this.waitlistAdd(request);
      if (p === '/api/admin/state') return json({ setup: !this.get('pw') });
      if (p === '/api/admin/setup' && m === 'POST') return this.setup(request);
      if (p === '/api/admin/login' && m === 'POST') return this.login(request);
      if (p.startsWith('/api/admin/')) {
        if (!this.authed(request)) return json({ error: 'Non autorisé.' }, 401);
        if (p === '/api/admin/live') return json(this.live());
        if (p === '/api/admin/stats') return json(this.stats(url.searchParams));
        if (p === '/api/admin/products' && m === 'GET') return json(this.products());
        if (p === '/api/admin/products/hide' && m === 'POST') return this.hide(request);
        if (p === '/api/admin/products/add' && m === 'POST') return this.add(request);
        if (p === '/api/admin/products/delete' && m === 'POST') return this.del(request);
        if (p === '/api/admin/waitlist') return json({ rows: this.all('SELECT email, ts, source, country FROM waitlist ORDER BY ts DESC LIMIT 2000') });
        if (p === '/api/admin/logout' && m === 'POST') { this.sql.exec('DELETE FROM kv WHERE k=?', 'tok:' + this.token(request)); return json({ ok: true }); }
      }
      return json({ error: 'Introuvable.' }, 404);
    } catch (e) { return json({ error: 'Erreur serveur.' }, 500); }
  }

  // ---------- mesure d'audience (sans cookie, sans adresse IP stockée) ----------
  async track(request) {
    const ua = request.headers.get('user-agent') || '';
    if (BOT.test(ua)) return new Response(null, { status: 204 });
    let b; try { b = JSON.parse(await request.text()); } catch { return new Response(null, { status: 204 }); }
    const sid = clean(b.s, 40), path = clean(b.p, 160) || '/';
    if (!sid || path.startsWith('/admin') || path.startsWith('/api')) return new Response(null, { status: 204 });
    const now = Date.now(), { day, hour } = parisParts(now);
    if (b.t === 'hb') { this.sql.exec('UPDATE sessions SET last=?, path=? WHERE sid=?', now, path, sid); return new Response(null, { status: 204 }); }
    let salt = this.get('salt:' + day);
    if (!salt) { salt = rand(16); this.sql.exec("DELETE FROM kv WHERE k LIKE 'salt:%'"); this.set('salt:' + day, salt); this.sql.exec('DELETE FROM hits WHERE ts < ?', now - 400 * 864e5); this.sql.exec('DELETE FROM sessions WHERE last < ?', now - 400 * 864e5); }
    const vid = (await sha(salt + (request.headers.get('x-ip') || '') + ua)).slice(0, 16);
    const { device, browser, os } = uaInfo(ua), country = clean(request.headers.get('x-country'), 2) || '??';
    const ses = this.all('SELECT ref FROM sessions WHERE sid=?', sid);
    const ref = ses.length ? ses[0].ref : (source(b.r) || 'Direct');
    this.sql.exec('INSERT INTO hits(ts,day,hour,path,ref,country,device,browser,os,vid,sid) VALUES(?,?,?,?,?,?,?,?,?,?,?)', now, day, hour, path, ref, country, device, browser, os, vid, sid);
    this.sql.exec('INSERT INTO sessions(sid,day,first,last,pages,path,entry,ref,country,device) VALUES(?,?,?,?,1,?,?,?,?,?) ON CONFLICT(sid) DO UPDATE SET last=excluded.last, pages=pages+1, path=excluded.path', sid, day, now, now, path, path, ref, country, device);
    return new Response(null, { status: 204 });
  }
  where(q, table) {
    const c = [], b = [], today = parisParts(Date.now()).day;
    const d = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : null;
    c.push('day >= ?'); b.push(d(q.get('from')) || today);
    c.push('day <= ?'); b.push(d(q.get('to')) || today);
    for (const [k, col] of [['device', 'device'], ['country', 'country'], ['src', 'ref']]) { const v = q.get(k); if (v) { c.push(col + ' = ?'); b.push(v.slice(0, 60)); } }
    const page = q.get('page'); if (page) { c.push((table === 'sessions' ? 'entry' : 'path') + ' LIKE ?'); b.push('%' + page.slice(0, 80).replace(/[%_]/g, '') + '%'); }
    return { w: c.join(' AND '), b };
  }
  stats(q) {
    const { w, b } = this.where(q, 'hits'), s = this.where(q, 'sessions');
    const from = b[0], to = b[1], byHour = from === to;
    const top = (col, extra = '', n = 12) => this.all(`SELECT ${col} AS k, COUNT(*) AS pv, COUNT(DISTINCT vid) AS v FROM hits WHERE ${w} ${extra} GROUP BY ${col} ORDER BY pv DESC LIMIT ${n}`, ...b);
    const tot = this.all(`SELECT COUNT(*) AS pv, COUNT(DISTINCT vid) AS visitors, COUNT(DISTINCT sid) AS sessions FROM hits WHERE ${w}`, ...b)[0];
    const ses = this.all(`SELECT COUNT(*) AS n, COALESCE(AVG(last-first),0) AS dur, COALESCE(SUM(pages=1),0) AS bounces, COALESCE(AVG(pages),0) AS ppv FROM sessions WHERE ${s.w}`, ...s.b)[0];
    const opt = col => this.all(`SELECT DISTINCT ${col} AS k FROM hits WHERE day >= ? ORDER BY k LIMIT 80`, parisParts(Date.now() - 90 * 864e5).day).map(r => r.k);
    return {
      from, to, byHour, totals: { ...tot, avgDuration: Math.round(ses.dur / 1000), bounce: ses.n ? ses.bounces / ses.n : 0, pagesPerSession: ses.ppv, productViews: this.all(`SELECT COUNT(*) AS n FROM hits WHERE ${w} AND path LIKE '/produit/%'`, ...b)[0].n },
      series: this.all(`SELECT ${byHour ? 'hour' : 'day'} AS k, COUNT(*) AS pv, COUNT(DISTINCT vid) AS v FROM hits WHERE ${w} GROUP BY k ORDER BY k`, ...b),
      pages: top('path'), products: top('path', "AND path LIKE '/produit/%'"), sources: top('ref'), countries: top('country'), devices: top('device'), browsers: top('browser'), os: top('os'),
      entries: this.all(`SELECT entry AS k, COUNT(*) AS pv FROM sessions WHERE ${s.w} GROUP BY entry ORDER BY pv DESC LIMIT 8`, ...s.b),
      options: { device: opt('device'), country: opt('country'), src: opt('ref') }
    };
  }
  live() {
    const now = Date.now();
    const act = this.all('SELECT path, country, device, ref, first, last, pages FROM sessions WHERE last > ? ORDER BY last DESC LIMIT 60', now - 70000);
    const mins = this.all('SELECT (ts/60000) AS m, COUNT(*) AS pv FROM hits WHERE ts > ? GROUP BY m ORDER BY m', now - 30 * 60000);
    const today = parisParts(now).day;
    const t = this.all('SELECT COUNT(*) AS pv, COUNT(DISTINCT vid) AS v FROM hits WHERE day=?', today)[0];
    return { now, active: act.length, last5: this.all('SELECT COUNT(*) AS n FROM sessions WHERE last > ?', now - 300000)[0].n, sessions: act, minutes: mins, today: t,
      feed: this.all('SELECT ts, path, country, device, ref FROM hits ORDER BY id DESC LIMIT 25'),
      waitlist: this.all('SELECT COUNT(*) AS n FROM waitlist')[0].n };
  }

  // ---------- catalogue dynamique ----------
  catalog() {
    return { hidden: this.all('SELECT slug FROM hidden').map(r => r.slug), added: this.all('SELECT slug, data FROM added ORDER BY ts DESC').map(r => ({ slug: r.slug, ...JSON.parse(r.data) })) };
  }
  products() {
    const since = parisParts(Date.now() - 30 * 864e5).day, views = {};
    for (const r of this.all("SELECT path, COUNT(*) AS n FROM hits WHERE day >= ? AND path LIKE '/produit/%' GROUP BY path", since)) views[r.path.split('/')[2]] = r.n;
    return { ...this.catalog(), views };
  }
  async hide(request) {
    const b = await request.json(), slug = clean(b.slug, 80);
    if (!slug) return json({ error: 'Produit manquant.' }, 400);
    if (b.hidden) this.sql.exec('INSERT OR IGNORE INTO hidden(slug) VALUES(?)', slug); else this.sql.exec('DELETE FROM hidden WHERE slug=?', slug);
    return json({ ok: true });
  }
  async add(request) {
    const b = await request.json(), list = (v, n, len) => (Array.isArray(v) ? v : String(v || '').split(/[\n,;]+/)).map(x => clean(x, len)).filter(Boolean).slice(0, n);
    const name = clean(b.name, 90), cat = CATS.includes(b.cat) ? b.cat : null, price = Math.round(parseFloat(String(b.price).replace(',', '.')) * 100) / 100;
    const images = (Array.isArray(b.images) ? b.images : String(b.images || '').split(/\s+/)).map(u => String(u).trim()).filter(u => /^https:\/\/[^\s"'<>\\]+$/.test(u) && u.length < 400).slice(0, 8);
    if (!name) return json({ error: 'Le nom est obligatoire.' }, 400);
    if (!cat) return json({ error: 'Choisissez une catégorie.' }, 400);
    if (!(price > 0 && price < 10000)) return json({ error: 'Prix invalide.' }, 400);
    if (!images.length) return json({ error: 'Ajoutez au moins une image (adresse https).' }, 400);
    let slug = clean(b.slug, 80) && this.all('SELECT slug FROM added WHERE slug=?', clean(b.slug, 80)).length ? clean(b.slug, 80) : null;
    if (!slug) { const base = slugify(name) || 'piece'; slug = base; let i = 2; const taken = new Set((b.taken || []).map(String)); while (taken.has(slug) || this.all('SELECT slug FROM added WHERE slug=?', slug).length) slug = base + '-' + i++; }
    const data = { name, cat, price, images, colors: list(b.colors, 20, 40), sizes: list(b.sizes, 30, 30), desc: clean(b.desc, 600), details: list(b.details, 8, 90) };
    this.sql.exec('INSERT INTO added(slug,data,ts) VALUES(?,?,?) ON CONFLICT(slug) DO UPDATE SET data=excluded.data', slug, JSON.stringify(data), Date.now());
    return json({ ok: true, slug });
  }
  async del(request) {
    const b = await request.json();
    this.sql.exec('DELETE FROM added WHERE slug=?', clean(b.slug, 80));
    return json({ ok: true });
  }

  // ---------- liste d'attente ----------
  async waitlistAdd(request) {
    let body; try { body = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ error: 'Adresse e-mail invalide.' }, 400);
    this.sql.exec('INSERT OR IGNORE INTO waitlist(email,ts,source,country) VALUES(?,?,?,?)', email, Date.now(), clean(body.source, 200), clean(request.headers.get('x-country'), 2));
    return json({ ok: true });
  }

  // ---------- accès administrateur ----------
  token(request) { return (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').slice(0, 80); }
  authed(request) {
    const t = this.token(request); if (!t) return false;
    const exp = this.get('tok:' + t); return !!exp && Number(exp) > Date.now();
  }
  session() { const t = rand(24); this.sql.exec("DELETE FROM kv WHERE k LIKE 'tok:%' AND CAST(v AS INTEGER) < ?", Date.now()); this.set('tok:' + t, Date.now() + 30 * 864e5); return t; }
  async setup(request) {
    if (this.get('pw')) return json({ error: 'Le mot de passe est déjà défini.' }, 403);
    const { password } = await request.json();
    if (typeof password !== 'string' || password.length < 10) return json({ error: 'Choisissez un mot de passe d’au moins 10 caractères.' }, 400);
    const salt = rand(16); this.set('pw', salt + ':' + await pbkdf(password, salt));
    return json({ ok: true, token: this.session() });
  }
  async login(request) {
    const lock = Number(this.get('lock') || 0);
    if (lock > Date.now()) return json({ error: 'Trop d’essais. Réessayez dans une minute.' }, 429);
    const { password } = await request.json(), pw = this.get('pw');
    if (!pw) return json({ error: 'Aucun mot de passe défini.' }, 400);
    const [salt, h] = pw.split(':');
    if (typeof password !== 'string' || await pbkdf(password, salt) !== h) {
      const f = Number(this.get('fails') || 0) + 1; this.set('fails', f);
      if (f >= 5) { this.set('lock', Date.now() + 60000); this.set('fails', 0); }
      return json({ error: 'Mot de passe incorrect.' }, 401);
    }
    this.set('fails', 0);
    return json({ ok: true, token: this.session() });
  }
}

// ---------- rendu d'un produit ajouté depuis l'administration ----------
function renderProduct(tpl, slug, p) {
  const img = u => esc(u);
  const thumbs = p.images.map((u, i) => `<button type="button" class="thumb" data-src="${img(u)}" aria-label="Photo ${i + 1}"><img src="${img(u)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('');
  const chips = (arr, name, first) => arr.map((c, i) => `<label class="chip"><input type="radio" name="${name}" value="${esc(c)}"${first && i === 0 ? ' checked' : ''}><span>${esc(c)}</span></label>`).join('');
  const colors = p.colors.length ? `<fieldset><legend>Couleur</legend><div class="chips">${chips(p.colors, 'couleur', true)}</div></fieldset>` : '';
  const sizes = p.sizes.length ? `<fieldset><legend>Taille <a href="/journal/comment-choisir-sa-taille-de-soutien-gorge/">Guide des tailles</a></legend><div class="chips">${chips(p.sizes, 'taille', false)}</div></fieldset>` : '';
  const details = p.details.length ? `<details open><summary>Détails</summary><ul>${p.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul></details>` : '';
  const map = { NAME: esc(p.name), CAT: esc(p.cat), DESC: esc(p.desc), IMG0: img(p.images[0]), PRICE: euros(p.price), PRICEN: p.price.toFixed(2), SLUG: slug, THUMBS: thumbs, COLORS: colors, SIZES: sizes, DETAILS: details };
  return tpl.replace(/%%([A-Z0-9]+)%%/g, (m, k) => (k in map ? map[k] : ''));
}

let cache = { at: 0, data: null };
async function catalog(env, stub, origin) {
  if (cache.data && Date.now() - cache.at < 20000) return cache.data;
  const r = await stub.fetch(new Request(origin + '/api/catalog'));
  cache = { at: Date.now(), data: await r.json() };
  return cache.data;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), p = url.pathname;
    const stub = env.STORE.get(env.STORE.idFromName('main'));
    if (p.startsWith('/api/')) {
      const h = new Headers(request.headers);
      h.set('x-country', (request.cf && request.cf.country) || '');
      h.set('x-ip', request.headers.get('cf-connecting-ip') || '');
      const res = await stub.fetch(new Request(request, { headers: h }));
      if (p.startsWith('/api/admin/products/')) cache.at = 0;
      return res;
    }
    if (p.startsWith('/produit/')) {
      const slug = p.split('/')[2] || '';
      let cat; try { cat = await catalog(env, stub, url.origin); } catch { cat = { hidden: [], added: [] }; }
      const notFound = async () => { const r = await env.ASSETS.fetch(new Request(url.origin + '/404.html')); return new Response(r.body, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }); };
      if (cat.hidden.includes(slug)) return notFound();
      const extra = cat.added.find(x => x.slug === slug);
      if (extra) {
        const t = await env.ASSETS.fetch(new Request(url.origin + '/assets/fiche-modele.txt'));
        if (!t.ok) return notFound();
        return new Response(renderProduct(await t.text(), slug, extra), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } });
      }
    }
    return env.ASSETS.fetch(request);
  }
};
