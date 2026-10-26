/* BIMAGE Fee & Quotation — database layer
   Primary store: this browser (localStorage), saved on every change.
   Shared store: optional JSON file in a PRIVATE GitHub repo, pushed/pulled with a personal token.
   Backup: JSON export/import. */
(function (g) {
  const KEY = 'bimage-fee-db-v1';
  const TOKEN_KEY = 'bimage-fee-gh-token';
  const uid = () => Math.random().toString(36).slice(2, 9);
  const today = () => new Date().toISOString().slice(0, 10);
  const nowIso = () => new Date().toISOString();

  /* ---------- scope library (standard ROQ items) ---------- */
  const SCOPES = [
    { code: 'A', title: 'Project Kick Off/Execution', subs: ['Collect Drawings and Information for Modelling', 'Submission of First Draft BIM Execution Plan', 'Setting up of Project Timeline/Milestone'] },
    { code: 'B', title: 'BIM LOD 300/350 Design Model', subs: ['Architectural, Structural, MEP, Landscape, Civil/Road/Drain and Façade Models'] },
    { code: 'C', title: 'Model Reconciliation and Coordination Services LOD300 (LOD300/350 Design Model Provided by Client)', subs: ['Checking of First Set 3D models received from Client and perform reconciliation to ensure model is usable for further update and coordination.', 'Assimilation of Models and performing clash analysis of the federated model. Record and update of Clash Detection Report for Coordination Meetings according to the First Set 3D models received from Client.'] },
    { code: 'D', title: 'Development/Update of Construction Models LOD400', subs: [] },
    { code: 'E', title: 'Coordination Services', subs: ['Assimilation of Models and performing clash analysis of the federated model. Record and update of Clash Detection Report for Coordination Meetings'] },
    { code: 'F', title: 'Production of Drawings (CSD Drawings)', subs: ['To produce Coordinated Services Drawings (CSD) from the model for site reference and coordination.'] },
    { code: 'G', title: 'BIM Coordination Meeting', subs: ['To attend BIM Coordination meetings on a BI-WEEKLY BASIS for a duration of {gm} months upon commencement of BIM modelling works, or once most of the issues/clashes have been resolved, whichever earlier ({gs} sessions)'] },
    { code: 'H', title: 'Project Closing to LOD 500 As-Built Model', subs: ['Update based on site as-built drawings and submission of As-Built Model. As-built drawings shall be provided by Main-Con.'] },
    { code: 'J', title: 'Perform New 3D LOD 300 Model', subs: [] },
    { code: 'K', title: '4D Simulation', subs: ["To perform base model setup for 4D Simulation via 3D Model linking to Main Contractor's Master Works Programme", "Periodic update and reporting of 4D Simulation for site progress meetings based on actual works done in Main Contractor's Master Works Programme"] },
    { code: 'L', title: '5D Quantity Take-off', subs: ['Extraction of model-based quantities for agreed elements to support cost planning and valuation.'] },
    { code: 'M', title: 'COBie / Asset Information Handover', subs: ['Population and validation of asset data (COBie) in the As-Built Model for facility management handover.'] },
  ];
  const SCOPE_HINT = {
    A: 'Kick-off, BEP, timeline', B: 'Design model (usually by client)', C: 'Reconcile client LOD300 models', D: 'Update to LOD400 per shop drawings',
    E: 'Clash analysis and reports', F: 'Coordinated services drawings', G: 'Bi-weekly + ad-hoc meetings', H: 'LOD500 as-built model',
    J: 'New LOD300 modelling', K: '4D programme linking', L: 'Model-based quantities', M: 'Asset data for FM',
  };

  const DISCIPLINES = ['Architecture', 'Façade', 'Structure', 'MEP', 'Civil, Road & Drainage', 'Landscape', 'Infrastructure / Utilities'];
  const STATUSES = ['Enquiry', 'Quoted', 'Awarded', 'Ongoing', 'Completed', 'Lost'];

  /* ---------- seed ---------- */
  function seed() {
    const roles = [
      { id: 'r_cm', name: 'Coordinator cum Manager', rate: 11000 },
      { id: 'r_bm', name: 'BIM Manager', rate: 13000 },
      { id: 'r_bc', name: 'BIM Coordinator', rate: 9000 },
      { id: 'r_lm', name: 'Lead Modeler', rate: 14000 },
      { id: 'r_md', name: 'Modeler', rate: 7500 },
      { id: 'r_dr', name: 'Drafter', rate: 7000 },
      { id: 'r_4d', name: '4D Modeler', rate: 7500 },
      { id: 'r_qs', name: '5D / QTO Modeler', rate: 8000 },
      { id: 'r_al', name: 'Allowance', rate: 1200, allowance: true },
    ];
    const staff = [
      { id: 's_izani', name: 'Mohamad Izani Ahmad Kamal Hasni', roleId: 'r_cm', rate: 11000, status: 'Active', email: 'izani@bimageconsulting.com', joined: '' },
    ];
    const software = [
      { id: 'sw_aec', name: 'Autodesk AEC Collection', rate: 12600, note: 'Covers 1–3 years; one charge per user' },
      { id: 'sw_nw', name: 'Autodesk Navisworks Manage', rate: 6500, note: 'Per user, annual' },
      { id: 'sw_acc', name: 'Autodesk Docs / BIM Collaborate Pro', rate: 3800, note: 'Per user, annual' },
      { id: 'sw_syn', name: 'Synchro 4D Pro', rate: 9000, note: 'Per user, annual' },
    ];
    const hardware = [
      { id: 'hw_lm', name: 'Laptop & Monitor', rate: 9500, note: 'One-off per user' },
      { id: 'hw_ws', name: 'Workstation (desktop) & dual monitor', rate: 12500, note: 'One-off per user' },
      { id: 'hw_vr', name: 'VR headset', rate: 4500, note: 'One-off' },
    ];
    const clients = [
      { id: 'c_wct', name: 'WCT Berhad', regNo: '66538-K', parent: '(A member of WCT Holdings Berhad)', address: 'B-30-01, The Ascent, Paradigm,\nNo. 1, Jalan SS7/26A, Kelana Jaya,\n47301 Petaling Jaya, Selangor Darul Ehsan', country: 'Malaysia', postcode: '47301', tel: '', attention: 'Mr. Ken Chai (Quantity Surveyor)', email: '' },
    ];
    const db = {
      version: 1,
      meta: { createdAt: nowIso(), updatedAt: nowIso(), appVersion: '1.0.0' },
      settings: {
        company: {
          name: 'BIMAGE Consulting (M) Sdn Bhd', sstNo: 'B16-2107-32000028',
          address: 'C-7-4, Block C Setiawalk, Persiaran Wawasan, Pusat Bandar Puchong, 47160 Puchong, Selangor.',
          tel: '013-5333992 / 03-80654409', email: 'enquiry@bimageconsulting.com', web: 'www.bimageconsulting.com',
        },
        sstRate: 0.08, defaultMargin: 0.22, quotePrefix: 'BIMAGE/QT', validity: '14 Days', currency: 'RM',
        workingDays: 22,
        preparedBy: 'Mohamad Izani Ahmad Kamal Hasni', checkedBy: '',
        paymentTerms: ['Monthly payment at the end of service month.', 'Agreement to this order shall constitute an agreement to the Payment Terms and Terms & Conditions in this quotation.'],
        poNote: 'All purchase orders should address to "Bimage Consulting (M) Sdn. Bhd."',
        terms: [
          'The offered price is subject to 8% SST. Any other taxes such as withholding tax shall be charged separately where applicable.',
          'The total amount does not include optional or any other additional items. Prices are subjected to changes in the event of amendments.',
          'Cancellation/ changes of orders are not allowed unless otherwise agreed and notified in the form of writing by BIMAGE. Should an order or item of an order be cancelled, a cancellation charge of 30% of product/ services value will be imposed.',
          'Signing the order confirmation would also constitute agreeing to the payment terms and remarks set in this quotation.',
          'The payment terms shall be strictly followed upon and no other forms of payment terms shall be allowed.',
        ],
        github: { owner: '', repo: '', branch: 'main', path: 'data/db.json', auto: false, sha: '' },
      },
      roles, staff, software, hardware, clients,
      projects: [],
    };
    db.projects.push(sampleW430(db));
    return db;
  }

  function sampleW430(db) {
    const L = (o) => Object.assign({ id: uid(), kind: 'manpower', optional: false, staffId: '', marginOverride: '' }, o);
    const cm = L({ pkg: 'Managing & Coordination', items: 'A, E, G.i', roleId: 'r_cm', role: 'Coordinator cum Manager', disp: 'All', nos: 1, start: 1, end: 34, rate: 11000, staffId: 's_izani' });
    const lead = L({ pkg: 'LOD300 Reconciliation', items: 'C', roleId: 'r_lm', role: 'Lead Modeler', disp: 'All', nos: 1, start: 1, end: 3, rate: 14000 });
    const ar = L({ pkg: 'LOD400 Update', items: 'D.i, D.iv', roleId: 'r_md', role: 'Modeler', disp: 'Architecture incl. Façade', nos: 1, start: 7, end: 31, rate: 7500 });
    const st = L({ pkg: 'LOD400 Update', items: 'D.ii', roleId: 'r_md', role: 'Modeler', disp: 'Structure', nos: 1, start: 3, end: 25, rate: 7500 });
    const mep = L({ pkg: 'LOD400 Update', items: 'D.v', roleId: 'r_md', role: 'Modeler', disp: 'MEP', nos: 1, start: 5, end: 31, rate: 7500 });
    const cv = L({ pkg: 'LOD400 Update', items: 'D.iii', roleId: 'r_md', role: 'Modeler', disp: 'Civil, Road & Drainage', nos: 1, start: 11, end: 16, rate: 7500 });
    const csd = L({ pkg: 'LOD400 Update', items: 'F', roleId: 'r_dr', role: 'Drafter', disp: 'CSD Drawings', nos: 1, start: 5, end: 31, rate: 7000 });
    const al = L({ pkg: 'LOD400 Update', items: '-', roleId: 'r_al', role: 'Allowance', disp: 'Travelling, site meetings, mileage, etc.', nos: 1, start: 1, end: 34, rate: 1200, kind: 'allowance' });
    const ab = L({ pkg: 'LOD500 As-Built', items: 'H', roleId: 'r_md', role: 'Modeler', disp: 'All', nos: 2, start: 32, end: 34, rate: 7500 });
    const d4 = L({ pkg: '4D Simulation', items: 'K', roleId: 'r_4d', role: '4D Modeler', disp: 'All', nos: 1, start: 3, end: 34, rate: 7500 });
    const J = 'Item J - New LOD300 Model';
    const jl = [
      L({ pkg: J, optional: true, items: 'J', roleId: 'r_lm', role: 'Lead Modeler', disp: 'All', nos: 1, start: 1, end: 3, rate: 14000 }),
      ...['Architecture', 'Façade/Hardscape', 'Structure', 'Mechanical', 'Electrical', 'Infra'].map((d) => L({ pkg: J, optional: true, items: 'J', roleId: 'r_md', role: 'Modeler', disp: d, nos: 1, start: 1, end: 3, rate: 7500 })),
    ];
    const lines = [cm, lead, ar, st, mep, cv, csd, al, ab, d4, ...jl];
    const licensed = [cm, lead, ar, st, mep, cv, csd, d4, ...jl];
    const software = licensed.map((l) => ({ id: uid(), lineId: l.id, itemId: 'sw_aec', users: 1, rate: 12600 }));
    const hardware = licensed.map((l) => ({ id: uid(), lineId: l.id, itemId: 'hw_lm', users: 1, rate: 9500 }));
    const S = (code) => SCOPES.find((s) => s.code === code);
    const Q = (o) => Object.assign({ id: uid(), unit: 'Lot', qty: 1, mode: 'priced', alloc: [], manualRate: '' }, o);
    const items = [
      Q({ code: 'A', title: S('A').title, subs: S('A').subs.slice(), alloc: [{ src: 'line:' + cm.id, pct: 15 }] }),
      Q({ code: 'B', title: S('B').title, subs: S('B').subs.slice(), mode: 'byclient', qty: '' }),
      Q({ code: 'C', title: S('C').title, subs: S('C').subs.slice(), alloc: [{ src: 'line:' + lead.id, pct: 100 }] }),
      Q({ code: 'D', title: S('D').title, subs: ['Update Architectural Model', 'Update Structural Model', 'Update Civil, Road and Drainage Model', 'Update Façade Model', 'Update MEP Model (MEP LOD400 updated according to shop drawings provided by Main-Con/NSC/DSC)'], alloc: [ar, st, cv, mep].map((l) => ({ src: 'line:' + l.id, pct: 100 })) }),
      Q({ code: 'E', title: S('E').title, subs: S('E').subs.slice(), alloc: [{ src: 'line:' + cm.id, pct: 55 }] }),
      Q({ code: 'F', title: S('F').title, subs: S('F').subs.slice(), alloc: [{ src: 'line:' + csd.id, pct: 100 }] }),
      Q({ code: 'G', title: S('G').title, unit: 'Session', qty: 26, subs: ['To attend BIM Coordination meetings on a BI-WEEKLY BASIS for a duration of 12 months upon commencement of BIM modelling works, or once most of the issues/clashes have been resolved, whichever earlier (26 sessions)'], alloc: [{ src: 'line:' + cm.id, pct: 30 }, { src: 'line:' + al.id, pct: 100 }] }),
      Q({ code: 'G.ii', title: "Ad-hoc meetings (3 working days' notice)", unit: 'Session', qty: '', subs: ['Charged per session on demand (rate only, not included in total)'], mode: 'rateonly', manualRate: 610 }),
      Q({ code: 'H', title: S('H').title, subs: S('H').subs.slice(), alloc: [{ src: 'line:' + ab.id, pct: 100 }] }),
      Q({ code: 'K', title: S('K').title, subs: S('K').subs.slice(), alloc: [{ src: 'line:' + d4.id, pct: 100 }] }),
      Q({ code: 'J', title: S('J').title, mode: 'optional', subs: ['New Modelling for Architectural Model', 'New Modelling for Structural Model', 'New Modelling for MEP Model', 'New Modelling for Civil, Road and Drainage Model', 'New Modelling for Façade Model'], note: 'Applicable only in the event the LOD 300 Design Model is not provided by Client as per Item B; the new models are required for Construction Modelling and Coordination as per Item D.', alloc: [{ src: 'pkg:' + J, pct: 100 }] }),
    ];
    return {
      id: uid(), code: 'W430',
      name: 'CADANGAN PEMBANGUNAN 1 BLOK PEJABAT 41 TINGKAT YANG MENGANDUNGI: FASA 1: 1. SEBAHAGIAN JALAN PENGHUBUNG; FASA 2: 1. 2 TINGKAT BESMEN TEMPAT LETAK KERETA DAN RUANG MEKANIKAL; 2. 4 TINGKAT PODIUM TEMPAT LETAK KERETA DAN RUANG MEKANIKAL 3. 14 TINGKAT RUANG PEJABAT BESERTA DENGAN RUANG KEMUDAHAN, RUANG KOMERSIL DAN RUANG MEKANIKAL; FASA 3: 1. 27 TINGKAT RUANG PEJABAT, DI ATAS LOT 20076 (PLOT 7) DAN SEBAHAGIAN LOT 20077 (PLOT 8), SEKSYEN 67, TUN RAZAK EXCHANGE, JALAN TUN RAZAK / JALAN DAVIS, WILAYAH PERSEKUTUAN KUALA LUMPUR UNTUK TETUAN PELANGI PASIFIK SDN BHD',
      shortName: '41-storey office tower, Plot 7 TRX',
      clientId: 'c_wct', developer: 'Pelangi Pasifik Sdn Bhd', sector: 'Building',
      disciplines: ['Architecture', 'Façade', 'Structure', 'MEP', 'Civil, Road & Drainage', 'Landscape'],
      projectMonths: 34, bimMonths: 34, levels: 48, area: '', areaUnit: 'm²', location: 'Tun Razak Exchange, Kuala Lumpur',
      scopes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'],
      drawingsProvided: true, modelsProvided: true,
      infoByClient: 'LOD300/350 BIM Design Models (Item B), all CAD drawings, shop drawings and as-built drawings required for the project',
      commencement: '2027-01', status: 'Quoted', statusLog: [{ status: 'Enquiry', date: '2026-10-12' }, { status: 'Quoted', date: '2026-10-20' }],
      margin: 0.22, sstRate: 0.08,
      lines, software, hardware,
      quote: {
        no: 'BIMAGE/QT/2026/001', date: '2026-10-20', validity: '14 Days', terms: '(Refer to payment terms below)', issuedBy: 'Mohamad Izani Ahmad Kamal Hasni', reference: 'W430', contact: '014-926 5863',
        intro: 'BIM Consultancy Services to Developing BIM Model to LOD500:', showTeam: true,
        items,
        notes: [
          'Software (Autodesk licence) and hardware (laptop & monitor) are included.',
          'Allowance for travelling, site meetings and mileage is included (within Item G.i).',
          'Item B LOD300/350 Design Models are to be provided by the Client. If not provided, Optional Item J applies and Item C is omitted.',
          'Ad-hoc meetings (Item G.ii) are charged per session at the stated rate.',
          'All rates exclude SST.',
          'Pricing and payment can be pro-rated monthly if the BIM team is not required on a full-time basis.',
        ],
      },
      createdAt: '2026-10-12T09:00:00.000Z', updatedAt: nowIso(),
    };
  }

  /* ---------- persistence ---------- */
  let db = null;
  const listeners = [];
  let saveTimer = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      db = raw ? JSON.parse(raw) : seed();
    } catch (e) { db = seed(); }
    migrate(db);
    if (!localStorage.getItem(KEY)) persist();
    return db;
  }
  function migrate(d) {
    const s = seed();
    d.settings = Object.assign({}, s.settings, d.settings || {});
    d.settings.company = Object.assign({}, s.settings.company, d.settings.company || {});
    d.settings.github = Object.assign({}, s.settings.github, d.settings.github || {});
    ['roles', 'staff', 'software', 'hardware', 'clients', 'projects'].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
    d.meta = d.meta || { createdAt: nowIso() };
  }
  function persist() {
    db.meta.updatedAt = nowIso();
    localStorage.setItem(KEY, JSON.stringify(db));
  }
  function save(opts = {}) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      persist();
      listeners.forEach((f) => f('saved'));
      if (db.settings.github.auto && getToken() && !opts.noSync) {
        clearTimeout(save._sync);
        save._sync = setTimeout(() => push().catch((e) => listeners.forEach((f) => f('sync-error', e.message))), 2500);
      }
    }, 250);
  }
  const on = (f) => listeners.push(f);

  function exportJson() {
    persist();
    return new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  }
  function importJson(text) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.projects)) throw new Error('This file is not a BIMAGE Fee database export.');
    migrate(d);
    db = d; persist();
    return db;
  }
  function reset() { db = seed(); persist(); return db; }

  /* ---------- GitHub sync (private repo JSON file) ---------- */
  const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
  const setToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t.trim()) : localStorage.removeItem(TOKEN_KEY);
  const b64e = (str) => btoa(unescape(encodeURIComponent(str)));
  const b64d = (b) => decodeURIComponent(escape(atob(b.replace(/\n/g, ''))));

  function ghUrl() {
    const gh = db.settings.github;
    if (!gh.owner || !gh.repo) throw new Error('Set the GitHub owner and repository in Settings first.');
    return `https://api.github.com/repos/${encodeURIComponent(gh.owner)}/${encodeURIComponent(gh.repo)}/contents/${gh.path.split('/').map(encodeURIComponent).join('/')}`;
  }
  async function gh(method, url, body) {
    const t = getToken();
    if (!t) throw new Error('Add a GitHub token in Settings first.');
    const res = await fetch(url, {
      method, headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined, cache: 'no-store',
    });
    return res;
  }
  async function pull() {
    const gs = db.settings.github;
    const res = await gh('GET', ghUrl() + '?ref=' + encodeURIComponent(gs.branch || 'main'));
    if (res.status === 404) throw new Error('No database file in the repository yet. Push once to create it.');
    if (!res.ok) throw new Error('GitHub refused the request (' + res.status + '). Check the token has Contents read/write on this repo.');
    const j = await res.json();
    const remote = JSON.parse(b64d(j.content));
    const keepGh = Object.assign({}, db.settings.github, { sha: j.sha });
    migrate(remote);
    remote.settings.github = keepGh;
    db = remote; persist();
    return { updatedAt: remote.meta.updatedAt };
  }
  async function push(force) {
    const gs = db.settings.github;
    persist();
    let sha;
    const head = await gh('GET', ghUrl() + '?ref=' + encodeURIComponent(gs.branch || 'main'));
    if (head.ok) {
      const j = await head.json();
      if (!force && j.sha !== gs.sha) {
        // file changed (or was created) by another device since this browser last synced
        const e = new Error('The repository has data this browser has not pulled yet. Pull first, or use "Overwrite repository" in Settings.');
        e.conflict = true; throw e;
      }
      sha = j.sha;
    } else if (head.status !== 404) {
      throw new Error('GitHub refused the request (' + head.status + '). Check the token and repository name.');
    }
    const copy = JSON.parse(JSON.stringify(db));
    copy.settings.github.sha = '';
    const res = await gh('PUT', ghUrl(), { message: 'Update fee database ' + nowIso(), content: b64e(JSON.stringify(copy, null, 2)), branch: gs.branch || 'main', ...(sha ? { sha } : {}) });
    if (!res.ok) throw new Error('Push failed (' + res.status + '). ' + (res.status === 409 ? 'Pull first, then push again.' : 'Check token permissions.'));
    const j = await res.json();
    db.settings.github.sha = j.content.sha;
    db.meta.lastPulledRemote = db.meta.updatedAt;
    db.meta.lastSync = nowIso();
    persist();
    return j;
  }

  g.Store = {
    load, save, on, exportJson, importJson, reset, pull, push, getToken, setToken,
    get db() { return db; }, uid, today, nowIso,
    SCOPES, SCOPE_HINT, DISCIPLINES, STATUSES,
  };
})(window);
