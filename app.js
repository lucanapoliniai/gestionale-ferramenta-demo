/* Nucleo della demo: stato, formati, componenti (tabelle con filtro per colonna, tendine che cercano,
   finestre, avvisi), barra laterale e passaggio fra le sezioni. Le sezioni sono in viste-*.js. */
(function () {
  'use strict';
  const D = window.GF_DATI;
  const ico = window.GF_ICONA;
  const CHIAVE = 'gestionale-ferramenta-demo';
  const VERSIONE = 3;

  // ---------- formati (come nel programma: 1.234,56 €) ----------
  function fmt(n, dec) {
    const x = Math.round((Number(n) || 0) * Math.pow(10, dec)) / Math.pow(10, dec);
    const s = Math.abs(x).toFixed(dec).split('.');
    const intero = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (x < 0 ? '-' : '') + intero + (dec ? ',' + s[1] : '');
  }
  const eur = (n) => fmt(n, 2) + ' €';
  const eur0 = (n) => fmt(n, 0) + ' €';
  const num = (n, d) => fmt(n, d === undefined ? 2 : d);
  const qta = (n) => (Math.abs(n - Math.round(n)) < 1e-9 ? fmt(n, 0) : fmt(n, 2));
  const perc = (n) => fmt(n, 1) + '%';
  const dataIt = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '');
  const oraIt = (s) => (s ? s.slice(11, 16) : '');
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normalizza = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const leggiNum = (s) => { const x = parseFloat(String(s || '').replace(/\./g, '').replace(',', '.')); return isFinite(x) ? x : 0; };
  const leggiNumSemplice = (s) => { const x = parseFloat(String(s || '').replace(',', '.')); return isFinite(x) ? x : 0; };
  const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const somma = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
  const r2 = D.r2;

  // ---------- stato ----------
  const OGGI = D.iso(new Date());
  let S = null;
  let ST = null;   // storico vendite per l'Analisi

  function caricaStato() {
    try {
      const t = localStorage.getItem(CHIAVE);
      if (t) {
        const s = JSON.parse(t);
        // i dati si rinnovano ogni giorno: la demo deve sembrare "di oggi" quando la si mostra
        if (s && s.versione === VERSIONE && s.generatoIl === OGGI) return s;
      }
    } catch (e) { /* senza memoria del browser la demo parte comunque */ }
    return D.genera(OGGI, new Date());
  }
  let timerSalva = null;
  function salva() {
    clearTimeout(timerSalva);
    timerSalva = setTimeout(() => { try { localStorage.setItem(CHIAVE, JSON.stringify(S)); } catch (e) { /* niente */ } }, 250);
  }
  function ripristina() {
    try { localStorage.removeItem(CHIAVE); } catch (e) { /* niente */ }
    S = D.genera(OGGI, new Date());
    ST = D.storico(S, OGGI);
    indicizza();
    Object.keys(U).forEach((k) => delete U[k]);
    Object.keys(TAB).forEach((k) => delete TAB[k]);
    Object.keys(COMBO).forEach((k) => delete COMBO[k]);
    salva();
  }

  // ---------- ricerche veloci ----------
  let IX = {};
  function indicizza() {
    IX = { art: {}, cli: {}, forn: {}, cat: {}, met: {}, fatt: {}, ddt: {}, pat: {} };
    S.articoli.forEach((x) => { IX.art[x.id] = x; });
    S.clienti.forEach((x) => { IX.cli[x.id] = x; });
    S.fornitori.forEach((x) => { IX.forn[x.id] = x; });
    S.categorie.forEach((x) => { IX.cat[x.id] = x; });
    S.metodi.forEach((x) => { IX.met[x.id] = x; });
    S.fatture.forEach((x) => { IX.fatt[x.id] = x; });
    S.ddt.forEach((x) => { IX.ddt[x.id] = x; });
    S.patentini.forEach((x) => { IX.pat[x.id] = x; });
    // i nuovi documenti prendono un numero interno dopo il piu' alto gia' usato
    let max = 0;
    ['articoli', 'clienti', 'fornitori', 'scontrini', 'ddt', 'fatture', 'scadenze', 'acquisti', 'primaNota', 'registro', 'cronologia', 'patentini'].forEach((k) => {
      (S[k] || []).forEach((x) => { if (x.id > max) max = x.id; });
    });
    if (max > prossimoId) prossimoId = max;
  }
  const art = (id) => IX.art[id];
  const cli = (id) => IX.cli[id];
  const forn = (id) => IX.forn[id];
  const cat = (id) => IX.cat[id];
  const metodo = (id) => IX.met[id];
  let prossimoId = 0;
  const nuovoId = () => ++prossimoId;

  // ---------- conti e regole del negozio ----------
  function margine(a, prezzo) {
    const p = prezzo === undefined ? a.prezzoA : prezzo;
    const netto = p / (1 + a.iva / 100);
    const m = netto - a.costo;
    return { netto, euro: m, perc: netto > 0 ? (m / netto) * 100 : 0, ric: a.costo > 0 ? (m / a.costo) * 100 : 0 };
  }
  const sottocosto = (a) => margine(a).euro < 0;
  const sottoScorta = (a) => a.scortaMin > 0 && a.giac < a.scortaMin;

  // totali di un documento: prezzi IVA compresa, scorporo per aliquota (come il programma)
  function totaliRighe(righe) {
    const perAliq = {};
    righe.forEach((r) => {
      const lordo = r.qta * r.prezzo * (1 - (r.sconto || 0) / 100);
      perAliq[r.iva] = (perAliq[r.iva] || 0) + lordo;
    });
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

  // scadenza: data della fattura + i giorni del pagamento (giorni esatti, come vuole il negozio)
  const scadenzaDa = (metodoId, data) => D.piuGiorni(data, metodo(metodoId) ? metodo(metodoId).giorni : 30);

  // pagamento scritto a mano: come InterpretaPagamento nel programma
  function interpretaPagamento(testo) {
    const t = String(testo || '').trim();
    if (!t) return null;
    const esatto = S.metodi.find((m) => normalizza(m.nome) === normalizza(t));
    if (esatto) return { metodoId: esatto.id, codice: esatto.fe, giorni: esatto.giorni };
    const s = normalizza(t);
    const codice = /contant|rimessa\s+diretta/.test(s) ? 'MP01' : /assegn/.test(s) ? 'MP02'
      : /\bri\.?\s?ba\b|ricevuta\s+bancaria/.test(s) ? 'MP12' : /\bsdd\b|sepa|addebito\s+diretto/.test(s) ? 'MP19'
        : /carta|\bpos\b|bancomat/.test(s) ? 'MP08' : 'MP05';
    let giorni = 0;
    const m = s.match(/(\d{1,3})(?:\s*\/\s*\d{1,3})*\s*(?:gg|g\.|gior)/);
    if (m) giorni = Number(m[1]);
    else { const m2 = s.match(/\b(30|60|90|120|150|180)\b/); if (m2) giorni = Number(m2[1]); }
    const trovato = S.metodi.find((x) => x.fe === codice && x.giorni === giorni);
    return { metodoId: trovato ? trovato.id : null, codice, giorni };
  }

  function residuo(s) { return r2(s.importo - s.pagato); }
  const statoPatentino = (p) => (p.scadenza < OGGI ? 'scaduto' : p.scadenza <= D.piuGiorni(OGGI, 60) ? 'in scadenza' : 'valido');

  // saldo di un conto: saldo iniziale + prima nota + incassi impliciti degli scontrini (come il programma)
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

  function log(tipo, descr) {
    const d = new Date();
    S.cronologia.unshift({ id: nuovoId(), quando: OGGI + 'T' + D.pad(d.getHours()) + ':' + D.pad(d.getMinutes()) + ':' + D.pad(d.getSeconds()), tipo, descr });
  }

  function fatturaNumero(f) { return (f.tipo === 'FAC' ? 'FAC ' : f.tipo === 'NC' ? 'NC ' : 'FT ') + f.numero + '/' + f.anno; }
  function statoPagamentoFattura(f) {
    const s = S.scadenze.find((x) => x.fatturaId === f.id);
    if (!s) return f.tipo === 'NC' ? '' : 'PAGATO';
    if (s.stato === 'PAGATA') return 'PAGATO';
    if (s.stato === 'PARZIALE') return 'PARZIALE';
    return s.scadenza < OGGI ? 'SCADUTO' : 'APERTO';
  }

  // ---------- stato delle sezioni ----------
  const U = {};          // scelte fatte in ogni sezione (filtri, righe scelte...), restano passando da una all'altra
  const ui = (nome, iniziale) => U[nome] || (U[nome] = iniziale());
  const VISTE = {};
  const AZ = {};         // azioni dei pulsanti: data-az="nome"
  const IN = {};         // campi che cambiano mentre si scrive: data-in="nome"
  const CH = {};         // tendine e caselle: data-ch="nome"
  let corrente = 'dashboard';

  // ---------- tabelle con filtro sotto ogni colonna (come ColumnFilter nel programma) ----------
  const TAB = {};
  function tabella(id, cfg) {
    const t = TAB[id] || (TAB[id] = { filtri: {}, ord: cfg.ordine || null, sel: null, limite: cfg.limite || 120 });
    t.cfg = cfg;
    const testa = cfg.colonne.map((c) => {
      const freccia = t.ord && t.ord.k === c.k ? (t.ord.dir > 0 ? '▲' : '▼') : '↕';
      return '<th class="' + (c.n ? 'n' : '') + '"' + (c.w ? ' style="min-width:' + c.w + 'px"' : '') + '>'
        + '<div class="testa-col"><span>' + esc(c.t) + '</span>'
        + (c.noOrd ? '' : '<button class="ordina" data-az="tab-ordina" data-tab="' + id + '" data-k="' + c.k + '" aria-label="Ordina per ' + esc(c.t) + '">' + freccia + '</button>')
        + '</div>'
        + (c.noFiltro ? '' : '<input data-in="tab-filtro" data-tab="' + id + '" data-k="' + c.k + '" value="' + esc(t.filtri[c.k] || '') + '" aria-label="Filtra ' + esc(c.t) + '" autocomplete="off" autocapitalize="off" spellcheck="false">')
        + '</th>';
    }).join('');
    return '<div class="tab" id="tab-' + id + '"' + (cfg.altezza ? ' style="max-height:' + cfg.altezza + '"' : '') + '><table><thead><tr>' + testa + '</tr></thead><tbody>' + corpoTab(id) + '</tbody></table></div>';
  }
  function valoreCol(c, r) { return c.v ? c.v(r) : r[c.k]; }
  function righeTab(id) {
    const t = TAB[id], cfg = t.cfg;
    let righe = cfg.righe;
    const filtri = Object.keys(t.filtri).filter((k) => (t.filtri[k] || '').trim());
    if (filtri.length) {
      righe = righe.filter((r) => filtri.every((k) => {
        const c = cfg.colonne.find((x) => x.k === k);
        if (!c) return true;
        const testo = c.testo ? c.testo(r) : valoreCol(c, r);
        return normalizza(testo).includes(normalizza(t.filtri[k]));
      }));
    }
    if (t.ord) {
      const c = cfg.colonne.find((x) => x.k === t.ord.k);
      if (c) righe = righe.slice().sort((a, b) => {
        const x = valoreCol(c, a), y = valoreCol(c, b);
        const xx = typeof x === 'string' ? normalizza(x) : x, yy = typeof y === 'string' ? normalizza(y) : y;
        return (xx > yy ? 1 : xx < yy ? -1 : 0) * t.ord.dir;
      });
    }
    return righe;
  }
  function corpoTab(id) {
    const t = TAB[id], cfg = t.cfg;
    const righe = righeTab(id);
    if (cfg.onConta) cfg.onConta(righe);
    if (!righe.length) return '<tr class="vuoto"><td colspan="' + cfg.colonne.length + '">' + esc(cfg.vuoto || 'Nessuna riga') + '</td></tr>';
    const vis = righe.slice(0, t.limite);
    let html = vis.map((r) => {
      const k = String(cfg.chiave(r));
      const cls = (t.sel === k ? 'scelta ' : '') + (cfg.classe ? cfg.classe(r) : '');
      return '<tr class="' + cls + '" data-az="tab-riga" data-tab="' + id + '" data-r="' + esc(k) + '">'
        + cfg.colonne.map((c) => '<td class="' + (c.n ? 'n ' : '') + (c.cls || '') + '">' + (c.f ? c.f(r) : esc(valoreCol(c, r))) + '</td>').join('') + '</tr>';
    }).join('');
    if (righe.length > vis.length) html += '<tr class="altri" data-az="tab-altri" data-tab="' + id + '"><td colspan="' + cfg.colonne.length + '">Mostra altre righe (ne restano ' + (righe.length - vis.length) + ')</td></tr>';
    return html;
  }
  function aggiornaTab(id) {
    const el = document.querySelector('#tab-' + id + ' tbody');
    if (el) el.innerHTML = corpoTab(id);
  }
  function rifaiTab(id) {
    const el = document.getElementById('tab-' + id);
    if (el && TAB[id]) { const sc = el.scrollTop; el.outerHTML = tabella(id, TAB[id].cfg); const n = document.getElementById('tab-' + id); if (n) n.scrollTop = sc; }
  }
  AZ['tab-ordina'] = (el, ev) => {
    ev.stopPropagation();
    const t = TAB[el.dataset.tab]; const k = el.dataset.k;
    t.ord = t.ord && t.ord.k === k ? { k, dir: -t.ord.dir } : { k, dir: 1 };
    rifaiTab(el.dataset.tab);
  };
  AZ['tab-riga'] = (el) => {
    const t = TAB[el.dataset.tab];
    t.sel = el.dataset.r;
    const r = t.cfg.righe.find((x) => String(t.cfg.chiave(x)) === t.sel);
    document.querySelectorAll('#tab-' + el.dataset.tab + ' tbody tr.scelta').forEach((x) => x.classList.remove('scelta'));
    el.classList.add('scelta');
    if (t.cfg.onSel && r) t.cfg.onSel(r);
  };
  AZ['tab-altri'] = (el) => { const t = TAB[el.dataset.tab]; t.limite += 150; aggiornaTab(el.dataset.tab); };
  IN['tab-filtro'] = (el) => {
    const t = TAB[el.dataset.tab];
    t.filtri[el.dataset.k] = el.value;
    t.limite = t.cfg.limite || 120;
    aggiornaTab(el.dataset.tab);
    if (t.cfg.onFiltra) t.cfg.onFiltra();
  };
  const selezionato = (id) => { const t = TAB[id]; if (!t || !t.sel) return null; return t.cfg.righe.find((x) => String(t.cfg.chiave(x)) === t.sel) || null; };

  // ---------- tendina che cerca "a pezzi" (come ComboRicerca nel programma) ----------
  const COMBO = {};
  function combo(id, cfg) {
    const c = COMBO[id] = Object.assign(COMBO[id] || { valore: null, testo: '' }, cfg);
    if (cfg.valore !== undefined) c.valore = cfg.valore;
    const v = c.valore !== null && c.valore !== undefined ? c.voci.find((x) => x.id === c.valore) : null;
    c.testo = v ? v.testo : (cfg.liberoTesto !== undefined ? cfg.liberoTesto : (c.libero ? c.testo : ''));
    return '<div class="combo" id="combo-' + id + '"><div class="cerca">' + ico('cerca')
      + '<input class="campo" id="ci-' + id + '" data-in="combo-scrivi" data-combo="' + id + '" value="' + esc(c.testo) + '" placeholder="' + esc(c.segnaposto || 'Scrivi una parte del nome') + '" autocomplete="off" autocapitalize="off" spellcheck="false" role="combobox" aria-expanded="false" aria-controls="cl-' + id + '"'
      + ' data-focus="combo-apri"></div><div class="combo-lista" id="cl-' + id + '" role="listbox" hidden></div></div>';
  }
  function filtraCombo(id) {
    const c = COMBO[id];
    const pezzi = normalizza(c.testo).split(/\s+/).filter(Boolean);
    const voci = c.voci.filter((v) => { const t = normalizza(v.testo + ' ' + (v.cerca || '') + ' ' + (v.sotto || '')); return pezzi.every((p) => t.includes(p)); }).slice(0, 60);
    const lista = document.getElementById('cl-' + id);
    if (!lista) return;
    let html = voci.map((v) => '<button type="button" class="combo-voce" role="option" data-az="combo-scegli" data-combo="' + id + '" data-v="' + esc(v.id) + '">' + esc(v.testo) + (v.sotto ? '<small>' + esc(v.sotto) + '</small>' : '') + '</button>').join('');
    if (!voci.length) html = c.libero ? '<div class="combo-voce muto">Nessuna voce dell\'elenco: resta il testo scritto</div>' : '<div class="combo-voce muto">Nessun risultato</div>';
    lista.innerHTML = html;
    lista.hidden = false;
    const inp = document.getElementById('ci-' + id); if (inp) inp.setAttribute('aria-expanded', 'true');
  }
  function chiudiCombo(id) {
    const l = document.getElementById('cl-' + id); if (l) l.hidden = true;
    const inp = document.getElementById('ci-' + id); if (inp) inp.setAttribute('aria-expanded', 'false');
  }
  IN['combo-scrivi'] = (el) => {
    const id = el.dataset.combo, c = COMBO[id];
    c.testo = el.value;
    const prima = c.valore;
    if (!c.libero || !c.voci.some((v) => v.testo === c.testo)) c.valore = null;
    if (c.libero) { const esatta = c.voci.find((v) => normalizza(v.testo) === normalizza(c.testo)); c.valore = esatta ? esatta.id : null; }
    filtraCombo(id);
    if (c.onScrivi) c.onScrivi(c.testo, c.valore);
    else if (prima !== c.valore && c.onScegli) c.onScegli(c.valore);
  };
  AZ['combo-scegli'] = (el) => {
    const id = el.dataset.combo, c = COMBO[id];
    const v = c.voci.find((x) => String(x.id) === el.dataset.v);
    if (!v) return;
    c.valore = v.id; c.testo = v.testo;
    const inp = document.getElementById('ci-' + id); if (inp) inp.value = v.testo;
    chiudiCombo(id);
    if (c.onScegli) c.onScegli(v.id);
  };

  // ---------- finestre, conferme, avvisi ----------
  let finestraAperta = null;
  function apriFinestra(o) {
    finestraAperta = o;
    const box = document.getElementById('finestre');
    box.innerHTML = '<div class="velo" data-az="velo-fuori"><div class="finestra' + (o.larga ? ' larga' : '') + '" role="dialog" aria-modal="true" aria-labelledby="fin-titolo">'
      + '<div class="finestra-testa"><h3 id="fin-titolo">' + esc(o.titolo) + '</h3><button class="bottone-icona" data-az="chiudi-finestra" aria-label="Chiudi">' + ico('chiudi') + '</button></div>'
      + '<div class="finestra-corpo" id="fin-corpo">' + (typeof o.corpo === 'function' ? o.corpo() : o.corpo) + '</div>'
      + (o.piede ? '<div class="finestra-piede" id="fin-piede">' + o.piede + '</div>' : '')
      + '</div></div>';
    const f = box.querySelector('.finestra button, .finestra input');
    if (f && o.fuoco !== false) setTimeout(() => { const prim = box.querySelector('[data-primo]') || f; prim.focus(); }, 30);
  }
  function aggiornaFinestra() {
    if (!finestraAperta) return;
    const c = document.getElementById('fin-corpo');
    if (c && typeof finestraAperta.corpo === 'function') c.innerHTML = finestraAperta.corpo();
    const p = document.getElementById('fin-piede');
    if (p && finestraAperta.piedeFn) p.innerHTML = finestraAperta.piedeFn();
  }
  function chiudiFinestra() { finestraAperta = null; document.getElementById('finestre').innerHTML = ''; }
  AZ['chiudi-finestra'] = () => chiudiFinestra();
  AZ['velo-fuori'] = (el, ev) => { if (ev.target === el) chiudiFinestra(); };

  // conferma dentro la pagina (nelle pagine pubblicate confirm() non esiste)
  function chiedi(o) {
    apriFinestra({
      titolo: o.titolo, corpo: '<p style="margin:0">' + o.testo + '</p>',
      piede: '<button class="btn" data-az="chiudi-finestra">' + esc(o.no || 'Annulla') + '</button>'
        + '<button class="btn ' + (o.pericolo ? 'pericolo' : 'primario') + '" data-az="conferma-si" data-primo>' + esc(o.si || 'Conferma') + '</button>',
    });
    AZ['conferma-si'] = () => { chiudiFinestra(); o.onSi(); };
  }

  function avviso(testo, tipo) {
    const box = document.getElementById('avvisi');
    const el = document.createElement('div');
    el.className = 'avviso ' + (tipo || 'ok');
    el.setAttribute('role', 'status');
    el.innerHTML = ico(tipo === 'errore' ? 'avviso' : 'spunta') + '<div>' + testo + '</div>';
    box.appendChild(el);
    setTimeout(() => el.remove(), tipo === 'errore' ? 5200 : 3600);
  }

  // ---------- guscio: barra laterale e area di lavoro ----------
  const MENU = [
    ['dashboard', 'Dashboard', 'dashboard'],
    ['analisi', 'Analisi', 'analisi'],
    ['vendite', 'Vendite — banco', 'banco'],
    ['articoli', 'Articoli', 'articoli'],
    ['clienti', 'Clienti', 'clienti'],
    ['fornitori', 'Fornitori', 'fornitori'],
    ['ddt', 'Documenti trasporto', 'ddt'],
    ['inventario', 'Inventario', 'inventario'],
    ['registro', 'Registro agrofarmaci', 'agrofarmaci'],
    ['scadenzario', 'Scadenzario', 'scadenzario'],
    ['primanota', 'Prima nota', 'primanota'],
    ['amministrazione', 'Amministrazione', 'amministrazione'],
    ['fatture', 'Fatture', 'fatture'],
    ['cronologia', 'Cronologia', 'cronologia'],
  ];
  function conteggiMenu() {
    return {
      fatture: S.fatture.filter((f) => f.sdi === 'GENERATO' || f.sdi === 'SCARTATO').length,
      scadenzario: S.scadenze.filter((s) => s.tipo === 'ATTIVA' && s.stato !== 'PAGATA' && s.scadenza < OGGI).length,
    };
  }
  function disegnaBarra() {
    const n = conteggiMenu();
    const voci = MENU.map((m) => {
      const conta = m[0] === 'fatture' && n.fatture ? '<span class="conta">' + n.fatture + '</span>'
        : m[0] === 'scadenzario' && n.scadenzario ? '<span class="conta rossa">' + n.scadenzario + '</span>' : '';
      return '<button class="voce' + (corrente === m[0] ? ' attiva' : '') + '" data-az="vai" data-vista="' + m[0] + '" aria-current="' + (corrente === m[0] ? 'page' : 'false') + '" title="' + esc(m[1]) + '">' + ico(m[2]) + '<span>' + esc(m[1]) + '</span>' + conta + '</button>';
    }).join('');
    document.getElementById('nav').innerHTML = voci;
    const info = document.getElementById('voce-info');
    if (info) info.classList.toggle('attiva', corrente === 'informazioni');
  }
  function disegnaGuscio() {
    document.getElementById('app').innerHTML =
      '<aside class="barra" aria-label="Menu">'
      + '<div class="barra-testa"><div class="testi"><div class="nome">' + esc(S.negozio.nome) + '</div><div class="sotto">' + esc(S.negozio.sotto) + '</div>'
      + '<div class="demo-chip">DEMO · dati inventati</div></div>'
      + '<button class="bottone-icona" data-az="menu" aria-label="Apri o chiudi il menu">' + ico('menu') + '</button></div>'
      + '<nav class="nav" id="nav"></nav>'
      + '<div class="barra-piede"><button class="voce" id="voce-info" data-az="vai" data-vista="informazioni" title="Informazioni">' + ico('info') + '<span>Informazioni e contatti</span></button>'
      + '<div class="riga">Gestionale per ferramenta e agrarie · v1.0</div></div>'
      + '</aside><div class="velo-menu" data-az="menu-chiudi"></div>'
      + '<div class="lavoro"><div class="testa-mobile"><button class="bottone-icona" data-az="menu" aria-label="Apri il menu">' + ico('menu') + '</button>'
      + '<div><div class="t">' + esc(S.negozio.nome) + '</div><div class="s">DEMO · dati inventati</div></div></div>'
      + '<main class="pagina" id="pagina" tabindex="-1"></main></div>';
    disegnaBarra();
  }
  AZ['menu'] = () => document.getElementById('app').classList.toggle('menu-aperto');
  AZ['menu-chiudi'] = () => document.getElementById('app').classList.remove('menu-aperto');
  AZ['vai'] = (el) => vai(el.dataset.vista, el.dataset.dopo);

  let azionePendente = null;
  function vai(nome, dopo) {
    if (!VISTE[nome]) nome = 'dashboard';
    document.getElementById('app').classList.remove('menu-aperto');
    if (finestraAperta) chiudiFinestra();
    azionePendente = dopo || null;
    if (corrente === nome && location.hash === '#' + nome) { mostra(); return; }
    corrente = nome;
    try { history.replaceState(null, '', '#' + nome); } catch (e) { /* niente */ }
    mostra(true);
  }
  function mostra(nuova) {
    const v = VISTE[corrente];
    const pag = document.getElementById('pagina');
    const sc = nuova ? 0 : pag.scrollTop;
    // ridisegnando la stessa sezione, le tabelle restano dove le si era fatte scorrere
    const scTab = {};
    if (!nuova) pag.querySelectorAll('.tab[id]').forEach((t) => { scTab[t.id] = [t.scrollTop, t.scrollLeft]; });
    try {
      pag.innerHTML = v.render();
      if (v.monta) v.monta();
    } catch (e) {
      pag.innerHTML = '<div class="messaggio rosso">' + ico('avviso') + '<div>Questa schermata non si è aperta: ' + esc(e.message) + '</div></div>';
      if (window.console) console.error(e);
    }
    pag.scrollTop = sc;
    Object.keys(scTab).forEach((id) => { const t = document.getElementById(id); if (t) { t.scrollTop = scTab[id][0]; t.scrollLeft = scTab[id][1]; } });
    disegnaBarra();
    if (azionePendente && AZ[azionePendente]) { const a = azionePendente; azionePendente = null; AZ[a](document.body, { stopPropagation() {} }); }
  }
  const ridisegna = () => mostra(false);

  // ---------- eventi: un solo ascoltatore per tipo ----------
  function collegaEventi() {
    const app = document.body;
    app.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-az]');
      // chiude le tendine aperte toccando fuori
      document.querySelectorAll('.combo-lista:not([hidden])').forEach((l) => { if (!l.parentElement.contains(ev.target)) l.hidden = true; });
      if (!el) return;
      const f = AZ[el.dataset.az];
      if (f) f(el, ev);
    });
    app.addEventListener('input', (ev) => {
      const el = ev.target.closest('[data-in]');
      if (el && IN[el.dataset.in]) IN[el.dataset.in](el, ev);
    });
    app.addEventListener('change', (ev) => {
      const el = ev.target.closest('[data-ch]');
      if (el && CH[el.dataset.ch]) CH[el.dataset.ch](el, ev);
    });
    app.addEventListener('focusin', (ev) => {
      const el = ev.target.closest('[data-focus="combo-apri"]');
      if (el) { const c = COMBO[el.dataset.combo]; if (c) { c.testo = el.value; filtraCombo(el.dataset.combo); } }
    });
    app.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { if (finestraAperta) chiudiFinestra(); document.querySelectorAll('.combo-lista').forEach((l) => { l.hidden = true; }); }
      if (ev.key === 'Enter') {
        const el = ev.target.closest('[data-invio]');
        if (el && AZ[el.dataset.invio]) { ev.preventDefault(); AZ[el.dataset.invio](el, ev); }
      }
    });
    window.addEventListener('hashchange', () => { const n = location.hash.slice(1); if (n && n !== corrente && VISTE[n]) { corrente = n; mostra(true); } });
  }

  // ---------- fogli dei documenti (come i PDF del programma) ----------
  function foglioDocumento(doc) {
    const n = S.negozio;
    const c = cli(doc.clienteId) || {};
    const t = totaliRighe(doc.righe);
    const tipo = doc.tipoDoc;
    const righe = doc.righe.map((r) => {
      const nettoUnit = r.prezzo / (1 + r.iva / 100) * (1 - (r.sconto || 0) / 100);
      return '<tr><td>' + esc(r.um || 'PZ') + '</td><td class="n">' + qta(r.qta) + '</td><td>' + esc(r.descr) + '</td><td class="n">' + r.iva + '%</td><td class="n">' + num(nettoUnit) + '</td><td class="n">' + num(nettoUnit * r.qta) + '</td></tr>';
    }).join('');
    const riep = t.riepilogo.map((x) => '<tr><td class="n">' + x.aliquota + '%</td><td class="n">' + num(x.imponibile) + '</td><td class="n">' + num(x.imposta) + '</td></tr>').join('');
    const pag = doc.pagamento ? '<div class="box" style="margin-top:10px"><div class="et">Pagamento</div>' + esc(doc.pagamento) + (doc.scadenza ? ' · scadenza ' + dataIt(doc.scadenza) : '') + '<br>IBAN ' + esc(n.iban) + '</div>' : '';
    const extra = doc.causale ? '<div class="box" style="margin-top:10px"><div class="et">Causale</div>' + esc(doc.causale) + '</div>' : '';
    return '<div class="foglio-cornice"><div class="foglio">'
      + '<div class="intesta"><div><div class="logo"><div class="logo-segno">FR</div><div><div class="ditta">' + esc(n.ragione) + '</div>'
      + '<div>' + esc(n.indirizzo) + ' · ' + esc(n.cap) + ' ' + esc(n.citta) + ' (' + esc(n.prov) + ')</div><div>P.IVA ' + esc(n.piva) + ' · Tel. ' + esc(n.tel) + '</div><div>' + esc(n.email) + '</div></div></div></div>'
      + '<div class="box"><div class="et">' + (tipo === 'DDT' ? 'Destinatario' : 'Cliente') + '</div><strong>' + esc(c.nome || 'Cliente generico') + '</strong><br>' + esc(c.indirizzo || '') + '<br>' + esc((c.cap || '') + ' ' + (c.citta || '') + (c.prov ? ' (' + c.prov + ')' : ''))
      + '<br>' + (c.piva ? 'P.IVA ' + esc(c.piva) : c.cf ? 'C.F. ' + esc(c.cf) : '') + (c.sdi && c.sdi !== '0000000' ? '<br>Codice SDI ' + esc(c.sdi) : c.pec ? '<br>PEC ' + esc(c.pec) : '') + '</div></div>'
      + '<div class="tipo"><span>' + esc(doc.titolo) + '</span><span>N. ' + esc(doc.numero) + '</span><span>del ' + dataIt(doc.data) + '</span></div>'
      + '<table><thead><tr><th>UM</th><th class="n">Q.tà</th><th>Descrizione</th><th class="n">IVA</th><th class="n">Prezzo unit.</th><th class="n">Totale</th></tr></thead><tbody>' + righe + '</tbody></table>'
      + '<div class="piede"><div>' + (tipo === 'DDT' ? '' : '<table><thead><tr><th class="n">Aliquota</th><th class="n">Imponibile</th><th class="n">Imposta</th></tr></thead><tbody>' + riep + '</tbody></table>') + extra + pag + '</div>'
      + '<div class="tot"><div><span>Imponibile</span><span>' + num(t.imponibile) + '</span></div><div><span>IVA</span><span>' + num(t.iva) + '</span></div><div><span>Totale documento</span><span>' + eur(t.totale) + '</span></div></div></div>'
      + '</div></div>';
  }
  function apriDocumento(doc, extraPiede) {
    apriFinestra({
      titolo: doc.titolo + ' n. ' + doc.numero, larga: true, corpo: foglioDocumento(doc),
      piede: (extraPiede || '') + '<button class="btn primario" data-az="chiudi-finestra">Chiudi</button>',
    });
  }
  function docDaFattura(f) {
    const m = metodo(f.metodoId);
    const s = S.scadenze.find((x) => x.fatturaId === f.id);
    return {
      tipoDoc: f.tipo, titolo: f.tipo === 'FAC' ? 'Fattura accompagnatoria' : f.tipo === 'NC' ? 'Nota di credito' : 'Fattura',
      numero: (f.tipo === 'FAC' ? 'FAC ' : '') + f.numero + '/' + f.anno, data: f.data, clienteId: f.clienteId, righe: f.righe,
      causale: f.causale && f.causale !== 'Vendita' ? f.causale : '', pagamento: f.pagamentoTesto || (m ? m.nome : ''), scadenza: s ? s.scadenza : '',
    };
  }
  function docDaDdt(d) {
    return { tipoDoc: 'DDT', titolo: 'Documento di trasporto', numero: d.numero + '/' + (d.anno || d.data.slice(0, 4)), data: d.data, clienteId: d.clienteId, righe: d.righe, causale: d.causale || 'Vendita' };
  }

  // ---------- avvio ----------
  function avvia() {
    S = caricaStato();
    ST = D.storico(S, OGGI);
    indicizza();
    disegnaGuscio();
    collegaEventi();
    const h = location.hash.slice(1);
    corrente = VISTE[h] ? h : 'dashboard';
    mostra(true);
    salva();
  }

  window.GF = {
    get S() { return S; }, get ST() { return ST; }, OGGI, VISTE, AZ, IN, CH, U, TAB, COMBO, ui,
    fmt, eur, eur0, num, qta, perc, dataIt, oraIt, esc, normalizza, leggiNum, leggiNumSemplice, MESI, MESI_LUNGHI, GIORNI, somma, r2, ico, D,
    art, cli, forn, cat, metodo, nuovoId, indicizza, margine, sottocosto, sottoScorta, totaliRighe, totaleRiga, scadenzaDa, interpretaPagamento,
    residuo, statoPatentino, saldoConto, log, fatturaNumero, statoPagamentoFattura,
    tabella, aggiornaTab, rifaiTab, selezionato, combo, chiudiCombo, apriFinestra, aggiornaFinestra, chiudiFinestra, chiedi, avviso,
    vai, ridisegna, salva, ripristina, disegnaBarra, foglioDocumento, apriDocumento, docDaFattura, docDaDdt, avvia,
  };
  document.addEventListener('DOMContentLoaded', avvia);
})();
