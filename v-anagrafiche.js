/* Articoli, Categorie, Clienti, Fornitori (con la Scheda contabile) e Carico merce.
   Ricopiate da ArticoliView, CategorieView, ClientiView, FornitoriView, SchedaSoggettoWindow e CaricoView. */
(function () {
  'use strict';
  const G = window.GF;
  const { esc, num, qta, dataIt, somma, r2 } = G;
  const A = G.AZ;
  const btn = (testo, az, o) => { o = o || {}; return '<button class="btn' + (o.primario ? ' primario' : '') + (o.cls ? ' ' + o.cls : '') + '" data-az="' + az + '"' + (o.dis ? ' disabled' : '') + (o.id ? ' id="' + o.id + '"' : '') + (o.stile ? ' style="' + o.stile + '"' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + (o.dati || '') + '>' + esc(testo) + '</button>'; };
  const msgSpan = (m, stile) => '<span style="font-size:12px;' + (stile || '') + ';color:' + (m ? m.colore : 'inherit') + '">' + (m ? esc(m.testo) : '') + '</span>';
  const campo = (et, html, w, tip, extra) => '<div class="campo" style="width:' + w + 'px;margin:0 14px 12px 0' + (extra || '') + '"><span class="muto"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + esc(et) + '</span><div style="margin-top:3px">' + html + '</div></div>';
  const tb = (id, val, attr) => '<input class="tb" id="' + id + '" value="' + esc(val === null || val === undefined ? '' : val) + '"' + (attr || '') + ' autocomplete="off" spellcheck="false">';
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  const n4 = (x) => (x === null || x === undefined || x === '' ? '' : String(Math.round(Number(x) * 10000) / 10000).replace('.', ','));
  const n2 = (x) => (x === null || x === undefined || x === '' ? '' : String(Math.round(Number(x) * 100) / 100).replace('.', ','));
  const n3 = (x) => String(Math.round(Number(x || 0) * 1000) / 1000).replace('.', ',');
  const nelCestino = (tipo, codice, descr, dati) => G.S.cestino.unshift({ id: G.nuovoId(), tipo, codice, descr, eliminatoIl: G.adessoIso(), dati });

  // controlli formali come Services/Anagrafica.cs
  function pivaValida(p) {
    p = String(p || '').trim().toUpperCase(); if (p.startsWith('IT')) p = p.slice(2);
    if (!/^\d{11}$/.test(p)) return false;
    let s = 0; for (let i = 0; i < 11; i++) { let c = Number(p[i]); if (i % 2 === 0) s += c; else { c *= 2; s += c > 9 ? c - 9 : c; } }
    return s % 10 === 0;
  }
  const DISP = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
  function cfValido(cf) {
    cf = String(cf || '').trim().toUpperCase();
    if (cf.length === 11) return pivaValida(cf);
    if (!/^[A-Z0-9]{16}$/.test(cf)) return false;
    let s = 0;
    for (let i = 0; i < 15; i++) {
      const c = cf[i], cifra = /\d/.test(c);
      s += i % 2 === 0 ? DISP[cifra ? Number(c) : c.charCodeAt(0) - 55] : (cifra ? Number(c) : c.charCodeAt(0) - 65);
    }
    return cf[15] === String.fromCharCode(65 + (s % 26));
  }
  const TIPI = [['SOCIETA', 'Società'], ['DITTA', 'Ditta individuale'], ['PROFESSIONISTA', 'Professionista'], ['PRIVATO', 'Privato / persona fisica'], ['ENTE', 'Ente / associazione'], ['PA', 'Pubblica amministrazione']];
  function verifica(tipo, piva, cf, pec, sdi) {
    const err = [], avv = [];
    piva = (piva || '').trim(); cf = (cf || '').trim();
    if (piva && !pivaValida(piva)) err.push('Partita IVA "' + piva + '" formalmente errata (controllo cifra di controllo).');
    if (cf && !cfValido(cf)) err.push('Codice fiscale "' + cf + '" formalmente errato.');
    const descr = (TIPI.find((t) => t[0] === tipo) || [0, tipo])[1];
    if (tipo === 'SOCIETA') {
      if (!piva) err.push('Una società deve avere la partita IVA.');
      if (cf && cf.length === 16) err.push('Una società ha il codice fiscale numerico (11 cifre), non quello di persona fisica.');
      if (!cf) avv.push('Codice fiscale mancante (per le società di norma coincide con la P.IVA).');
      else if (piva && cf !== piva) avv.push('CF e P.IVA diversi: per le società di solito coincidono (verificare).');
    } else if (tipo === 'DITTA' || tipo === 'PROFESSIONISTA') {
      if (!piva) err.push(descr + ': la partita IVA è obbligatoria.');
      if (!cf) avv.push('Manca il codice fiscale della persona (di norma diverso dalla P.IVA).');
      else if (cf.length !== 16) avv.push('Per ditte individuali/professionisti il CF atteso è quello di persona fisica (16 caratteri).');
    } else if (tipo === 'PRIVATO') {
      if (!cf) err.push('Per un privato il codice fiscale è obbligatorio.');
      if (piva) avv.push('Un privato di norma non ha partita IVA: verificare il tipo soggetto.');
    } else if (tipo === 'ENTE') {
      if (!cf && !piva) err.push('Un ente/associazione deve avere almeno il codice fiscale (ed eventuale P.IVA).');
    } else if (tipo === 'PA') {
      if (!cf) avv.push('PA senza codice fiscale: verificare.');
      if (!sdi || sdi.trim().length !== 6) err.push('Per la PA serve il codice destinatario (codice ufficio IPA di 6 caratteri).');
    }
    if (tipo !== 'PA' && sdi && ![6, 7].includes(sdi.trim().length)) avv.push('Codice destinatario SDI di lunghezza inattesa (7 caratteri per aziende, 6 per PA).');
    if (pec && !pec.includes('@')) err.push('PEC non valida (manca la @).');
    return { err, avv };
  }

  // =====================================================================
  // ARTICOLI
  // =====================================================================
  const ar = () => G.ui('articoli', () => ({ cercaPer: 'Tutto', cerca: '', cat: 0, crit: false, scorta: false, enol: false, calcPrezzo: '', calcTarget: '35', salvaMsg: null, form: null, formMsg: null }));
  const catLookup = () => G.S.categorie.slice().sort((a, b) => a.codice.localeCompare(b.codice)).map((c) => ({ id: c.id, testo: c.codice + (c.descr ? ' — ' + c.descr : '') }));
  const fornLookup = () => G.S.fornitori.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((f) => ({ id: f.id, testo: f.codice + ' — ' + f.nome }));
  const aliquote = () => G.S.aliquote.slice().sort((a, b) => b.aliquota - a.aliquota).map((x) => [x.aliquota, x.codice + ' (' + x.aliquota.toFixed(2) + '%)']);
  function filtroArticolo(a, u) {
    if (u.cat && a.cat !== u.cat) return false;
    if (u.crit && !(a.costo > 0 && G.margine(a).perc < 10)) return false;
    if (u.scorta && !G.sottoScorta(a)) return false;
    if (u.enol && !(G.cat(a.cat).codice === 'ENOL' && !a.scadenza)) return false;
    const q = u.cerca.trim();
    if (!q) return true;
    const c = (s) => G.normalizza(s).includes(G.normalizza(q));
    const f = G.forn(a.forn) || { nome: '' };
    switch (u.cercaPer) {
      case 'Descrizione': return c(a.descr);
      case 'Codice': return c(a.codice);
      case 'Barcode': return c(a.barcode);
      case 'Fornitore': return c(a.codForn) || c(f.nome);
      case 'Prezzo': { const nq = q.replace(',', '.'); return String(Math.round(a.prezzoA * 100) / 100).includes(nq) || String(Math.round(a.costo * 100) / 100).includes(nq); }
      default: return c(a.descr) || c(a.codice) || c(G.cat(a.cat).codice) || c(a.barcode) || c(a.codForn) || c(f.nome) || c(a.info);
    }
  }
  function riepilogoArticoli() {
    const S = G.S;
    const calc = S.articoli.filter((a) => a.costo > 0 && a.prezzoA > 0);
    const ric = calc.length ? Math.round(somma(calc, G.ricaricoMostrato) / calc.length * 10) / 10 : 0;
    const sotto = S.articoli.filter((a) => a.costo > 0 && G.margine(a).perc < 0).length;
    const scorta = S.articoli.filter(G.sottoScorta).length;
    const enol = S.articoli.filter((a) => G.cat(a.cat).codice === 'ENOL' && !a.scadenza).length;
    return S.articoli.length + ' articoli · ricarico A medio ' + G.fmt(ric, 1) + '% · ' + sotto + ' sottocosto · ' + scorta + ' sotto-scorta' + (enol ? ' · ⚠ ' + enol + ' enologici senza scadenza' : '');
  }
  function calcola(u, a) {
    if (!a) return null;
    const prezzo = G.leggiNum(u.calcPrezzo);
    const netto = a.iva > 0 ? prezzo / (1 + a.iva / 100) : prezzo;
    const me = netto - a.costo, mp = netto > 0 ? me / netto * 100 : 0, ric = a.costo > 0 ? me / a.costo * 100 : 0;
    const t = G.leggiNum(u.calcTarget);
    const sugg = t >= 0 && t < 99 && a.costo > 0 ? Math.round(a.costo / (1 - t / 100) * (1 + a.iva / 100) * 100) / 100 : 0;
    const col = mp < 0 ? 'var(--rosso)' : mp < 10 ? 'var(--ambra)' : mp < 25 ? 'var(--testo-2)' : 'var(--verde)';
    return { me, mp, ric, sugg, col };
  }
  function htmlCalcolo(u, a) {
    const c = calcola(u, a);
    const out = (et, v, colore, ml) => '<div style="margin-left:' + ml + 'px"><div class="muto">' + et + '</div><div style="font-size:16px;font-weight:600;color:' + (colore || 'var(--testo)') + '" >' + v + '</div></div>';
    return out('Margine €', c ? num(c.me) + ' €' : '—', c && c.col, 22) + out('Margine %', c ? G.fmt(c.mp, 1) + '%' : '—', c && c.col, 18) + out('Ricarico %', c ? G.fmt(c.ric, 1) + '%' : '—', null, 18) + out('Prezzo obiettivo', c && c.sugg ? num(c.sugg) + ' €' : '—', 'var(--verde)', 18);
  }
  G.VISTE.articoli = {
    nuova() { const u = ar(); u.form = null; u.salvaMsg = null; G.deseleziona('art'); },
    render() {
      const S = G.S, u = ar();
      const sel = G.selezionato('art');
      const head = '<div class="riga tesa" style="margin-bottom:12px">'
        + '<div class="pila"><div class="h1">Articoli</div><span class="muto" style="margin:0 6px 0 18px">Cerca per</span><div style="width:118px">' + G.sel('data-ch="art-cercaper"', ['Tutto', 'Descrizione', 'Codice', 'Barcode', 'Fornitore', 'Prezzo'], u.cercaPer) + '</div>'
        + '<input class="tb" style="width:240px;margin-left:8px" data-in="art-cerca" value="' + esc(u.cerca) + '" title="Scrivi qui; col selettore scegli se cercare in tutto, descrizione, codice, barcode, fornitore o prezzo" autocomplete="off" spellcheck="false">'
        + '<span class="muto" style="margin:0 6px 0 14px">Categoria</span><div style="width:160px">' + G.sel('data-ch="art-cat"', [[0, 'Tutte le categorie']].concat(catLookup().map((c) => [c.id, c.testo])), u.cat) + '</div></div>'
        + '<div class="riga tesa fisso">' + btn('Elimina', 'art-elimina', { dis: !sel, stile: 'margin-right:8px' }) + btn('Modifica', 'art-modifica', { dis: !sel, stile: 'margin-right:8px' }) + btn('+ Nuovo articolo', 'art-nuovo', { primario: true }) + '</div></div>';
      const filtri = '<div class="riga" style="margin:-4px 0 10px">' + G.chk('data-ch="art-crit"', 'solo margine critico', u.crit) + '<span style="margin-left:14px">' + G.chk('data-ch="art-scorta"', 'solo sotto-scorta', u.scorta) + '</span><span style="margin-left:14px">' + G.chk('data-ch="art-enol"', 'enologici senza scadenza', u.enol) + '</span><span class="muto" style="margin-left:18px;white-space:nowrap">' + esc(riepilogoArticoli()) + '</span></div>';
      if (u.form) return '<div class="col" style="padding:16px 20px;height:100%">' + head + filtri + '<div class="card riempi scorri" id="art-form" style="overflow:auto">' + this.form(u) + '</div></div>';
      const righe = S.articoli.filter((a) => filtroArticolo(a, u)).sort((a, b) => a.descr.localeCompare(b.descr));
      const statoCol = { sottocosto: '#C0392B', basso: '#B07400', sano: '#2E7D32', medio: 'var(--testo)' };
      return '<div class="col" style="padding:16px 20px;height:100%">' + head + filtri
        + G.dg('art', {
          classe: 'riempi', righe, chiave: (a) => a.id,
          onSel: (a) => { u.salvaMsg = null; u.calcPrezzo = n4(a.prezzoA); G.ridisegna(); },
          onDoppio: (a) => { G.scegliRiga('art', a.id); u.form = { id: a.id }; u.formMsg = null; G.ridisegna(); },
          colonne: [
            { k: 'codice', t: 'Codice', w: 96, mono: true }, { k: 'barcode', t: 'Barcode', w: 112, mono: true },
            { k: 'descr', t: 'Descrizione', w: '*' }, { k: 'giac', t: 'Giac.', w: 60, n: true, v: (a) => qta(a.giac), ordina: (a) => a.giac },
            { k: 'forn', t: 'Fornitore', w: 170, cls: 'puntini', v: (a) => (G.forn(a.forn) || {}).nome || '', tip: (a) => (G.forn(a.forn) || {}).nome || '' },
            { k: 'costo', t: 'Costo', w: 74, n: true, v: (a) => num(a.costo), ordina: (a) => a.costo },
            { k: 'prezzo', t: 'Prezzo', w: 74, n: true, v: (a) => num(a.prezzoA), ordina: (a) => a.prezzoA },
            { k: 'ric', t: 'Ric. A %', w: 84, n: true, semi: true, v: (a) => G.fmt(G.ricaricoMostrato(a), 1) + (G.ricaricoDiverso(a) ? ' *' : ''), ordina: (a) => G.ricaricoMostrato(a),
              f: (a) => '<span style="color:' + statoCol[G.statoArticolo(a)] + '">' + G.fmt(G.ricaricoMostrato(a), 1) + (G.ricaricoDiverso(a) ? ' *' : '') + '</span>',
              tip: (a) => (G.ricaricoDiverso(a) ? 'Nella scheda il ricarico A è ' + G.fmt(a.ricA, 1) + '%, ma col prezzo di adesso (' + num(a.prezzoA) + ' €) il ricarico vero è ' + G.fmt(G.margine(a).ric, 1) + '%.' : '') },
            { k: 'scad', t: 'Scadenza', w: 86, v: (a) => dataIt(a.scadenza), ordina: (a) => a.scadenza || '9999-99-99', senzaVuotiOrdinando: true },
          ],
        })
        + '<div class="card" style="margin-top:12px;padding:10px 14px"><div class="riga" style="margin-bottom:8px"><span class="muto">Calcolatore margine — modifica il prezzo e salva</span>' + msgSpan(u.salvaMsg, 'margin-left:14px') + '</div>'
        + '<div class="avvolgi basso"><div style="width:300px;font-size:14px;font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (sel ? esc(sel.codice + ' · ' + sel.descr) : 'Seleziona un articolo') + '</div>'
        + '<div style="margin-left:16px"><div class="muto">Prezzo (IVA incl.)</div><input class="tb" style="width:90px" id="calc-prezzo" data-in="art-calc" value="' + esc(u.calcPrezzo) + '" inputmode="decimal"></div>'
        + '<div style="margin-left:16px"><div class="muto">Obiettivo %</div><input class="tb" style="width:64px" id="calc-target" data-in="art-calc" value="' + esc(u.calcTarget) + '" inputmode="decimal"></div>'
        + '<div class="riga basso" id="calc-out">' + htmlCalcolo(u, sel) + '</div>'
        + btn('Salva prezzo', 'art-salvaprezzo', { stile: 'margin-left:22px' }) + btn('Usa obiettivo', 'art-usaobiettivo', { stile: 'margin-left:8px' }) + '</div></div></div>';
    },
    form(u) {
      const a = u.form.id ? G.art(u.form.id) : null;
      const S = G.S;
      const f = (k, def) => (a ? a[k] : def);
      const listino = (et, idP, vP, idR, vR, mr) => '<div style="width:105px;margin-right:10px"><div class="muto">' + et + '</div>' + tb(idP, vP, ' style="margin-top:3px" data-ch="art-prz" data-l="' + idP.slice(-1) + '" inputmode="decimal"') + '</div>'
        + '<div style="width:80px;margin-right:' + mr + 'px"><div class="muto">' + 'Ric. ' + idP.slice(-1) + ' %' + '</div>' + tb(idR, vR, ' style="margin-top:3px" data-ch="art-ric" data-l="' + idP.slice(-1) + '" inputmode="decimal"') + '</div>';
      return '<div class="h2" style="font-size:17px;margin-bottom:14px">' + (a ? 'Modifica articolo' : 'Nuovo articolo') + '</div><div class="avvolgi">'
        + campo('Codice articolo *', tb('f-codice', f('codice', '')), 210)
        + campo('Descrizione *', tb('f-descr', f('descr', '')), 448)
        + campo('Categoria', G.cmb('f-cat', { voci: catLookup(), valore: a ? a.cat : null, title: 'Scrivi una parte qualsiasi del nome (anche in mezzo): la lista si restringe da sola' }), 210)
        + campo('Unità misura *', tb('f-um', a ? a.um : 'PZ', ' style="text-transform:uppercase" title="Scrivila come vuoi: PZ, KG, MT, MAZZO, BARATTOLO... viene salvata così com\'è"'), 120)
        + campo('IVA *', G.sel('id="f-iva" data-ch="art-iva"', aliquote(), a ? a.iva : 22), 150)
        + campo('Prezzo acquisto', tb('f-costo', a ? n4(a.costo) : '0', ' data-ch="art-ric" data-l="COSTO" inputmode="decimal"'), 140)
        + campo('Data ultimo acquisto', G.dp('f-dataacq', a ? a.dataAcq : ''), 150)
        + '<div style="width:760px;margin:0 14px 12px 0;background:#F4F6F8;border-radius:8px;padding:8px 10px"><div class="muto" style="margin-bottom:6px">Listini di vendita (IVA inclusa) e ricarichi % sul costo — come nel vecchio gestionale</div><div class="avvolgi">'
        + listino('Prezzo A *', 'f-pA', a ? n4(a.prezzoA) : '0', 'f-rA', a ? n2(a.ricA) : '', 22) + listino('Prezzo B', 'f-pB', a ? n4(a.prezzoB) : '', 'f-rB', a ? n2(a.ricB) : '', 22) + listino('Prezzo C', 'f-pC', a ? n4(a.prezzoC) : '', 'f-rC', a ? n2(a.ricC) : '', 0) + '</div></div>'
        + campo('Giacenza', tb('f-giac', a ? n3(a.giac) : '0', ' inputmode="decimal"'), 120)
        + campo('Scorta minima', tb('f-scorta', a ? n3(a.scortaMin) : '0', ' inputmode="decimal"'), 120)
        + campo('Fornitore', G.cmb('f-forn', { voci: fornLookup(), valore: a ? a.forn : null, title: 'Scrivi una parte qualsiasi del nome (anche in mezzo): la lista si restringe da sola' }), 300)
        + campo('Codice fornitore', tb('f-codforn', f('codForn', '')), 160)
        + campo('Codice a barre', tb('f-barcode', f('barcode', '')), 180)
        + campo('Lotto', tb('f-lotto', f('lotto', '')), 140)
        + campo('Scadenza (enologici)', G.dp('f-scad', a ? a.scadenza : ''), 150)
        + '<div class="campo" style="width:250px;margin:0 14px 12px 0;align-self:flex-end"><label class="chk" style="margin-top:10px"><input type="checkbox" id="f-fito"' + (a && a.fito ? ' checked' : '') + '>Prodotto fitosanitario (agrofarmaco)</label></div>'
        + campo('Info (per i fitosanitari: designazione ADR stampata sul DDT, es. UN 3077 MATERIA PERICOLOSA AMBIENTE…)', '<textarea class="tb" id="f-info" style="min-height:44px;max-height:80px" title="Campo «Info» del vecchio programma: viene stampato sotto il prodotto nei DDT fitosanitari">' + esc(f('info', '')) + '</textarea>', 640)
        + '</div><div class="riga" style="margin-top:8px">' + btn('Salva', 'art-salva', { primario: true, stile: 'padding:7px 22px' }) + btn('Annulla', 'art-annulla', { stile: 'padding:7px 18px;margin-left:10px' }) + msgSpan(u.formMsg, 'margin-left:16px') + '</div>';
    },
  };
  G.CH['art-cercaper'] = (el) => { ar().cercaPer = el.value; G.ridisegna(); };
  G.IN['art-cerca'] = (el) => {
    const u = ar(); u.cerca = el.value;
    const t = G.TAB.art; if (!t) return;
    t.cfg.righe = G.S.articoli.filter((a) => filtroArticolo(a, u)).sort((a, b) => a.descr.localeCompare(b.descr));
    G.aggiornaDg('art');
  };
  G.CH['art-cat'] = (el) => { ar().cat = Number(el.value); G.ridisegna(); };
  G.CH['art-crit'] = (el) => { ar().crit = el.checked; G.ridisegna(); };
  G.CH['art-scorta'] = (el) => { ar().scorta = el.checked; G.ridisegna(); };
  G.CH['art-enol'] = (el) => { ar().enol = el.checked; G.ridisegna(); };
  G.IN['art-calc'] = (el) => {
    const u = ar();
    if (el.id === 'calc-prezzo') u.calcPrezzo = el.value; else u.calcTarget = el.value;
    const box = document.getElementById('calc-out'); if (box) box.innerHTML = htmlCalcolo(u, G.selezionato('art'));
  };
  A['art-usaobiettivo'] = () => { const u = ar(); const a = G.selezionato('art'); const c = calcola(u, a); if (c && c.sugg > 0) { u.calcPrezzo = n4(c.sugg); G.ridisegna(); } };
  A['art-salvaprezzo'] = () => {
    const u = ar(); const a = G.selezionato('art'); if (!a) return;
    const nuovo = G.leggiNum(u.calcPrezzo);
    if (nuovo <= 0) { u.salvaMsg = { colore: 'var(--rosso)', testo: 'Prezzo non valido' }; G.ridisegna(); return; }
    a.prezzoA = nuovo;
    // il ricarico A della scheda segue il prezzo: se no colonna e scheda non tornerebbero
    if (a.costo > 0) a.ricA = Math.round(G.margine(a).ric * 100) / 100;
    G.log('Prezzo', 'Modificato prezzo articolo id ' + a.id + ' → € ' + G.z2(nuovo), 'art:' + a.id);
    G.salva();
    u.salvaMsg = { colore: 'var(--verde)', testo: 'Prezzo salvato · margine ' + G.fmt(G.margine(a).perc, 1) + '% · ricarico A ' + G.fmt(G.ricaricoMostrato(a), 1) + '%' };
    G.ridisegna();
  };
  A['art-nuovo'] = () => { const u = ar(); u.form = { id: null }; u.formMsg = null; G.ridisegna(); };
  A['art-modifica'] = () => { const u = ar(); const a = G.selezionato('art'); if (a) { u.form = { id: a.id }; u.formMsg = null; G.ridisegna(); } };
  A['art-annulla'] = () => { ar().form = null; G.ridisegna(); };
  A['art-elimina'] = () => {
    const a = G.selezionato('art'); if (!a) return;
    G.msgbox({ titolo: 'Conferma eliminazione', testo: 'Eliminare l\'articolo «' + a.codice + ' — ' + a.descr + '»?\nVerrà rimosso dal catalogo.', icona: 'avviso', pulsanti: [{ t: 'Sì', az: () => {
      G.S.articoli = G.S.articoli.filter((x) => x !== a);
      nelCestino('Articolo', a.codice, a.descr, { tabella: 'articoli', oggetto: a });
      G.log('Articolo', 'Eliminato (disattivato) articolo id ' + a.id, 'art:' + a.id);
      G.indicizza(); G.deseleziona('art'); G.salva(); G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };
  const aliquotaForm = () => Number(val('f-iva')) || 22;
  // prezzo lordo = costo × (1+ric%) × (1+IVA%), e viceversa (come il vecchio gestionale)
  G.CH['art-ric'] = (el) => {
    const costo = G.leggiNum(val('f-costo')); if (costo <= 0) return;
    const iva = aliquotaForm();
    const tags = el.dataset.l === 'COSTO' ? ['A', 'B', 'C'] : [el.dataset.l];
    tags.forEach((t) => { const ric = G.leggiNumN(val('f-r' + t)); if (ric !== null) document.getElementById('f-p' + t).value = n2(Math.round(costo * (1 + ric / 100) * (1 + iva / 100) * 100) / 100); });
  };
  G.CH['art-prz'] = (el) => {
    const costo = G.leggiNum(val('f-costo')); if (costo <= 0) return;
    const p = G.leggiNumN(val('f-p' + el.dataset.l)); if (p === null || p <= 0) return;
    document.getElementById('f-r' + el.dataset.l).value = n2(Math.round((p / (1 + aliquotaForm() / 100) / costo - 1) * 10000) / 100);
  };
  G.CH['art-iva'] = () => {};
  A['art-salva'] = () => {
    const u = ar(), S = G.S;
    const codice = val('f-codice').trim(), descr = val('f-descr').trim();
    const errore = (t) => { u.formMsg = { colore: 'var(--rosso)', testo: t }; G.ridisegna(); };
    if (!codice || !descr) return errore('Codice e descrizione sono obbligatori.');
    const barcode = val('f-barcode').trim();
    if (S.articoli.some((x) => x.id !== u.form.id && (x.codice.toUpperCase() === codice.toUpperCase() || (barcode && x.barcode === barcode)))) return errore('Codice articolo o codice a barre già esistente.');
    const a = u.form.id ? G.art(u.form.id) : { id: G.nuovoId(), giac: 0, nReg: '' };
    Object.assign(a, {
      codice, descr, cat: G.valoreCombo('f-cat') || null, um: (val('f-um').trim() || 'PZ').toUpperCase(), iva: aliquotaForm(),
      costo: G.leggiNum(val('f-costo')), prezzoA: G.leggiNum(val('f-pA')), prezzoB: G.leggiNumN(val('f-pB')), prezzoC: G.leggiNumN(val('f-pC')),
      ricA: G.leggiNumN(val('f-rA')), ricB: G.leggiNumN(val('f-rB')), ricC: G.leggiNumN(val('f-rC')),
      giac: G.leggiNum(val('f-giac')), scortaMin: G.leggiNum(val('f-scorta')), forn: G.valoreCombo('f-forn') || null, codForn: val('f-codforn').trim(),
      barcode, lotto: val('f-lotto').trim(), info: val('f-info').trim(), scadenza: G.valoreDp('f-scad'), dataAcq: G.valoreDp('f-dataacq'),
      fito: document.getElementById('f-fito').checked,
    });
    if (!a.cat) a.cat = S.categorie[0].id;
    if (!u.form.id) S.articoli.push(a);
    G.log('Articolo', (u.form.id ? 'Modificato articolo ' : 'Creato articolo ') + a.codice + ' – ' + a.descr, 'art:' + a.id);
    G.indicizza(); G.salva();
    u.form = null; G.scegliRiga('art', a.id); u.calcPrezzo = n4(a.prezzoA);
    G.ridisegna();
  };

  // =====================================================================
  // CATEGORIE
  // =====================================================================
  const ca = () => G.ui('categorie', () => ({ form: null, formMsg: null }));
  G.VISTE.categorie = {
    nuova() { ca().form = null; G.deseleziona('cat'); },
    render() {
      const S = G.S, u = ca();
      const sel = G.selezionato('cat');
      const righe = S.categorie.map((c) => ({ id: c.id, codice: c.codice, descr: c.descr, n: S.articoli.filter((a) => a.cat === c.id).length })).sort((a, b) => a.codice.localeCompare(b.codice));
      const f = u.form;
      const form = f ? '<div class="card" style="position:absolute;left:0;right:0;top:0;z-index:5"><div class="h2" style="font-size:17px;margin-bottom:14px">' + (f.id ? 'Modifica categoria' : 'Nuova categoria') + '</div><div class="avvolgi">'
        + campo('Codice', tb('fc-codice', f.id ? G.cat(f.id).codice : ''), 200) + campo('Descrizione *', tb('fc-descr', f.id ? G.cat(f.id).descr : ''), 380) + '</div>'
        + '<div class="riga" style="margin-top:8px">' + btn('Salva', 'cat-salva', { primario: true, stile: 'padding:7px 22px' }) + btn('Annulla', 'cat-annulla', { stile: 'padding:7px 18px;margin-left:10px' }) + msgSpan(u.formMsg, 'margin-left:16px') + '</div></div>' : '';
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga tesa" style="margin-bottom:12px"><div class="pila"><div class="h1">Categorie</div><span class="muto" style="margin-left:16px">' + righe.length + ' categorie</span></div>'
        + '<div class="riga tesa fisso">' + btn('Elimina', 'cat-elimina', { dis: !sel, stile: 'margin-right:8px' }) + btn('Modifica', 'cat-modifica', { dis: !sel, stile: 'margin-right:8px' }) + btn('+ Nuova categoria', 'cat-nuova', { primario: true }) + '</div></div>'
        + '<div class="col riempi" style="position:relative">' + G.dg('cat', {
          classe: 'riempi', righe, chiave: (c) => c.id, onSel: () => G.ridisegna(), onDoppio: (c) => { G.scegliRiga('cat', c.id); u.form = { id: c.id }; u.formMsg = null; G.ridisegna(); },
          colonne: [{ k: 'codice', t: 'Codice', w: 180, mono: true }, { k: 'descr', t: 'Descrizione', w: '*' }, { k: 'n', t: 'N. articoli', w: 120, n: true }],
        }) + form + '</div></div>';
    },
  };
  A['cat-nuova'] = () => { const u = ca(); u.form = { id: null }; u.formMsg = null; G.ridisegna(); };
  A['cat-modifica'] = () => { const u = ca(); const c = G.selezionato('cat'); if (c) { u.form = { id: c.id }; u.formMsg = null; G.ridisegna(); } };
  A['cat-annulla'] = () => { ca().form = null; G.ridisegna(); };
  A['cat-salva'] = () => {
    const u = ca(), S = G.S;
    const codice = val('fc-codice').trim(), descr = val('fc-descr').trim();
    if (!descr) { u.formMsg = { colore: 'var(--rosso)', testo: 'La descrizione è obbligatoria.' }; G.ridisegna(); return; }
    if (codice && S.categorie.some((c) => c.id !== u.form.id && c.codice.toUpperCase() === codice.toUpperCase())) { u.formMsg = { colore: 'var(--rosso)', testo: 'Esiste già una categoria con questo codice.' }; G.ridisegna(); return; }
    const c = u.form.id ? G.cat(u.form.id) : { id: G.nuovoId(), iva: 22, ricMin: 30, ricMax: 60 };
    c.codice = (codice || descr.slice(0, 4)).toUpperCase(); c.descr = descr;
    if (!u.form.id) S.categorie.push(c);
    G.log('Categoria', (u.form.id ? 'Modificata categoria ' : 'Creata categoria ') + c.descr, 'cat:' + c.id);
    G.indicizza(); G.salva(); u.form = null; G.scegliRiga('cat', c.id); G.ridisegna();
  };
  A['cat-elimina'] = () => {
    const sel = G.selezionato('cat'); if (!sel) return;
    const avviso = sel.n > 0 ? '\n\nI ' + sel.n + ' articoli collegati resteranno SENZA categoria.' : '';
    G.msgbox({ titolo: 'Conferma eliminazione', testo: 'Sei sicuro di voler eliminare la categoria «' + sel.descr + '»?' + avviso, icona: 'avviso', pulsanti: [{ t: 'Sì', az: () => {
      const c = G.cat(sel.id);
      G.S.categorie = G.S.categorie.filter((x) => x !== c);
      G.S.articoli.forEach((a) => { if (a.cat === c.id) a.cat = null; });
      G.log('Categoria', 'Eliminata categoria ' + c.descr, 'cat:' + c.id);
      G.indicizza(); G.deseleziona('cat'); G.salva(); G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };

  // =====================================================================
  // SCHEDA CONTABILE (partitario Dare / Avere)
  // =====================================================================
  function partitario(isCliente, id, dal, al) {
    const S = G.S, mov = [];
    if (isCliente) {
      S.fatture.filter((f) => f.clienteId === id && f.data <= al && !f.annullata).forEach((f) => {
        const nc = f.tipo === 'NC';
        mov.push({ data: f.data, causale: nc ? 'NOTA DI CREDITO' : 'FATTURA DI VENDITA', documento: 'FAT ' + f.numero, dare: nc ? 0 : f.totale, avere: nc ? f.totale : 0 });
      });
      S.scadenze.filter((s) => s.tipo === 'ATTIVA' && !s.fatturaId && s.soggettoId === id && s.dataDoc <= al).forEach((s) => mov.push({ data: s.dataDoc, causale: 'FATTURA DI VENDITA', documento: s.documento, dare: s.importo, avere: 0 }));
    } else {
      S.acquisti.filter((d) => d.fornitoreId === id && d.data <= al && (d.tipo === 'FATTURA_ACQUISTO' || d.tipo === 'NOTA_CREDITO')).forEach((d) => {
        const nc = d.tipo === 'NOTA_CREDITO';
        mov.push({ data: d.data, causale: nc ? 'NOTA DI CREDITO FORNITORE' : 'FATTURA DI ACQUISTO', documento: d.numero, dare: nc ? d.totale : 0, avere: nc ? 0 : d.totale });
      });
    }
    S.scadenze.filter((s) => s.tipo === (isCliente ? 'ATTIVA' : 'PASSIVA') && s.soggettoId === id).forEach((s) => (s.incassi || []).filter((i) => i.data <= al).forEach((i) => {
      const caus = i.tipo === 'ACCONTO' ? 'ACCONTO' : (isCliente ? 'INCASSO' : 'PAGAMENTO') + (s.documento ? ' FT ' + s.documento : '');
      mov.push({ data: i.data, causale: caus, documento: '', dare: isCliente ? 0 : i.importo, avere: isCliente ? i.importo : 0 });
    }));
    mov.sort((a, b) => (a.data !== b.data ? a.data.localeCompare(b.data) : a.causale.localeCompare(b.causale)));
    const segno = (m) => m.dare - m.avere;
    const prec = r2(somma(mov.filter((m) => m.data < dal), segno));
    const out = [];
    let saldo = prec;
    if (prec !== 0) out.push({ data: dal, causale: 'Saldo eserc. prec.', documento: '', dare: prec > 0 ? prec : 0, avere: prec < 0 ? -prec : 0, saldo: prec });
    mov.filter((m) => m.data >= dal).forEach((m) => { saldo = r2(saldo + segno(m)); m.saldo = saldo; out.push(m); });
    out.forEach((m, i) => { m.k = i; });
    return out;
  }
  function finestraScheda(isCliente, sog) {
    const dett = 'Codice ' + sog.codice + (sog.piva ? ' · P.IVA ' + sog.piva : '') + (isCliente && sog.cf ? ' · CF ' + sog.cf : '') + (' · ' + (sog.indirizzo || '') + ' ' + (sog.cap || '') + ' ' + (sog.citta || '')).trimEnd();
    const st = { dal: G.OGGI.slice(0, 4) + '-01-01', al: G.OGGI };
    const o = G.finestra({
      titolo: (isCliente ? 'Scheda cliente — ' : 'Scheda fornitore — ') + sog.nome, larghezza: 980, altezza: 640,
      corpo: () => {
        const p = partitario(isCliente, sog.id, st.dal, st.al);
        const mov = p.filter((m) => m.causale !== 'Saldo eserc. prec.');
        const fatture = isCliente ? somma(mov.filter((x) => x.causale.startsWith('FATTURA')), (x) => x.dare) : somma(mov.filter((x) => x.causale.startsWith('FATTURA')), (x) => x.avere);
        const pagati = isCliente ? somma(mov.filter((x) => !x.causale.startsWith('FATTURA')), (x) => x.avere) : somma(mov.filter((x) => !x.causale.startsWith('FATTURA')), (x) => x.dare);
        const acconti = somma(G.S.scadenze.filter((s) => s.soggettoId === sog.id && s.tipo === (isCliente ? 'ATTIVA' : 'PASSIVA')).flatMap((s) => s.incassi || []).filter((i) => i.tipo === 'ACCONTO' && i.libero), (i) => i.importo);
        const saldo = p.length ? p[p.length - 1].saldo : 0;
        const kpi = (et, v, colore, ultima) => '<div class="card" style="padding:8px 12px;margin-right:' + (ultima ? 0 : 8) + 'px"><div class="muto">' + et + '</div><div style="font-size:17px;font-weight:600;color:' + (colore || 'var(--testo)') + '">' + v + '</div></div>';
        return '<div class="col" style="padding:14px 18px;height:100%">'
          + '<div class="riga" style="margin-bottom:10px"><div class="spinta" style="overflow:hidden"><div class="h1" style="font-size:19px">' + esc(sog.nome) + '</div><div class="muto" style="white-space:nowrap">' + esc(dett) + '</div></div>'
          + '<span class="muto">Dal</span><span style="margin:0 8px 0 6px">' + G.dp('sc-dal', st.dal, { onCambia: (v) => { st.dal = v || st.dal; G.aggiornaFinestra(o); } }) + '</span>'
          + '<span class="muto">al</span><span style="margin:0 12px 0 6px">' + G.dp('sc-al', st.al, { onCambia: (v) => { st.al = v || st.al; G.aggiornaFinestra(o); } }) + '</span>'
          + btn('Esporta Excel', 'sc-excel', { stile: 'margin-right:8px' }) + btn('Stampa scheda (PDF)', 'sc-pdf', { primario: true }) + '</div>'
          + '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:10px">' + kpi(isCliente ? 'Fatture emesse' : 'Fatture ricevute', num(fatture) + ' €') + kpi(isCliente ? 'Incassi ricevuti' : 'Pagamenti effettuati', num(pagati) + ' €', '#2E7D32')
          + kpi('Acconti da collegare', num(acconti) + ' €', '#B07400') + kpi(isCliente ? 'Saldo da incassare' : 'Saldo da pagare', num(Math.abs(saldo)) + (saldo >= 0 ? ' € D' : ' € A'), 'var(--rosso)', true) + '</div>'
          + '<div class="muto" style="margin-bottom:6px">Partitario Dare / Avere (fatture, incassi/pagamenti, acconti, note di credito)</div>'
          + G.dg('scheda', { classe: 'riempi', righe: p, chiave: (m) => m.k, colonne: [
            { k: 'data', t: 'Data', w: 92, v: (m) => dataIt(m.data) }, { k: 'causale', t: 'Causale operazione', w: '*' }, { k: 'documento', t: 'Documento', w: 110 },
            { k: 'dare', t: 'Dare €', w: 100, n: true, v: (m) => num(m.dare) }, { k: 'avere', t: 'Avere €', w: 100, n: true, v: (m) => num(m.avere) },
            { k: 'saldo', t: 'Saldo €', w: 110, n: true, semi: true, v: (m) => num(m.saldo) }, { k: 'da', t: 'D/A', w: 44, v: (m) => (m.saldo >= 0 ? 'D' : 'A') }] })
          + '</div>';
      },
    });
    A['sc-excel'] = () => {
      const p = partitario(isCliente, sog.id, st.dal, st.al);
      G.scaricaFile('Scheda_' + sog.nome.replace(/\W+/g, '_') + '.csv', G.csv(['Data', 'Causale operazione', 'Documento', 'Dare €', 'Avere €', 'Saldo €', 'D/A'], p.map((m) => [dataIt(m.data), m.causale, m.documento, num(m.dare), num(m.avere), num(m.saldo), m.saldo >= 0 ? 'D' : 'A'])));
    };
    A['sc-pdf'] = () => {
      const p = partitario(isCliente, sog.id, st.dal, st.al);
      const righe = p.map((m) => '<tr><td>' + dataIt(m.data) + '</td><td>' + esc(m.causale) + '</td><td>' + esc(m.documento) + '</td><td class="n">' + num(m.dare) + '</td><td class="n">' + num(m.avere) + '</td><td class="n"><b>' + num(m.saldo) + '</b></td><td>' + (m.saldo >= 0 ? 'D' : 'A') + '</td></tr>').join('');
      G.finestra({ titolo: 'Scheda_' + sog.nome.replace(/\W+/g, '_') + '.pdf — Visualizzatore PDF', larghezza: 820, altezza: 700, bianca: true,
        corpo: '<div class="foglio-cornice"><div class="foglio"><div class="ditta">' + esc(G.S.negozio.ragione) + '</div><div class="tipo"><span>SCHEDA CONTABILE ' + (isCliente ? 'CLIENTE' : 'FORNITORE') + '</span></div><div><b>' + esc(sog.nome) + '</b> — ' + esc(dett) + '</div><div>Periodo dal ' + dataIt(st.dal) + ' al ' + dataIt(st.al) + '</div>'
          + '<table><thead><tr><th>Data</th><th>Causale operazione</th><th>Documento</th><th class="n">Dare €</th><th class="n">Avere €</th><th class="n">Saldo €</th><th>D/A</th></tr></thead><tbody>' + righe + '</tbody></table></div></div>' });
    };
  }

  // =====================================================================
  // CLIENTI
  // =====================================================================
  const cl = () => G.ui('clienti', () => ({ form: null, formMsg: null }));
  const pivaCf = (c) => c.piva || c.cf || '';
  const prossimoCodice = (lista) => String(Math.max(0, ...lista.map((x) => Number(x.codice) || 0)) + 1);
  G.VISTE.clienti = {
    nuova() { cl().form = null; G.deseleziona('cli'); },
    render() {
      const S = G.S, u = cl();
      const sel = G.selezionato('cli');
      const righe = S.clienti.slice().sort((a, b) => a.nome.localeCompare(b.nome));
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga tesa" style="margin-bottom:12px"><div class="pila"><div class="h1">Clienti</div><span class="muto" style="margin-left:16px">' + righe.length + ' clienti</span></div>'
        + '<div class="riga tesa fisso">' + btn('Scheda contabile', 'cli-scheda', { dis: !sel, stile: 'margin-right:8px', title: 'Partitario Dare/Avere, saldi, acconti e stampa della scheda' }) + btn('Elimina', 'cli-elimina', { dis: !sel, stile: 'margin-right:8px' }) + btn('Modifica', 'cli-modifica', { dis: !sel, stile: 'margin-right:8px' }) + btn('+ Nuovo cliente', 'cli-nuovo', { primario: true }) + '</div></div>'
        + '<div class="col riempi" style="position:relative">' + G.dg('cli', {
          classe: 'riempi', righe, chiave: (c) => c.id, onSel: () => G.ridisegna(), onDoppio: (c) => { G.scegliRiga('cli', c.id); u.form = { id: c.id }; u.formMsg = null; G.ridisegna(); },
          colonne: [
            { k: 'codice', t: 'Codice', w: 70, mono: true, ordina: (c) => Number(c.codice) || 0 }, { k: 'nome', t: 'Ragione sociale / nome', w: '*' }, { k: 'citta', t: 'Città', w: 160 },
            { k: 'prov', t: 'Prov.', w: 50 }, { k: 'pivacf', t: 'P.IVA / C.F.', w: 150, mono: true, v: pivaCf }, { k: 'listino', t: 'Listino', w: 60, c: true, semi: true },
            { k: 'tel', t: 'Telefono', w: 120, v: (c) => c.tel || c.cell || '' }, { k: 'email', t: 'Email', w: 190 },
          ],
        }) + (u.form ? '<div class="card col scorri" id="cli-form" style="position:absolute;inset:0;z-index:5;overflow:auto">' + this.form(u) + '</div>' : '') + '</div></div>';
    },
    form(u) {
      const c = u.form.id ? G.cli(u.form.id) : null;
      const f = (k) => (c ? c[k] || '' : '');
      return '<div class="h2" style="font-size:17px;margin-bottom:14px">' + (c ? 'Modifica cliente' : 'Nuovo cliente') + '</div><div class="avvolgi">'
        + campo('Codice *', tb('fk-codice', c ? c.codice : prossimoCodice(G.S.clienti)), 120)
        + campo('Tipo soggetto *', G.sel('id="fk-tipo"', TIPI, c ? c.tipoSogg : 'PRIVATO'), 210)
        + campo('Ragione sociale / Nome e cognome *', tb('fk-nome', f('nome')), 430)
        + campo('Indirizzo', tb('fk-ind', f('indirizzo')), 430) + campo('CAP', tb('fk-cap', f('cap')), 90) + campo('Città', tb('fk-citta', f('citta')), 240)
        + campo('Prov.', tb('fk-prov', f('prov'), ' maxlength="2"'), 80) + campo('Telefono', tb('fk-tel', f('tel')), 170) + campo('Cellulare', tb('fk-cell', f('cell')), 170)
        + campo('Email', tb('fk-email', f('email')), 260, 'Indirizzo a cui viene mandata la fattura in PDF') + campo('Email 2 (facoltativa)', tb('fk-email2', f('email2')), 260, 'Secondo indirizzo del cliente: la fattura in PDF arriva a tutti e due')
        + campo('PEC', tb('fk-pec', f('pec')), 260) + campo('Partita IVA', tb('fk-piva', f('piva')), 160) + campo('Codice fiscale', tb('fk-cf', f('cf')), 180)
        + campo('Cod. destinatario (SDI)', tb('fk-sdi', f('sdi'), ' maxlength="7"'), 160)
        + campo('Listino prezzi', G.sel('id="fk-listino"', [['A', 'A — listino base'], ['B', 'B — listino B'], ['C', 'C — listino C']], c ? c.listino : 'A'), 150, 'Il listino di vendita del cliente: A, B o C. Al banco viene proposto il prezzo di questo listino.')
        + campo('Metodo di pagamento (testo libero)', tb('fk-pag', f('pagTesto')), 300, 'Es. «Bonifico 60gg fine mese» o «Rimessa diretta»: viene stampato come Pagamento sulle FATTURE normali di questo cliente')
        + '</div><div class="riga" style="margin-top:8px">' + btn('Salva', 'cli-salva', { primario: true, stile: 'padding:7px 22px' }) + btn('Annulla', 'cli-annulla', { stile: 'padding:7px 18px;margin-left:10px' }) + msgSpan(u.formMsg, 'margin-left:16px') + '</div>';
    },
  };
  A['cli-nuovo'] = () => { const u = cl(); u.form = { id: null }; u.formMsg = null; G.ridisegna(); };
  A['cli-modifica'] = () => { const u = cl(); const c = G.selezionato('cli'); if (c) { u.form = { id: c.id }; u.formMsg = null; G.ridisegna(); } };
  A['cli-annulla'] = () => { cl().form = null; G.ridisegna(); };
  A['cli-scheda'] = () => { const c = G.selezionato('cli'); if (c) finestraScheda(true, c); };
  A['cli-elimina'] = () => {
    const c = G.selezionato('cli'); if (!c) return;
    G.msgbox({ titolo: 'Conferma eliminazione', testo: 'Eliminare il cliente «' + c.nome + '»?', icona: 'avviso', pulsanti: [{ t: 'Sì', az: () => {
      G.S.clienti = G.S.clienti.filter((x) => x !== c);
      nelCestino('Cliente', c.codice, c.nome, { tabella: 'clienti', oggetto: c });
      G.log('Cliente', 'Eliminato cliente id ' + c.id, 'cli:' + c.id);
      G.indicizza(); G.deseleziona('cli'); G.salva(); G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };
  A['cli-salva'] = () => {
    const u = cl(), S = G.S;
    const errore = (t) => { u.formMsg = { colore: 'var(--rosso)', testo: t }; G.ridisegna(); };
    const cod = val('fk-codice').trim(), nome = val('fk-nome').trim();
    if (!cod || !nome) return errore('Codice e ragione sociale sono obbligatori.');
    const tipo = val('fk-tipo');
    const dati = { codice: cod, tipoSogg: tipo, nome, indirizzo: val('fk-ind'), cap: val('fk-cap'), citta: val('fk-citta'), prov: val('fk-prov'), tel: val('fk-tel'), cell: val('fk-cell'),
      email: val('fk-email'), email2: val('fk-email2'), pec: val('fk-pec'), piva: val('fk-piva').trim(), cf: val('fk-cf').trim().toUpperCase(), sdi: val('fk-sdi').trim(), listino: val('fk-listino'), pagTesto: val('fk-pag').trim() };
    const v = verifica(tipo, dati.piva, dati.cf, dati.pec, dati.sdi);
    if (v.err.length) return errore('BLOCCATO: ' + v.err.join(' · '));
    if (S.clienti.some((x) => x.id !== u.form.id && x.codice === cod)) return errore('Codice cliente già esistente.');
    const dup = S.clienti.find((x) => x.id !== u.form.id && ((dati.piva && x.piva === dati.piva) || (dati.cf && x.cf === dati.cf)));
    if (dup) v.avv.push('Esiste già un cliente con questa P.IVA/CF: «' + dup.nome + '».');
    const salva = () => {
      const c = u.form.id ? G.cli(u.form.id) : { id: G.nuovoId() };
      Object.assign(c, dati);
      if (!u.form.id) S.clienti.push(c);
      G.log('Cliente', (u.form.id ? 'Modificato cliente ' : 'Creato cliente ') + c.nome, 'cli:' + c.id);
      G.indicizza(); G.salva(); u.form = null; G.scegliRiga('cli', c.id); G.ridisegna();
    };
    if (v.avv.length) G.msgbox({ titolo: 'Controllo anagrafica', testo: 'Attenzione:\n\n• ' + v.avv.join('\n• ') + '\n\nSalvare comunque?', icona: 'avviso', pulsanti: [{ t: 'Sì', az: salva }, { t: 'No', annulla: true }] });
    else salva();
  };

  // =====================================================================
  // FORNITORI
  // =====================================================================
  const fo = () => G.ui('fornitori', () => ({ form: null, formMsg: null, soloDaCompl: false }));
  const daCompletare = (f) => /^DA COMPLETARE/i.test(f.nome);
  G.VISTE.fornitori = {
    nuova() { fo().form = null; G.deseleziona('forn'); },
    render() {
      const S = G.S, u = fo();
      const sel = G.selezionato('forn');
      const tutti = S.fornitori.slice().sort((a, b) => a.nome.localeCompare(b.nome));
      const righe = tutti.filter((f) => !u.soloDaCompl || daCompletare(f));
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga tesa" style="margin-bottom:12px"><div class="pila"><div class="h1">Fornitori</div><span style="margin-left:14px">' + G.chk('data-ch="forn-solo"', 'solo da completare', u.soloDaCompl) + '</span><span class="muto" style="margin-left:16px">' + tutti.length + ' fornitori · ' + tutti.filter(daCompletare).length + ' da completare</span></div>'
        + '<div class="riga tesa fisso">' + btn('Scheda contabile', 'forn-scheda', { dis: !sel, stile: 'margin-right:8px', title: 'Partitario Dare/Avere, saldi, acconti e stampa della scheda' }) + btn('Elimina', 'forn-elimina', { dis: !sel, stile: 'margin-right:8px' }) + btn('Modifica', 'forn-modifica', { dis: !sel, stile: 'margin-right:8px' }) + btn('+ Nuovo fornitore', 'forn-nuovo', { primario: true }) + '</div></div>'
        + '<div class="col riempi" style="position:relative">' + G.dg('forn', {
          classe: 'riempi', righe, chiave: (f) => f.id, onSel: () => G.ridisegna(), onDoppio: (f) => { G.scegliRiga('forn', f.id); u.form = { id: f.id }; u.formMsg = null; G.ridisegna(); },
          colonne: [{ k: 'codice', t: 'Codice', w: 70, mono: true }, { k: 'nome', t: 'Ragione sociale', w: '*' }, { k: 'referente', t: 'Referente', w: 150 }, { k: 'citta', t: 'Città', w: 140 }, { k: 'piva', t: 'P.IVA', w: 130, mono: true }, { k: 'tel', t: 'Telefono', w: 120 }],
        }) + (u.form ? '<div class="card col scorri" id="forn-form" style="position:absolute;inset:0;z-index:5;overflow:auto">' + this.form(u) + '</div>' : '') + '</div></div>';
    },
    form(u) {
      const f = u.form.id ? G.forn(u.form.id) : null;
      const g = (k) => (f ? f[k] || '' : '');
      return '<div class="h2" style="font-size:17px;margin-bottom:14px">' + (f ? 'Modifica fornitore' : 'Nuovo fornitore') + '</div><div class="avvolgi">'
        + campo('Codice *', tb('ff-codice', f ? f.codice : 'F' + String(G.S.fornitori.length + 1).padStart(3, '0')), 120)
        + campo('Ragione sociale *', tb('ff-nome', f && !daCompletare(f) ? f.nome : ''), 430) + campo('Referente', tb('ff-ref', g('referente')), 240)
        + campo('Indirizzo', tb('ff-ind', g('indirizzo')), 430) + campo('CAP', tb('ff-cap', g('cap')), 90) + campo('Città', tb('ff-citta', g('citta')), 240)
        + campo('Prov.', tb('ff-prov', g('prov'), ' maxlength="2"'), 80) + campo('Telefono', tb('ff-tel', g('tel')), 170) + campo('Email', tb('ff-email', g('email')), 260)
        + campo('PEC', tb('ff-pec', g('pec')), 260) + campo('Partita IVA', tb('ff-piva', g('piva')), 160) + campo('IBAN', tb('ff-iban', g('iban')), 240)
        + campo('Condizioni di pagamento', tb('ff-cond', g('cond')), 240)
        + '</div><div class="riga" style="margin-top:8px">' + btn('Salva', 'forn-salva', { primario: true, stile: 'padding:7px 22px' }) + btn('Annulla', 'forn-annulla', { stile: 'padding:7px 18px;margin-left:10px' }) + msgSpan(u.formMsg, 'margin-left:16px') + '</div>';
    },
  };
  G.CH['forn-solo'] = (el) => { fo().soloDaCompl = el.checked; G.ridisegna(); };
  A['forn-nuovo'] = () => { const u = fo(); u.form = { id: null }; u.formMsg = null; G.ridisegna(); };
  A['forn-modifica'] = () => { const u = fo(); const f = G.selezionato('forn'); if (f) { u.form = { id: f.id }; u.formMsg = null; G.ridisegna(); } };
  A['forn-annulla'] = () => { fo().form = null; G.ridisegna(); };
  A['forn-scheda'] = () => { const f = G.selezionato('forn'); if (f) finestraScheda(false, f); };
  A['forn-elimina'] = () => {
    const f = G.selezionato('forn'); if (!f) return;
    G.msgbox({ titolo: 'Conferma eliminazione', testo: 'Eliminare il fornitore «' + f.nome + '»?', icona: 'avviso', pulsanti: [{ t: 'Sì', az: () => {
      G.S.fornitori = G.S.fornitori.filter((x) => x !== f);
      nelCestino('Fornitore', f.codice, f.nome, { tabella: 'fornitori', oggetto: f });
      G.log('Fornitore', 'Eliminato fornitore id ' + f.id, 'for:' + f.id);
      G.indicizza(); G.deseleziona('forn'); G.salva(); G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };
  A['forn-salva'] = () => {
    const u = fo(), S = G.S;
    const errore = (t) => { u.formMsg = { colore: 'var(--rosso)', testo: t }; G.ridisegna(); };
    const cod = val('ff-codice').trim(), nome = val('ff-nome').trim();
    if (!cod || !nome) return errore('Codice e ragione sociale sono obbligatori.');
    const piva = val('ff-piva').trim();
    if (piva && !pivaValida(piva)) return errore('BLOCCATO: partita IVA "' + piva + '" formalmente errata.');
    if (S.fornitori.some((x) => x.id !== u.form.id && x.codice === cod)) return errore('Codice fornitore già esistente.');
    const salva = () => {
      const f = u.form.id ? G.forn(u.form.id) : { id: G.nuovoId(), cat: [] };
      Object.assign(f, { codice: cod, nome, referente: val('ff-ref'), indirizzo: val('ff-ind'), cap: val('ff-cap'), citta: val('ff-citta'), prov: val('ff-prov'), tel: val('ff-tel'), email: val('ff-email'), pec: val('ff-pec'), piva, iban: val('ff-iban'), cond: val('ff-cond') });
      if (!u.form.id) S.fornitori.push(f);
      G.log('Fornitore', (u.form.id ? 'Modificato fornitore ' : 'Creato fornitore ') + f.nome, 'for:' + f.id);
      G.indicizza(); G.salva(); u.form = null; G.scegliRiga('forn', f.id); G.ridisegna();
    };
    const dup = piva ? S.fornitori.find((x) => x.id !== u.form.id && x.piva === piva) : null;
    if (dup) G.msgbox({ titolo: 'Controllo anagrafica', testo: 'Esiste già un fornitore con questa P.IVA: «' + dup.nome + '».\n\nSalvare comunque?', icona: 'avviso', pulsanti: [{ t: 'Sì', az: salva }, { t: 'No', annulla: true }] });
    else salva();
  };

  // =====================================================================
  // CARICO MERCE
  // =====================================================================
  const cm = () => G.ui('carico', () => ({ tipo: 'DDT_ACQUISTO', numDoc: '', data: G.OGGI, qta: '1', costo: '', fornId: '', iva: '', pr: {}, msg: null }));
  const docInCorso = (u) => G.S.acquisti.find((d) => d.tipo === u.tipo && d.fornitoreId === Number(u.fornId) && (d.numero || '').trim().toUpperCase() === u.numDoc.trim().toUpperCase());
  function docInfo(u) {
    if (!u.numDoc.trim()) return { colore: 'var(--testo-2)', testo: 'Senza numero si carica solo il magazzino: nel registro acquisti non comparirà nulla.' };
    if (!u.fornId) return { colore: 'var(--ambra)', testo: 'Scegli il fornitore del documento: tutti gli articoli caricati con questo numero finiscono sotto di lui.' };
    const f = G.forn(Number(u.fornId)), testoF = f.codice + ' — ' + f.nome;
    const d = docInCorso(u);
    let testo = d ? 'Documento già aperto di ' + testoF + ' del ' + dataIt(d.data) + ': ' + d.righe.length + ' righe per ' + num(d.totale) + ' €. I prossimi carichi si aggiungono a questo, con la sua data e questo fornitore.'
      : 'Documento nuovo di ' + testoF + ': verrà creato al primo carico con la data indicata. Tutti gli articoli caricati con questo numero finiscono qui dentro, con questo fornitore.';
    const altri = G.S.acquisti.filter((x) => x.tipo === u.tipo && x.fornitoreId !== Number(u.fornId) && (x.numero || '').trim().toUpperCase() === u.numDoc.trim().toUpperCase()).map((x) => (G.forn(x.fornitoreId) || {}).nome);
    if (altri.length) testo += ' ATTENZIONE: il n. ' + u.numDoc.trim() + ' esiste già anche con ' + altri.join(', ') + ': controlla che il fornitore sia quello giusto.';
    return { colore: altri.length ? 'var(--ambra)' : d ? 'var(--verde)' : 'var(--testo-2)', testo };
  }
  G.VISTE.carico = {
    nuova() { const u = cm(); u.msg = null; G.deseleziona('car'); },
    render() {
      const S = G.S, u = cm();
      const sel = G.selezionato('car');
      const info = docInfo(u);
      const con = !!u.numDoc.trim();
      const lab = (t) => '<span class="muto" style="margin:0 4px 0 0;align-self:center">' + t + '</span>';
      const prz = (l, w, mr) => lab('Prezzo ' + l) + '<input class="tb" style="width:80px;margin-right:4px" id="car-p' + l + '" value="' + esc(u.pr['p' + l] || '') + '" data-ch="car-prz" data-l="' + l + '" inputmode="decimal">' + lab('Ric.' + l + '%') + '<input class="tb" style="width:64px;margin-right:' + mr + 'px" id="car-r' + l + '" value="' + esc(u.pr['r' + l] || '') + '" data-ch="car-ric" data-l="' + l + '" inputmode="decimal">';
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga" style="margin-bottom:12px"><div class="h1">Carico merce</div><span class="muto" style="margin-left:16px">Scrivi il documento del fornitore, poi carica gli articoli uno per uno: finiscono tutti in quella bolla.</span></div>'
        + G.dg('car', {
          classe: 'riempi', righe: S.articoli.slice().sort((a, b) => a.descr.localeCompare(b.descr)), chiave: (a) => a.id,
          onSel: (a) => { selezionaArticolo(u, a); G.ridisegna(); },
          colonne: [
            { k: 'codice', t: 'Codice', w: 96, mono: true }, { k: 'barcode', t: 'Barcode', w: 110, mono: true }, { k: 'descr', t: 'Descrizione', w: '*' },
            { k: 'codForn', t: 'Cod. fornitore', w: 94 }, { k: 'forn', t: 'Fornitore', w: 150, v: (a) => (G.forn(a.forn) || {}).nome || '' },
            { k: 'dataAcq', t: 'Data acq.', w: 86, v: (a) => dataIt(a.dataAcq), ordina: (a) => a.dataAcq || '' },
            { k: 'costo', t: 'Costo', w: 72, n: true, v: (a) => num(a.costo), ordina: (a) => a.costo }, { k: 'pA', t: 'Pr.A', w: 66, n: true, semi: true, v: (a) => num(a.prezzoA), ordina: (a) => a.prezzoA },
            { k: 'pB', t: 'Pr.B', w: 66, n: true, v: (a) => (a.prezzoB ? num(a.prezzoB) : ''), ordina: (a) => a.prezzoB || 0 }, { k: 'pC', t: 'Pr.C', w: 66, n: true, v: (a) => (a.prezzoC ? num(a.prezzoC) : ''), ordina: (a) => a.prezzoC || 0 },
            { k: 'giac', t: 'Giacenza', w: 76, n: true, v: (a) => qta(a.giac), ordina: (a) => a.giac },
          ],
        })
        + '<div class="card" style="margin-top:12px;padding:12px 14px">'
        + '<div class="avvolgi basso" style="margin-bottom:10px"><span class="muto semi" style="margin:0 14px 8px 0">Documento del fornitore</span>'
        + '<div style="margin:0 14px 8px 0"><div class="muto">Tipo documento</div><div style="width:164px">' + G.sel('data-ch="car-tipo"', [['DDT_ACQUISTO', 'DDT / bolla'], ['FATTURA_ACQUISTO', 'Fattura']], u.tipo) + '</div></div>'
        + '<div style="margin:0 14px 8px 0"><div class="muto" title="Il numero della bolla o della fattura. Lasciandolo vuoto si carica solo il magazzino, senza registrare nessun documento.">N. documento fornitore</div><input class="tb" style="width:170px" data-in="car-num" value="' + esc(u.numDoc) + '" autocomplete="off"></div>'
        + '<div style="margin:0 14px 8px 0"><div class="muto" title="La data del documento: vale per tutti gli articoli caricati con questo numero e non cambia passando da un articolo all\'altro.">Data acquisto</div>' + G.dp('car-data', u.data, { onCambia: (v) => { u.data = v || G.OGGI; } }) + '</div>'
        + '<div id="car-info" style="font-size:12px;margin:0 0 10px;max-width:460px;color:' + info.colore + '">' + esc(info.testo) + '</div></div>'
        + '<div class="avvolgi basso">'
        + '<div style="width:340px;margin:0 18px 8px 0"><div class="muto">Articolo selezionato</div><div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (sel ? esc(sel.codice + ' · ' + sel.descr) : '—') + '</div><div class="muto" style="white-space:nowrap">' + (sel ? 'Giacenza attuale: ' + qta(sel.giac) + ' · costo ' + num(sel.costo) + ' € · ultimo acquisto ' + (sel.dataAcq ? dataIt(sel.dataAcq) : '—') : '') + '</div></div>'
        + '<div style="margin:0 16px 8px 0"><div class="muto">Quantità da caricare *</div><input class="tb" style="width:100px" data-in="car-qta" value="' + esc(u.qta) + '" inputmode="decimal"></div>'
        + '<div style="margin:0 16px 8px 0"><div class="muto" title="Aggiorna solo il costo di acquisto: i prezzi A/B/C NON cambiano da soli, li decidi tu qui sotto">Nuovo costo (opz.)</div><input class="tb" style="width:100px" id="car-costo" data-in="car-costo" value="' + esc(u.costo) + '" inputmode="decimal"></div>'
        + '<div style="margin:0 16px 8px 0"><div class="muto" title="Il fornitore del documento: con un numero di documento scritto resta lo stesso per tutti gli articoli che carichi. Senza documento viene proposto quello della scheda dell\'articolo.">Fornitore</div><div style="width:230px">' + G.sel('data-ch="car-forn"', [['', '']].concat(fornLookup().map((f) => [f.id, f.testo])), u.fornId) + '</div></div>'
        + '<div style="margin:0 16px 8px 0"><div class="muto" title="Aliquota IVA dell\'articolo (può cambiare nel tempo, es. mascherine al 5%)">IVA</div><div style="width:100px">' + G.sel('data-ch="car-iva"', [['', '']].concat(aliquote()), u.iva) + '</div></div>'
        + btn(con ? 'Registra carico e documento' : 'Registra carico', 'car-registra', { primario: true, dis: !sel, stile: 'padding:7px 18px;margin:0 0 8px 0' })
        + '<span style="font-size:12px;margin:0 0 14px 16px;color:' + (u.msg ? u.msg.colore : 'inherit') + '">' + (u.msg ? esc(u.msg.testo) : '') + '</span></div>'
        + '<div class="avvolgi" style="align-items:center">' + '<span class="muto" style="margin-right:12px">Listini (IVA incl.) e ricarichi % — li decidi tu: NON si ricalcolano dal nuovo costo:</span>' + prz('A', 80, 14) + prz('B', 80, 14) + prz('C', 80, 0) + '</div>'
        + '</div></div>';
    },
  };
  function selezionaArticolo(u, a) {
    u.msg = null; u.costo = '';
    if (!(u.numDoc.trim() && u.fornId)) u.fornId = a.forn ? String(a.forn) : '';
    u.iva = String(a.iva);
    u.pr = { pA: n2(a.prezzoA), rA: n2(a.ricA), pB: n2(a.prezzoB), rB: n2(a.ricB), pC: n2(a.prezzoC), rC: n2(a.ricC) };
  }
  const aggiornaInfo = () => { const u = cm(); const i = docInfo(u); const el = document.getElementById('car-info'); if (el) { el.textContent = i.testo; el.style.color = i.colore; } const b = document.querySelector('[data-az="car-registra"]'); if (b) b.textContent = u.numDoc.trim() ? 'Registra carico e documento' : 'Registra carico'; };
  G.CH['car-tipo'] = (el) => { cm().tipo = el.value; aggiornaInfo(); };
  G.IN['car-num'] = (el) => {
    const u = cm(); u.numDoc = el.value;
    const d = u.numDoc.trim() && u.fornId ? docInCorso(u) : null;
    if (d && d.data !== u.data) { u.data = d.data; G.dpImposta('car-data', d.data); }
    aggiornaInfo();
  };
  G.CH['car-forn'] = (el) => { cm().fornId = el.value; aggiornaInfo(); };
  G.CH['car-iva'] = (el) => { cm().iva = el.value; };
  G.IN['car-qta'] = (el) => { cm().qta = el.value; };
  G.IN['car-costo'] = (el) => { cm().costo = el.value; };
  const costoRif = () => { const u = cm(); const c = G.leggiNum(u.costo); const a = G.selezionato('car'); return c > 0 ? c : a ? a.costo : 0; };
  const ivaRif = () => { const u = cm(); const a = G.selezionato('car'); return u.iva !== '' ? Number(u.iva) : a ? a.iva : 22; };
  G.CH['car-ric'] = (el) => {
    const u = cm(), l = el.dataset.l, costo = costoRif(); u.pr['r' + l] = el.value;
    const r = G.leggiNumN(el.value); if (costo <= 0 || r === null) return;
    u.pr['p' + l] = n2(Math.round(costo * (1 + r / 100) * (1 + ivaRif() / 100) * 100) / 100);
    document.getElementById('car-p' + l).value = u.pr['p' + l];
  };
  G.CH['car-prz'] = (el) => {
    const u = cm(), l = el.dataset.l, costo = costoRif(); u.pr['p' + l] = el.value;
    const p = G.leggiNumN(el.value); if (costo <= 0 || p === null || p <= 0) return;
    u.pr['r' + l] = n2(Math.round((p / (1 + ivaRif() / 100) / costo - 1) * 10000) / 100);
    document.getElementById('car-r' + l).value = u.pr['r' + l];
  };
  A['car-registra'] = () => {
    const u = cm(), a = G.selezionato('car'); if (!a) return;
    const q = G.leggiNum(u.qta);
    if (q <= 0) { u.msg = { colore: 'var(--rosso)', testo: 'Quantità non valida.' }; G.ridisegna(); return; }
    const con = !!u.numDoc.trim();
    if (con && !u.fornId) { u.msg = { colore: 'var(--rosso)', testo: 'Per registrare il documento serve il fornitore.' }; G.ridisegna(); return; }
    const esegui = () => {
      const S = G.S;
      const costo = G.leggiNum(u.costo) > 0 ? G.leggiNum(u.costo) : null;
      a.giac = r2(a.giac + q);
      if (costo) a.costo = costo;
      a.dataAcq = u.data || G.OGGI;
      if (u.fornId) a.forn = Number(u.fornId);
      if (u.iva !== '') a.iva = Number(u.iva);
      const pz = (k) => G.leggiNumN(document.getElementById('car-' + k) ? document.getElementById('car-' + k).value : u.pr[k]);
      ['A', 'B', 'C'].forEach((l) => { const p = pz('p' + l), r = pz('r' + l); if (p !== null) a['prezzo' + l] = p; a['ric' + l] = r; });
      let testo = 'Carico registrato: +' + qta(q);
      let nuovo = false;
      if (con) {
        let d = docInCorso(u);
        if (!d) {
          d = { id: G.nuovoId(), prot: ++S.numeri.protocollo, tipo: u.tipo, numero: u.numDoc.trim(), data: u.data || G.OGGI, fornitoreId: Number(u.fornId), imponibile: 0, iva: 0, totale: 0, destinazione: 'MERCE', regime: 'ORD', pagamento: (G.forn(Number(u.fornId)) || {}).cond || '', daControllare: false, ordine: false, righe: [], allegati: 0, ricevutaIl: G.OGGI };
          S.acquisti.push(d); nuovo = true;
        }
        d.righe.push({ artId: a.id, codice: a.codice, descr: a.descr, qta: q, costo: costo || a.costo, iva: a.iva });
        d.imponibile = r2(somma(d.righe, (r) => r.qta * r.costo)); d.iva = r2(somma(d.righe, (r) => r.qta * r.costo * r.iva / 100)); d.totale = r2(d.imponibile + d.iva);
        testo += ' · ' + (nuovo ? 'creato' : 'aggiornato') + ' il documento ' + d.numero + ', ora ha ' + d.righe.length + ' righe';
      } else testo += ' · solo magazzino (nessun numero di documento)';
      if (a.fito) S.registro.unshift({ id: G.nuovoId(), tipo: 'CARICO', data: u.data || G.OGGI, artId: a.id, qta: q, fornitoreId: Number(u.fornId) || a.forn, doc: con ? u.numDoc.trim() : '', dataDoc: u.data || G.OGGI, lotto: a.lotto });
      G.log('Carico', 'Carico merce articolo id ' + a.id + ': +' + G.z0(q) + (costo > 0 ? ' · costo € ' + G.z2(costo) : '') + (con ? ' · ' + (nuovo ? 'nuovo documento ' : 'riga aggiunta al documento ') + u.numDoc.trim() : ''), 'art:' + a.id);
      G.salva();
      selezionaArticolo(u, a);
      u.msg = { colore: 'var(--verde)', testo };
      G.ridisegna();
    };
    if (!con && u.fornId) {
      const f = G.forn(Number(u.fornId));
      G.msgbox({ titolo: 'Carico senza documento', icona: 'avviso', predefinito: 1, testo: 'Manca il numero del documento di ' + f.codice + ' — ' + f.nome + '.\n\nSenza numero la merce entra solo in magazzino: nel Registro acquisti non comparirà nessuna riga.\n\nCarico lo stesso, SENZA documento?',
        pulsanti: [{ t: 'Sì', az: esegui }, { t: 'No', annulla: true, az: () => { u.msg = { colore: 'var(--testo-2)', testo: 'Non ho caricato niente: scrivi il numero della bolla o della fattura in «N. documento fornitore» e riprova.' }; G.ridisegna(); } }] });
      return;
    }
    esegui();
  };

  G.anagrafiche = { finestraScheda, partitario, verifica, pivaValida };
})();
