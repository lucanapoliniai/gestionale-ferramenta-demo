/* Fatture, Scadenzario, Prima nota, Amministrazione */
(function () {
  'use strict';
  const G = window.GF;
  const { esc, eur, eur0, num, qta, dataIt, ico, somma, r2 } = G;
  const A = G.AZ;

  const CHIP_SDI = {
    GENERATO: ['ambra', 'Da inviare'], INVIATO: ['blu', 'Inviata'], CONSEGNATO: ['verde', 'Consegnata'],
    ACCETTATO: ['verde', 'Accettata'], SCARTATO: ['rosso', 'Scartata'],
  };
  const CHIP_PAG = { PAGATO: ['verde', 'Pagato'], PARZIALE: ['ambra', 'Parziale'], SCADUTO: ['rosso', 'Scaduto'], APERTO: ['grigio', 'Aperto'] };
  const chip = (c) => (c ? '<span class="chip ' + c[0] + '">' + c[1] + '</span>' : '');
  const msgHtml = (m) => (m ? '<div class="messaggio ' + m.tipo + '">' + ico(m.tipo === 'verde' ? 'spunta' : 'avviso') + '<div>' + m.testo + '</div></div>' : '');

  // =====================================================================
  // FATTURE
  // =====================================================================
  const uFat = () => G.ui('fatture', () => ({ pannello: null, diff: null, acc: null, nc: null }));
  const fatturaScelta = () => G.selezionato('fatture');

  function testoScadenza(metodoId, testo) {
    let scad = null;
    if (metodoId) scad = G.scadenzaDa(metodoId, G.OGGI);
    else if (testo && testo.trim()) { const p = G.interpretaPagamento(testo); if (p) scad = p.metodoId ? G.scadenzaDa(p.metodoId, G.OGGI) : G.D.piuGiorni(G.OGGI, p.giorni); }
    if (!scad) return '';
    return 'Scadenza nello scadenzario: <strong>' + dataIt(scad) + '</strong>' + (scad === G.OGGI ? ' (il giorno della fattura)' : '');
  }

  function pannelloDifferita(u) {
    const S = G.S, d = u.diff;
    const clientiDdt = S.clienti.filter((c) => S.ddt.some((x) => x.clienteId === c.id && !x.fatturaId));
    const ddt = d.clienteId ? S.ddt.filter((x) => x.clienteId === d.clienteId && !x.fatturaId).sort((a, b) => a.data.localeCompare(b.data)) : [];
    const sel = ddt.filter((x) => d.sel[x.id]);
    const totSel = somma(sel, (x) => x.totale);
    const listaDdt = d.clienteId ? (ddt.length ? '<div class="tab" style="max-height:250px"><table><thead><tr><th style="width:56px">✔</th><th>DDT n.</th><th>Data</th><th>Righe</th><th class="n">Totale</th></tr></thead><tbody>'
      + ddt.map((x) => '<tr class="' + (d.sel[x.id] ? 'scelta' : '') + '" data-az="diff-ddt" data-id="' + x.id + '"><td><span class="interruttore' + (d.sel[x.id] ? ' acceso' : '') + '" style="min-height:30px;padding:0 6px;border:0;background:none"><span class="pallino"></span></span></td><td>' + x.numero + '</td><td>' + dataIt(x.data) + '</td><td>' + x.righe.length + '</td><td class="n">' + eur(x.totale) + '</td></tr>').join('')
      + '</tbody></table></div>' : '<p class="muto">Questo cliente non ha DDT da fatturare.</p>') : '<p class="muto">Scegli il cliente: compaiono i suoi DDT del mese, già spuntati.</p>';
    return '<div class="scheda pannello"><div class="testa-scheda"><h2>Fattura da DDT <span class="muto">riepilogativa di fine mese</span></h2><button class="bottone-icona chiudi" data-az="fatt-chiudi-pannello" aria-label="Chiudi">' + ico('chiudi') + '</button></div>'
      + '<p class="suggerimento" style="margin-top:-6px">La fattura non riscarica il magazzino (l\'hanno già fatto i DDT) e nell\'XML riporta i riferimenti dei DDT (TD24).</p>'
      + '<div class="riga-campi" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">'
      + '<div class="campo-blocco"><span class="etichetta">Cliente * (' + clientiDdt.length + ' con DDT da fatturare)</span>' + G.combo('diff-cliente', { voci: clientiDdt.map((c) => ({ id: c.id, testo: c.nome, sotto: S.ddt.filter((x) => x.clienteId === c.id && !x.fatturaId).length + ' DDT · ' + c.pagamento })), valore: d.clienteId, onScegli: (id) => sceltaClienteDiff(id) }) + '</div>'
      + '<div class="campo-blocco"><span class="etichetta">Pagamento (scegli o scrivi)</span>' + G.combo('diff-pag', { voci: S.metodi.map((m) => ({ id: m.id, testo: m.nome })), valore: d.metodoId, libero: true, liberoTesto: d.metodoId ? undefined : d.testo, segnaposto: 'es. Riba 60gg fine mese', onScrivi: (t, id) => { d.testo = t; d.metodoId = id; const e = document.getElementById('diff-scad'); if (e) e.innerHTML = testoScadenza(id, t); }, onScegli: (id) => { d.metodoId = id; d.testo = id ? G.metodo(id).nome : d.testo; const e = document.getElementById('diff-scad'); if (e) e.innerHTML = testoScadenza(id, d.testo); } })
      + '<span class="suggerimento" id="diff-scad">' + testoScadenza(d.metodoId, d.testo) + '</span></div>'
      + '<div class="campo-blocco"><label class="etichetta" for="diff-regime">Regime IVA</label><select class="campo" id="diff-regime" data-ch="diff-regime">' + [['ORD', 'ORD — IVA ordinaria'], ['SPL', 'Split payment (enti pubblici)'], ['REV', 'Reverse charge']].map((r) => '<option value="' + r[0] + '"' + (d.regime === r[0] ? ' selected' : '') + '>' + r[1] + '</option>').join('') + '</select></div>'
      + '</div><div style="margin-top:14px">' + listaDdt + '</div>' + msgHtml(d.msg)
      + '<div class="riga-flex" style="margin-top:14px"><button class="btn primario" data-az="diff-emetti"' + (sel.length ? '' : ' disabled') + '>Emetti fattura differita</button>'
      + (ddt.length ? '<button class="btn" data-az="diff-tutti">Seleziona tutti</button>' : '') + '<span class="muto">' + (sel.length ? sel.length + ' DDT · ' + eur(totSel) : '') + '</span></div></div>';
  }
  function sceltaClienteDiff(id) {
    const S = G.S, d = uFat().diff;
    d.clienteId = id; d.sel = {}; d.msg = null;
    if (id) {
      S.ddt.filter((x) => x.clienteId === id && !x.fatturaId).forEach((x) => { d.sel[x.id] = true; });
      const c = G.cli(id);
      const m = S.metodi.find((x) => x.nome === c.pagamento);
      d.metodoId = m ? m.id : null; d.testo = c.pagamento;
    }
    G.ridisegna();
  }

  function pannelloAccompagnatoria(u) {
    const S = G.S, a = u.acc;
    const c = a.clienteId ? G.cli(a.clienteId) : null;
    const lst = c ? c.listino : 'A';
    const pz = (x) => (lst === 'C' ? x.prezzoC : lst === 'B' ? x.prezzoB : x.prezzoA);
    let ris = '';
    if (a.q.trim()) {
      const pezzi = G.normalizza(a.q).split(/\s+/).filter(Boolean);
      const r = S.articoli.filter((x) => pezzi.every((p) => G.normalizza(x.codice + ' ' + x.descr + ' ' + x.barcode).includes(p))).slice(0, 25);
      ris = '<div class="risultati">' + (r.length ? r.map((x) => '<button class="risultato" data-az="acc-aggiungi" data-id="' + x.id + '"><span class="mono">' + esc(x.codice) + '</span><span class="descr">' + esc(x.descr) + '</span><span class="giac">giac. ' + qta(x.giac) + '</span><span class="prezzo">' + eur(pz(x)) + '</span></button>').join('') : '<div class="combo-voce muto">Nessun articolo</div>') + '</div>';
    }
    const righe = a.righe.map((r, i) => '<tr><td class="mono">' + esc(r.codice) + '</td><td class="lungo">' + esc(r.descr) + '</td><td><div class="passi"><button data-az="acc-qta" data-i="' + i + '" data-d="-1" aria-label="Meno">' + ico('meno') + '</button><input inputmode="decimal" value="' + qta(r.qta) + '" data-ch="acc-qta-scrivi" data-i="' + i + '" aria-label="Quantità"><button data-az="acc-qta" data-i="' + i + '" data-d="1" aria-label="Più">' + ico('piu') + '</button></div></td><td class="n">' + num(r.prezzo) + '</td><td class="n"><strong>' + eur(G.totaleRiga(r)) + '</strong></td><td><button class="bottone-icona" data-az="acc-togli" data-i="' + i + '" aria-label="Togli">' + ico('chiudi') + '</button></td></tr>').join('');
    return '<div class="scheda pannello"><div class="testa-scheda"><h2>Fattura accompagnatoria <span class="muto">serie FAC · viaggia con la merce</span></h2><button class="bottone-icona chiudi" data-az="fatt-chiudi-pannello" aria-label="Chiudi">' + ico('chiudi') + '</button></div>'
      + '<div class="riga-campi" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">'
      + '<div class="campo-blocco"><span class="etichetta">Cliente *</span>' + G.combo('acc-cliente', { voci: S.clienti.filter((x) => x.piva || x.cf).map((x) => ({ id: x.id, testo: x.nome, cerca: x.piva, sotto: x.citta + ' · listino ' + x.listino })), valore: a.clienteId, onScegli: (id) => { a.clienteId = id; if (id) { const m = S.metodi.find((x) => x.nome === G.cli(id).pagamento); if (m) a.metodoId = m.id; } G.ridisegna(); } }) + '</div>'
      + '<div class="campo-blocco"><label class="etichetta" for="acc-pag">Pagamento</label><select class="campo" id="acc-pag" data-ch="acc-pag">' + S.metodi.map((m) => '<option value="' + m.id + '"' + (a.metodoId === m.id ? ' selected' : '') + '>' + esc(m.nome) + '</option>').join('') + '</select><span class="suggerimento" id="acc-scad">' + testoScadenza(a.metodoId) + '</span></div>'
      + '</div>'
      + '<div class="campo-blocco" style="margin-top:12px"><label class="etichetta" for="acc-cerca">Aggiungi articolo (il prezzo segue il listino ' + lst + ' del cliente)</label><div class="cerca">' + ico('cerca') + '<input class="campo" id="acc-cerca" data-in="acc-cerca" value="' + esc(a.q) + '" placeholder="Codice, descrizione o barcode" autocomplete="off" autocapitalize="off" spellcheck="false"></div><div id="acc-risultati">' + ris + '</div></div>'
      + (a.righe.length ? '<div class="tab carrello" style="margin-top:12px"><table><thead><tr><th>Codice</th><th>Descrizione</th><th>Q.tà</th><th class="n">Prezzo</th><th class="n">Totale</th><th></th></tr></thead><tbody>' + righe + '</tbody></table></div>' : '')
      + msgHtml(a.msg)
      + '<div class="riga-flex" style="margin-top:14px"><button class="btn primario" data-az="acc-emetti"' + (a.righe.length ? '' : ' disabled') + '>Emetti fattura accompagnatoria</button><strong class="num">Totale: ' + eur(somma(a.righe, G.totaleRiga)) + '</strong></div></div>';
  }

  function pannelloNotaCredito(u) {
    const f = fatturaScelta();
    const n = u.nc;
    return '<div class="scheda pannello"><div class="testa-scheda"><h2>Nota di credito</h2><button class="bottone-icona chiudi" data-az="fatt-chiudi-pannello" aria-label="Chiudi">' + ico('chiudi') + '</button></div>'
      + '<p style="margin-top:-4px">Storno TOTALE di ' + esc(G.fatturaNumero(f)) + ' — ' + esc(G.cli(f.clienteId).nome) + ' · ' + eur(f.totale) + '. La partita aperta si riduce o si chiude da sola.</p>'
      + '<div class="riga-campi"><div class="campo-blocco"><label class="etichetta" for="nc-motivo">Motivo *</label><input class="campo" id="nc-motivo" value="' + esc(n.motivo) + '" data-in="nc-motivo" placeholder="es. reso merce non conforme"></div></div>'
      + '<div class="riga-flex" style="margin-top:12px"><button class="interruttore' + (n.magazzino ? ' acceso' : '') + '" data-az="nc-magazzino" aria-pressed="' + n.magazzino + '"><span class="pallino"></span>La merce rientra in magazzino</button></div>'
      + msgHtml(n.msg)
      + '<div class="riga-flex" style="margin-top:14px"><button class="btn primario" data-az="nc-emetti">Emetti nota di credito</button></div></div>';
  }

  G.VISTE.fatture = {
    render() {
      const S = G.S, u = uFat();
      const daSdi = S.fatture.filter((f) => f.sdi === 'GENERATO').length;
      const scarti = S.fatture.filter((f) => f.sdi === 'SCARTATO').length;
      const f = fatturaScelta();
      let pannello = '';
      if (u.pannello === 'diff') pannello = pannelloDifferita(u);
      else if (u.pannello === 'acc') pannello = pannelloAccompagnatoria(u);
      else if (u.pannello === 'nc' && f) pannello = pannelloNotaCredito(u);
      const righe = S.fatture.slice();
      return '<div class="titolo-pagina"><h1>Fatture</h1><span class="muto">' + righe.length + ' documenti · ' + daSdi + ' da inviare allo SDI' + (scarti ? ' · <span class="rosso-t">' + scarti + ' scartata</span>' : '') + '</span></div>'
        + '<div class="strumenti" style="margin-bottom:10px">'
        + '<button class="btn' + (u.pannello === 'diff' ? ' primario' : '') + '" data-az="fatt-diff">Fattura da DDT</button>'
        + '<button class="btn' + (u.pannello === 'acc' ? ' primario' : '') + '" data-az="fatt-acc">Fattura accompagnatoria</button>'
        + '<button class="btn" data-az="fatt-nc">Nota di credito</button>'
        + '<button class="btn" data-az="fatt-sdi">' + ico('invia') + 'PEC / SDI…</button>'
        + '<button class="btn" data-az="fatt-comm">' + ico('zip') + 'Commercialista…</button></div>'
        + '<div class="strumenti" style="margin-bottom:14px">'
        + '<button class="btn" data-az="fatt-pdf"' + (f ? '' : ' disabled') + '>' + ico('documento') + 'Apri PDF</button>'
        + '<button class="btn" data-az="fatt-mail"' + (f ? '' : ' disabled') + '>' + ico('posta') + 'Invia per email al cliente</button>'
        + (f && f.sdi === 'SCARTATO' ? '<button class="btn pericolo" data-az="fatt-scarti">' + ico('avviso') + 'Correggi lo scarto</button>' : '')
        + '<button class="btn pericolo" data-az="fatt-annulla"' + (f ? '' : ' disabled') + '>Annulla documento</button></div>'
        + pannello
        + G.tabella('fatture', {
          righe, chiave: (x) => x.id, altezza: pannello ? '420px' : 'calc(100vh - 250px)', ordine: { k: 'data', dir: -1 },
          classe: (x) => (x.sdi === 'SCARTATO' ? 'tinta-rossa' : ''),
          colonne: [
            { k: 'doc', t: 'Documento', v: (x) => x.anno * 1000000 + (x.tipo === 'FT' ? 0 : x.tipo === 'FAC' ? 300000 : 600000) + x.numero, testo: G.fatturaNumero, f: (x) => '<span class="mono">' + esc(G.fatturaNumero(x)) + '</span>', w: 118 },
            { k: 'data', t: 'Data', v: (x) => x.data + String(x.numero).padStart(6, '0'), testo: (x) => dataIt(x.data), f: (x) => dataIt(x.data), w: 92 },
            { k: 'cliente', t: 'Cliente', v: (x) => (G.cli(x.clienteId) || {}).nome, cls: 'lungo', w: 200 },
            { k: 'totale', t: 'Totale', n: true, f: (x) => eur(x.totale), w: 96 },
            { k: 'pag', t: 'Pagamento', v: G.statoPagamentoFattura, f: (x) => chip(CHIP_PAG[G.statoPagamentoFattura(x)]), w: 96 },
            { k: 'sdi', t: 'SDI', v: (x) => (CHIP_SDI[x.sdi] || ['', x.sdi])[1], f: (x) => chip(CHIP_SDI[x.sdi]), w: 104 },
            { k: 'mail', t: 'Email', v: (x) => (x.mail === 'INVIATA' ? 'Inviata' : ''), f: (x) => (x.mail === 'INVIATA' ? '<span class="verde-t">' + ico('spunta') + '</span> inviata' : '<span class="muto">—</span>'), w: 78 },
          ],
          onSel: () => G.ridisegna(),
        });
    },
  };
  A['fatt-chiudi-pannello'] = () => { uFat().pannello = null; G.ridisegna(); };
  A['fatt-diff'] = () => { const u = uFat(); u.pannello = 'diff'; u.diff = { clienteId: null, sel: {}, metodoId: null, testo: '', regime: 'ORD', msg: null }; G.ridisegna(); };
  A['fatt-acc'] = () => { const u = uFat(); u.pannello = 'acc'; u.acc = { clienteId: null, metodoId: 1, righe: [], q: '', msg: null }; G.ridisegna(); };
  A['fatt-nc'] = () => {
    const u = uFat(), f = fatturaScelta();
    if (!f || f.tipo === 'NC') { G.avviso('Per la nota di credito tocca prima nell\'elenco la fattura da stornare.', 'errore'); return; }
    if (G.S.fatture.some((x) => x.tipo === 'NC' && x.stornoDi === f.id)) { G.avviso('Questa fattura è già stornata da una nota di credito.', 'errore'); return; }
    u.pannello = 'nc'; u.nc = { motivo: '', magazzino: true, msg: null }; G.ridisegna();
  };
  A['diff-ddt'] = (el) => { const d = uFat().diff; const id = Number(el.dataset.id); d.sel[id] = !d.sel[id]; G.ridisegna(); };
  A['diff-tutti'] = () => { const d = uFat().diff; G.S.ddt.filter((x) => x.clienteId === d.clienteId && !x.fatturaId).forEach((x) => { d.sel[x.id] = true; }); G.ridisegna(); };
  G.CH['diff-regime'] = (el) => { uFat().diff.regime = el.value; };
  A['diff-emetti'] = () => {
    const S = G.S, u = uFat(), d = u.diff;
    const c = G.cli(d.clienteId);
    const ddt = S.ddt.filter((x) => x.clienteId === d.clienteId && !x.fatturaId && d.sel[x.id]).sort((a, b) => a.data.localeCompare(b.data));
    if (!c || !ddt.length) return;
    const testo = (d.testo || '').trim();
    const pag = d.metodoId ? { metodoId: d.metodoId, giorni: G.metodo(d.metodoId).giorni } : (G.interpretaPagamento(testo) || { metodoId: null, giorni: 0 });
    const righe = [].concat(...ddt.map((x) => x.righe.map((r) => Object.assign({}, r))));
    const t = G.totaliRighe(righe);
    let causale = 'Fattura differita — DDT ' + ddt.map((x) => x.numero + ' del ' + dataIt(x.data)).join(', ');
    if (causale.length > 200) causale = 'Fattura differita — ' + ddt.length + ' DDT dal ' + dataIt(ddt[0].data) + ' al ' + dataIt(ddt[ddt.length - 1].data);
    const f = {
      id: G.nuovoId(), tipo: 'FT', numero: ++S.prossimo.ft, anno: Number(G.OGGI.slice(0, 4)), data: G.OGGI, clienteId: c.id, righe,
      imponibile: t.imponibile, iva: t.iva, totale: t.totale, metodoId: pag.metodoId, pagamentoTesto: d.metodoId ? '' : testo,
      ddtIds: ddt.map((x) => x.id), sdi: 'GENERATO', mail: '', progressivo: String(++S.prossimo.progressivo).padStart(5, '0'), causale,
    };
    S.fatture.push(f);
    ddt.forEach((x) => { x.fatturaId = f.id; });
    const scad = pag.metodoId ? G.scadenzaDa(pag.metodoId, f.data) : G.D.piuGiorni(f.data, pag.giorni);
    S.scadenze.push({ id: G.nuovoId(), tipo: 'ATTIVA', soggettoId: c.id, fatturaId: f.id, documento: String(f.numero), dataDoc: f.data, scadenza: scad, importo: d.regime === 'SPL' ? t.imponibile : t.totale, pagato: 0, stato: 'APERTA', metodoId: pag.metodoId || 4 });
    G.indicizza();
    G.log('Fattura', 'Emessa fattura differita n. ' + f.numero + ' (' + ddt.length + ' DDT) a ' + c.nome + ' · ' + eur(f.totale));
    u.pannello = null;
    G.TAB.fatture.sel = String(f.id);
    G.salva(); G.ridisegna();
    G.apriDocumento(G.docDaFattura(f));
    G.avviso('Fattura n. ' + f.numero + ' emessa · ' + ddt.length + ' DDT riepilogati · scadenza ' + dataIt(scad));
  };

  G.IN['acc-cerca'] = (el) => {
    const a = uFat().acc; a.q = el.value;
    const box = document.getElementById('acc-risultati');
    if (!box) return;
    // ridisegna solo i risultati, cosi' la tastiera resta aperta
    const tmp = document.createElement('div'); tmp.innerHTML = pannelloAccompagnatoria(uFat());
    const nuovo = tmp.querySelector('#acc-risultati');
    box.innerHTML = nuovo ? nuovo.innerHTML : '';
  };
  A['acc-aggiungi'] = (el) => {
    const a = uFat().acc, x = G.art(Number(el.dataset.id));
    const c = a.clienteId ? G.cli(a.clienteId) : null;
    const lst = c ? c.listino : 'A';
    const r = a.righe.find((y) => y.artId === x.id);
    if (r) r.qta += 1; else a.righe.push({ artId: x.id, codice: x.codice, descr: x.descr, um: x.um, qta: 1, prezzo: lst === 'C' ? x.prezzoC : lst === 'B' ? x.prezzoB : x.prezzoA, sconto: 0, iva: x.iva });
    a.q = ''; G.ridisegna();
  };
  A['acc-qta'] = (el) => { const a = uFat().acc; const r = a.righe[Number(el.dataset.i)]; r.qta = Math.max(1, r.qta + Number(el.dataset.d)); G.ridisegna(); };
  G.CH['acc-qta-scrivi'] = (el) => { const a = uFat().acc; const r = a.righe[Number(el.dataset.i)]; r.qta = Math.max(0.01, G.leggiNumSemplice(el.value) || 1); G.ridisegna(); };
  A['acc-togli'] = (el) => { const a = uFat().acc; a.righe.splice(Number(el.dataset.i), 1); G.ridisegna(); };
  G.CH['acc-pag'] = (el) => { const a = uFat().acc; a.metodoId = Number(el.value); const e = document.getElementById('acc-scad'); if (e) e.innerHTML = testoScadenza(a.metodoId); };
  A['acc-emetti'] = () => {
    const S = G.S, u = uFat(), a = u.acc;
    const c = a.clienteId ? G.cli(a.clienteId) : null;
    if (!c) { a.msg = { tipo: 'rosso', testo: 'Scegli il cliente (con partita IVA o codice fiscale).' }; G.ridisegna(); return; }
    const righe = a.righe.map((r) => Object.assign({}, r));
    const t = G.totaliRighe(righe);
    const f = { id: G.nuovoId(), tipo: 'FAC', numero: ++S.prossimo.fac, anno: Number(G.OGGI.slice(0, 4)), data: G.OGGI, clienteId: c.id, righe, imponibile: t.imponibile, iva: t.iva, totale: t.totale, metodoId: a.metodoId, pagamentoTesto: '', ddtIds: [], sdi: 'GENERATO', mail: '', progressivo: String(++S.prossimo.progressivo).padStart(5, '0'), causale: 'Vendita' };
    S.fatture.push(f);
    S.scadenze.push({ id: G.nuovoId(), tipo: 'ATTIVA', soggettoId: c.id, fatturaId: f.id, documento: 'FAC ' + f.numero, dataDoc: f.data, scadenza: G.scadenzaDa(f.metodoId, f.data), importo: t.totale, pagato: 0, stato: 'APERTA', metodoId: f.metodoId });
    righe.forEach((r) => { const x = G.art(r.artId); if (x) x.giac = r2(x.giac - r.qta); });
    G.indicizza();
    G.log('Fattura', 'Emessa fattura accompagnatoria FAC ' + f.numero + ' a ' + c.nome + ' · ' + eur(f.totale));
    u.pannello = null; G.TAB.fatture.sel = String(f.id);
    G.salva(); G.ridisegna(); G.apriDocumento(G.docDaFattura(f));
  };

  G.IN['nc-motivo'] = (el) => { uFat().nc.motivo = el.value; };
  A['nc-magazzino'] = () => { const n = uFat().nc; n.magazzino = !n.magazzino; G.ridisegna(); };
  A['nc-emetti'] = () => {
    const S = G.S, u = uFat(), n = u.nc, f = fatturaScelta();
    if (!n.motivo.trim()) { n.msg = { tipo: 'rosso', testo: 'Indica il motivo dello storno.' }; G.ridisegna(); return; }
    S.prossimo.nc = (S.prossimo.nc || 2) + 1;
    const nc = { id: G.nuovoId(), tipo: 'NC', numero: S.prossimo.nc, anno: Number(G.OGGI.slice(0, 4)), data: G.OGGI, clienteId: f.clienteId, righe: f.righe.map((r) => Object.assign({}, r)), imponibile: f.imponibile, iva: f.iva, totale: f.totale, metodoId: f.metodoId, pagamentoTesto: '', ddtIds: [], sdi: 'GENERATO', mail: '', progressivo: String(++S.prossimo.progressivo).padStart(5, '0'), causale: 'Storno fattura n. ' + f.numero + '/' + f.anno + ' — ' + n.motivo.trim(), stornoDi: f.id };
    S.fatture.push(nc);
    const s = S.scadenze.find((x) => x.fatturaId === f.id && x.stato !== 'PAGATA');
    if (s) { s.importo = Math.max(s.pagato, r2(s.importo - nc.totale)); if (s.importo <= s.pagato + 0.005) s.stato = 'PAGATA'; }
    if (n.magazzino) nc.righe.forEach((r) => { const x = G.art(r.artId); if (x) x.giac = r2(x.giac + r.qta); });
    G.indicizza();
    G.log('Nota di credito', 'Emessa nota di credito n. ' + nc.numero + ' su ' + G.fatturaNumero(f) + ' (' + n.motivo.trim() + ')' + (n.magazzino ? ' · merce rientrata' : ''));
    u.pannello = null; G.TAB.fatture.sel = String(nc.id);
    G.salva(); G.ridisegna(); G.apriDocumento(G.docDaFattura(nc));
  };

  A['fatt-pdf'] = () => { const f = fatturaScelta(); if (f) G.apriDocumento(G.docDaFattura(f)); };
  A['fatt-mail'] = () => {
    const f = fatturaScelta(); if (!f) return;
    const c = G.cli(f.clienteId);
    if (!c.email) { G.avviso('Il cliente non ha un indirizzo email: aggiungilo nella sua scheda (Clienti → Modifica).', 'errore'); return; }
    f.mail = 'INVIATA';
    G.log('Email', G.fatturaNumero(f) + ' inviata a ' + c.email + ' (PDF allegato)');
    G.salva(); G.ridisegna();
    G.avviso(esc(G.fatturaNumero(f)) + ' inviata a ' + esc(c.email) + ' col PDF allegato · nella demo non parte nessuna email');
  };
  A['fatt-annulla'] = () => {
    const S = G.S, f = fatturaScelta(); if (!f) return;
    if (['INVIATO', 'CONSEGNATO', 'ACCETTATO'].includes(f.sdi)) { G.avviso('Già inviata allo SDI: non si annulla, si corregge con una nota di credito.', 'errore'); return; }
    G.chiedi({
      titolo: 'Annullare ' + G.fatturaNumero(f) + '?', pericolo: true, si: 'Annulla documento',
      testo: 'Il documento sparisce dall\'elenco' + (f.tipo === 'FAC' ? ', la merce torna in magazzino' : '') + (f.ddtIds && f.ddtIds.length ? ', i ' + f.ddtIds.length + ' DDT tornano da fatturare' : '') + ' e la partita esce dallo scadenzario. Resta scritto nella cronologia.',
      onSi: () => {
        S.fatture = S.fatture.filter((x) => x.id !== f.id);
        S.scadenze = S.scadenze.filter((x) => x.fatturaId !== f.id);
        S.ddt.forEach((x) => { if (x.fatturaId === f.id) x.fatturaId = null; });
        if (f.tipo === 'FAC') f.righe.forEach((r) => { const x = G.art(r.artId); if (x) x.giac = r2(x.giac + r.qta); });
        G.TAB.fatture.sel = null;
        G.indicizza();
        G.log('Annullo', 'Annullata ' + G.fatturaNumero(f) + ' del ' + dataIt(f.data) + ' · ' + G.cli(f.clienteId).nome + ' · ' + eur(f.totale));
        G.salva(); G.ridisegna(); G.avviso(esc(G.fatturaNumero(f)) + ' annullata');
      },
    });
  };
  A['fatt-scarti'] = () => {
    const S = G.S;
    let f = fatturaScelta();
    if (!f || f.sdi !== 'SCARTATO') { f = S.fatture.find((x) => x.sdi === 'SCARTATO'); if (!f) return; G.TAB.fatture.sel = String(f.id); G.ridisegna(); }
    const c = G.cli(f.clienteId);
    G.apriFinestra({
      titolo: 'Scarto dello SDI · ' + G.fatturaNumero(f),
      corpo: '<div class="messaggio rosso">' + ico('avviso') + '<div><strong>Codice ' + esc(f.scarto || '00305') + '</strong><br>Lo SDI ha rifiutato la fattura perché la partita IVA del cliente non risulta valida.</div></div>'
        + '<p>Correggi i dati di <strong>' + esc(c.nome) + '</strong>: il programma rigenera l\'XML con un nuovo progressivo, pronto per il prossimo invio allo SDI.</p>'
        + '<div class="campo-blocco"><label class="etichetta" for="sc-piva">Partita IVA del cliente</label><input class="campo" id="sc-piva" inputmode="numeric" value="' + esc(c.piva) + '"></div>',
      piede: '<button class="btn" data-az="chiudi-finestra">Annulla</button><button class="btn primario" data-az="sc-rigenera" data-id="' + f.id + '">Salva e rigenera l\'XML</button>',
    });
  };
  A['sc-rigenera'] = (el) => {
    const S = G.S, f = S.fatture.find((x) => x.id === Number(el.dataset.id));
    const c = G.cli(f.clienteId);
    c.piva = document.getElementById('sc-piva').value.trim() || c.piva;
    f.sdi = 'GENERATO'; delete f.scarto;
    f.progressivo = String(++S.prossimo.progressivo).padStart(5, '0');
    G.log('SDI', 'Rigenerato l\'XML di ' + G.fatturaNumero(f) + ' dopo lo scarto (nuovo file IT' + S.negozio.piva + '_' + f.progressivo + '.xml)');
    G.chiudiFinestra(); G.salva(); G.ridisegna();
    G.avviso('XML rigenerato: ' + esc(G.fatturaNumero(f)) + ' torna «Da inviare»');
  };

  // ---- invio allo SDI per PEC (simulato) ----
  let sdi = null;
  function mesiDaInviare() {
    const m = {};
    G.S.fatture.filter((f) => f.sdi === 'GENERATO').forEach((f) => { const k = f.data.slice(0, 7); m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).sort().map((k) => ({ k, n: m[k] }));
  }
  const nomeMese = (k) => G.MESI_LUNGHI[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(0, 4);
  function corpoSdi() {
    const S = G.S;
    const mesi = mesiDaInviare();
    if (sdi.fase === 'scegli' || sdi.fase === 'conferma') {
      if (!mesi.length) return '<div class="messaggio verde">' + ico('spunta') + '<div>Tutte le fatture sono già state inviate allo SDI.</div></div>';
      if (!sdi.mese || !mesi.some((x) => x.k === sdi.mese)) sdi.mese = mesi[0].k;
      const fatt = S.fatture.filter((f) => f.sdi === 'GENERATO' && f.data.startsWith(sdi.mese));
      const zip = 'IT' + S.negozio.piva + '_Z' + sdi.mese.slice(5, 7) + sdi.mese.slice(2, 4) + '.zip';
      return '<p style="margin-top:0">Come fa il negozio a fine mese: tutte le fatture del mese in uno ZIP, mandato per PEC allo SDI. Il programma poi legge da solo le ricevute (consegna, scarto, esito).</p>'
        + '<div class="pillole" style="margin-bottom:12px">' + mesi.map((x) => '<button class="pillola' + (sdi.mese === x.k ? ' scelta' : '') + '" data-az="sdi-mese" data-k="' + x.k + '">' + nomeMese(x.k) + ' (' + x.n + ')</button>').join('') + '</div>'
        + '<div class="tab" style="max-height:260px"><table><thead><tr><th>Documento</th><th>Cliente</th><th class="n">Totale</th><th>File XML</th></tr></thead><tbody>'
        + fatt.map((f) => '<tr><td class="mono">' + esc(G.fatturaNumero(f)) + '</td><td>' + esc(G.cli(f.clienteId).nome) + '</td><td class="n">' + eur(f.totale) + '</td><td class="mono">IT' + esc(S.negozio.piva) + '_' + esc(f.progressivo) + '.xml</td></tr>').join('')
        + '</tbody></table></div>'
        + '<p class="suggerimento">ZIP: <span class="mono">' + zip + '</span> · ' + fatt.length + ' fatture · ' + eur(somma(fatt, (f) => f.totale)) + (S.commercialista.attivo ? ' · al commercialista partirà lo ZIP dei PDF' : '') + '</p>'
        + (sdi.fase === 'conferma' ? '<div class="messaggio ambra">' + ico('avviso') + '<div>Stai per inviare allo SDI ' + fatt.length + ' fatture di ' + nomeMese(sdi.mese) + '. Nel negozio l\'invio è vero; in questa demo è una simulazione.</div></div>' : '');
    }
    return '<div class="pila" style="gap:8px">' + sdi.log.map((r) => '<div class="messaggio ' + r[0] + '" style="margin:0">' + ico(r[0] === 'verde' ? 'spunta' : 'invia') + '<div>' + r[1] + '</div></div>').join('') + '</div>';
  }
  function piedeSdi() {
    if (sdi.fase === 'scegli') return '<button class="btn" data-az="chiudi-finestra">Chiudi</button>' + (mesiDaInviare().length ? '<button class="btn primario" data-az="sdi-prepara">' + ico('invia') + 'Invia allo SDI</button>' : '');
    if (sdi.fase === 'conferma') return '<button class="btn" data-az="sdi-indietro">Indietro</button><button class="btn primario" data-az="sdi-invia">Sì, invia</button>';
    return '<button class="btn primario" data-az="chiudi-finestra"' + (sdi.fase === 'invio' ? ' disabled' : '') + '>Chiudi</button>';
  }
  function apriSdi() {
    sdi = { fase: 'scegli', mese: null, log: [] };
    G.apriFinestra({ titolo: 'PEC / SDI — invio delle fatture', larga: true, corpo: corpoSdi, piede: piedeSdi(), piedeFn: piedeSdi });
  }
  A['fatt-sdi'] = apriSdi;
  A['sdi-mese'] = (el) => { sdi.mese = el.dataset.k; sdi.fase = 'scegli'; G.aggiornaFinestra(); };
  A['sdi-prepara'] = () => { sdi.fase = 'conferma'; G.aggiornaFinestra(); };
  A['sdi-indietro'] = () => { sdi.fase = 'scegli'; G.aggiornaFinestra(); };
  A['sdi-invia'] = () => {
    const S = G.S;
    const fatt = S.fatture.filter((f) => f.sdi === 'GENERATO' && f.data.startsWith(sdi.mese));
    const zip = 'IT' + S.negozio.piva + '_Z' + sdi.mese.slice(5, 7) + sdi.mese.slice(2, 4) + '.zip';
    const mese = sdi.mese;
    sdi.fase = 'invio';
    sdi.log = [['blu', 'Preparo lo ZIP <span class="mono">' + zip + '</span> con ' + fatt.length + ' fatture…']];
    G.aggiornaFinestra();
    const passo = (ms, f) => setTimeout(() => { if (!sdi) return; f(); G.aggiornaFinestra(); }, ms);
    passo(700, () => sdi.log.push(['blu', 'Invio la PEC allo SDI (sdi01@pec.fatturapa.it)…']));
    passo(1500, () => {
      fatt.forEach((f) => { f.sdi = 'INVIATO'; });
      sdi.log.push(['verde', 'PEC consegnata: le ' + fatt.length + ' fatture risultano «Inviate».']);
      G.log('SDI', 'Inviate allo SDI ' + fatt.length + ' fatture di ' + nomeMese(mese) + ' (' + zip + ')');
    });
    passo(2600, () => {
      fatt.forEach((f) => { f.sdi = 'CONSEGNATO'; });
      sdi.log.push(['verde', 'Ricevute dallo SDI lette dalla casella PEC: ' + fatt.length + ' fatture «Consegnate» ai clienti.']);
      if (S.commercialista.attivo) {
        S.commercialista.invii.unshift({ quando: G.OGGI, descr: 'Fatture di ' + nomeMese(mese) + ' · ' + fatt.length + ' PDF', dest: S.commercialista.email, esito: 'INVIATA' });
        sdi.log.push(['verde', 'Al commercialista: ZIP con ' + fatt.length + ' fatture in PDF inviato a ' + esc(S.commercialista.email) + '.']);
        G.log('Email', 'Al commercialista lo ZIP con ' + fatt.length + ' PDF di ' + nomeMese(mese));
      }
      sdi.fase = 'fatto';
      G.salva(); G.ridisegna();
    });
  };

  // ---- commercialista ----
  function corpoComm() {
    const S = G.S, c = S.commercialista;
    const righe = c.invii.map((x) => '<tr><td>' + dataIt(x.quando) + '</td><td>' + esc(x.descr) + '</td><td>' + esc(x.dest) + '</td><td>' + chip(x.esito === 'INVIATA' ? ['verde', 'Inviata'] : ['rosso', 'Non partita']) + '</td></tr>').join('');
    return '<p style="margin-top:0">Quando le fatture del mese vanno allo SDI, al commercialista arriva <strong>una sola email</strong> con lo ZIP dei PDF, invece di un\'email per ogni fattura.</p>'
      + '<div class="campo-blocco"><label class="etichetta" for="comm-email">Email del commercialista</label><input class="campo" id="comm-email" inputmode="email" autocapitalize="off" data-ch="comm-email" value="' + esc(c.email) + '"></div>'
      + '<div style="margin:12px 0"><button class="interruttore' + (c.attivo ? ' acceso' : '') + '" data-az="comm-attivo" aria-pressed="' + c.attivo + '"><span class="pallino"></span>Quando invio allo SDI, manda lo ZIP dei PDF anche al commercialista</button></div>'
      + '<div class="etichetta" style="margin-bottom:6px">Invii fatti</div>'
      + '<div class="tab" style="max-height:220px"><table><thead><tr><th>Data</th><th>Contenuto</th><th>A</th><th>Esito</th></tr></thead><tbody>' + (righe || '<tr class="vuoto"><td colspan="4">Ancora nessun invio: partirà col prossimo invio allo SDI.</td></tr>') + '</tbody></table></div>';
  }
  A['fatt-comm'] = () => G.apriFinestra({ titolo: 'Fatture al commercialista', larga: true, corpo: corpoComm, piede: '<button class="btn primario" data-az="chiudi-finestra">Chiudi</button>' });
  G.CH['comm-email'] = (el) => { G.S.commercialista.email = el.value.trim(); G.salva(); };
  A['comm-attivo'] = () => { const c = G.S.commercialista; c.attivo = !c.attivo; G.salva(); G.aggiornaFinestra(); };

  // =====================================================================
  // SCADENZARIO
  // =====================================================================
  const uSc = () => G.ui('scadenzario', () => ({ tipo: 'ATTIVA', stato: 'aperte', pannello: null, form: {} }));
  const nomeSoggetto = (s) => (s.tipo === 'ATTIVA' ? (G.cli(s.soggettoId) || {}).nome : (G.forn(s.soggettoId) || {}).nome) || '';
  function righeScad(u) {
    return G.S.scadenze.filter((s) => s.tipo === u.tipo && (u.stato === 'tutte' || (u.stato === 'pagate' ? s.stato === 'PAGATA' : s.stato !== 'PAGATA' && (u.stato === 'aperte' || s.scadenza < G.OGGI))));
  }
  function pannelloScad(u, s) {
    const att = u.tipo === 'ATTIVA';
    const f = u.form;
    if (u.pannello === 'incassa' && s) {
      return '<div class="scheda pannello"><div class="testa-scheda"><h2>' + (att ? 'Incasso' : 'Pagamento') + ' · ' + esc(nomeSoggetto(s)) + ' · doc. ' + esc(s.documento) + '</h2><button class="bottone-icona chiudi" data-az="sc-chiudi" aria-label="Chiudi">' + ico('chiudi') + '</button></div>'
        + '<div class="riga-campi"><div class="campo-blocco"><label class="etichetta" for="sc-importo">Importo (residuo ' + eur(G.residuo(s)) + ')</label><input class="campo" id="sc-importo" inputmode="decimal" value="' + esc(f.importo) + '"></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="sc-data">Data</label><input class="campo" type="date" id="sc-data" value="' + esc(f.data) + '"></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="sc-conto">Conto</label><select class="campo" id="sc-conto">' + G.S.conti.map((c) => '<option value="' + c.codice + '"' + (f.conto === c.codice ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</select></div></div>'
        + '<p class="suggerimento">Si può incassare anche solo una parte: la partita resta «Parziale» col residuo. Il movimento finisce in prima nota sul conto scelto.</p>'
        + '<div class="riga-flex"><button class="btn primario" data-az="sc-registra">Registra ' + (att ? 'incasso' : 'pagamento') + '</button></div></div>';
    }
    if (u.pannello === 'modifica' && s) {
      return '<div class="scheda pannello"><div class="testa-scheda"><h2>Modifica · ' + esc(nomeSoggetto(s)) + ' · doc. ' + esc(s.documento) + '</h2><button class="bottone-icona chiudi" data-az="sc-chiudi" aria-label="Chiudi">' + ico('chiudi') + '</button></div>'
        + '<div class="riga-campi"><div class="campo-blocco"><label class="etichetta" for="sm-scad">Scadenza</label><input class="campo" type="date" id="sm-scad" value="' + esc(s.scadenza) + '"></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="sm-stato">Stato</label><select class="campo" id="sm-stato">' + ['APERTA', 'PARZIALE', 'PAGATA', 'INSOLUTA'].map((x) => '<option' + (s.stato === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div></div>'
        + '<div class="riga-flex" style="margin-top:12px"><button class="btn primario" data-az="sc-salva-mod">Salva</button></div></div>';
    }
    if (u.pannello === 'nuovo') {
      const sogg = att ? G.S.clienti : G.S.fornitori;
      return '<div class="scheda pannello"><div class="testa-scheda"><h2>' + (att ? 'Nuovo incasso da avere' : 'Nuovo pagamento da fare') + '</h2><button class="bottone-icona chiudi" data-az="sc-chiudi" aria-label="Chiudi">' + ico('chiudi') + '</button></div>'
        + '<p class="suggerimento" style="margin-top:-6px">' + (att ? 'Una somma da incassare che non nasce da una fattura del programma.' : 'Una fattura arrivata su carta, un affitto, una rata: entra nello scadenzario come partita aperta.') + '</p>'
        + '<div class="riga-campi" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))"><div class="campo-blocco"><span class="etichetta">' + (att ? 'Cliente' : 'Fornitore') + ' *</span>' + G.combo('sc-sogg', { voci: sogg.map((x) => ({ id: x.id, testo: x.nome })), valore: f.soggettoId || null, onScegli: (id) => { f.soggettoId = id; } }) + '</div>'
        + '<div class="campo-blocco"><label class="etichetta" for="sn-doc">Documento</label><input class="campo" id="sn-doc" value="' + esc(f.documento || '') + '" placeholder="es. 1234/26"></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="sn-imp">Importo *</label><input class="campo" id="sn-imp" inputmode="decimal" value="' + esc(f.importo || '') + '"></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="sn-scad">Scadenza</label><input class="campo" type="date" id="sn-scad" value="' + esc(f.scadenza || G.D.piuGiorni(G.OGGI, 30)) + '"></div></div>'
        + '<div class="riga-flex" style="margin-top:12px"><button class="btn primario" data-az="sc-crea">Crea</button></div></div>';
    }
    return '';
  }
  G.VISTE.scadenzario = {
    render() {
      const S = G.S, u = uSc();
      const righe = righeScad(u);
      const aperte = S.scadenze.filter((s) => s.tipo === u.tipo && s.stato !== 'PAGATA');
      const tot = somma(aperte, G.residuo), scaduto = somma(aperte.filter((s) => s.scadenza < G.OGGI), G.residuo);
      const s = G.selezionato('scadenzario');
      const att = u.tipo === 'ATTIVA';
      const pTipo = [['ATTIVA', 'Incassi (clienti)'], ['PASSIVA', 'Pagamenti (fornitori)']].map((p) => '<button class="pillola' + (u.tipo === p[0] ? ' scelta' : '') + '" data-az="sc-tipo" data-t="' + p[0] + '">' + p[1] + '</button>').join('');
      const pStato = [['aperte', 'Aperte'], ['scadute', 'Scadute'], ['pagate', 'Pagate'], ['tutte', 'Tutte']].map((p) => '<button class="pillola' + (u.stato === p[0] ? ' scelta' : '') + '" data-az="sc-stato" data-s="' + p[0] + '">' + p[1] + '</button>').join('');
      return '<div class="titolo-pagina"><h1>Scadenzario</h1><div class="pillole">' + pTipo + '</div><div class="pillole">' + pStato + '</div></div>'
        + '<div class="griglia-kpi"><div class="kpi rosso"><div class="et">Totale ' + (att ? 'da incassare' : 'da pagare') + '</div><div class="val">' + eur(tot) + '</div><div class="nota">' + aperte.length + ' partite aperte</div></div>'
        + '<div class="kpi rosso"><div class="et">di cui scaduto</div><div class="val">' + eur(scaduto) + '</div><div class="nota">' + aperte.filter((x) => x.scadenza < G.OGGI).length + ' partite</div></div></div>'
        + '<div class="strumenti" style="margin-bottom:12px">'
        + '<button class="btn primario" data-az="sc-incassa"' + (s && s.stato !== 'PAGATA' ? '' : ' disabled') + '>' + ico('euro') + (att ? 'Incassa…' : 'Paga…') + '</button>'
        + '<button class="btn" data-az="sc-modifica"' + (s ? '' : ' disabled') + '>Modifica…</button>'
        + '<button class="btn" data-az="sc-insoluta"' + (s && att && s.stato !== 'PAGATA' ? '' : ' disabled') + '>Segna insoluta</button>'
        + '<button class="btn" data-az="sc-nuovo">' + ico('piu') + (att ? 'Nuovo incasso' : 'Nuovo pagamento') + '</button></div>'
        + pannelloScad(u, s)
        + G.tabella('scadenzario', {
          righe, chiave: (x) => x.id, altezza: u.pannello ? '360px' : 'calc(100vh - 330px)', ordine: { k: 'scadenza', dir: 1 }, vuoto: 'Nessuna partita con questo filtro',
          classe: (x) => (x.stato !== 'PAGATA' && x.scadenza < G.OGGI ? 'tinta-rossa' : ''),
          colonne: [
            // metodo sotto il soggetto e data sotto il documento: cosi' sull'iPad sta tutto a vista
            { k: 'sogg', t: 'Soggetto · pagamento', v: nomeSoggetto, testo: (x) => nomeSoggetto(x) + ' ' + ((G.metodo(x.metodoId) || {}).nome || ''), f: (x) => esc(nomeSoggetto(x)) + '<div class="sotto-cella">' + esc((G.metodo(x.metodoId) || {}).nome || '') + '</div>', cls: 'lungo', w: 190 },
            { k: 'documento', t: 'Doc. · data', testo: (x) => x.documento + ' ' + dataIt(x.dataDoc), f: (x) => esc(x.documento) + '<div class="sotto-cella">' + dataIt(x.dataDoc) + '</div>', w: 90 },
            { k: 'scadenza', t: 'Scadenza', f: (x) => dataIt(x.scadenza), testo: (x) => dataIt(x.scadenza), w: 90 },
            { k: 'importo', t: 'Importo €', n: true, f: (x) => num(x.importo), w: 84 },
            { k: 'pagato', t: 'Pagato €', n: true, f: (x) => '<span class="verde-t">' + num(x.pagato) + '</span>', w: 80 },
            { k: 'residuo', t: 'Residuo €', n: true, v: G.residuo, f: (x) => '<strong>' + num(G.residuo(x)) + '</strong>', w: 84 },
            { k: 'stato', t: 'Stato', v: (x) => x.stato, f: (x) => chip(x.stato === 'PAGATA' ? ['verde', 'Pagata'] : x.stato === 'PARZIALE' ? ['ambra', 'Parziale'] : x.stato === 'INSOLUTA' ? ['rosso', 'Insoluta'] : x.scadenza < G.OGGI ? ['rosso', 'Scaduta'] : ['grigio', 'Aperta']), w: 90 },
          ],
          onSel: () => { const u2 = uSc(); if (u2.pannello && u2.pannello !== 'nuovo') u2.pannello = null; G.ridisegna(); },
        });
    },
  };
  A['sc-tipo'] = (el) => { const u = uSc(); u.tipo = el.dataset.t; u.pannello = null; if (G.TAB.scadenzario) G.TAB.scadenzario.sel = null; G.ridisegna(); };
  A['sc-stato'] = (el) => { const u = uSc(); u.stato = el.dataset.s; G.ridisegna(); };
  A['scad-scadute'] = () => { const u = uSc(); u.tipo = 'ATTIVA'; u.stato = 'scadute'; G.ridisegna(); };
  A['sc-chiudi'] = () => { uSc().pannello = null; G.ridisegna(); };
  A['sc-incassa'] = () => {
    const u = uSc(), s = G.selezionato('scadenzario'); if (!s) return;
    const m = G.metodo(s.metodoId) || {};
    u.pannello = 'incassa';
    u.form = { importo: num(G.residuo(s)), data: G.OGGI, conto: m.id === 1 ? 'CASSA' : m.id === 3 ? 'ASSEGNI' : m.id === 2 ? 'POS' : 'BANCA' };
    G.ridisegna();
  };
  A['sc-registra'] = () => {
    const S = G.S, u = uSc(), s = G.selezionato('scadenzario'); if (!s) return;
    const imp = r2(G.leggiNum(document.getElementById('sc-importo').value));
    const data = document.getElementById('sc-data').value || G.OGGI;
    const conto = document.getElementById('sc-conto').value;
    if (!(imp > 0)) { G.avviso('Scrivi un importo maggiore di zero.', 'errore'); return; }
    if (imp > G.residuo(s) + 0.005) { G.avviso('L\'importo supera il residuo (' + eur(G.residuo(s)) + '): per gli anticipi si usa l\'acconto.', 'errore'); return; }
    s.pagato = r2(s.pagato + imp);
    s.stato = s.pagato >= s.importo - 0.005 ? 'PAGATA' : 'PARZIALE';
    s.incassoIl = data;
    const att = s.tipo === 'ATTIVA';
    S.primaNota.unshift({ id: G.nuovoId(), data, tipo: att ? 'ENTRATA' : 'USCITA', conto, contoDest: '', importo: imp, causale: (att ? 'INCASSO FT ' : 'PAGAMENTO FT ') + s.documento, descr: nomeSoggetto(s) });
    G.log(att ? 'Incasso' : 'Pagamento', (att ? 'Incassati ' : 'Pagati ') + eur(imp) + ' · ' + nomeSoggetto(s) + ' · doc. ' + s.documento + (s.stato === 'PARZIALE' ? ' (resta ' + eur(G.residuo(s)) + ')' : ''));
    u.pannello = null;
    G.salva(); G.ridisegna();
    G.avviso((att ? 'Incasso' : 'Pagamento') + ' registrato · ' + eur(imp) + (s.stato === 'PARZIALE' ? ' · resta ' + eur(G.residuo(s)) : ' · partita chiusa'));
  };
  A['sc-modifica'] = () => { const u = uSc(); if (G.selezionato('scadenzario')) { u.pannello = 'modifica'; G.ridisegna(); } };
  A['sc-salva-mod'] = () => {
    const u = uSc(), s = G.selezionato('scadenzario'); if (!s) return;
    s.scadenza = document.getElementById('sm-scad').value || s.scadenza;
    s.stato = document.getElementById('sm-stato').value;
    if (s.stato === 'PAGATA') s.pagato = s.importo;
    G.log('Scadenzario', 'Modificata la partita ' + s.documento + ' di ' + nomeSoggetto(s) + ': scadenza ' + dataIt(s.scadenza) + ', ' + s.stato.toLowerCase());
    u.pannello = null; G.salva(); G.ridisegna(); G.avviso('Partita aggiornata');
  };
  A['sc-insoluta'] = () => {
    const s = G.selezionato('scadenzario'); if (!s) return;
    s.stato = 'INSOLUTA';
    G.log('Scadenzario', 'Partita ' + s.documento + ' di ' + nomeSoggetto(s) + ' segnata insoluta');
    G.salva(); G.ridisegna(); G.avviso('Segnata come insoluta');
  };
  A['sc-nuovo'] = () => { const u = uSc(); u.pannello = 'nuovo'; u.form = {}; G.ridisegna(); };
  A['sc-crea'] = () => {
    const S = G.S, u = uSc(), f = u.form;
    const imp = r2(G.leggiNum(document.getElementById('sn-imp').value));
    if (!f.soggettoId) { G.avviso(u.tipo === 'ATTIVA' ? 'Scegli il cliente.' : 'Scegli il fornitore.', 'errore'); return; }
    if (!(imp > 0)) { G.avviso('Scrivi l\'importo.', 'errore'); return; }
    const s = { id: G.nuovoId(), tipo: u.tipo, soggettoId: f.soggettoId, fatturaId: null, documento: document.getElementById('sn-doc').value.trim() || '—', dataDoc: G.OGGI, scadenza: document.getElementById('sn-scad').value || G.OGGI, importo: imp, pagato: 0, stato: 'APERTA', metodoId: 4 };
    S.scadenze.push(s);
    G.log('Scadenzario', 'Nuova partita ' + (u.tipo === 'ATTIVA' ? 'da incassare' : 'da pagare') + ': ' + nomeSoggetto(s) + ' · ' + eur(imp) + ' · scade il ' + dataIt(s.scadenza));
    u.pannello = null; G.TAB.scadenzario.sel = String(s.id);
    G.salva(); G.ridisegna(); G.avviso('Partita creata');
  };

  // =====================================================================
  // PRIMA NOTA
  // =====================================================================
  const uPn = () => G.ui('primanota', () => ({ pannello: false, contato: '' }));
  const nomeConto = (c) => (G.S.conti.find((x) => x.codice === c) || {}).nome || c;
  G.VISTE.primanota = {
    render() {
      const S = G.S, u = uPn();
      const sc = S.scontrini.filter((s) => s.data.startsWith(G.OGGI));
      const cont = somma(sc.filter((s) => s.metodoId === 1), (s) => s.totale), carta = somma(sc.filter((s) => s.metodoId === 2), (s) => s.totale);
      const saldi = S.conti.map((c) => '<div class="kpi"><div class="et">' + esc(c.nome) + '</div><div class="val">' + eur(G.saldoConto(c.codice)) + '</div></div>').join('');
      const teorico = G.saldoConto('CASSA');
      const contato = u.contato !== '' ? G.leggiNum(u.contato) : null;
      const diff = contato !== null ? r2(contato - teorico) : null;
      const form = u.pannello ? '<div class="scheda pannello"><div class="testa-scheda"><h2>Nuovo movimento</h2><button class="bottone-icona chiudi" data-az="pn-chiudi" aria-label="Chiudi">' + ico('chiudi') + '</button></div>'
        + '<div class="riga-campi"><div class="campo-blocco"><label class="etichetta" for="pn-tipo">Tipo</label><select class="campo" id="pn-tipo"><option value="ENTRATA">Entrata</option><option value="USCITA" selected>Uscita</option><option value="GIROCONTO">Giroconto</option></select></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="pn-conto">Conto</label><select class="campo" id="pn-conto">' + S.conti.map((c) => '<option value="' + c.codice + '">' + esc(c.nome) + '</option>').join('') + '</select></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="pn-dest">Verso (solo giroconto)</label><select class="campo" id="pn-dest">' + S.conti.map((c) => '<option value="' + c.codice + '"' + (c.codice === 'BANCA' ? ' selected' : '') + '>' + esc(c.nome) + '</option>').join('') + '</select></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="pn-imp">Importo *</label><input class="campo" id="pn-imp" inputmode="decimal"></div></div>'
        + '<div class="riga-campi" style="margin-top:12px"><div class="campo-blocco"><label class="etichetta" for="pn-causale">Causale</label><select class="campo" id="pn-causale">' + ['SPESE', 'VERSAMENTO', 'PRELIEVO', 'INCASSO', 'PAGAMENTO', 'ALTRO'].map((x) => '<option>' + x + '</option>').join('') + '</select></div>'
        + '<div class="campo-blocco" style="grid-column:span 2"><label class="etichetta" for="pn-descr">Descrizione</label><input class="campo" id="pn-descr" placeholder="es. Spese postali"></div></div>'
        + '<div class="riga-flex" style="margin-top:12px"><button class="btn primario" data-az="pn-salva">Registra</button></div></div>' : '';
      return '<div class="titolo-pagina"><h1>Prima nota</h1><span class="spinta"></span><button class="btn primario" data-az="pn-nuovo">' + ico('piu') + 'Movimento</button></div>'
        + '<div class="griglia-kpi">' + saldi + '</div>'
        + '<div class="due-col-pari" style="margin-bottom:16px">'
        + '<div class="scheda"><h2>Corrispettivi di oggi</h2><div class="riga-campi"><div class="campo-blocco"><span class="etichetta">Contanti</span><strong style="font-size:20px">' + eur(cont) + '</strong></div><div class="campo-blocco"><span class="etichetta">POS / carte</span><strong style="font-size:20px">' + eur(carta) + '</strong></div><div class="campo-blocco"><span class="etichetta">Scontrini</span><strong style="font-size:20px">' + sc.length + '</strong></div></div><p class="suggerimento" style="margin-bottom:0">Gli incassi del banco entrano da soli in cassa e nel conto POS: niente da scrivere a mano.</p></div>'
        + '<div class="scheda"><h2>Quadratura di cassa</h2><div class="riga-campi"><div class="campo-blocco"><label class="etichetta" for="pn-contato">Contanti contati nel cassetto</label><input class="campo" id="pn-contato" inputmode="decimal" data-in="pn-contato" value="' + esc(u.contato) + '" placeholder="es. ' + num(teorico) + '"></div>'
        + '<div class="campo-blocco"><span class="etichetta">Teorico</span><strong style="line-height:44px">' + eur(teorico) + '</strong></div>'
        + '<div class="campo-blocco"><span class="etichetta">Differenza</span><strong id="pn-diff" style="line-height:44px" class="' + (diff === null ? '' : Math.abs(diff) < 0.01 ? 'verde-t' : 'rosso-t') + '">' + (diff === null ? '—' : (diff > 0 ? '+' : '') + eur(diff)) + '</strong></div></div></div>'
        + '</div>'
        + form
        + G.tabella('primanota', {
          righe: S.primaNota, chiave: (m) => m.id, altezza: u.pannello ? '320px' : 'calc(100vh - 430px)', ordine: { k: 'data', dir: -1 },
          colonne: [
            { k: 'data', t: 'Data', f: (m) => dataIt(m.data), testo: (m) => dataIt(m.data), w: 92 },
            { k: 'tipo', t: 'Tipo', f: (m) => chip(m.tipo === 'ENTRATA' ? ['verde', 'Entrata'] : m.tipo === 'USCITA' ? ['rosso', 'Uscita'] : ['blu', 'Giroconto']), w: 96 },
            { k: 'conto', t: 'Conto', v: (m) => nomeConto(m.conto) + (m.contoDest ? ' → ' + nomeConto(m.contoDest) : ''), cls: 'due-righe', w: 150 },
            { k: 'descr', t: 'Causale · descrizione', testo: (m) => m.causale + ' ' + m.descr, f: (m) => '<strong style="font-size:12.5px">' + esc(m.causale) + '</strong><div class="sotto-cella">' + esc(m.descr) + '</div>', cls: 'lungo', w: 220 },
            { k: 'entrata', t: 'Entrata', n: true, v: (m) => (m.tipo === 'ENTRATA' ? m.importo : 0), f: (m) => (m.tipo === 'ENTRATA' ? '<span class="verde-t">' + num(m.importo) + '</span>' : ''), w: 86 },
            { k: 'uscita', t: 'Uscita', n: true, v: (m) => (m.tipo !== 'ENTRATA' ? m.importo : 0), f: (m) => (m.tipo !== 'ENTRATA' ? num(m.importo) : ''), w: 86 },
          ],
        });
    },
  };
  A['pn-nuovo'] = () => { uPn().pannello = true; G.ridisegna(); };
  A['pn-chiudi'] = () => { uPn().pannello = false; G.ridisegna(); };
  G.IN['pn-contato'] = (el) => {
    const u = uPn(); u.contato = el.value;
    const teorico = G.saldoConto('CASSA');
    const d = document.getElementById('pn-diff');
    if (!d) return;
    if (el.value.trim() === '') { d.textContent = '—'; d.className = ''; return; }
    const diff = r2(G.leggiNum(el.value) - teorico);
    d.textContent = (diff > 0 ? '+' : '') + eur(diff);
    d.className = Math.abs(diff) < 0.01 ? 'verde-t' : 'rosso-t';
  };
  A['pn-salva'] = () => {
    const S = G.S, u = uPn();
    const v = (id) => document.getElementById(id).value;
    const imp = r2(G.leggiNum(v('pn-imp')));
    if (!(imp > 0)) { G.avviso('Scrivi l\'importo.', 'errore'); return; }
    const tipo = v('pn-tipo');
    if (tipo === 'GIROCONTO' && v('pn-conto') === v('pn-dest')) { G.avviso('Per un giroconto scegli due conti diversi.', 'errore'); return; }
    const m = { id: G.nuovoId(), data: G.OGGI, tipo, conto: v('pn-conto'), contoDest: tipo === 'GIROCONTO' ? v('pn-dest') : '', importo: imp, causale: v('pn-causale'), descr: v('pn-descr').trim() };
    S.primaNota.unshift(m);
    G.log('Prima nota', (tipo === 'GIROCONTO' ? 'Giroconto ' : tipo === 'ENTRATA' ? 'Entrata ' : 'Uscita ') + eur(imp) + ' · ' + nomeConto(m.conto) + (m.contoDest ? ' → ' + nomeConto(m.contoDest) : '') + (m.descr ? ' · ' + m.descr : ''));
    u.pannello = false; G.salva(); G.ridisegna(); G.avviso('Movimento registrato');
  };

  // =====================================================================
  // AMMINISTRAZIONE
  // =====================================================================
  function anomalie() {
    const S = G.S, out = [];
    S.fatture.filter((f) => f.sdi === 'SCARTATO').forEach((f) => out.push({ g: 'BLOCCO', tipo: 'Scarto SDI', d: G.fatturaNumero(f) + ' · ' + (G.cli(f.clienteId) || {}).nome + ' · ' + (f.scarto || ''), vai: 'fatture', dopo: 'fatt-scarti' }));
    const meseOra = G.OGGI.slice(0, 7);
    const vecchie = S.fatture.filter((f) => f.sdi === 'GENERATO' && f.data.slice(0, 7) < meseOra);
    if (vecchie.length) out.push({ g: 'AVVISO', tipo: 'Fatture da inviare', d: vecchie.length + ' fatture dei mesi passati non ancora inviate allo SDI', vai: 'fatture', dopo: 'fatt-sdi' });
    S.articoli.filter(G.sottocosto).forEach((a) => out.push({ g: 'AVVISO', tipo: 'Prezzo sotto il costo', d: a.codice + ' · ' + a.descr + ' · prezzo ' + eur(a.prezzoA) + ', costo ' + eur(a.costo) + ' + IVA', vai: 'articoli', dopo: 'art-sottocosto' }));
    S.scadenze.filter((s) => s.tipo === 'ATTIVA' && s.stato !== 'PAGATA' && s.scadenza < G.OGGI).sort((a, b) => a.scadenza.localeCompare(b.scadenza)).forEach((s) => out.push({ g: 'AVVISO', tipo: 'Credito scaduto', d: (G.cli(s.soggettoId) || {}).nome + ' · FT ' + s.documento + ' scaduta il ' + dataIt(s.scadenza) + ' · residuo ' + eur(G.residuo(s)), vai: 'scadenzario', dopo: 'scad-scadute' }));
    S.scadenze.filter((s) => s.tipo === 'PASSIVA' && s.stato !== 'PAGATA' && s.scadenza < G.OGGI).forEach((s) => out.push({ g: 'AVVISO', tipo: 'Debito scaduto', d: (G.forn(s.soggettoId) || {}).nome + ' · fattura ' + s.documento + ' scaduta il ' + dataIt(s.scadenza) + ' · ' + eur(G.residuo(s)), vai: 'scadenzario' }));
    S.patentini.filter((p) => G.statoPatentino(p) === 'scaduto').forEach((p) => out.push({ g: 'INFO', tipo: 'Patentino scaduto', d: 'N. ' + p.numero + ' · ' + p.nominativo + ' · scaduto il ' + dataIt(p.scadenza) + ': il banco blocca la vendita di fitosanitari', vai: 'registro', dopo: 'reg-patentini' }));
    return out;
  }
  function ricercaGlobale(q) {
    const S = G.S;
    const pezzi = G.normalizza(q).split(/\s+/).filter(Boolean);
    if (!pezzi.length) return '';
    const ok = (t) => pezzi.every((p) => G.normalizza(t).includes(p));
    const gruppi = [
      ['Clienti', S.clienti.filter((c) => ok(c.nome + ' ' + c.codice + ' ' + c.piva + ' ' + c.cf + ' ' + c.citta)).slice(0, 6).map((c) => ['clienti', c.nome, c.citta + (c.piva ? ' · P.IVA ' + c.piva : '')])],
      ['Fornitori', S.fornitori.filter((f) => ok(f.nome + ' ' + f.piva + ' ' + f.citta)).slice(0, 4).map((f) => ['fornitori', f.nome, f.citta])],
      ['Articoli', S.articoli.filter((a) => ok(a.codice + ' ' + a.descr + ' ' + a.barcode)).slice(0, 6).map((a) => ['articoli', a.codice + ' · ' + a.descr, eur(a.prezzoA) + ' · giac. ' + qta(a.giac)])],
      ['Fatture', S.fatture.filter((f) => ok(G.fatturaNumero(f) + ' ' + (G.cli(f.clienteId) || {}).nome)).slice(0, 6).map((f) => ['fatture', G.fatturaNumero(f) + ' · ' + (G.cli(f.clienteId) || {}).nome, dataIt(f.data) + ' · ' + eur(f.totale)])],
    ].filter((g) => g[1].length);
    if (!gruppi.length) return '<p class="muto">Nessun risultato per «' + esc(q) + '»</p>';
    return gruppi.map((g) => '<div class="etichetta" style="margin:10px 0 4px">' + g[0] + '</div>' + g[1].map((r) => '<button class="combo-voce" data-az="vai" data-vista="' + r[0] + '" style="border:1px solid var(--linea);border-radius:8px;margin-bottom:4px">' + esc(r[1]) + '<small>' + esc(r[2]) + '</small></button>').join('')).join('');
  }
  G.VISTE.amministrazione = {
    render() {
      const S = G.S;
      const u = G.ui('amministrazione', () => ({ q: '' }));
      const att = S.scadenze.filter((s) => s.tipo === 'ATTIVA' && s.stato !== 'PAGATA');
      const pas = S.scadenze.filter((s) => s.tipo === 'PASSIVA' && s.stato !== 'PAGATA');
      const an = anomalie();
      return '<div class="titolo-pagina"><h1>Amministrazione</h1><span class="spinta"></span><button class="btn primario" data-az="adm-export">' + ico('zip') + 'Esporta per il commercialista…</button></div>'
        + '<div class="griglia-kpi cinque">'
        + '<div class="kpi"><div class="et">Crediti verso clienti</div><div class="val" style="font-size:23px">' + eur(somma(att, G.residuo)) + '</div><div class="nota rosso-t">scaduto: ' + eur(somma(att.filter((s) => s.scadenza < G.OGGI), G.residuo)) + '</div></div>'
        + '<div class="kpi"><div class="et">Debiti verso fornitori</div><div class="val" style="font-size:23px">' + eur(somma(pas, G.residuo)) + '</div><div class="nota rosso-t">scaduto: ' + eur(somma(pas.filter((s) => s.scadenza < G.OGGI), G.residuo)) + '</div></div>'
        + '<div class="kpi"><div class="et">Saldo cassa</div><div class="val" style="font-size:23px">' + eur(G.saldoConto('CASSA')) + '</div></div>'
        + '<div class="kpi"><div class="et">Saldo banca</div><div class="val" style="font-size:23px">' + eur(G.saldoConto('BANCA')) + '</div></div>'
        + '<div class="kpi rosso"><div class="et">Situazioni da controllare</div><div class="val" style="font-size:23px">' + an.length + '</div></div>'
        + '</div>'
        + '<div class="scheda" style="margin-bottom:16px"><div class="cerca">' + ico('cerca') + '<input class="campo" data-in="adm-cerca" value="' + esc(u.q) + '" placeholder="Ricerca globale: cliente, fornitore, articolo, numero di fattura…" aria-label="Ricerca globale" autocomplete="off" autocapitalize="off" spellcheck="false"></div><div id="adm-risultati">' + ricercaGlobale(u.q) + '</div></div>'
        + '<div class="etichetta" style="margin-bottom:8px">Documenti e situazioni da controllare (aggiornati in tempo reale) · tocca una riga per andarci</div>'
        + G.tabella('anomalie', {
          righe: an, chiave: (x) => x.tipo + x.d, altezza: 'calc(100vh - 430px)',
          colonne: [
            { k: 'g', t: 'Gravità', f: (x) => chip(x.g === 'BLOCCO' ? ['rosso', 'Blocco'] : x.g === 'AVVISO' ? ['ambra', 'Avviso'] : ['grigio', 'Info']), w: 100 },
            { k: 'tipo', t: 'Tipo', w: 170 },
            { k: 'd', t: 'Descrizione', cls: 'lungo', w: 420 },
          ],
          onSel: (x) => G.vai(x.vai, x.dopo),
        });
    },
  };
  G.IN['adm-cerca'] = (el) => { G.U.amministrazione.q = el.value; const b = document.getElementById('adm-risultati'); if (b) b.innerHTML = ricercaGlobale(el.value); };
  let exp = null;
  function corpoExport() {
    const S = G.S;
    const d = G.D.daIso(G.OGGI);
    const periodi = [];
    const mesePrec = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    periodi.push(['mese', 'Mese scorso (' + G.MESI_LUNGHI[mesePrec.getMonth()] + ')']);
    periodi.push(['trim', 'Ultimo trimestre']);
    periodi.push(['anno', 'Anno ' + d.getFullYear()]);
    const sel = periodi.find((p) => p[0] === exp.periodo) || periodi[0];
    const nF = exp.periodo === 'mese' ? S.fatture.filter((f) => f.data.slice(0, 7) === G.D.iso(mesePrec).slice(0, 7)).length : S.fatture.length;
    const file = [
      ['Fatture_vendita.xlsx', nF + ' documenti con imponibile, IVA e stato SDI'],
      ['Corrispettivi.xlsx', 'incassato del banco giorno per giorno, per aliquota, contanti e POS'],
      ['Prima_nota.xlsx', S.primaNota.length + ' movimenti di cassa, banca, POS e assegni'],
      ['Scadenzario_clienti.xlsx', S.scadenze.filter((s) => s.tipo === 'ATTIVA').length + ' partite con incassi e residui'],
      ['Scadenzario_fornitori.xlsx', S.scadenze.filter((s) => s.tipo === 'PASSIVA').length + ' partite con pagamenti'],
      ['Registro_acquisti.xlsx', S.acquisti.length + ' fatture dei fornitori'],
      ['Schede_contabili.xlsx', 'partitario Dare/Avere di clienti e fornitori'],
      ['Chiusure_cassa.xlsx', 'rapporti Z del registratore'],
      ['Anomalie.xlsx', anomalie().length + ' situazioni da controllare'],
      ['XML_fatture/', nF + ' file FatturaPA come inviati allo SDI'],
    ];
    return '<p style="margin-top:0">Una cartella unica per periodo, con colonne sempre uguali: il commercialista la apre e trova tutto.</p>'
      + '<div class="pillole" style="margin-bottom:14px">' + periodi.map((p) => '<button class="pillola' + (sel[0] === p[0] ? ' scelta' : '') + '" data-az="exp-periodo" data-p="' + p[0] + '">' + esc(p[1]) + '</button>').join('') + '</div>'
      + (exp.pronta ? '<div class="messaggio verde">' + ico('spunta') + '<div>Cartella «Commercialista_' + esc(sel[1].replace(/[^\w]+/g, '_')) + '» pronta con ' + file.length + ' elementi. Nel negozio si apre in Esplora risorse; nella demo non si scarica nulla.</div></div>' : '')
      + '<div class="tab"><table><thead><tr><th>File</th><th>Contenuto</th></tr></thead><tbody>' + file.map((f) => '<tr><td class="mono">' + esc(f[0]) + '</td><td class="lungo">' + esc(f[1]) + '</td></tr>').join('') + '</tbody></table></div>';
  }
  A['adm-export'] = () => { exp = { periodo: 'mese', pronta: false }; G.apriFinestra({ titolo: 'Esporta per il commercialista', larga: true, corpo: corpoExport, piede: '<button class="btn" data-az="chiudi-finestra">Chiudi</button><button class="btn primario" data-az="exp-prepara">Prepara la cartella</button>' }); };
  A['exp-periodo'] = (el) => { exp.periodo = el.dataset.p; exp.pronta = false; G.aggiornaFinestra(); };
  A['exp-prepara'] = () => { exp.pronta = true; G.log('Esportazione', 'Preparata la cartella per il commercialista'); G.salva(); G.aggiornaFinestra(); };
})();
