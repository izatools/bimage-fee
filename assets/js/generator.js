/* Builds a starting team, software/hardware and quotation items from the project data.
   Rules follow the W430 workbook: one Coordinator cum Manager for the full BIM duration,
   discipline modellers phased inside the programme, CSD follows MEP, as-built in the last
   3 months, 4D from month 3, M&C pool split A 15% / E 55% / G.i 30%. Everything stays editable. */
(function (g) {
  const { uid, SCOPES } = Store;
  const S = (c) => SCOPES.find((s) => s.code === c) || { title: c, subs: [] };

  const DISC_ITEM = {
    'Architecture': { label: 'Architectural', d: 'D.i' },
    'Structure': { label: 'Structural', d: 'D.ii' },
    'Civil, Road & Drainage': { label: 'Civil, Road and Drainage', d: 'D.iii' },
    'Façade': { label: 'Façade', d: 'D.iv' },
    'MEP': { label: 'MEP', d: 'D.v' },
    'Landscape': { label: 'Landscape', d: 'D.vi' },
    'Infrastructure / Utilities': { label: 'Infrastructure / Utilities', d: 'D.vii' },
  };
  // phase windows as fractions of BIM duration (from W430: arch 7–31, str 3–25, mep 5–31, civil 11–16 of 34)
  const WINDOW = {
    'Architecture': [0.19, 0.91], 'Structure': [0.06, 0.74], 'MEP': [0.13, 0.91], 'Civil, Road & Drainage': [0.30, 0.47],
    'Façade': [0.19, 0.91], 'Landscape': [0.55, 0.88], 'Infrastructure / Utilities': [0.08, 0.80],
  };

  function build(p, db) {
    const D = Math.max(1, parseInt(p.bimMonths, 10) || parseInt(p.projectMonths, 10) || 12);
    const sc = new Set(p.scopes || []);
    const disc = (p.disciplines || []).slice();
    const role = (name) => db.roles.find((r) => r.name === name) || { id: '', name, rate: 0 };
    const sw = db.software[0], hw = db.hardware[0];
    const wd = db.settings.workingDays || 22;
    const lines = [], software = [], hardware = [], items = [];
    const mk = (o, licensed = true) => {
      const r = role(o.role);
      const l = Object.assign({ id: uid(), kind: 'manpower', optional: false, staffId: '', marginOverride: '', roleId: r.id, rate: r.rate, nos: 1 }, o);
      lines.push(l);
      if (licensed && l.kind !== 'allowance') {
        if (sw) software.push({ id: uid(), lineId: l.id, itemId: sw.id, users: l.nos, rate: sw.rate });
        if (hw) hardware.push({ id: uid(), lineId: l.id, itemId: hw.id, users: l.nos, rate: hw.rate });
      }
      return l;
    };
    const win = (d) => {
      const w = WINDOW[d] || [0.1, 0.9];
      const s = Math.max(1, Math.round(w[0] * D) + 1), e = Math.min(D, Math.max(s, Math.round(w[1] * D)));
      return D <= 6 ? [1, D] : [s, e];
    };
    const modelsGiven = !!p.modelsProvided;

    // 1. Managing & coordination
    let cm = null, allowance = null;
    if (sc.has('A') || sc.has('E') || sc.has('G')) {
      const its = ['A', 'E', 'G'].filter((c) => sc.has(c)).map((c) => c === 'G' ? 'G.i' : c).join(', ');
      cm = mk({ pkg: 'Managing & Coordination', items: its, role: 'Coordinator cum Manager', disp: 'All', start: 1, end: D });
    }
    // 2. Reconciliation of client models
    let lead = null;
    if (sc.has('C') && modelsGiven) lead = mk({ pkg: 'LOD300 Reconciliation', items: 'C', role: 'Lead Modeler', disp: 'All', start: 1, end: Math.min(3, D) });

    // 3. New LOD300 modelling (base when no models given; optional otherwise)
    const jLines = [];
    const jOptional = modelsGiven;
    if (sc.has('J') || !modelsGiven) {
      const jPkg = jOptional ? 'Item J - New LOD300 Model' : 'New LOD300 Model';
      const jEnd = Math.min(D, Math.max(3, Math.round(D * 0.09)));
      jLines.push(mk({ pkg: jPkg, optional: jOptional, items: 'J', role: 'Lead Modeler', disp: 'All', start: 1, end: jEnd }));
      disc.forEach((d) => jLines.push(mk({ pkg: jPkg, optional: jOptional, items: 'J', role: 'Modeler', disp: d, start: 1, end: jEnd })));
    }

    // 4. LOD400 update per discipline (Façade folds into Architecture when both present)
    const dLines = [];
    if (sc.has('D')) {
      const merged = disc.includes('Architecture') && disc.includes('Façade');
      disc.forEach((d) => {
        if (merged && d === 'Façade') return;
        const [s, e] = win(d);
        const label = merged && d === 'Architecture' ? 'Architecture incl. Façade' : d;
        const code = merged && d === 'Architecture' ? 'D.i, D.iv' : (DISC_ITEM[d] || { d: 'D' }).d;
        dLines.push(mk({ pkg: 'LOD400 Update', items: code, role: 'Modeler', disp: label, start: s, end: e }));
      });
    }
    let csd = null;
    if (sc.has('F')) {
      const [s, e] = win('MEP');
      csd = mk({ pkg: 'LOD400 Update', items: 'F', role: 'Drafter', disp: 'CSD Drawings', start: s, end: e });
    }
    if (sc.has('G')) allowance = mk({ pkg: cm ? 'Managing & Coordination' : 'Allowance', kind: 'allowance', items: '-', role: 'Allowance', disp: 'Travelling, site meetings, mileage, etc.', start: 1, end: D }, false);

    let ab = null;
    if (sc.has('H')) ab = mk({ pkg: 'LOD500 As-Built', items: 'H', role: 'Modeler', disp: 'All', nos: 2, start: Math.max(1, D - 2), end: D }, false);
    let d4 = null;
    if (sc.has('K')) d4 = mk({ pkg: '4D Simulation', items: 'K', role: '4D Modeler', disp: 'All', start: Math.min(D, 3), end: D });
    let qto = null;
    if (sc.has('L')) qto = mk({ pkg: '5D Quantity Take-off', items: 'L', role: '5D / QTO Modeler', disp: 'All', start: Math.max(1, Math.round(D * 0.2)), end: Math.max(1, Math.round(D * 0.9)) });
    let cob = null;
    if (sc.has('M')) cob = mk({ pkg: 'COBie / Asset Data', items: 'M', role: 'Modeler', disp: 'Asset data', start: Math.max(1, D - 3), end: D });

    // quotation items
    const Q = (o) => items.push(Object.assign({ id: uid(), unit: 'Lot', qty: 1, mode: 'priced', alloc: [], manualRate: '', subs: [] }, o));
    const W = { A: 15, E: 55, G: 30 };
    const present = ['A', 'E', 'G'].filter((c) => sc.has(c));
    const wsum = present.reduce((a, c) => a + W[c], 0) || 1;
    const share = (c) => Math.round(W[c] / wsum * 10000) / 100;
    // make shares add exactly to 100
    const shares = {}; present.forEach((c) => shares[c] = share(c));
    if (present.length) { const diff = 100 - present.reduce((a, c) => a + shares[c], 0); shares[present[present.length - 1]] = Math.round((shares[present[present.length - 1]] + diff) * 100) / 100; }

    if (sc.has('A')) Q({ code: 'A', title: S('A').title, subs: S('A').subs.slice(), alloc: [{ src: 'line:' + cm.id, pct: shares.A }] });
    if (sc.has('B') || modelsGiven) Q({ code: 'B', title: S('B').title, subs: S('B').subs.slice(), mode: 'byclient', qty: '' });
    if (lead) Q({ code: 'C', title: S('C').title, subs: S('C').subs.slice(), alloc: [{ src: 'line:' + lead.id, pct: 100 }] });
    if (dLines.length) {
      const subs = dLines.map((l) => l.disp === 'MEP' ? 'Update MEP Model (MEP LOD400 updated according to shop drawings provided by Main-Con/NSC/DSC)' : 'Update ' + l.disp.replace('Architecture incl. Façade', 'Architectural (incl. Façade)').replace('Structure', 'Structural') + ' Model');
      Q({ code: 'D', title: S('D').title, subs, alloc: dLines.map((l) => ({ src: 'line:' + l.id, pct: 100 })) });
    }
    if (sc.has('E')) Q({ code: 'E', title: S('E').title, subs: S('E').subs.slice(), alloc: [{ src: 'line:' + cm.id, pct: shares.E }] });
    if (csd) Q({ code: 'F', title: S('F').title, subs: S('F').subs.slice(), alloc: [{ src: 'line:' + csd.id, pct: 100 }] });
    if (sc.has('G')) {
      const gm = Math.min(12, D), gs = Calc.meetings(gm);
      Q({ code: 'G', title: S('G').title, unit: 'Session', qty: gs, subs: [S('G').subs[0].replace('{gm}', gm).replace('{gs}', gs)], alloc: [{ src: 'line:' + cm.id, pct: shares.G }].concat(allowance ? [{ src: 'line:' + allowance.id, pct: 100 }] : []) });
      const cmRate = cm ? cm.rate * (1 + (Number(p.margin) || 0)) / wd : 0;
      Q({ code: 'G.ii', title: "Ad-hoc meetings (3 working days' notice)", unit: 'Session', qty: '', subs: ['Charged per session on demand (rate only, not included in total)'], mode: 'rateonly', manualRate: Math.round(cmRate) });
    }
    if (ab) Q({ code: 'H', title: S('H').title, subs: S('H').subs.slice(), alloc: [{ src: 'line:' + ab.id, pct: 100 }] });
    if (d4) Q({ code: 'K', title: S('K').title, subs: S('K').subs.slice(), alloc: [{ src: 'line:' + d4.id, pct: 100 }] });
    if (qto) Q({ code: 'L', title: S('L').title, subs: S('L').subs.slice(), alloc: [{ src: 'line:' + qto.id, pct: 100 }] });
    if (cob) Q({ code: 'M', title: S('M').title, subs: S('M').subs.slice(), alloc: [{ src: 'line:' + cob.id, pct: 100 }] });
    if (jLines.length) {
      Q({
        code: 'J', title: S('J').title, mode: jOptional ? 'optional' : 'priced',
        subs: disc.map((d) => 'New Modelling for ' + ((DISC_ITEM[d] || { label: d }).label) + ' Model'),
        note: jOptional ? 'Applicable only in the event the LOD 300 Design Model is not provided by Client as per Item B; the new models are required for Construction Modelling and Coordination as per Item D.' : '',
        alloc: [{ src: 'pkg:' + jLines[0].pkg, pct: 100 }],
      });
    }

    const notes = [];
    if (software.length || hardware.length) notes.push('Software (Autodesk licence) and hardware (laptop & monitor) are included.');
    if (allowance) notes.push('Allowance for travelling, site meetings and mileage is included (within Item G.i).');
    if (modelsGiven) notes.push('Item B LOD300/350 Design Models are to be provided by the Client.' + (jLines.length ? ' If not provided, Optional Item J applies and Item C is omitted.' : ''));
    if (sc.has('G')) notes.push('Ad-hoc meetings (Item G.ii) are charged per session at the stated rate.');
    notes.push('All rates exclude SST.');
    notes.push('Pricing and payment can be pro-rated monthly if the BIM team is not required on a full-time basis.');

    return { lines, software, hardware, items, notes };
  }

  g.Generator = { build };
})(window);
