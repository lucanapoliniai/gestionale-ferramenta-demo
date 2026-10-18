/* Prima nota, Amministrazione (utenti, copie di sicurezza, blocco periodi, numerazioni, esportazione
   per il commercialista), Report e Provvigioni. Ricopiate da PrimaNotaView, AmministrazioneView,
   NumerazioniWindow, CambiaPasswordAdminWindow, PasswordCopieWindow, ReportView e ProvvigioniView. */
(function () {
  'use strict';
  const G = window.GF;
  const { esc, num, qta, dataIt, somma, r2 } = G;
  const A = G.AZ;
  const btn = (testo, az, o) => { o = o || {}; return '<button class="btn' + (o.primario ? ' primario' : '') + (o.cls ? ' ' + o.cls : '') + '" data-az="' + az + '"' + (o.dis ? ' disabled' : '') + (o.id ? ' id="' + o.id + '"' : '') + (o.stile ? ' style="' + o.stile + '"' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + (o.dati || '') + '>' + esc(testo) + '</button>'; };
  const msgSpan = (m, stile) => '<span style="font-size:12px;' + (stile || '') + ';color:' + (m ? m.colore : 'inherit') + '">' + (m ? esc(m.testo) : '') + '</span>';
  const tb = (id, val, attr) => '<input class="tb" id="' + id + '" value="' + esc(val === null || val === undefined ? '' : val) + '"' + (attr || '') + ' autocomplete="off" spellcheck="false">';
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  const campo = (et, html, w, mr, tip) => '<div style="width:' + w + 'px;margin:0 ' + (mr === undefined ? 14 : mr) + 'px 12px 0"><div class="muto"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + et + '</div><div style="margin-top:3px">' + html + '</div></div>';
  const contoNome = (cod) => (G.S.conti.find((c) => c.codice === cod) || { nome: cod }).nome;
  const clientiLookup = () => G.S.clienti.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => ({ id: c.id, testo: c.codice + ' — ' + c.nome + (c.piva ? ' · P.IVA ' + c.piva : c.cf ? ' · CF ' + c.cf : '') }));
  const fornLookup = () => G.S.fornitori.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((f) => ({ id: f.id, testo: f.codice + ' — ' + f.nome }));
  const primoDelMese = () => G.OGGI.slice(0, 8) + '01';

  // =====================================================================
  // PRIMA NOTA
  // =====================================================================
  const pn = () => G.ui('primanota', () => ({ dal: primoDelMese(), al: G.OGGI, conto: '', tipo: '', corrisp: false, pannello: null, msg: null }));
  // corrispettivi del giorno dagli scontrini (CaricaCorrispettivi)
  function corrispettivi(dal, al) {
    const giorni = {};
    G.S.scontrini.filter((s) => s.data.slice(0, 10) >= dal && s.data.slice(0, 10) <= al).forEach((s) => {
      const g = s.data.slice(0, 10);
      const x = giorni[g] || (giorni[g] = { data: g, n: 0, totale: 0, iva4: 0, iva5: 0, iva10: 0, iva22: 0, altro: 0, contanti: 0, elettronico: 0 });
      x.n++; x.totale += s.totale;
      if (s.metodoId === 2) x.elettronico += s.totale; else x.contanti += s.totale;
      s.righe.forEach((r) => { const t = G.totaleRiga(r); if (r.iva === 4) x.iva4 += t; else if (r.iva === 5) x.iva5 += t; else if (r.iva === 10) x.iva10 += t; else if (r.iva === 22) x.iva22 += t; else x.altro += t; });
    });
    return Object.values(giorni).sort((a, b) => b.data.localeCompare(a.data));
  }
  function movimentiPn(u) {
    const S = G.S, out = [];
    const dentro = S.primaNota.filter((m) => m.data >= u.dal && m.data <= u.al && (!u.conto || m.conto === u.conto || m.contoDest === u.conto) && (!u.tipo || m.tipo === u.tipo));
    const visti = new Set();
    dentro.forEach((m) => {
      if (visti.has(m.id)) return;
      const parti = m.gruppo ? dentro.filter((x) => x.gruppo === m.gruppo) : [m];
      parti.forEach((x) => visti.add(x.id));
      const inCassa = (x) => x.conto === 'CASSA' || x.conto === 'ASSEGNI';
      const imp = r2(somma(parti, (x) => x.importo));
      out.push({ id: m.id, parti, data: m.data, tipo: m.tipo, conto: parti.map((x) => contoNome(x.conto)).join(' + ') + (m.tipo === 'GIROCONTO' && m.contoDest ? ' → ' + contoNome(m.contoDest) : ''),
        entrata: m.tipo === 'ENTRATA' ? imp : 0, uscita: m.tipo === 'USCITA' ? imp : 0, importo: imp,
        cassa: m.tipo === 'GIROCONTO' ? null : (parti.some(inCassa) ? r2(somma(parti.filter(inCassa), (x) => x.importo)) : null),
        fuori: m.tipo === 'GIROCONTO' ? null : (parti.some((x) => !inCassa(x)) ? r2(somma(parti.filter((x) => !inCassa(x)), (x) => x.importo)) : null),
        causale: m.causale, descr: m.descr, soggetto: m.soggetto, rif: m.rif, note: m.note, collegato: !!(m.incassoId || (m.rif || '').startsWith('scad:') || (m.rif || '').startsWith('acc:')) });
    });
    return out.sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
  }
  G.VISTE.primanota = {
    nuova() { delete G.U.primanota; G.deseleziona('pn'); },
    render() {
      const S = G.S, u = pn();
      const rows = movimentiPn(u);
      const corr = u.corrisp ? corrispettivi(u.dal, u.al) : [];
      const E = (d) => num(d);
      const card = (c, ultima) => { const s = G.saldoConto(c.codice); return '<div class="card" style="padding:10px 14px;margin-right:' + (ultima ? 0 : 10) + 'px"><div class="muto">' + esc(c.nome) + '</div><div style="font-size:19px;font-weight:600;color:' + (s < 0 ? '#C0392B' : 'var(--testo)') + '">' + num(s) + ' €</div></div>'; };
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga tesa" style="margin-bottom:10px"><div class="pila"><div class="h1">Prima nota</div></div><div class="riga tesa fisso">'
        + btn('Esporta Excel', 'pn-esporta', { stile: 'margin-right:8px' }) + btn(u.corrisp ? 'Movimenti' : 'Corrispettivi', 'pn-corrisp', { stile: 'margin-right:8px' }) + btn('Quadratura cassa', 'pn-quadratura', { stile: 'margin-right:8px' }) + btn('+ Movimento', 'pn-nuovo', { primario: true }) + '</div></div>'
        + '<div style="display:grid;grid-template-columns:repeat(' + S.conti.length + ',minmax(0,1fr));margin-bottom:10px">' + S.conti.map((c, i) => card(c, i === S.conti.length - 1)).join('') + '</div>'
        + '<div class="avvolgi" style="margin-bottom:10px;align-items:center"><span class="muto">Dal</span><span style="margin:0 10px 0 6px">' + G.dp('pn-dal', u.dal, { onCambia: (v) => { u.dal = v || primoDelMese(); G.ridisegna(); } }) + '</span>'
        + '<span class="muto">al</span><span style="margin:0 10px 0 6px">' + G.dp('pn-al', u.al, { onCambia: (v) => { u.al = v || G.OGGI; G.ridisegna(); } }) + '</span>'
        + '<div style="width:150px;margin-right:10px">' + G.sel('data-ch="pn-conto"', [['', 'Tutti i conti']].concat(S.conti.map((c) => [c.codice, c.nome])), u.conto) + '</div>'
        + '<div style="width:130px;margin-right:10px">' + G.sel('data-ch="pn-tipo"', [['', 'Tutti i tipi'], ['ENTRATA', 'ENTRATA'], ['USCITA', 'USCITA'], ['GIROCONTO', 'GIROCONTO']], u.tipo) + '</div>'
        + btn('Modifica selezionato', 'pn-modifica', { stile: 'margin-left:6px', title: 'Riapre il movimento selezionato nel form per correggerlo (anche con doppio clic sulla riga)' }) + btn('Elimina selezionato', 'pn-elimina', { stile: 'margin-left:6px' })
        + '<span class="muto" style="margin-left:14px;color:' + (u.msg ? u.msg.colore : 'var(--testo-2)') + '">' + (u.msg ? esc(u.msg.testo) : rows.length + ' movimenti · entrate ' + num(somma(rows, (r) => r.entrata)) + ' € · uscite ' + num(somma(rows, (r) => r.uscita)) + ' €') + '</span></div>'
        + '<div class="col riempi" style="position:relative">'
        + (u.corrisp
          ? '<div class="muto" style="margin-bottom:8px">Corrispettivi giornalieri (scontrini) — totale del giorno diviso per aliquota, contanti e POS</div>'
            + G.dg('pn-corr', { classe: 'riempi', righe: corr, chiave: (x) => x.data, colonne: [
              { k: 'data', t: 'Data', w: 100, v: (x) => dataIt(x.data), ordina: (x) => x.data }, { k: 'n', t: 'N. scontrini', w: 100, n: true }, { k: 'totale', t: 'Totale €', w: 110, n: true, v: (x) => E(x.totale), ordina: (x) => x.totale },
              { k: 'iva4', t: '4%', w: 80, n: true, v: (x) => E(x.iva4) }, { k: 'iva5', t: '5%', w: 80, n: true, v: (x) => E(x.iva5) }, { k: 'iva10', t: '10%', w: 80, n: true, v: (x) => E(x.iva10) },
              { k: 'iva22', t: '22%', w: 80, n: true, v: (x) => E(x.iva22) }, { k: 'altro', t: 'Esente/altro', w: 80, n: true, v: (x) => E(x.altro) }, { k: 'contanti', t: 'Contanti €', w: 110, n: true, v: (x) => E(x.contanti) }, { k: 'el', t: 'POS / carte €', w: 110, n: true, v: (x) => E(x.elettronico) }] })
            + '<div style="background:#fff;border-top:1px solid var(--bordo);padding:8px 10px;font-weight:600;font-size:13px">' + (corr.length ? 'TOTALE dal ' + dataIt(u.dal) + ' al ' + dataIt(u.al) + ': ' + E(somma(corr, (x) => x.totale)) + ' € · 4% ' + E(somma(corr, (x) => x.iva4)) + ' · 5% ' + E(somma(corr, (x) => x.iva5)) + ' · 10% ' + E(somma(corr, (x) => x.iva10)) + ' · 22% ' + E(somma(corr, (x) => x.iva22)) + ' · esente/altro ' + E(somma(corr, (x) => x.altro)) + ' · contanti ' + E(somma(corr, (x) => x.contanti)) + ' · POS ' + E(somma(corr, (x) => x.elettronico)) + ' · ' + somma(corr, (x) => x.n) + ' scontrini' : 'Nessun corrispettivo nel periodo.') + '</div>'
          : G.dg('pn', { classe: 'riempi', righe: rows, chiave: (r) => r.id, onDoppio: (r) => { G.scegliRiga('pn', r.id); A['pn-modifica'](); }, colonne: [
            { k: 'data', t: 'Data', w: 96, v: (r) => dataIt(r.data), ordina: (r) => r.data }, { k: 'tipo', t: 'Tipo', w: 90 }, { k: 'conto', t: 'Conto', w: 190 },
            { k: 'entrata', t: 'Entrata €', w: 86, n: true, v: (r) => num(r.entrata), ordina: (r) => r.entrata }, { k: 'uscita', t: 'Uscita €', w: 86, n: true, v: (r) => num(r.uscita), ordina: (r) => r.uscita },
            { k: 'cassa', t: 'di cui cassa €', w: 102, n: true, v: (r) => (r.cassa === null ? '' : num(r.cassa)), ordina: (r) => r.cassa || 0 }, { k: 'fuori', t: 'di cui fuori €', w: 102, n: true, v: (r) => (r.fuori === null ? '' : num(r.fuori)), ordina: (r) => r.fuori || 0 },
            { k: 'causale', t: 'Causale', w: 170 }, { k: 'descr', t: 'Descrizione', w: '*', min: 190 }, { k: 'soggetto', t: 'Soggetto', w: 160 }, { k: 'rif', t: 'Rif.', w: 110 }, { k: 'note', t: 'Note', w: 140 }] }))
        + (u.pannello ? '<div class="card scorri" id="pn-pannello" style="position:absolute;left:0;right:0;top:0;z-index:5;max-height:100%;overflow:auto">' + (u.pannello.tipo === 'quad' ? this.quadratura(u) : this.form(u)) + '</div>' : '')
        + '</div></div>';
    },
    form(u) {
      const S = G.S, f = u.pannello;
      const cassa = [['', '—']].concat(S.conti.filter((c) => c.codice === 'CASSA' || c.codice === 'ASSEGNI').map((c) => [c.codice, c.nome]));
      const fuori = [['', '—']].concat(S.conti.filter((c) => c.codice !== 'CASSA' && c.codice !== 'ASSEGNI').sort((a, b) => (a.codice === 'POS' ? 0 : 1) - (b.codice === 'POS' ? 0 : 1)).map((c) => [c.codice, c.nome]));
      const slot = (et, idC, opz, idI, tip) => campo(et, G.sel('id="' + idC + '" data-ch="pnf-conto"', opz, f[idC] || ''), 132, 8, tip) + campo('Importo €', tb(idI, f[idI] || '', ' data-in="pnf-imp" inputmode="decimal"'), 88, 10);
      const tot = somma(['pnf-ic1', 'pnf-ic2', 'pnf-if1', 'pnf-if2'], (k) => G.leggiNum(f[k] || ''));
      const assegno = f['pnf-cc1'] === 'ASSEGNI' || f['pnf-cc2'] === 'ASSEGNI';
      return '<div class="h2" style="font-size:17px;margin-bottom:4px">' + esc(f.titolo) + '</div>'
        + '<div class="muto" style="margin-bottom:12px">Compila solo i conti che servono, ciascuno col suo importo: due slot di cassa (es. parte in contanti e parte con assegno) e due fuori cassa (es. parte col POS e parte con bonifico). Verrà registrata una riga per ciascun conto usato.</div>'
        + '<div class="avvolgi">' + campo('Data', G.dp('pnf-data', f.data, { onCambia: (v) => { f.data = v || G.OGGI; } }), 130)
        + campo('Tipo *', G.sel('id="pnf-tipo" data-ch="pnf-tipo"', ['ENTRATA', 'USCITA', 'GIROCONTO'], f.tipoMov), 130)
        + slot('Conto cassa 1', 'pnf-cc1', cassa, 'pnf-ic1', 'Contanti o assegni in cassa') + slot('Conto cassa 2', 'pnf-cc2', cassa, 'pnf-ic2', 'Secondo conto di cassa (es. parte contanti e parte assegno)')
        + (assegno ? campo('Numero assegno', tb('pnf-assegno', f.assegno || '', ' data-in="pnf-campo" data-k="assegno"'), 120, 10) : '')
        + slot('Fuori cassa 1', 'pnf-cf1', fuori, 'pnf-if1', 'POS o banca') + slot('Fuori cassa 2', 'pnf-cf2', fuori, 'pnf-if2', 'Secondo conto fuori cassa (es. parte carta e parte bonifico)')
        + '<div style="width:120px;margin:0 14px 12px 0"><div class="muto">Totale movimento</div><div id="pnf-tot" style="font-size:18px;font-weight:600;margin-top:4px">' + num(tot) + ' €</div></div>'
        + (f.tipoMov === 'GIROCONTO' ? campo('Verso il conto *', G.sel('id="pnf-dest"', [['', '']].concat(S.conti.map((c) => [c.codice, c.nome])), f.dest || ''), 140) : '')
        + campo('Causale *', G.cmb('pnf-causale', { voci: ['INCASSO', 'PAGAMENTO', 'VERSAMENTO IN BANCA', 'PRELIEVO', 'SPESE GENERALI', 'SPESE POSTALI', 'CANCELLERIA', 'UTENZE', 'MANUTENZIONE', 'ABBUONO', 'ARROTONDAMENTO', 'ALTRO'].map((x) => ({ id: x, testo: x })), valore: null, testoLibero: f.causale || '', libero: true, onScrivi: (t) => { f.causale = t; }, onScegli: (v) => { f.causale = v || ''; } }), 220)
        + campo('Descrizione', tb('pnf-descr', f.descr || '', ' data-in="pnf-campo" data-k="descr"'), 260)
        + campo('Cliente (facoltativo)', G.cmb('pnf-cli', { voci: clientiLookup(), valore: f.cli || null, title: 'Scrivi una parte qualsiasi del nome (anche in mezzo): la lista si restringe da sola', onScegli: (v) => { f.cli = v; } }), 220)
        + campo('Fornitore (facoltativo)', G.cmb('pnf-forn', { voci: fornLookup(), valore: f.forn || null, title: 'Scrivi una parte qualsiasi del nome (anche in mezzo): la lista si restringe da sola', onScegli: (v) => { f.forn = v; } }), 220)
        + campo('Categoria di spesa', G.cmb('pnf-cat', { voci: ['Spese generali', 'Utenze', 'Cancelleria', 'Manutenzioni', 'Trasporti', 'Consulenze', 'Banca/commissioni', 'Personale', 'Altro'].map((x) => ({ id: x, testo: x })), valore: null, testoLibero: f.categoria || '', libero: true, onScrivi: (t) => { f.categoria = t; }, onScegli: (v) => { f.categoria = v || ''; } }), 160)
        + campo('Note', tb('pnf-note', f.note || '', ' data-in="pnf-campo" data-k="note"'), 320) + '</div>'
        + '<div class="riga" style="margin-top:8px">' + btn(f.id ? 'Salva modifiche' : 'Registra', 'pnf-salva', { primario: true, stile: 'padding:7px 22px' }) + btn('Annulla', 'pnf-annulla', { stile: 'margin-left:10px;padding:7px 18px' }) + msgSpan(f.msg, 'margin-left:16px;max-width:820px') + '</div>';
    },
    quadratura(u) {
      const q = u.pannello;
      const teorico = G.saldoConto('CASSA');
      const righe = G.S.quadrature.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 30);
      return '<div class="h2" style="font-size:17px;margin-bottom:6px">Quadratura di cassa</div><div class="muto" style="margin-bottom:12px">Conta i contanti in cassa e confrontali col saldo teorico: le differenze restano nello storico.</div>'
        + '<div class="avvolgi basso">' + campo('Giorno', G.dp('qd-data', q.data, { onCambia: (v) => { q.data = v || G.OGGI; } }), 130)
        + '<div style="width:150px;margin:0 14px 12px 0"><div class="muto">Saldo teorico</div><div style="font-size:18px;font-weight:600;margin-top:4px">' + num(teorico) + ' €</div></div>'
        + campo('Contanti contati € *', tb('qd-contato', q.contato || '', ' data-in="qd-campo" data-k="contato" inputmode="decimal"'), 130) + campo('Note (es. giustificazione differenza)', tb('qd-note', q.note || '', ' data-in="qd-campo" data-k="note"'), 240)
        + btn('Registra conteggio', 'qd-salva', { primario: true, stile: 'margin:0 0 12px 0;padding:7px 18px' }) + btn('Chiudi', 'pnf-annulla', { stile: 'margin:0 0 12px 8px;padding:7px 14px' })
        + (q.msg ? '<span style="font-size:12.5px;font-weight:600;margin:0 0 18px 14px;color:' + q.msg.colore + '">' + esc(q.msg.testo) + '</span>' : '') + '</div>'
        + '<div class="muto" style="margin:4px 0 6px">Ultimi conteggi</div>'
        + G.dg('pn-conteggi', { stile: 'max-height:220px', righe, chiave: (x) => x.id, colonne: [
          { k: 'data', t: 'Data', w: 100, v: (x) => dataIt(x.data) }, { k: 'teorico', t: 'Teorico €', w: 110, n: true, v: (x) => num(x.teorico) }, { k: 'contato', t: 'Contato €', w: 110, n: true, v: (x) => num(x.contato) },
          { k: 'diff', t: 'Differenza €', w: 110, n: true, semi: true, v: (x) => num(x.contato - x.teorico), f: (x) => '<span style="' + (Math.abs(x.contato - x.teorico) > 0.004 ? 'color:#C0392B' : '') + '">' + num(x.contato - x.teorico) + '</span>' }, { k: 'note', t: 'Note', w: '*' }] });
    },
  };
  G.CH['pn-conto'] = (el) => { pn().conto = el.value; G.ridisegna(); };
  G.CH['pn-tipo'] = (el) => { pn().tipo = el.value; G.ridisegna(); };
  A['pn-corrisp'] = () => { const u = pn(); u.corrisp = !u.corrisp; u.pannello = null; G.ridisegna(); };
  A['pn-nuovo'] = () => { const u = pn(); u.pannello = { tipo: 'form', titolo: 'Nuovo movimento', id: null, data: G.OGGI, tipoMov: 'ENTRATA', msg: null }; G.ridisegna(); };
  A['pnf-annulla'] = () => { pn().pannello = null; G.ridisegna(); };
  G.CH['pnf-tipo'] = (el) => { pn().pannello.tipoMov = el.value; G.ridisegna(); };
  G.CH['pnf-conto'] = (el) => { pn().pannello[el.id] = el.value; G.ridisegna(); };
  G.IN['pnf-imp'] = (el) => { const f = pn().pannello; f[el.id] = el.value; const t = document.getElementById('pnf-tot'); if (t) t.textContent = num(somma(['pnf-ic1', 'pnf-ic2', 'pnf-if1', 'pnf-if2'], (k) => G.leggiNum(f[k] || ''))) + ' €'; };
  G.IN['pnf-campo'] = (el) => { pn().pannello[el.dataset.k] = el.value; };
  A['pnf-salva'] = () => {
    const S = G.S, u = pn(), f = u.pannello;
    const err = (t) => { f.msg = { colore: 'var(--rosso)', testo: t }; G.ridisegna(); };
    const tipo = f.tipoMov || 'ENTRATA';
    const slots = [['pnf-cc1', 'pnf-ic1', 'Conto cassa 1'], ['pnf-cc2', 'pnf-ic2', 'Conto cassa 2'], ['pnf-cf1', 'pnf-if1', 'Fuori cassa 1'], ['pnf-cf2', 'pnf-if2', 'Fuori cassa 2']];
    const usati = [];
    for (const [c, i, et] of slots) {
      const imp = G.leggiNum(f[i] || '');
      if (imp > 0 && !f[c]) return err(et + ': hai scritto l\'importo ma non hai scelto il conto.');
      if (imp > 0) usati.push({ conto: f[c], imp });
    }
    if (!usati.length) return err('Compila almeno un conto col suo importo.');
    if (new Set(usati.map((x) => x.conto)).size < usati.length) return err('Hai indicato due volte lo stesso conto: usa slot con conti diversi (o somma gli importi).');
    if (tipo === 'GIROCONTO' && usati.length > 1) return err('Per un giroconto indica un solo conto di origine (un solo importo).');
    if (tipo === 'GIROCONTO' && !val('pnf-dest')) return err('Scegli il conto di destinazione del giroconto.');
    if (usati.some((x) => x.conto === 'ASSEGNI') && !(f.assegno || '').trim()) return err('Inserisci il numero dell\'assegno.');
    const causale = (G.testoCombo('pnf-causale') || f.causale || '').trim().toUpperCase();
    if (!causale) return err('Scrivi la causale.');
    const sogg = f.cli ? (G.cli(f.cli) || {}).nome : f.forn ? (G.forn(f.forn) || {}).nome : '';
    if (f.id) { const vecchi = S.primaNota.find((m) => m.id === f.id); S.primaNota = S.primaNota.filter((m) => m.id !== f.id && !(vecchi && vecchi.gruppo && m.gruppo === vecchi.gruppo)); }
    const gruppo = usati.length > 1 ? G.nuovoId() : null;
    usati.forEach((x) => S.primaNota.unshift({ id: G.nuovoId(), data: f.data || G.OGGI, tipo, conto: x.conto, contoDest: tipo === 'GIROCONTO' ? val('pnf-dest') : '', importo: r2(x.imp), causale, descr: (f.descr || '').trim(), soggetto: sogg || '', rif: x.conto === 'ASSEGNI' ? 'Assegno n. ' + f.assegno.trim() : '', note: (f.note || '').trim(), categoria: (G.testoCombo('pnf-cat') || '').trim(), gruppo }));
    S.primaNota.slice(0, usati.length).reverse().forEach((m) => G.log('PrimaNota', tipo + ' ' + num(m.importo) + ' € · ' + causale, 'pn:' + m.id));
    G.salva(); u.pannello = null; u.msg = null; G.ridisegna();
  };
  A['pn-modifica'] = () => {
    const u = pn(), r = G.selezionato('pn');
    if (!r) { u.msg = { colore: 'var(--testo-2)', testo: 'Seleziona prima il movimento da modificare.' }; G.ridisegna(); return; }
    const p0 = r.parti[0];
    const f = { tipo: 'form', titolo: 'Modifica movimento del ' + dataIt(p0.data), id: p0.id, data: p0.data, tipoMov: p0.tipo, causale: p0.causale, descr: p0.descr, note: p0.note, categoria: p0.categoria || '', dest: p0.contoDest || '', msg: null };
    let ic = 0, ifu = 0;
    r.parti.forEach((x) => { const cassa = x.conto === 'CASSA' || x.conto === 'ASSEGNI'; if (cassa && ic < 2) { ic++; f['pnf-cc' + ic] = x.conto; f['pnf-ic' + ic] = num(x.importo).replace(/\./g, ''); } else if (!cassa && ifu < 2) { ifu++; f['pnf-cf' + ifu] = x.conto; f['pnf-if' + ifu] = num(x.importo).replace(/\./g, ''); } });
    if ((p0.rif || '').startsWith('Assegno n. ')) f.assegno = p0.rif.slice(11);
    f.msg = r.collegato ? { colore: 'var(--ambra)', testo: (r.tipo === 'ENTRATA' ? 'Incasso' : 'Pagamento') + ' dello Scadenzario: correggendo importo o data, la partita si riallinea da sola.' } : { colore: 'var(--testo-2)', testo: 'Stai correggendo un movimento già registrato: salvando, quello di prima viene sostituito da questo.' };
    u.pannello = f; G.ridisegna();
  };
  A['pn-elimina'] = () => {
    const S = G.S, r = G.selezionato('pn'); if (!r) return;
    if (r.collegato) { G.msgbox({ titolo: 'Movimento dello Scadenzario', icona: 'info', testo: 'Questo movimento è ' + (r.tipo === 'ENTRATA' ? 'un incasso' : 'un pagamento') + ' registrato dallo Scadenzario: per eliminarlo usa «Annulla incasso…» sulla sua partita, così anche la partita torna aperta.' }); return; }
    const extra = r.parti.length > 1 ? '\nÈ un movimento misto: verranno eliminate ENTRAMBE le parti (cassa e fuori cassa).' : '';
    G.msgbox({ titolo: 'Conferma eliminazione', icona: 'avviso', testo: 'Sei sicuro di voler eliminare il movimento del ' + dataIt(r.data) + ' (' + r.causale + ', ' + num(r.importo) + ' €)?' + extra, pulsanti: [{ t: 'Sì', az: () => {
      const ids = new Set(r.parti.map((x) => x.id)); S.primaNota = S.primaNota.filter((m) => !ids.has(m.id)); G.log('PrimaNota', r.parti.length > 1 ? 'Eliminato movimento misto di prima nota (cassa + fuori cassa)' : 'Eliminato movimento di prima nota', 'pn:' + r.parti[0].id); G.deseleziona('pn'); G.salva(); G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };
  A['pn-quadratura'] = () => { const u = pn(); u.pannello = { tipo: 'quad', data: G.OGGI, contato: '', note: '', msg: null }; G.ridisegna(); };
  G.IN['qd-campo'] = (el) => { pn().pannello[el.dataset.k] = el.value; };
  A['qd-salva'] = () => {
    const u = pn(), q = u.pannello;
    const contato = G.leggiNum(q.contato);
    if (String(q.contato).trim() === '') { q.msg = { colore: 'var(--rosso)', testo: 'Scrivi i contanti contati.' }; G.ridisegna(); return; }
    const teorico = G.saldoConto('CASSA'), diff = r2(contato - teorico);
    G.S.quadrature.push({ id: G.nuovoId(), data: q.data, teorico, contato, note: (q.note || '').trim() });
    G.log('Cassa', 'Quadratura ' + dataIt(q.data) + ': teorico ' + num(teorico) + ' €, contato ' + num(contato) + ' €, differenza ' + num(diff) + ' €');
    G.salva();
    q.msg = diff === 0 ? { colore: 'var(--verde)', testo: 'Cassa QUADRATA ✓' } : { colore: 'var(--rosso)', testo: 'Differenza ' + num(diff) + ' € (teorico ' + num(teorico) + ' €)' };
    q.contato = ''; q.note = ''; G.ridisegna();
  };
  A['pn-esporta'] = () => {
    const u = pn();
    const nome = 'PrimaNota_' + u.dal.replace(/-/g, '') + '_' + u.al.replace(/-/g, '') + '.csv';
    G.scaricaFile(nome, G.csv(['Data', 'Tipo', 'Conto', 'Entrata €', 'Uscita €', 'di cui cassa €', 'di cui fuori €', 'Causale', 'Descrizione', 'Soggetto', 'Rif.', 'Note'],
      movimentiPn(u).map((r) => [dataIt(r.data), r.tipo, r.conto, num(r.entrata), num(r.uscita), r.cassa === null ? '' : num(r.cassa), r.fuori === null ? '' : num(r.fuori), r.causale, r.descr, r.soggetto, r.rif, r.note])));
    u.msg = { colore: 'var(--testo-2)', testo: 'Esportato: ' + nome }; G.ridisegna();
  };

  // =====================================================================
  // AMMINISTRAZIONE
  // =====================================================================
  const am = () => G.ui('amministrazione', () => ({ cerca: '', pannello: null }));
  function anomalie() {
    const S = G.S, out = [];
    if (G.saldoConto('CASSA') < 0) out.push({ grav: 'BLOCCO', tipo: 'Cassa negativa', descr: 'Il saldo teorico di cassa è negativo (' + num(G.saldoConto('CASSA')) + ' €).' });
    S.scadenze.filter((s) => s.tipo === 'ATTIVA' && ['APERTA', 'PARZIALE'].includes(s.stato) && s.scadenza < G.OGGI).sort((a, b) => a.scadenza.localeCompare(b.scadenza))
      .forEach((s) => out.push({ grav: 'AVVISO', tipo: 'Credito scaduto', descr: G.nomeSoggetto(s) + ' · FT ' + s.documento + ' scaduta il ' + dataIt(s.scadenza) + ' · residuo ' + num(G.residuo(s)) + ' €' }));
    S.scadenze.filter((s) => s.tipo === 'PASSIVA' && ['APERTA', 'PARZIALE'].includes(s.stato) && s.scadenza < G.OGGI)
      .forEach((s) => out.push({ grav: 'AVVISO', tipo: 'Debito scaduto', descr: G.nomeSoggetto(s) + ' · FT ' + s.documento + ' scaduta il ' + dataIt(s.scadenza) + ' · residuo ' + num(G.residuo(s)) + ' €' }));
    if (S.scadenze.some((s) => s.stato === 'INSOLUTA')) out.push({ grav: 'AVVISO', tipo: 'Insoluti', descr: 'Ci sono partite segnate come insolute (vedi scadenzario).' });
    S.acconti.filter((a) => !a.collegato).forEach((a) => out.push({ grav: 'AVVISO', tipo: 'Acconto da collegare', descr: 'Acconto di ' + num(a.importo) + ' € (' + (a.tipo === 'ATTIVA' ? (G.cli(a.soggettoId) || {}).nome : (G.forn(a.soggettoId) || {}).nome) + ', ' + dataIt(a.data) + ') non collegato ad alcuna partita.' }));
    S.acquisti.filter((d) => d.daControllare).forEach((d) => out.push({ grav: 'AVVISO', tipo: 'Acquisto da classificare', descr: 'Fattura ' + d.numero + ' di ' + (G.forn(d.fornitoreId) || {}).nome + ' da controllare/classificare (destinazione, regime).' }));
    S.acquisti.filter((d) => ['REVERSE', 'ROTTAMI', 'EPAL'].includes(d.regime)).forEach((d) => out.push({ grav: 'AVVISO', tipo: 'Regime particolare', descr: 'Fattura ' + d.numero + ' di ' + (G.forn(d.fornitoreId) || {}).nome + ' in regime ' + d.regime + ' (reverse charge/integrazione: segnalare al commercialista).' }));
    S.quadrature.filter((q) => Math.abs(q.contato - q.teorico) > 0.004).forEach((q) => out.push({ grav: 'AVVISO', tipo: 'Differenza di cassa', descr: 'Quadratura del ' + dataIt(q.data) + ': differenza ' + num(q.contato - q.teorico) + ' €.' }));
    const enol = S.articoli.filter((a) => (G.cat(a.cat) || {}).codice === 'ENOL' && !a.scadenza).length;
    if (enol) out.push({ grav: 'AVVISO', tipo: 'Scadenze enologici', descr: enol + ' prodotti enologici senza data di scadenza.' });
    out.forEach((x, i) => { x.k = i; });
    return out;
  }
  function ricercaGlobale(q) {
    const S = G.S, t = G.normalizza(q).trim(), out = [];
    if (t.length < 2) return out;
    const c = (s) => G.normalizza(s).includes(t);
    S.clienti.filter((x) => c(x.nome) || c(x.piva) || c(x.cf) || c(x.citta)).slice(0, 40).forEach((x) => out.push({ tipo: 'Cliente', titolo: x.nome, dettaglio: [x.piva && 'P.IVA ' + x.piva, x.cf && 'CF ' + x.cf, x.citta].filter(Boolean).join(' · '), data: '', importo: '' }));
    S.fornitori.filter((x) => c(x.nome) || c(x.piva) || c(x.citta)).slice(0, 20).forEach((x) => out.push({ tipo: 'Fornitore', titolo: x.nome, dettaglio: [x.piva && 'P.IVA ' + x.piva, x.citta].filter(Boolean).join(' · '), data: '', importo: '' }));
    S.fatture.filter((f) => c(G.numeroFattura(f)) || c((G.cli(f.clienteId) || {}).nome) || c(num(f.totale))).slice(0, 40).forEach((f) => out.push({ tipo: 'Fattura', titolo: G.numeroFattura(f) + ' — ' + (G.cli(f.clienteId) || {}).nome, dettaglio: f.sdi, data: f.data, importo: f.totale }));
    S.ddt.filter((d) => c(d.numero + '/' + d.anno) || c((G.cli(d.clienteId) || {}).nome)).slice(0, 30).forEach((d) => out.push({ tipo: 'DDT', titolo: 'DDT ' + d.numero + '/' + d.anno + ' — ' + (G.cli(d.clienteId) || {}).nome, dettaglio: d.fatturaId ? 'Fatturato' : 'Da fatturare', data: d.data, importo: d.totale }));
    S.primaNota.filter((m) => c(m.causale) || c(m.descr) || c(m.soggetto) || c(num(m.importo))).slice(0, 30).forEach((m) => out.push({ tipo: 'Prima nota', titolo: m.causale + ' — ' + m.descr, dettaglio: contoNome(m.conto) + (m.soggetto ? ' · ' + m.soggetto : ''), data: m.data, importo: m.importo }));
    S.articoli.filter((a) => c(a.descr) || c(a.codice) || c(a.barcode)).slice(0, 30).forEach((a) => out.push({ tipo: 'Articolo', titolo: a.codice + ' — ' + a.descr, dettaglio: 'giacenza ' + qta(a.giac) + ' · prezzo ' + num(a.prezzoA) + ' €', data: '', importo: '' }));
    out.forEach((x, i) => { x.k = i; });
    return out;
  }
  const esposizione = (tipo) => { const ap = G.S.scadenze.filter((s) => s.tipo === tipo && ['APERTA', 'PARZIALE', 'INSOLUTA'].includes(s.stato)); return { residuo: somma(ap, G.residuo), scaduto: somma(ap.filter((s) => s.scadenza < G.OGGI), G.residuo) }; };
  G.VISTE.amministrazione = {
    nuova() { const u = am(); u.cerca = ''; u.pannello = null; },
    chiudiRiservati() { const u = am(); if (u.pannello && ['utenti', 'copie'].includes(u.pannello.tipo)) u.pannello = null; },
    render() {
      const S = G.S, u = am();
      const an = anomalie(), c = esposizione('ATTIVA'), d = esposizione('PASSIVA');
      const kpi = (et, v, sotto, colore, ultima) => '<div class="card" style="padding:9px 12px;margin-right:' + (ultima ? 0 : 8) + 'px"><div class="muto">' + et + '</div><div style="font-size:17px;font-weight:600;color:' + (colore || 'var(--testo)') + '">' + v + '</div>' + (sotto ? '<div style="font-size:11px;color:#C0392B">' + sotto + '</div>' : '') + '</div>';
      const ricerca = u.cerca.trim().length >= 2;
      const hits = ricerca ? ricercaGlobale(u.cerca) : [];
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga tesa" style="margin-bottom:10px"><div class="pila"><div class="h1">Amministrazione</div></div><div class="riga tesa fisso">'
        + btn('Utenti…', 'am-utenti', { stile: 'margin-right:8px' }) + btn('Copie di sicurezza…', 'am-copie', { stile: 'margin-right:8px', title: 'Copie del database: stato, password per cifrarle, copia su disco esterno, prova di ripristino' })
        + btn('Blocco periodi…', 'am-periodi', { stile: 'margin-right:8px' }) + btn('Numerazioni…', 'am-numerazioni', { stile: 'margin-right:8px', title: 'Da che numero ripartono fatture, DDT e note di credito quando si subentra a un altro programma' })
        + btn('Esporta per il commercialista…', 'am-export', { primario: true }) + '</div></div>'
        + '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));margin-bottom:10px">' + kpi('Crediti verso clienti', num(c.residuo) + ' €', 'scaduto: ' + num(c.scaduto) + ' €') + kpi('Debiti verso fornitori', num(d.residuo) + ' €', 'scaduto: ' + num(d.scaduto) + ' €')
        + kpi('Saldo cassa', num(G.saldoConto('CASSA')) + ' €') + kpi('Saldo banca', num(G.saldoConto('BANCA')) + ' €') + kpi('Anomalie rilevate', String(an.length), '', 'var(--rosso)', true) + '</div>'
        + '<div class="card riga" style="padding:9px 12px;margin-bottom:10px"><span class="muto" style="margin-right:10px">🔎 Ricerca globale</span><input class="tb spinta" data-in="am-cerca" value="' + esc(u.cerca) + '" title="Cerca ovunque: denominazione, P.IVA, codice fiscale, numero fattura, importo, causale, città… anche parziale" autocomplete="off">'
        + '<span class="muto" style="margin-left:10px">' + (ricerca ? hits.length + ' risultati' : '') + '</span></div>'
        + '<div class="col riempi" style="position:relative">'
        + (ricerca
          ? G.dg('am-ricerca', { classe: 'riempi', righe: hits, chiave: (x) => x.k, colonne: [{ k: 'tipo', t: 'Tipo', w: 110 }, { k: 'titolo', t: 'Risultato', w: '*' }, { k: 'dettaglio', t: 'Dettaglio', w: 300 }, { k: 'data', t: 'Data', w: 90, v: (x) => dataIt(x.data) }, { k: 'importo', t: 'Importo €', w: 100, n: true, v: (x) => (x.importo === '' ? '' : num(x.importo)) }] })
          : '<div class="muto" style="margin-bottom:6px">Documenti e situazioni da controllare (aggiornati in tempo reale)</div>'
            + G.dg('am-anomalie', { classe: 'riempi', righe: an, chiave: (x) => x.k, colonne: [
              { k: 'grav', t: 'Gravità', w: 80, semi: true, f: (x) => '<span style="color:' + (x.grav === 'BLOCCO' ? '#C0392B' : '#B07400') + '">' + x.grav + '</span>' }, { k: 'tipo', t: 'Tipo', w: 180 }, { k: 'descr', t: 'Descrizione', w: '*' }] }))
        + (u.pannello ? '<div class="card scorri" id="am-pannello" style="position:absolute;left:0;right:0;top:0;z-index:5;max-height:100%;overflow:auto">' + this.pannello(u) + '</div>' : '')
        + '</div></div>';
    },
    pannello(u) {
      const S = G.S, p = u.pannello;
      if (p.tipo === 'export') {
        return '<div class="h2" style="font-size:17px;margin-bottom:4px">Esportazione periodica per il commercialista</div>'
          + '<div class="muto" style="margin-bottom:12px">Crea una CARTELLA UNICA con tutti i file del periodo (Excel a colonne fisse + XML delle fatture): prima nota, incassi/pagamenti, fatture, scadenzari, partite, saldi, corrispettivi, magazzino, anomalie e le SCHEDE CONTABILI di clienti e fornitori (PDF ed Excel).</div>'
          + '<div class="avvolgi basso">' + campo('Dal', G.dp('ex-dal', p.dal, { onCambia: (v) => { p.dal = v; } }), 130, 10) + campo('Al', G.dp('ex-al', p.al, { onCambia: (v) => { p.al = v; } }), 130)
          + [1, 2, 3, 4].map((q) => btn(q + '° trimestre', 'ex-q', { dati: ' data-q="' + q + '"', stile: 'margin:0 6px 12px 0;padding:6px 10px' })).join('') + btn('Mese scorso', 'ex-mese', { stile: 'margin:0 14px 12px 0;padding:6px 10px' }) + '</div>'
          + '<div class="riga">' + btn('Crea cartella di esportazione', 'ex-crea', { primario: true, stile: 'padding:7px 20px' })
          + btn('Schede clienti (PDF)', 'ex-schede-cli', { stile: 'margin-left:10px;padding:7px 14px', title: 'Le schede contabili di tutti i clienti con movimenti nel periodo, una dietro l\'altra come il tabulato del commercialista' })
          + btn('Schede fornitori (PDF)', 'ex-schede-forn', { stile: 'margin-left:8px;padding:7px 14px', title: 'Le schede contabili di tutti i fornitori con movimenti nel periodo' })
          + btn('Chiudi', 'am-chiudi', { stile: 'margin-left:10px;padding:7px 18px' }) + msgSpan(p.msg, 'margin-left:16px') + '</div>';
      }
      if (p.tipo === 'periodi') {
        return '<div class="h2" style="font-size:17px;margin-bottom:4px">Blocco dei periodi contabili</div>'
          + '<div class="muto" style="margin-bottom:12px">Dopo l\'invio al commercialista, blocca il periodo: le scritture con data entro il blocco vengono impedite (l\'amministratore può forzare, ma resta traccia in cronologia).</div>'
          + '<div class="avvolgi basso">' + campo('Blocca fino al', G.dp('per-fino', p.fino, { onCambia: (v) => { p.fino = v; } }), 150, 10) + campo('Note (es. \'inviato al commercialista\')', tb('per-note', p.note || '', ' data-in="am-campo" data-k="note"'), 260, 10)
          + btn('Blocca periodo', 'per-blocca', { primario: true, stile: 'margin:0 8px 12px 0;padding:7px 16px' }) + btn('Riapri selezionato', 'per-riapri', { dis: !G.selezionato('am-periodi'), stile: 'margin:0 8px 12px 0;padding:7px 14px' }) + btn('Chiudi', 'am-chiudi', { stile: 'margin:0 0 12px 0;padding:7px 14px' })
          + msgSpan(p.msg, 'margin:0 0 18px 12px') + '</div>'
          + G.dg('am-periodi', { stile: 'max-height:200px', righe: S.periodi.slice().sort((a, b) => b.fino.localeCompare(a.fino)), chiave: (x) => x.id, onSel: () => G.ridisegna(), colonne: [
            { k: 'fino', t: 'Bloccato fino al', w: 130, v: (x) => dataIt(x.fino) }, { k: 'chiuso', t: 'Chiuso il', w: 140, v: (x) => dataIt(x.chiusoIl) + ' ' + x.chiusoIl.slice(11, 16) }, { k: 'op', t: 'Operatore', w: 120 }, { k: 'note', t: 'Note', w: '*' }] });
      }
      if (p.tipo === 'utenti') {
        const scelte = [5, 10, 15, 30, 60, 0];
        return '<div class="h2" style="font-size:17px;margin-bottom:4px">Utenti e responsabilità</div>'
          + '<div class="muto" style="margin-bottom:8px">Ogni operatore entra col suo PIN personale (chi non l\'ha ancora lo sceglie al primo accesso) e ogni operazione resta firmata in cronologia. Il PIN dice chi lavora: le funzioni da amministratore (numeri dell\'azienda, utenti, copie di sicurezza, periodi bloccati) si aprono solo con la password amministratore.</div>'
          + '<div class="avvolgi basso">' + campo('Nome utente *', tb('ut-user', p.user || '', ' data-in="am-campo" data-k="user"'), 130, 10) + campo('Nome *', tb('ut-nome', p.nome || '', ' data-in="am-campo" data-k="nome"'), 130, 10)
          + campo('Cognome', tb('ut-cognome', p.cognome || '', ' data-in="am-campo" data-k="cognome"'), 130, 10)
          + campo('PIN (4-8 cifre)', '<input class="tb" type="password" id="ut-pin" maxlength="8" inputmode="numeric" title="Vuoto = non cambia. Meglio: «Azzera PIN» e l\'operatore lo sceglie da sé al prossimo accesso." autocomplete="off">', 100, 10)
          + '<label class="chk" style="margin:0 10px 18px 0" title="Solo un\'indicazione di chi è il titolare: le funzioni da amministratore si aprono con la password amministratore, non col PIN"><input type="checkbox" id="ut-admin"' + (p.admin ? ' checked' : '') + '>Amministratore</label>'
          + '<label class="chk" style="margin:0 10px 18px 0"><input type="checkbox" id="ut-attivo"' + (p.attivo !== false ? ' checked' : '') + '>Attivo</label>'
          + btn('Salva utente', 'ut-salva', { primario: true, stile: 'margin:0 8px 12px 0;padding:7px 16px' }) + btn('Nuovo', 'ut-nuovo', { stile: 'margin:0 8px 12px 0;padding:7px 14px' })
          + btn('Azzera PIN', 'ut-azzera', { dis: !p.id, stile: 'margin:0 8px 12px 0;padding:7px 14px', title: 'PIN dimenticato: l\'operatore selezionato ne sceglierà uno nuovo al prossimo accesso' }) + btn('Chiudi', 'am-chiudi', { stile: 'margin:0 0 12px 0;padding:7px 14px' })
          + msgSpan(p.msg, 'margin:0 0 18px 12px;max-width:360px') + '</div>'
          + '<div class="avvolgi" style="margin-bottom:10px;align-items:center">' + btn('Cambia password amministratore…', 'ut-cambiapwd', { stile: 'margin:0 16px 6px 0;padding:6px 14px' })
          + '<span class="muto" style="margin:0 6px 6px 0">Su questo computer il programma si blocca dopo</span><div style="width:110px;margin:0 6px 6px 0" title="Minuti senza toccare tastiera e mouse dopo i quali il programma chiede di nuovo il PIN (vale solo per questo computer)">'
          + G.sel('data-ch="ut-blocco"', scelte.map((m) => [m, m === 0 ? 'mai' : m + ' minuti']), Number(S.impostazioni.bloccoMinuti)) + '</div><span class="muto" style="margin-bottom:6px">senza usarlo.</span></div>'
          + G.dg('am-utenti', { stile: 'max-height:200px', righe: S.operatori, chiave: (o) => o.id, onSel: (o) => { Object.assign(p, { id: o.id, user: o.utente, nome: o.nome.split(' ')[0], cognome: o.nome.split(' ').slice(1).join(' '), admin: o.admin, attivo: o.attivo, msg: { colore: 'var(--testo-2)', testo: o.haPin ? 'PIN già scelto (lascia vuoto per non cambiarlo)' : 'PIN non ancora scelto: lo sceglierà al primo accesso' } }); G.ridisegna(); },
            colonne: [{ k: 'utente', t: 'Nome utente', w: 140, v: (o) => o.utente.toUpperCase() }, { k: 'nome', t: 'Nome', w: '*' },
              { k: 'admin', t: 'Admin', w: 86, c: true, v: (o) => (o.admin ? 'Sì' : ''), f: (o) => '<label class="chk"><input type="checkbox" disabled' + (o.admin ? ' checked' : '') + '></label>' },
              { k: 'attivo', t: 'Attivo', w: 86, c: true, v: (o) => (o.attivo ? 'Sì' : ''), f: (o) => '<label class="chk"><input type="checkbox" disabled' + (o.attivo ? ' checked' : '') + '></label>' },
              { k: 'pin', t: 'PIN impostato', w: 128, c: true, v: (o) => (o.haPin ? 'Sì' : ''), f: (o) => '<label class="chk"><input type="checkbox" disabled' + (o.haPin ? ' checked' : '') + '></label>' }] });
      }
      if (p.tipo === 'copie') {
        const c = S.copie;
        return '<div class="h2" style="font-size:17px;margin-bottom:4px">Copie di sicurezza del database</div>'
          + '<div class="muto" style="margin-bottom:10px">Una copia al giorno, fatta dal primo computer che apre il programma e controllata prima di tenerla. Con la password delle copie sono cifrate: chi trova una copia non può leggerla. La copia esterna (disco USB o cartella di rete) protegge da furti, guasti e virus: la aggiorna una volta al giorno il computer che ha il disco collegato.</div>'
          + '<div style="background:#F4F6F8;border-radius:8px;padding:9px 12px;margin-bottom:10px;font-size:13px">'
          + '<div style="margin-bottom:4px;color:var(--verde)">✓ Password delle copie impostata: le copie sono cifrate.</div>'
          + '<div style="margin-bottom:4px">✓ Ultima copia: ' + dataIt(c.ultima.quando) + ' ' + c.ultima.quando.slice(11, 16) + ' dal computer ' + c.ultima.postazione + ' · ' + String(c.ultima.mb).replace('.', ',') + ' MB · cifrata · ' + c.ultima.file + '</div>'
          + '<div>' + (c.esterna ? '✓ Ultima copia esterna: ' + dataIt(c.esterna.quando) + ' ' + c.esterna.quando.slice(11, 16) + ' dal computer ' + c.esterna.postazione + ' in ' + esc(c.cartellaEsterna) : '⚠ Nessuna copia esterna: scegli qui sotto un disco USB o una cartella di rete (sul computer dove sono collegati).') + '</div></div>'
          + '<div class="muto semi" style="margin-bottom:4px">Su questo computer</div>'
          + '<div style="display:grid;grid-template-columns:210px 1fr auto;align-items:center;margin-bottom:6px;row-gap:6px">'
          + '<span class="muto">Cartella delle copie</span><input class="tb" readonly value="' + esc(c.cartella) + '" style="margin-right:8px">' + btn('Cambia…', 'cp-cartella', { stile: 'padding:4px 12px' })
          + '<span class="muto">Copia esterna (disco USB, rete)</span><input class="tb" readonly value="' + esc(c.cartellaEsterna || '(nessuna)') + '" style="margin-right:8px"><div class="riga">' + btn('Scegli…', 'cp-esterna', { stile: 'padding:4px 12px;margin-right:6px' }) + btn('Togli', 'cp-togli', { stile: 'padding:4px 12px' }) + '</div></div>'
          + '<div class="avvolgi" style="margin-top:8px">' + btn('Cambia la password delle copie…', 'cp-password', { stile: 'margin:0 8px 6px 0;padding:7px 14px' }) + btn('Fai una copia adesso', 'cp-adesso', { primario: true, stile: 'margin:0 8px 6px 0;padding:7px 14px' })
          + btn('Prova ad aprire una copia…', 'cp-prova', { stile: 'margin:0 8px 6px 0;padding:7px 14px', title: 'Prova di ripristino senza toccare niente: apre la copia con la password e la fa rileggere. Da fare una volta al mese.' }) + btn('Apri la cartella', 'cp-apri', { stile: 'margin:0 8px 6px 0;padding:7px 14px' }) + btn('Chiudi', 'am-chiudi', { stile: 'margin:0 0 6px 0;padding:7px 14px' }) + '</div>'
          + (p.msg ? '<div style="font-size:12.5px;margin-top:4px;color:' + p.msg.colore + '">' + esc(p.msg.testo) + '</div>' : '');
      }
      return '';
    },
  };
  G.IN['am-cerca'] = (el) => { am().cerca = el.value; G.ridisegna(); const n = document.querySelector('[data-in="am-cerca"]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  G.IN['am-campo'] = (el) => { am().pannello[el.dataset.k] = el.value; };
  A['am-chiudi'] = () => { am().pannello = null; G.ridisegna(); };
  A['am-export'] = () => { const u = am(); const d = G.D.daIso(G.OGGI); const q = Math.floor(d.getMonth() / 3); u.pannello = { tipo: 'export', dal: G.D.iso(new Date(d.getFullYear(), q * 3, 1)), al: G.D.iso(new Date(d.getFullYear(), q * 3 + 3, 0)), msg: null }; G.ridisegna(); };
  A['ex-q'] = (el) => { const p = am().pannello; const y = Number(G.OGGI.slice(0, 4)), q = Number(el.dataset.q) - 1; p.dal = G.D.iso(new Date(y, q * 3, 1)); p.al = G.D.iso(new Date(y, q * 3 + 3, 0)); G.ridisegna(); };
  A['ex-mese'] = () => { const p = am().pannello; const d = G.D.daIso(G.OGGI); p.dal = G.D.iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)); p.al = G.D.iso(new Date(d.getFullYear(), d.getMonth(), 0)); G.ridisegna(); };
  function fileCommercialista(dal, al) {
    const S = G.S, csv = G.csv, files = [];
    const pnRighe = S.primaNota.filter((m) => m.data >= dal && m.data <= al).sort((a, b) => a.data.localeCompare(b.data));
    files.push({ nome: '01_PrimaNota.csv', testo: csv(['Data', 'Tipo', 'Conto', 'Importo', 'Causale', 'Descrizione', 'Soggetto', 'Rif.'], pnRighe.map((m) => [dataIt(m.data), m.tipo, contoNome(m.conto) + (m.contoDest ? ' -> ' + contoNome(m.contoDest) : ''), num(m.importo), m.causale, m.descr, m.soggetto, m.rif])) });
    const inc = []; S.scadenze.forEach((s) => (s.incassi || []).filter((i) => i.data >= dal && i.data <= al).forEach((i) => inc.push([dataIt(i.data), s.tipo === 'ATTIVA' ? 'INCASSO' : 'PAGAMENTO', G.nomeSoggetto(s), s.documento, num(i.importo), contoNome(i.conto)])));
    files.push({ nome: '02_IncassiPagamenti.csv', testo: csv(['Data', 'Tipo', 'Soggetto', 'Documento', 'Importo', 'Conto'], inc) });
    const ft = S.fatture.filter((f) => f.data >= dal && f.data <= al).sort((a, b) => a.data.localeCompare(b.data));
    files.push({ nome: '03_Fatture.csv', testo: csv(['Numero', 'Data', 'Cliente', 'P.IVA/CF', 'Imponibile', 'IVA', 'Totale', 'SDI'], ft.map((f) => { const c = G.cli(f.clienteId) || {}; return [G.numeroFattura(f), dataIt(f.data), c.nome, c.piva || c.cf, num(f.imponibile), num(f.iva), num(f.totale), f.sdi]; })) });
    ['ATTIVA', 'PASSIVA'].forEach((t, i) => files.push({ nome: (i ? '05_ScadenzarioFornitori' : '04_ScadenzarioClienti') + '.csv', testo: csv(['Soggetto', 'Doc.', 'Data doc.', 'Scadenza', 'Importo', 'Pagato', 'Residuo', 'Stato'], S.scadenze.filter((s) => s.tipo === t).map((s) => [G.nomeSoggetto(s), s.documento, dataIt(s.dataDoc), dataIt(s.scadenza), num(s.importo), num(G.pagatoScad(s)), num(G.residuo(s)), s.stato])) }));
    files.push({ nome: '06_Saldi.csv', testo: csv(['Conto', 'Saldo'], S.conti.map((c) => [c.nome, num(G.saldoConto(c.codice))])) });
    files.push({ nome: '07_Corrispettivi.csv', testo: csv(['Data', 'N. scontrini', 'Totale', '4%', '5%', '10%', '22%', 'Esente/altro', 'Contanti', 'POS'], corrispettivi(dal, al).reverse().map((x) => [dataIt(x.data), x.n, num(x.totale), num(x.iva4), num(x.iva5), num(x.iva10), num(x.iva22), num(x.altro), num(x.contanti), num(x.elettronico)])) });
    files.push({ nome: '08_Magazzino.csv', testo: csv(['Codice', 'Descrizione', 'UM', 'Giacenza', 'Costo', 'Valore'], S.articoli.map((a) => [a.codice, a.descr, a.um, qta(a.giac), num(a.costo), num(a.giac * a.costo)])) });
    files.push({ nome: '09_Anomalie.csv', testo: csv(['Gravità', 'Tipo', 'Descrizione'], anomalie().map((x) => [x.grav, x.tipo, x.descr])) });
    return files;
  }
  A['ex-crea'] = () => {
    const p = am().pannello; const dal = G.valoreDp('ex-dal') || p.dal, al = G.valoreDp('ex-al') || p.al;
    const nome = 'Commercialista_' + dal.replace(/-/g, '') + '_' + al.replace(/-/g, '');
    G.scaricaZip(nome + '.zip', fileCommercialista(dal, al));
    G.log('Export', 'Esportazione per il commercialista ' + dataIt(dal) + '-' + dataIt(al) + ' → Documenti\\' + nome);
    G.salva(); p.msg = { colore: 'var(--verde)', testo: 'Cartella creata: ' + nome }; G.ridisegna();
  };
  function schedePdf(clienti) {
    const p = am().pannello; const dal = G.valoreDp('ex-dal') || p.dal, al = G.valoreDp('ex-al') || p.al;
    const lista = (clienti ? G.S.clienti : G.S.fornitori).map((s) => ({ s, mov: G.anagrafiche.partitario(clienti, s.id, dal, al) })).filter((x) => x.mov.length);
    if (!lista.length) { p.msg = { colore: 'var(--testo-2)', testo: 'Nessun ' + (clienti ? 'cliente' : 'fornitore') + ' con movimenti dal ' + dataIt(dal) + ' al ' + dataIt(al) + '.' }; G.ridisegna(); return; }
    const corpo = lista.map((x) => '<div style="margin-bottom:18px"><b>' + esc(x.s.nome) + '</b> — ' + esc(x.s.piva || x.s.cf || '') + '<table><thead><tr><th>Data</th><th>Causale</th><th>Documento</th><th class="n">Dare</th><th class="n">Avere</th><th class="n">Saldo</th></tr></thead><tbody>'
      + x.mov.map((m) => '<tr><td>' + dataIt(m.data) + '</td><td>' + esc(m.causale) + '</td><td>' + esc(m.documento) + '</td><td class="n">' + num(m.dare) + '</td><td class="n">' + num(m.avere) + '</td><td class="n">' + num(m.saldo) + '</td></tr>').join('') + '</tbody></table></div>').join('');
    const nome = 'Schede_' + (clienti ? 'clienti' : 'fornitori') + '_' + dal.replace(/-/g, '') + '_' + al.replace(/-/g, '') + '.pdf';
    G.finestra({ titolo: nome + ' — Visualizzatore PDF', larghezza: 820, altezza: 700, bianca: true, corpo: '<div class="foglio-cornice"><div class="foglio"><div class="ditta">' + esc(G.S.negozio.ragione) + '</div><div class="tipo"><span>SCHEDE CONTABILI ' + (clienti ? 'CLIENTI' : 'FORNITORI') + '</span><span>dal ' + dataIt(dal) + ' al ' + dataIt(al) + '</span></div>' + corpo + '</div></div>' });
    p.msg = { colore: 'var(--verde)', testo: lista.length + ' schede: ' + nome }; G.ridisegna();
  }
  A['ex-schede-cli'] = () => schedePdf(true);
  A['ex-schede-forn'] = () => schedePdf(false);
  A['am-periodi'] = () => { am().pannello = { tipo: 'periodi', fino: '', note: '', msg: null }; G.deseleziona('am-periodi'); G.ridisegna(); };
  A['per-blocca'] = () => {
    const p = am().pannello; const fino = G.valoreDp('per-fino');
    if (!fino) { p.msg = { colore: 'var(--rosso)', testo: 'Scegli la data.' }; G.ridisegna(); return; }
    G.msgbox({ titolo: 'Blocco periodo', icona: 'domanda', testo: 'Bloccare le scritture contabili fino al ' + dataIt(fino) + ' compreso?', pulsanti: [{ t: 'Sì', az: () => {
      G.S.periodi.push({ id: G.nuovoId(), fino, chiusoIl: G.adessoIso(), op: G.operatore ? G.operatore.nome : '', note: val('per-note').trim() });
      const notaPer = val('per-note').trim();
      G.log('PeriodoChiuso', 'Chiuso il periodo fino al ' + dataIt(fino) + (notaPer ? ' (' + notaPer + ')' : '')); G.salva(); p.msg = { colore: 'var(--verde)', testo: 'Periodo bloccato ✓' }; G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };
  A['per-riapri'] = () => {
    const p = am().pannello, x = G.selezionato('am-periodi'); if (!x) return;
    G.msgbox({ titolo: 'Riapri periodo', icona: 'domanda', testo: 'Riaprire il periodo bloccato fino al ' + dataIt(x.fino) + '?', pulsanti: [{ t: 'Sì', az: () => { G.S.periodi = G.S.periodi.filter((y) => y !== x); G.log('PeriodoChiuso', 'Riaperto un periodo chiuso'); G.deseleziona('am-periodi'); G.salva(); p.msg = { colore: 'var(--verde)', testo: 'Periodo riaperto.' }; G.ridisegna(); } }, { t: 'No', annulla: true }] });
  };
  A['am-utenti'] = () => {
    if (!G.isAdmin()) { G.msgbox({ titolo: 'Utenti', icona: 'info', testo: 'Gli utenti si gestiscono solo da amministratore: premi «Amministratore» in fondo al menu e inserisci la password.' }); return; }
    am().pannello = { tipo: 'utenti', id: null, user: '', nome: '', cognome: '', admin: false, attivo: true, msg: null }; G.deseleziona('am-utenti'); G.ridisegna();
  };
  A['ut-nuovo'] = () => { Object.assign(am().pannello, { id: null, user: '', nome: '', cognome: '', admin: false, attivo: true, msg: null }); G.deseleziona('am-utenti'); G.ridisegna(); };
  G.CH['ut-blocco'] = (el) => {
    const p = am().pannello, m = Number(el.value);
    G.S.impostazioni.bloccoMinuti = m;
    G.log('Accesso', 'Blocco per inattività su IPAD-DEMO: ' + (m === 0 ? 'mai' : m + ' minuti')); G.salva();
    p.msg = { colore: 'var(--verde)', testo: m === 0 ? 'Su questo computer il programma non si bloccherà più da solo.' : 'Su questo computer si bloccherà dopo ' + m + ' minuti senza usarlo.' }; G.ridisegna();
  };
  const controllaPin = (pin) => (!/^\d{4,8}$/.test(pin) ? 'Il PIN deve avere da 4 a 8 cifre.' : /^(\d)\1+$/.test(pin) ? 'Il PIN non può avere tutte le cifre uguali.' : ('0123456789'.includes(pin) || '9876543210'.includes(pin)) ? 'Il PIN non può essere una sequenza (1234, 4321…).' : null);
  A['ut-salva'] = () => {
    const S = G.S, p = am().pannello;
    const user = val('ut-user').trim(), nome = val('ut-nome').trim(), cognome = val('ut-cognome').trim(), pin = val('ut-pin');
    if (!user || !nome) { p.msg = { colore: 'var(--rosso)', testo: 'Nome utente e nome sono obbligatori.' }; G.ridisegna(); return; }
    if (pin && controllaPin(pin)) { p.msg = { colore: 'var(--rosso)', testo: controllaPin(pin) }; G.ridisegna(); return; }
    if (S.operatori.some((o) => o.id !== p.id && o.utente.toLowerCase() === user.toLowerCase())) { p.msg = { colore: 'var(--rosso)', testo: 'Nome utente già esistente.' }; G.ridisegna(); return; }
    let o = p.id ? S.operatori.find((x) => x.id === p.id) : null;
    const nuovo = !o;
    if (!o) { o = { id: G.nuovoId(), haPin: false }; S.operatori.push(o); }
    Object.assign(o, { utente: user.toLowerCase(), nome: (nome + ' ' + cognome).trim().toUpperCase(), admin: document.getElementById('ut-admin').checked, attivo: document.getElementById('ut-attivo').checked });
    if (pin) o.haPin = true;
    G.log('Utenti', nuovo ? 'Creato operatore ' + o.utente + (o.admin ? ' (amministratore)' : '') : 'Aggiornato operatore ' + o.utente + (pin ? ' (PIN cambiato)' : '')); G.salva();
    Object.assign(p, { id: o.id, user: o.utente, nome, cognome, admin: o.admin, attivo: o.attivo, msg: { colore: 'var(--verde)', testo: 'Utente salvato ✓' + (!pin && nuovo ? ' (il PIN lo sceglierà al primo accesso)' : '') } });
    G.scegliRiga('am-utenti', o.id); G.ridisegna();
  };
  A['ut-azzera'] = () => {
    const S = G.S, p = am().pannello, o = S.operatori.find((x) => x.id === p.id); if (!o) return;
    G.msgbox({ titolo: 'Azzera PIN', icona: 'domanda', testo: 'Azzero il PIN di ' + o.nome + '? Al prossimo accesso ne sceglierà uno nuovo.', pulsanti: [{ t: 'Sì', az: () => { o.haPin = false; G.log('Utenti', 'Azzerato il PIN di ' + o.nome + ': lo sceglierà al prossimo accesso', 'op:' + o.id); G.salva(); p.msg = { colore: 'var(--verde)', testo: 'PIN di ' + o.nome + ' azzerato: lo sceglierà al prossimo accesso.' }; G.ridisegna(); } }, { t: 'No', annulla: true }] });
  };
  // Cambia password amministratore (CambiaPasswordAdminWindow): nella demo la password non viene chiesta,
  // ma la finestra c'è ed esegue gli stessi controlli
  A['ut-cambiapwd'] = () => {
    if (!G.isAdmin()) return;
    let msg = ' ';
    const o = G.finestra({ titolo: 'Password amministratore', larghezza: 460,
      corpo: () => '<div class="card" style="margin:20px;padding:18px 24px"><div class="h2" style="font-size:17px">Cambia la password amministratore</div><div class="muto" style="margin:4px 0 14px">Serve per aprire Dashboard, Analisi, Report, Provvigioni, PEC e la gestione degli utenti.</div>'
        + '<div class="muto">Password attuale</div><input class="tb pwd" type="password" id="cp-att" style="margin:4px 0 10px;font-size:14px;height:36px">'
        + '<div class="muto">Nuova password (almeno 8 caratteri, lettere e numeri)</div><input class="tb pwd" type="password" id="cp-n1" style="margin:4px 0 10px;font-size:14px;height:36px">'
        + '<div class="muto">Ripeti la nuova password</div><input class="tb pwd" type="password" id="cp-n2" data-invio="cp-salva" style="margin:4px 0 6px;font-size:14px;height:36px">'
        + '<div class="muto" style="margin:2px 0 6px">Scrivila e conservala in un posto sicuro: se si perde, per rimetterla serve chi vi assiste.</div>'
        + '<div style="color:var(--rosso);font-size:12.5px;margin:2px 0 10px;min-height:17px">' + esc(msg) + '</div>'
        + '<div class="riga" style="justify-content:flex-end">' + btn('Salva', 'cp-salva', { primario: true, stile: 'padding:9px 26px' }) + btn('Annulla', 'chiudi-finestra', { stile: 'padding:9px 22px;margin-left:10px' }) + '</div></div>' });
    A['cp-salva'] = () => {
      const n1 = val('cp-n1'), n2 = val('cp-n2');
      const err = n1 !== n2 ? 'Le due password nuove non sono uguali.' : n1.length < 8 ? 'La password deve avere almeno 8 caratteri.' : (!/[A-Za-z]/.test(n1) || !/\d/.test(n1)) ? 'La password deve contenere lettere e numeri.' : null;
      if (err) { msg = err; G.aggiornaFinestra(o); return; }
      G.log('Accesso', 'Cambiata la password amministratore'); G.salva(); G.chiudiFinestra(o);
      G.msgbox({ titolo: 'Password amministratore', icona: 'info', testo: 'Password amministratore cambiata.' });
    };
  };
  A['am-copie'] = () => {
    if (!G.isAdmin()) { G.msgbox({ titolo: 'Copie di sicurezza', icona: 'info', testo: 'Le copie di sicurezza si gestiscono solo da amministratore: premi «Amministratore» in fondo al menu e inserisci la password.' }); return; }
    const S = G.S;
    if (!S.copie) {
      const q = G.OGGI + 'T08:2' + (Math.floor(Math.random() * 9)) + ':00';
      S.copie = { cartella: 'C:\\Gestionale\\Copie', cartellaEsterna: 'E:\\CopieGestionale', ultima: { quando: q, postazione: 'CASSA-PC', mb: 41.3, file: 'gestionale_' + G.OGGI.replace(/-/g, '') + '_0821.gbak' }, esterna: { quando: q, postazione: 'CASSA-PC' } };
    }
    am().pannello = { tipo: 'copie', msg: null }; G.ridisegna();
  };
  A['cp-adesso'] = () => {
    const S = G.S, p = am().pannello, d = new Date();
    const file = 'gestionale_' + G.OGGI.replace(/-/g, '') + '_' + G.D.pad(d.getHours()) + G.D.pad(d.getMinutes()) + '.gbak';
    S.copie.ultima = { quando: G.adessoIso(), postazione: 'IPAD-DEMO', mb: 41.4, file };
    G.log('Backup', 'Copia fatta: ' + file + ' (41,4 MB, 236 oggetti, cifrata)'); G.salva();
    p.msg = { colore: 'var(--verde)', testo: 'Copia fatta: ' + file + ' (41,4 MB, 236 oggetti, cifrata)' }; G.ridisegna();
  };
  A['cp-prova'] = () => {
    const p = am().pannello, c = G.S.copie;
    finestraPasswordCopie('Chiedi', (ok) => { if (!ok) return; p.msg = { colore: 'var(--verde)', testo: 'La copia ' + c.ultima.file + ' si apre: password giusta, contenuto letto per intero (236 oggetti). Si può ripristinare.' }; G.log('Backup', 'Prova di ripristino: copia ' + c.ultima.file + ' aperta e riletta'); G.salva(); G.ridisegna(); });
  };
  A['cp-password'] = () => { const p = am().pannello; finestraPasswordCopie('Cambia', (ok) => { if (ok) { p.msg = { colore: 'var(--verde)', testo: 'Password delle copie cambiata.' }; G.ridisegna(); } }); };
  A['cp-cartella'] = () => { const p = am().pannello; p.msg = { colore: 'var(--verde)', testo: 'Le prossime copie fatte da questo computer andranno in ' + G.S.copie.cartella }; G.ridisegna(); };
  A['cp-esterna'] = () => { const p = am().pannello; G.S.copie.cartellaEsterna = 'E:\\CopieGestionale'; G.salva(); p.msg = { colore: 'var(--verde)', testo: 'Copia esterna: E:\\CopieGestionale. La prossima copia esterna la fa questo computer appena il disco è collegato.' }; G.ridisegna(); };
  A['cp-togli'] = () => { const p = am().pannello; G.S.copie.cartellaEsterna = ''; G.S.copie.esterna = null; G.salva(); p.msg = { colore: 'var(--testo-2)', testo: 'Questo computer non farà più la copia esterna.' }; G.ridisegna(); };
  A['cp-apri'] = () => { const p = am().pannello; p.msg = { colore: 'var(--testo-2)', testo: 'Cartella delle copie: ' + G.S.copie.cartella }; G.ridisegna(); };
  function finestraPasswordCopie(modo, fatto) {
    let msg = ' ';
    const chiedi = modo === 'Chiedi';
    const o = G.finestra({ titolo: chiedi ? 'Apri una copia di sicurezza' : 'Password delle copie di sicurezza', larghezza: 480,
      corpo: () => '<div class="card" style="margin:20px;padding:18px 24px"><div class="h2" style="font-size:17px">' + (chiedi ? 'Apri una copia di sicurezza' : 'Password delle copie di sicurezza') + '</div>'
        + '<div class="muto" style="margin:4px 0 14px">' + (chiedi ? 'Prova di ripristino: la copia si apre e si fa rileggere, senza toccare il database.' : 'Le copie fatte fin qui continueranno ad aprirsi con la password vecchia: conservatela insieme alla nuova finché quelle copie non vengono cancellate (dopo 30-60 giorni).') + '</div>'
        + '<div class="muto">' + (chiedi ? 'Password delle copie' : 'Password delle copie attuale') + '</div><input class="tb pwd" type="password" id="pc-att" style="margin:4px 0 10px;font-size:14px;height:36px"' + (chiedi ? ' data-invio="pc-ok"' : '') + '>'
        + (chiedi ? '' : '<div class="muto">Nuova password delle copie (almeno 10 caratteri, lettere e numeri)</div><input class="tb pwd" type="password" id="pc-n1" style="margin:4px 0 10px;font-size:14px;height:36px"><div class="muto">Ripeti la nuova password</div><input class="tb pwd" type="password" id="pc-n2" data-invio="pc-ok" style="margin:4px 0 6px;font-size:14px;height:36px">')
        + '<div style="color:var(--rosso);font-size:12.5px;margin:4px 0 10px;min-height:17px">' + esc(msg) + '</div>'
        + '<div class="riga" style="justify-content:flex-end">' + btn(chiedi ? 'Apri' : 'Salva', 'pc-ok', { primario: true, stile: 'padding:9px 26px' }) + btn('Annulla', 'pc-annulla', { stile: 'padding:9px 22px;margin-left:10px' }) + '</div></div>' });
    A['pc-annulla'] = () => { G.chiudiFinestra(o); fatto(false); };
    A['pc-ok'] = () => {
      if (!val('pc-att')) { msg = 'Scrivi la password delle copie.'; G.aggiornaFinestra(o); return; }
      if (!chiedi) {
        const n1 = val('pc-n1'), n2 = val('pc-n2');
        const err = n1 !== n2 ? 'Le due password nuove non sono uguali.' : n1.length < 10 ? 'La password delle copie deve avere almeno 10 caratteri.' : (!/[A-Za-z]/.test(n1) || !/\d/.test(n1)) ? 'La password delle copie deve contenere lettere e numeri.' : null;
        if (err) { msg = err; G.aggiornaFinestra(o); return; }
        G.log('Backup', 'Cambiata la password delle copie di sicurezza'); G.salva();
      }
      G.chiudiFinestra(o); fatto(true);
    };
  }
  // Numerazioni di partenza (NumerazioniWindow)
  A['am-numerazioni'] = () => {
    const S = G.S;
    S.numPartenza = S.numPartenza || {};
    const tipi = [['FATTURA', 'Fatture'], ['ACCOMPAGNATORIA', 'Fatture accompagnatorie (FAC)'], ['NOTA_CREDITO', 'Note di credito'], ['DDT', 'Documenti di trasporto (DDT)'], ['PREVENTIVO', 'Preventivi']];
    let anno = Number(G.OGGI.slice(0, 4)), msg = null;
    const valori = () => S.numPartenza[anno] || {};
    const o = G.finestra({ titolo: 'Numerazioni di partenza', larghezza: 680, altezza: 560,
      corpo: () => {
        const v = valori();
        const m = msg || (Object.keys(v).length ? { colore: 'var(--testo-2)', testo: 'Impostati ' + Object.keys(v).length + ' numeri di partenza per il ' + anno + '.' } : { colore: 'var(--testo-2)', testo: 'Nessun numero di partenza impostato per il ' + anno + ': il gestionale usa il più alto in archivio.' });
        return '<div class="col" style="padding:18px 20px 16px;height:100%"><div style="background:#FFF7E6;border:1px solid #E8C77B;border-radius:8px;padding:10px 14px;margin-bottom:14px"><div style="font-size:16px;font-weight:600">Da che numero riparte ogni documento</div><div class="muto" style="margin-top:3px">Si compila UNA VOLTA, il giorno in cui si passa dal vecchio programma a questo: scrivi l\'ULTIMO numero che il vecchio programma ha usato quest\'anno. Il gestionale continuerà da quello successivo.</div></div>'
          + '<div class="riempi" style="overflow:auto"><div style="width:120px;margin-bottom:10px"><div class="muto">Anno</div>' + tb('nm-anno', anno, ' style="margin-top:3px" data-ch="nm-anno" inputmode="numeric"') + '</div>'
          + '<div class="card"><div class="muto" style="text-align:right;margin:0 120px 8px 0">Ultimo numero usato dal vecchio programma  →</div>'
          + tipi.map((t) => '<div class="riga" style="margin-bottom:10px"><span class="spinta" style="font-size:14px">' + t[1] + '</span>' + tb('nm-' + t[0], v[t[0]] || 0, ' style="width:110px" inputmode="numeric"') + '</div>').join('') + '</div>'
          + '<div class="muto" style="margin:12px 0 0 2px">Lasciando 0 il gestionale usa semplicemente il numero più alto che trova in archivio. Il numero di partenza non può essere più basso dei documenti già emessi da questo programma.</div></div>'
          + '<div style="margin-top:14px"><div class="riga">' + btn('Salva', 'nm-salva', { primario: true, stile: 'padding:9px 26px;font-size:14px' }) + btn('Chiudi', 'chiudi-finestra', { stile: 'padding:9px 20px;font-size:14px;margin-left:10px' }) + '</div>'
          + '<div style="font-size:13px;margin-top:10px;min-height:34px;color:' + m.colore + '">' + esc(m.testo) + '</div></div></div>';
      } });
    G.CH['nm-anno'] = (el) => { const a = Number(el.value); if (a > 2000) { anno = a; msg = null; G.aggiornaFinestra(o); } };
    A['nm-salva'] = () => {
      const fatti = [], nuovi = {};
      for (const [t, nome] of tipi) {
        const testo = val('nm-' + t).trim();
        if (!/^\d+$/.test(testo)) { msg = { colore: 'var(--rosso)', testo: '«' + nome + '»: scrivi un numero (0 = nessun numero di partenza).' }; G.aggiornaFinestra(o); return; }
        const n = Number(testo); if (n > 0) { nuovi[t] = n; fatti.push(nome + ' riparte da ' + (n + 1)); }
      }
      S.numPartenza[anno] = nuovi; G.salva();
      msg = { colore: 'var(--verde)', testo: fatti.length ? 'Salvato · ' + fatti.join(' · ') : 'Salvato: nessun numero di partenza, si usa il più alto in archivio.' };
      G.aggiornaFinestra(o);
    };
  };

  // =====================================================================
  // REPORT
  // =====================================================================
  G.VISTE.report = {
    scorre: true,
    render() {
      const S = G.S, oggi = G.OGGI;
      const scOggi = S.scontrini.filter((s) => s.data.startsWith(oggi));
      const da30 = G.D.piuGiorni(oggi, -30), da7 = G.D.piuGiorni(oggi, -6);
      const venduto30 = somma(S.scontrini.filter((s) => s.data.slice(0, 10) >= da30), (s) => s.totale);
      const conMarg = S.articoli.filter((a) => a.costo > 0 && a.prezzoA > 0);
      const marg = conMarg.length ? somma(conMarg, (a) => { const n = a.prezzoA / (1 + a.iva / 100); return (n - a.costo) / n * 100; }) / conMarg.length : 0;
      const cat = S.categorie.map((c) => ({ c: c.codice, n: S.articoli.filter((a) => a.cat === c.id).length })).sort((a, b) => b.n - a.n).slice(0, 8);
      const giorni = {};
      S.scontrini.filter((s) => s.data.slice(0, 10) >= da7).forEach((s) => { const g = s.data.slice(0, 10); const x = giorni[g] || (giorni[g] = { g, n: 0, t: 0 }); x.n++; x.t += s.totale; });
      const kpi = (et, v, colore, ultima) => '<div class="card" style="margin-right:' + (ultima ? 0 : 14) + 'px"><div class="muto">' + et + '</div><div style="font-size:26px;font-weight:600;margin-top:4px;color:' + (colore || 'var(--testo)') + '">' + v + '</div></div>';
      const chip = (t, colore, sfondo, mr) => '<span style="background:' + sfondo + ';color:' + colore + ';border-radius:6px;padding:5px 10px;font-size:12.5px;margin-right:' + mr + 'px">' + t + '</span>';
      const d = new Date();
      return '<div style="padding:22px 26px"><div class="h1">Report</div><div class="muto" style="margin:3px 0 18px">Aggiornato al ' + dataIt(oggi) + ' ' + G.D.pad(d.getHours()) + ':' + G.D.pad(d.getMinutes()) + '</div>'
        + '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr))">' + kpi('Venduto oggi', num(somma(scOggi, (s) => s.totale)) + ' €') + kpi('Scontrini oggi', G.fmt(scOggi.length, 0)) + kpi('Venduto ultimi 30 gg', num(venduto30) + ' €') + kpi('Margine medio catalogo', G.fmt(marg, 1) + '%', 'var(--verde)', true) + '</div>'
        + '<div class="riga" style="margin-top:14px">' + chip(S.articoli.filter(G.sottocosto).length + ' articoli sottocosto', 'var(--rosso)', 'var(--rosso-tenue)', 10) + chip(S.articoli.filter(G.sottoScorta).length + ' sotto scorta', 'var(--ambra)', 'var(--ambra-tenue)', 10) + chip(S.patentini.filter(G.patScaduto).length + ' patentini scaduti', 'var(--rosso)', 'var(--rosso-tenue)', 0) + '</div>'
        + '<div class="avvolgi" style="margin-top:18px">'
        + '<div class="card col" style="width:430px;margin:0 16px 16px 0;padding:0"><div class="h2" style="margin:12px 14px 8px">Articoli per categoria (prime 8)</div>' + G.dg('rep-cat', { senzaBordo: true, stile: 'height:260px', righe: cat, chiave: (x) => x.c, colonne: [{ k: 'c', t: 'Categoria', w: '*' }, { k: 'n', t: 'Articoli', w: 120, n: true }] }) + '</div>'
        + '<div class="card col" style="width:430px;margin:0 16px 16px 0;padding:0"><div class="h2" style="margin:12px 14px 8px">Vendite ultimi 7 giorni</div>' + G.dg('rep-giorni', { senzaBordo: true, stile: 'height:260px', righe: Object.values(giorni).sort((a, b) => a.g.localeCompare(b.g)), chiave: (x) => x.g, colonne: [{ k: 'g', t: 'Giorno', w: '*', v: (x) => x.g.slice(8, 10) + '/' + x.g.slice(5, 7) }, { k: 'n', t: 'Scontrini', w: 90, n: true }, { k: 't', t: 'Totale', w: 110, n: true, v: (x) => num(x.t) }] }) + '</div>'
        + '</div></div>';
    },
  };

  // =====================================================================
  // PROVVIGIONI AGENTE
  // =====================================================================
  const pv = () => G.ui('provvigioni', () => ({ mese: Number(G.OGGI.slice(5, 7)), anno: Number(G.OGGI.slice(0, 4)), msg: null, sel: null }));
  const imponibileRiga = (r) => r2(G.totaleRiga(r) / (1 + r.iva / 100));
  function documentiMese(u) {
    const S = G.S, chiave = u.anno + '-' + G.D.pad(u.mese), out = [];
    S.fatture.filter((f) => f.data.startsWith(chiave)).forEach((f) => {
      const segno = f.tipo === 'NC' ? -1 : 1;
      out.push({ k: 'D' + f.id, origine: 'DOC', ref: f, tipo: f.tipo === 'NC' ? 'NOTA_CREDITO' : f.tipo === 'FAC' ? 'ACCOMPAGNATORIA' : 'FATTURA', data: f.data, numero: (f.tipo === 'NC' ? 'NC ' : f.tipo === 'FAC' ? 'FAC ' : 'FT ') + f.numero, cliente: (G.cli(f.clienteId) || {}).nome || '',
        imponibile: segno * somma(f.righe, imponibileRiga), provvigione: segno * somma(f.righe, (r) => imponibileRiga(r) * (r.provv || 0) / 100) });
    });
    S.scontrini.filter((s) => s.data.startsWith(chiave)).forEach((s) => out.push({ k: 'S' + s.id, origine: 'SCONTRINO', ref: s, tipo: 'SCONTRINO', data: s.data.slice(0, 10), numero: 'Sc. ' + s.numero, cliente: s.clienteId ? (G.cli(s.clienteId) || {}).nome : '',
      imponibile: somma(s.righe, imponibileRiga), provvigione: somma(s.righe, (r) => imponibileRiga(r) * (r.provv || 0) / 100) }));
    return out.sort((a, b) => a.data.localeCompare(b.data));
  }
  const TIPO_PV = { NOTA_CREDITO: 'Nota credito', ACCOMPAGNATORIA: 'Fatt. accomp.', SCONTRINO: 'Corrispettivo', FATTURA: 'Fattura' };
  G.VISTE.provvigioni = {
    nuova() { delete G.U.provvigioni; G.deseleziona('pv'); },
    render() {
      const u = pv();
      const docs = documentiMese(u);
      const fatt = somma(docs.filter((d) => d.tipo === 'FATTURA' || d.tipo === 'ACCOMPAGNATORIA'), (d) => d.provvigione);
      const corr = somma(docs.filter((d) => d.tipo === 'SCONTRINO'), (d) => d.provvigione);
      const storni = somma(docs.filter((d) => d.tipo === 'NOTA_CREDITO'), (d) => d.provvigione);
      const sel = docs.find((d) => d.k === u.sel) || null;
      const righe = sel ? sel.ref.righe.map((r, i) => ({ k: i, r, codice: r.codice, descr: r.descr, qta: r.qta, imp: imponibileRiga(r) * (sel.tipo === 'NOTA_CREDITO' ? -1 : 1), perc: r.provv })) : [];
      const card = (et, v, colore, sfondo, ultima, grassetto) => '<div class="card" style="padding:10px 14px;margin-right:' + (ultima ? 0 : 10) + 'px' + (sfondo ? ';background:' + sfondo : '') + '"><div class="muto">' + et + '</div><div style="font-size:19px;font-weight:' + (grassetto ? 700 : 600) + ';color:' + (colore || 'var(--testo)') + '">' + num(v) + ' €</div></div>';
      const anni = []; for (let a = Number(G.OGGI.slice(0, 4)) + 1; a >= 2024; a--) anni.push(a);
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga tesa" style="margin-bottom:10px"><div class="pila"><div class="h1">Provvigioni agente</div><span class="muto" style="margin:0 4px 0 18px">Mese</span><div style="width:110px">' + G.sel('data-ch="pv-mese"', G.MESI_LUNGHI.map((m, i) => [i + 1, m]), u.mese) + '</div>'
        + '<span class="muto" style="margin:0 4px 0 10px">Anno</span><div style="width:80px">' + G.sel('data-ch="pv-anno"', anni, u.anno) + '</div><span class="muto" style="margin-left:14px">' + esc(u.msg || docs.length + ' documenti nel mese') + '</span></div>'
        + '<div class="riga tesa fisso">' + btn('Stampa riepilogo (PDF)', 'pv-stampa', { primario: true, stile: 'margin-right:8px', title: 'Riepilogo mensile: documenti, prodotti con le percentuali, storni delle note di credito e totale maturato' }) + btn('Esporta Excel', 'pv-excel') + '</div></div>'
        + '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:10px">' + card('Provvigioni su fatture', fatt) + card('Provvigioni su corrispettivi', corr) + card('Storni note di credito', storni, '#C0392B') + card('TOTALE maturato nel mese', fatt + corr + storni, '#2E7D32', '#EAF3DE', true, true) + '</div>'
        + '<div class="col riempi">'
        + G.dg('pv', { classe: 'riempi', righe: docs, chiave: (d) => d.k, sel: u.sel, onSel: (d) => { u.sel = d.k; G.ridisegna(); }, colonne: [
          { k: 'data', t: 'Data', w: 92, v: (d) => dataIt(d.data), ordina: (d) => d.data }, { k: 'tipo', t: 'Tipo', w: 110, v: (d) => TIPO_PV[d.tipo] }, { k: 'numero', t: 'Numero', w: 90, mono: true },
          { k: 'cliente', t: 'Cliente', w: '*' }, { k: 'imp', t: 'Imponibile €', w: 110, n: true, v: (d) => num(d.imponibile), ordina: (d) => d.imponibile },
          { k: 'provv', t: 'Provvigione €', w: 120, n: true, semi: true, v: (d) => num(d.provvigione), ordina: (d) => d.provvigione, f: (d) => '<span style="' + (d.tipo === 'NOTA_CREDITO' ? 'color:#C0392B' : '') + '">' + num(d.provvigione) + '</span>' }] })
        + '<div style="height:10px;flex:none"></div>'
        + '<div class="card col" style="padding:0;max-height:290px;flex:none"><div class="riga" style="margin:8px 12px 6px"><div class="h2 spinta" style="font-size:14px">' + (sel ? 'Righe di ' + esc(sel.numero) + ' — ' + esc(sel.cliente) + (sel.tipo === 'NOTA_CREDITO' ? '   (nota di credito: le provvigioni maturano in NEGATIVO)' : '') : 'Righe del documento — seleziona un documento qui sopra e scrivi la % per ogni prodotto') + '</div>'
        + '<span class="muto" style="margin-right:4px">Applica a tutte le righe:  %</span><input class="tb" id="pv-tutte" style="width:60px;margin-right:6px" inputmode="decimal">' + btn('Applica', 'pv-applica', { stile: 'padding:4px 12px' }) + '</div>'
        + G.dg('pv-righe', { senzaBordo: true, classe: 'riempi', righe, chiave: (x) => x.k, colonne: [
          { k: 'codice', t: 'Codice', w: 100, mono: true }, { k: 'descr', t: 'Prodotto', w: '*' }, { k: 'qta', t: 'Q.tà', w: 64, n: true, v: (x) => qta(x.qta) },
          { k: 'imp', t: 'Imponibile €', w: 104, n: true, v: (x) => num(x.imp) },
          { k: 'perc', t: 'Provv. %', w: 80, n: true, v: (x) => (x.perc === undefined || x.perc === null ? '' : G.dec(x.perc)), input: { ch: 'pv-perc', cls: 'modifica' } },
          { k: 'provv', t: 'Provvigione €', w: 110, n: true, v: (x) => num(x.imp * (x.perc || 0) / 100) }] })
        + '</div></div></div>';
    },
  };
  G.CH['pv-mese'] = (el) => { const u = pv(); u.mese = Number(el.value); u.sel = null; u.msg = null; G.ridisegna(); };
  G.CH['pv-anno'] = (el) => { const u = pv(); u.anno = Number(el.value); u.sel = null; u.msg = null; G.ridisegna(); };
  G.CH['pv-perc'] = (el) => {
    const u = pv(); const d = documentiMese(u).find((x) => x.k === u.sel); if (!d) return;
    const r = d.ref.righe[Number(el.dataset.r)]; if (!r) return;
    r.provv = el.value.trim() === '' ? null : Math.max(0, Math.min(100, G.leggiNum(el.value)));
    G.salva(); G.ridisegna();
  };
  A['pv-applica'] = () => {
    const u = pv(); const d = documentiMese(u).find((x) => x.k === u.sel);
    if (!d) { u.msg = 'Seleziona prima un documento.'; G.ridisegna(); return; }
    const t = val('pv-tutte').trim(), p = t === '' ? null : G.leggiNum(t);
    if (p !== null && (p < 0 || p > 100)) { u.msg = 'La percentuale deve essere tra 0 e 100.'; G.ridisegna(); return; }
    d.ref.righe.forEach((r) => { r.provv = p; }); u.msg = null; G.salva(); G.ridisegna();
  };
  A['pv-stampa'] = () => {
    const u = pv(), docs = documentiMese(u).filter((d) => d.provvigione !== 0);
    const tot = somma(docs, (d) => d.provvigione);
    const corpo = docs.map((d) => '<tr><td>' + dataIt(d.data) + '</td><td>' + TIPO_PV[d.tipo] + '</td><td>' + esc(d.numero) + '</td><td>' + esc(d.cliente) + '</td><td class="n">' + num(d.imponibile) + '</td><td class="n">' + num(d.provvigione) + '</td></tr>').join('');
    G.finestra({ titolo: 'Provvigioni_' + u.anno + '_' + G.D.pad(u.mese) + '.pdf — Visualizzatore PDF', larghezza: 820, altezza: 700, bianca: true,
      corpo: '<div class="foglio-cornice"><div class="foglio"><div class="ditta">' + esc(G.S.negozio.ragione) + '</div><div class="tipo"><span>PROVVIGIONI AGENTE</span><span>' + G.MESI_LUNGHI[u.mese - 1] + ' ' + u.anno + '</span></div>'
        + '<table><thead><tr><th>Data</th><th>Tipo</th><th>Numero</th><th>Cliente</th><th class="n">Imponibile €</th><th class="n">Provvigione €</th></tr></thead><tbody>' + corpo + '</tbody></table>'
        + '<div class="tot" style="width:260px;margin:10px 0 0 auto"><div><span>TOTALE maturato</span><span>' + num(tot) + ' €</span></div></div></div></div>' });
    u.msg = 'Riepilogo PDF aperto.'; G.ridisegna();
  };
  A['pv-excel'] = () => {
    const u = pv();
    G.scaricaFile('Provvigioni_' + u.anno + '_' + G.D.pad(u.mese) + '.csv', G.csv(['Data', 'Tipo', 'Numero', 'Cliente', 'Imponibile €', 'Provvigione €'], documentiMese(u).map((d) => [dataIt(d.data), TIPO_PV[d.tipo], d.numero, d.cliente, num(d.imponibile), num(d.provvigione)])));
    u.msg = 'Excel esportato.'; G.ridisegna();
  };

  G.conti = { corrispettivi };
})();
