/* Dashboard, Analisi, Vendite — banco, Cronologia scontrini, finestre Cassa fiscale e Chiusura di cassa.
   Ricopiate da DashboardView, AnalisiView, VenditeView, CronologiaScontriniView, CassaWindow e
   ChiusuraCassaWindow (stesse scritte, stesse colonne, stessi pulsanti, stesse regole). */
(function () {
  'use strict';
  const G = window.GF;
  const { esc, eur, num, qta, dataIt, ico, somma, r2 } = G;
  const btn = (testo, az, o) => { o = o || {}; return '<button class="btn' + (o.primario ? ' primario' : '') + (o.cls ? ' ' + o.cls : '') + '" data-az="' + az + '"' + (o.dis ? ' disabled' : '') + (o.id ? ' id="' + o.id + '"' : '') + (o.stile ? ' style="' + o.stile + '"' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + (o.dati || '') + '>' + esc(testo) + '</button>'; };
  const msgHtml = (m) => (m && m.testo ? '<div style="font-size:12px;margin-top:8px;color:' + (m.colore || 'var(--testo-2)') + '">' + esc(m.testo) + '</div>' : '');

  // =====================================================================
  // DASHBOARD
  // =====================================================================
  G.VISTE.dashboard = {
    scorre: true,
    render() {
      const S = G.S, oggi = G.OGGI;
      const conMarg = S.articoli.filter((a) => a.costo > 0 && a.prezzoA > 0);
      const margMedio = conMarg.length ? somma(conMarg, (a) => { const n = a.prezzoA / (1 + a.iva / 100); return (n - a.costo) / n * 100; }) / conMarg.length : 0;
      const nSotto = S.articoli.filter(G.sottocosto).length;
      const nScorta = S.articoli.filter(G.sottoScorta).length;
      const patScad = S.patentini.filter((p) => p.validoA < oggi).length;
      const patIn = S.patentini.filter((p) => p.validoA >= oggi && p.validoA < G.D.piuGiorni(oggi, 60)).length;
      const kpi = (et, val, colore, ultima) => '<div class="card" style="margin-right:' + (ultima ? 0 : 14) + 'px"><div class="muto">' + et + '</div><div style="font-size:27px;font-weight:600;margin-top:4px;color:' + (colore || 'var(--testo)') + '">' + val + '</div></div>';
      const alert = (n, testo, pericolo, vista) => '<div class="card" style="width:252px;margin:0 14px 14px 0;cursor:pointer;display:flex;align-items:center" data-az="vai" data-vista="' + vista + '"><div style="flex:1;min-width:0"><div style="font-size:26px;font-weight:600;color:' + (n === 0 ? 'var(--verde)' : pericolo ? 'var(--rosso)' : 'var(--ambra)') + '">' + G.fmt(n, 0) + '</div><div style="font-size:12.5px;color:var(--testo-2)">' + testo + '</div></div><div style="font-size:22px;color:var(--testo-2)">›</div></div>';
      return '<div style="padding:22px 26px">'
        + '<div class="h1">Dashboard</div><div class="muto" style="margin:3px 0 20px">' + esc(S.negozio.titolo) + ' · ' + G.dataLunga(oggi) + '</div>'
        + '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr))">'
        + kpi('Articoli a catalogo', G.fmt(S.articoli.length, 0)) + kpi('Margine medio', G.fmt(margMedio, 1) + '%', 'var(--verde)')
        + kpi('Clienti', G.fmt(S.clienti.length, 0)) + kpi('Movimenti registro', G.fmt(S.registro.length, 0), null, true) + '</div>'
        + '<div class="h2" style="margin:22px 0 12px">Da tenere d\'occhio</div>'
        + '<div class="avvolgi">' + alert(nSotto, 'articoli venduti sottocosto', true, 'articoli') + alert(nScorta, 'articoli sotto scorta minima', false, 'articoli')
        + alert(patScad, 'patentini scaduti', true, 'registro') + alert(patIn, 'patentini in scadenza (60 gg)', false, 'registro') + '</div>'
        + '<div class="h2" style="margin:12px 0 12px">Azioni rapide</div>'
        + '<div class="riga">' + btn('Vai agli articoli', 'vai', { dati: ' data-vista="articoli"', stile: 'margin-right:10px' }) + btn('Apri registro agrofarmaci', 'vai', { primario: true, dati: ' data-vista="registro"' }) + '</div>'
        + '</div>';
    },
  };

  // =====================================================================
  // ANALISI & ANDAMENTO
  // =====================================================================
  const PALETTE = ['#2E7D32', '#0CA678', '#1098AD', '#3B82F6', '#6366F1', '#8B5CF6', '#D6336C', '#E8590C', '#F59F00', '#0B7285'];
  const MESI_L = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  function tassiMargine() {
    const out = {};
    G.S.categorie.forEach((c) => {
      const arts = G.S.articoli.filter((a) => a.cat === c.id && a.costo > 0 && a.prezzoA > 0);
      // si vende anche ai listini B e C: il margine vero è un po' sotto quello del listino A
      out[c.codice] = (somma(arts, (a) => Math.max(0.04, G.margine(a).perc / 100)) / (arts.length || 1)) * 0.9;
    });
    return out;
  }
  // netto venduto (IVA esclusa) di una categoria in un mese, per canale
  function nettoCat(anno, m, canale, cod) {
    const v = (G.ST.perCat[anno + '-' + G.D.pad(m + 1)] || {})[cod];
    if (!v) return 0;
    return canale === 'BANCO' ? v.banco : canale === 'DDT' ? v.ddt : v.banco + v.ddt;
  }
  function caricaAnalisi(anno, canale) {
    const S = G.S, tassi = tassiMargine();
    const oggi = G.D.daIso(G.OGGI);
    const mesi = [];
    for (let m = 0; m < 12; m++) {
      let fatt = 0, netto = 0, marg = 0, prec = 0;
      S.categorie.forEach((c) => {
        const n = nettoCat(anno, m, canale, c.codice);
        netto += n; fatt += n * (1 + c.iva / 100); marg += n * tassi[c.codice];
        prec += nettoCat(anno - 1, m, canale, c.codice) * (1 + c.iva / 100);
      });
      mesi.push({ etichetta: G.MESI[m], parziale: anno === oggi.getFullYear() && m === oggi.getMonth(), fatt, netto, marg, prec });
    }
    let cats = S.categorie.map((c) => {
      const fattM = [], margM = [];
      for (let m = 0; m < 12; m++) { const n = nettoCat(anno, m, canale, c.codice); fattM.push(n * (1 + c.iva / 100)); margM.push(n * tassi[c.codice]); }
      return { codice: c.codice, cls: '', fatt: fattM, marg: margM };
    }).filter((x) => somma(x.fatt) > 0).sort((a, b) => somma(b.fatt) - somma(a.fatt));
    const prime = cats.slice(0, 10), resto = cats.slice(10);
    if (resto.length) {
      const altre = { codice: 'Altre categorie', cls: 'alt', fatt: Array(12).fill(0), marg: Array(12).fill(0) };
      resto.forEach((c) => { for (let i = 0; i < 12; i++) { altre.fatt[i] += c.fatt[i]; altre.marg[i] += c.marg[i]; } });
      prime.push(altre);
    }
    return { mesi, categorie: prime, tassi };
  }
  function caricaProdotti(u, tassi) {
    const S = G.S, out = [];
    const mesi = u.mese < 0 ? [...Array(12).keys()] : [u.mese];
    S.articoli.forEach((a) => {
      const c = G.cat(a.cat);
      if (u.catSel && c.codice !== u.catSel) return;
      const nCat = somma(mesi, (m) => nettoCat(u.anno, m, u.canale, c.codice));
      const netto = nCat * (G.ST.pesi[a.id] || 0);
      if (netto < 1) return;
      const nu = a.prezzoA / (1 + a.iva / 100);
      const marg = netto * Math.max(0.04, G.margine(a).perc / 100) * 0.9;
      out.push({ codice: a.codice, descr: a.descr, qta: Math.max(1, Math.round(netto / Math.max(0.01, nu))), venduto: netto * (1 + a.iva / 100), costo: netto - marg, marg, pct: marg / netto * 100 });
    });
    return out.sort((a, b) => b.venduto - a.venduto).slice(0, 300);
  }
  const an = () => G.ui('analisi', () => ({ anno: G.ST.anni[G.ST.anni.length - 1], canale: null, mese: -1, catSel: null, cerca: '', ordine: 0, dir: -1, limite: 50, dett: null }));
  G.VISTE.analisi = {
    scorre: true,
    nuova() { delete G.U.analisi; },
    render() {
      const u = an();
      const d = caricaAnalisi(u.anno, u.canale);
      u.prodotti = caricaProdotti(u, d.tassi);
      const sc = u.mese < 0
        ? { fatt: somma(d.mesi, (m) => m.fatt), netto: somma(d.mesi, (m) => m.netto), marg: somma(d.mesi, (m) => m.marg), prec: somma(d.mesi, (m) => m.prec) }
        : d.mesi[u.mese];
      const costo = sc.netto - sc.marg, pct = sc.netto > 0 ? sc.marg / sc.netto * 100 : 0;
      let fattH = '';
      if (sc.prec > 0) { const dv = (sc.fatt - sc.prec) / sc.prec * 100; fattH = '<span style="color:' + (dv >= 0 ? 'var(--verde)' : 'var(--rosso)') + '">vs ' + (u.anno - 1) + ': ' + (dv >= 0 ? '▲ +' : '▼ −') + G.fmt(Math.abs(dv), 0) + '%</span>'; }
      else fattH = u.mese < 0 ? 'anno ' + u.anno : MESI_L[u.mese] + ' ' + u.anno;
      const periodo = u.mese < 0 ? 'Anno ' + u.anno : MESI_L[u.mese] + ' ' + u.anno;
      const can = u.canale === null ? 'tutti i canali' : u.canale === 'BANCO' ? 'solo banco/cassa' : 'solo DDT/agraria';
      const pill = (t, on, az, dati) => '<button class="pill' + (on ? ' scelta' : '') + '" data-az="' + az + '"' + dati + '>' + esc(t) + '</button>';
      const anni = G.ST.anni.map((y) => pill(String(y), y === u.anno, 'an-anno', ' data-a="' + y + '"')).join('');
      const canali = [['Tutti', ''], ['Banco', 'BANCO'], ['DDT', 'DDT']].map((c) => pill(c[0], (u.canale || '') === c[1], 'an-canale', ' data-c="' + c[1] + '"')).join('');
      const kpi = (et, val, sotto, colore, ultima) => '<div class="card" style="margin-right:' + (ultima ? 0 : 12) + 'px"><div class="muto">' + et + '</div><div style="font-size:25px;font-weight:700;margin-top:5px;color:' + (colore || 'var(--testo)') + '">' + val + '</div><div class="muto" style="margin-top:3px">' + sotto + '</div></div>';

      // grafico dei mesi
      const maxF = Math.max(1, ...d.mesi.map((m) => m.fatt));
      const colonne = d.mesi.map((m, i) => {
        const hF = m.fatt / maxF * 150, hG = m.fatt > 0 ? m.marg / m.fatt * hF : 0;
        return '<button class="mese-col' + (u.mese === i ? ' scelta' : '') + '" data-az="an-mese" data-m="' + i + '" title="' + MESI_L[i] + ': fatturato ' + G.fmt(m.fatt, 0) + ' € · guadagno ' + G.fmt(m.marg, 0) + ' €">'
          + '<div class="top">' + (m.fatt > 0 ? G.fmt(m.marg / 1000, 0) + 'k/' + G.fmt(m.fatt / 1000, 0) + 'k' : '&nbsp;') + '</div>'
          + '<div class="area">' + (m.fatt > 0 ? '<div class="f" style="height:' + Math.max(hF, 3).toFixed(1) + 'px"><div class="g" style="height:' + Math.max(hG, 0).toFixed(1) + 'px"></div></div>' : '') + '</div>'
          + '<div class="lab">' + m.etichetta + (m.parziale ? ' •' : '') + '</div></button>';
      }).join('');

      // categorie
      const righeCat = d.categorie.map((c) => ({ c, f: u.mese < 0 ? somma(c.fatt) : c.fatt[u.mese], g: u.mese < 0 ? somma(c.marg) : c.marg[u.mese] }))
        .filter((x) => x.f !== 0 || x.g !== 0).sort((a, b) => b.g - a.g);
      const maxG = Math.max(1, ...righeCat.map((x) => Math.abs(x.g)));
      const catHtml = righeCat.length ? righeCat.map((x, k) => {
        const w = Math.max(Math.abs(x.g) / maxG * 100, 1.5);
        const colore = x.c.cls === 'alt' ? 'var(--testo-2)' : x.g < 0 ? 'var(--rosso)' : PALETTE[k % PALETTE.length];
        const sel = x.c.cls !== 'alt' && u.catSel === x.c.codice;
        return '<button class="cat-r' + (sel ? ' scelta' : '') + '" data-az="an-cat" data-c="' + esc(x.c.codice) + '" data-alt="' + (x.c.cls === 'alt' ? 1 : 0) + '"><div class="alto"><span class="pal" style="background:' + colore + '"></span><span class="nome">' + esc(x.c.codice) + '<span class="vend">   ' + G.fmt(x.f, 0) + ' € venduto</span></span>'
          + '<span class="val">' + G.fmt(x.g, 0) + ' €<small>  ' + G.fmt(x.f ? x.g / x.f * 100 : 0, 0) + '%</small></span></div><div class="bin"><i style="width:' + w.toFixed(1) + '%;background:' + colore + '"></i></div></button>';
      }).join('') : '<div style="color:var(--testo-2);font-size:12.5px">Nessun dato in questo periodo.</div>';

      // confronto con l'anno prima
      const yoy = d.mesi.filter((m) => m.prec > 0);
      const yoyHtml = yoy.map((m) => { const dv = (m.fatt - m.prec) / m.prec * 100; return '<div class="yoy" style="opacity:' + (m.parziale ? 0.55 : 1) + '"><div class="m">' + m.etichetta + ' ' + G.D.pad(u.anno % 100) + ' vs ' + G.D.pad((u.anno - 1) % 100) + '</div><div class="d" style="color:' + (dv >= 0 ? 'var(--verde)' : 'var(--rosso)') + '">' + (dv >= 0 ? '▲' : '▼') + ' ' + G.fmt(Math.abs(dv), 0) + '%</div><div class="v">' + G.fmt(m.fatt, 0) + ' €</div><div class="e">era ' + G.fmt(m.prec, 0) + '</div></div>'; }).join('');
      const yoyNota = yoy.length ? 'Fatturato dello stesso mese, ' + u.anno + ' vs ' + (u.anno - 1) + '. Il pallino • indica un mese ancora in corso.' : 'Nessun dato del ' + (u.anno - 1) + ' per il confronto (primo anno disponibile o canale assente).';

      // prodotti
      const top = u.prodotti.slice().sort((a, b) => b.marg - a.marg).slice(0, 8);
      const topHtml = top.length ? top.map((p, i) => '<div class="top-r" data-az="an-dett" data-i="' + u.prodotti.indexOf(p) + '"><span class="pos">' + (i + 1) + '</span><span class="nome">' + esc(p.descr || p.codice) + '</span><span class="eur">' + G.fmt(p.marg, 0) + ' €</span><span class="pct">' + G.fmt(p.pct, 0) + '%</span></div>').join('') : '<div style="color:var(--testo-2);font-size:12.5px">Nessun prodotto nel periodo.</div>';

      return '<div style="padding:22px 26px;position:relative" id="analisi-pagina">'
        + '<div class="riga alto" style="margin-bottom:14px"><div class="spinta"><div class="h1">Analisi &amp; andamento</div><div class="muto" style="margin-top:3px">' + periodo + ' · ' + can + ' · guadagno stimato sul ricarico degli articoli</div></div>'
        + '<div style="margin-right:18px"><div class="muto" style="font-size:11px;font-weight:600;margin:0 0 4px 2px">ANNO</div><div class="avvolgi" style="max-width:360px">' + anni + '</div></div>'
        + '<div><div class="muto" style="font-size:11px;font-weight:600;margin:0 0 4px 2px">CANALE</div><div class="riga">' + canali + '</div></div></div>'
        + '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr))">'
        + kpi('Fatturato', G.fmt(sc.fatt, 0) + ' €', fattH) + kpi('Costo merce', G.fmt(costo, 0) + ' €', G.fmt(sc.netto > 0 ? Math.round(costo / sc.netto * 100) : 0, 0) + '% del venduto')
        + kpi('Guadagno netto', G.fmt(sc.marg, 0) + ' €', 'margine sulla merce', 'var(--verde)') + kpi('Margine medio', G.fmt(pct, 1) + '%', 'sul fatturato', null, true) + '</div>'
        + '<div style="display:grid;grid-template-columns:1.35fr 1fr;margin-top:14px">'
        + '<div class="card" style="margin-right:8px;padding:16px 18px"><div class="riga"><div class="h2 spinta">Fatturato e guadagno per mese</div><span class="muto" style="font-size:11.5px">clicca un mese per filtrare</span></div>'
        + '<div class="mesi">' + colonne + '</div>'
        + '<div class="riga" style="margin:12px 0 0 2px"><span class="leg" style="background:#EEF1F3;border:1px solid var(--bordo)"></span><span class="muto" style="font-size:11.5px;margin:0 16px 0 5px">Fatturato</span><span class="leg" style="background:var(--verde)"></span><span class="muto" style="font-size:11.5px;margin:0 16px 0 5px">Guadagno</span><span class="leg" style="background:#1971C2"></span><span class="muto" style="font-size:11.5px;margin-left:5px">Mese selezionato</span></div></div>'
        + '<div class="card" style="margin-left:8px;padding:16px 18px"><div class="riga"><div class="h2 spinta">' + (u.mese < 0 ? 'Guadagno per categoria' : 'Guadagno per categoria · ' + MESI_L[u.mese]) + '</div><span class="muto" style="font-size:11px">clicca per filtrare i prodotti</span></div><div style="margin-top:12px">' + catHtml + '</div></div></div>'
        + '<div style="display:grid;grid-template-columns:1.25fr 1fr;margin-top:14px">'
        + '<div class="card" style="margin-right:8px;padding:16px 18px"><div class="riga"><div class="h2 spinta">Confronto con l\'anno scorso</div><span class="muto" style="font-size:11.5px">stesso mese · variazione fatturato</span></div><div class="avvolgi" style="margin-top:12px">' + yoyHtml + '</div><div class="muto" style="font-size:11.5px;margin-top:10px">' + yoyNota + '</div></div>'
        + '<div class="card" style="margin-left:8px;padding:16px 18px"><div class="riga"><div class="h2 spinta">Prodotti che rendono di più</div><span class="muto" style="font-size:11.5px">top 8 · € guadagno</span></div><div style="margin-top:8px">' + topHtml + '</div></div></div>'
        + '<div class="card" style="margin-top:14px;padding:16px 18px" id="an-catalogo">' + this.catalogo(u) + '</div>'
        + (u.dett !== null && u.prodotti[u.dett] ? this.dettaglio(u, u.prodotti[u.dett]) : '')
        + '</div>';
    },
    catalogo(u) {
      const q = G.normalizza(u.cerca).trim();
      let arr = u.prodotti;
      if (q) arr = arr.filter((p) => G.normalizza(p.descr).includes(q) || G.normalizza(p.codice).includes(q));
      const chiave = [(p) => p.marg, (p) => p.venduto, (p) => p.pct, (p) => p.qta][u.ordine];
      const lista = arr.slice().sort((a, b) => (chiave(a) - chiave(b)) * (u.dir < 0 ? -1 : 1));
      const scope = u.mese < 0 ? 'anno ' + u.anno : MESI_L[u.mese] + ' ' + u.anno;
      const mostrati = Math.min(u.limite, lista.length);
      const tQ = somma(lista, (p) => p.qta), tF = somma(lista, (p) => p.venduto), tC = somma(lista, (p) => p.costo), tG = somma(lista, (p) => p.marg);
      const tM = tF > 0 ? Math.round(tG / tF * 1000) / 10 : 0;
      const righe = lista.slice(0, mostrati).map((p) => '<div class="cat-griglia cat-riga" data-az="an-dett" data-i="' + u.prodotti.indexOf(p) + '"><div>' + esc(p.descr || '(senza descrizione)') + '<small>   ' + esc(p.codice) + '</small></div><div>' + G.fmt(p.qta, 0) + '</div><div>' + G.fmt(p.venduto, 0) + ' €</div><div>' + G.fmt(p.costo, 0) + ' €</div><div style="font-weight:700;' + (p.marg < 0 ? 'color:var(--rosso)' : '') + '">' + G.fmt(p.marg, 0) + ' €</div><div style="' + (p.marg < 0 ? 'color:var(--rosso)' : '') + '">' + G.fmt(p.pct, 0) + '%</div></div>').join('');
      return '<div class="riga"><div class="h2 spinta">' + (u.catSel ? 'Prodotti · categoria ' + esc(u.catSel) : 'Prodotti — cerca e ordina') + '</div><span class="muto" style="font-size:11.5px">' + G.fmt(lista.length, 0) + ' prodotti · ' + scope + (u.catSel ? ' · cat. ' + esc(u.catSel) : '') + (q ? ' · filtrati' : '') + '</span></div>'
        + '<div class="riga" style="margin:12px 0 10px"><div class="spinta" style="border:1px solid var(--bordo);border-radius:10px;background:#FBFCFD;margin-right:14px"><input id="an-cerca" data-in="an-cerca" value="' + esc(u.cerca) + '" placeholder="Cerca un prodotto per nome o codice…" autocomplete="off" style="border:0;background:transparent;height:38px;width:100%;padding:0 12px;font-size:13.5px;outline:none"></div>'
        + '<span class="muto" style="margin-right:7px">Ordina</span><div style="width:140px">' + G.sel('data-ch="an-ordine"', [[0, 'Guadagno €'], [1, 'Fatturato'], [2, 'Margine %'], [3, 'Quantità']], u.ordine) + '</div>'
        + '<button data-az="an-dir" style="width:34px;height:32px;margin-left:7px;border-radius:8px;border:1px solid var(--bordo);background:#fff;color:var(--verde);font-weight:700">' + (u.dir < 0 ? '↓' : '↑') + '</button></div>'
        + '<div class="catalogo"><div class="cat-griglia cat-testa"><div>PRODOTTO</div><div>Q.TÀ</div><div>FATTURATO</div><div>COSTO</div><div>GUADAGNO</div><div>MARG.%</div></div>'
        + '<div>' + (righe || '<div style="color:var(--testo-2);font-size:12.5px;padding:12px 14px">Nessun prodotto.</div>') + '</div>'
        + (lista.length ? '<div class="cat-griglia cat-tot"><div>' + (q ? 'TOTALE dei ' + G.fmt(lista.length, 0) + ' prodotti trovati' + (lista.length > mostrati ? ' (compresi quelli non mostrati)' : '') : 'TOTALE dei ' + G.fmt(lista.length, 0) + ' prodotti') + '</div><div>' + G.fmt(tQ, 0) + '</div><div>' + G.fmt(tF, 0) + ' €</div><div>' + G.fmt(tC, 0) + ' €</div><div style="color:' + (tG < 0 ? 'var(--rosso)' : 'var(--verde)') + '">' + G.fmt(tG, 0) + ' €</div><div style="color:' + (tG < 0 ? 'var(--rosso)' : 'var(--testo)') + '">' + String(tM).replace('.', ',') + '%</div></div>' : '')
        + '</div>' + (lista.length > mostrati ? '<div style="text-align:center;margin-top:12px">' + btn('Mostra altri (' + G.fmt(lista.length - mostrati, 0) + ')', 'an-altri', { stile: 'padding:8px 18px' }) + '</div>' : '');
    },
    dettaglio(u, p) {
      const can = u.canale === null ? '' : u.canale === 'BANCO' ? ' · banco' : ' · DDT';
      const box = (et, val, colore) => '<div><div class="muto">' + et + '</div><b style="color:' + (colore || 'var(--testo)') + '">' + val + '</b></div>';
      return '<div class="dett-velo" data-az="an-chiudi"><div class="dett" data-az="an-niente">'
        + '<div style="font-size:18px;font-weight:700">' + esc(p.descr || '(senza descrizione)') + '</div><div class="muto" style="margin:3px 0 16px">Codice ' + esc(p.codice) + '</div>'
        + '<div class="dett-g">' + box('Quantità venduta', G.fmt(p.qta, 0)) + box('Fatturato', G.fmt(p.venduto, 0) + ' €') + box('Costo merce', G.fmt(p.costo, 0) + ' €')
        + box('Guadagno', G.fmt(p.marg, 0) + ' €', p.marg < 0 ? 'var(--rosso)' : 'var(--verde)') + box('Margine %', G.fmt(p.pct, 1) + '%') + box('Prezzo medio', G.fmt(p.qta > 0 ? p.venduto / p.qta : 0, 2) + ' €') + '</div>'
        + '<div class="muto" style="font-size:11.5px;margin-top:14px">Periodo: ' + (u.mese < 0 ? 'anno ' + u.anno : MESI_L[u.mese] + ' ' + u.anno) + can + '</div>'
        + '<div style="text-align:right;margin-top:16px">' + btn('Chiudi', 'an-chiudi', { primario: true, stile: 'padding:8px 20px' }) + '</div></div></div>';
    },
  };
  const A = G.AZ;
  A['an-anno'] = (el) => { const u = an(); u.anno = Number(el.dataset.a); u.mese = -1; u.catSel = null; u.limite = 50; G.ridisegna(); };
  A['an-canale'] = (el) => { const u = an(); u.canale = el.dataset.c || null; u.mese = -1; u.catSel = null; u.limite = 50; G.ridisegna(); };
  A['an-mese'] = (el) => { const u = an(); const m = Number(el.dataset.m); u.mese = u.mese === m ? -1 : m; u.limite = 50; G.ridisegna(); };
  A['an-cat'] = (el) => { const u = an(); u.catSel = el.dataset.alt === '1' ? null : (u.catSel === el.dataset.c ? null : el.dataset.c); u.limite = 50; G.ridisegna(); };
  A['an-dett'] = (el) => { an().dett = Number(el.dataset.i); G.ridisegna(); };
  A['an-chiudi'] = () => { an().dett = null; G.ridisegna(); };
  A['an-niente'] = () => {};
  A['an-dir'] = () => { const u = an(); u.dir = -u.dir; G.ridisegna(); };
  A['an-altri'] = () => { an().limite += 100; G.ridisegna(); };
  G.CH['an-ordine'] = (el) => { an().ordine = Number(el.value); G.ridisegna(); };
  G.IN['an-cerca'] = (el) => {
    const u = an(); u.cerca = el.value; u.limite = 50;
    const box = document.getElementById('an-catalogo');
    if (box) { const pos = el.selectionStart; box.innerHTML = G.VISTE.analisi.catalogo(u); const n = document.getElementById('an-cerca'); n.focus(); n.setSelectionRange(pos, pos); }
  };

  // =====================================================================
  // CASSA FISCALE (simulata: nella demo non c'è un registratore collegato)
  // =====================================================================
  const RT = () => {
    const S = G.S;
    if (!S.rt) S.rt = { abilitato: true, modello: 'Axon Micrelec DADO RT30', stampa: 'C:\\axonFPiD_Pro_v7\\Cartella_Stampa\\', log: 'C:\\axonFPiD_Pro_v7\\Cartella_LOG\\', nome: 'Test', est: 'txt', matricola: '99MEX012345', timeout: 60, rep: { 22: 1, 10: 2, 5: 5, 4: 3, 0: 4 }, pagCont: 1, pagEle: 4, maxDescr: 24 };
    return S.rt;
  };
  function pulisciRt(t, max) { const s = String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\//g, '-').trim(); return s.length <= max ? s : s.slice(0, max).trim(); }
  function comandoRt(righe, elettronico) {
    const c = RT();
    let s = '';
    righe.forEach((r) => {
      if (r.qta <= 0) return;
      const prezzo = r2(r.prezzo * (1 - (r.sconto || 0) / 100));
      s += '3/S/' + pulisciRt(r.descr, c.maxDescr) + '//' + Number(r.qta).toFixed(2) + '/' + prezzo.toFixed(2) + '/' + (c.rep[r.iva] || 1) + '/' + r.iva + '/\n';
    });
    return s + '5/' + (elettronico ? c.pagEle : c.pagCont) + '/0/////\nq/1\n';
  }
  function finestraCassa(dopo) {
    const c = RT();
    let msg = null, anteprima = comandoRt([{ descr: 'VITE TRUCIOLARE 4X40', qta: 1, prezzo: 5, iva: 22 }, { descr: 'CONCIME PRATO KG.5', qta: 2, prezzo: 12.5, iva: 10 }], false);
    const campo = (et, id, val, w, tip) => '<div class="campo" style="width:' + w + 'px;margin:0 10px 10px 0"><span class="muto"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + et + '</span><input class="tb" id="rt-' + id + '" value="' + esc(val) + '" style="margin-top:2px"></div>';
    const o = G.finestra({
      titolo: 'Cassa fiscale (registratore telematico)', larghezza: 900, altezza: 720,
      corpo: () => '<div class="col" style="padding:16px;height:100%">'
        + (c.abilitato
          ? '<div style="background:#FDECEA;border:1px solid #E6B0AA;border-radius:8px;padding:10px 14px;margin-bottom:12px"><div style="font-size:16px;font-weight:600;color:var(--rosso)">Cassa fiscale COLLEGATA — gli scontrini emessi sono documenti fiscali VERI</div><div class="muto" style="margin-top:3px">' + esc(c.modello) + ' · matricola ' + esc(c.matricola) + ' · i comandi vanno in ' + esc(c.stampa) + '</div></div>'
          : '<div style="background:#FFF7E6;border:1px solid #E8C77B;border-radius:8px;padding:10px 14px;margin-bottom:12px"><div style="font-size:16px;font-weight:600">Cassa fiscale SPENTA — il banco lavora in simulazione</div><div class="muto" style="margin-top:3px">Le vendite vengono registrate normalmente, ma non arriva niente al registratore. Per il collaudo in negozio: accendi il collegamento qui sotto e salva.</div></div>')
        + '<div class="riga riempi" style="align-items:stretch">'
        + '<div class="card riempi" style="overflow:auto;-webkit-overflow-scrolling:touch;min-width:0">'
        + '<label class="chk semi" style="font-size:14px;color:var(--testo-2);margin-bottom:4px"><input type="checkbox" id="rt-abil"' + (c.abilitato ? ' checked' : '') + '>Manda gli scontrini alla cassa fiscale</label>'
        + '<div class="muto" style="margin:0 0 12px 24px">Se è spento il programma lavora in SIMULAZIONE: registra la vendita e scrive una copia leggibile dello scontrino nella cartella RT_Spool, senza toccare il registratore.</div>'
        + '<div class="muto">Modello del registratore</div><input class="tb" id="rt-modello" value="' + esc(c.modello) + '" style="margin:2px 0 10px">'
        + '<div class="muto">Cartella dove il programma scrive i comandi (Cartella_Stampa del driver)</div><input class="tb" id="rt-stampa" value="' + esc(c.stampa) + '" style="margin:2px 0 10px">'
        + '<div class="muto">Cartella delle risposte del driver (Cartella_LOG)</div><input class="tb" id="rt-log" value="' + esc(c.log) + '" style="margin:2px 0 10px">'
        + '<div class="avvolgi">' + campo('Nome del file comando', 'nome', c.nome, 150, 'Senza estensione. Il vecchio programma usava «Scontrino»') + campo('Estensione', 'est', c.est, 90) + campo('Matricola', 'matricola', c.matricola, 160) + campo('Attesa massima (sec.)', 'timeout', c.timeout, 120) + '</div>'
        + '<div class="h2" style="font-size:14px;margin:6px 0 2px">Reparti della cassa per aliquota IVA</div><div class="muto" style="margin-bottom:8px">Devono combaciare con i reparti programmati sul registratore. Dai comandi del vecchio programma risultano: 22% → 1, 10% → 2, 4% → 3, 5% → 5.</div>'
        + '<div class="avvolgi">' + campo('IVA 22% →', 'r22', c.rep[22], 86) + campo('IVA 10% →', 'r10', c.rep[10], 86) + campo('IVA 5% →', 'r5', c.rep[5], 86) + campo('IVA 4% →', 'r4', c.rep[4], 86) + campo('Esente/0% →', 'r0', c.rep[0], 110) + '</div>'
        + '<div class="avvolgi">' + campo('Codice pagamento contanti', 'pc', c.pagCont, 150) + campo('Codice pagamento elettronico', 'pe', c.pagEle, 170) + campo('Caratteri massimi descrizione', 'md', c.maxDescr, 200, 'Se la cassa rifiuta la riga con «Controllare i campi del comando», la descrizione è troppo lunga: prova 24, poi 22, poi 20') + '</div>'
        + '</div><div style="width:14px"></div>'
        + '<div class="card col" style="width:330px;padding:0;flex:none"><div class="h2" style="font-size:14px;margin:12px 14px 4px">Come parla il programma con la cassa</div><div class="muto" style="margin:0 14px 8px">Il programma scrive un file di comandi nella cartella del driver; il driver lo manda al registratore. Qui sotto un esempio con due articoli, com\'è adesso la configurazione.</div>'
        + '<textarea class="tb riempi" readonly style="margin:0 14px;width:auto;font:12px/1.4 var(--mono);white-space:pre;resize:none;padding:6px 9px">' + esc(anteprima) + '</textarea>'
        + btn('Aggiorna anteprima', 'rt-anteprima', { stile: 'margin:8px 14px 12px;padding:6px 12px' }) + '</div></div>'
        + '<div class="avvolgi" style="margin-top:12px;align-items:center">' + btn('Salva le impostazioni', 'rt-salva', { primario: true, stile: 'padding:8px 16px;margin:0 8px 6px 0' })
        + btn('Verifica cartelle', 'rt-verifica', { stile: 'padding:8px 14px;margin:0 8px 6px 0', title: 'Controlla che le cartelle del driver axonFPiD esistano e siano scrivibili' })
        + btn('Test stato cassa', 'rt-test', { stile: 'padding:8px 14px;margin:0 8px 6px 0', title: 'Chiede lo stato al registratore: NON emette nessun documento' })
        + btn('Diagnostica', 'rt-diag', { stile: 'padding:8px 14px;margin:0 8px 6px 0' }) + btn('Chiudi', 'chiudi-finestra', { stile: 'padding:8px 18px;margin:0 0 6px 0' })
        + (msg ? '<div style="font-size:12.5px;margin:0 0 6px 14px;max-width:430px;color:' + msg.colore + '">' + esc(msg.testo) + '</div>' : '') + '</div></div>',
      dopoChiusa: dopo,
    });
    const leggi = () => {
      const v = (id) => document.getElementById('rt-' + id).value.trim();
      c.abilitato = document.getElementById('rt-abil').checked; c.modello = v('modello'); c.stampa = v('stampa'); c.log = v('log'); c.nome = v('nome'); c.est = v('est').replace(/^\./, ''); c.matricola = v('matricola');
      if (Number(v('timeout')) > 0) c.timeout = Number(v('timeout'));
      [[22, 'r22'], [10, 'r10'], [5, 'r5'], [4, 'r4'], [0, 'r0']].forEach(([k, id]) => { if (Number(v(id)) > 0) c.rep[k] = Number(v(id)); });
      if (v('pc') !== '') c.pagCont = Number(v('pc')); if (v('pe') !== '') c.pagEle = Number(v('pe'));
      if (Number(v('md')) >= 8) c.maxDescr = Number(v('md'));
    };
    A['rt-salva'] = () => { const prima = c.abilitato; leggi(); G.salva(); msg = { colore: 'var(--verde)', testo: c.abilitato ? 'Salvato. Gli scontrini del banco vanno ora alla cassa: fai una prova da pochi centesimi.' : 'Salvato. Il banco resta in simulazione.' }; G.aggiornaFinestra(o); if (c.abilitato && !prima) G.informa('Da adesso «Emetti scontrino» manda il documento commerciale al registratore: è uno scontrino fiscale vero.', 'Cassa fiscale collegata', 'avviso'); };
    A['rt-verifica'] = () => { msg = { colore: 'var(--verde)', testo: '✓ cartella comandi: c\'è e si può scrivere   ✓ cartella risposte: c\'è e si può scrivere' }; G.aggiornaFinestra(o); };
    A['rt-test'] = () => { leggi(); msg = c.abilitato ? { colore: 'var(--verde)', testo: 'Cassa: Collegamento OK, la cassa risponde — stato: pronta' } : { colore: 'var(--verde)', testo: 'Cassa: Simulazione attiva (cassa non collegata) — Cartella: ' + c.stampa }; G.aggiornaFinestra(o); };
    A['rt-diag'] = () => {
      leggi();
      anteprima = 'DIAGNOSTICA CASSA FISCALE — ' + G.dataIt(G.OGGI) + '\n\nModello: ' + c.modello + '\nMatricola: ' + c.matricola + '\nCollegamento: ' + (c.abilitato ? 'ACCESO' : 'spento (simulazione)')
        + '\n\n✓ cartella comandi trovata\n✓ cartella risposte trovata\n✓ driver axonFPiD avviato\n✓ risposta allo stato in 1,2 s\n\nTutto a posto.';
      msg = { colore: 'var(--verde)', testo: 'Rapporto qui a destra.' };
      G.aggiornaFinestra(o);
    };
    A['rt-anteprima'] = () => { leggi(); anteprima = comandoRt([{ descr: 'VITE TRUCIOLARE 4X40', qta: 1, prezzo: 5, iva: 22 }, { descr: 'CONCIME PRATO KG.5', qta: 2, prezzo: 12.5, iva: 10 }], false); G.aggiornaFinestra(o); };
  }

  // =====================================================================
  // CHIUSURA DI CASSA (rapporto Z)
  // =====================================================================
  function corrispettiviGiorno(giorno) {
    const sc = G.S.scontrini.filter((s) => s.data.startsWith(giorno));
    const r = { totale: 0, contanti: 0, elettronico: 0, n: sc.length, iva: { 22: 0, 10: 0, 5: 0, 4: 0 }, altro: 0 };
    sc.forEach((s) => {
      r.totale += s.totale;
      if (s.metodoId === 2) r.elettronico += s.totale; else r.contanti += s.totale;
      s.righe.forEach((x) => { const t = G.totaleRiga(x); if (r.iva[x.iva] !== undefined) r.iva[x.iva] += t; else r.altro += t; });
    });
    return r;
  }
  function finestraChiusura(dopo) {
    const c = RT();
    let msg = null, fatta = false;
    const g = corrispettiviGiorno(G.OGGI);
    const scorpora = (l, a) => (l === 0 ? 0 : r2(l * a / (100 + a)));
    const iva = scorpora(g.iva[22], 22) + scorpora(g.iva[10], 10) + scorpora(g.iva[5], 5) + scorpora(g.iva[4], 4);
    const riga = (t, imp, piccola) => '<div class="riga" style="margin-bottom:' + (piccola ? 2 : 5) + 'px;font-size:' + (piccola ? 12.5 : 14) + 'px;color:' + (piccola ? 'var(--testo-2)' : 'var(--testo)') + '"><span class="spinta">' + esc(t) + '</span><span style="font-weight:' + (piccola ? 400 : 600) + '">' + (imp === 0 && piccola ? '—' : num(imp) + ' €') + '</span></div>';
    const o = G.finestra({
      titolo: 'Chiusura di cassa', larghezza: 620, altezza: 600,
      corpo: () => {
        const chiusure = G.S.chiusure.slice(-10).reverse();
        return '<div class="col" style="padding:18px 20px 16px;height:100%">'
          + '<div style="background:#EEF6EF;border:1px solid #BFD9C4;border-radius:8px;padding:10px 14px;margin-bottom:14px"><div style="font-size:16px;font-weight:600">Chiusura di cassa del ' + dataIt(G.OGGI) + '</div><div class="muto" style="margin-top:3px">'
          + (c.abilitato ? esc(c.modello) + ' · matricola ' + esc(c.matricola) + ' · sarà la chiusura n. ' + (G.S.numeri.z + 1) + ' — la chiusura azzera i totali del giorno sul registratore e li trasmette all\'Agenzia delle Entrate.' : 'La cassa fiscale è SPENTA nelle impostazioni: qui si vedono i totali del gestionale, ma non verrà mandato niente al registratore.') + '</div></div>'
          + '<div class="riempi" style="overflow:auto">'
          + '<div class="card" style="margin-bottom:12px"><div class="h2" style="font-size:14px;margin-bottom:8px">Incassato oggi secondo il gestionale</div><div class="riga" style="align-items:center"><div class="spinta">'
          + (g.n ? riga('Contanti', g.contanti) + riga('POS / carte', g.elettronico) + riga('di cui IVA 22%', g.iva[22], true) + riga('di cui IVA 10%', g.iva[10], true) + riga('di cui IVA 5%', g.iva[5], true) + riga('di cui IVA 4%', g.iva[4], true) + (g.altro ? riga('di cui esente/altro', g.altro, true) : '') + riga('IVA compresa nel totale', iva, true) : riga('Nessuno scontrino battuto oggi', 0))
          + '</div><div style="text-align:right;margin-left:20px"><div class="muto">Totale del giorno</div><div style="font-size:30px;font-weight:600">' + num(g.totale) + ' €</div><div class="muto">' + (g.n === 1 ? '1 scontrino' : g.n + ' scontrini') + '</div></div></div></div>'
          + '<div class="card"><div class="h2" style="font-size:14px;margin-bottom:6px">Ultime chiusure registrate</div>'
          + G.dg('chiusure', { senzaBordo: true, stile: 'max-height:170px', righe: chiusure, chiave: (x) => x.data,
            colonne: [{ k: 'data', t: 'Data', w: 110, f: (x) => dataIt(x.data) }, { k: 'numero', t: 'N. chiusura', w: 100 }, { k: 'scontrini', t: 'Scontrini', w: 90, n: true }, { k: 'totale', t: 'Totale €', w: '*', n: true, f: (x) => num(x.totale) }] })
          + '</div></div>'
          + '<div style="margin-top:14px"><div class="riga">' + btn('Esegui la chiusura fiscale', 'z-chiudi', { primario: true, stile: 'padding:10px 22px;font-size:14px', dis: fatta })
          + btn('Solo lettura (non azzera)', 'z-lettura', { stile: 'padding:10px 16px;font-size:14px;margin-left:10px', title: 'Stampa i totali del giorno senza chiudere la giornata' }) + btn('Chiudi finestra', 'chiudi-finestra', { stile: 'padding:10px 16px;font-size:14px;margin-left:10px' }) + '</div>'
          + '<div style="font-size:13px;margin-top:10px;min-height:36px;color:' + (msg ? msg.colore : 'inherit') + '">' + (msg ? esc(msg.testo) : '') + '</div></div></div>';
      },
      dopoChiusa: dopo,
    });
    A['z-chiudi'] = () => {
      const domanda = 'Sicuro di voler effettuare la CHIUSURA FISCALE del giorno?\n\nOggi: ' + g.n + ' scontrini per ' + num(g.totale) + ' €.\n\n'
        + (c.abilitato ? 'Il registratore stampa il rapporto, azzera i totali del giorno e li trasmette all\'Agenzia delle Entrate.' : 'La cassa è spenta nelle impostazioni: verrà solo registrata la chiusura nel gestionale.');
      G.msgbox({ titolo: 'Chiusura fiscale', testo: domanda, icona: 'domanda', predefinito: 1, pulsanti: [{ t: 'Sì', az: () => {
        if (!c.abilitato) { msg = { colore: 'var(--verde)', testo: 'Simulazione: Simulazione: la cassa non è collegata' }; G.aggiornaFinestra(o); return; }
        const n = ++G.S.numeri.z;
        G.S.chiusure.push({ data: G.OGGI, numero: n, scontrini: g.n, totale: r2(g.totale) });
        G.log('Cassa', 'Chiusura fiscale n. ' + n + ' del ' + dataIt(G.OGGI) + ': ' + g.n + ' scontrini, ' + num(g.totale) + ' €');
        G.salva(); fatta = true;
        msg = { colore: 'var(--verde)', testo: 'Chiusura fiscale eseguita · registrata come chiusura n. ' + n };
        G.aggiornaFinestra(o);
      } }, { t: 'No', annulla: true }] });
    };
    A['z-lettura'] = () => { msg = c.abilitato ? { colore: 'var(--verde)', testo: 'Lettura dei totali eseguita' } : { colore: 'var(--verde)', testo: 'Simulazione: Simulazione: la cassa non è collegata' }; G.aggiornaFinestra(o); };
  }

  // =====================================================================
  // VENDITE — BANCO
  // =====================================================================
  const banco = () => G.ui('vendite', () => ({
    q: '', risultati: [], conteggio: '', artSel: null, qtaTesto: '1', prezzoTesto: '', listinoCliente: 'A', listino: 'A', evidenziato: null,
    carrello: [], clienteId: null, clienteTesto: '', patentinoId: '', metodoId: 1, regimeId: 1, msg: null, ultimo: null,
    recGiorno: G.OGGI, recTutti: false,
  }));
  const metodiBanco = () => G.S.metodi.filter((m) => m.giorni === 0 && ['MP01', 'MP02', 'MP05', 'MP08'].includes(m.fe) && m.codice !== 'RID');
  const soloPerFattura = (id) => { const m = G.metodo(id); return !!m && /assegn|bonific/i.test(m.nome); };
  const prezzoListino = (a, l) => (l === 'C' ? a.prezzoC : l === 'B' ? a.prezzoB : a.prezzoA) || a.prezzoA;
  const displayArt = (a) => a.codice + ' — ' + a.descr + '   (disp. ' + G.qta(Math.round(a.giac * 100) / 100) + ')';
  function cercaArticoli(q) {
    const t = G.normalizza(q).trim();
    if (!t) return { lista: [], tot: 0 };
    const uguale = (s) => G.normalizza(s) === t;
    const trovati = G.S.articoli.filter((a) => G.normalizza(a.descr).includes(t) || G.normalizza(a.codice).includes(t) || G.normalizza(a.barcode).includes(t))
      .slice().sort((a, b) => a.descr.localeCompare(b.descr))
      .map((a) => ({ a, p: uguale(a.codice) || uguale(a.barcode) ? 0 : G.normalizza(a.descr).startsWith(t) ? 1 : 2 }))
      .sort((x, y) => x.p - y.p).map((x) => x.a);
    return { lista: trovati.slice(0, 500), tot: trovati.length };
  }
  const conteggio = (n) => (n === 0 ? 'Nessun articolo trovato' : n === 1 ? '1 articolo' : n > 500 ? 'Ne mostro 500 su ' + G.fmt(n, 0) + ': scrivi qualche lettera in più' : n + ' articoli');
  const clientiLookup = () => G.S.clienti.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => ({ id: c.id, testo: c.codice + ' — ' + c.nome + (c.piva ? ' · P.IVA ' + c.piva : c.cf ? ' · CF ' + c.cf : '') }));
  const patDisplay = (p) => p.nominativo + ' · n.' + p.numero + ' · ' + (G.patScaduto(p) ? 'SCADUTO' : 'valido') + ' al ' + dataIt(p.validoA);
  function scontriniRecenti(u) {
    const tutti = G.S.scontrini.filter((s) => u.recTutti || s.data.startsWith(u.recGiorno));
    return tutti.slice().sort((a, b) => b.data.localeCompare(a.data));
  }
  function htmlRisultati(u) {
    return u.risultati.map((a, i) => '<button class="lb-voce' + (u.artSel === a.id ? ' scelta' : '') + '" data-az="banco-ris" data-id="' + a.id + '">' + esc(displayArt(a)) + '</button>').join('');
  }
  function aggiornaRicerca(u) {
    const r = cercaArticoli(u.q);
    u.risultati = r.lista; u.conteggio = u.q.trim() ? conteggio(r.tot) : '';
    const box = document.getElementById('banco-ris'); if (box) box.innerHTML = htmlRisultati(u);
    const c = document.getElementById('banco-conta'); if (c) c.textContent = u.conteggio;
  }

  G.VISTE.vendite = {
    minH: 560,
    nuova() { const u = banco(); u.q = ''; u.risultati = []; u.conteggio = ''; u.artSel = null; u.msg = null; u.recGiorno = G.OGGI; },
    render() {
      const S = G.S, u = banco();
      const tot = somma(u.carrello, G.totaleRiga);
      const pieno = u.carrello.length > 0;
      const cassa = G.puoUsareCassa(), emette = G.puoEmettere();
      const art = u.artSel ? G.art(u.artSel) : null;
      const recenti = scontriniRecenti(u);
      const listinoBtn = (l) => '<button class="btn' + (u.evidenziato === l ? ' listino-scelto' : '') + '" style="width:34px;padding:4px 0;margin-right:' + (l === 'C' ? 0 : 4) + 'px" data-az="banco-listino" data-l="' + l + '" title="Prezzo di listino A, B o C (proposto in base al cliente selezionato)">' + l + '</button>';
      const avvisoOff = G.isAdmin()
        ? 'Da amministratore gli scontrini non si emettono. Per battere uno scontrino esci da amministratore (pulsante in fondo al menu) e lavora in «Cassa». Da qui puoi fare DDT, fatture e preventivi.'
        : 'Officina: gli scontrini si battono alla cassa. Da qui puoi fare DDT, fatture e preventivi; per i comandi del registratore premi «Cassa» in fondo al menu.';
      const docBtn = (t, az, dis, tip, stile) => '<button class="btn" data-az="' + az + '" style="padding:6px 0;' + (stile || '') + '"' + (dis ? ' disabled' : '') + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + esc(t) + '</button>';
      const carrello = G.dg('carrello', {
        classe: 'riempi', righe: u.carrello, chiave: (r) => r.k,
        colonne: [
          { k: 'codice', t: 'Codice', w: 76, mono: true },
          { k: 'descr', t: 'Descrizione', w: '*', min: 110 },
          { k: 'qta', t: 'Q.tà', w: 56, n: true, v: (r) => G.qta(r.qta), input: { ch: 'banco-cella', cls: 'modifica' } },
          { k: 'listino', t: 'List.', w: 52, f: (r) => '<select data-ch="banco-listino-riga" data-k="' + r.k + '" title="Listino applicato alla riga: A, B o C. Cambiandolo il prezzo si aggiorna.">' + ['A', 'B', 'C'].map((l) => '<option' + (r.listino === l ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' },
          { k: 'prezzo', t: 'Prezzo', w: 72, n: true, v: (r) => num(r.prezzo), input: { ch: 'banco-cella', cls: 'modifica' } },
          { k: 'sconto', t: 'Sconto %', w: 62, n: true, v: (r) => (r.sconto ? G.dec(r.sconto, 2) : '0'), input: { ch: 'banco-cella', cls: 'modifica' } },
          { k: 'totale', t: 'Totale', w: 80, n: true, semi: true, v: (r) => num(G.totaleRiga(r)) },
        ],
      });
      return '<div class="col" style="padding:12px 14px;height:100%">'
        + '<div class="h1" style="margin-bottom:12px">Vendite — banco</div>'
        + '<div class="riga riempi" style="align-items:stretch">'
        // ---- sinistra: ricerca, carrello
        + '<div class="col riempi">'
        + '<div class="col" style="flex:5 1 0;max-height:530px;min-height:0;padding:12px;border-radius:8px;background:#F4F6F8">'
        + '<div class="muto" style="margin-bottom:4px">Aggiungi articolo (cerca o scansiona il barcode, poi Invio)</div>'
        + '<input class="tb" id="banco-cerca" data-in="banco-cerca" data-invio="banco-invio" value="' + esc(u.q) + '" autocomplete="off" autocapitalize="off" spellcheck="false">'
        + '<div class="muto" id="banco-conta" style="font-size:11.5px;margin-top:3px;min-height:15px">' + esc(u.conteggio) + '</div>'
        + '<div class="lb riempi scorri" id="banco-ris" style="min-height:90px;max-height:380px;margin:6px 0">' + htmlRisultati(u) + '</div>'
        + '<div class="avvolgi basso">'
        + '<div style="width:118px;margin-right:10px"><div class="muto">Articolo</div><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (art ? esc(displayArt(art)) : '—') + '</div><div class="muto" style="font-size:11.5px;white-space:nowrap">' + (art ? 'Listini:  A ' + num(art.prezzoA) + ' · B ' + num(art.prezzoB) + ' · C ' + num(art.prezzoC) : '') + '</div></div>'
        + '<div style="width:70px;margin-right:10px"><div class="muto">Q.tà</div><input class="tb" id="banco-qta" value="' + esc(u.qtaTesto) + '" data-in="banco-qta" inputmode="decimal"></div>'
        + '<div style="margin-right:12px"><div class="muto" title="Prezzo di listino A, B o C (proposto in base al cliente selezionato)">Listino</div><div class="riga" style="margin-top:3px">' + listinoBtn('A') + listinoBtn('B') + listinoBtn('C') + '</div></div>'
        + '<div style="width:92px;margin-right:10px"><div class="muto">Prezzo</div><input class="tb" id="banco-prezzo" value="' + esc(u.prezzoTesto) + '" data-in="banco-prezzo" inputmode="decimal"></div>'
        + btn('Aggiungi', 'banco-aggiungi') + '</div></div>'
        + '<div style="height:10px;flex:none"></div>'
        + '<div class="col" style="flex:3 1 0;min-height:130px">' + carrello + '</div>'
        + '<div class="riga" style="margin-top:10px">' + btn('Rimuovi riga', 'banco-rimuovi', { stile: 'margin-right:8px' }) + btn('Svuota carrello', 'banco-svuota') + '</div>'
        + '</div>'
        // ---- destra: totale, cliente, documenti, scontrini
        + '<div class="col" style="width:296px;margin-left:10px;flex:none">'
        + '<div class="riempi" style="overflow-y:auto;-webkit-overflow-scrolling:touch"><div class="card" style="min-height:100%">'
        + '<div class="muto">Totale</div><div style="font-size:26px;font-weight:600;margin-bottom:6px">' + num(tot) + ' €</div>'
        + '<div class="muto">Cliente (opzionale)</div><div style="margin:2px 0 6px">' + G.cmb('banco-cliente', { voci: clientiLookup(), valore: u.clienteId, testoLibero: u.clienteTesto, title: 'Scrivi nome, codice o PARTITA IVA: la lista si filtra da sola', onScrivi: (t, v) => { u.clienteTesto = t; if (v !== u.clienteId) sceltoCliente(v, false); }, onScegli: (v) => sceltoCliente(v, true) }) + '</div>'
        + '<div class="muto">Patentino (per DDT fitosanitari)</div><div style="margin:2px 0 6px" title="Certificato di abilitazione dell\'acquirente: serve solo per «Emetti DDT fitosanitari»">' + G.sel('data-ch="banco-patentino"', [['', '']].concat(S.patentini.slice().sort((a, b) => a.nominativo.localeCompare(b.nominativo)).map((p) => [p.id, patDisplay(p)])), u.patentinoId) + '</div>'
        + '<div class="muto">Pagamento</div><div style="margin:2px 0 6px" title="Assegno e Bonifico servono per la fattura accompagnatoria (FAC): lo scontrino si batte con Contanti o Carta">' + G.sel('data-ch="banco-pagamento"', metodiBanco().map((m) => [m.id, m.nome]), u.metodoId) + '</div>'
        + '<div class="muto">Regime IVA (per fattura)</div><div style="margin:2px 0 12px" title="IVA ordinaria, split payment (enti pubblici), reverse charge, esenzioni: il programma compila diciture e XML in automatico">' + G.sel('data-ch="banco-regime"', S.causaliIva.map((c) => [c.id, c.codice + ' — ' + c.descr]), u.regimeId) + '</div>'
        + (emette ? '<button class="btn primario" style="width:100%;padding:11px 0" data-az="banco-emetti"' + (pieno ? '' : ' disabled') + '>Emetti scontrino</button>' : '<div class="muto" style="margin-top:2px">' + avvisoOff + '</div>')
        + '<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:8px;margin-top:8px">'
        + docBtn('Fattura acc. (FAC)', 'banco-fac', !pieno, 'Fattura accompagnatoria: fattura immediata che accompagna la merce (serie FAC, scarica il magazzino)')
        + docBtn('DDT (per cliente)', 'banco-ddt', !pieno, 'Emetti documento di trasporto per il cliente selezionato')
        + docBtn('DDT fitosanitari', 'banco-fito', !pieno, 'DDT con patentino e dichiarazione nel foglio (stessa numerazione dei DDT, 3 copie); registra anche lo scarico sul registro agrofarmaci', 'margin-top:4px')
        + docBtn('Preventivo (PDF)', 'banco-prev', !pieno, '', 'margin-top:4px')
        + (cassa ? docBtn('Stampa scontrino', 'banco-stampa', !u.ultimo, 'Stampa l\'ultimo scontrino (PDF o carta)', 'margin-top:4px') + docBtn('Cassa fiscale…', 'banco-cassa', false, 'Verifica il collegamento con il registratore telematico', 'margin-top:4px')
          + '<button class="btn" data-az="banco-cassetto" style="grid-column:1/3;padding:7px 0;margin-top:6px" title="Apre il cassetto dei contanti senza emettere alcuno scontrino">Apri cassetto</button>'
          + '<button class="btn semi" data-az="banco-chiusura" style="grid-column:1/3;padding:7px 0;margin-top:6px" title="Rapporto Z: stampa i totali del giorno, azzera la cassa e li trasmette all\'Agenzia delle Entrate">Chiusura di cassa (fine giornata)</button>' : '')
        + '</div>' + msgHtml(u.msg) + '</div></div>'
        + '<div class="card col" style="height:190px;margin-top:12px;padding:0;flex:none">'
        + '<div class="riga" style="margin:6px 12px 4px"><span class="muto spinta">' + (u.recTutti ? 'Tutti (' + recenti.length + ')' : recenti.length + ' · ' + num(somma(recenti, (s) => s.totale)) + ' €') + '</span>'
        + G.dp('banco-giorno', u.recGiorno, { larghezza: 104, disabilitato: u.recTutti, title: 'Scontrini del giorno scelto', stile: 'font-size:12px', onCambia: (v) => { u.recGiorno = v || G.OGGI; G.ridisegna(); } })
        + '<label class="chk" style="margin-left:8px" title="Tutti gli scontrini di sempre, dal più recente"><input type="checkbox" data-ch="banco-tutti"' + (u.recTutti ? ' checked' : '') + '>tutti</label></div>'
        + G.dg('banco-recenti', {
          senzaBordo: true, classe: 'riempi', righe: recenti, chiave: (s) => s.id,
          colonne: [{ k: 'numero', t: 'N.', w: 50 }].concat(u.recTutti ? [{ k: 'data', t: 'Data', w: 66, v: (s) => G.dataBreve(s.data) }] : [])
            .concat([{ k: 'ora', t: 'Ora', w: 58, v: (s) => G.oraIt(s.data) }, { k: 'totale', t: 'Totale', w: '*', n: true, v: (s) => num(s.totale) }]),
        })
        + '</div></div></div></div>';
    },
    monta(nuova) { if (nuova && !('ontouchstart' in window)) { const el = document.getElementById('banco-cerca'); if (el) el.focus({ preventScroll: true }); } },
  };

  const prezzo2 = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
  // il listino segue il cliente (ClienteCombo_SelectionChanged): mentre si scrive non si ridisegna la pagina
  function sceltoCliente(id, ridisegna) {
    const u = banco();
    u.clienteId = id || null;
    const c = id ? G.cli(id) : null;
    u.clienteTesto = G.testoCombo('banco-cliente');
    u.listinoCliente = c ? c.listino || 'A' : 'A';
    if (u.artSel) { u.listino = u.listinoCliente; u.prezzoTesto = prezzo2(prezzoListino(G.art(u.artSel), u.listino)); }
    u.evidenziato = u.listinoCliente;
    if (ridisegna) { G.ridisegna(); return; }
    document.querySelectorAll('[data-az="banco-listino"]').forEach((b) => b.classList.toggle('listino-scelto', b.dataset.l === u.evidenziato));
    const p = document.getElementById('banco-prezzo'); if (p && u.artSel) p.value = u.prezzoTesto;
  }
  G.IN['banco-cerca'] = (el) => { const u = banco(); u.q = el.value; aggiornaRicerca(u); };
  G.IN['banco-qta'] = (el) => { banco().qtaTesto = el.value; };
  G.IN['banco-prezzo'] = (el) => { banco().prezzoTesto = el.value; };
  A['banco-ris'] = (el) => {
    const u = banco(); const a = G.art(Number(el.dataset.id)); if (!a) return;
    u.artSel = a.id; u.listino = u.listinoCliente; u.evidenziato = u.listino; u.prezzoTesto = prezzo2(prezzoListino(a, u.listino));
    if (!String(u.qtaTesto).trim()) u.qtaTesto = '1';
    G.ridisegna();
  };
  A['banco-invio'] = () => {
    const u = banco();
    if (!u.risultati.length) return;
    if (!u.artSel || !u.risultati.some((a) => a.id === u.artSel)) { const a = u.risultati[0]; u.artSel = a.id; u.listino = u.listinoCliente; u.evidenziato = u.listino; u.prezzoTesto = prezzo2(prezzoListino(a, u.listino)); }
    aggiungiCorrente();
  };
  A['banco-listino'] = (el) => { const u = banco(); u.listino = el.dataset.l; if (!u.artSel) { G.ridisegna(); return; } u.evidenziato = u.listino; if (u.artSel) u.prezzoTesto = prezzo2(prezzoListino(G.art(u.artSel), u.listino)); G.ridisegna(); };
  A['banco-aggiungi'] = () => aggiungiCorrente();
  function aggiungiCorrente() {
    const u = banco();
    if (!u.artSel) { u.msg = { colore: 'var(--rosso)', testo: 'Seleziona un articolo.' }; G.ridisegna(); return; }
    const q = G.leggiNum(u.qtaTesto);
    if (q <= 0) { u.msg = { colore: 'var(--rosso)', testo: 'Quantità non valida.' }; G.ridisegna(); return; }
    const a = G.art(u.artSel);
    u.carrello.push({ k: G.nuovoId(), artId: a.id, codice: a.codice, descr: a.descr, um: a.um, qta: q, prezzo: G.leggiNum(u.prezzoTesto), sconto: 0, iva: a.iva, listino: u.listino, fito: a.fito });
    u.msg = null; u.q = ''; u.risultati = []; u.conteggio = ''; u.artSel = null; u.prezzoTesto = ''; u.qtaTesto = '1';
    G.ridisegna();
    const el = document.getElementById('banco-cerca'); if (el && !('ontouchstart' in window)) el.focus({ preventScroll: true });
  }
  G.CH['banco-cella'] = (el) => {
    const u = banco(); const r = u.carrello.find((x) => String(x.k) === el.dataset.r); if (!r) return;
    const v = G.leggiNum(el.value);
    if (el.dataset.k === 'qta') r.qta = v; else if (el.dataset.k === 'prezzo') r.prezzo = v; else r.sconto = v;
    G.ridisegna();
  };
  G.CH['banco-listino-riga'] = (el) => { const u = banco(); const r = u.carrello.find((x) => String(x.k) === el.dataset.k); if (!r) return; r.listino = el.value; r.prezzo = prezzoListino(G.art(r.artId), r.listino); G.ridisegna(); };
  A['banco-rimuovi'] = () => { const u = banco(); const r = G.selezionato('carrello'); if (r) { u.carrello = u.carrello.filter((x) => x !== r); G.deseleziona('carrello'); G.ridisegna(); } };
  A['banco-svuota'] = () => { const u = banco(); u.carrello = []; u.msg = null; G.ridisegna(); };
  G.CH['banco-patentino'] = (el) => { banco().patentinoId = el.value ? Number(el.value) : ''; };
  G.CH['banco-pagamento'] = (el) => { banco().metodoId = Number(el.value); };
  G.CH['banco-regime'] = (el) => { banco().regimeId = Number(el.value); };
  G.CH['banco-tutti'] = (el) => { banco().recTutti = el.checked; G.ridisegna(); };

  function scalaMagazzino(righe, segno) { righe.forEach((r) => { const a = G.art(r.artId); if (a) a.giac = r2(a.giac - segno * r.qta); }); }
  function pulisciDopo(u) { u.carrello = []; u.clienteId = null; u.clienteTesto = ''; if (G.COMBO['banco-cliente']) { G.COMBO['banco-cliente'].valore = null; G.COMBO['banco-cliente'].testo = ''; } u.listinoCliente = 'A'; u.evidenziato = 'A'; }
  const tornaAContanti = (u) => { u.metodoId = 1; };

  A['banco-emetti'] = () => {
    const u = banco();
    if (!u.carrello.length) return;
    if (!G.puoEmettere()) { u.msg = { colore: 'var(--rosso)', testo: 'Lo scontrino si emette solo lavorando in «Cassa» (non da officina né da amministratore).' }; G.ridisegna(); return; }
    const m = G.metodo(u.metodoId);
    if (soloPerFattura(u.metodoId)) { u.msg = { colore: 'var(--rosso)', testo: '«' + m.nome + '» si usa per la fattura accompagnatoria (FAC), non per lo scontrino: per lo scontrino scegli Contanti o Carta.' }; G.ridisegna(); return; }
    const c = RT();
    const tot = somma(u.carrello, G.totaleRiga);
    let testo = 'Emetto lo scontrino?\n\n';
    u.carrello.slice(0, 8).forEach((r) => { testo += G.qta(r.qta) + ' x ' + r.descr + '   ' + num(G.totaleRiga(r)) + ' €\n'; });
    if (u.carrello.length > 8) testo += '… e altri ' + (u.carrello.length - 8) + ' articoli\n';
    testo += '\nTotale ' + num(tot) + ' €   ·   pagamento: ' + m.nome;
    if (!c.abilitato) testo += '\n\nATTENZIONE: su questo computer la cassa fiscale NON è collegata. Lo scontrino non esce dal registratore, ma la vendita viene registrata nel gestionale e conta nei corrispettivi della Prima nota.\nGli scontrini si battono dal computer della cassa.';
    G.msgbox({
      titolo: c.abilitato ? 'Emetti scontrino' : 'Emetti scontrino — cassa NON collegata', testo, icona: c.abilitato ? 'domanda' : 'avviso', predefinito: c.abilitato ? 0 : 1,
      pulsanti: [{ t: 'Sì', az: emetti }, { t: 'No', annulla: true, az: () => { u.msg = { colore: 'var(--testo-2)', testo: 'Scontrino NON emesso: il carrello è rimasto com\'era.' }; G.ridisegna(); } }],
    });
  };
  function emetti() {
    const S = G.S, u = banco(), c = RT();
    const righe = u.carrello.map((r) => ({ artId: r.artId, codice: r.codice, descr: r.descr, qta: r.qta, prezzo: r.prezzo, sconto: r.sconto, iva: r.iva, listino: r.listino }));
    const tot = r2(somma(righe, G.totaleRiga));
    const m = G.metodo(u.metodoId);
    const sc = { id: G.nuovoId(), numero: ++S.numeri.scontrino, data: G.adessoIso(), clienteId: u.clienteId, metodoId: u.metodoId, righe, totale: tot, postazione: 'IPAD-DEMO', esito: '', operatore: G.operatore ? G.operatore.nome : '' };
    if (c.abilitato) { const n = ++S.numeri.rt; sc.esito = 'EMESSO (cassa n. ' + n + ')'; u.msg = { colore: 'var(--verde)', testo: 'Scontrino n. ' + sc.numero + ' · ' + num(tot) + ' € · cassa RT n. ' + n }; }
    else { sc.esito = 'SIMULAZIONE: cassa non collegata'; u.msg = { colore: 'var(--verde)', testo: 'Scontrino n. ' + sc.numero + ' · ' + num(tot) + ' € · Scontrino simulato (cassa non abilitata)' }; }
    S.scontrini.push(sc);
    scalaMagazzino(righe, 1);
    G.log('Vendita', 'Emesso scontrino n. ' + sc.numero + ' · € ' + G.z2(tot) + ' · PC ' + sc.postazione, 'sc:' + sc.id);
    u.ultimo = sc.id;
    pulisciDopo(u); tornaAContanti(u);
    G.salva(); G.ridisegna();
  }
  function richiediCliente(u, testo) {
    if (u.clienteId) return G.cli(u.clienteId);
    u.msg = { colore: 'var(--rosso)', testo }; G.ridisegna(); return null;
  }
  A['banco-fac'] = () => {
    const S = G.S, u = banco();
    if (!u.carrello.length) return;
    const c = richiediCliente(u, 'Per la fattura accompagnatoria seleziona un cliente (con P.IVA o codice fiscale).'); if (!c) return;
    if (!c.piva && !c.cf) { u.msg = { colore: 'var(--rosso)', testo: 'Il cliente non ha né partita IVA né codice fiscale: la fattura elettronica non si può fare.' }; G.ridisegna(); return; }
    const regime = S.causaliIva.find((x) => x.id === u.regimeId) || S.causaliIva[0];
    // ente pubblico: prima CIG, CUP e ordine (e il promemoria della firma)
    G.chiediEntePubblico(c.id, 'fattura accompagnatoria', regime, (pa) => {
      const righe = u.carrello.map((r) => ({ artId: r.artId, codice: r.codice, descr: r.descr, um: r.um, qta: r.qta, prezzo: r.prezzo, sconto: r.sconto, iva: regime.natura ? 0 : r.iva, listino: r.listino }));
      const t = G.totaliRighe(righe);
      const anno = Number(G.OGGI.slice(0, 4));
      const f = { id: G.nuovoId(), tipo: 'FAC', numero: ++S.numeri.fac, anno, data: G.OGGI, clienteId: c.id, righe, imponibile: t.imponibile, iva: t.iva, totale: t.totale, metodoId: u.metodoId, pagTesto: '', ddtIds: [], sdi: 'GENERATO', mail: '', progressivo: String(++S.numeri.progressivo).padStart(5, '0'), causaleIvaId: regime.id, note: '', formato: G.perPa(c) ? 'FPA12' : 'FPR12' };
      if (pa) f.pa = pa;
      S.fatture.push(f);
      const daIncassare = regime.split ? t.imponibile : t.totale;
      S.scadenze.push({ id: G.nuovoId(), tipo: 'ATTIVA', soggettoId: c.id, fatturaId: f.id, documento: String(f.numero), dataDoc: f.data, scadenza: G.scadenzaFattura(f.metodoId, '', f.data), importo: daIncassare, pagato: 0, stato: 'APERTA', metodo: G.metodo(f.metodoId).nome, conto: '', note: '', incassi: [] });
      scalaMagazzino(righe, 1);
      G.indicizza();
      G.log('Fattura', 'Emessa fattura accompagnatoria n. FAC ' + f.numero + ' a ' + c.nome + ' · € ' + G.z2(f.totale), 'doc:' + f.id);
      u.msg = { colore: 'var(--verde)', testo: 'Fattura accompagnatoria FAC ' + f.numero + ' emessa' + (regime.codice !== 'ORD' ? ' (' + regime.descr + ')' : '') + ' · XML FatturaPA generato (IT' + S.negozio.piva + '_' + f.progressivo + '.xml)' + (pa ? ' · ' + G.NOTA_FIRMA : '') };
      const eraSolo = soloPerFattura(u.metodoId);
      pulisciDopo(u);
      if (eraSolo) tornaAContanti(u);
      G.salva(); G.ridisegna();
    });
  };
  function emettiDoc(tipo) {
    const S = G.S, u = banco();
    if (!u.carrello.length) return;
    const c = richiediCliente(u, 'Per il ' + (tipo === 'DDT' ? 'DDT' : 'preventivo') + ' seleziona un cliente.'); if (!c) return;
    const righe = u.carrello.map((r) => ({ artId: r.artId, codice: r.codice, descr: r.descr, um: r.um, qta: r.qta, prezzo: r.prezzo, sconto: r.sconto, iva: r.iva, listino: r.listino }));
    let doc;
    if (tipo === 'DDT') {
      const d = { id: G.nuovoId(), numero: ++S.numeri.ddt, anno: Number(G.OGGI.slice(0, 4)), data: G.OGGI, clienteId: c.id, causale: 'VENDITA', righe, totale: G.totaliRighe(righe).totale, fatturaId: null, annullato: false, note: '', metodoId: u.metodoId };
      S.ddt.push(d); scalaMagazzino(righe, 1); G.indicizza();
      G.log('DDT', 'Emesso DDT n. ' + d.numero + ' · € ' + G.z2(d.totale), 'doc:' + d.id);
      u.msg = { colore: 'var(--verde)', testo: 'DDT n. ' + d.numero + ' emesso · PDF aperto' };
      doc = G.docDaDdt(d);
    } else {
      const n = ++S.numeri.preventivo;
      G.log('Preventivo', 'Emesso preventivo n. ' + n + ' · € ' + G.z2(G.totaliRighe(righe).totale));
      u.msg = { colore: 'var(--verde)', testo: 'Preventivo n. ' + n + ' emesso · PDF aperto' };
      doc = { tipoDoc: 'PREVENTIVO', titolo: 'PREVENTIVO', numero: n + '/' + G.OGGI.slice(0, 4), data: G.OGGI, clienteId: c.id, righe, pagamento: c.pagTesto || '', file: 'Preventivo_' + n };
    }
    pulisciDopo(u);
    G.salva(); G.ridisegna(); G.apriDocumento(doc);
  }
  A['banco-ddt'] = () => emettiDoc('DDT');
  A['banco-prev'] = () => emettiDoc('PREVENTIVO');
  A['banco-fito'] = () => {
    const S = G.S, u = banco();
    if (!u.carrello.length) return;
    const c = richiediCliente(u, 'Per il DDT fitosanitari seleziona il cliente (l\'azienda che acquista).'); if (!c) return;
    const p = u.patentinoId ? G.patentino(Number(u.patentinoId)) : null;
    if (!p) { u.msg = { colore: 'var(--rosso)', testo: 'Seleziona il patentino dell\'acquirente (campo sotto il cliente).' }; G.ridisegna(); return; }
    if (G.patScaduto(p)) { u.msg = { colore: 'var(--rosso)', testo: 'Patentino SCADUTO il ' + dataIt(p.validoA) + ': vendita di fitosanitari non consentita.' }; G.ridisegna(); return; }
    const fito = u.carrello.filter((r) => (G.art(r.artId) || {}).fito);
    if (!fito.length) { u.msg = { colore: 'var(--rosso)', testo: 'Nel carrello non ci sono prodotti fitosanitari: usa il normale «Emetti DDT».' }; G.ridisegna(); return; }
    const righe = u.carrello.map((r) => ({ artId: r.artId, codice: r.codice, descr: r.descr, um: r.um, qta: r.qta, prezzo: r.prezzo, sconto: r.sconto, iva: r.iva, listino: r.listino, info: (G.art(r.artId) || {}).info || '' }));
    const d = { id: G.nuovoId(), numero: ++S.numeri.ddt, anno: Number(G.OGGI.slice(0, 4)), data: G.OGGI, clienteId: c.id, causale: 'VENDITA FITOSANITARI', righe, totale: G.totaliRighe(righe).totale, fatturaId: null, annullato: false, note: 'Registro agrofarmaci: patentino n. ' + p.numero + ' — ' + p.nominativo, metodoId: u.metodoId };
    S.ddt.push(d);
    fito.forEach((r) => S.registro.unshift({ id: G.nuovoId(), tipo: 'SCARICO', data: G.OGGI, artId: r.artId, qta: r.qta, patentinoId: p.id, clienteId: c.id, doc: 'DDT ' + d.numero, dataDoc: G.OGGI, lotto: (G.art(r.artId) || {}).lotto || '', nma: '' }));
    scalaMagazzino(righe, 1); G.indicizza();
    G.log('DDT', 'Emesso DDT n. ' + d.numero + ' · € ' + G.z2(d.totale), 'doc:' + d.id);
    fito.forEach((r) => G.log('Registro', 'Scarico agrofarmaco articolo id ' + r.artId + ': ' + G.z0(r.qta) + ' (registro carico/scarico)', 'art:' + r.artId));
    u.msg = { colore: 'var(--verde)', testo: 'DDT fitosanitari n. ' + d.numero + ' emesso · ' + fito.length + ' scarichi sul registro · PDF aperto (3 copie)' };
    pulisciDopo(u); u.patentinoId = '';
    G.salva(); G.ridisegna();
    const doc = G.docDaDdt(d);
    doc.titolo = 'DOCUMENTO DI TRASPORTO — PRODOTTI FITOSANITARI';
    doc.extra = '<div class="box" style="margin-top:10px"><div class="et">Acquirente utilizzatore professionale</div>' + esc(p.nominativo) + ' — patentino n. ' + esc(p.numero) + ' rilasciato da ' + esc(p.ente) + ', valido fino al ' + dataIt(p.validoA)
      + '<br>Il sottoscritto dichiara che i prodotti fitosanitari acquistati saranno impiegati esclusivamente per gli usi consentiti in etichetta.</div>';
    G.apriDocumento(doc);
  };
  A['banco-stampa'] = () => {
    const u = banco(); const s = G.S.scontrini.find((x) => x.id === u.ultimo); if (!s) return;
    const c = s.clienteId ? G.cli(s.clienteId) : null;
    const righe = s.righe.map((r) => '<tr><td>' + esc(r.descr) + '</td><td class="n">' + G.qta(r.qta) + '</td><td class="n">' + num(r.prezzo) + '</td><td class="n">' + num(G.totaleRiga(r)) + '</td></tr>').join('');
    G.finestra({ titolo: 'Stampa — Scontrino ' + s.numero, larghezza: 640, altezza: 560, bianca: true,
      corpo: '<div class="foglio-cornice"><div class="foglio" style="font-family:\'Segoe UI\',Arial;font-size:12px"><div style="font-size:14px;font-weight:700">' + esc(G.S.negozio.ragione) + '</div><div style="font-size:10px">' + esc(G.S.negozio.indirizzo) + ' — ' + esc(G.S.negozio.cap) + ' ' + esc(G.S.negozio.citta) + ' (' + esc(G.S.negozio.prov) + ') — P.IVA ' + esc(G.S.negozio.piva) + '</div>'
        + '<div style="font-size:11px;font-weight:700;margin:12px 0 6px">Documento commerciale di vendita n. ' + s.numero + ' del ' + dataIt(s.data) + ' ' + G.oraIt(s.data) + '</div>' + (c ? '<div style="font-size:11px">Cliente: ' + esc(c.nome) + '</div>' : '')
        + '<table style="margin-top:6px"><thead><tr><th>Descrizione</th><th class="n">Q.tà</th><th class="n">Prezzo</th><th class="n">Totale</th></tr></thead><tbody>' + righe + '</tbody></table>'
        + '<div style="font-size:15px;font-weight:700;margin-top:12px">TOTALE  €  ' + num(s.totale) + '</div><div style="font-size:11px">Pagamento: ' + esc(G.metodo(s.metodoId).nome) + '</div></div></div>' });
  };
  A['banco-cassa'] = () => finestraCassa(() => {
    const u = banco(), c = RT();
    u.msg = c.abilitato ? { colore: 'var(--rosso)', testo: 'Cassa fiscale COLLEGATA (' + c.modello + '): gli scontrini emessi sono documenti fiscali veri.' } : { colore: 'var(--testo-2)', testo: 'Cassa fiscale spenta: il banco lavora in simulazione.' };
    G.ridisegna();
  });
  A['banco-cassetto'] = () => { const u = banco(); u.msg = RT().abilitato ? { colore: 'var(--verde)', testo: 'Cassetto aperto' } : { colore: 'var(--verde)', testo: 'Cassetto: Simulazione: la cassa non è collegata' }; G.ridisegna(); };
  A['banco-chiusura'] = () => finestraChiusura(() => G.ridisegna());

  // =====================================================================
  // CRONOLOGIA SCONTRINI
  // =====================================================================
  const nonEmesso = (s) => /^(SIMULAZIONE|RIFIUTATO|NON EMESSO: Cassa:)/i.test(s.esito || '');
  const nonConfermato = (s) => !nonEmesso(s) && /^(NON CONFERMATO|NON EMESSO|ERRORE)/i.test(s.esito || '');
  const eliminabile = (s) => nonEmesso(s) || nonConfermato(s);
  const cs = () => G.ui('scontrini', () => ({ giorno: G.OGGI, tutti: false, msg: null }));
  G.VISTE.scontrini = {
    nuova() { delete G.U.scontrini; G.deseleziona('cs-scontrini'); },
    render() {
      const u = cs();
      const lista = G.S.scontrini.filter((s) => s.data.startsWith(u.giorno)).sort((a, b) => a.data.localeCompare(b.data));
      const ne = lista.filter(nonEmesso), inc = lista.filter(nonConfermato);
      const riep = G.dataLunga(u.giorno) + ' · ' + lista.length + ' scontrini · ' + num(somma(lista, (s) => s.totale)) + ' €'
        + (ne.length ? ' · ' + ne.length + ' NON emessi dalla cassa (' + num(somma(ne, (s) => s.totale)) + ' €)' : '')
        + (inc.length ? ' · ' + inc.length + ' senza risposta della cassa (' + num(somma(inc, (s) => s.totale)) + ' €)' : '');
      const t = G.TAB['cs-scontrini'];
      if (lista.length && !u.tutti && (!t || !t.multi || !t.multi.size || !lista.some((s) => t.multi.has(String(s.id))))) {
        G.TAB['cs-scontrini'] = Object.assign(t || { filtri: {}, ord: null }, { sel: String(lista[lista.length - 1].id), multi: new Set([String(lista[lista.length - 1].id)]) });
      }
      const scelti = G.TAB['cs-scontrini'] ? lista.filter((s) => G.TAB['cs-scontrini'].multi.has(String(s.id))) : [];
      const s1 = !u.tutti && scelti.length ? scelti[scelti.length - 1] : null;
      let righe = [], titolo;
      const riga = (s, r) => ({ k: s.id + '-' + r.artId + '-' + r.qta, ora: G.oraIt(s.data), numero: s.numero, codice: r.codice, descr: r.descr, qta: r.qta, prezzo: r.prezzo, totale: G.totaleRiga(r), iva: r.iva });
      if (u.tutti) { lista.forEach((s) => s.righe.forEach((r) => righe.push(riga(s, r)))); titolo = 'Tutti gli articoli del giorno: ' + righe.length + ' righe · ' + num(somma(righe, (r) => r.totale)) + ' €'; }
      else if (s1) { righe = s1.righe.map((r) => riga(s1, r)); titolo = 'Scontrino n. ' + s1.numero + ' delle ' + s1.data.slice(11, 19) + ' · ' + num(s1.totale) + ' € · ' + G.metodo(s1.metodoId).nome + (s1.postazione ? ' · dal computer ' + s1.postazione : ''); }
      else titolo = lista.length ? 'Seleziona uno scontrino per vederne gli articoli.' : 'Nessuno scontrino in questo giorno.';
      const puoEliminare = scelti.some(eliminabile);
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga" style="margin-bottom:8px"><div class="h1">Cronologia scontrini</div><span class="muto" style="margin-left:16px">' + esc(riep) + '</span></div>'
        + '<div class="avvolgi" style="margin-bottom:10px;align-items:center"><span class="muto" style="margin:0 8px 6px 0">Giorno</span><span style="margin-bottom:6px">' + G.dp('cs-giorno', u.giorno, { onCambia: (v) => { u.giorno = v || G.OGGI; u.msg = null; G.deseleziona('cs-scontrini'); G.ridisegna(); } }) + '</span>'
        + btn('◀', 'cs-prima', { stile: 'padding:4px 10px;margin:0 0 6px 8px', title: 'Il giorno prima' }) + btn('Oggi', 'cs-oggi', { stile: 'padding:4px 12px;margin:0 0 6px 6px' }) + btn('▶', 'cs-dopo', { stile: 'padding:4px 10px;margin:0 0 6px 6px', title: 'Il giorno dopo' })
        + '<label class="chk" style="margin:0 0 6px 22px" title="Spuntato: sotto compaiono gli articoli di tutti gli scontrini del giorno. Non spuntato: solo quelli dello scontrino selezionato."><input type="checkbox" data-ch="cs-tutti"' + (u.tutti ? ' checked' : '') + '>Sotto: tutti gli articoli del giorno</label>'
        + btn('Elimina scontrino non emesso', 'cs-elimina', { dis: !puoEliminare, stile: 'padding:4px 14px;margin:0 0 6px 22px', title: 'Toglie lo scontrino selezionato (anche più di uno, con Ctrl) se la cassa NON l\'ha emesso: sparisce dalla Prima nota e la merce rientra in magazzino. Nella Cronologia (attività) resta scritto.' }) + '</div>'
        + (u.msg ? '<div style="font-size:12.5px;margin-bottom:8px;color:' + u.msg.colore + '">' + esc(u.msg.testo) + '</div>' : '')
        + '<div class="col riempi">'
        + '<div class="col" style="flex:1 1 0;min-height:0">' + G.dg('cs-scontrini', {
          classe: 'riempi', multiSel: true, righe: lista, chiave: (s) => s.id,
          classeRiga: (s) => (nonEmesso(s) ? 'rossa' : nonConfermato(s) ? 'arancio' : ''),
          onSel: () => { u.msg = null; G.ridisegna(); },
          colonne: [
            { k: 'ora', t: 'Ora', w: 72, v: (s) => s.data.slice(11, 19) }, { k: 'numero', t: 'N.', w: 56 },
            { k: 'totale', t: 'Totale €', w: 84, n: true, v: (s) => num(s.totale) }, { k: 'nart', t: 'Articoli', w: 78, n: true, v: (s) => s.righe.length },
            { k: 'pag', t: 'Pagamento', w: 146, v: (s) => G.metodo(s.metodoId).nome }, { k: 'cliente', t: 'Cliente', w: '*', min: 110, v: (s) => (s.clienteId ? G.cli(s.clienteId).nome : '') },
            { k: 'post', t: 'Computer', w: 110, v: (s) => s.postazione || '—' }, { k: 'esito', t: 'Cassa', w: '2*', min: 170, v: (s) => s.esito || '—' },
            { k: 'op', t: 'Operatore', w: 104, v: (s) => s.operatore || '' },
          ],
        }) + '</div>'
        + '<div style="height:12px;flex:none"></div><div class="h2" style="font-size:15px;margin-bottom:6px">' + esc(titolo) + '</div>'
        + '<div class="col" style="flex:1 1 0;min-height:0">' + G.dg('cs-righe', {
          classe: 'riempi', righe, chiave: (r) => r.k,
          colonne: [
            { k: 'ora', t: 'Ora', w: 60 }, { k: 'numero', t: 'Scontrino', w: 86 }, { k: 'codice', t: 'Codice', w: 110, mono: true },
            { k: 'descr', t: 'Articolo', w: '*', min: 160 }, { k: 'qta', t: 'Q.tà', w: 62, n: true, v: (r) => G.qta(r.qta) },
            { k: 'prezzo', t: 'Prezzo', w: 80, n: true, v: (r) => num(r.prezzo) }, { k: 'totale', t: 'Totale', w: 86, n: true, semi: true, v: (r) => num(r.totale) },
            { k: 'iva', t: 'IVA', w: 62, v: (r) => (r.iva ? r.iva + '%' : 'esente') },
          ],
        }) + '</div></div>'
        + '<div class="muto" style="margin-top:8px">Ogni riga è una volta che al banco è stato premuto «Emetti scontrino». «Computer» e «Cassa» ci sono dagli scontrini dell\'11/10/2026 in poi. In rosso quelli che la cassa sicuramente NON ha emesso (simulazione da un computer senza cassa, o rifiutati), in arancione quelli a cui la cassa non ha risposto (potrebbero essere usciti): nella Prima nota contano tutti, finché non si eliminano.</div>'
        + '</div>';
    },
  };
  const spostaGiorno = (n) => { const u = cs(); u.giorno = n === 0 ? G.OGGI : G.D.piuGiorni(u.giorno, n); u.msg = null; G.deseleziona('cs-scontrini'); G.ridisegna(); };
  A['cs-prima'] = () => spostaGiorno(-1);
  A['cs-dopo'] = () => spostaGiorno(1);
  A['cs-oggi'] = () => spostaGiorno(0);
  G.CH['cs-tutti'] = (el) => { cs().tutti = el.checked; G.ridisegna(); };
  A['cs-elimina'] = () => {
    const u = cs();
    const scelti = G.selezionati('cs-scontrini');
    const daTogliere = scelti.filter(eliminabile), esclusi = scelti.filter((s) => !eliminabile(s));
    if (!daTogliere.length) { u.msg = { colore: 'var(--rosso)', testo: scelti.length ? 'Questi scontrini la cassa li ha emessi (o sono di prima dell\'11/10, quando la risposta della cassa non si registrava): da qui non si eliminano.' : 'Seleziona lo scontrino da eliminare.' }; G.ridisegna(); return; }
    const incerti = daTogliere.some(nonConfermato);
    let t = (daTogliere.length === 1 ? 'Elimino questo scontrino?' : 'Elimino questi ' + daTogliere.length + ' scontrini?') + '\n\n';
    daTogliere.forEach((s) => { t += 'n. ' + s.numero + ' delle ' + s.data.slice(11, 19) + ' · ' + num(s.totale) + ' € · ' + G.metodo(s.metodoId).nome + ' — ' + s.esito + '\n'; s.righe.slice(0, 6).forEach((r) => { t += '      ' + G.qta(r.qta) + ' x ' + r.descr + '\n'; }); if (s.righe.length > 6) t += '      … e altri ' + (s.righe.length - 6) + ' articoli\n'; });
    t += '\nSpariscono dai corrispettivi della Prima nota e la merce rientra in magazzino. Nella cronologia resta scritto tutto.';
    if (incerti) t += '\n\nATTENZIONE: a quelli «NON CONFERMATO» la cassa non ha risposto, quindi lo scontrino POTREBBE essere uscito. Eliminali solo se sei sicuro che non è stato stampato: se è uscito, la Prima nota non tornerà più con la chiusura Z.';
    if (esclusi.length) t += '\n\n(' + esclusi.length + ' dei selezionati la cassa li ha emessi: quelli restano.)';
    G.msgbox({ titolo: incerti ? 'Elimina scontrini — controlla che non siano usciti' : 'Elimina scontrini non emessi', testo: t, icona: incerti ? 'avviso' : 'domanda', predefinito: 1,
      pulsanti: [{ t: 'Sì', az: () => {
        const fatti = [];
        daTogliere.forEach((s) => {
          s.righe.forEach((r) => { const a = G.art(r.artId); if (a) a.giac = r2(a.giac + r.qta); });
          G.S.scontrini = G.S.scontrini.filter((x) => x !== s);
          // come Db.TogliScontrinoNonEmesso: numero, ora, importo, pagamento, motivo e righe
          const motivo = nonConfermato(s) ? 'eliminato dalla Cronologia scontrini: la cassa non aveva risposto (' + s.esito + '), confermato che non è uscito' : 'eliminato dalla Cronologia scontrini (' + s.esito + ')';
          const righe = s.righe.map((r) => String(Math.round(r.qta * 1000) / 1000) + ' x ' + r.descr + ' a ' + (Math.round(r.prezzo * 100) / 100).toFixed(2)).join('; ');
          G.log('Corrispettivi', 'Tolto lo scontrino n. ' + s.numero + ' del ' + dataIt(s.data) + ' ' + s.data.slice(11, 16) + ' (€ ' + G.z2(s.totale) + ', ' + ((G.metodo(s.metodoId) || {}).nome || 'pagamento non indicato') + '): la cassa non l\'aveva emesso — ' + motivo + (righe ? ' · righe: ' + righe : '') + ' · merce rientrata in magazzino', 'sc:' + s.id);
          fatti.push('n. ' + s.numero + ' (' + num(s.totale) + ' €)');
        });
        G.deseleziona('cs-scontrini'); G.salva();
        u.msg = { colore: 'var(--verde)', testo: 'Eliminat' + (fatti.length === 1 ? 'o lo scontrino ' : 'i gli scontrini ') + fatti.join(', ') + ': merce rientrata in magazzino.' };
        G.ridisegna();
      } }, { t: 'No', annulla: true, az: () => { u.msg = { colore: 'var(--verde)', testo: 'Non è stato eliminato niente.' }; G.ridisegna(); } }] });
  };

  G.banco = { finestraCassa, finestraChiusura, corrispettiviGiorno, RT };
})();
