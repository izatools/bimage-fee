/* BIMAGE Fee & Quotation — UI */
(function () {
  const CFG = window.APP_CONFIG;
  const AUTH_KEY = 'bimage-fee-auth';
  const { fmt, r2, num } = Calc;
  let db = null;
  let view = { name: '', p: null };
  const charts = [];

  /* ---------- helpers ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rm = (n) => 'RM ' + fmt(n);
  const pctS = (f) => r2(num(f) * 100);
  const dShort = (iso) => { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const monthLabel = (ym, add = 0) => { if (!ym) return ''; const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + add, 1); return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }); };
  const ymAdd = (ym, add) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + add, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  const thisYm = () => new Date().toISOString().slice(0, 7);
  const byId = (arr, id) => (arr || []).find((x) => x.id === id);
  const clientOf = (p) => byId(db.clients, p.clientId) || { name: '' };
  const toast = (msg, bad) => { const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => t.className = 'toast', 3200); };
  const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };

  const I = {
    dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
    proj: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h18v13H3z"/><path d="M8 7V4h8v3"/><path d="M3 12h18"/></svg>',
    db: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
    set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12"/><path d="M4 16V4h12"/></svg>',
  };

  /* ---------- auth ---------- */
  async function sha256(t) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const authed = () => sessionStorage.getItem(AUTH_KEY) === CFG.PASSWORD_SHA256 || localStorage.getItem(AUTH_KEY) === CFG.PASSWORD_SHA256;

  function renderGate() {
    document.title = CFG.APP_NAME;
    $('#root').innerHTML = `
      <main class="gate">
        <div class="gate-card">
          <div class="tb-head">
            <img src="assets/img/bimage-logo.jpg" alt="BIMAGE Consulting (M) Sdn Bhd">
            <h1 style="margin-top:18px;font-size:26px">Fee &amp; Quotation</h1>
            <p class="muted" style="margin:4px 0 0">BIM services fee calculator for the BIMAGE team.</p>
          </div>
          <form id="gate-form" autocomplete="off">
            <label class="f">Password<input class="in" type="password" id="pw" required autofocus></label>
            <label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="remember"> Keep me signed in on this device</label>
            <p class="err" id="pw-err" role="alert"></p>
            <button class="btn primary" type="submit" style="justify-content:center">Open</button>
          </form>
          <div class="tb-foot">
            <div>Developed by<b>${esc(CFG.DEVELOPER)}</b></div>
            <div>Version ${esc(CFG.VERSION)}<b>Updated ${dShort(CFG.UPDATED)}</b></div>
          </div>
        </div>
      </main>`;
    $('#gate-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const h = await sha256($('#pw').value);
      if (h !== CFG.PASSWORD_SHA256) { $('#pw-err').textContent = 'That password is not correct.'; $('#pw').select(); return; }
      sessionStorage.setItem(AUTH_KEY, h);
      if ($('#remember').checked) localStorage.setItem(AUTH_KEY, h);
      start();
    });
  }

  /* ---------- shell ---------- */
  function shell(active, inner) {
    const nav = [['dashboard', 'Dashboard', I.dash], ['projects', 'Projects', I.proj], ['database', 'Database', I.db], ['settings', 'Settings', I.set]];
    const gh = db.settings.github;
    const syncTxt = Store.getToken() && gh.repo ? (db.meta.lastSync ? 'Synced ' + dShort(db.meta.lastSync) : 'GitHub connected, not synced yet') : 'Saved in this browser';
    return `
    <div class="shell">
      <aside class="side" aria-label="Main">
        <div class="brand"><img src="assets/img/bimage-logo.jpg" alt="BIMAGE Consulting (M) Sdn Bhd"><span>Fee &amp; Quotation</span></div>
        <nav class="nav">${nav.map(([k, l, ic]) => `<a href="#/${k}" ${active === k ? 'aria-current="page"' : ''}>${ic}${l}</a>`).join('')}</nav>
        <div class="cta"><button class="btn primary" data-act="new-project" style="width:100%;justify-content:center">${I.plus}Create project</button></div>
        <div class="meta">
          <div><span class="sync-dot ${Store.getToken() && gh.repo ? (db.meta.lastSync ? 'ok' : 'warn') : ''}"></span>${esc(syncTxt)}</div>
          <div>Developed by <b>${esc(CFG.DEVELOPER)}</b></div>
          <div>Version ${esc(CFG.VERSION)}, updated ${dShort(CFG.UPDATED)}</div>
          <div><a href="#" data-act="logout">Sign out</a></div>
        </div>
      </aside>
      <div class="main">
        <div class="topbar"><button class="btn ghost" data-act="menu" aria-label="Open menu">${I.menu}</button><img src="assets/img/bimage-logo.jpg" alt="BIMAGE"></div>
        <main class="page" id="page">${inner}</main>
        <footer class="foot"><span>${esc(db.settings.company.name)}</span><span>Developed by ${esc(CFG.DEVELOPER)}</span><span>Version ${esc(CFG.VERSION)}</span><span>Updated ${dShort(CFG.UPDATED)}</span><span>Data last saved ${dShort(db.meta.updatedAt)}</span></footer>
      </div>
    </div>`;
  }

  /* ---------- router ---------- */
  function route() {
    charts.splice(0).forEach((c) => c.destroy());
    document.body.classList.remove('nav-open');
    const parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/');
    const [name, a, b] = parts;
    view = { name, a, b, p: null };
    let html = '';
    if (name === 'quote') {
      const p = byId(db.projects, a); if (!p) return go('#/projects');
      view.p = p;
      $('#root').innerHTML = Quote.page(p, db, Calc.compute(p));
      document.title = (p.quote.no || 'Quotation') + ' — ' + CFG.APP_NAME;
      window.scrollTo(0, 0);
      return;
    }
    if (name === 'project') {
      const p = byId(db.projects, a); if (!p) return go('#/projects');
      view.p = p; view.step = b || 'data';
      html = shell('projects', projectView(p, view.step));
    } else if (name === 'projects') html = shell('projects', projectsView());
    else if (name === 'database') html = shell('database', databaseView(a || 'staff'));
    else if (name === 'settings') html = shell('settings', settingsView());
    else { view.name = 'dashboard'; html = shell('dashboard', dashboardView()); }
    $('#root').innerHTML = html;
    document.title = CFG.APP_NAME;
    if (view.name === 'dashboard') drawDashboardCharts();
    if (view.p) paint();
  }
  const go = (h) => { if (location.hash === h) route(); else location.hash = h; };
  const rerender = () => { const y = window.scrollY; route(); window.scrollTo(0, y); };

  /* ---------- binding ---------- */
  function resolve(path) {
    const [root, rest] = path.split(':');
    let obj = root === 'p' ? view.p : db;
    const keys = rest.split('.');
    const last = keys.pop();
    for (const k of keys) obj = obj[k];
    return [obj, last];
  }
  function readInput(el) {
    const t = el.dataset.t || (el.type === 'number' ? 'num' : 'str');
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'radio') { const v = el.value; return t === 'bool' ? v === 'true' : v; }
    if (t === 'num') return el.value === '' ? '' : num(el.value);
    if (t === 'pct') return el.value === '' ? '' : r2(num(el.value)) / 100;
    if (t === 'lines') return el.value.split('\n').map((s) => s.trim()).filter(Boolean);
    return el.value;
  }
  function bind(el) {
    const [obj, key] = resolve(el.dataset.k);
    obj[key] = readInput(el);
    if (view.p) view.p.updatedAt = Store.nowIso();
    Store.save();
  }
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset || !el.dataset.k) return;
    if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio') return;
    bind(el);
    if (view.p) paint();
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.k) {
      bind(el);
      if (el.dataset.on && ON[el.dataset.on]) ON[el.dataset.on](el);
      if (el.dataset.re !== undefined) rerender(); else if (view.p) paint();
    }
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const f = ACT[t.dataset.act];
    if (!f) return;
    if (t.tagName === 'INPUT') { setTimeout(() => f(t, e), 0); return; } // let checkboxes toggle first
    e.preventDefault(); f(t, e);
  });
  window.addEventListener('hashchange', () => { if (authed()) route(); });

  /* cascade handlers after a bound value changes */
  const ON = {
    role(el) { const l = lineOf(el); const r = byId(db.roles, l.roleId); if (r) { l.role = r.name; l.rate = r.rate; if (r.allowance) l.kind = 'allowance'; else if (l.kind === 'allowance') l.kind = 'manpower'; } Store.save(); rerender(); },
    staff(el) { const l = lineOf(el); const s = byId(db.staff, l.staffId); if (s) { const r = byId(db.roles, s.roleId); if (r && !l.roleId) { l.roleId = r.id; l.role = r.name; } if (num(s.rate)) l.rate = s.rate; } Store.save(); rerender(); },
    nos(el) { const l = lineOf(el); const p = view.p; ['software', 'hardware'].forEach((k) => (p[k] || []).forEach((s) => { if (s.lineId === l.id) s.users = l.nos; })); Store.save(); },
    swItem(el) { const row = view.p.software[el.dataset.i]; const it = byId(db.software, row.itemId); if (it) row.rate = it.rate; Store.save(); rerender(); },
    hwItem(el) { const row = view.p.hardware[el.dataset.i]; const it = byId(db.hardware, row.itemId); if (it) row.rate = it.rate; Store.save(); rerender(); },
    swLine(el) { const row = view.p.software[el.dataset.i]; const l = byId(view.p.lines, row.lineId); if (l) row.users = l.nos; Store.save(); rerender(); },
    hwLine(el) { const row = view.p.hardware[el.dataset.i]; const l = byId(view.p.lines, row.lineId); if (l) row.users = l.nos; Store.save(); rerender(); },
    status(el) { const p = view.p || byId(db.projects, el.dataset.pid); logStatus(p); Store.save(); },
    optional(el) { const l = lineOf(el); const p = view.p; p.lines.filter((x) => x.pkg === l.pkg).forEach((x) => x.optional = l.optional); Store.save(); rerender(); },
    dbStatus(el) { const p = byId(db.projects, el.dataset.pid); logStatus(p); Store.save(); rerender(); },
  };
  const lineOf = (el) => view.p.lines[el.dataset.i];
  function logStatus(p) {
    p.statusLog = p.statusLog || [];
    const last = p.statusLog[p.statusLog.length - 1];
    if (!last || last.status !== p.status) p.statusLog.push({ status: p.status, date: Store.today() });
    p.updatedAt = Store.nowIso();
  }

  /* ---------- live outputs ---------- */
  function paint() {
    const p = view.p; if (!p) return;
    const c = Calc.compute(p);
    view.c = c;
    $$('[data-o]').forEach((el) => {
      const [kind, id, f] = el.dataset.o.split('|');
      let v = '';
      if (kind === 'L') v = c.L[id] ? c.L[id][f] : 0;
      else if (kind === 'P') v = c.P[id] ? c.P[id][f] : 0;
      else if (kind === 'I') v = c.items[id] ? c.items[id][f] : 0;
      else if (kind === 'T') v = id.split('.').reduce((o, k) => (o == null ? o : o[k]), c);
      else if (kind === 'SW') { const row = p.software[id]; v = row ? num(row.users) * num(row.rate) : 0; }
      else if (kind === 'HW') { const row = p.hardware[id]; v = row ? num(row.users) * num(row.rate) : 0; }
      else if (kind === 'A') { const [iid, ai] = [id, f]; const it = byId(p.quote.items, iid); const a = it && it.alloc[ai]; v = a ? poolOf(c, a.src) * num(a.pct) / 100 : 0; }
      const fm = el.dataset.f || 'm';
      el.textContent = fm === 'm' ? fmt(v) : fm === 'i' ? fmt(v, 0) : fm === 'p' ? fmt(v, 2) + '%' : fm === '1' ? fmt(v, 1) : String(v);
    });
    const g = $('#gantt'); if (g) g.innerHTML = ganttHtml(p, c);
    const cv = $('#cover'); if (cv) cv.innerHTML = coverHtml(p, c);
    const cm = $('#cover-msg'); if (cm) cm.innerHTML = coverMsg(c);
  }
  const poolOf = (c, src) => { const [t, id] = String(src || '').split(':'); return t === 'line' ? (c.L[id] ? c.L[id].pool : 0) : (c.P[id] ? c.P[id].pool : 0); };
  const out = (key, f = 'm', cls = '') => `<span data-o="${esc(key)}" data-f="${f}" class="${cls}"></span>`;

  /* ================= DASHBOARD ================= */
  const WON = ['Awarded', 'Ongoing', 'Completed'];
  const OPEN = ['Enquiry', 'Quoted'];
  function projTotals() {
    return db.projects.map((p) => ({ p, c: Calc.compute(p) }));
  }
  function dashboardView() {
    const all = projTotals();
    const cnt = (st) => all.filter((x) => st.includes(x.p.status)).length;
    const val = (st) => all.filter((x) => st.includes(x.p.status)).reduce((a, x) => a + x.c.base.grand, 0);
    const decided = cnt(WON) + cnt(['Lost']);
    const winRate = decided ? Math.round(cnt(WON) / decided * 100) : null;
    const ym = thisYm();
    const active = all.filter((x) => ['Awarded', 'Ongoing'].includes(x.p.status));
    const headsNow = active.reduce((a, x) => a + headsAt(x.p, ym), 0);
    const named = new Set(); active.forEach((x) => x.p.lines.forEach((l) => { if (l.staffId && inMonth(x.p, l, ym)) named.add(l.staffId); }));
    const totalQuoted = all.filter((x) => x.p.status !== 'Enquiry').reduce((a, x) => a + x.c.base.grand, 0);

    if (!db.projects.length) {
      return `<div class="page-head"><div><h1>Dashboard</h1></div></div>
      <div class="panel"><div class="empty"><h3>No projects yet</h3><p>Create a project to price a BIM service and generate its quotation.</p><button class="btn primary" data-act="new-project">${I.plus}Create project</button></div></div>`;
    }
    const statusRows = Store.STATUSES.map((s) => ({ s, n: cnt([s]), v: val([s]) }));
    const maxV = Math.max(1, ...statusRows.map((r) => r.v));
    const recent = all.slice().sort((a, b) => (b.p.updatedAt || '').localeCompare(a.p.updatedAt || '')).slice(0, 6);

    return `
    <div class="page-head"><div><h1>Dashboard</h1><p>${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
      <div class="btn-row"><a class="btn" href="#/projects">All projects</a><button class="btn primary" data-act="new-project">${I.plus}Create project</button></div></div>

    <section class="kpis" aria-label="Summary">
      <div class="lead"><div class="k">Quoted value (incl. SST)</div><div class="v money-v"><small>RM</small>${fmt(totalQuoted)}</div><div class="s">${all.length - cnt(['Enquiry'])} quotations issued</div></div>
      <div><div class="k">Awarded value</div><div class="v money-v"><small>RM</small>${fmt(val(WON))}</div><div class="s">${cnt(WON)} projects won</div></div>
      <div><div class="k">Open pipeline</div><div class="v money-v"><small>RM</small>${fmt(val(OPEN))}</div><div class="s">${cnt(OPEN)} enquiries and quotes</div></div>
      <div><div class="k">Projects in</div><div class="v">${all.length}</div><div class="s">${cnt(['Completed', 'Lost'])} closed</div></div>
      <div><div class="k">Win rate</div><div class="v">${winRate == null ? '—' : winRate + '%'}</div><div class="s">${decided} decided</div></div>
      <div><div class="k">Heads on site this month</div><div class="v">${fmt(headsNow, 0)}</div><div class="s">${named.size} named, ${fmt(Math.max(0, headsNow - named.size), 0)} TBC</div></div>
    </section>

    <div class="dash-grid">
      <section class="panel c7"><header><div><h3>Projects in and closed</h3><p>Last 12 months. In = created; closed = awarded, completed or lost.</p></div></header>
        <div class="body"><div class="chart-box"><canvas id="ch-flow" aria-label="Projects in and closed by month"></canvas></div></div></section>
      <section class="panel c5"><header><div><h3>Amount by status</h3><p>Base scope incl. SST, optional items excluded.</p></div></header>
        <div class="body"><div class="funnel">${statusRows.map((r) => `<div class="row"><span class="pill st-${r.s}">${r.s} ${r.n}</span><div class="track"><div class="fill ${WON.includes(r.s) ? 'g' : r.s === 'Lost' ? 'r' : r.s === 'Enquiry' ? 'm' : ''}" style="width:${r.v / maxV * 100}%"></div></div><span class="r money small" style="text-align:right">${fmt(r.v, 0)}</span></div>`).join('')}</div></div></section>

      <section class="panel c8"><header><div><h3>Manpower demand</h3><p>Heads needed per month across awarded and ongoing projects. Quoted projects shown as tentative.</p></div>
        <label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="mp-tent" checked data-act="mp-toggle"> Include quoted</label></header>
        <div class="body"><div class="chart-box" style="height:300px"><canvas id="ch-mp" aria-label="Manpower demand by month"></canvas></div></div></section>
      <section class="panel c4"><header><div><h3>Team this month</h3><p>${monthLabel(ym)} assignments</p></div><a class="btn sm" href="#/database/staff">Staff</a></header>
        <div class="tbl-wrap">${teamNowHtml(ym)}</div></section>

      <section class="panel c12"><header><div><h3>Recently updated</h3></div><a class="btn sm" href="#/projects">All projects</a></header>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Code</th><th>Project</th><th>Client</th><th>Status</th><th class="r">BIM months</th><th class="r">Peak heads</th><th class="r">Total incl. SST (RM)</th><th>Updated</th></tr></thead><tbody>
        ${recent.map(({ p, c }) => `<tr><td><a class="row-link" href="#/project/${p.id}">${esc(p.code || '—')}</a></td><td>${esc(p.shortName || trunc(p.name, 60))}</td><td>${esc(clientOf(p).name)}</td><td><span class="pill st-${p.status}">${p.status}</span></td><td class="r">${p.bimMonths || '—'}</td><td class="r">${c.peakHeads}</td><td class="r money">${fmt(c.base.grand)}</td><td class="nowrap">${dShort(p.updatedAt)}</td></tr>`).join('')}
        </tbody></table></div></section>
    </div>`;
  }
  const trunc = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  function inMonth(p, l, ym) {
    if (!p.commencement) return false;
    const s = ymAdd(p.commencement, num(l.start) - 1), e = ymAdd(p.commencement, num(l.end) - 1);
    return ym >= s && ym <= e;
  }
  const headsAt = (p, ym) => p.lines.filter((l) => !l.optional && l.kind !== 'allowance' && inMonth(p, l, ym)).reduce((a, l) => a + num(l.nos), 0);
  function teamNowHtml(ym) {
    const rows = [];
    db.projects.filter((p) => ['Awarded', 'Ongoing'].includes(p.status)).forEach((p) => p.lines.forEach((l) => {
      if (l.optional || l.kind === 'allowance' || !inMonth(p, l, ym)) return;
      const s = byId(db.staff, l.staffId);
      rows.push({ name: s ? s.name : 'TBC', role: l.role, disp: l.disp, code: p.code, pid: p.id, nos: l.nos, until: monthLabel(p.commencement, num(l.end) - 1) });
    }));
    if (!rows.length) return '<div class="empty small">No one is deployed this month. Mark a project Awarded and set its commencement month to see the team here.</div>';
    rows.sort((a, b) => (a.name === 'TBC') - (b.name === 'TBC') || a.name.localeCompare(b.name));
    return `<table class="tbl"><thead><tr><th>Name</th><th>Role</th><th>Project</th><th>Until</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.name === 'TBC' ? `<span class="muted">TBC${r.nos > 1 ? ' × ' + r.nos : ''}</span>` : esc(r.name)}</td><td>${esc(r.role)}<div class="muted small">${esc(r.disp)}</div></td><td><a class="row-link" href="#/project/${r.pid}">${esc(r.code)}</a></td><td class="nowrap">${r.until}</td></tr>`).join('')}</tbody></table>`;
  }
  function drawDashboardCharts() {
    if (!window.Chart || !db.projects.length) return;
    Chart.defaults.font.family = "'Barlow', system-ui, sans-serif";
    Chart.defaults.color = '#6a7075';
    // flow chart
    const months = []; for (let i = 11; i >= 0; i--) months.push(ymAdd(thisYm(), -i));
    const inC = months.map((m) => db.projects.filter((p) => (p.createdAt || '').slice(0, 7) === m).length);
    const closedAt = (p) => { const e = (p.statusLog || []).find((s) => ['Awarded', 'Lost', 'Completed'].includes(s.status)); return e ? e.date.slice(0, 7) : null; };
    const wonC = months.map((m) => db.projects.filter((p) => closedAt(p) === m && (p.statusLog || []).find((s) => s.date.slice(0, 7) === m && WON.includes(s.status))).length);
    const lostC = months.map((m) => db.projects.filter((p) => closedAt(p) === m && p.status === 'Lost').length);
    const el = $('#ch-flow');
    if (el) charts.push(new Chart(el, {
      type: 'bar',
      data: { labels: months.map((m) => monthLabel(m)), datasets: [
        { label: 'In', data: inC, backgroundColor: '#26282b', borderRadius: 2, maxBarThickness: 18 },
        { label: 'Won', data: wonC, backgroundColor: '#1f9d48', borderRadius: 2, maxBarThickness: 18 },
        { label: 'Lost', data: lostC, backgroundColor: '#b23a26', borderRadius: 2, maxBarThickness: 18 },
      ] },
      options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eceeed' } }, x: { grid: { display: false } } } },
    }));
    drawManpower();
  }
  function drawManpower() {
    const el = $('#ch-mp'); if (!el) return;
    const tent = $('#mp-tent') ? $('#mp-tent').checked : true;
    const months = []; for (let i = -2; i < 22; i++) months.push(ymAdd(thisYm(), i));
    const roleNames = [...new Set(db.projects.flatMap((p) => p.lines.filter((l) => l.kind !== 'allowance').map((l) => l.role)))];
    const palette = ['#26282b', '#1f9d48', '#5d6a72', '#7cc191', '#9aa1a5', '#137a35', '#c9cfcb', '#3e7c58', '#b97700'];
    const ds = roleNames.map((rn, i) => ({
      label: rn, stack: 'w', backgroundColor: palette[i % palette.length], borderRadius: 1, maxBarThickness: 22,
      data: months.map((m) => db.projects.filter((p) => ['Awarded', 'Ongoing'].includes(p.status)).reduce((a, p) => a + p.lines.filter((l) => l.role === rn && !l.optional && l.kind !== 'allowance' && inMonth(p, l, m)).reduce((x, l) => x + num(l.nos), 0), 0)),
    })).filter((d) => d.data.some((v) => v));
    if (tent) ds.push({
      label: 'Quoted (tentative)', stack: 'w', backgroundColor: 'rgba(185,119,0,0.25)', borderColor: '#b97700', borderWidth: 1, borderDash: [3, 3], maxBarThickness: 22,
      data: months.map((m) => db.projects.filter((p) => p.status === 'Quoted').reduce((a, p) => a + headsAt(p, m), 0)),
    });
    const old = charts.findIndex((c) => c.canvas === el); if (old >= 0) charts.splice(old, 1)[0].destroy();
    charts.push(new Chart(el, {
      type: 'bar', data: { labels: months.map((m) => monthLabel(m)), datasets: ds },
      options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } }, tooltip: { mode: 'index' } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Heads' }, grid: { color: '#eceeed' } } } },
    }));
  }

  /* ================= PROJECTS LIST ================= */
  function projectsView() {
    const q = (view.a || '').toLowerCase();
    const f = sessionStorage.getItem('bf-filter') || 'All';
    const list = projTotals().filter(({ p }) => (f === 'All' || p.status === f))
      .sort((a, b) => (b.p.updatedAt || '').localeCompare(a.p.updatedAt || ''));
    return `
    <div class="page-head"><div><h1>Projects</h1><p>${db.projects.length} projects. Status changes are logged for the dashboard.</p></div>
      <div class="btn-row"><button class="btn primary" data-act="new-project">${I.plus}Create project</button></div></div>
    <div class="btn-row" style="margin-bottom:14px" role="group" aria-label="Filter by status">
      ${['All', ...Store.STATUSES].map((s) => `<button class="btn sm ${f === s ? 'dark' : ''}" data-act="filter" data-v="${s}">${s}${s === 'All' ? '' : ' ' + db.projects.filter((p) => p.status === s).length}</button>`).join('')}
      <input class="in" style="max-width:260px;margin-left:auto" type="search" placeholder="Search code, project or client" id="p-search" value="${esc(q)}" aria-label="Search projects">
    </div>
    <div class="panel"><div class="tbl-wrap">
    ${list.length ? `<table class="tbl" id="p-table"><thead><tr><th>Code</th><th>Project</th><th>Client</th><th>Type</th><th>Status</th><th class="r">BIM months</th><th class="r">Team</th><th class="r">Total excl. SST</th><th class="r">Total incl. SST</th><th>Quotation</th><th></th></tr></thead><tbody>
      ${list.map(({ p, c }) => `<tr data-search="${esc((p.code + ' ' + p.name + ' ' + (p.shortName || '') + ' ' + clientOf(p).name).toLowerCase())}">
        <td><a class="row-link" href="#/project/${p.id}">${esc(p.code || '—')}</a></td>
        <td style="max-width:360px">${esc(p.shortName || trunc(p.name, 80))}</td>
        <td>${esc(clientOf(p).name)}</td><td>${esc(p.sector)}</td>
        <td><select class="in" style="padding:4px 6px;width:auto" data-k="db:projects.${db.projects.indexOf(p)}.status" data-on="dbStatus" data-pid="${p.id}" aria-label="Status">${Store.STATUSES.map((s) => `<option ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
        <td class="r">${p.bimMonths || '—'}</td><td class="r">${c.peakHeads} peak</td>
        <td class="r money">${fmt(c.base.total)}</td><td class="r money"><b>${fmt(c.base.grand)}</b></td>
        <td class="nowrap">${p.quote && p.quote.items.length ? `<a class="btn sm" href="#/quote/${p.id}">${I.doc}Open</a>` : '<span class="muted small">Not built</span>'}</td>
        <td class="nowrap"><button class="icon-btn" title="Duplicate" aria-label="Duplicate" data-act="dup-project" data-id="${p.id}" style="color:var(--ink-2)">${I.copy}</button><button class="icon-btn" title="Delete" aria-label="Delete" data-act="del-project" data-id="${p.id}">${I.del}</button></td></tr>`).join('')}
      </tbody></table>` : `<div class="empty"><h3>No ${f === 'All' ? '' : f.toLowerCase() + ' '}projects</h3><p>Create a project to start pricing.</p><button class="btn primary" data-act="new-project">${I.plus}Create project</button></div>`}
    </div></div>`;
  }
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'p-search') return;
    const q = e.target.value.toLowerCase();
    $$('#p-table tbody tr').forEach((tr) => tr.hidden = q && !tr.dataset.search.includes(q));
  });

  /* ================= PROJECT EDITOR ================= */
  const STEPS = [['data', 'Project data'], ['manpower', 'Manpower'], ['software', 'Software'], ['hardware', 'Hardware'], ['summary', 'Fee summary'], ['quotation', 'Quotation']];
  function projectView(p, step) {
    const idx = Math.max(0, STEPS.findIndex((s) => s[0] === step));
    const c = Calc.compute(p);
    const done = { data: !!(p.name && p.clientId && p.bimMonths), manpower: p.lines.length > 0, software: (p.software || []).length > 0, hardware: (p.hardware || []).length > 0, summary: p.lines.length > 0, quotation: p.quote.items.length > 0 && c.allCovered };
    const body = { data: stepData, manpower: stepManpower, software: (x) => stepKit(x, 'software'), hardware: (x) => stepKit(x, 'hardware'), summary: stepSummary, quotation: stepQuotation }[STEPS[idx][0]](p, c);
    const prev = STEPS[idx - 1], next = STEPS[idx + 1];
    return `
    <div class="titleblock" aria-label="Project">
      <div><div class="k">Project</div><div class="v" title="${esc(p.name)}">${esc(p.shortName || p.name || 'Untitled project')}</div><div class="small muted">${esc(clientOf(p).name || 'No client yet')}</div></div>
      <div><div class="k">Code</div><div class="v code">${esc(p.code || '—')}</div></div>
      <div><div class="k">Status</div><select data-k="p:status" data-on="status" aria-label="Status">${Store.STATUSES.map((s) => `<option ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select><div class="small muted">Updated ${dShort(p.updatedAt)}</div></div>
      <div><div class="k">BIM service</div><div class="v">${p.bimMonths || '—'} months</div><div class="small muted">${p.commencement ? 'From ' + monthLabel(p.commencement) : 'Start month not set'}</div></div>
      <div class="grand"><div class="k">Total incl. SST ${pctS(p.sstRate)}%</div><div class="v">RM ${out('T|base.grand')}</div><small>Optional items RM ${out('T|opt.grand')}</small></div>
    </div>
    <nav class="steps" aria-label="Steps">${STEPS.map(([k, l], i) => `<a href="#/project/${p.id}/${k}" ${i === idx ? 'aria-current="step"' : ''} class="${done[k] && i !== idx ? 'done' : ''}"><span class="n">${i + 1}</span><span class="lbl-t">${l}</span></a>`).join('')}</nav>
    ${body}
    <div class="totals-bar" aria-label="Running totals">
      <div><div class="k">Manpower after margin</div><div class="v">${out('T|fee.base.after')}</div></div>
      <div><div class="k">Software</div><div class="v">${out('T|fee.base.sw')}</div></div>
      <div><div class="k">Hardware</div><div class="v">${out('T|fee.base.hw')}</div></div>
      <div><div class="k">Total excl. SST</div><div class="v">${out('T|base.total')}</div></div>
      <div><div class="k">SST ${pctS(p.sstRate)}%</div><div class="v">${out('T|base.sst')}</div></div>
      <div class="nav-btns">${prev ? `<a class="btn" href="#/project/${p.id}/${prev[0]}">Back</a>` : ''}${next ? `<a class="btn dark" href="#/project/${p.id}/${next[0]}">Next: ${next[1]}</a>` : `<a class="btn primary" href="#/quote/${p.id}">${I.doc}Generate quotation</a>`}</div>
    </div>`;
  }

  /* --- step 1 --- */
  function stepData(p) {
    const infra = p.sector === 'Infrastructure';
    return `<div class="stack">
    <section class="panel"><header><div><h3>Project</h3><p>The full title appears on the quotation exactly as written.</p></div></header>
      <div class="body grid g4">
        <label class="f">Project code<input class="in" data-k="p:code" value="${esc(p.code)}" placeholder="e.g. W430"></label>
        <label class="f span2">Short name<small>Used in lists and the dashboard</small><input class="in" data-k="p:shortName" value="${esc(p.shortName)}"></label>
        <label class="f">Status<select class="in" data-k="p:status" data-on="status" data-re>${Store.STATUSES.map((s) => `<option ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label class="f span-all">Name of project (full title)<textarea class="in" rows="3" data-k="p:name">${esc(p.name)}</textarea></label>
        <label class="f span2">Name of client<div style="display:flex;gap:8px"><select class="in" data-k="p:clientId" data-re><option value="">Select client</option>${db.clients.map((c) => `<option value="${c.id}" ${p.clientId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><button class="btn" data-act="add-client" type="button">${I.plus}New</button></div></label>
        <label class="f">Developer / owner<input class="in" data-k="p:developer" value="${esc(p.developer)}"></label>
        <label class="f">Location<input class="in" data-k="p:location" value="${esc(p.location)}"></label>
        <div class="f"><span style="font-size:13.5px;font-weight:600;color:var(--ink-2)">Building or infrastructure</span>
          <div class="seg" role="radiogroup" aria-label="Building or infrastructure">${['Building', 'Infrastructure'].map((s) => `<label><input type="radio" name="sector" value="${s}" data-k="p:sector" data-re ${p.sector === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</div></div>
        <label class="f">Commencement month<small>Month 1 of the BIM service</small><input class="in" type="month" data-k="p:commencement" data-re value="${esc(p.commencement)}"></label>
      </div></section>

    <section class="panel"><header><div><h3>Size and duration</h3><p>BIM service duration drives the team phasing and meeting count.</p></div></header>
      <div class="body grid g4">
        <label class="f">Project duration<small>months</small><input class="in num" type="number" min="1" data-k="p:projectMonths" value="${esc(p.projectMonths)}"></label>
        <label class="f">BIM service duration<small>months</small><input class="in num" type="number" min="1" data-k="p:bimMonths" data-re value="${esc(p.bimMonths)}"></label>
        <label class="f">${infra ? 'Length / chainage' : 'Levels / floors involved'}<small>${infra ? 'km' : 'incl. basement, podium, roof'}</small><input class="in num" type="number" min="0" step="any" data-k="p:levels" value="${esc(p.levels)}"></label>
        <label class="f">${infra ? 'Area / packages' : 'Gross floor area'}<small>${infra ? 'e.g. 3 packages, 120 ha' : 'm²'}</small><input class="in" data-k="p:area" value="${esc(p.area)}"></label>
      </div></section>

    <section class="panel"><header><div><h3>Disciplines involved</h3><p>Each discipline gets a modeller line when the team is built.</p></div></header>
      <div class="body"><div class="chips">${Store.DISCIPLINES.map((d) => `<label class="chip"><input type="checkbox" data-act="disc" value="${esc(d)}" ${p.disciplines.includes(d) ? 'checked' : ''}><span>${esc(d)}</span></label>`).join('')}</div></div></section>

    <section class="panel"><header><div><h3>Scope of services required</h3><p>Standard ROQ items. Item B is normally provided by the client.</p></div></header>
      <div class="body"><div class="scope-grid">${Store.SCOPES.map((s) => `<label class="scope"><input type="checkbox" data-act="scope" value="${s.code}" ${p.scopes.includes(s.code) ? 'checked' : ''}><span class="code">${s.code}</span><b>${esc(s.title.replace(/ \(LOD300\/350 Design Model Provided by Client\)/, ''))}</b><small>${esc(Store.SCOPE_HINT[s.code] || '')}</small></label>`).join('')}</div></div></section>

    <section class="panel"><header><div><h3>Information from client</h3><p>If models are not provided, new LOD300 modelling becomes part of the base scope and reconciliation is dropped.</p></div></header>
      <div class="body grid g3">
        <div class="f"><span style="font-size:13.5px;font-weight:600;color:var(--ink-2)">Drawings provided</span><div class="seg">${[['true', 'Yes'], ['false', 'No']].map(([v, l]) => `<label><input type="radio" name="dp" value="${v}" data-t="bool" data-k="p:drawingsProvided" ${String(!!p.drawingsProvided) === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
        <div class="f"><span style="font-size:13.5px;font-weight:600;color:var(--ink-2)">Models (LOD300/350) provided</span><div class="seg">${[['true', 'Yes'], ['false', 'No']].map(([v, l]) => `<label><input type="radio" name="mp" value="${v}" data-t="bool" data-k="p:modelsProvided" ${String(!!p.modelsProvided) === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
        <div></div>
        <label class="f span-all">Information to be provided by client<small>Printed on the quotation</small><textarea class="in" rows="2" data-k="p:infoByClient">${esc(p.infoByClient)}</textarea></label>
      </div></section>

    <section class="panel"><header><div><h3>Commercial</h3></div></header>
      <div class="body grid g4">
        <label class="f">Profit margin<small>% on manpower</small><input class="in num" type="number" step="0.5" data-t="pct" data-k="p:margin" value="${pctS(p.margin)}"></label>
        <label class="f">SST<small>%</small><input class="in num" type="number" step="0.5" data-t="pct" data-k="p:sstRate" data-re value="${pctS(p.sstRate)}"></label>
      </div></section>

    <section class="panel" style="border-color:var(--ink)"><div class="body" style="display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap">
      <div><h3>Build team and quotation from this data</h3><p class="muted" style="margin:4px 0 0">Creates manpower lines, one licence and one laptop set per head, and quotation items with their splits. ${p.lines.length ? '<b style="color:var(--amber)">This replaces the current ' + p.lines.length + ' manpower lines and quotation items.</b>' : ''}</p></div>
      <button class="btn primary" data-act="build">Build team and quotation</button></div></section>
    </div>`;
  }

  /* --- step 2 --- */
  function lineLabel(l) { return `${l.pkg} – ${l.role}${l.disp ? ' (' + l.disp + ')' : ''}`; }
  function stepManpower(p, c) {
    const rows = [];
    let lastPkg = null;
    const order = c.pkgOrder;
    order.forEach((pk) => {
      const P = c.P[pk];
      rows.push(`<tr class="grp ${P.optional ? 'opt' : ''}"><td colspan="9"><div style="display:flex;gap:10px;align-items:center"><input class="pkg-name" data-old="${esc(pk)}" value="${esc(pk)}" size="${Math.max(18, pk.length + 2)}" aria-label="Package name" title="Rename package">${P.optional ? '<span class="pill" style="color:var(--amber);font-family:var(--font)">Optional, priced separately</span>' : ''}<button class="btn sm ghost" data-act="add-line" data-pkg="${esc(pk)}">${I.plus}Add person here</button></div></td><td class="out">${out('P|' + pk + '|cost')}</td><td class="out">${out('P|' + pk + '|after')}</td><td colspan="3"></td></tr>`);
      P.lines.forEach((lid) => {
        const i = p.lines.findIndex((x) => x.id === lid), l = p.lines[i];
        const k = (f) => `data-k="p:lines.${i}.${f}" data-i="${i}"`;
        rows.push(`<tr class="${l.optional ? 'opt' : ''}">
          <td><input class="w-it" ${k('items')} value="${esc(l.items)}" aria-label="ROQ items"></td>
          <td><select class="w-role" ${k('roleId')} data-on="role" aria-label="Role"><option value="">Role</option>${db.roles.map((r) => `<option value="${r.id}" ${l.roleId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></td>
          <td><input class="w-role" ${k('disp')} value="${esc(l.disp)}" aria-label="Discipline"></td>
          <td>${l.kind === 'allowance' ? '<span class="muted small">n/a</span>' : `<select class="w-name" ${k('staffId')} data-on="staff" aria-label="Name"><option value="">TBC</option>${db.staff.filter((s) => s.status !== 'Inactive' || s.id === l.staffId).map((s) => `<option value="${s.id}" ${l.staffId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`}</td>
          <td><input class="num w-xs" type="number" min="0" ${k('nos')} data-on="nos" value="${esc(l.nos)}" aria-label="Nos"></td>
          <td><input class="num w-xs" type="number" min="1" ${k('start')} value="${esc(l.start)}" aria-label="Start month"></td>
          <td><input class="num w-xs" type="number" min="1" ${k('end')} value="${esc(l.end)}" aria-label="End month"></td>
          <td class="out">${out('L|' + l.id + '|months', 'i')}</td>
          <td><input class="num w-rate" type="number" min="0" step="50" ${k('rate')} value="${esc(l.rate)}" aria-label="Rate RM per month"></td>
          <td class="out">${out('L|' + l.id + '|cost')}</td>
          <td class="out"><b>${out('L|' + l.id + '|after')}</b></td>
          <td><input class="num w-xs" type="number" step="0.5" data-t="pct" ${k('marginOverride')} value="${l.marginOverride === '' || l.marginOverride == null ? '' : pctS(l.marginOverride)}" placeholder="${pctS(p.margin)}" aria-label="Margin override %" title="Leave blank to use the project margin"></td>
          <td class="c"><input type="checkbox" ${k('optional')} data-on="optional" ${l.optional ? 'checked' : ''} title="Optional item, priced separately" aria-label="Optional"></td><td class="nowrap"><button class="icon-btn" data-act="del-line" data-i="${i}" aria-label="Delete line">${I.del}</button></td>
        </tr>`);
      });
    });
    const pkgs = [...new Set(p.lines.map((l) => l.pkg))];
    return `<div class="stack">
    <section class="panel"><header><div><h3>Manpower</h3><p>Charged as full-time heads × months, as in the fee workbook. Pick a name from Database &gt; Staff or leave TBC.</p></div>
      <div class="btn-row">
        <label class="f" style="grid-template-columns:auto 90px;align-items:center;gap:8px">Profit margin %<input class="in num" type="number" step="0.5" data-t="pct" data-k="p:margin" value="${pctS(p.margin)}" style="padding:6px 8px"></label>
        <button class="btn" data-act="add-pkg">${I.plus}Add package</button><button class="btn" data-act="add-allow">${I.plus}Add allowance</button>
      </div></header>
      ${p.lines.length ? `<div class="tbl-wrap"><table class="tbl mp"><thead><tr><th>Items</th><th>Role</th><th>Discipline</th><th>Name</th><th class="r">Nos</th><th class="r">Start</th><th class="r">End</th><th class="r">Mth</th><th class="r">Rate/mth</th><th class="r">Total</th><th class="r">After margin</th><th class="r" title="Leave blank to use the project margin">Margin %</th><th title="Optional, priced separately">Opt.</th><th></th></tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr><td colspan="9">Base scope</td><td class="out">${out('T|fee.base.cost')}</td><td class="out">${out('T|fee.base.after')}</td><td colspan="3"></td></tr>
        ${c.fee.opt.cost ? `<tr><td colspan="9" style="font-weight:600">Optional items</td><td class="out">${out('T|fee.opt.cost')}</td><td class="out">${out('T|fee.opt.after')}</td><td colspan="3"></td></tr>` : ''}</tfoot></table>
        <datalist id="pkg-list">${pkgs.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></div>`
        : `<div class="empty"><h3>No manpower yet</h3><p>Build the team from the project data, or add people one by one.</p><div class="btn-row" style="justify-content:center"><a class="btn dark" href="#/project/${p.id}/data">Go to project data</a><button class="btn" data-act="add-line">${I.plus}Add person</button></div></div>`}
    </section>
    <section class="panel"><header><div><h3>Deployment programme</h3><p>Bars follow start and end month. The bottom row counts heads per month (base scope).</p></div>
      <div class="legend"><span><i style="background:var(--ink)"></i>Manpower</span><span><i style="background:#9aa1a5"></i>Allowance</span><span><i style="background:var(--amber)"></i>Optional</span></div></header>
      <div class="body tbl-wrap"><div id="gantt"></div></div></section>
    <section class="panel"><div class="body grid g4">
      <div><div class="muted small">Charged person-months</div><b style="font-size:20px">${out('T|chargedPM', 'i')}</b></div>
      <div><div class="muted small">Peak heads</div><b style="font-size:20px">${out('T|peakHeads', 'i')}</b></div>
      <div><div class="muted small">Average fee per month (excl. SST)</div><b style="font-size:20px">RM ${out('T|avgMonthly')}</b></div>
      <div><div class="muted small">Margin earned on manpower</div><b style="font-size:20px">RM <span id="margin-earned">${fmt(c.fee.base.after - c.fee.base.cost)}</span></b></div>
    </div></section></div>`;
  }
  function ganttHtml(p, c) {
    const lines = p.lines;
    if (!lines.length) return '<div class="muted small">No lines yet.</div>';
    const N = Math.max(1, num(p.bimMonths), ...lines.map((l) => num(l.end)));
    const cells = [];
    cells.push('<div class="lbl mh" style="justify-content:flex-start">Month</div>');
    for (let m = 1; m <= N; m++) cells.push(`<div class="mh" title="${p.commencement ? monthLabel(p.commencement, m - 1) : ''}">${m}</div>`);
    lines.forEach((l) => {
      cells.push(`<div class="lbl" title="${esc(lineLabel(l))}">${l.nos > 1 ? l.nos + ' × ' : ''}${esc(l.role)}${l.disp && l.disp !== 'All' ? ', ' + esc(l.disp) : ''}</div>`);
      const s = num(l.start), e = num(l.end);
      for (let m = 1; m <= N; m++) {
        const on = m >= s && m <= e;
        cells.push(`<div class="cell">${on ? `<div class="bar ${l.kind === 'allowance' ? 'al' : ''} ${l.optional ? 'op' : ''} ${m === s ? 's' : ''} ${m === e ? 'e' : ''}" style="width:100%"></div>` : ''}</div>`);
      }
    });
    const heads = []; for (let m = 1; m <= N; m++) heads.push(lines.filter((l) => !l.optional && l.kind !== 'allowance' && m >= num(l.start) && m <= num(l.end)).reduce((a, l) => a + num(l.nos), 0));
    const pk = Math.max(...heads);
    cells.push('<div class="lbl hd">Heads (base)</div>');
    heads.forEach((h) => cells.push(`<div class="hd ${h === pk && h ? 'hot' : ''}">${h || ''}</div>`));
    return `<div class="gantt" style="--cols:${N}">${cells.join('')}</div>`;
  }

  /* --- steps 3 & 4 --- */
  function stepKit(p, kind) {
    const isSw = kind === 'software';
    const lib = isSw ? db.software : db.hardware;
    const rows = p[kind] || [];
    const lineOpts = (sel) => p.lines.filter((l) => l.kind !== 'allowance').map((l) => `<option value="${l.id}" ${sel === l.id ? 'selected' : ''}>${esc(lineLabel(l))}${l.optional ? ' [optional]' : ''}</option>`).join('');
    const c = Calc.compute(p);
    const pkgRows = c.pkgOrder.map((pk) => ({ pk, P: c.P[pk], users: rows.filter((r) => c.P[pk].lines.includes(r.lineId)).reduce((a, r) => a + num(r.users), 0) }));
    return `<div class="stack">
    <section class="panel"><header><div><h3>${isSw ? 'Software licences' : 'Hardware'}</h3><p>${isSw ? 'One licence per unique user. Each row is tied to a manpower line so it lands in the right quotation item.' : 'One set per unique user, charged one-off. Each row is tied to a manpower line.'}</p></div>
      <div class="btn-row"><button class="btn" data-act="kit-auto" data-kind="${kind}">One per head (fill gaps)</button><button class="btn" data-act="kit-add" data-kind="${kind}">${I.plus}Add ${isSw ? 'software' : 'hardware'}</button></div></header>
      ${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>For manpower line</th><th>${isSw ? 'Software' : 'Item'}</th><th class="r">Users</th><th class="r">Rate (RM/user)</th><th class="r">Total (RM)</th><th></th></tr></thead><tbody>
        ${rows.map((r, i) => { const l = byId(p.lines, r.lineId); return `<tr class="${l && l.optional ? 'opt' : ''}">
          <td><select class="w-l" data-k="p:${kind}.${i}.lineId" data-i="${i}" data-on="${isSw ? 'swLine' : 'hwLine'}" aria-label="Manpower line"><option value="">Select line</option>${lineOpts(r.lineId)}</select></td>
          <td><select class="w-l" data-k="p:${kind}.${i}.itemId" data-i="${i}" data-on="${isSw ? 'swItem' : 'hwItem'}" aria-label="Item">${lib.map((s) => `<option value="${s.id}" ${r.itemId === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></td>
          <td class="r"><input class="num w-xs" type="number" min="0" data-k="p:${kind}.${i}.users" value="${esc(r.users)}" aria-label="Users"></td>
          <td class="r"><input class="num w-m" type="number" min="0" step="100" data-k="p:${kind}.${i}.rate" value="${esc(r.rate)}" aria-label="Rate"></td>
          <td class="out"><b>${out((isSw ? 'SW|' : 'HW|') + i + '|x')}</b></td>
          <td><button class="icon-btn" data-act="kit-del" data-kind="${kind}" data-i="${i}" aria-label="Delete">${I.del}</button></td></tr>`; }).join('')}
        </tbody><tfoot><tr><td colspan="4">Base scope</td><td class="out">${out('T|fee.base.' + (isSw ? 'sw' : 'hw'))}</td><td></td></tr>${c.fee.opt[isSw ? 'sw' : 'hw'] ? `<tr><td colspan="4" style="font-weight:600">Optional items</td><td class="out">${out('T|fee.opt.' + (isSw ? 'sw' : 'hw'))}</td><td></td></tr>` : ''}</tfoot></table></div>`
        : `<div class="empty"><h3>No ${isSw ? 'software' : 'hardware'} added</h3><p>Use "One per head" to give every person on the team ${isSw ? 'a licence' : 'a laptop and monitor set'}.</p></div>`}
    </section>
    <section class="panel"><header><div><h3>By package</h3><p>Same layout as the Fee ${isSw ? 'License' : 'Hardware'} sheet.</p></div></header>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Package</th><th class="r">Users</th><th class="r">Total (RM)</th></tr></thead><tbody>
      ${pkgRows.map((r) => `<tr class="${r.P.optional ? 'opt' : ''}"><td>${esc(r.pk)}${r.P.optional ? ' <span class="muted small">(optional)</span>' : ''}</td><td class="r">${r.users}</td><td class="out">${out('P|' + r.pk + '|' + (isSw ? 'sw' : 'hw'))}</td></tr>`).join('')}
      </tbody></table></div></section>
    <section class="panel"><header><div><h3>${isSw ? 'Software' : 'Hardware'} rates in the database</h3><p>Change default rates in Database. Rows above keep the rate they were added with.</p></div><a class="btn sm" href="#/database/${kind}">Edit rates</a></header>
      <div class="tbl-wrap"><table class="tbl"><tbody>${lib.map((s) => `<tr><td>${esc(s.name)}</td><td class="muted small">${esc(s.note || '')}</td><td class="r money">${fmt(s.rate)}</td></tr>`).join('')}</tbody></table></div></section>
    </div>`;
  }

  /* --- step 5 --- */
  function teamText(P, p) {
    const ls = P.lines.map((id) => byId(p.lines, id)).filter((l) => l.kind !== 'allowance');
    if (!ls.length) return 'Allowance';
    const months = ls.map((l) => Calc.months(l));
    const mx = Math.max(...months), same = months.every((m) => m === mx);
    return `${P.heads} NOS - ${same ? '' : 'up to '}${mx} months`;
  }
  function stepSummary(p, c) {
    const base = c.pkgOrder.filter((k) => !c.P[k].optional), opt = c.pkgOrder.filter((k) => c.P[k].optional);
    const row = (k) => `<tr><td>${esc(k)}</td><td class="muted">${teamText(c.P[k], p)}</td><td class="out">${out('P|' + k + '|cost')}</td><td class="out">${out('P|' + k + '|after')}</td><td class="out">${out('P|' + k + '|sw')}</td><td class="out">${out('P|' + k + '|hw')}</td><td class="out"><b>${out('P|' + k + '|pool')}</b></td></tr>`;
    const head = '<thead><tr><th>Package</th><th>Team</th><th class="r">Manpower cost</th><th class="r">Manpower (after margin)</th><th class="r">Licence</th><th class="r">Laptop &amp; monitor</th><th class="r">Total (RM)</th></tr></thead>';
    const marginAmt = c.fee.base.after - c.fee.base.cost;
    return `<div class="stack">
    <section class="panel"><header><div><h3>Fee summary</h3><p>All figures in RM. Manpower includes margin. Mirrors the Fee Summary sheet.</p></div></header>
      <div class="tbl-wrap"><table class="tbl">${head}<tbody>${base.map(row).join('')}</tbody>
      <tfoot><tr><td colspan="2">Total (before SST)</td><td class="out">${out('T|fee.base.cost')}</td><td class="out">${out('T|fee.base.after')}</td><td class="out">${out('T|fee.base.sw')}</td><td class="out">${out('T|fee.base.hw')}</td><td class="out">${out('T|fee.base.pool')}</td></tr>
      <tr><td colspan="6" style="font-weight:600">SST ${pctS(p.sstRate)}%</td><td class="out">${fmt(r2(c.fee.base.pool * num(p.sstRate)))}</td></tr>
      <tr><td colspan="6">Final amount, base scope</td><td class="out" style="font-size:17px">${fmt(r2(c.fee.base.pool * (1 + num(p.sstRate))))}</td></tr></tfoot></table></div></section>
    ${opt.length ? `<section class="panel"><header><div><h3>Optional, priced separately</h3><p>Not included above.</p></div></header>
      <div class="tbl-wrap"><table class="tbl">${head}<tbody>${opt.map(row).join('')}</tbody>
      <tfoot><tr><td colspan="6">Total (before SST)</td><td class="out">${out('T|fee.opt.pool')}</td></tr><tr><td colspan="6" style="font-weight:600">SST ${pctS(p.sstRate)}%</td><td class="out">${fmt(r2(c.fee.opt.pool * num(p.sstRate)))}</td></tr><tr><td colspan="6">Final amount, optional</td><td class="out">${fmt(r2(c.fee.opt.pool * (1 + num(p.sstRate))))}</td></tr></tfoot></table></div></section>` : ''}
    <section class="panel"><header><div><h3>Checks</h3></div></header><div class="body grid g4">
      <div><div class="muted small">Manpower cost before margin</div><b style="font-size:20px">RM ${fmt(c.fee.base.cost)}</b></div>
      <div><div class="muted small">Margin earned (${pctS(p.margin)}% default)</div><b style="font-size:20px">RM ${fmt(marginAmt)}</b><div class="small muted">${c.fee.base.pool ? fmt(marginAmt / c.fee.base.pool * 100, 1) : 0}% of total fee</div></div>
      <div><div class="muted small">Charged person-months</div><b style="font-size:20px">${fmt(c.chargedPM, 0)}</b><div class="small muted">Over ${c.span} months, peak ${c.peakHeads} heads</div></div>
      <div><div class="muted small">Average monthly fee (excl. SST)</div><b style="font-size:20px">RM ${fmt(c.fee.base.pool / (c.span || 1))}</b></div>
      <div class="span-all">${p.quote.items.length ? (Math.abs(c.feeVsQuote) < 1 ? `<div class="note ok">Quotation total matches the fee summary${c.feeVsQuote ? ' (rounding difference RM ' + fmt(c.feeVsQuote) + ' from per-session rates)' : ''}.</div>` : `<div class="note">Quotation total differs from the fee summary by RM ${fmt(c.feeVsQuote)}. Check the splits in step 6.</div>`) : '<div class="note">No quotation items yet. Build them in step 1 or add them in step 6.</div>'}</div>
    </div></section></div>`;
  }

  /* --- step 6 --- */
  function srcOptions(p, c, sel) {
    const lines = p.lines.map((l) => `<option value="line:${l.id}" ${sel === 'line:' + l.id ? 'selected' : ''}>${esc(lineLabel(l))}</option>`).join('');
    const pk = c.pkgOrder.map((k) => `<option value="pkg:${esc(k)}" ${sel === 'pkg:' + k ? 'selected' : ''}>Whole package: ${esc(k)}</option>`).join('');
    return `<option value="">Select source</option><optgroup label="Manpower lines (incl. their licence and hardware)">${lines}</optgroup><optgroup label="Packages">${pk}</optgroup>`;
  }
  function coverMsg(c) {
    return c.allCovered ? '<div class="note ok">Every manpower line is allocated 100% across the quotation items.</div>'
      : '<div class="note">Some lines are not allocated 100%. The quotation total will not match the fee summary until each line totals 100%.</div>';
  }
  function coverHtml(p, c) {
    return c.coverage.map((cv) => { const l = byId(p.lines, cv.id); return `<div><span>${esc(lineLabel(l))}</span><span class="${cv.ok ? '' : 'bad'}">${fmt(cv.pct, 2)}%</span></div>`; }).join('');
  }
  function stepQuotation(p, c) {
    const q = p.quote;
    const cl = clientOf(p);
    const items = q.items.map((it, i) => {
      const k = (f) => `data-k="p:quote.items.${i}.${f}"`;
      const mode = it.mode || 'priced';
      const priced = mode === 'priced' || mode === 'optional';
      return `<div class="qitem ${mode}">
        <div class="qh">
          <input class="in code-in" ${k('code')} value="${esc(it.code)}" aria-label="Item no.">
          <input class="in qtitle" ${k('title')} value="${esc(it.title)}" aria-label="Title" style="font-weight:600">
          <select class="in" ${k('mode')} data-re aria-label="Pricing">${[['priced', 'Priced'], ['optional', 'Optional'], ['byclient', 'By client'], ['rateonly', 'Rate only']].map(([v, l]) => `<option value="${v}" ${mode === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <input class="in" ${k('unit')} value="${esc(it.unit)}" aria-label="Unit" placeholder="Unit">
          <input class="in num" type="number" min="0" ${k('qty')} value="${esc(it.qty)}" aria-label="Quantity" placeholder="Qty">
          <div class="r small">${mode === 'rateonly' ? `<input class="in num" type="number" ${k('manualRate')} value="${esc(it.manualRate)}" aria-label="Rate" title="Rate per ${esc(it.unit || 'unit')}">` : priced ? `<span class="muted">Rate</span><br>${out('I|' + it.id + '|rate')}` : '<span class="muted">By client</span>'}</div>
          <div class="amount">${priced ? out('I|' + it.id + '|amount') : '–'}</div>
          <button class="icon-btn" data-act="qi-del" data-i="${i}" aria-label="Delete item">${I.del}</button>
        </div>
        <div class="qb">
          <div class="grid" style="gap:8px">
            <label class="f">Description lines<small>One per line, numbered i), ii)… on the quotation</small><textarea class="in" rows="${Math.max(2, (it.subs || []).reduce((a, x) => a + Math.ceil((x.length + 1) / 70), 0) + 1)}" data-t="lines" ${k('subs')}>${esc((it.subs || []).join('\n'))}</textarea></label>
            <label class="f">Note under item<small>Optional, printed in italics</small><input class="in" ${k('note')} value="${esc(it.note || '')}"></label>
          </div>
          <div>${priced ? `<div class="f" style="font-size:13.5px;font-weight:600;color:var(--ink-2);margin-bottom:6px">Priced from</div>
            ${(it.alloc || []).map((a, ai) => `<div class="alloc-row"><select data-k="p:quote.items.${i}.alloc.${ai}.src" data-re aria-label="Source">${srcOptions(p, c, a.src)}</select><input class="num" type="number" step="0.5" data-k="p:quote.items.${i}.alloc.${ai}.pct" value="${esc(a.pct)}" aria-label="Percent"><span class="r small">${out('A|' + it.id + '|' + ai)}</span><button class="icon-btn" data-act="al-del" data-i="${i}" data-ai="${ai}" aria-label="Remove source">${I.del}</button></div>`).join('')}
            <div class="btn-row" style="justify-content:space-between"><button class="btn sm" data-act="al-add" data-i="${i}">${I.plus}Add source</button>
            <label class="small" style="display:flex;gap:6px;align-items:center">Fixed rate<input class="in num" style="width:120px;padding:5px 7px" type="number" ${k('manualRate')} value="${esc(it.manualRate)}" placeholder="from splits" title="Overrides the split calculation"></label></div>
            <div class="btn-row" style="margin-top:8px"><button class="btn sm ghost" data-act="qi-up" data-i="${i}" aria-label="Move up">${I.up}Up</button><button class="btn sm ghost" data-act="qi-down" data-i="${i}" aria-label="Move down">${I.down}Down</button></div>`
          : `<p class="muted small">${mode === 'byclient' ? 'Shown as "By Client" with no amount.' : 'Shown with its rate only. Not added to the total.'}</p><div class="btn-row"><button class="btn sm ghost" data-act="qi-up" data-i="${i}">${I.up}Up</button><button class="btn sm ghost" data-act="qi-down" data-i="${i}">${I.down}Down</button></div>`}</div>
        </div></div>`;
    }).join('');
    return `<div class="stack">
    <section class="panel"><header><div><h3>Quotation details</h3><p>Client block comes from Database &gt; Clients${cl.name ? ': ' + esc(cl.name) : ''}.</p></div>
      <div class="btn-row"><button class="btn" data-act="docx">${I.doc}Download Word</button><a class="btn primary" href="#/quote/${p.id}">${I.doc}Generate quotation</a></div></header>
      <div class="body grid g4">
        <label class="f">Quotation no.<input class="in" data-k="p:quote.no" value="${esc(q.no)}"></label>
        <label class="f">Quotation date<input class="in" type="date" data-k="p:quote.date" value="${esc(q.date)}"></label>
        <label class="f">Validity<input class="in" data-k="p:quote.validity" value="${esc(q.validity)}"></label>
        <label class="f">Terms<input class="in" data-k="p:quote.terms" value="${esc(q.terms)}"></label>
        <label class="f">Issued by<input class="in" data-k="p:quote.issuedBy" value="${esc(q.issuedBy)}"></label>
        <label class="f">Reference<input class="in" data-k="p:quote.reference" value="${esc(q.reference)}"></label>
        <label class="f">Contact<input class="in" data-k="p:quote.contact" value="${esc(q.contact)}"></label>
        <label class="f">Attention<small>Blank uses the client's contact</small><input class="in" data-k="p:quote.attention" value="${esc(q.attention || '')}" placeholder="${esc(cl.attention || '')}"></label>
        <label class="f span-all">Opening line<input class="in" data-k="p:quote.intro" value="${esc(q.intro)}"></label>
        <label class="small span-all" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-k="p:quote.showTeam" ${q.showTeam !== false ? 'checked' : ''}> Print the BIM team deployment list under project details</label>
      </div></section>
    <section class="panel"><header><div><h3>Order details</h3><p>Each item takes a % of manpower lines (each line carries its own licence and hardware). Rate = amount ÷ quantity.</p></div>
      <button class="btn" data-act="qi-add">${I.plus}Add item</button></header>
      <div class="body">${items || '<div class="empty"><h3>No items</h3><p>Build them from project data (step 1) or add items here.</p></div>'}</div></section>
    <section class="panel"><header><div><h3>Allocation check</h3><p>Each manpower line should total 100% across the items.</p></div></header>
      <div class="body"><div id="cover-msg" style="margin-bottom:12px"></div><div class="cover-list" id="cover"></div></div></section>
    <section class="panel"><header><div><h3>Notes on the quotation</h3></div></header>
      <div class="body"><label class="f">One note per line<textarea class="in" rows="6" data-t="lines" data-k="p:quote.notes">${esc((q.notes || []).join('\n'))}</textarea></label></div></section>
    <section class="panel"><div class="body grid g4">
      <div><div class="muted small">Total (RM)</div><b style="font-size:20px">${out('T|base.total')}</b></div>
      <div><div class="muted small">SST ${pctS(p.sstRate)}% (RM)</div><b style="font-size:20px">${out('T|base.sst')}</b></div>
      <div><div class="muted small">Total amount (RM)</div><b style="font-size:20px;color:var(--green-ink)">${out('T|base.grand')}</b></div>
      <div><div class="muted small">Optional, incl. SST (RM)</div><b style="font-size:20px">${out('T|opt.grand')}</b></div>
    </div></section></div>`;
  }

  /* ================= DATABASE ================= */
  const DB_TABS = [['staff', 'Staff'], ['roles', 'Roles and rates'], ['software', 'Software'], ['hardware', 'Hardware'], ['clients', 'Clients']];
  function databaseView(tab) {
    const t = DB_TABS.find((x) => x[0] === tab) ? tab : 'staff';
    const content = { staff: dbStaff, roles: dbRoles, software: () => dbKit('software'), hardware: () => dbKit('hardware'), clients: dbClients }[t]();
    return `<div class="page-head"><div><h1>Database</h1><p>Shared lists used by every project. Changes save automatically.</p></div></div>
      <nav class="tabs">${DB_TABS.map(([k, l]) => `<a href="#/database/${k}" ${k === t ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>${content}`;
  }
  function dbStaff() {
    const ym = thisYm();
    const assign = (s) => db.projects.filter((p) => ['Awarded', 'Ongoing', 'Quoted'].includes(p.status)).flatMap((p) => p.lines.filter((l) => l.staffId === s.id).map((l) => ({ p, l })));
    return `<section class="panel"><header><div><h3>Staff</h3><p>Names appear in the manpower step. Rate here overrides the role rate when the person is picked.</p></div><button class="btn primary" data-act="db-add" data-list="staff">${I.plus}Add staff</button></header>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Default role</th><th class="r">Rate (RM/mth)</th><th>Email</th><th>Status</th><th>Assignments</th><th></th></tr></thead><tbody>
    ${db.staff.map((s, i) => { const as = assign(s); return `<tr>
      <td><input class="w-l" data-k="db:staff.${i}.name" value="${esc(s.name)}" aria-label="Name"></td>
      <td><select data-k="db:staff.${i}.roleId" aria-label="Role"><option value="">—</option>${db.roles.filter((r) => !r.allowance).map((r) => `<option value="${r.id}" ${s.roleId === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></td>
      <td><input class="num w-m" type="number" data-k="db:staff.${i}.rate" value="${esc(s.rate)}" aria-label="Rate"></td>
      <td><input data-k="db:staff.${i}.email" value="${esc(s.email || '')}" aria-label="Email"></td>
      <td><select data-k="db:staff.${i}.status" aria-label="Status">${['Active', 'Inactive'].map((x) => `<option ${s.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
      <td class="small">${as.length ? as.map(({ p, l }) => `<a href="#/project/${p.id}/manpower">${esc(p.code)}</a> <span class="muted">${p.commencement ? monthLabel(p.commencement, l.start - 1) + '–' + monthLabel(p.commencement, l.end - 1) : 'M' + l.start + '–' + l.end}${inMonth(p, l, ym) ? ', now' : ''}</span>`).join('<br>') : '<span class="muted">Available</span>'}</td>
      <td><button class="icon-btn" data-act="db-del" data-list="staff" data-i="${i}" aria-label="Delete">${I.del}</button></td></tr>`; }).join('')}
    </tbody></table></div></section>`;
  }
  function dbRoles() {
    return `<section class="panel"><header><div><h3>Roles and monthly rates</h3><p>Default RM per month, before margin. Picked when a role is chosen on a manpower line.</p></div><button class="btn primary" data-act="db-add" data-list="roles">${I.plus}Add role</button></header>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Role</th><th class="r">Rate (RM/mth)</th><th class="r">Day rate incl. ${pctS(db.settings.defaultMargin)}% margin</th><th>Allowance type</th><th></th></tr></thead><tbody>
    ${db.roles.map((r, i) => `<tr><td><input class="w-l" data-k="db:roles.${i}.name" value="${esc(r.name)}" aria-label="Role"></td>
      <td class="r"><input class="num w-m" type="number" step="50" data-k="db:roles.${i}.rate" data-re value="${esc(r.rate)}" aria-label="Rate"></td>
      <td class="r money">${fmt(num(r.rate) * (1 + num(db.settings.defaultMargin)) / (db.settings.workingDays || 22))}</td>
      <td><input type="checkbox" data-k="db:roles.${i}.allowance" ${r.allowance ? 'checked' : ''} aria-label="Allowance"></td>
      <td><button class="icon-btn" data-act="db-del" data-list="roles" data-i="${i}" aria-label="Delete">${I.del}</button></td></tr>`).join('')}
    </tbody></table></div></section>`;
  }
  function dbKit(kind) {
    const list = db[kind];
    return `<section class="panel"><header><div><h3>${kind === 'software' ? 'Software' : 'Hardware'}</h3><p>The first item is used when a team is built automatically.</p></div><button class="btn primary" data-act="db-add" data-list="${kind}">${I.plus}Add item</button></header>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th class="r">Rate (RM/user)</th><th>Basis / note</th><th></th></tr></thead><tbody>
    ${list.map((s, i) => `<tr><td><input class="w-l" data-k="db:${kind}.${i}.name" value="${esc(s.name)}" aria-label="Name"></td><td class="r"><input class="num w-m" type="number" step="100" data-k="db:${kind}.${i}.rate" value="${esc(s.rate)}" aria-label="Rate"></td><td><input data-k="db:${kind}.${i}.note" value="${esc(s.note || '')}" aria-label="Note"></td>
      <td class="nowrap">${i ? `<button class="icon-btn" data-act="db-top" data-list="${kind}" data-i="${i}" aria-label="Make default" title="Make default" style="color:var(--ink-2)">${I.up}</button>` : '<span class="pill" style="color:var(--green-ink)">Default</span>'}<button class="icon-btn" data-act="db-del" data-list="${kind}" data-i="${i}" aria-label="Delete">${I.del}</button></td></tr>`).join('')}
    </tbody></table></div></section>`;
  }
  function dbClients() {
    return `<section class="panel"><header><div><h3>Clients</h3><p>Printed in the client block of the quotation.</p></div><button class="btn primary" data-act="db-add" data-list="clients">${I.plus}Add client</button></header>
    <div class="body">${db.clients.map((c, i) => `<div class="panel" style="margin-bottom:12px"><div class="body grid g4">
      <label class="f span2">Company<input class="in" data-k="db:clients.${i}.name" value="${esc(c.name)}"></label>
      <label class="f">Registration no.<input class="in" data-k="db:clients.${i}.regNo" value="${esc(c.regNo)}"></label>
      <label class="f">Group line<input class="in" data-k="db:clients.${i}.parent" value="${esc(c.parent)}" placeholder="(A member of …)"></label>
      <label class="f span2">Address<textarea class="in" rows="3" data-k="db:clients.${i}.address">${esc(c.address)}</textarea></label>
      <div class="grid g2 span2"><label class="f">Country<input class="in" data-k="db:clients.${i}.country" value="${esc(c.country)}"></label><label class="f">Postcode<input class="in" data-k="db:clients.${i}.postcode" value="${esc(c.postcode)}"></label>
      <label class="f">Telephone<input class="in" data-k="db:clients.${i}.tel" value="${esc(c.tel)}"></label><label class="f">Email<input class="in" data-k="db:clients.${i}.email" value="${esc(c.email)}"></label></div>
      <label class="f span2">Attention<input class="in" data-k="db:clients.${i}.attention" value="${esc(c.attention)}"></label>
      <div class="span2" style="display:flex;align-items:end;justify-content:flex-end;gap:12px"><span class="muted small">${db.projects.filter((p) => p.clientId === c.id).length} projects</span><button class="btn sm danger" data-act="db-del" data-list="clients" data-i="${i}">Delete client</button></div>
    </div></div>`).join('') || '<div class="empty">No clients yet.</div>'}</div></section>`;
  }

  /* ================= SETTINGS ================= */
  function settingsView() {
    const s = db.settings, co = s.company, gh = s.github;
    return `<div class="page-head"><div><h1>Settings</h1><p>Company details for the quotation, defaults, and where the data is kept.</p></div></div>
    <div class="stack">
    <section class="panel"><header><div><h3>Company (quotation header and footer)</h3></div></header><div class="body grid g4">
      <label class="f span2">Company name<input class="in" data-k="db:settings.company.name" value="${esc(co.name)}"></label>
      <label class="f">Service tax no.<input class="in" data-k="db:settings.company.sstNo" value="${esc(co.sstNo)}"></label>
      <label class="f">Website<input class="in" data-k="db:settings.company.web" value="${esc(co.web)}"></label>
      <label class="f span2">Address<input class="in" data-k="db:settings.company.address" value="${esc(co.address)}"></label>
      <label class="f">Telephone<input class="in" data-k="db:settings.company.tel" value="${esc(co.tel)}"></label>
      <label class="f">Email<input class="in" data-k="db:settings.company.email" value="${esc(co.email)}"></label>
    </div></section>
    <section class="panel"><header><div><h3>Defaults for new projects</h3></div></header><div class="body grid g4">
      <label class="f">Profit margin %<input class="in num" type="number" step="0.5" data-t="pct" data-k="db:settings.defaultMargin" value="${pctS(s.defaultMargin)}"></label>
      <label class="f">SST %<input class="in num" type="number" step="0.5" data-t="pct" data-k="db:settings.sstRate" value="${pctS(s.sstRate)}"></label>
      <label class="f">Quotation no. prefix<small>Becomes PREFIX/2026/001</small><input class="in" data-k="db:settings.quotePrefix" value="${esc(s.quotePrefix)}"></label>
      <label class="f">Working days per month<small>For ad-hoc meeting day rate</small><input class="in num" type="number" data-k="db:settings.workingDays" value="${esc(s.workingDays)}"></label>
      <label class="f">Validity<input class="in" data-k="db:settings.validity" value="${esc(s.validity)}"></label>
      <label class="f">Prepared by<input class="in" data-k="db:settings.preparedBy" value="${esc(s.preparedBy)}"></label>
      <label class="f">Checked by<input class="in" data-k="db:settings.checkedBy" value="${esc(s.checkedBy)}"></label>
    </div></section>
    <section class="panel"><header><div><h3>Quotation wording</h3><p>One item per line.</p></div></header><div class="body grid g2">
      <label class="f">Payment terms<textarea class="in" rows="4" data-t="lines" data-k="db:settings.paymentTerms">${esc(s.paymentTerms.join('\n'))}</textarea></label>
      <label class="f">Purchase order line<textarea class="in" rows="4" data-k="db:settings.poNote">${esc(s.poNote)}</textarea></label>
      <label class="f span-all">Terms &amp; conditions<textarea class="in" rows="7" data-t="lines" data-k="db:settings.terms">${esc(s.terms.join('\n'))}</textarea></label>
    </div></section>

    <section class="panel" id="sync"><header><div><h3>Database on GitHub</h3><p>Keeps one shared copy in a <b>private</b> repository so the data follows you between computers. The token stays in this browser only.</p></div>
      <div class="btn-row"><button class="btn" data-act="gh-pull">Pull from GitHub</button><button class="btn dark" data-act="gh-push">Push to GitHub</button></div></header>
      <div class="body grid g4">
        <label class="f">Owner<small>GitHub username or organisation</small><input class="in" data-k="db:settings.github.owner" value="${esc(gh.owner)}" placeholder="your-username"></label>
        <label class="f">Private data repository<small>Not the website repo</small><input class="in" data-k="db:settings.github.repo" value="${esc(gh.repo)}" placeholder="bimage-fee-data"></label>
        <label class="f">Branch<input class="in" data-k="db:settings.github.branch" value="${esc(gh.branch)}"></label>
        <label class="f">File path<input class="in" data-k="db:settings.github.path" value="${esc(gh.path)}"></label>
        <label class="f span2">Fine-grained token<small>Contents: read and write, on the data repo only</small><input class="in" type="password" id="gh-token" value="${esc(Store.getToken())}" placeholder="github_pat_…" autocomplete="off"></label>
        <label class="small span2" style="display:flex;gap:8px;align-items:center;align-self:end"><input type="checkbox" data-k="db:settings.github.auto" ${gh.auto ? 'checked' : ''}> Push automatically after each change</label>
        <div class="span-all small muted">${db.meta.lastSync ? 'Last synced ' + new Date(db.meta.lastSync).toLocaleString('en-GB') + '.' : 'Not synced yet.'} <a href="#" data-act="gh-force">Overwrite repository with this browser's data</a></div>
      </div></section>

    <section class="panel"><header><div><h3>Backup</h3><p>A JSON file of every project and list. Import replaces what is in this browser.</p></div></header>
      <div class="body btn-row"><button class="btn" data-act="export">Export backup</button><label class="btn">Import backup<input type="file" accept="application/json,.json" id="import-file" hidden></label><button class="btn danger" data-act="reset" style="margin-left:auto">Reset to sample data</button></div></section>

    <section class="panel"><header><div><h3>Access</h3><p>The password is checked in the browser. To change it, make a hash here and paste it into <code>assets/js/config.js</code> in the repository.</p></div></header>
      <div class="body grid g2"><label class="f">New password<input class="in" type="text" id="new-pw" autocomplete="off"></label><label class="f">Hash for config.js<input class="in" id="new-hash" readonly></label></div></section>
    </div>`;
  }
  document.addEventListener('input', async (e) => {
    if (e.target.id === 'gh-token') { Store.setToken(e.target.value); }
    if (e.target.id === 'new-pw') { $('#new-hash').value = e.target.value ? await sha256(e.target.value) : ''; }
  });
  document.addEventListener('change', (e) => {
    if (!e.target.classList.contains('pkg-name') || !view.p) return;
    const old = e.target.dataset.old, nu = e.target.value.trim();
    if (!nu || nu === old) { e.target.value = old; return; }
    const p = view.p;
    p.lines.forEach((l) => { if (l.pkg === old) l.pkg = nu; });
    p.quote.items.forEach((it) => (it.alloc || []).forEach((a) => { if (a.src === 'pkg:' + old) a.src = 'pkg:' + nu; }));
    p.updatedAt = Store.nowIso(); Store.save(); rerender(); toast('Package renamed.');
  });
  document.addEventListener('change', (e) => {
    if (e.target.id !== 'import-file') return;
    const f = e.target.files[0]; if (!f) return;
    f.text().then((t) => { try { db = Store.importJson(t); toast('Backup imported: ' + db.projects.length + ' projects.'); rerender(); } catch (err) { toast(err.message, true); } });
  });

  /* ================= ACTIONS ================= */
  function newProject() {
    const s = db.settings;
    const yr = new Date().getFullYear();
    const seq = db.projects.filter((p) => (p.quote.no || '').includes('/' + yr + '/')).length + 1;
    const p = {
      id: Store.uid(), code: '', name: '', shortName: '', clientId: '', developer: '', location: '', sector: 'Building',
      disciplines: ['Architecture', 'Structure', 'MEP'], projectMonths: 24, bimMonths: 24, levels: '', area: '', areaUnit: 'm²',
      scopes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], drawingsProvided: true, modelsProvided: true,
      infoByClient: 'LOD300/350 BIM Design Models (Item B), all CAD drawings, shop drawings and as-built drawings required for the project',
      commencement: ymAdd(thisYm(), 2), status: 'Enquiry', statusLog: [{ status: 'Enquiry', date: Store.today() }],
      margin: s.defaultMargin, sstRate: s.sstRate, lines: [], software: [], hardware: [],
      quote: { no: `${s.quotePrefix}/${yr}/${String(seq).padStart(3, '0')}`, date: Store.today(), validity: s.validity, terms: '(Refer to payment terms below)', issuedBy: s.preparedBy, reference: '', contact: '', intro: 'BIM Consultancy Services to Developing BIM Model to LOD500:', showTeam: true, items: [], notes: [] },
      createdAt: Store.nowIso(), updatedAt: Store.nowIso(),
    };
    db.projects.push(p); Store.save();
    go('#/project/' + p.id + '/data');
  }
  function confirmDlg(title, body, okLabel, danger) {
    return new Promise((res) => {
      const d = $('#dlg');
      d.innerHTML = `<form method="dialog"><header><h3>${esc(title)}</h3></header><div class="body"><p style="margin:0">${body}</p></div><footer><button class="btn" value="no">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" value="yes">${esc(okLabel)}</button></footer></form>`;
      d.onclose = () => res(d.returnValue === 'yes');
      d.showModal();
    });
  }
  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };
  const touch = () => { if (view.p) view.p.updatedAt = Store.nowIso(); Store.save(); rerender(); };

  const ACT = {
    'new-project': newProject,
    logout() { sessionStorage.removeItem(AUTH_KEY); localStorage.removeItem(AUTH_KEY); location.hash = ''; renderGate(); },
    menu() { document.body.classList.toggle('nav-open'); },
    filter(t) { sessionStorage.setItem('bf-filter', t.dataset.v); rerender(); },
    async 'del-project'(t) { const p = byId(db.projects, t.dataset.id); if (await confirmDlg('Delete project', `Delete <b>${esc(p.code || p.shortName || 'this project')}</b> and its quotation? This cannot be undone.`, 'Delete project', true)) { db.projects.splice(db.projects.indexOf(p), 1); Store.save(); rerender(); toast('Project deleted.'); } },
    'dup-project'(t) {
      const p = byId(db.projects, t.dataset.id); const c = JSON.parse(JSON.stringify(p));
      const map = {}; c.id = Store.uid(); c.code = (c.code || '') + ' (copy)'; c.status = 'Enquiry'; c.statusLog = [{ status: 'Enquiry', date: Store.today() }]; c.createdAt = c.updatedAt = Store.nowIso();
      c.lines.forEach((l) => { const n = Store.uid(); map[l.id] = n; l.id = n; });
      c.software.forEach((s) => { s.id = Store.uid(); s.lineId = map[s.lineId]; }); c.hardware.forEach((s) => { s.id = Store.uid(); s.lineId = map[s.lineId]; });
      c.quote.items.forEach((it) => { it.id = Store.uid(); (it.alloc || []).forEach((a) => { if (a.src.startsWith('line:')) a.src = 'line:' + map[a.src.slice(5)]; }); });
      db.projects.push(c); Store.save(); go('#/project/' + c.id + '/data'); toast('Project duplicated.');
    },
    disc(t) { const p = view.p; const v = t.value; p.disciplines = t.checked ? [...new Set([...p.disciplines, v])] : p.disciplines.filter((x) => x !== v); p.disciplines.sort((a, b) => Store.DISCIPLINES.indexOf(a) - Store.DISCIPLINES.indexOf(b)); Store.save(); },
    scope(t) { const p = view.p; const v = t.value; p.scopes = t.checked ? [...new Set([...p.scopes, v])] : p.scopes.filter((x) => x !== v); p.scopes.sort(); Store.save(); },
    async build() {
      const p = view.p;
      if (!p.bimMonths) return toast('Enter the BIM service duration first.', true);
      if (!p.scopes.length) return toast('Select at least one scope of service.', true);
      if (p.lines.length && !(await confirmDlg('Replace team and quotation', `This replaces ${p.lines.length} manpower lines, the software and hardware rows, and ${p.quote.items.length} quotation items.`, 'Replace'))) return;
      const g = Generator.build(p, db);
      p.lines = g.lines; p.software = g.software; p.hardware = g.hardware; p.quote.items = g.items; p.quote.notes = g.notes;
      if (!p.quote.reference) p.quote.reference = p.code;
      p.updatedAt = Store.nowIso(); Store.save();
      toast(`Built ${g.lines.length} manpower lines and ${g.items.length} quotation items.`);
      go('#/project/' + p.id + '/manpower');
    },
    'add-line'(t) {
      const p = view.p; const last = p.lines.filter((l) => l.kind !== 'allowance' && (!t.dataset.pkg || l.pkg === t.dataset.pkg)).slice(-1)[0];
      const r = db.roles.find((x) => x.name === 'Modeler') || db.roles[0];
      const l = { id: Store.uid(), kind: 'manpower', optional: last ? !!last.optional : false, pkg: t.dataset.pkg || (last ? last.pkg : 'Package 1'), items: '', roleId: r.id, role: r.name, disp: '', staffId: '', nos: 1, start: 1, end: num(p.bimMonths) || 12, rate: r.rate, marginOverride: '' };
      const at = last ? p.lines.indexOf(last) + 1 : p.lines.length;
      p.lines.splice(at, 0, l);
      if (db.software[0]) p.software.push({ id: Store.uid(), lineId: l.id, itemId: db.software[0].id, users: 1, rate: db.software[0].rate });
      if (db.hardware[0]) p.hardware.push({ id: Store.uid(), lineId: l.id, itemId: db.hardware[0].id, users: 1, rate: db.hardware[0].rate });
      touch(); toast('Line added with one licence and one laptop set. Allocate it in step 6.');
    },
    'add-pkg'() {
      const p = view.p; let n = 1; while (p.lines.some((l) => l.pkg === 'New package ' + n)) n++;
      ACT['add-line']({ dataset: { pkg: 'New package ' + n } });
    },
    'add-allow'() {
      const p = view.p; const r = db.roles.find((x) => x.allowance) || { id: '', name: 'Allowance', rate: 1200 };
      p.lines.push({ id: Store.uid(), kind: 'allowance', optional: false, pkg: (p.lines[0] || {}).pkg || 'Allowance', items: '-', roleId: r.id, role: r.name, disp: 'Travelling, site meetings, mileage, etc.', staffId: '', nos: 1, start: 1, end: num(p.bimMonths) || 12, rate: r.rate, marginOverride: '' });
      touch();
    },
    async 'del-line'(t) {
      const p = view.p; const l = p.lines[t.dataset.i];
      const used = p.quote.items.some((it) => (it.alloc || []).some((a) => a.src === 'line:' + l.id));
      if (used && !(await confirmDlg('Delete line', 'This line is allocated to quotation items. Its allocations and licence/hardware rows will be removed too.', 'Delete line', true))) return;
      p.lines.splice(t.dataset.i, 1);
      p.software = p.software.filter((s) => s.lineId !== l.id); p.hardware = p.hardware.filter((s) => s.lineId !== l.id);
      p.quote.items.forEach((it) => it.alloc = (it.alloc || []).filter((a) => a.src !== 'line:' + l.id));
      touch();
    },
    'kit-add'(t) {
      const p = view.p, k = t.dataset.kind, lib = db[k][0]; const l = p.lines.find((x) => x.kind !== 'allowance');
      p[k].push({ id: Store.uid(), lineId: l ? l.id : '', itemId: lib ? lib.id : '', users: l ? l.nos : 1, rate: lib ? lib.rate : 0 }); touch();
    },
    'kit-del'(t) { view.p[t.dataset.kind].splice(t.dataset.i, 1); touch(); },
    'kit-auto'(t) {
      const p = view.p, k = t.dataset.kind, lib = db[k][0]; if (!lib) return toast('Add an item in Database first.', true);
      let n = 0;
      p.lines.filter((l) => l.kind !== 'allowance' && !p[k].some((r) => r.lineId === l.id)).forEach((l) => { p[k].push({ id: Store.uid(), lineId: l.id, itemId: lib.id, users: l.nos, rate: lib.rate }); n++; });
      touch(); toast(n ? `Added ${n} rows of ${lib.name}.` : 'Every line already has a row.');
    },
    'qi-add'() { view.p.quote.items.push({ id: Store.uid(), code: '', title: 'New item', unit: 'Lot', qty: 1, mode: 'priced', alloc: [], manualRate: '', subs: [] }); touch(); },
    async 'qi-del'(t) { if (await confirmDlg('Delete item', 'Remove this quotation item?', 'Delete item', true)) { view.p.quote.items.splice(t.dataset.i, 1); touch(); } },
    'qi-up'(t) { move(view.p.quote.items, +t.dataset.i, -1); touch(); },
    'qi-down'(t) { move(view.p.quote.items, +t.dataset.i, 1); touch(); },
    'al-add'(t) { const it = view.p.quote.items[t.dataset.i]; (it.alloc = it.alloc || []).push({ src: '', pct: 100 }); touch(); },
    'al-del'(t) { view.p.quote.items[t.dataset.i].alloc.splice(t.dataset.ai, 1); touch(); },
    async 'add-client'() {
      const d = $('#dlg');
      d.innerHTML = `<form method="dialog" id="cl-form"><header><h3>New client</h3></header><div class="body grid g2">
        <label class="f span-all">Company<input class="in" name="name" required></label><label class="f">Registration no.<input class="in" name="regNo"></label><label class="f">Attention<input class="in" name="attention"></label>
        <label class="f span-all">Address<textarea class="in" name="address" rows="3"></textarea></label><label class="f">Email<input class="in" name="email"></label><label class="f">Telephone<input class="in" name="tel"></label></div>
        <footer><button class="btn" value="no" formnovalidate>Cancel</button><button class="btn primary" value="yes">Add client</button></footer></form>`;
      d.onclose = () => {
        if (d.returnValue !== 'yes') return;
        const f = new FormData($('#cl-form'));
        const c = { id: Store.uid(), name: f.get('name'), regNo: f.get('regNo'), parent: '', address: f.get('address'), country: 'Malaysia', postcode: '', tel: f.get('tel'), attention: f.get('attention'), email: f.get('email') };
        db.clients.push(c); view.p.clientId = c.id; touch(); toast('Client added.');
      };
      d.showModal();
    },
    'db-add'(t) {
      const L = t.dataset.list, id = Store.uid();
      const blank = { staff: { id, name: 'New staff', roleId: '', rate: '', status: 'Active', email: '' }, roles: { id, name: 'New role', rate: 0 }, software: { id, name: 'New software', rate: 0, note: '' }, hardware: { id, name: 'New hardware', rate: 0, note: '' }, clients: { id, name: 'New client', regNo: '', parent: '', address: '', country: 'Malaysia', postcode: '', tel: '', attention: '', email: '' } }[L];
      db[L].push(blank); Store.save(); rerender();
      setTimeout(() => { const ins = $$(`[data-k^="db:${L}.${db[L].length - 1}."]`); if (ins[0]) { ins[0].focus(); ins[0].select && ins[0].select(); } }, 30);
    },
    async 'db-del'(t) {
      const L = t.dataset.list, i = +t.dataset.i, item = db[L][i];
      const inUse = L === 'clients' ? db.projects.some((p) => p.clientId === item.id) : L === 'staff' ? db.projects.some((p) => p.lines.some((l) => l.staffId === item.id)) : false;
      if (!(await confirmDlg('Delete', `Delete <b>${esc(item.name)}</b>?${inUse ? ' It is used in existing projects; those will show it as blank or TBC.' : ''}`, 'Delete', true))) return;
      db[L].splice(i, 1); Store.save(); rerender();
    },
    'db-top'(t) { const L = t.dataset.list; const [x] = db[L].splice(+t.dataset.i, 1); db[L].unshift(x); Store.save(); rerender(); },
    'mp-toggle'() { setTimeout(drawManpower, 0); },
    export() { download(Store.exportJson(), `bimage-fee-backup-${Store.today()}.json`); },
    async reset() { if (await confirmDlg('Reset data', 'Replace everything in this browser with the sample data (W430)? Export a backup first if you need it.', 'Reset', true)) { db = Store.reset(); rerender(); toast('Reset to sample data.'); } },
    async 'gh-pull'() { try { toast('Pulling…'); const r = await Store.pull(); db = Store.db; rerender(); toast('Pulled. Data saved ' + new Date(r.updatedAt).toLocaleString('en-GB') + '.'); } catch (e) { toast(e.message, true); } },
    async 'gh-push'() { try { toast('Pushing…'); await Store.push(); rerender(); toast('Pushed to GitHub.'); } catch (e) { toast(e.message, true); } },
    async 'gh-force'() { if (!(await confirmDlg('Overwrite repository', "Replace the database in GitHub with this browser's data? Changes made on other devices since your last pull will be lost.", 'Overwrite', true))) return; try { await Store.push(true); rerender(); toast('Repository overwritten.'); } catch (e) { toast(e.message, true); } },
    async docx(t) {
      const p = view.p; if (!p) return;
      t.disabled = true;
      try { const blob = await Quote.docx(p, db, Calc.compute(p)); download(blob, `Quotation ${(p.quote.no || p.code || 'BIMAGE').replace(/[\\/:*?"<>|]/g, '-')}.docx`); toast('Word file downloaded.'); }
      catch (e) { console.error(e); toast('Could not build the Word file: ' + e.message, true); }
      t.disabled = false;
    },
    print() { window.print(); },
    back() { history.length > 1 ? history.back() : go('#/project/' + view.p.id + '/quotation'); },
  };

  /* ---------- start ---------- */
  function start() {
    db = Store.load();
    Store.on((ev, msg) => { if (ev === 'sync-error') toast('GitHub sync: ' + msg, true); if (ev === 'saved' && db !== Store.db) db = Store.db; });
    if (!location.hash) location.hash = '#/dashboard';
    route();
  }
  window.App = { get db() { return db; } };
  if (authed()) start(); else renderGate();
})();
