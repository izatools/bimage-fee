/* Quotation output — follows the BIMAGE company template (QUOTATION - WCT - W430.docx):
   header: "Quotation" + logo + Service Tax No; client block + quotation block; Order Details table;
   totals with SST; payment terms; signatures; T&C; order confirmation page; company footer. */
(function (g) {
  const { fmt, num, months } = Calc;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const roman = (n) => ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'][n] || String(n + 1);
  const dmy = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }); };

  /* ---------- shared content model ---------- */
  function model(p, db, c) {
    const cl = db.clients.find((x) => x.id === p.clientId) || {};
    const q = p.quote;
    const sstPct = +(num(p.sstRate) * 100).toFixed(2);
    const team = p.lines.filter((l) => !l.optional && l.kind !== 'allowance').map((l) => {
      const m = months(l), n = num(l.nos);
      const role = n > 1 ? l.role.replace(/(Modeler|Drafter|Manager|Coordinator|Planner)$/, '$1s') : l.role;
      const disp = !l.disp || l.disp === 'All' ? 'All disciplines' : l.disp;
      const its = l.items && l.items !== '-' ? ` [Item${/,/.test(l.items) ? 's' : ''} ${l.items}]` : '';
      return `${n} ${role} (${disp}) – Months ${l.start}–${l.end} (${m} months)${its}`;
    });
    const rows = (q.items || []).map((it) => {
      const r = c.items[it.id] || { rate: 0, amount: 0 };
      const mode = it.mode || 'priced';
      const qtyN = num(it.qty);
      const isLot = !it.unit || /^lot$/i.test(it.unit);
      let qty = '', rate = '', amount = '';
      if (mode === 'byclient') { qty = '-'; rate = 'By Client'; amount = '-'; }
      else if (mode === 'rateonly') { qty = 'Rate only'; rate = fmt(r.rate) + (it.unit ? ' / ' + it.unit.toLowerCase() : ''); amount = '-'; }
      else {
        qty = isLot ? `${qtyN || 1} Lot` : String(qtyN);
        rate = fmt(r.rate) + (!isLot ? ' / ' + it.unit.toLowerCase() : '');
        amount = fmt(r.amount);
      }
      return { code: it.code, title: it.title, subs: it.subs || [], note: it.note || '', mode, qty, rate, amount };
    });
    return {
      co: db.settings.company, s: db.settings, cl, q, p, c, sstPct, team,
      base: rows.filter((r) => r.mode !== 'optional'), opt: rows.filter((r) => r.mode === 'optional'),
      attention: q.attention || cl.attention || '',
    };
  }

  /* ---------- HTML page (screen + print to PDF) ---------- */
  function page(p, db, c) {
    const M = model(p, db, c);
    const { co, s, cl, q } = M;
    const sub = (subs) => subs.length === 1 ? `<div>${esc(subs[0])}</div>` : subs.map((x, i) => `<div>${roman(i)}) ${esc(x)}</div>`).join('');
    const itemRow = (r) => `<tr><td class="c b">${esc(r.code)}</td><td><div class="b">${esc(r.title)}</div>${sub(r.subs)}</td><td class="c b">${esc(r.qty)}</td><td class="r b">${esc(r.rate)}</td><td class="r b">${esc(r.amount)}</td></tr>
      ${r.note ? `<tr><td></td><td class="i">*${esc(r.note)}</td><td></td><td></td><td></td></tr>` : ''}`;
    const header = `<div class="q-head"><div class="q-title">Quotation</div><div class="q-logo"><img src="assets/img/bimage-logo.jpg" alt="${esc(co.name)}"><div class="q-sst">Service Tax No: ${esc(co.sstNo)}</div></div></div>`;
    const footer = `<div class="q-foot"><div>${esc(co.name)}, ${esc(co.address)}</div><div>Tel: ${esc(co.tel)} | Email: ${esc(co.email)} | Website: ${esc(co.web)}</div></div>`;
    const kv = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
    return `
    <div class="q-toolbar no-print">
      <button class="btn" data-act="back">Back</button>
      <a class="btn" href="#/project/${p.id}/quotation">Edit quotation</a>
      <span class="q-tb-title">${esc(q.no)} <span class="muted">${esc(cl.name || '')}</span></span>
      <button class="btn" data-act="docx">Download Word</button>
      <button class="btn primary" data-act="print">Print / Save as PDF</button>
    </div>
    ${!c.allCovered ? '<div class="no-print q-warn">Some manpower lines are not allocated 100% to quotation items, so this total does not match the fee summary. Fix the splits in step 6.</div>' : ''}
    <div class="q-sheet">
    <table class="q-frame">
      <thead><tr><td>${header}</td></tr></thead>
      <tfoot><tr><td>${footer}</td></tr></tfoot>
      <tbody><tr><td>
        <div class="q-info">
          <div class="q-box">
            <table class="q-kv">
              <tr><td>Company :</td><td><b>${esc(cl.name || '')}${cl.regNo ? ' (' + esc(cl.regNo) + ')' : ''}</b>${cl.parent ? '<br>' + esc(cl.parent) : ''}</td></tr>
              ${kv('Address :', esc(cl.address || '').replace(/\n/g, '<br>'))}
              ${kv('Country :', esc(cl.country || ''))}
              ${kv('Zip/ Postal Code:', esc(cl.postcode || ''))}
              ${kv('Telephone :', esc(cl.tel || ''))}
              ${kv('Attention :', esc(M.attention))}
              ${kv('Email:', esc(cl.email || ''))}
            </table>
          </div>
          <div class="q-box">
            <div class="q-box-title">PROJECT / SERVICE QUOTATION</div>
            <table class="q-kv">
              ${kv('Quotation No :', '<b>' + esc(q.no) + '</b>')}
              ${kv('Currency :', esc(s.currency || 'RM'))}
              ${kv('Quotation Date :', esc(dmy(q.date)))}
              ${kv('Validity :', esc(q.validity))}
              ${kv('Terms:', esc(q.terms))}
              ${kv('Issued By :', esc(q.issuedBy))}
              ${kv('Reference :', esc(q.reference))}
              ${kv('Contact :', esc(q.contact))}
            </table>
          </div>
        </div>

        <table class="q-od">
          <colgroup><col style="width:7%"><col style="width:53%"><col style="width:9%"><col style="width:15%"><col style="width:16%"></colgroup>
          <thead><tr><th colspan="5" class="q-od-cap">Order Details</th></tr>
          <tr><th>Item No.</th><th>Description</th><th>Qty</th><th>Rate (RM)</th><th>Amount (RM)</th></tr></thead>
          <tbody>
            <tr class="q-proj-row"><td></td><td class="q-proj">
              <p>${esc(q.intro)}</p>
              <p><b>Project Details – </b>${esc(p.name)}${p.developer ? `<br><b>Developer – </b>${esc(p.developer)}` : ''}</p>
              ${p.infoByClient ? `<p><b>Information to be Provided by Client – </b>${esc(p.infoByClient)}</p>` : ''}
              <p><b>BIM Service Duration – ${esc(p.bimMonths)} Months</b></p>
              ${q.showTeam !== false && M.team.length ? `<p><b>BIM Team Deployment</b><br>${M.team.map(esc).join('<br>')}</p>` : ''}
            </td><td></td><td></td><td></td></tr>
            ${M.base.map(itemRow).join('')}
            ${M.opt.length ? `<tr><td></td><td class="b u">OPTIONAL ITEM${M.opt.length > 1 ? 'S' : ''} (priced separately – NOT included in Total below)</td><td></td><td></td><td></td></tr>${M.opt.map(itemRow).join('')}` : ''}
            ${(q.notes || []).length ? `<tr><td></td><td class="i">Notes:<br>${q.notes.map((n, i) => `${i + 1}) ${esc(n)}`).join('<br>')}</td><td></td><td></td><td></td></tr>` : ''}
            <tr class="q-tot"><td></td><td colspan="3" class="r b">Total (RM)</td><td class="r b">${fmt(c.base.total)}</td></tr>
            <tr class="q-tot"><td></td><td colspan="3" class="r b">SST ${M.sstPct}% (RM)</td><td class="r b">${fmt(c.base.sst)}</td></tr>
            <tr class="q-tot"><td></td><td colspan="3" class="r b">Total Amount (RM)</td><td class="r b">${fmt(c.base.grand)}</td></tr>
            ${M.opt.length ? `
            <tr class="q-tot"><td></td><td colspan="3" class="r b i">Optional Item${M.opt.length > 1 ? 's' : ''} ${M.opt.map((o) => esc(o.code)).join(', ')} – Total (RM) (not included above)</td><td class="r b i">${fmt(c.opt.total)}</td></tr>
            <tr class="q-tot"><td></td><td colspan="3" class="r b i">Optional – SST ${M.sstPct}% (RM)</td><td class="r b i">${fmt(c.opt.sst)}</td></tr>
            <tr class="q-tot"><td></td><td colspan="3" class="r b i">Optional – Total Amount (RM)</td><td class="r b i">${fmt(c.opt.grand)}</td></tr>` : ''}
            <tr><td colspan="5" class="q-pay"><b>Payment Terms:</b><br>${s.paymentTerms.map((t, i) => `${i + 1}) ${esc(t)}`).join('<br>')}<br><br>${esc(s.poNote)}</td></tr>
          </tbody>
        </table>

        <div class="q-keep">
          <div class="b" style="margin:10px 0 6px">Authorised Signature:</div>
          <table class="q-sign"><tr><th>Prepared By :</th><th>Checked by :</th></tr><tr><td><div class="q-sign-space"></div>${esc(s.preparedBy)}</td><td><div class="q-sign-space"></div>${esc(s.checkedBy)}</td></tr></table>
        </div>

        <div class="q-tc">
          <div class="b">Terms &amp; Conditions:</div>
          <ol>${s.terms.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
        </div>

        <div class="q-break"></div>
        <table class="q-conf-id"><tr><td>Company : ${esc(cl.name || '')}${cl.regNo ? ' (' + esc(cl.regNo) + ')' : ''}</td><td>Quotation No. : ${esc(q.no)}</td></tr></table>
        <div class="q-conf">
          <div class="c">Order Confirmation</div>
          <p>Please sign and stamp below to accept and confirm the order.</p>
          <div class="q-conf-grid"><div><div class="q-line"></div>Authorized Signature and Date</div><div class="c"><div class="q-line short"></div>Company Stamp</div></div>
          <p>Name: <span class="q-line inline"></span></p>
        </div>
        <div class="q-cut"></div>
        <p>All cheques should be made payable to:<br><b>${esc(co.name)}</b></p>
      </td></tr></tbody>
    </table>
    </div>`;
  }

  /* ---------- Word (.docx) ---------- */
  async function docx(p, db, c) {
    const D = window.docx;
    if (!D) throw new Error('Word library is still loading. Try again in a moment.');
    const M = model(p, db, c);
    const { co, s, cl, q } = M;
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ImageRun, Header, Footer, PageNumber, VerticalAlign, TableLayoutType } = D;
    const F = 'Arial';
    const SZ = 17; // 8.5pt
    const W = 10106; // content width in twips (A4 minus 0.625in margins)
    const logo = await fetch('assets/img/bimage-logo.jpg').then((r) => r.arrayBuffer());

    const run = (t, o = {}) => new TextRun({ text: String(t == null ? '' : t), font: F, size: o.size || SZ, bold: o.b, italics: o.i, underline: o.u ? {} : undefined, color: o.color });
    const para = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment: o.align, spacing: { before: o.before || 0, after: o.after == null ? 40 : o.after, line: 260 }, keepNext: o.keepNext, pageBreakBefore: o.pageBreak, indent: o.indent, numbering: o.numbering });
    const P = (t, o = {}) => para(run(t, o), o);
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const line = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
    const NB = { top: none, bottom: none, left: none, right: none };
    const AB = { top: line, bottom: line, left: line, right: line };
    const cell = (children, o = {}) => new TableCell({
      children: (Array.isArray(children) ? children : [children]).map((x) => typeof x === 'string' ? P(x, o) : x),
      width: { size: o.w, type: WidthType.DXA }, columnSpan: o.span, borders: o.borders || AB,
      verticalAlign: o.v || VerticalAlign.CENTER, margins: { top: 50, bottom: 50, left: 90, right: 90 },
      shading: o.fill ? { fill: o.fill, color: 'auto', type: 'clear' } : undefined,
    });

    /* header & footer */
    const header = new Header({ children: [
      new Table({ width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [5000, 5106], borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }, rows: [new TableRow({ children: [
        cell([para(run('Quotation', { b: true, size: 40 }), { after: 0 })], { w: 5000, borders: NB }),
        cell([
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ data: logo, transformation: { width: 215, height: 48 } })] }),
          para(run('Service Tax No: ' + co.sstNo, { b: true, size: 15 }), { align: AlignmentType.CENTER, before: 60 }),
        ], { w: 5106, borders: NB }),
      ] })] }),
      P('', { after: 60 }),
    ] });
    const grey = '8C8C8C';
    const footer = new Footer({ children: [
      para([run(`${co.name}, ${co.address}`, { size: 14, color: grey })], { align: AlignmentType.CENTER, after: 20 }),
      para([run(`Tel: ${co.tel} | Email: ${co.email} | Website: ${co.web}`, { size: 14, color: grey })], { align: AlignmentType.CENTER, after: 20 }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], font: F, size: 14, color: grey })] }),
    ] });

    /* info boxes */
    const kvRows = (pairs, wk, wv) => pairs.map(([k, v, b]) => new TableRow({ children: [cell(k, { w: wk, borders: NB, v: VerticalAlign.TOP }), cell((String(v || '')).split('\n').map((x, xi) => P(x, { b: b && !xi, after: 0 })), { w: wv, borders: NB, v: VerticalAlign.TOP })] }));
    const leftKv = new Table({ width: { size: 4800, type: WidthType.DXA }, columnWidths: [1400, 3400], borders: { insideHorizontal: none, insideVertical: none, top: none, bottom: none, left: none, right: none }, rows: kvRows([
      ['Company :', (cl.name || '') + (cl.regNo ? ' (' + cl.regNo + ')' : '') + (cl.parent ? '\n' + cl.parent : ''), true],
      ['Address :', cl.address], ['Country :', cl.country], ['Zip/ Postal Code:', cl.postcode], ['Telephone :', cl.tel], ['Attention :', M.attention], ['Email:', cl.email],
    ], 1400, 3400) });
    const rightKv = new Table({ width: { size: 4900, type: WidthType.DXA }, columnWidths: [1500, 3400], borders: { insideHorizontal: none, insideVertical: none, top: none, bottom: none, left: none, right: none }, rows: kvRows([
      ['Quotation No :', q.no, true], ['Currency :', s.currency || 'RM'], ['Quotation Date :', dmy(q.date)], ['Validity :', q.validity], ['Terms:', q.terms], ['Issued By :', q.issuedBy], ['Reference :', q.reference], ['Contact :', q.contact],
    ], 1500, 3400) });
    const info = new Table({ width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [4950, 206, 4950], rows: [new TableRow({ children: [
      cell([leftKv], { w: 4950, v: VerticalAlign.TOP }),
      cell(P(''), { w: 206, borders: { top: none, bottom: none, left: line, right: line } }),
      cell([para(run('PROJECT / SERVICE QUOTATION', { b: true, size: 22 }), { after: 100 }), rightKv], { w: 4950, v: VerticalAlign.TOP }),
    ] })] });

    /* order details */
    const CW = [700, 5350, 900, 1500, 1656];
    const itemCells = (r) => {
      const desc = [P(r.title, { b: true, after: 20 })];
      r.subs.forEach((x, i) => desc.push(P(r.subs.length === 1 ? x : `${roman(i)}) ${x}`, { after: 20 })));
      return [
        new TableRow({ cantSplit: true, children: [
          cell(P(r.code, { b: true, align: AlignmentType.CENTER }), { w: CW[0] }),
          cell(desc, { w: CW[1] }),
          cell(P(r.qty, { b: true, align: AlignmentType.CENTER }), { w: CW[2] }),
          cell(P(r.rate, { b: true, align: AlignmentType.RIGHT }), { w: CW[3] }),
          cell(P(r.amount, { b: true, align: AlignmentType.RIGHT }), { w: CW[4] }),
        ] }),
        ...(r.note ? [new TableRow({ children: [cell('', { w: CW[0] }), cell(P('*' + r.note, { i: true }), { w: CW[1] }), cell('', { w: CW[2] }), cell('', { w: CW[3] }), cell('', { w: CW[4] })] })] : []),
      ];
    };
    const blank5 = (mid) => new TableRow({ children: [cell('', { w: CW[0] }), cell(mid, { w: CW[1] }), cell('', { w: CW[2] }), cell('', { w: CW[3] }), cell('', { w: CW[4] })] });
    const totRow = (label, val, it) => new TableRow({ cantSplit: true, children: [cell('', { w: CW[0] }), cell(P(label, { b: true, i: it, align: AlignmentType.RIGHT }), { w: CW[1] + CW[2] + CW[3], span: 3 }), cell(P(val, { b: true, i: it, align: AlignmentType.RIGHT }), { w: CW[4] })] });

    const projBlock = [
      P(q.intro, { after: 120 }),
      para([run('Project Details – ', { b: true }), run(p.name)], { after: 40 }),
      ...(p.developer ? [para([run('Developer – ', { b: true }), run(p.developer)], { after: 120 })] : []),
      ...(p.infoByClient ? [para([run('Information to be Provided by Client – ', { b: true }), run(p.infoByClient)], { after: 120 })] : []),
      P(`BIM Service Duration – ${p.bimMonths} Months`, { b: true, after: 120 }),
      ...(q.showTeam !== false && M.team.length ? [P('BIM Team Deployment', { b: true, after: 20 }), ...M.team.map((t) => P(t, { after: 10 }))] : []),
    ];
    const rows = [
      new TableRow({ tableHeader: true, children: [cell(P('Order Details', { b: true, align: AlignmentType.CENTER }), { w: W, span: 5 })] }),
      new TableRow({ tableHeader: true, children: ['Item No.', 'Description', 'Qty', 'Rate (RM)', 'Amount (RM)'].map((t, i) => cell(P(t, { b: true, align: AlignmentType.CENTER }), { w: CW[i] })) }),
      blank5(projBlock),
      ...M.base.flatMap(itemCells),
    ];
    if (M.opt.length) {
      rows.push(blank5(P(`OPTIONAL ITEM${M.opt.length > 1 ? 'S' : ''} (priced separately – NOT included in Total below)`, { b: true, u: true })));
      M.opt.forEach((r) => rows.push(...itemCells(r)));
    }
    if ((q.notes || []).length) rows.push(blank5([P('Notes:', { i: true, after: 20 }), ...q.notes.map((n, i) => P(`${i + 1}) ${n}`, { i: true, after: 20 }))]));
    rows.push(totRow('Total (RM)', fmt(c.base.total)), totRow(`SST ${M.sstPct}% (RM)`, fmt(c.base.sst)), totRow('Total Amount (RM)', fmt(c.base.grand)));
    if (M.opt.length) {
      const codes = M.opt.map((o) => o.code).join(', ');
      rows.push(totRow(`Optional Item${M.opt.length > 1 ? 's' : ''} ${codes} – Total (RM) (not included above)`, fmt(c.opt.total), true), totRow(`Optional – SST ${M.sstPct}% (RM)`, fmt(c.opt.sst), true), totRow('Optional – Total Amount (RM)', fmt(c.opt.grand), true));
    }
    rows.push(new TableRow({ cantSplit: true, children: [cell([P('Payment Terms:', { b: true, after: 20 }), ...s.paymentTerms.map((t, i) => P(`${i + 1}) ${t}`, { after: 20 })), P(''), P(s.poNote)], { w: W, span: 5 })] }));
    const od = new Table({ width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: CW, rows });

    const sign = new Table({ width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [W / 2, W / 2], rows: [
      new TableRow({ children: [cell(P('Prepared By :', { b: true }), { w: W / 2 }), cell(P('Checked by :', { b: true }), { w: W / 2 })] }),
      new TableRow({ height: { value: 1300, rule: 'atLeast' }, children: [cell([P(''), P(''), P(''), P(s.preparedBy)], { w: W / 2, v: VerticalAlign.BOTTOM }), cell([P(''), P(''), P(''), P(s.checkedBy)], { w: W / 2, v: VerticalAlign.BOTTOM })] }),
    ] });

    const conf = new Table({ width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [W * 0.62, W * 0.38], rows: [
      new TableRow({ children: [cell(P(`Company : ${cl.name || ''}${cl.regNo ? ' (' + cl.regNo + ')' : ''}`), { w: W * 0.62 }), cell(P(`Quotation No. : ${q.no}`), { w: W * 0.38 })] }),
    ] });
    const confBox = new Table({ width: { size: W, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [W], rows: [new TableRow({ children: [cell([
      P('Order Confirmation', { align: AlignmentType.CENTER, after: 160, size: 19 }),
      P('Please sign and stamp below to accept and confirm the order.', { after: 500 }),
      para([run('_____________________________                                                                        _______________')], { after: 60 }),
      para([run('Authorized Signature and Date                                                                             Company Stamp')], { after: 160 }),
      P('Name: ______________________________', { after: 160 }),
    ], { w: W })] })] });

    const doc = new Document({
      creator: s.preparedBy || 'BIMAGE', title: 'Quotation ' + q.no, description: 'BIM consultancy quotation',
      styles: { default: { document: { run: { font: F, size: SZ } } } },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 2000, bottom: 1300, left: 900, right: 900, header: 450, footer: 400 } } },
        headers: { default: header }, footers: { default: footer },
        children: [
          info, P('', { after: 160 }), od,
          P('Authorised Signature:', { b: true, before: 200, after: 100, keepNext: true }), sign,
          P('Terms & Conditions:', { b: true, before: 300, after: 100, keepNext: true }),
          ...s.terms.map((t, i) => para(run(`${i + 1}.  ${t}`, { size: 15 }), { after: 50, indent: { left: 360, hanging: 300 } })),
          para(run(''), { pageBreak: true }), conf, P('', { after: 200 }), confBox,
          P('', { after: 400 }), P('- '.repeat(70), { color: '808080', after: 300 }),
          P('All cheques should be made payable to:'), P(co.name, { b: true }),
        ],
      }],
    });
    return Packer.toBlob(doc);
  }

  g.Quote = { page, docx, model };
})(window);
