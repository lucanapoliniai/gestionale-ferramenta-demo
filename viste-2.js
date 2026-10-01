/* Articoli, Inventario, Clienti, Fornitori, Documenti di trasporto */
(function () {
  'use strict';
  const G = window.GF;
  const { esc, eur, eur0, num, qta, perc, dataIt, ico, somma, r2 } = G;
  const A = G.AZ;

  // =====================================================================
  // ARTICOLI
  // =====================================================================
  const uArt = () => G.ui('articoli', () => ({ cerca: '', cat: 0, critico: false, scorta: false, enol: false, sel: null, prezzo: '', obiettivo: '35' }));
  function righeArticoli(u) {
    const S = G.S;
    const pezzi = G.normalizza(u.cerca).split(/\s+/).filter(Boolean);
    return S.articoli.filter((a) => {
      if (u.cat && a.cat !== u.cat) return false;
      if (u.critico && G.margine(a).perc >= 10) return false;
      if (u.scorta && !G.sottoScorta(a)) return false;
      if (u.enol && !(G.cat(a.cat).codice === 'ENOL' && !a.scadenza)) return false;
      if (pezzi.length) {
        const t = G.normalizza(a.codice + ' ' + a.descr + ' ' + a.barcode + ' ' + (G.forn(a.forn) || {}).nome);
        if (!pezzi.every((p) => t.includes(p))) return false;
      }
      return true;
    });
  }
  function riassuntoArticoli(righe) {
    const S = G.S;
    const ric = righe.length ? somma(righe, (a) => G.margine(a).ric) / righe.length : 0;
    const enolSenza = S.articoli.filter((a) => G.cat(a.cat).codice === 'ENOL' && !a.scadenza).length;
    return righe.length + ' articoli · ricarico A medio ' + perc(ric) + ' · ' + S.articoli.filter(G.sottocosto).length + ' sottocosto · '
      + S.articoli.filter(G.sottoScorta).length + ' sotto scorta' + (enolSenza ? ' · <span class="ambra-t">⚠ ' + enolSenza + ' enologici senza scadenza</span>' : '');
  }
  function calcolatore(a, u) {
    const prezzo = u.prezzo !== '' ? G.leggiNum(u.prezzo) : a.prezzoA;
    const m = G.margine(a, prezzo);
    const ob = G.leggiNumSemplice(u.obiettivo) || 0;
    const pOb = ob < 100 ? (a.costo / (1 - ob / 100)) * (1 + a.iva / 100) : 0;
    const col = (v) => (v < 0 ? 'rosso-t' : v < 10 ? 'ambra-t' : 'verde-t');
    return '<div class="riga-campi" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">'
      + '<div class="campo-blocco"><span class="etichetta">Margine €</span><strong class="' + col(m.perc) + '" style="font-size:20px">' + eur(m.euro) + '</strong></div>'
      + '<div class="campo-blocco"><span class="etichetta">Margine %</span><strong class="' + col(m.perc) + '" style="font-size:20px">' + perc(m.perc) + '</strong></div>'
      + '<div class="campo-blocco"><span class="etichetta">Ricarico %</span><strong style="font-size:20px">' + perc(m.ric) + '</strong></div>'
      + '<div class="campo-blocco"><span class="etichetta">Prezzo obiettivo</span><strong class="verde-t" style="font-size:20px">' + eur(pOb) + '</strong></div>'
      + '</div>';
  }
  function schedaCalcolatore(u) {
    const a = u.sel ? G.art(u.sel) : null;
    if (!a) return '<div class="scheda muto" id="art-calc">Tocca un articolo nell\'elenco: qui sotto calcoli il margine, cambi il prezzo e lo salvi.</div>';
    const f = G.forn(a.forn) || {};
    return '<div class="scheda" id="art-calc"><div class="testa-scheda"><h2>' + esc(a.codice) + ' · ' + esc(a.descr) + '</h2><span class="destra">' + esc(f.nome || '') + ' · ultimo acquisto ' + dataIt(a.ultimoAcq) + '</span></div>'
      + '<div class="riga-flex" style="align-items:flex-end;gap:14px">'
      + '<div class="campo-blocco" style="width:150px"><label class="etichetta" for="art-prezzo">Prezzo (IVA incl.)</label><input class="campo" id="art-prezzo" inputmode="decimal" data-in="art-calc" value="' + esc(u.prezzo !== '' ? u.prezzo : num(a.prezzoA)) + '"></div>'
      + '<div class="campo-blocco" style="width:120px"><label class="etichetta" for="art-obiettivo">Obiettivo %</label><input class="campo" id="art-obiettivo" inputmode="decimal" data-in="art-obiettivo" value="' + esc(u.obiettivo) + '"></div>'
      + '<div class="campo-blocco"><span class="etichetta">Costo · IVA · giacenza</span><span style="line-height:44px">' + eur(a.costo) + ' · ' + a.iva + '% · ' + qta(a.giac) + ' ' + esc(a.um) + '</span></div>'
      + '<div class="campo-blocco"><span class="etichetta">Listini B · C</span><span style="line-height:44px">' + eur(a.prezzoB) + ' · ' + eur(a.prezzoC) + '</span></div>'
      + '<span class="spazio"></span><button class="btn" data-az="art-usa-obiettivo">Usa obiettivo</button><button class="btn primario" data-az="art-salva-prezzo">Salva prezzo</button></div>'
      + '<div id="art-calc-val" style="margin-top:14px">' + calcolatore(a, u) + '</div></div>';
  }

  G.VISTE.articoli = {
    render() {
      const S = G.S, u = uArt();
      const righe = righeArticoli(u);
      const cats = '<option value="0">Tutte le categorie</option>' + S.categorie.map((c) => '<option value="' + c.id + '"' + (u.cat === c.id ? ' selected' : '') + '>' + esc(c.codice + ' — ' + c.nome) + '</option>').join('');
      const inter = (k, testo) => '<button class="interruttore' + (u[k] ? ' acceso' : '') + '" data-az="art-filtro" data-k="' + k + '" aria-pressed="' + !!u[k] + '"><span class="pallino"></span>' + testo + '</button>';
      return '<div class="titolo-pagina"><h1>Articoli</h1><span class="spinta"></span><div class="strumenti">'
        + '<button class="btn" data-az="art-modifica"' + (u.sel ? '' : ' disabled') + '>Modifica</button><button class="btn primario" data-az="art-nuovo">' + ico('piu') + 'Nuovo articolo</button></div></div>'
        + '<div class="riga-flex" style="margin-bottom:12px"><div class="cerca" style="flex:1;min-width:240px">' + ico('cerca') + '<input class="campo" id="art-cerca" data-in="art-cerca" value="' + esc(u.cerca) + '" placeholder="Cerca codice, descrizione, barcode o fornitore" aria-label="Cerca articoli" autocomplete="off" autocapitalize="off" spellcheck="false"></div>'
        + '<select class="campo" style="width:auto;min-width:220px" data-ch="art-cat" aria-label="Categoria">' + cats + '</select></div>'
        + '<div class="riga-flex" style="margin-bottom:10px">' + inter('critico', 'solo margine critico') + inter('scorta', 'solo sotto scorta') + inter('enol', 'enologici senza scadenza') + '</div>'
        + '<div class="piede-tab" id="art-riassunto" style="padding:0 2px 10px">' + riassuntoArticoli(righe) + '</div>'
        + G.tabella('articoli', {
          righe, chiave: (a) => a.id, altezza: 'calc(100vh - 470px)', vuoto: 'Nessun articolo con questi filtri',
          classe: (a) => (G.sottocosto(a) ? 'tinta-rossa' : ''),
          colonne: [
            // il barcode sta sotto il codice: sull'iPad cosi' prezzo e ricarico restano a vista
            { k: 'codice', t: 'Codice', testo: (a) => a.codice + ' ' + a.barcode, f: (a) => '<span class="mono">' + esc(a.codice) + '</span>' + (a.barcode ? '<div class="sotto-cella mono">' + esc(a.barcode) + '</div>' : ''), w: 106 },
            { k: 'descr', t: 'Descrizione', cls: 'lungo', w: 180 },
            { k: 'giac', t: 'Giac.', n: true, f: (a) => '<span class="' + (G.sottoScorta(a) ? 'rosso-t' : '') + '">' + qta(a.giac) + '</span>', w: 56 },
            { k: 'forn', t: 'Fornitore', v: (a) => (G.forn(a.forn) || {}).nome || '', cls: 'due-righe', w: 120 },
            { k: 'costo', t: 'Costo', n: true, f: (a) => num(a.costo), w: 64 },
            { k: 'prezzoA', t: 'Prezzo', n: true, f: (a) => num(a.prezzoA), w: 64 },
            { k: 'ric', t: 'Ric. A %', n: true, v: (a) => G.margine(a).ric, f: (a) => { const r = G.margine(a).ric; return '<strong class="' + (r < 0 ? 'rosso-t' : r < 12 ? 'ambra-t' : 'verde-t') + '">' + G.fmt(r, 1) + '</strong>'; }, w: 70 },
            { k: 'scadenza', t: 'Scadenza', v: (a) => a.scadenza || '', f: (a) => (a.scadenza ? '<span class="' + (a.scadenza < G.OGGI ? 'rosso-t' : a.scadenza < G.D.piuGiorni(G.OGGI, 90) ? 'ambra-t' : '') + '">' + dataIt(a.scadenza) + '</span>' : ''), w: 82 },
          ],
          onSel: (a) => { u.sel = a.id; u.prezzo = ''; const box = document.getElementById('art-calc'); if (box) box.outerHTML = schedaCalcolatore(u); const b = document.querySelector('[data-az="art-modifica"]'); if (b) b.disabled = false; },
          // il riassunto segue anche i filtri scritti sotto le colonne
          onConta: (visibili) => { const el = document.getElementById('art-riassunto'); if (el) el.innerHTML = riassuntoArticoli(visibili); },
        })
        + '<div style="margin-top:14px">' + schedaCalcolatore(u) + '</div>';
    },
    monta() { G.aggiornaTab('articoli'); },
    mostraArticolo(id) {
      const u = uArt();
      Object.assign(u, { cerca: '', cat: 0, critico: false, scorta: false, enol: false, sel: id, prezzo: '' });
      if (G.TAB.articoli) { G.TAB.articoli.filtri = {}; G.TAB.articoli.sel = String(id); G.TAB.articoli.limite = 1000; }
      G.ridisegna();
      const riga = document.querySelector('#tab-articoli tr[data-r="' + id + '"]');
      if (riga) riga.scrollIntoView({ block: 'center' });
    },
  };
  G.IN['art-cerca'] = (el) => {
    const u = uArt(); u.cerca = el.value;
    const t = G.TAB.articoli; if (!t) return;
    t.cfg.righe = righeArticoli(u); t.limite = 120;
    G.aggiornaTab('articoli');
  };
  G.CH['art-cat'] = (el) => { uArt().cat = Number(el.value); G.ridisegna(); };
  A['art-filtro'] = (el) => { const u = uArt(); u[el.dataset.k] = !u[el.dataset.k]; G.ridisegna(); };
  A['art-sottocosto'] = () => { const u = uArt(); Object.assign(u, { critico: true, scorta: false, enol: false, cerca: '' }); G.ridisegna(); };
  A['art-scorta'] = () => { const u = uArt(); Object.assign(u, { scorta: true, critico: false, enol: false, cerca: '' }); G.ridisegna(); };
  G.IN['art-calc'] = (el) => { const u = uArt(); u.prezzo = el.value; const a = G.art(u.sel); const b = document.getElementById('art-calc-val'); if (a && b) b.innerHTML = calcolatore(a, u); };
  G.IN['art-obiettivo'] = (el) => { const u = uArt(); u.obiettivo = el.value; const a = G.art(u.sel); const b = document.getElementById('art-calc-val'); if (a && b) b.innerHTML = calcolatore(a, u); };
  A['art-usa-obiettivo'] = () => {
    const u = uArt(), a = G.art(u.sel); if (!a) return;
    const ob = G.leggiNumSemplice(u.obiettivo) || 0;
    const p = r2((a.costo / (1 - ob / 100)) * (1 + a.iva / 100));
    u.prezzo = num(p);
    const box = document.getElementById('art-calc'); if (box) box.outerHTML = schedaCalcolatore(u);
  };
  A['art-salva-prezzo'] = () => {
    const u = uArt(), a = G.art(u.sel); if (!a) return;
    const p = u.prezzo !== '' ? G.leggiNum(u.prezzo) : a.prezzoA;
    if (!(p > 0)) { G.avviso('Scrivi un prezzo maggiore di zero.', 'errore'); return; }
    const prima = a.prezzoA;
    a.prezzoA = r2(p); u.prezzo = '';
    G.log('Articoli', 'Prezzo di ' + a.codice + ' da ' + eur(prima) + ' a ' + eur(a.prezzoA) + ' · ricarico A ' + perc(G.margine(a).ric));
    G.salva(); G.ridisegna();
    G.avviso('Prezzo salvato: ' + esc(a.codice) + ' a ' + eur(a.prezzoA) + ' · margine ' + perc(G.margine(a).perc));
  };

  function formArticolo(a) {
    const S = G.S;
    const x = a || { descr: '', cat: S.categorie[0].id, forn: S.fornitori[0].id, um: 'PZ', iva: 22, costo: '', prezzoA: '', giac: 0, scortaMin: 0, barcode: '' };
    const ricIniz = a ? G.fmt(G.margine(a).ric, 0) : '50';
    const sel = (id, opzioni, val) => '<select class="campo" id="' + id + '">' + opzioni.map((o) => '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
    return '<div class="pila" style="gap:12px"><div id="art-form-msg"></div>'
      + '<div class="campo-blocco"><label class="etichetta" for="af-descr">Descrizione *</label><input class="campo" id="af-descr" value="' + esc(x.descr) + '" placeholder="es. VALVOLA A SFERA 1/2 F-F LEVA"></div>'
      + '<div class="riga-campi">'
      + '<div class="campo-blocco"><label class="etichetta" for="af-cat">Categoria</label>' + sel('af-cat', S.categorie.map((c) => [c.id, c.codice + ' — ' + c.nome]), x.cat) + '</div>'
      + '<div class="campo-blocco"><label class="etichetta" for="af-forn">Fornitore</label>' + sel('af-forn', S.fornitori.map((f) => [f.id, f.nome]), x.forn) + '</div>'
      + '</div><div class="riga-campi">'
      + '<div class="campo-blocco"><label class="etichetta" for="af-um">Unità di misura</label>' + sel('af-um', [['PZ', 'PZ'], ['CF', 'CF'], ['KG', 'KG'], ['MT', 'MT'], ['LT', 'LT'], ['SC', 'SC (sacco)']], x.um) + '</div>'
      + '<div class="campo-blocco"><label class="etichetta" for="af-iva">IVA</label>' + sel('af-iva', [[22, '22%'], [10, '10%'], [5, '5%'], [4, '4%']], x.iva) + '</div>'
      + '<div class="campo-blocco"><label class="etichetta" for="af-barcode">Barcode</label><input class="campo" id="af-barcode" inputmode="numeric" value="' + esc(x.barcode) + '"></div>'
      + '</div><div class="riga-campi">'
      + '<div class="campo-blocco"><label class="etichetta" for="af-costo">Costo (IVA escl.) *</label><input class="campo" id="af-costo" inputmode="decimal" data-in="af-calcola" value="' + (x.costo !== '' ? num(x.costo) : '') + '"></div>'
      + '<div class="campo-blocco"><label class="etichetta" for="af-ric">Ricarico A %</label><input class="campo" id="af-ric" inputmode="decimal" data-in="af-calcola" value="' + ricIniz + '"></div>'
      + '<div class="campo-blocco"><label class="etichetta" for="af-prezzo">Prezzo A (IVA incl.)</label><input class="campo" id="af-prezzo" inputmode="decimal" value="' + (x.prezzoA !== '' ? num(x.prezzoA) : '') + '"></div>'
      + '</div><div class="riga-campi">'
      + '<div class="campo-blocco"><label class="etichetta" for="af-giac">Giacenza</label><input class="campo" id="af-giac" inputmode="decimal" value="' + qta(x.giac) + '"></div>'
      + '<div class="campo-blocco"><label class="etichetta" for="af-scorta">Scorta minima</label><input class="campo" id="af-scorta" inputmode="decimal" value="' + qta(x.scortaMin) + '"></div>'
      + '</div><p class="suggerimento" style="margin:0">Il prezzo A si calcola da costo e ricarico (IVA compresa); i listini B e C seguono con 10 e 20 punti in meno.</p></div>';
  }
  G.IN['af-calcola'] = () => {
    const costo = G.leggiNum(document.getElementById('af-costo').value);
    const ric = G.leggiNumSemplice(document.getElementById('af-ric').value);
    const iva = Number(document.getElementById('af-iva').value);
    if (costo > 0) document.getElementById('af-prezzo').value = num(costo * (1 + ric / 100) * (1 + iva / 100));
  };
  function apriFormArticolo(a) {
    G.apriFinestra({
      titolo: a ? 'Modifica ' + a.codice : 'Nuovo articolo', corpo: formArticolo(a),
      piede: '<button class="btn" data-az="chiudi-finestra">Annulla</button><button class="btn primario" data-az="art-form-salva" data-id="' + (a ? a.id : '') + '">Salva</button>',
    });
  }
  A['art-nuovo'] = () => apriFormArticolo(null);
  A['art-modifica'] = () => { const u = uArt(); if (u.sel) apriFormArticolo(G.art(u.sel)); };
  A['art-form-salva'] = (el) => {
    const S = G.S;
    const v = (id) => document.getElementById(id).value;
    const descr = v('af-descr').trim().toUpperCase();
    const costo = G.leggiNum(v('af-costo'));
    const msg = document.getElementById('art-form-msg');
    if (!descr) { msg.innerHTML = '<div class="messaggio rosso">' + ico('avviso') + '<div>Scrivi la descrizione dell\'articolo.</div></div>'; return; }
    if (!(costo > 0)) { msg.innerHTML = '<div class="messaggio rosso">' + ico('avviso') + '<div>Scrivi il costo d\'acquisto (maggiore di zero).</div></div>'; return; }
    const iva = Number(v('af-iva'));
    let prezzo = G.leggiNum(v('af-prezzo'));
    const ric = G.leggiNumSemplice(v('af-ric'));
    if (!(prezzo > 0)) prezzo = costo * (1 + ric / 100) * (1 + iva / 100);
    const catId = Number(v('af-cat'));
    const c = G.cat(catId);
    const dati = { descr, cat: catId, forn: Number(v('af-forn')), um: v('af-um'), iva, costo: r2(costo), prezzoA: r2(prezzo), giac: G.leggiNumSemplice(v('af-giac')), scortaMin: G.leggiNumSemplice(v('af-scorta')), barcode: v('af-barcode').trim() };
    const nettoA = prezzo / (1 + iva / 100);
    const ricA = (nettoA - costo) / costo * 100;
    dati.prezzoB = r2(costo * (1 + Math.max(5, ricA - 10) / 100) * (1 + iva / 100));
    dati.prezzoC = r2(costo * (1 + Math.max(3, ricA - 20) / 100) * (1 + iva / 100));
    const u = uArt();
    if (el.dataset.id) {
      const a = G.art(Number(el.dataset.id));
      Object.assign(a, dati);
      G.log('Articoli', 'Modificato ' + a.codice + ' · ' + a.descr);
      G.avviso('Articolo ' + esc(a.codice) + ' salvato');
    } else {
      const n = S.articoli.filter((a) => a.cat === catId).map((a) => Number(a.codice.slice(4)) || 0);
      const codice = c.codice + String(Math.max(0, ...n) + 7).padStart(4, '0');
      const a = Object.assign({ id: G.nuovoId(), codice, ultimoAcq: G.OGGI, lotto: '', scadenza: '', fito: c.codice === 'FITO', nReg: '' }, dati);
      S.articoli.push(a);
      G.indicizza();
      u.sel = a.id;
      G.log('Articoli', 'Nuovo articolo ' + a.codice + ' · ' + a.descr + ' · ' + eur(a.prezzoA));
      G.avviso('Nuovo articolo ' + esc(a.codice) + ' creato');
    }
    G.chiudiFinestra(); G.salva(); G.ridisegna();
  };

  // =====================================================================
  // INVENTARIO
  // =====================================================================
  const uInv = () => G.ui('inventario', () => ({ cat: 0, conteggi: {} }));
  G.VISTE.inventario = {
    render() {
      const S = G.S, u = uInv();
      const righe = S.articoli.filter((a) => !u.cat || a.cat === u.cat);
      const valore = somma(S.articoli, (a) => Math.max(0, a.giac) * a.costo);
      const contati = Object.keys(u.conteggi).length;
      const diff = Object.keys(u.conteggi).filter((id) => { const a = G.art(Number(id)); return a && Math.abs(u.conteggi[id] - a.giac) > 1e-9; }).length;
      const cats = '<option value="0">Tutte le categorie</option>' + S.categorie.map((c) => '<option value="' + c.id + '"' + (u.cat === c.id ? ' selected' : '') + '>' + esc(c.codice + ' — ' + c.nome) + '</option>').join('');
      return '<div class="titolo-pagina"><h1>Inventario</h1><span class="spinta"></span><div class="strumenti">'
        + '<select class="campo" style="width:auto;min-width:220px" data-ch="inv-cat" aria-label="Categoria">' + cats + '</select>'
        + '<button class="btn primario" data-az="inv-applica"' + (diff ? '' : ' disabled') + '>Applica rettifiche (' + diff + ')</button></div></div>'
        + '<div class="griglia-kpi">'
        + '<div class="kpi"><div class="et">Valore del magazzino</div><div class="val">' + eur0(valore) + '</div><div class="nota">al costo d\'acquisto</div></div>'
        + '<div class="kpi"><div class="et">Articoli contati</div><div class="val">' + contati + '</div><div class="nota">su ' + S.articoli.length + '</div></div>'
        + '<div class="kpi ' + (diff ? 'ambra' : '') + '"><div class="et">Differenze trovate</div><div class="val">' + diff + '</div><div class="nota">da rettificare</div></div>'
        + '</div>'
        + '<p class="suggerimento" style="margin:-4px 0 12px">Scrivi nella colonna «Conteggio» quanti pezzi trovi sullo scaffale: la differenza si calcola da sola e con «Applica rettifiche» la giacenza si aggiorna.</p>'
        + G.tabella('inventario', {
          righe, chiave: (a) => a.id, altezza: 'calc(100vh - 360px)', limite: 80,
          colonne: [
            { k: 'codice', t: 'Codice', f: (a) => '<span class="mono">' + esc(a.codice) + '</span>', w: 104 },
            { k: 'descr', t: 'Descrizione', cls: 'lungo', w: 240 },
            { k: 'um', t: 'UM', w: 50, noFiltro: true },
            { k: 'giac', t: 'Giacenza', n: true, f: (a) => qta(a.giac), w: 80 },
            { k: 'conta', t: 'Conteggio', n: true, noOrd: true, noFiltro: true, v: (a) => u.conteggi[a.id], f: (a) => '<input class="cella-input" inputmode="decimal" data-ch="inv-conta" data-id="' + a.id + '" value="' + (u.conteggi[a.id] !== undefined ? qta(u.conteggi[a.id]) : '') + '" aria-label="Conteggio ' + esc(a.codice) + '">', w: 100 },
            { k: 'diff', t: 'Differenza', n: true, noFiltro: true, v: (a) => (u.conteggi[a.id] !== undefined ? u.conteggi[a.id] - a.giac : 0), f: (a) => { if (u.conteggi[a.id] === undefined) return ''; const d = u.conteggi[a.id] - a.giac; return '<strong class="' + (d < 0 ? 'rosso-t' : d > 0 ? 'blu-t' : 'verde-t') + '">' + (d > 0 ? '+' : '') + qta(d) + '</strong>'; }, w: 90 },
            { k: 'valore', t: 'Valore', n: true, noFiltro: true, v: (a) => a.giac * a.costo, f: (a) => eur(Math.max(0, a.giac) * a.costo), w: 100 },
          ],
        });
    },
  };
  G.CH['inv-cat'] = (el) => { uInv().cat = Number(el.value); G.ridisegna(); };
  G.CH['inv-conta'] = (el) => {
    const u = uInv();
    if (el.value.trim() === '') delete u.conteggi[el.dataset.id];
    else u.conteggi[el.dataset.id] = Math.max(0, G.leggiNumSemplice(el.value));
    G.ridisegna();
  };
  A['inv-applica'] = () => {
    const u = uInv();
    const ids = Object.keys(u.conteggi).filter((id) => { const a = G.art(Number(id)); return a && Math.abs(u.conteggi[id] - a.giac) > 1e-9; });
    G.chiedi({
      titolo: 'Applicare le rettifiche?', testo: 'La giacenza di ' + ids.length + ' articoli prende il valore contato. Il movimento resta scritto nella cronologia.', si: 'Applica',
      onSi: () => {
        ids.forEach((id) => { const a = G.art(Number(id)); G.log('Inventario', 'Rettifica ' + a.codice + ': da ' + qta(a.giac) + ' a ' + qta(u.conteggi[id])); a.giac = u.conteggi[id]; });
        u.conteggi = {};
        G.salva(); G.ridisegna(); G.avviso(ids.length + ' giacenze rettificate');
      },
    });
  };

  // =====================================================================
  // CLIENTI
  // =====================================================================
  const uCli = () => G.ui('clienti', () => ({ sel: null }));
  function pivaValida(p) {
    if (!/^\d{11}$/.test(p)) return false;
    let s = 0;
    for (let i = 0; i < 10; i++) { let c = Number(p[i]); if (i % 2 === 1) { c *= 2; if (c > 9) c -= 9; } s += c; }
    return (10 - (s % 10)) % 10 === Number(p[10]);
  }
  function schedaCliente(c) {
    const S = G.S;
    const anno = G.OGGI.slice(0, 4);
    const fatt = S.fatture.filter((f) => f.clienteId === c.id);
    const fattAnno = somma(fatt.filter((f) => f.anno === Number(anno) && f.tipo !== 'NC'), (f) => f.totale);
    const aperte = S.scadenze.filter((s) => s.tipo === 'ATTIVA' && s.soggettoId === c.id && s.stato !== 'PAGATA');
    const daInc = somma(aperte, G.residuo);
    const scad = somma(aperte.filter((s) => s.scadenza < G.OGGI), G.residuo);
    const ddtAperti = S.ddt.filter((d) => d.clienteId === c.id && !d.fatturaId);
    const pat = S.patentini.filter((p) => p.clienteId === c.id);
    const docs = fatt.map((f) => ({ d: f.data, t: G.fatturaNumero(f), tot: f.totale, id: f.id, tipo: 'f' }))
      .concat(S.ddt.filter((d) => d.clienteId === c.id).map((d) => ({ d: d.data, t: 'DDT ' + d.numero + '/' + d.anno, tot: d.totale, id: d.id, tipo: 'd' })))
      .sort((a, b) => b.d.localeCompare(a.d)).slice(0, 8);
    const riga = (et, v) => '<div class="campo-blocco"><span class="etichetta">' + et + '</span><span>' + (v || '<span class="muto">—</span>') + '</span></div>';
    return '<div class="scheda" id="cli-scheda"><div class="testa-scheda"><h2>' + esc(c.nome) + '</h2><span class="chip grigio">' + (c.tipo === 'PG' ? 'Azienda' : c.tipo === 'DI' ? 'Ditta individuale' : 'Privato') + '</span>'
      + '<span class="destra"><button class="btn piccolo" data-az="cli-partitario" data-id="' + c.id + '">Scheda contabile</button> <button class="btn piccolo" data-az="cli-modifica" data-id="' + c.id + '">Modifica</button></span></div>'
      + '<div class="griglia-kpi" style="margin-bottom:14px">'
      + '<div class="kpi"><div class="et">Fatturato ' + anno + '</div><div class="val" style="font-size:22px">' + eur(fattAnno) + '</div></div>'
      + '<div class="kpi"><div class="et">Da incassare</div><div class="val" style="font-size:22px">' + eur(daInc) + '</div><div class="nota rosso-t">' + (scad ? 'scaduto ' + eur(scad) : '&nbsp;') + '</div></div>'
      + '<div class="kpi"><div class="et">DDT da fatturare</div><div class="val" style="font-size:22px">' + ddtAperti.length + '</div><div class="nota">' + eur(somma(ddtAperti, (d) => d.totale)) + '</div></div>'
      + '</div>'
      + '<div class="riga-campi" style="margin-bottom:14px">' + riga('Indirizzo', esc(c.indirizzo + ', ' + c.cap + ' ' + c.citta + ' (' + c.prov + ')')) + riga('P.IVA / C.F.', esc(c.piva || c.cf)) + riga('Telefono', esc(c.tel)) + riga('Email', esc(c.email))
      + riga('PEC / Codice SDI', esc([c.pec, c.sdi !== '0000000' ? c.sdi : ''].filter(Boolean).join(' · '))) + riga('Listino · pagamento', esc('Listino ' + c.listino + ' · ' + c.pagamento))
      + riga('Patentino', pat.map((p) => 'N. ' + esc(p.numero) + ' <span class="chip ' + (G.statoPatentino(p) === 'scaduto' ? 'rosso' : G.statoPatentino(p) === 'in scadenza' ? 'ambra' : 'verde') + '">' + G.statoPatentino(p) + ' · ' + dataIt(p.scadenza) + '</span>').join('<br>')) + '</div>'
      + '<div class="etichetta" style="margin-bottom:6px">Ultimi documenti</div>'
      + (docs.length ? docs.map((x) => '<button class="combo-voce" data-az="cli-doc" data-tipo="' + x.tipo + '" data-id="' + x.id + '" style="display:flex;justify-content:space-between;gap:10px;border:1px solid var(--linea);border-radius:8px;margin-bottom:6px"><span>' + esc(x.t) + ' <span class="muto">del ' + dataIt(x.d) + '</span></span><strong class="num">' + eur(x.tot) + '</strong></button>').join('') : '<p class="muto">Nessun documento</p>')
      + '</div>';
  }
  G.VISTE.clienti = {
    render() {
      const S = G.S, u = uCli();
      const c = u.sel ? G.cli(u.sel) : null;
      return '<div class="titolo-pagina"><h1>Clienti</h1><span class="chip grigio">' + S.clienti.length + ' clienti</span><span class="spinta"></span><button class="btn primario" data-az="cli-nuovo">' + ico('piu') + 'Nuovo cliente</button></div>'
        + G.tabella('clienti', {
          righe: S.clienti, chiave: (x) => x.id, altezza: c ? '42vh' : 'calc(100vh - 170px)',
          colonne: [
            { k: 'codice', t: 'Codice', f: (x) => '<span class="mono">' + esc(x.codice) + '</span>', w: 72 },
            { k: 'nome', t: 'Ragione sociale · città', testo: (x) => x.nome + ' ' + x.citta, f: (x) => esc(x.nome) + '<div class="sotto-cella">' + esc(x.citta) + ' (' + esc(x.prov) + ')</div>', cls: 'lungo', w: 220 },
            { k: 'piva', t: 'P.IVA / C.F.', v: (x) => x.piva || x.cf, f: (x) => '<span class="mono">' + esc(x.piva || x.cf) + '</span>', w: 132 },
            { k: 'tel', t: 'Telefono', w: 110 },
            { k: 'listino', t: 'Listino', w: 56 },
            { k: 'pagamento', t: 'Pagamento', cls: 'due-righe', w: 130 },
            { k: 'email', t: 'Email', w: 180 },
          ],
          onSel: (x) => { u.sel = x.id; const box = document.getElementById('cli-scheda-box'); if (box) box.innerHTML = schedaCliente(x); const t = document.getElementById('tab-clienti'); if (t) t.style.maxHeight = '42vh'; },
        })
        + '<div id="cli-scheda-box" style="margin-top:14px">' + (c ? schedaCliente(c) : '<div class="scheda muto">Tocca un cliente: qui compaiono fatturato, crediti, DDT da fatturare, patentino e documenti.</div>') + '</div>';
    },
  };
  A['cli-doc'] = (el) => {
    const S = G.S;
    if (el.dataset.tipo === 'f') { const f = S.fatture.find((x) => x.id === Number(el.dataset.id)); if (f) G.apriDocumento(G.docDaFattura(f)); }
    else { const d = S.ddt.find((x) => x.id === Number(el.dataset.id)); if (d) G.apriDocumento(G.docDaDdt(d)); }
  };
  A['cli-partitario'] = (el) => {
    const S = G.S, c = G.cli(Number(el.dataset.id));
    const mov = [];
    S.fatture.filter((f) => f.clienteId === c.id).forEach((f) => mov.push({ d: f.data, doc: G.fatturaNumero(f), dare: f.tipo === 'NC' ? 0 : f.totale, avere: f.tipo === 'NC' ? f.totale : 0 }));
    S.scadenze.filter((s) => s.tipo === 'ATTIVA' && s.soggettoId === c.id && s.pagato > 0).forEach((s) => mov.push({ d: s.incassoIl || s.scadenza, doc: 'Incasso FT ' + s.documento, dare: 0, avere: s.pagato }));
    S.scadenze.filter((s) => s.tipo === 'ATTIVA' && s.soggettoId === c.id && !s.fatturaId).forEach((s) => mov.push({ d: s.dataDoc, doc: 'FT ' + s.documento + ' (anni precedenti)', dare: s.importo, avere: 0 }));
    mov.sort((a, b) => a.d.localeCompare(b.d));
    let saldo = 0;
    const righe = mov.map((m) => { saldo = r2(saldo + m.dare - m.avere); return '<tr><td>' + dataIt(m.d) + '</td><td>' + esc(m.doc) + '</td><td class="n">' + (m.dare ? num(m.dare) : '') + '</td><td class="n">' + (m.avere ? num(m.avere) : '') + '</td><td class="n"><strong>' + num(Math.abs(saldo)) + ' ' + (saldo >= 0 ? 'D' : 'A') + '</strong></td></tr>'; }).join('');
    G.apriFinestra({
      titolo: 'Scheda contabile · ' + c.nome, larga: true,
      corpo: '<p class="suggerimento" style="margin-top:0">Partitario Dare/Avere nel formato del commercialista: fatture in Dare, incassi e note di credito in Avere, saldo progressivo.</p>'
        + '<div class="tab" style="max-height:60vh"><table><thead><tr><th>Data</th><th>Documento</th><th class="n">Dare</th><th class="n">Avere</th><th class="n">Saldo</th></tr></thead><tbody>' + (righe || '<tr class="vuoto"><td colspan="5">Nessun movimento</td></tr>') + '</tbody></table></div>',
      piede: '<button class="btn primario" data-az="chiudi-finestra">Chiudi</button>',
    });
  };
  function formCliente(c) {
    const S = G.S;
    const x = c || { tipo: 'PG', nome: '', indirizzo: '', cap: '', citta: '', prov: 'PG', piva: '', cf: '', tel: '', email: '', pec: '', sdi: '0000000', listino: 'A', pagamento: 'Contanti' };
    const campo = (id, et, val, extra) => '<div class="campo-blocco"><label class="etichetta" for="' + id + '">' + et + '</label><input class="campo" id="' + id + '" value="' + esc(val) + '"' + (extra || '') + '></div>';
    return '<div class="pila" style="gap:12px"><div id="cli-form-msg"></div>'
      + '<div class="riga-campi"><div class="campo-blocco"><label class="etichetta" for="cf-tipo">Tipo</label><select class="campo" id="cf-tipo">' + [['PG', 'Azienda'], ['DI', 'Ditta individuale'], ['PF', 'Privato']].map((o) => '<option value="' + o[0] + '"' + (x.tipo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>'
      + campo('cf-nome', 'Ragione sociale o nome *', x.nome) + '</div>'
      + '<div class="riga-campi">' + campo('cf-indirizzo', 'Indirizzo', x.indirizzo) + campo('cf-cap', 'CAP', x.cap, ' inputmode="numeric"') + campo('cf-citta', 'Città', x.citta) + campo('cf-prov', 'Prov.', x.prov) + '</div>'
      + '<div class="riga-campi">' + campo('cf-piva', 'Partita IVA', x.piva, ' inputmode="numeric"') + campo('cf-cf', 'Codice fiscale', x.cf, ' autocapitalize="characters"') + campo('cf-tel', 'Telefono', x.tel, ' inputmode="tel"') + '</div>'
      + '<div class="riga-campi">' + campo('cf-email', 'Email', x.email, ' inputmode="email" autocapitalize="off"') + campo('cf-pec', 'PEC', x.pec, ' inputmode="email" autocapitalize="off"') + campo('cf-sdi', 'Codice SDI', x.sdi, ' autocapitalize="characters"') + '</div>'
      + '<div class="riga-campi"><div class="campo-blocco"><label class="etichetta" for="cf-listino">Listino</label><select class="campo" id="cf-listino">' + ['A', 'B', 'C'].map((l) => '<option' + (x.listino === l ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>'
      + '<div class="campo-blocco"><label class="etichetta" for="cf-pag">Pagamento</label><select class="campo" id="cf-pag">' + S.metodi.map((m) => '<option' + (x.pagamento === m.nome ? ' selected' : '') + '>' + esc(m.nome) + '</option>').join('') + '</select></div></div>'
      + '<p class="suggerimento" style="margin:0">Il programma controlla le cifre della partita IVA e del codice fiscale e avvisa se il cliente esiste già.</p></div>';
  }
  function apriFormCliente(c) {
    G.apriFinestra({ titolo: c ? 'Modifica cliente' : 'Nuovo cliente', corpo: formCliente(c), larga: true,
      piede: '<button class="btn" data-az="chiudi-finestra">Annulla</button><button class="btn primario" data-az="cli-salva" data-id="' + (c ? c.id : '') + '">Salva</button>' });
  }
  A['cli-nuovo'] = () => apriFormCliente(null);
  A['cli-modifica'] = (el) => apriFormCliente(G.cli(Number(el.dataset.id)));
  A['cli-salva'] = (el) => {
    const S = G.S;
    const v = (id) => document.getElementById(id).value.trim();
    const msg = document.getElementById('cli-form-msg');
    const errore = (t) => { msg.innerHTML = '<div class="messaggio rosso">' + ico('avviso') + '<div>' + t + '</div></div>'; };
    const dati = { tipo: v('cf-tipo'), nome: v('cf-nome').toUpperCase(), indirizzo: v('cf-indirizzo'), cap: v('cf-cap'), citta: v('cf-citta'), prov: v('cf-prov').toUpperCase(), piva: v('cf-piva').replace(/\s/g, ''), cf: v('cf-cf').toUpperCase(), tel: v('cf-tel'), email: v('cf-email'), pec: v('cf-pec'), sdi: v('cf-sdi').toUpperCase() || '0000000', listino: v('cf-listino'), pagamento: v('cf-pag') };
    if (!dati.nome) return errore('Scrivi la ragione sociale o il nome.');
    if (dati.piva && !pivaValida(dati.piva)) return errore('La partita IVA «' + esc(dati.piva) + '» non è valida: controlla le 11 cifre (l\'ultima è un codice di controllo).');
    if (dati.cf && !/^[A-Z0-9]{16}$|^\d{11}$/.test(dati.cf)) return errore('Il codice fiscale deve avere 16 caratteri (o 11 cifre per le società).');
    if (dati.tipo !== 'PF' && !dati.piva) return errore('Per un\'azienda o una ditta serve la partita IVA (per la fattura elettronica).');
    const doppio = S.clienti.find((x) => x.id !== Number(el.dataset.id) && ((dati.piva && x.piva === dati.piva) || G.normalizza(x.nome) === G.normalizza(dati.nome)));
    if (doppio) return errore('Esiste già un cliente uguale: ' + esc(doppio.codice + ' · ' + doppio.nome) + '.');
    if (el.dataset.id) { Object.assign(G.cli(Number(el.dataset.id)), dati); G.log('Clienti', 'Modificato cliente ' + dati.nome); }
    else {
      const n = Math.max(...S.clienti.map((x) => Number(x.codice.slice(1)) || 0)) + 1;
      const c = Object.assign({ id: G.nuovoId(), codice: 'C' + String(n).padStart(4, '0') }, dati);
      S.clienti.push(c); G.indicizza(); uCli().sel = c.id;
      G.log('Clienti', 'Nuovo cliente ' + c.codice + ' · ' + c.nome);
    }
    G.chiudiFinestra(); G.salva(); G.ridisegna(); G.avviso('Cliente salvato');
  };

  // =====================================================================
  // FORNITORI
  // =====================================================================
  const uForn = () => G.ui('fornitori', () => ({ sel: null }));
  function schedaFornitore(f) {
    const S = G.S;
    const deb = S.scadenze.filter((s) => s.tipo === 'PASSIVA' && s.soggettoId === f.id && s.stato !== 'PAGATA');
    const docs = S.acquisti.filter((d) => d.fornitoreId === f.id).sort((a, b) => b.data.localeCompare(a.data));
    const arts = S.articoli.filter((a) => a.forn === f.id);
    return '<div class="scheda"><div class="testa-scheda"><h2>' + esc(f.nome) + '</h2><span class="destra">' + esc(f.citta) + ' · P.IVA ' + esc(f.piva) + ' · ' + esc(f.pagamento) + '</span></div>'
      + '<div class="griglia-kpi" style="margin-bottom:12px">'
      + '<div class="kpi"><div class="et">Debito aperto</div><div class="val" style="font-size:22px">' + eur(somma(deb, G.residuo)) + '</div><div class="nota rosso-t">' + (deb.some((s) => s.scadenza < G.OGGI) ? 'scaduto ' + eur(somma(deb.filter((s) => s.scadenza < G.OGGI), G.residuo)) : '&nbsp;') + '</div></div>'
      + '<div class="kpi"><div class="et">Fatture ricevute</div><div class="val" style="font-size:22px">' + docs.length + '</div><div class="nota">' + eur(somma(docs, (d) => d.totale)) + '</div></div>'
      + '<div class="kpi"><div class="et">Articoli forniti</div><div class="val" style="font-size:22px">' + arts.length + '</div><div class="nota">' + arts.filter(G.sottoScorta).length + ' sotto scorta</div></div></div>'
      + '<div class="tab"><table><thead><tr><th>Documento</th><th>Data</th><th class="n">Totale</th><th>Scadenza</th><th>Stato</th></tr></thead><tbody>'
      + docs.map((d) => { const s = S.scadenze.find((x) => x.acquistoId === d.id); return '<tr><td class="mono">' + esc(d.numero) + '</td><td>' + dataIt(d.data) + '</td><td class="n">' + eur(d.totale) + '</td><td>' + (s ? dataIt(s.scadenza) : '') + '</td><td>' + (s ? (s.stato === 'PAGATA' ? '<span class="chip verde">Pagata</span>' : s.scadenza < G.OGGI ? '<span class="chip rosso">Scaduta</span>' : '<span class="chip ambra">Da pagare</span>') : '') + '</td></tr>'; }).join('')
      + '</tbody></table></div></div>';
  }
  G.VISTE.fornitori = {
    render() {
      const S = G.S, u = uForn();
      const f = u.sel ? G.forn(u.sel) : null;
      return '<div class="titolo-pagina"><h1>Fornitori</h1><span class="chip grigio">' + S.fornitori.length + ' fornitori</span></div>'
        + G.tabella('fornitori', {
          righe: S.fornitori, chiave: (x) => x.id, altezza: '42vh',
          colonne: [
            { k: 'codice', t: 'Codice', f: (x) => '<span class="mono">' + esc(x.codice) + '</span>', w: 72 },
            { k: 'nome', t: 'Ragione sociale · città', testo: (x) => x.nome + ' ' + x.citta, f: (x) => esc(x.nome) + '<div class="sotto-cella">' + esc(x.citta) + '</div>', cls: 'lungo', w: 210 },
            { k: 'piva', t: 'P.IVA', f: (x) => '<span class="mono">' + esc(x.piva) + '</span>', w: 120 },
            { k: 'tel', t: 'Telefono', w: 110 },
            { k: 'pagamento', t: 'Pagamento', cls: 'due-righe', w: 130 },
            { k: 'debito', t: 'Debito aperto', n: true, v: (x) => somma(S.scadenze.filter((s) => s.tipo === 'PASSIVA' && s.soggettoId === x.id && s.stato !== 'PAGATA'), G.residuo), f: (x) => eur(somma(S.scadenze.filter((s) => s.tipo === 'PASSIVA' && s.soggettoId === x.id && s.stato !== 'PAGATA'), G.residuo)), w: 104 },
          ],
          onSel: (x) => { u.sel = x.id; const box = document.getElementById('forn-scheda'); if (box) box.innerHTML = schedaFornitore(x); },
        })
        + '<div id="forn-scheda" style="margin-top:14px">' + (f ? schedaFornitore(f) : '<div class="scheda muto">Tocca un fornitore: qui compaiono debiti, fatture ricevute e articoli forniti.</div>') + '</div>';
    },
  };

  // =====================================================================
  // DOCUMENTI DI TRASPORTO
  // =====================================================================
  const uDdt = () => G.ui('ddt', () => ({ filtro: 'tutti' }));
  G.VISTE.ddt = {
    render() {
      const S = G.S, u = uDdt();
      const aperti = S.ddt.filter((d) => !d.fatturaId);
      const righe = S.ddt.filter((d) => (u.filtro === 'aperti' ? !d.fatturaId : u.filtro === 'fatturati' ? !!d.fatturaId : true)).slice().sort((a, b) => (b.data + String(b.numero).padStart(6, '0')).localeCompare(a.data + String(a.numero).padStart(6, '0')));
      const pill = [['tutti', 'Tutti'], ['aperti', 'Da fatturare'], ['fatturati', 'Fatturati']].map((p) => '<button class="pillola' + (u.filtro === p[0] ? ' scelta' : '') + '" data-az="ddt-filtro" data-f="' + p[0] + '">' + p[1] + '</button>').join('');
      return '<div class="titolo-pagina"><h1>Documenti di trasporto</h1><div class="pillole">' + pill + '</div><span class="spinta"></span><div class="strumenti">'
        + '<button class="btn" data-az="vai" data-vista="vendite">' + ico('piu') + 'Nuovo DDT dal banco</button>'
        + '<button class="btn primario" data-az="vai" data-vista="fatture" data-dopo="fatt-diff">Fattura i DDT del mese (' + aperti.length + ')</button></div></div>'
        + G.tabella('ddt', {
          righe, chiave: (d) => d.id, altezza: 'calc(100vh - 170px)',
          colonne: [
            { k: 'numero', t: 'DDT n.', n: true, v: (d) => d.anno * 100000 + d.numero, f: (d) => d.numero + '/' + d.anno, testo: (d) => String(d.numero), w: 84 },
            { k: 'data', t: 'Data', f: (d) => dataIt(d.data), testo: (d) => dataIt(d.data), w: 92 },
            { k: 'cliente', t: 'Cliente', v: (d) => (G.cli(d.clienteId) || {}).nome, cls: 'lungo', w: 200 },
            { k: 'causale', t: 'Causale', cls: 'due-righe', w: 120 },
            { k: 'totale', t: 'Totale', n: true, f: (d) => eur(d.totale) + '<div class="sotto-cella">' + d.righe.length + ' righe</div>', w: 96 },
            { k: 'stato', t: 'Stato', v: (d) => (d.fatturaId ? 'Fatturato' : 'Da fatturare'), f: (d) => { if (!d.fatturaId) return '<span class="chip ambra">Da fatturare</span>'; const f = S.fatture.find((x) => x.id === d.fatturaId); return '<span class="chip verde">In ' + esc(f ? G.fatturaNumero(f) : 'fattura') + '</span>'; }, w: 150 },
          ],
          onSel: (d) => G.apriDocumento(G.docDaDdt(d)),
        });
    },
  };
  A['ddt-filtro'] = (el) => { uDdt().filtro = el.dataset.f; G.ridisegna(); };
})();
