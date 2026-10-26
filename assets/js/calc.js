/* BIMAGE Fee & Quotation — calculation engine
   Mirrors W430_BIM_Scope_Quotation workbook:
   Fee Manpower  -> line cost = Nos x Rate (RM/mth) x Months, after margin = cost x (1 + margin)
   Fee License   -> users x rate, attached to a manpower line
   Fee Hardware  -> users x rate, attached to a manpower line
   Line pool     -> manpower after margin + licence + hardware for that line
   ROQ Pricing   -> each quotation item takes % splits of line pools (or whole package pools)
   Fee Summary   -> totals, SST, grand total; optional items priced separately */
(function (g) {
  const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; };

  function months(line) {
    const s = num(line.start, 1), e = num(line.end, 1);
    return Math.max(0, e - s + 1);
  }

  function lineCalc(p, line) {
    const m = months(line);
    const nos = num(line.nos, 0);
    const rate = num(line.rate, 0);
    const margin = line.marginOverride === '' || line.marginOverride == null ? num(p.margin, 0) : num(line.marginOverride, 0);
    const cost = nos * rate * m;
    const after = r2(cost * (1 + margin));
    const sw = (p.software || []).filter((s) => s.lineId === line.id)
      .reduce((a, s) => a + num(s.users) * num(s.rate), 0);
    const hw = (p.hardware || []).filter((h) => h.lineId === line.id)
      .reduce((a, h) => a + num(h.users) * num(h.rate), 0);
    return { id: line.id, months: m, nos, rate, margin, cost, after, sw: r2(sw), hw: r2(hw), pool: r2(after + sw + hw), personMonths: nos * m };
  }

  function compute(p) {
    const lines = p.lines || [];
    const L = {};
    lines.forEach((l) => { L[l.id] = lineCalc(p, l); });

    // packages, in order of first appearance
    const pkgOrder = [];
    const P = {};
    lines.forEach((l) => {
      const k = l.pkg || 'Unassigned';
      if (!P[k]) { P[k] = { name: k, optional: !!l.optional, lines: [], cost: 0, after: 0, sw: 0, hw: 0, pool: 0, heads: 0, maxEnd: 0, minStart: Infinity, maxMonths: 0 }; pkgOrder.push(k); }
      const c = L[l.id], pk = P[k];
      pk.lines.push(l.id);
      pk.optional = pk.optional && !!l.optional;
      pk.cost += c.cost; pk.after += c.after; pk.sw += c.sw; pk.hw += c.hw; pk.pool += c.pool;
      if (l.kind !== 'allowance') { pk.heads += c.nos; pk.maxMonths = Math.max(pk.maxMonths, c.months); }
      pk.minStart = Math.min(pk.minStart, num(l.start, 1)); pk.maxEnd = Math.max(pk.maxEnd, num(l.end, 1));
    });
    pkgOrder.forEach((k) => { const pk = P[k]; ['cost', 'after', 'sw', 'hw', 'pool'].forEach((f) => pk[f] = r2(pk[f])); });

    const sum = (arr, f) => r2(arr.reduce((a, x) => a + x[f], 0));
    const basePk = pkgOrder.map((k) => P[k]).filter((x) => !x.optional);
    const optPk = pkgOrder.map((k) => P[k]).filter((x) => x.optional);
    const fee = {
      base: { cost: sum(basePk, 'cost'), after: sum(basePk, 'after'), sw: sum(basePk, 'sw'), hw: sum(basePk, 'hw'), pool: sum(basePk, 'pool') },
      opt: { cost: sum(optPk, 'cost'), after: sum(optPk, 'after'), sw: sum(optPk, 'sw'), hw: sum(optPk, 'hw'), pool: sum(optPk, 'pool') },
    };

    // pool lookup for allocation sources
    const poolOf = (src) => {
      if (!src) return 0;
      const [t, id] = String(src).split(':');
      if (t === 'line') return L[id] ? L[id].pool : 0;
      if (t === 'pkg') return P[id] ? P[id].pool : 0;
      return 0;
    };

    // quotation items
    const items = ((p.quote && p.quote.items) || []).map((it) => {
      const mode = it.mode || 'priced';
      const qty = num(it.qty, 1);
      let alloc = 0;
      (it.alloc || []).forEach((a) => { alloc += poolOf(a.src) * num(a.pct) / 100; });
      alloc = r2(alloc);
      let rate = 0, amount = 0;
      if (mode === 'priced' || mode === 'optional') {
        if (it.manualRate !== '' && it.manualRate != null) rate = r2(num(it.manualRate));
        else rate = qty ? r2(alloc / qty) : 0;
        amount = r2(rate * qty);
      } else if (mode === 'rateonly') {
        rate = r2(num(it.manualRate));
      }
      return { id: it.id, mode, qty, alloc, rate, amount };
    });
    const I = {}; items.forEach((x) => I[x.id] = x);

    // allocation coverage per line (should be 100% for every line with a pool)
    const cover = {};
    lines.forEach((l) => cover[l.id] = 0);
    ((p.quote && p.quote.items) || []).forEach((it) => {
      if (!['priced', 'optional'].includes(it.mode || 'priced')) return;
      if (it.manualRate !== '' && it.manualRate != null) return;
      (it.alloc || []).forEach((a) => {
        const [t, id] = String(a.src || '').split(':');
        if (t === 'line' && id in cover) cover[id] += num(a.pct);
        if (t === 'pkg' && P[id]) P[id].lines.forEach((lid) => cover[lid] += num(a.pct));
      });
    });
    const coverage = lines.map((l) => ({ id: l.id, pct: r2(cover[l.id]), ok: Math.abs(cover[l.id] - 100) < 0.01 || L[l.id].pool === 0 }));

    const hasQuote = items.length > 0;
    const sst = num(p.sstRate, 0.08);
    const baseTotal = hasQuote ? r2(items.filter((x) => x.mode === 'priced').reduce((a, x) => a + x.amount, 0)) : fee.base.pool;
    const optTotal = hasQuote ? r2(items.filter((x) => x.mode === 'optional').reduce((a, x) => a + x.amount, 0)) : fee.opt.pool;
    const baseSst = r2(baseTotal * sst), optSst = r2(optTotal * sst);

    // workload / sanity
    const baseLines = lines.filter((l) => !l.optional && l.kind !== 'allowance');
    const chargedPM = baseLines.reduce((a, l) => a + L[l.id].personMonths, 0);
    const span = lines.length ? Math.max(...lines.map((l) => num(l.end, 1))) - Math.min(...lines.map((l) => num(l.start, 1))) + 1 : 0;
    const headsByMonth = [];
    for (let m = 1; m <= Math.max(span, num(p.bimMonths, 0)); m++) {
      headsByMonth.push(baseLines.reduce((a, l) => a + (m >= num(l.start) && m <= num(l.end) ? num(l.nos) : 0), 0));
    }

    return {
      L, P, pkgOrder, fee, items: I, itemList: items, coverage,
      allCovered: !hasQuote || coverage.every((c) => c.ok),
      base: { total: baseTotal, sst: baseSst, grand: r2(baseTotal + baseSst) },
      opt: { total: optTotal, sst: optSst, grand: r2(optTotal + optSst) },
      feeVsQuote: r2(fee.base.pool - baseTotal),
      chargedPM, span, headsByMonth,
      peakHeads: headsByMonth.length ? Math.max(...headsByMonth) : 0,
      avgMonthly: span ? r2(baseTotal / span) : 0,
      licUsers: (p.software || []).filter((s) => { const l = lines.find((x) => x.id === s.lineId); return l && !l.optional; }).reduce((a, s) => a + num(s.users), 0),
      hwUsers: (p.hardware || []).filter((s) => { const l = lines.find((x) => x.id === s.lineId); return l && !l.optional; }).reduce((a, s) => a + num(s.users), 0),
    };
  }

  // bi-weekly meeting count: duration (months) x 52/12 weeks / 2, rounded down (as workbook note 6)
  const meetings = (mths) => Math.floor(num(mths) * 52 / 12 / 2);

  const fmt = (n, dp = 2) => (Number(n) || 0).toLocaleString('en-MY', { minimumFractionDigits: dp, maximumFractionDigits: dp });

  g.Calc = { compute, lineCalc, months, meetings, r2, num, fmt };
})(window);
