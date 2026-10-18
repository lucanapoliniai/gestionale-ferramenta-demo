/* Nucleo della demo: stato, formati, menu, ruoli, accesso con PIN e blocco come MainWindow.xaml(.cs),
   AppState.cs e LoginWindow; tabelle come il DataGrid del programma (filtro sotto ogni intestazione,
   freccia per ordinare), tendine, selettori di data, finestre e avvisi come quelli di Windows.
   Le sezioni sono nei file v-*.js. Differenze volute rispetto al programma, perché è una demo:
   l'amministratore entra senza password e il PIN va bene qualunque sia. */
(function () {
  'use strict';
  const D = window.GF_DATI;
  const ico = window.GF_ICONA;
  const CHIAVE = 'gestionale-ferramenta-demo';
  const VERSIONE = 8;
  const VERSIONE_PROGRAMMA = 'v1.0 · 17/10/2026';   // data del programma vero ricopiato dalla demo

  // ---------- formati (come il programma: 1.234,56) ----------
  function fmt(n, dec) {
    const x = Math.round((Number(n) || 0) * Math.pow(10, dec)) / Math.pow(10, dec);
    const s = Math.abs(x).toFixed(dec).split('.');
    return (x < 0 ? '-' : '') + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + s[1] : '');
  }
  const eur = (n) => fmt(n, 2) + ' €';
  const eur0 = (n) => fmt(n, 0) + ' €';
  const num = (n, d) => fmt(n, d === undefined ? 2 : d);
  // «0.###»: fino a 3 decimali, senza zeri inutili
  const qta = (n) => { const x = Math.round((Number(n) || 0) * 1000) / 1000; const s = String(Math.abs(x)).split('.'); return (x < 0 ? '-' : '') + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '') + (s[1] ? ',' + s[1] : ''); };
  const dec = (n, max) => { const p = Math.pow(10, max === undefined ? 2 : max); const x = Math.round((Number(n) || 0) * p) / p; return String(x).replace('.', ','); };
  const perc = (n) => fmt(n, 1) + '%';
  // «0.00» e «0.##» dei messaggi della cronologia del programma: virgola, senza separatore delle migliaia
  const z2 = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2).replace('.', ',');
  const z0 = (n) => String(Math.round((Number(n) || 0) * 100) / 100).replace('.', ',');
  const dataIt = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '');
  const dataBreve = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(2, 4) : '');
  const oraIt = (s) => (s ? s.slice(11, 16) : '');
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normalizza = (s) => String(s === undefined || s === null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const leggiNum = (s) => { let t = String(s === undefined || s === null ? '' : s).trim().replace(/\s|€/g, ''); if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); const x = parseFloat(t); return isFinite(x) ? x : 0; };
  const leggiNumN = (s) => (String(s || '').trim() === '' ? null : leggiNum(s));
  const leggiData = (s) => { const m = String(s || '').trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/); if (!m) return null; let y = Number(m[3]); if (y < 100) y += 2000; const d = new Date(y, Number(m[2]) - 1, Number(m[1])); return d.getMonth() === Number(m[2]) - 1 ? D.iso(d) : null; };
  const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const dataLunga = (s) => { const d = D.daIso(s); return GIORNI[d.getDay()] + ' ' + d.getDate() + ' ' + MESI_LUNGHI[d.getMonth()] + ' ' + d.getFullYear(); };
  const somma = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
  const r2 = D.r2;
  const adessoIso = () => { const d = new Date(); return OGGI + 'T' + D.pad(d.getHours()) + ':' + D.pad(d.getMinutes()) + ':' + D.pad(d.getSeconds()); };

  // ---------- stato ----------
  const OGGI = D.iso(new Date());
  let S = null, ST = null;
  function caricaStato() {
    try {
      const t = localStorage.getItem(CHIAVE);
      if (t) {
        const s = JSON.parse(t);
        // i dati ripartono ogni giorno: la demo deve sembrare «di oggi» quando la si mostra
        if (s && s.versione === VERSIONE && s.generatoIl === OGGI) return s;
      }
    } catch (e) { /* senza memoria del browser la demo parte lo stesso */ }
    return D.genera(OGGI, new Date());
  }
  let timerSalva = null;
  function salva() {
    clearTimeout(timerSalva);
    timerSalva = setTimeout(() => { try { localStorage.setItem(CHIAVE, JSON.stringify(S)); } catch (e) { /* niente */ } }, 250);
  }
  const pref = (k, def) => { try { const v = localStorage.getItem('gf-' + k); return v === null ? def : v; } catch (e) { return def; } };
  const setPref = (k, v) => { try { localStorage.setItem('gf-' + k, v); } catch (e) { /* niente */ } };

  // ---------- ricerche veloci ----------
  let IX = {};
  let prossimoId = 0;
  function indicizza() {
    IX = { art: {}, cli: {}, forn: {}, cat: {}, met: {}, pat: {}, fat: {}, ddt: {} };
    S.articoli.forEach((x) => { IX.art[x.id] = x; });
    S.clienti.forEach((x) => { IX.cli[x.id] = x; });
    S.fornitori.forEach((x) => { IX.forn[x.id] = x; });
    S.categorie.forEach((x) => { IX.cat[x.id] = x; });
    S.metodi.forEach((x) => { IX.met[x.id] = x; });
    S.patentini.forEach((x) => { IX.pat[x.id] = x; });
    S.fatture.forEach((x) => { IX.fat[x.id] = x; });
    S.ddt.forEach((x) => { IX.ddt[x.id] = x; });
    let max = 0;
    const guarda = (v) => { if (Array.isArray(v)) v.forEach(guarda); else if (v && typeof v === 'object') { if (typeof v.id === 'number' && v.id > max) max = v.id; Object.keys(v).forEach((k) => { if (typeof v[k] === 'object') guarda(v[k]); }); } };
    guarda(S);
    if (max > prossimoId) prossimoId = max;
  }
  const art = (id) => IX.art[id];
  const cli = (id) => IX.cli[id];
  const forn = (id) => IX.forn[id];
  const cat = (id) => IX.cat[id];
  const metodo = (id) => IX.met[id];
  const patentino = (id) => IX.pat[id];
  const fattura = (id) => IX.fat[id];
  const ddtDa = (id) => IX.ddt[id];
  const nuovoId = () => ++prossimoId;

  // ---------- regole del negozio (come il programma) ----------
  // margine e ricarico come Models/Articolo.cs: prezzi IVA inclusa, costo netto
  function margine(a, prezzo) {
    const p = prezzo === undefined ? a.prezzoA : prezzo;
    const netto = a.iva > 0 ? p / (1 + a.iva / 100) : p;
    const m = netto - a.costo;
    return { netto, euro: r2(m), perc: netto > 0 ? Math.round((m / netto) * 1000) / 10 : 0, ric: a.costo > 0 ? Math.round((m / a.costo) * 1000) / 10 : 0 };
  }
  const ricaricoMostrato = (a) => (a.ricA !== null && a.ricA !== undefined && a.ricA !== '' ? Number(a.ricA) : margine(a).ric);
  const ricaricoDiverso = (a) => a.ricA !== null && a.ricA !== undefined && a.ricA !== '' && a.costo > 0 && margine(a).netto > 0 && Math.abs(Number(a.ricA) - margine(a).ric) > 1;
  const statoArticolo = (a) => { const m = margine(a).perc; return m < 0 ? 'sottocosto' : m < 10 ? 'basso' : m < 25 ? 'medio' : 'sano'; };
  const sottocosto = (a) => a.costo > 0 && a.prezzoA > 0 && margine(a).perc < 0;
  const sottoScorta = (a) => a.scortaMin > 0 && a.giac < a.scortaMin;
  function totaliRighe(righe) {
    const perAliq = {};
    righe.forEach((r) => { perAliq[r.iva] = (perAliq[r.iva] || 0) + r.qta * r.prezzo * (1 - (r.sconto || 0) / 100); });
    let imp = 0, iva = 0;
    const riepilogo = [];
    Object.keys(perAliq).sort((a, b) => b - a).forEach((k) => {
      const lordo = r2(perAliq[k]);
      const netto = r2(lordo / (1 + Number(k) / 100));
      riepilogo.push({ aliquota: Number(k), imponibile: netto, imposta: r2(lordo - netto) });
      imp += netto; iva += r2(lordo - netto);
    });
    return { imponibile: r2(imp), iva: r2(iva), totale: r2(imp + iva), riepilogo };
  }
  const totaleRiga = (r) => r2(r.qta * r.prezzo * (1 - (r.sconto || 0) / 100));
  // pagamento scritto a mano → metodo, codice FE e giorni (InterpretaPagamento): giorni esatti, niente fine mese
  function interpretaPagamento(testo) {
    const t = String(testo || '').trim();
    if (!t) return null;
    const esatto = S.metodi.find((m) => normalizza(m.nome) === normalizza(t));
    if (esatto) return { metodoId: esatto.id, codice: esatto.fe, giorni: esatto.giorni };
    const s = normalizza(t);
    const codice = /contant|rimessa\s+diretta/.test(s) ? 'MP01' : /assegn/.test(s) ? 'MP02' : /\bri\.?\s?ba\b|ricevuta\s+bancaria/.test(s) ? 'MP12'
      : /\bsdd\b|sepa|addebito\s+diretto/.test(s) ? 'MP19' : /\brid\b/.test(s) ? 'MP09' : /carta|\bpos\b|bancomat/.test(s) ? 'MP08' : 'MP05';
    let giorni = 0;
    const m = s.match(/(\d{1,3})(?:\s*\/\s*\d{1,3})*\s*(?:gg|g\.|gior)/);
    if (m) giorni = Number(m[1]); else { const m2 = s.match(/\b(30|60|90|120|150|180)\b/); if (m2) giorni = Number(m2[1]); }
    const trovato = S.metodi.find((x) => x.fe === codice && x.giorni === giorni);
    return { metodoId: trovato ? trovato.id : null, codice, giorni };
  }
  function scadenzaFattura(metodoId, pagTesto, data) {
    if (metodoId && metodo(metodoId)) return D.piuGiorni(data, metodo(metodoId).giorni);
    const p = interpretaPagamento(pagTesto);
    return D.piuGiorni(data, p ? p.giorni : 0);
  }
  // il «pagato» della partita: quello scritto sulla partita (si può correggere a mano), se no la somma degli incassi
  const pagatoScad = (s) => (s.pagato !== undefined && s.pagato !== null ? s.pagato : r2(somma(s.incassi || [], (i) => i.importo)));
  const residuo = (s) => r2(s.importo - pagatoScad(s));
  const patScaduto = (p) => p.validoA < OGGI;
  function saldoConto(codice) {
    const c = S.conti.find((x) => x.codice === codice);
    let s = c ? c.iniziale : 0;
    S.primaNota.forEach((m) => {
      if (m.conto === codice) s += m.tipo === 'ENTRATA' ? m.importo : -m.importo;
      if (m.tipo === 'GIROCONTO' && m.contoDest === codice) s += m.importo;
    });
    if (codice === 'CASSA') s += somma(S.scontrini.filter((x) => x.metodoId === 1), (x) => x.totale);
    if (codice === 'POS') s += somma(S.scontrini.filter((x) => x.metodoId === 2), (x) => x.totale);
    return r2(s);
  }
  function log(tipo, descr, rif) {
    S.cronologia.unshift({ id: nuovoId(), quando: adessoIso(), tipo, descr, rif: rif || '' });
  }
  const numeroFattura = (f) => (f.tipo === 'FAC' ? 'FAC ' : f.tipo === 'NC' ? 'NC ' : 'FT ') + f.numero + '/' + f.anno;
  const nomeSoggetto = (s) => (s.tipo === 'PASSIVA' ? (forn(s.soggettoId) || {}).nome : (cli(s.soggettoId) || {}).nome) || '';

  // ---------- ruoli e accesso: come AppState.cs e LoginWindow ----------
  // Officina: niente cassa. Cassa: anche scontrini, cassetto, chiusura. Amministratore: anche i numeri
  // dell'azienda, ma NON emette scontrini (richiesta del negozio).
  const SOLO_ADMIN = ['dashboard', 'analisi', 'report', 'provvigioni', 'pec'];
  let ruolo = 'officina';
  let operatore = null;   // { id, nome }
  const ruoloPostazione = () => (pref('ruolo-postazione', 'officina') === 'cassa' ? 'cassa' : 'officina');
  const isAdmin = () => ruolo === 'amministratore';
  const puoVedere = (s) => isAdmin() || !SOLO_ADMIN.includes(s);
  const puoUsareCassa = () => ruolo === 'cassa' || ruolo === 'amministratore';
  const puoEmettere = () => ruolo === 'cassa';

  // ---------- stato delle sezioni e azioni ----------
  const U = {};
  const ui = (nome, iniziale) => U[nome] || (U[nome] = iniziale());
  const VISTE = {};
  const AZ = {}, IN = {}, CH = {};
  let corrente = 'vendite';

  // ---------- tabelle: come il DataGrid del programma ----------
  // colonne: { k, t, w (px | '*' | '2*'), min, n (a destra), c (al centro), mono, semi, f (html), v (valore),
  //            testo (per il filtro), cls, tip, input: { ch, cls } }
  const TAB = {};
  // come il DataGrid di WPF: se c'è una colonna «*» e lo spazio non basta, le colonne fisse si
  // restringono tutte della stessa misura (fino alla loro larghezza minima) invece di far comparire la
  // barra; senza colonne «*» le larghezze restano quelle e la tabella scorre di lato
  const conStelle = (cfg) => cfg.colonne.some((c) => typeof c.w !== 'number');
  function tracce(cfg) {
    const stelle = conStelle(cfg);
    return cfg.colonne.map((c) => {
      if (typeof c.w === 'number') return stelle ? 'minmax(' + Math.min(c.w, c.min || 20) + 'px,' + c.w + 'px)' : c.w + 'px';
      const peso = c.w === undefined || c.w === '*' ? 1 : parseFloat(c.w) || 1;
      return 'minmax(' + (c.min || 20) + 'px,' + peso + 'fr)';
    }).join(' ');
  }
  const larghezzaMinima = (cfg) => somma(cfg.colonne, (c) => (typeof c.w === 'number' ? (conStelle(cfg) ? Math.min(c.w, c.min || 20) : c.w) : (c.min || 20)));
  function dg(id, cfg) {
    const t = TAB[id] || (TAB[id] = { filtri: {}, ord: cfg.ordine || null, sel: null, multi: new Set() });
    t.cfg = cfg;
    if (cfg.sel !== undefined) t.sel = cfg.sel === null ? null : String(cfg.sel);
    const testa = cfg.colonne.map((c) => {
      const freccia = t.ord && t.ord.k === c.k ? (t.ord.dir > 0 ? '▲' : '▼') : '↕';
      return '<div class="dg-th"><div class="th-alto"><span class="tit">' + esc(c.t) + '</span>'
        + '<button class="ord" data-az="dg-ordina" data-dg="' + id + '" data-k="' + c.k + '" title="Ordina (clic per crescente / decrescente)">' + freccia + '</button></div>'
        + '<input class="fil" data-in="dg-filtro" data-dg="' + id + '" data-k="' + c.k + '" value="' + esc(t.filtri[c.k] || '') + '" title="Filtra questa colonna" autocomplete="off" autocapitalize="off" spellcheck="false"></div>';
    }).join('');
    return '<div class="dg' + (cfg.senzaBordo ? ' senza-bordo' : '') + (cfg.classe ? ' ' + cfg.classe : '') + '" id="dg-' + id + '" style="--dg-cols:' + tracce(cfg) + (cfg.stile ? ';' + cfg.stile : '') + '">'
      + '<div class="dg-in" style="min-width:' + larghezzaMinima(cfg) + 'px"><div class="dg-testa">' + testa + '</div><div class="dg-corpo" id="dgc-' + id + '">' + corpoDg(id) + '</div></div></div>';
  }
  const valCol = (c, r) => (c.v ? c.v(r) : r[c.k]);
  function righeDg(id) {
    const t = TAB[id], cfg = t.cfg;
    let righe = cfg.righe;
    const filtri = Object.keys(t.filtri).filter((k) => (t.filtri[k] || '').trim());
    if (filtri.length) {
      righe = righe.filter((r) => filtri.every((k) => {
        const c = cfg.colonne.find((x) => x.k === k);
        if (!c) return true;
        const testo = c.testo ? c.testo(r) : valCol(c, r);
        return normalizza(testo).includes(normalizza(t.filtri[k]));
      }));
    }
    if (t.ord) {
      const c = cfg.colonne.find((x) => x.k === t.ord.k);
      if (c) {
        if (c.senzaVuotiOrdinando) righe = righe.filter((r) => valCol(c, r) !== '' && valCol(c, r) !== null && valCol(c, r) !== undefined);
        righe = righe.slice().sort((a, b) => {
          let x = c.ordina ? c.ordina(a) : valCol(c, a), y = c.ordina ? c.ordina(b) : valCol(c, b);
          if (typeof x === 'string') x = normalizza(x);
          if (typeof y === 'string') y = normalizza(y);
          return (x > y ? 1 : x < y ? -1 : 0) * t.ord.dir;
        });
      }
    }
    return righe;
  }
  function cella(c, r, id, k) {
    let cls = 'dg-c' + (c.n ? ' n' : '') + (c.c ? ' c' : '') + (c.mono ? ' mono' : '') + (c.semi ? ' semi' : '') + (c.grassetto ? ' grassetto' : '');
    if (c.cls) cls += ' ' + (typeof c.cls === 'function' ? c.cls(r) || '' : c.cls);
    const tip = c.tip ? c.tip(r) : '';
    let dentro;
    if (c.input) {
      const val = c.input.valore ? c.input.valore(r) : valCol(c, r);
      cls += ' ' + (c.input.cls || 'input');
      dentro = '<input value="' + esc(val) + '" data-ch="' + c.input.ch + '" data-dg="' + id + '" data-r="' + esc(k) + '" data-k="' + c.k + '" inputmode="' + (c.input.modo || 'decimal') + '" autocomplete="off" spellcheck="false">';
    } else dentro = c.f ? c.f(r) : esc(valCol(c, r));
    return '<div class="' + cls + '"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + dentro + '</div>';
  }
  function corpoDg(id) {
    const t = TAB[id], cfg = t.cfg;
    const righe = righeDg(id);
    t.visibili = righe;
    if (cfg.onConta) cfg.onConta(righe);
    if (!righe.length) return cfg.vuoto ? '<div class="dg-vuoto">' + esc(cfg.vuoto) + '</div>' : '';
    return righe.map((r) => {
      const k = String(cfg.chiave(r));
      const scelta = cfg.multiSel ? t.multi.has(k) : t.sel === k;
      const cls = 'dg-r' + (scelta ? ' scelta' : '') + (cfg.classeRiga ? ' ' + (cfg.classeRiga(r) || '') : '');
      return '<div class="' + cls + '" data-az="dg-riga" data-dg="' + id + '" data-r="' + esc(k) + '">' + cfg.colonne.map((c) => cella(c, r, id, k)).join('') + '</div>';
    }).join('');
  }
  function aggiornaDg(id) { const el = document.getElementById('dgc-' + id); if (el && TAB[id]) el.innerHTML = corpoDg(id); }
  function rifaiDg(id) {
    const el = document.getElementById('dg-' + id);
    if (el && TAB[id]) { const sc = [el.scrollTop, el.scrollLeft]; el.outerHTML = dg(id, TAB[id].cfg); const n = document.getElementById('dg-' + id); if (n) { n.scrollTop = sc[0]; n.scrollLeft = sc[1]; } }
  }
  AZ['dg-ordina'] = (el, ev) => { ev.stopPropagation(); const t = TAB[el.dataset.dg]; const k = el.dataset.k; t.ord = t.ord && t.ord.k === k ? { k, dir: -t.ord.dir } : { k, dir: 1 }; rifaiDg(el.dataset.dg); };
  const touch = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  AZ['dg-riga'] = (el, ev) => {
    if (ev.target.closest('input, select, button')) return;
    const id = el.dataset.dg, t = TAB[id], cfg = t.cfg;
    const k = el.dataset.r;
    if (cfg.multiSel) {
      // come la selezione con Ctrl del programma: sul tablet ogni tocco aggiunge o toglie
      if (ev.ctrlKey || ev.metaKey || touch()) { if (t.multi.has(k)) t.multi.delete(k); else t.multi.add(k); }
      else { t.multi = new Set([k]); }
      document.querySelectorAll('#dgc-' + id + ' .dg-r').forEach((x) => x.classList.toggle('scelta', t.multi.has(x.dataset.r)));
      t.sel = t.multi.size ? k : null;
      if (cfg.onSel) cfg.onSel(t.multi.size ? cfg.righe.find((x) => String(cfg.chiave(x)) === k) : null);
      return;
    }
    const prima = t.sel;
    t.sel = k;
    document.querySelectorAll('#dgc-' + id + ' .dg-r.scelta').forEach((x) => x.classList.remove('scelta'));
    el.classList.add('scelta');
    const r = cfg.righe.find((x) => String(cfg.chiave(x)) === k);
    if (r && cfg.onSel && prima !== k) cfg.onSel(r);
  };
  IN['dg-filtro'] = (el) => { const t = TAB[el.dataset.dg]; t.filtri[el.dataset.k] = el.value; aggiornaDg(el.dataset.dg); };
  const selezionato = (id) => { const t = TAB[id]; if (!t || !t.sel) return null; return t.cfg.righe.find((x) => String(t.cfg.chiave(x)) === t.sel) || null; };
  const selezionati = (id) => { const t = TAB[id]; if (!t) return []; return t.cfg.righe.filter((x) => t.multi.has(String(t.cfg.chiave(x)))); };
  function deseleziona(id) { if (TAB[id]) { TAB[id].sel = null; TAB[id].multi = new Set(); } }
  function scegliRiga(id, k) { if (TAB[id]) TAB[id].sel = k === null ? null : String(k); }
  const rigaDa = (el) => { const t = TAB[el.dataset.dg]; return t ? t.cfg.righe.find((x) => String(t.cfg.chiave(x)) === el.dataset.r) : null; };

  // ---------- ComboBox modificabile (si scrive e la lista si restringe, come ComboRicerca) ----------
  const COMBO = {};
  function cmb(id, cfg) {
    const c = COMBO[id] = Object.assign(COMBO[id] || { valore: null, testo: '' }, cfg);
    if (cfg.valore !== undefined) c.valore = cfg.valore;
    const v = c.valore !== null && c.valore !== undefined ? c.voci.find((x) => x.id === c.valore) : null;
    c.testo = v ? v.testo : (cfg.testoLibero !== undefined ? cfg.testoLibero : (c.libero ? c.testo : ''));
    return '<div class="combo" id="combo-' + id + '"' + (cfg.stile ? ' style="' + cfg.stile + '"' : '') + '><input class="cbe" id="ci-' + id + '" data-in="combo-scrivi" data-combo="' + id + '" data-focus="combo" value="' + esc(c.testo) + '"'
      + (cfg.title ? ' title="' + esc(cfg.title) + '"' : '') + (cfg.disabilitato ? ' disabled' : '') + ' autocomplete="off" autocapitalize="off" spellcheck="false"><span class="freccia" data-az="combo-apri" data-combo="' + id + '"></span><div class="combo-lista" id="cl-' + id + '" hidden></div></div>';
  }
  function filtraCombo(id, tutto) {
    const c = COMBO[id];
    if (!c) return;
    const q = normalizza(c.testo).trim();
    const cifre = c.testo.replace(/\D/g, '');
    let voci = c.voci;
    if (!tutto && q) voci = voci.filter((v) => { const t = normalizza(v.testo + ' ' + (v.cerca || '')); return t.includes(q) || (cifre.length >= 4 && (v.testo + (v.cerca || '')).replace(/\D/g, '').includes(cifre)); });
    voci = voci.slice(0, 200);
    const lista = document.getElementById('cl-' + id);
    if (!lista) return;
    lista.innerHTML = voci.length ? voci.map((v) => '<button type="button" class="combo-voce" data-az="combo-scegli" data-combo="' + id + '" data-v="' + esc(v.id) + '">' + esc(v.testo) + '</button>').join('') : '';
    lista.hidden = !voci.length;
  }
  IN['combo-scrivi'] = (el) => {
    const id = el.dataset.combo, c = COMBO[id];
    c.testo = el.value;
    const prima = c.valore;
    const esatta = c.voci.find((v) => normalizza(v.testo) === normalizza(c.testo));
    c.valore = esatta ? esatta.id : null;
    filtraCombo(id);
    if (c.onScrivi) c.onScrivi(c.testo, c.valore);
    else if (prima !== c.valore && c.onScegli) c.onScegli(c.valore);
  };
  AZ['combo-apri'] = (el) => { const id = el.dataset.combo; const l = document.getElementById('cl-' + id); if (l && !l.hidden) { l.hidden = true; return; } filtraCombo(id, true); };
  AZ['combo-scegli'] = (el) => {
    const id = el.dataset.combo, c = COMBO[id];
    const v = c.voci.find((x) => String(x.id) === el.dataset.v);
    if (!v) return;
    c.valore = v.id; c.testo = v.testo;
    const inp = document.getElementById('ci-' + id); if (inp) inp.value = v.testo;
    document.getElementById('cl-' + id).hidden = true;
    if (c.onScegli) c.onScegli(v.id);
  };
  const valoreCombo = (id) => (COMBO[id] ? COMBO[id].valore : null);
  const testoCombo = (id) => (COMBO[id] ? COMBO[id].testo : '');

  // ---------- ComboBox normale, CheckBox, DatePicker ----------
  function sel(attr, opzioni, valore) {
    return '<select class="cb" ' + attr + '>' + opzioni.map((o) => { const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(valore) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>';
  }
  function chk(attr, testo, acceso, extra) {
    return '<label class="chk' + (extra ? ' ' + extra : '') + '"><input type="checkbox" ' + attr + (acceso ? ' checked' : '') + '>' + esc(testo) + '</label>';
  }
  const DP = {};
  const CAL = '<svg viewBox="0 0 17 17" aria-hidden="true"><rect x="1.5" y="2.5" width="14" height="13" fill="#fff" stroke="#6D7E8C"/><rect x="1.5" y="2.5" width="14" height="3.5" fill="#6D7E8C"/><text x="8.5" y="14" font-size="7.5" font-family="Segoe UI,Arial" font-weight="700" text-anchor="middle" fill="#2E4150">15</text></svg>';
  function dp(id, valore, cfg) {
    cfg = cfg || {};
    DP[id] = { valore: valore || '', onCambia: cfg.onCambia };
    return '<div class="dp' + (valore ? '' : ' vuoto') + '" id="dp-' + id + '" style="width:' + (cfg.larghezza || 130) + 'px' + (cfg.stile ? ';' + cfg.stile : '') + '"' + (cfg.disabilitato ? ' aria-disabled="true"' : '') + '>'
      + '<input class="dp-testo" value="' + esc(dataIt(valore)) + '" placeholder="Selezionare una data" data-ch="dp-testo" data-dp="' + id + '" inputmode="numeric" autocomplete="off"' + (cfg.title ? ' title="' + esc(cfg.title) + '"' : '') + '>'
      + '<span class="dp-cal">' + CAL + '<input type="date" value="' + esc(valore || '') + '" data-ch="dp-nativo" data-dp="' + id + '" aria-label="Scegli la data" tabindex="-1"></span></div>';
  }
  function dpImposta(id, iso) {
    const d = DP[id]; if (!d) return;
    d.valore = iso || '';
    const box = document.getElementById('dp-' + id);
    if (box) { box.querySelector('.dp-testo').value = dataIt(d.valore); box.querySelector('input[type=date]').value = d.valore; box.classList.toggle('vuoto', !d.valore); }
    if (d.onCambia) d.onCambia(d.valore);
  }
  CH['dp-nativo'] = (el) => dpImposta(el.dataset.dp, el.value);
  CH['dp-testo'] = (el) => { const v = el.value.trim() ? leggiData(el.value) : ''; if (v === null) { el.value = dataIt(DP[el.dataset.dp].valore); return; } dpImposta(el.dataset.dp, v); };
  const valoreDp = (id) => (DP[id] ? DP[id].valore : '');

  // ---------- finestre (Window), avvisi (MessageBox) ----------
  const pila = [];
  // Width/Height di una Window comprendono il bordo invisibile di Windows (8 px ai lati e in basso):
  // l'area utile è 16 px più stretta e 39 più bassa (barra del titolo compresa), e così si disegna qui
  const largaVera = (o) => (o.larghezza || 600) - 14;
  const altaVera = (o) => (o.altezza ? o.altezza - 6 : 0);
  function adattaFinestra(o) {
    const el = o.el && o.el.querySelector('.finestra');
    if (!el) return;
    el.style.zoom = '';
    const w = largaVera(o), h = altaVera(o);
    const z = Math.min(1, (window.innerWidth - 24) / w, h ? (window.innerHeight - 24) / h : 1);
    if (z < 1) el.style.zoom = String(Math.max(0.55, z));
  }
  function finestra(o) {
    pila.push(o);
    const box = document.createElement('div');
    box.className = 'velo';
    box.style.zIndex = String(60 + pila.length * 2);
    box.innerHTML = '<div class="finestra' + (o.bianca ? ' bianca' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.titolo) + '" style="width:' + largaVera(o) + 'px' + (o.altezza ? ';height:' + altaVera(o) + 'px' : '') + '">'
      + '<div class="fin-titolo"><span>' + esc(o.titolo) + '</span>' + (o.senzaChiudi ? '' : '<button class="x" data-az="chiudi-finestra" aria-label="Chiudi">✕</button>') + '</div>'
      + '<div class="fin-corpo">' + (typeof o.corpo === 'function' ? o.corpo() : o.corpo) + '</div></div>';
    document.getElementById('finestre').appendChild(box);
    o.el = box;
    adattaFinestra(o);
    if (o.monta) o.monta();
    return o;
  }
  const finestraInCima = () => pila[pila.length - 1] || null;
  function aggiornaFinestra(o) {
    o = o || finestraInCima();
    if (!o || !o.el || typeof o.corpo !== 'function') return;
    const c = o.el.querySelector('.fin-corpo');
    const sc = [];
    c.querySelectorAll('.dg, .fin-scorre').forEach((x) => sc.push([x.id, x.scrollTop]));
    c.innerHTML = o.corpo();
    sc.forEach(([id, top]) => { if (id) { const x = document.getElementById(id); if (x) x.scrollTop = top; } });
    if (o.monta) o.monta();
  }
  function chiudiFinestra(o) {
    o = o || finestraInCima();
    if (!o) return;
    if (o.primaDiChiudere && o.primaDiChiudere() === false) return;
    const i = pila.indexOf(o);
    if (i >= 0) pila.splice(i, 1);
    if (o.el) o.el.remove();
    if (o.dopoChiusa) o.dopoChiusa();
  }
  AZ['chiudi-finestra'] = (el) => {
    const box = el.closest('.velo');
    const o = pila.find((x) => x.el === box);
    chiudiFinestra(o);
  };
  // MessageBox: testo, titolo, icona (domanda|avviso|info|errore), pulsanti [{t, az}], predefinito
  let msgAperto = null;
  function msgbox(o) {
    const box = document.getElementById('messaggi');
    const pulsanti = o.pulsanti || [{ t: 'OK' }];
    msgAperto = o;
    box.innerHTML = '<div class="velo" style="z-index:200"><div class="finestra" role="alertdialog" aria-modal="true"><div class="fin-titolo"><span>' + esc(o.titolo || '') + '</span><button class="x" data-az="msg-x" aria-label="Chiudi">✕</button></div>'
      + '<div class="msgbox"><div class="testo">' + (o.icona ? '<span class="icona ' + o.icona + '">' + (o.icona === 'domanda' ? '?' : o.icona === 'avviso' ? '!' : o.icona === 'errore' ? '✕' : 'i') + '</span>' : '') + '<div>' + esc(o.testo) + '</div></div>'
      + '<div class="piede">' + pulsanti.map((p, i) => '<button class="' + (i === (o.predefinito || 0) ? 'pred' : '') + '" data-az="msg-b" data-i="' + i + '">' + esc(p.t) + '</button>').join('') + '</div></div></div></div>';
    const pred = box.querySelector('button.pred'); if (pred) pred.focus({ preventScroll: true });
  }
  function chiudiMsg(i) {
    const o = msgAperto; if (!o) return;
    msgAperto = null;
    document.getElementById('messaggi').innerHTML = '';
    const pulsanti = o.pulsanti || [{ t: 'OK' }];
    const p = i === null ? (pulsanti.length === 1 ? pulsanti[0] : (pulsanti.find((x) => x.annulla) || null)) : pulsanti[i];
    if (p && p.az) p.az();
  }
  AZ['msg-b'] = (el) => chiudiMsg(Number(el.dataset.i));
  AZ['msg-x'] = () => chiudiMsg(null);
  const chiedi = (testo, titolo, siAz, opz) => msgbox(Object.assign({ testo, titolo, icona: 'domanda', pulsanti: [{ t: 'Sì', az: siAz }, { t: 'No', annulla: true }], predefinito: 0 }, opz || {}));
  const informa = (testo, titolo, icona) => msgbox({ testo, titolo: titolo || '', icona: icona || 'info' });
  function avviso(testo) {
    const box = document.getElementById('avvisi');
    const el = document.createElement('div');
    el.className = 'avviso'; el.setAttribute('role', 'status'); el.textContent = testo;
    box.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }
  // un file come quelli che il programma salva (Excel, CSV): sull'iPad finisce in «File»
  function scaricaFile(nome, testo, tipo) {
    try {
      const blob = new Blob(['\ufeff' + testo], { type: tipo || 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = nome;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    } catch (e) { informa('Il file non si è potuto salvare: ' + e.message, 'Esporta', 'errore'); }
  }
  // cartella di file in un .zip (come la cartella che il programma prepara per il commercialista)
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function scaricaZip(nome, files) {
    const enc = new TextEncoder(), parti = [], centrale = [];
    let off = 0;
    const d = new Date(), ora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), giorno = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach((f) => {
      const n = enc.encode(f.nome), dati = enc.encode((f.bom === false ? '' : '\ufeff') + f.testo), c = crc32(dati);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, ora, true); h.setUint16(12, giorno, true);
      h.setUint32(14, c, true); h.setUint32(18, dati.length, true); h.setUint32(22, dati.length, true); h.setUint16(26, n.length, true); h.setUint16(28, 0, true);
      parti.push(new Uint8Array(h.buffer), n, dati);
      const z = new DataView(new ArrayBuffer(46));
      z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true); z.setUint16(10, 0, true); z.setUint16(12, ora, true); z.setUint16(14, giorno, true);
      z.setUint32(16, c, true); z.setUint32(20, dati.length, true); z.setUint32(24, dati.length, true); z.setUint16(28, n.length, true); z.setUint32(42, off, true);
      centrale.push(new Uint8Array(z.buffer), n);
      off += 30 + n.length + dati.length;
    });
    const dimC = centrale.reduce((x, p) => x + p.length, 0);
    const fine = new DataView(new ArrayBuffer(22));
    fine.setUint32(0, 0x06054b50, true); fine.setUint16(8, files.length, true); fine.setUint16(10, files.length, true); fine.setUint32(12, dimC, true); fine.setUint32(16, off, true);
    try {
      const blob = new Blob(parti.concat(centrale, [new Uint8Array(fine.buffer)]), { type: 'application/zip' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    } catch (e) { informa('Il file non si è potuto salvare: ' + e.message, 'Esporta', 'errore'); }
  }
  const csv = (intestazioni, righe) => [intestazioni].concat(righe).map((r) => r.map((x) => { const s = String(x === null || x === undefined ? '' : x); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');

  // ---------- menu: come MainWindow.xaml ----------
  const MENU = [
    ['dashboard', 'Dashboard', 'dashboard'], ['analisi', 'Analisi', 'analisi'], ['vendite', 'Vendite — banco', 'banco'],
    ['scontrini', 'Cronologia scontrini', 'orologio'], ['articoli', 'Articoli', 'articoli'], ['categorie', 'Categorie', 'cartella'],
    ['clienti', 'Clienti', 'clienti'], ['fornitori', 'Fornitori', 'borsa'], ['carico', 'Carico merce', 'pacco'],
    ['ddt', 'Documenti trasporto', 'bus'], ['inventario', 'Inventario', 'spunta'], ['acquisti', 'Registro acquisti', 'scarica'],
    ['registro', 'Registro agrofarmaci', 'pagina'], ['scadenzario', 'Scadenzario', '€'], ['primanota', 'Prima nota', 'calcolatrice'],
    ['amministrazione', 'Amministrazione', 'amministrazione'], ['report', 'Report', 'report'], ['provvigioni', 'Provvigioni', '%'],
    ['fatture', 'Fatture', 'pagina'], ['cronologia', 'Cronologia', 'cronologia'], ['pec', 'PEC / Scarti SDI', 'posta'], ['cestino', 'Cestino', 'cestino'],
  ];
  const icMenu = (n) => (n.length <= 1 ? '<span class="glifo">' + n + '</span>' : ico(n));
  function disegnaMenu() {
    const app = document.getElementById('app');
    const ridotto = app.classList.contains('ridotto');
    const nav = document.getElementById('nav-dentro');
    if (!nav) return;
    nav.innerHTML = MENU.filter((m) => puoVedere(m[0])).map((m) =>
      '<button class="voce' + (corrente === m[0] ? ' attiva' : '') + '" data-az="vai" data-vista="' + m[0] + '"' + (ridotto ? ' title="' + esc(m[1]) + '"' : '') + (corrente === m[0] ? ' aria-current="page"' : '') + '><span class="ic">' + icMenu(m[2]) + '</span><span class="et">' + esc(m[1]) + '</span></button>').join('');
    const cassa = document.getElementById('btn-cassa');
    cassa.hidden = isAdmin();
    const inCassa = ruolo === 'cassa';
    cassa.innerHTML = ico(inCassa ? 'freccia-sx' : 'banco') + '<span>' + (inCassa ? 'Torna in officina' : 'Cassa') + '</span>';
    cassa.title = inCassa ? 'Torna in officina: scontrini, cassetto e chiusura di cassa tornano nascosti' : 'Attiva i comandi del registratore di cassa: scontrini, cassetto, chiusura di fine giornata';
    const admin = document.getElementById('btn-admin');
    admin.innerHTML = ico('lucchetto') + '<span class="et-ridotta">' + (isAdmin() ? 'Esci da amministratore' : 'Amministratore') + '</span>';
    admin.title = isAdmin() ? 'Torna a lavorare come prima (officina o cassa): Dashboard, Analisi, Report e Provvigioni tornano nascoste' : 'Sblocca Dashboard, Analisi, Report e Provvigioni (da amministratore gli scontrini non si emettono)';
    document.getElementById('operatore').textContent = '👤 ' + (operatore ? operatore.nome : 'operatore') + ' · ' + ruolo;
  }
  function disegnaGuscio() {
    const app = document.getElementById('app');
    if (pref('menu-ridotto', window.innerWidth < 1000 ? '1' : '0') === '1') app.classList.add('ridotto');
    const ridotto = app.classList.contains('ridotto');
    app.innerHTML = '<aside class="menu" aria-label="Menu" id="menu">'
      + '<div class="menu-testa"><div class="menu-titolo"><div class="t">' + esc(S.negozio.nome1) + '</div><div class="s">' + esc(S.negozio.nome2) + '</div></div>'
      + '<button class="btn-menu-icona" id="btn-riduci" data-az="riduci" title="' + (ridotto ? 'Riapre il menu con i nomi delle sezioni' : 'Restringe il menu alle sole icone: più spazio per il banco vendite') + '">' + ico(ridotto ? 'freccia' : 'indietro') + '</button></div>'
      + '<div class="nav" id="nav"><div class="nav-dentro" id="nav-dentro"></div></div>'
      + '<div class="menu-piede"><button class="btn-menu" id="btn-cassa" data-az="cassa"></button><button class="btn-menu ultimo" id="btn-admin" data-az="admin"></button>'
      + '<button class="btn-menu ultimo" id="btn-blocca" data-az="blocca" title="Blocca il programma (per esempio quando ti allontani) o cambia operatore: si rientra col PIN">' + ico('utente') + '<span class="et-ridotta">Blocca / cambia operatore</span></button>'
      + '<div class="menu-operatore" id="operatore"></div><div class="menu-versione">' + VERSIONE_PROGRAMMA + '</div></div></aside>'
      + '<main class="host" id="host"><div class="vista" id="vista"></div></main>'
      + '<div class="blocco" id="blocco" hidden><div class="blocco-dentro">' + ico('lucchetto') + '<div class="tit">Programma bloccato</div><div class="muto" id="blocco-info"></div><button class="btn primario" data-az="sblocca">Sblocca</button></div></div>';
    disegnaMenu();
  }
  AZ['riduci'] = () => {
    const app = document.getElementById('app');
    const r = !app.classList.contains('ridotto');
    app.classList.toggle('ridotto', r);
    setPref('menu-ridotto', r ? '1' : '0');
    const b = document.getElementById('btn-riduci');
    b.innerHTML = ico(r ? 'freccia' : 'indietro');
    b.title = r ? 'Riapre il menu con i nomi delle sezioni' : 'Restringe il menu alle sole icone: più spazio per il banco vendite';
    disegnaMenu(); adattaZoom();
  };
  AZ['cassa'] = () => {
    if (isAdmin()) return;
    ruolo = ruolo === 'cassa' ? 'officina' : 'cassa';
    setPref('ruolo-postazione', ruolo);   // questa postazione riparte da qui anche la prossima volta
    disegnaMenu();
    if (corrente === 'vendite') ridisegna();
  };
  AZ['admin'] = () => {
    if (isAdmin()) {
      ruolo = ruoloPostazione();
      disegnaMenu();
      if (SOLO_ADMIN.includes(corrente)) vai('vendite');
      else { if (VISTE[corrente] && VISTE[corrente].chiudiRiservati) VISTE[corrente].chiudiRiservati(); ridisegna(); }
      return;
    }
    // nella demo l'amministratore entra senza password (nel programma c'è la finestra «Accesso amministratore»)
    ruolo = 'amministratore';
    log('Accesso', 'Sbloccate le sezioni da amministratore');
    salva();
    disegnaMenu();
    vai('dashboard');
  };
  AZ['vai'] = (el) => vai(el.dataset.vista);
  AZ['blocca'] = () => blocca("dall'operatore");
  AZ['sblocca'] = () => chiediSblocco();

  // ---------- accesso con PIN e blocco (LoginWindow, MainWindow.Blocca) ----------
  let bloccato = false, ultimoInput = Date.now();
  function finestraLogin(sblocco, fatto) {
    const ops = S.operatori.filter((o) => o.attivo);
    let scelto = sblocco && operatore ? operatore.id : (Number(pref('ultimo-operatore', '')) || ops[0].id);
    if (!ops.some((o) => o.id === scelto)) scelto = ops[0].id;
    const o = finestra({
      titolo: sblocco ? 'Gestionale — Programma bloccato' : 'Gestionale — Accesso', larghezza: 440, senzaChiudi: !sblocco,
      corpo: () => '<div class="card" style="margin:22px;padding:20px 26px">'
        + '<div style="font-size:18px;font-weight:600">' + (sblocco ? 'Programma bloccato' : esc(S.negozio.titolo)) + '</div>'
        + '<div class="muto" style="margin:2px 0 16px">' + (sblocco ? 'Inserisci il tuo PIN per continuare: quello che era aperto resta com\'era. Se lavora un\'altra persona, scegli il suo nome.' : 'Chi sta lavorando? Ogni operazione resta firmata.') + '</div>'
        + '<div class="muto">Operatore</div><div style="margin:4px 0 12px">' + sel('id="login-op" style="font-size:14px"', ops.map((x) => [x.id, x.nome]), scelto) + '</div>'
        + '<div class="muto">PIN</div><input class="tb pwd" id="login-pin" type="password" inputmode="numeric" maxlength="8" data-invio="login-entra" autocomplete="off" style="margin:4px 0 4px;border-radius:0;border-color:#ABADB3">'
        + '<div id="login-msg" style="color:var(--rosso);font-size:12px;margin:2px 0 10px;min-height:16px"> </div>'
        + '<button class="btn primario" style="width:100%;padding:10px 0;font-size:14px" data-az="login-entra">' + (sblocco ? 'Sblocca' : 'Entra') + '</button></div>',
      monta: () => { const p = document.getElementById('login-pin'); if (p && !touch()) p.focus({ preventScroll: true }); },
    });
    AZ['login-entra'] = () => {
      // nella demo ogni PIN va bene: il programma vero controlla quello dell'operatore (4-8 cifre)
      const id = Number(document.getElementById('login-op').value);
      const op = S.operatori.find((x) => x.id === id);
      const torna = sblocco && operatore && operatore.id === op.id;
      operatore = { id: op.id, nome: op.nome };
      setPref('ultimo-operatore', String(op.id));
      if (!torna) ruolo = ruoloPostazione();
      log('Accesso', (sblocco ? 'Sblocco del programma: ' : 'Accesso di ') + op.nome + ' su IPAD-DEMO' + (sblocco && !torna ? ' (cambio operatore)' : ''));
      salva();
      chiudiFinestra(o);
      fatto();
    };
  }
  function blocca(motivo) {
    if (bloccato) return;
    bloccato = true;
    const d = new Date();
    document.getElementById('blocco').hidden = false;
    document.getElementById('blocco-info').textContent = 'Bloccato ' + motivo + ' alle ' + D.pad(d.getHours()) + ':' + D.pad(d.getMinutes())
      + (operatore ? ' (stava lavorando ' + operatore.nome + ')' : '') + '. Per continuare serve il PIN.';
    log('Accesso', 'Programma bloccato ' + motivo + ' su IPAD-DEMO');
    setTimeout(chiediSblocco, 50);
  }
  function chiediSblocco() {
    if (!bloccato || pila.some((x) => x.login)) return;
    const prima = ruolo;
    finestraLogin(true, () => {
      bloccato = false;
      document.getElementById('blocco').hidden = true;
      ultimoInput = Date.now();
      disegnaMenu();
      // se ora lavora chi non è amministratore, una sezione riservata rimasta aperta si chiude
      if (!isAdmin() && SOLO_ADMIN.includes(corrente)) vai('vendite');
      else if (prima !== ruolo) { if (VISTE[corrente] && VISTE[corrente].chiudiRiservati) VISTE[corrente].chiudiRiservati(); ridisegna(); }
    });
    finestraInCima().login = true;
  }
  function controllaInattivita() {
    const minuti = Number(S.impostazioni.bloccoMinuti) || 0;
    if (bloccato || !operatore || minuti <= 0 || Date.now() - ultimoInput < minuti * 60000) return;
    if (pila.length || msgAperto) return;   // con una finestra aperta sopra si aspetta che la chiudano
    blocca('per inattività');
  }

  // l'area di lavoro ha una misura minima (900 x 600 come il programma, di più per le viste che la
  // chiedono); su uno schermo più stretto del banco del negozio la schermata non cambia impaginazione:
  // si rimpicciolisce tutta, così l'iPad mostra esattamente quello che si vede sul computer
  function adattaZoom() {
    const host = document.getElementById('host'), vista = document.getElementById('vista');
    if (!host || !vista) return;
    vista.style.zoom = '';
    const v = VISTE[corrente] || {};
    // misure del riquadro intero: le barre di scorrimento comparse prima dello zoom non contano
    const w = host.offsetWidth, h = host.offsetHeight;
    // 1066 px = il banco del negozio (schermo da 1280 col menu aperto): sotto, tutta la schermata in scala
    const z = w < 1066 ? Math.max(0.5, w / 1066) : 1;
    if (z < 1) vista.style.zoom = String(z);
    const minW = Math.max(900, v.minW || 0), minH = Math.max(600, v.minH || 0);
    vista.style.minWidth = minW + 'px';
    vista.style.minHeight = minH + 'px';
    vista.style.height = v.scorre ? 'auto' : Math.max(minH, h / z) + 'px';
    vista.style.width = Math.max(minW, w / z) + 'px';
  }

  function vai(nome) {
    if (!VISTE[nome] || nome.startsWith('_')) nome = isAdmin() ? 'dashboard' : 'vendite';
    if (!puoVedere(nome)) nome = 'vendite';
    while (pila.length) chiudiFinestra(pila[pila.length - 1]);
    if (VISTE[corrente] && VISTE[corrente].lascia) VISTE[corrente].lascia();
    corrente = nome;
    // ogni sezione si riapre da capo, come nel programma (Host.Content = new …View())
    if (VISTE[nome].nuova) VISTE[nome].nuova();
    try { history.replaceState(null, '', '#' + nome); } catch (e) { /* niente */ }
    mostra(true);
  }
  function mostra(nuova) {
    const v = VISTE[corrente];
    const host = document.getElementById('host'), vista = document.getElementById('vista');
    const sc = nuova ? [0, 0] : [host.scrollTop, host.scrollLeft];
    const scDg = {};
    if (!nuova) vista.querySelectorAll('.dg[id], .scorri[id]').forEach((t) => { scDg[t.id] = [t.scrollTop, t.scrollLeft]; });
    vista.className = 'vista' + (v.scorre ? ' scorre' : '');
    try { vista.innerHTML = v.render(); if (v.monta) v.monta(nuova); }
    catch (e) { vista.innerHTML = '<div style="padding:20px" class="rosso-t">Questa schermata non si è aperta: ' + esc(e.message) + '</div>'; if (window.console) console.error(e); }
    adattaZoom();
    host.scrollTop = sc[0]; host.scrollLeft = sc[1];
    Object.keys(scDg).forEach((id) => { const t = document.getElementById(id); if (t) { t.scrollTop = scDg[id][0]; t.scrollLeft = scDg[id][1]; } });
    disegnaMenu();
  }
  const ridisegna = () => mostra(false);

  // ---------- eventi: un ascoltatore per tipo ----------
  function collegaEventi() {
    const b = document.body;
    b.addEventListener('click', (ev) => {
      document.querySelectorAll('.combo-lista:not([hidden])').forEach((l) => { if (!l.parentElement.contains(ev.target)) l.hidden = true; });
      const el = ev.target.closest('[data-az]');
      if (el && !el.disabled && AZ[el.dataset.az]) AZ[el.dataset.az](el, ev);
    });
    b.addEventListener('dblclick', (ev) => {
      const el = ev.target.closest('.dg-r[data-dg]');
      if (!el || ev.target.closest('input, select')) return;
      const t = TAB[el.dataset.dg];
      if (!t || !t.cfg.onDoppio) return;
      const r = t.cfg.righe.find((x) => String(t.cfg.chiave(x)) === el.dataset.r);
      if (r) t.cfg.onDoppio(r);
    });
    b.addEventListener('input', (ev) => { const el = ev.target.closest('[data-in]'); if (el && IN[el.dataset.in]) IN[el.dataset.in](el, ev); });
    b.addEventListener('change', (ev) => { const el = ev.target.closest('[data-ch]'); if (el && CH[el.dataset.ch]) CH[el.dataset.ch](el, ev); });
    b.addEventListener('focusin', (ev) => {
      const el = ev.target.closest('[data-focus="combo"]');
      if (el) { const c = COMBO[el.dataset.combo]; if (c) { c.testo = el.value; filtraCombo(el.dataset.combo, true); } }
    });
    b.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        document.querySelectorAll('.combo-lista').forEach((l) => { l.hidden = true; });
        if (msgAperto) chiudiMsg(null);
        else if (pila.length && !finestraInCima().senzaChiudi) chiudiFinestra();
      }
      if (ev.key === 'Enter') {
        const el = ev.target.closest('[data-invio]');
        if (el && AZ[el.dataset.invio]) { ev.preventDefault(); AZ[el.dataset.invio](el, ev); }
        else if (msgAperto && !ev.target.closest('input, textarea')) { ev.preventDefault(); chiudiMsg(msgAperto.predefinito || 0); }
      }
    });
    ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach((t) => window.addEventListener(t, () => { ultimoInput = Date.now(); }, { passive: true, capture: true }));
    setInterval(controllaInattivita, 15000);
    window.addEventListener('resize', () => { adattaZoom(); pila.forEach(adattaFinestra); });
    window.addEventListener('hashchange', () => { const n = location.hash.slice(1); if (n && n !== corrente && VISTE[n] && operatore && !bloccato) vai(n); });
  }

  // ---------- fogli dei documenti (come i PDF del programma) ----------
  function foglioDocumento(doc) {
    const n = S.negozio, c = cli(doc.clienteId) || {}, t = totaliRighe(doc.righe);
    const righe = doc.righe.map((r) => {
      const nu = r.prezzo / (1 + r.iva / 100) * (1 - (r.sconto || 0) / 100);
      return '<tr><td>' + esc(r.codice || '') + '</td><td>' + esc(r.descr) + (r.info ? '<br><small>' + esc(r.info) + '</small>' : '') + '</td><td>' + esc(r.um || 'PZ') + '</td><td class="n">' + qta(r.qta) + '</td>'
        + (doc.senzaPrezzi ? '' : '<td class="n">' + num(nu) + '</td><td class="n">' + (r.sconto ? dec(r.sconto) : '') + '</td><td class="n">' + num(nu * r.qta) + '</td><td class="n">' + r.iva + '</td>') + '</tr>';
    }).join('');
    const riep = t.riepilogo.map((x) => '<tr><td class="n">' + x.aliquota + '%</td><td class="n">' + num(x.imponibile) + '</td><td class="n">' + num(x.imposta) + '</td></tr>').join('');
    return '<div class="foglio-cornice"><div class="foglio"><div class="intesta"><div><div class="ditta">' + esc(n.ragione) + '</div>'
      + '<div>' + esc(n.indirizzo) + ' - ' + esc(n.cap) + ' ' + esc(n.citta) + ' (' + esc(n.prov) + ')</div><div>P.IVA ' + esc(n.piva) + ' - Tel. ' + esc(n.tel) + '</div><div>' + esc(n.email) + '</div></div>'
      + '<div class="box"><div class="et">' + (doc.tipoDoc === 'DDT' ? 'Destinatario' : 'Spett.le') + '</div><b>' + esc(c.nome || 'Cliente generico') + '</b><br>' + esc(c.indirizzo || '') + '<br>' + esc((c.cap || '') + ' ' + (c.citta || '') + (c.prov ? ' (' + c.prov + ')' : ''))
      + '<br>' + (c.piva ? 'P.IVA ' + esc(c.piva) : c.cf ? 'C.F. ' + esc(c.cf) : '') + '</div></div>'
      + '<div class="tipo"><span>' + esc(doc.titolo) + '</span><span>N. ' + esc(doc.numero) + '</span><span>del ' + dataIt(doc.data) + '</span></div>'
      + (doc.causaleTrasporto ? '<div>Causale del trasporto: <b>' + esc(doc.causaleTrasporto) + '</b></div>' : '')
      + '<table><thead><tr><th>Codice</th><th>Descrizione</th><th>UM</th><th class="n">Q.tà</th>' + (doc.senzaPrezzi ? '' : '<th class="n">Prezzo</th><th class="n">Sc.%</th><th class="n">Importo</th><th class="n">IVA</th>') + '</tr></thead><tbody>' + righe + '</tbody></table>'
      + (doc.note ? '<div style="margin-top:8px"><b>Note:</b> ' + esc(doc.note) + '</div>' : '')
      + (doc.extra || '')
      + (doc.senzaPrezzi ? '' : '<div class="piede"><div><table><thead><tr><th class="n">Aliquota</th><th class="n">Imponibile</th><th class="n">Imposta</th></tr></thead><tbody>' + riep + '</tbody></table>'
        + (doc.pagamento ? '<div class="box" style="margin-top:8px"><div class="et">Pagamento</div>' + esc(doc.pagamento) + (doc.scadenza ? ' - scadenza ' + dataIt(doc.scadenza) : '') + '<br>IBAN ' + esc(n.iban) + '</div>' : '') + '</div>'
        + '<div class="tot"><div><span>Imponibile</span><span>' + num(t.imponibile) + '</span></div><div><span>IVA</span><span>' + num(t.iva) + '</span></div><div><span>Totale documento €</span><span>' + num(t.totale) + '</span></div></div></div>')
      + (doc.tipoDoc === 'DDT' ? '<div class="firme"><div>Firma conducente</div><div>Firma vettore</div><div>Firma destinatario</div></div>' : '')
      + '</div></div>';
  }
  function apriDocumento(doc) {
    finestra({ titolo: (doc.file || (doc.titolo.replace(/ /g, '_') + '_' + String(doc.numero).replace(/\W+/g, '_'))) + '.pdf — Visualizzatore PDF', larghezza: 820, altezza: 700, corpo: foglioDocumento(doc), bianca: true });
  }
  function docDaFattura(f) {
    const m = metodo(f.metodoId), s = S.scadenze.find((x) => x.fatturaId === f.id);
    return { tipoDoc: f.tipo, titolo: f.tipo === 'FAC' ? 'FATTURA ACCOMPAGNATORIA' : f.tipo === 'NC' ? 'NOTA DI CREDITO' : 'FATTURA', numero: numeroFattura(f).replace(/^FT /, ''), data: f.data, clienteId: f.clienteId, righe: f.righe, note: f.note || '', pagamento: f.pagTesto || (m ? m.nome : ''), scadenza: s ? s.scadenza : '', file: 'Fattura_' + numeroFattura(f).replace(/\W+/g, '_') };
  }
  const docDaDdt = (d) => ({ tipoDoc: 'DDT', titolo: 'DOCUMENTO DI TRASPORTO', numero: d.numero + '/' + d.anno, data: d.data, clienteId: d.clienteId, righe: d.righe, causaleTrasporto: d.causale || 'VENDITA', note: d.note || '', file: 'DDT_' + d.numero + '_' + d.anno });

  // ---------- avvio ----------
  function avvia() {
    S = caricaStato();
    ST = D.storico(S, OGGI);
    indicizza();
    disegnaGuscio();
    collegaEventi();
    document.getElementById('app').style.visibility = 'hidden';
    // come il programma: prima l'accesso con operatore e PIN, poi la finestra principale
    finestraLogin(false, () => {
      document.getElementById('app').style.visibility = '';
      ultimoInput = Date.now();
      const h = location.hash.slice(1);
      corrente = VISTE[h] && !h.startsWith('_') && puoVedere(h) ? h : (isAdmin() ? 'dashboard' : 'vendite');
      if (VISTE[corrente].nuova) VISTE[corrente].nuova();
      mostra(true);
    });
    salva();
  }

  window.GF = {
    get S() { return S; }, get ST() { return ST; }, OGGI, VISTE, AZ, IN, CH, U, ui, TAB, COMBO, DP, D,
    fmt, eur, eur0, num, qta, dec, perc, z2, z0, dataIt, dataBreve, dataLunga, oraIt, esc, normalizza, leggiNum, leggiNumN, leggiData, MESI, MESI_LUNGHI, GIORNI, somma, r2, ico, adessoIso,
    art, cli, forn, cat, metodo, patentino, fattura, ddtDa, nuovoId, indicizza, margine, ricaricoMostrato, ricaricoDiverso, statoArticolo, sottocosto, sottoScorta,
    totaliRighe, totaleRiga, interpretaPagamento, scadenzaFattura, pagatoScad, residuo, patScaduto, saldoConto, log, numeroFattura, nomeSoggetto,
    get ruolo() { return ruolo; }, get operatore() { return operatore; }, isAdmin, puoVedere, puoUsareCassa, puoEmettere, SOLO_ADMIN,
    dg, aggiornaDg, rifaiDg, selezionato, selezionati, deseleziona, scegliRiga, rigaDa, righeDg, cmb, valoreCombo, testoCombo, filtraCombo, sel, chk, dp, dpImposta, valoreDp,
    finestra, aggiornaFinestra, chiudiFinestra, finestraInCima, msgbox, chiedi, informa, avviso, scaricaFile, scaricaZip, csv,
    vai, ridisegna, salva, disegnaMenu, foglioDocumento, apriDocumento, docDaFattura, docDaDdt,
    get corrente() { return corrente; },
  };
  document.addEventListener('DOMContentLoaded', avvia);
})();
