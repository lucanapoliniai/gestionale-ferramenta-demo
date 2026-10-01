/* Dashboard, Analisi, Vendite al banco */
(function () {
  'use strict';
  const G = window.GF;
  const { esc, eur, eur0, num, qta, perc, dataIt, oraIt, ico, somma, r2 } = G;

  // =====================================================================
  // DASHBOARD
  // =====================================================================
  G.VISTE.dashboard = {
    render() {
      const S = G.S, oggi = G.OGGI;
      const d = G.D.daIso(oggi);
      const scOggi = S.scontrini.filter((s) => s.data.startsWith(oggi));
      const incOggi = somma(scOggi, (s) => s.totale);
      // ultimi 30 giorni: il mese in corso fin qui piu' la coda del mese prima
      const meseKey = oggi.slice(0, 7);
      const mese = G.ST.perCat[meseKey] || {};
      const prec = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const precKey = prec.getFullYear() + '-' + G.D.pad(prec.getMonth() + 1);
      const giorniPrec = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
      const coda = Math.max(0, 30 - d.getDate()) / giorniPrec;
      const vendMese = somma(Object.values(mese), (x) => x.banco + x.ddt) + somma(Object.values(G.ST.perCat[precKey] || {}), (x) => x.banco + x.ddt) * coda;
      const margini = S.articoli.map((a) => G.margine(a).perc).filter((x) => isFinite(x));
      const margMedio = somma(margini) / (margini.length || 1);
      const aperte = S.scadenze.filter((s) => s.tipo === 'ATTIVA' && s.stato !== 'PAGATA');
      const crediti = somma(aperte, G.residuo);
      const scaduto = somma(aperte.filter((s) => s.scadenza < oggi), G.residuo);
      const nSotto = S.articoli.filter(G.sottocosto).length;
      const nScorta = S.articoli.filter(G.sottoScorta).length;
      const patScad = S.patentini.filter((p) => G.statoPatentino(p) === 'scaduto').length;
      const patIn = S.patentini.filter((p) => G.statoPatentino(p) === 'in scadenza').length;
      const daSdi = S.fatture.filter((f) => f.sdi === 'GENERATO').length;
      const scarti = S.fatture.filter((f) => f.sdi === 'SCARTATO').length;
      const ddtAperti = S.ddt.filter((x) => !x.fatturaId);

      const card = (val, testo, colore, vista, dopo) =>
        '<button class="avviso-card" data-az="vai" data-vista="' + vista + '"' + (dopo ? ' data-dopo="' + dopo + '"' : '') + '><div class="corpo"><div class="val ' + colore + '-t">' + val + '</div><div class="et">' + esc(testo) + '</div></div>' + ico('freccia') + '</button>';

      // incassato al banco negli ultimi 10 giorni
      const giorni = [];
      for (let g = 9; g >= 0; g--) {
        const giorno = G.D.piuGiorni(oggi, -g);
        const dow = G.D.daIso(giorno).getDay();
        if (dow === 0) continue;
        giorni.push({ giorno, dow, tot: somma(S.scontrini.filter((s) => s.data.startsWith(giorno)), (s) => s.totale) });
      }
      const maxG = Math.max(1, ...giorni.map((x) => x.tot));
      const barre = giorni.map((x) => '<div class="g' + (x.giorno === oggi ? ' oggi' : '') + '" style="height:' + Math.max(3, Math.round((x.tot / maxG) * 100)) + '%" title="' + dataIt(x.giorno) + ': ' + eur(x.tot) + '"></div>').join('');
      const assi = giorni.map((x) => '<div>' + G.GIORNI[x.dow].slice(0, 3) + '<br>' + x.giorno.slice(8, 10) + '</div>').join('');

      return '<div class="titolo-pagina"><h1>Dashboard</h1><div class="sotto">' + esc(S.negozio.nome) + ' · ' + G.GIORNI[d.getDay()] + ' ' + d.getDate() + ' ' + G.MESI_LUNGHI[d.getMonth()] + ' ' + d.getFullYear() + '</div></div>'
        + '<div class="griglia-kpi">'
        + '<div class="kpi"><div class="et">Incassato oggi al banco</div><div class="val">' + eur(incOggi) + '</div><div class="nota">' + scOggi.length + ' scontrini</div></div>'
        + '<div class="kpi"><div class="et">Venduto negli ultimi 30 giorni</div><div class="val">' + eur0(vendMese) + '</div><div class="nota">banco e DDT, IVA esclusa</div></div>'
        + '<div class="kpi verde"><div class="et">Margine medio</div><div class="val">' + perc(margMedio) + '</div><div class="nota">sul listino A di ' + S.articoli.length + ' articoli</div></div>'
        + '<div class="kpi"><div class="et">Crediti da incassare</div><div class="val">' + eur0(crediti) + '</div><div class="nota rosso-t">scaduto: ' + eur(scaduto) + '</div></div>'
        + '</div>'
        + '<div class="sezione-t">Da tenere d\'occhio</div>'
        + '<div class="avvisi-griglia">'
        + card(nSotto, 'articoli venduti sottocosto', 'rosso', 'articoli', 'art-sottocosto')
        + card(nScorta, 'articoli sotto scorta minima', 'ambra', 'articoli', 'art-scorta')
        + card(patScad, 'patentini scaduti', 'rosso', 'registro', 'reg-patentini')
        + card(patIn, 'patentini in scadenza (60 gg)', 'ambra', 'registro', 'reg-patentini')
        + card(daSdi, 'fatture da inviare allo SDI', 'ambra', 'fatture', 'fatt-sdi')
        + (scarti ? card(scarti, 'fattura scartata dallo SDI da correggere', 'rosso', 'fatture', 'fatt-scarti') : '')
        + card(ddtAperti.length, 'DDT del mese da fatturare', 'blu', 'fatture', 'fatt-diff')
        + card(eur0(scaduto), 'crediti scaduti da sollecitare', 'rosso', 'scadenzario', 'scad-scadute')
        + '</div>'
        + '<div class="due-col-pari">'
        + '<div class="scheda"><div class="testa-scheda"><h2>Banco, ultimi giorni</h2><span class="destra">incassato al giorno</span></div><div class="barre-giorni">' + barre + '</div><div class="assi-giorni">' + assi + '</div></div>'
        + '<div class="scheda"><h2>Azioni rapide</h2><div class="pila" style="gap:10px">'
        + '<button class="btn primario" data-az="vai" data-vista="vendite">' + ico('banco') + 'Nuova vendita al banco</button>'
        + '<button class="btn" data-az="vai" data-vista="fatture" data-dopo="fatt-diff">' + ico('fatture') + 'Fattura di fine mese da DDT</button>'
        + '<button class="btn" data-az="vai" data-vista="scadenzario">' + ico('euro') + 'Registra un incasso</button>'
        + '<button class="btn" data-az="vai" data-vista="analisi">' + ico('analisi') + 'Come va il negozio</button>'
        + '</div></div></div>';
    },
  };

  // =====================================================================
  // ANALISI (stile cruscotto: clic sul mese filtra tutto)
  // =====================================================================
  function margineCategorie() {
    const S = G.S, out = {};
    S.categorie.forEach((c) => {
      const arts = S.articoli.filter((a) => a.cat === c.id);
      // si vende anche ai listini B e C: il margine reale e' un po' sotto quello del listino A
      const m = somma(arts, (a) => Math.max(0.04, G.margine(a).perc / 100)) / (arts.length || 1);
      out[c.codice] = m * 0.9;
    });
    return out;
  }
  function venduto(anno, mese, canale, codCat) {
    const ST = G.ST;
    let fatt = 0;
    const mesi = mese === null ? [...Array(12).keys()] : [mese];
    mesi.forEach((m) => {
      const k = anno + '-' + G.D.pad(m + 1);
      const v = ST.perCat[k];
      if (!v) return;
      Object.keys(v).forEach((c) => {
        if (codCat && c !== codCat) return;
        fatt += canale === 'banco' ? v[c].banco : canale === 'ddt' ? v[c].ddt : v[c].banco + v[c].ddt;
      });
    });
    return fatt;
  }

  G.VISTE.analisi = {
    render() {
      const S = G.S, ST = G.ST;
      const u = G.ui('analisi', () => ({ anno: ST.anni[ST.anni.length - 1], canale: 'tutti', mese: null, cat: null, cerca: '', ordina: 'guadagno' }));
      const marg = margineCategorie();
      const d0 = G.D.daIso(G.OGGI);
      const annoCorr = d0.getFullYear();
      const mesiValidi = (anno) => (anno === annoCorr ? d0.getMonth() + 1 : 12);

      // KPI del periodo scelto (anno intero o mese cliccato)
      const fatt = venduto(u.anno, u.mese, u.canale, null);
      let guad = 0;
      S.categorie.forEach((c) => { guad += venduto(u.anno, u.mese, u.canale, c.codice) * marg[c.codice]; });
      const costo = fatt - guad;
      // confronto con lo stesso periodo dell'anno prima
      let prima = 0;
      if (u.mese !== null) prima = venduto(u.anno - 1, u.mese, u.canale, null);
      else for (let m = 0; m < mesiValidi(u.anno); m++) prima += venduto(u.anno - 1, m, u.canale, null) * (u.anno === annoCorr && m === d0.getMonth() ? d0.getDate() / new Date(u.anno, m + 1, 0).getDate() : 1);
      const varPerc = prima > 0 ? ((fatt - prima) / prima) * 100 : null;
      const periodo = u.mese === null ? 'Anno ' + u.anno : G.MESI_LUNGHI[u.mese] + ' ' + u.anno;

      // grafico dei mesi
      const valMesi = [...Array(12).keys()].map((m) => {
        const f = venduto(u.anno, m, u.canale, null);
        let g = 0; S.categorie.forEach((c) => { g += venduto(u.anno, m, u.canale, c.codice) * marg[c.codice]; });
        return { f, g };
      });
      const maxF = Math.max(1, ...valMesi.map((x) => x.f));
      const colonne = valMesi.map((x, m) => {
        const futuro = u.anno === annoCorr && m > d0.getMonth();
        const hF = Math.round((x.f / maxF) * 100);
        const hG = x.f > 0 ? Math.round((x.g / x.f) * 100) : 0;
        return '<button class="colonna' + (u.mese === m ? ' scelta' : '') + '" data-az="an-mese" data-m="' + m + '"' + (futuro ? ' disabled' : '') + ' aria-label="' + G.MESI_LUNGHI[m] + ': ' + eur0(x.f) + '">'
          + (x.f > 0 ? '<span class="eti-val">' + Math.round(x.f / 1000) + 'k</span>' : '')
          + '<div class="barra-f" style="height:' + hF + '%"><div class="barra-g" style="height:' + hG + '%"></div></div></button>';
      }).join('');
      const assi = G.MESI.map((m, i) => '<div class="' + (u.anno === annoCorr && i === d0.getMonth() ? 'oggi' : '') + '">' + m + (u.anno === annoCorr && i === d0.getMonth() ? ' •' : '') + '</div>').join('');

      // categorie
      const cats = S.categorie.map((c) => {
        const f = venduto(u.anno, u.mese, u.canale, c.codice);
        return { c, f, g: f * marg[c.codice] };
      }).sort((a, b) => b.g - a.g);
      const maxG = Math.max(1, ...cats.map((x) => x.g));
      // le prime 10 una per una, le altre insieme (come nel programma)
      const prime = cats.slice(0, 10), resto = cats.slice(10);
      const rigaCat = (x, nome, colore, cliccabile) => (cliccabile ? '<button class="cat-riga' + (u.cat === x.c.codice ? ' scelta' : '') + '" data-az="an-cat" data-c="' + x.c.codice + '">' : '<div class="cat-riga">')
        + '<div class="alto"><span class="pall" style="background:' + colore + '"></span><span class="nome">' + esc(nome) + '</span><span class="guad">' + eur0(x.g) + '</span><span class="perc">' + Math.round(x.f ? (x.g / x.f) * 100 : 0) + '%</span></div>'
        + '<div class="vend">' + eur0(x.f) + ' venduto</div>'
        + '<div class="binario"><i style="width:' + Math.round((x.g / maxG) * 100) + '%;background:' + colore + '"></i></div>' + (cliccabile ? '</button>' : '</div>');
      let righeCat = prime.map((x) => rigaCat(x, x.c.nome, x.c.colore, true)).join('');
      if (resto.length) righeCat += rigaCat({ f: somma(resto, (x) => x.f), g: somma(resto, (x) => x.g) }, 'Altre ' + resto.length + ' categorie', '#9AA6B0', false);

      // confronto mese per mese con l'anno prima
      const confronto = [...Array(mesiValidi(u.anno)).keys()].map((m) => {
        const a = venduto(u.anno, m, u.canale, null);
        let b = venduto(u.anno - 1, m, u.canale, null);
        if (u.anno === annoCorr && m === d0.getMonth()) b *= d0.getDate() / new Date(u.anno, m + 1, 0).getDate();
        const v = b > 0 ? ((a - b) / b) * 100 : 0;
        return '<div class="mese"><div class="m">' + G.MESI_LUNGHI[m] + '</div><div class="v">' + eur0(a) + '</div><div class="d ' + (v >= 0 ? 'verde-t' : 'rosso-t') + '">' + (v >= 0 ? '▲ +' : '▼ ') + G.fmt(v, 1) + '%</div></div>';
      }).join('');

      // prodotti del periodo (e della categoria scelta)
      const prodotti = this.prodotti(u, marg);
      const top = prodotti.slice().sort((a, b) => b.g - a.g).slice(0, 8);
      const topHtml = top.map((p, i) => '<div class="top-voce"><span class="pos">' + (i + 1) + '</span><div style="min-width:0"><div class="d">' + esc(p.a.descr) + '</div><div class="q">' + esc(p.a.codice) + ' · ' + qta(Math.round(p.q)) + ' ' + esc(p.a.um) + ' venduti</div></div><strong class="num">' + eur0(p.g) + '</strong></div>').join('');

      const pillAnni = ST.anni.map((a) => '<button class="pillola' + (u.anno === a ? ' scelta' : '') + '" data-az="an-anno" data-a="' + a + '">' + a + '</button>').join('');
      const pillCanali = [['tutti', 'Tutti'], ['banco', 'Banco'], ['ddt', 'DDT']].map((c) => '<button class="pillola' + (u.canale === c[0] ? ' scelta' : '') + '" data-az="an-canale" data-c="' + c[0] + '">' + c[1] + '</button>').join('');
      const catNome = u.cat ? S.categorie.find((c) => c.codice === u.cat).nome : null;

      return '<div class="titolo-pagina"><h1>Analisi &amp; andamento</h1><span class="spinta"></span>'
        + '<div class="pillole" aria-label="Anno">' + pillAnni + '</div><div class="pillole" aria-label="Canale">' + pillCanali + '</div>'
        + '<div class="sotto">' + esc(periodo) + ' · ' + (u.canale === 'tutti' ? 'tutti i canali' : u.canale === 'banco' ? 'solo banco' : 'solo DDT') + ' · guadagno stimato sul ricarico degli articoli' + (u.mese !== null || u.cat ? ' · <button class="collegamento" data-az="an-reset">togli i filtri</button>' : '') + '</div></div>'
        + '<div class="griglia-kpi">'
        + '<div class="kpi"><div class="et">Fatturato</div><div class="val">' + eur0(fatt) + '</div><div class="nota ' + (varPerc === null ? '' : varPerc >= 0 ? 'verde-t' : 'rosso-t') + '">' + (varPerc === null ? 'IVA esclusa' : 'vs ' + (u.anno - 1) + ': ' + (varPerc >= 0 ? '▲ +' : '▼ ') + G.fmt(varPerc, 1) + '%') + '</div></div>'
        + '<div class="kpi"><div class="et">Costo merce</div><div class="val">' + eur0(costo) + '</div><div class="nota">' + Math.round(fatt ? (costo / fatt) * 100 : 0) + '% del venduto</div></div>'
        + '<div class="kpi verde"><div class="et">Guadagno</div><div class="val">' + eur0(guad) + '</div><div class="nota">margine sulla merce</div></div>'
        + '<div class="kpi"><div class="et">Margine medio</div><div class="val">' + perc(fatt ? (guad / fatt) * 100 : 0) + '</div><div class="nota">sul fatturato</div></div>'
        + '</div>'
        + '<div class="due-col-pari allinea-alto" style="margin-bottom:16px"><div class="pila">'
        + '<div class="scheda"><div class="testa-scheda"><h2>Fatturato e guadagno per mese</h2><span class="destra">tocca un mese per filtrare</span></div>'
        + '<div class="grafico-mesi">' + colonne + '</div><div class="assi-mesi">' + assi + '</div>'
        + '<div class="legenda"><span><i style="background:#EBEEF1"></i>Fatturato</span><span><i style="background:var(--verde)"></i>Guadagno</span><span><i style="background:var(--blu)"></i>Mese scelto</span></div></div>'
        + '<div class="scheda"><div class="testa-scheda"><h2>Confronto con l\'anno prima</h2><span class="destra">stesso mese · variazione</span></div><div class="confronto">' + confronto + '</div></div>'
        + '</div>'
        + '<div class="scheda"><div class="testa-scheda"><h2>Guadagno per categoria</h2><span class="destra">tocca per filtrare i prodotti</span></div>' + righeCat + '</div>'
        + '</div>'
        + '<div class="scheda" style="margin-bottom:16px"><div class="testa-scheda"><h2>Prodotti che rendono di più</h2><span class="destra">' + (catNome ? esc(catNome) + ' · ' : '') + 'primi 8 per guadagno</span></div><div class="top-lista due">' + topHtml + '</div></div>'
        + '<div class="scheda"><div class="testa-scheda"><h2>Catalogo venduto</h2><span class="destra">' + esc(periodo) + (catNome ? ' · ' + esc(catNome) : '') + '</span></div>'
        + G.tabella('an-prodotti', {
          righe: prodotti, chiave: (p) => p.a.id, altezza: '460px', ordine: { k: 'g', dir: -1 },
          colonne: [
            { k: 'cod', t: 'Codice', v: (p) => p.a.codice, f: (p) => '<span class="mono">' + esc(p.a.codice) + '</span>', w: 100 },
            { k: 'descr', t: 'Prodotto', v: (p) => p.a.descr, cls: 'lungo', w: 240 },
            { k: 'cat', t: 'Categoria', v: (p) => G.cat(p.a.cat).nome, w: 130 },
            { k: 'q', t: 'Quantità', n: true, v: (p) => p.q, f: (p) => qta(Math.round(p.q)) + ' ' + esc(p.a.um), w: 90 },
            { k: 'f', t: 'Fatturato', n: true, v: (p) => p.f, f: (p) => eur(p.f), w: 110 },
            { k: 'g', t: 'Guadagno', n: true, v: (p) => p.g, f: (p) => '<strong class="verde-t">' + eur(p.g) + '</strong>', w: 110 },
            { k: 'm', t: 'Margine', n: true, v: (p) => (p.f ? p.g / p.f : 0), f: (p) => perc(p.f ? (p.g / p.f) * 100 : 0), w: 80 },
          ],
          onSel: (p) => G.VISTE.analisi.dettaglio(p),
        }) + '</div>';
    },
    prodotti(u, marg) {
      const S = G.S, ST = G.ST, out = [];
      S.articoli.forEach((a) => {
        const c = G.cat(a.cat);
        if (u.cat && c.codice !== u.cat) return;
        const fCat = venduto(u.anno, u.mese, u.canale, c.codice);
        const f = fCat * (ST.pesi[a.id] || 0);
        if (f < 1) return;
        const m = G.margine(a);
        const mPerc = Math.max(0.04, m.perc / 100) * 0.9;
        out.push({ a, f, g: f * mPerc, q: f / Math.max(0.01, m.netto) });
      });
      return out;
    },
    dettaglio(p) {
      const m = G.margine(p.a);
      G.apriFinestra({
        titolo: p.a.descr,
        corpo: '<div class="griglia-kpi" style="margin-bottom:0">'
          + '<div class="kpi"><div class="et">Quantità venduta</div><div class="val">' + qta(Math.round(p.q)) + '</div><div class="nota">' + esc(p.a.um) + '</div></div>'
          + '<div class="kpi"><div class="et">Fatturato</div><div class="val">' + eur0(p.f) + '</div></div>'
          + '<div class="kpi verde"><div class="et">Guadagno</div><div class="val">' + eur0(p.g) + '</div></div>'
          + '<div class="kpi"><div class="et">Prezzo oggi</div><div class="val">' + eur(p.a.prezzoA) + '</div><div class="nota">costo ' + eur(p.a.costo) + ' · margine ' + perc(m.perc) + '</div></div>'
          + '</div>',
        piede: '<button class="btn" data-az="vai" data-vista="articoli" data-dopo="art-mostra-' + p.a.id + '">Apri nell\'elenco articoli</button><button class="btn primario" data-az="chiudi-finestra">Chiudi</button>',
      });
      G.AZ['art-mostra-' + p.a.id] = () => { G.chiudiFinestra(); G.VISTE.articoli.mostraArticolo(p.a.id); };
    },
  };
  G.AZ['an-anno'] = (el) => { const u = G.U.analisi; u.anno = Number(el.dataset.a); u.mese = null; G.ridisegna(); };
  G.AZ['an-canale'] = (el) => { G.U.analisi.canale = el.dataset.c; G.ridisegna(); };
  G.AZ['an-mese'] = (el) => { const u = G.U.analisi; const m = Number(el.dataset.m); u.mese = u.mese === m ? null : m; G.ridisegna(); };
  G.AZ['an-cat'] = (el) => { const u = G.U.analisi; u.cat = u.cat === el.dataset.c ? null : el.dataset.c; G.ridisegna(); };
  G.AZ['an-reset'] = () => { const u = G.U.analisi; u.mese = null; u.cat = null; G.ridisegna(); };

  // =====================================================================
  // VENDITE — BANCO
  // =====================================================================
  const REGIMI = [['ORD', 'ORD — IVA ordinaria'], ['SPL', 'Split payment (enti pubblici)'], ['REV', 'Reverse charge'], ['ESE', 'Esente art. 10']];
  const banco = () => G.ui('vendite', () => ({ q: '', listino: 'A', carrello: [], clienteId: null, metodoId: 1, regime: 'ORD', patentinoId: null, msg: null }));
  const soloFattura = (id) => id === 3 || id === 4;   // assegno e bonifico: solo per la fattura accompagnatoria

  function risultatiBanco(q) {
    const S = G.S;
    const t = G.normalizza(q).trim();
    if (!t) return [];
    const pezzi = t.split(/\s+/);
    const esatti = S.articoli.filter((a) => a.codice.toLowerCase() === t || a.barcode === t);
    const altri = S.articoli.filter((a) => !esatti.includes(a) && pezzi.every((p) => G.normalizza(a.descr + ' ' + a.codice + ' ' + a.barcode).includes(p)));
    return esatti.concat(altri).slice(0, 40);
  }
  function prezzoListino(a, l) { return l === 'C' ? a.prezzoC : l === 'B' ? a.prezzoB : a.prezzoA; }
  function htmlRisultati(u) {
    const r = risultatiBanco(u.q);
    if (!u.q.trim()) return '';
    if (!r.length) return '<div class="risultati"><div class="combo-voce muto">Nessun articolo per «' + esc(u.q) + '»</div></div>';
    return '<div class="risultati">' + r.map((a) => '<button class="risultato" data-az="banco-aggiungi" data-id="' + a.id + '"><span class="mono">' + esc(a.codice) + '</span><span class="descr">' + esc(a.descr) + '</span><span class="giac">giac. ' + qta(a.giac) + '</span><span class="prezzo">' + eur(prezzoListino(a, u.listino)) + '</span></button>').join('') + '</div>';
  }

  G.VISTE.vendite = {
    render() {
      const S = G.S, u = banco();
      const tot = somma(u.carrello, G.totaleRiga);
      const c = u.clienteId ? G.cli(u.clienteId) : null;
      const pat = u.patentinoId ? S.patentini.find((p) => p.id === u.patentinoId) : null;
      const righe = u.carrello.map((r, i) => '<tr><td class="art"><div>' + esc(r.descr) + '</div><div class="cod">' + esc(r.codice) + '</div></td>'
        + '<td><div class="passi"><button data-az="banco-qta" data-i="' + i + '" data-d="-1" aria-label="Meno">' + ico('meno') + '</button><input inputmode="decimal" value="' + qta(r.qta) + '" data-ch="banco-qta-scrivi" data-i="' + i + '" aria-label="Quantità"><button data-az="banco-qta" data-i="' + i + '" data-d="1" aria-label="Più">' + ico('piu') + '</button></div></td>'
        + '<td class="n"><input class="cella-input" inputmode="decimal" value="' + num(r.prezzo) + '" data-ch="banco-prezzo" data-i="' + i + '" aria-label="Prezzo"></td>'
        + '<td class="n"><input class="cella-input" style="width:56px" inputmode="decimal" value="' + (r.sconto ? G.fmt(r.sconto, 1) : '') + '" placeholder="0" data-ch="banco-sconto" data-i="' + i + '" aria-label="Sconto %"></td>'
        + '<td class="n"><strong>' + eur(G.totaleRiga(r)) + '</strong></td>'
        + '<td><button class="bottone-icona" data-az="banco-togli" data-i="' + i + '" aria-label="Togli la riga">' + ico('chiudi') + '</button></td></tr>').join('');

      const scOggi = S.scontrini.filter((s) => s.data.startsWith(G.OGGI)).slice().reverse();
      const pag = [[1, 'Contanti', ''], [2, 'Carta', ''], [3, 'Assegno', 'solo fattura'], [4, 'Bonifico', 'solo fattura']].map((p) =>
        '<button class="scelta-pag' + (u.metodoId === p[0] ? ' scelta' : '') + '" data-az="banco-pag" data-m="' + p[0] + '" aria-pressed="' + (u.metodoId === p[0]) + '">' + p[1] + (p[2] ? '<small>' + p[2] + '</small>' : '') + '</button>').join('');
      const msg = u.msg ? '<div class="messaggio ' + u.msg.tipo + '">' + ico(u.msg.tipo === 'verde' ? 'spunta' : 'avviso') + '<div>' + u.msg.testo + '</div></div>' : '';
      const patVoci = S.patentini.slice().sort((a, b) => (a.clienteId === u.clienteId ? -1 : 0) - (b.clienteId === u.clienteId ? -1 : 0)).map((p) => ({ id: p.id, testo: 'N. ' + p.numero + ' · ' + p.nominativo, sotto: 'scade il ' + dataIt(p.scadenza) + (G.statoPatentino(p) === 'scaduto' ? ' · SCADUTO' : '') }));

      return '<div class="titolo-pagina"><h1>Vendite — banco</h1><span class="spinta"></span><span class="chip grigio">' + ico('lucchetto') + 'Cassa RT in simulazione</span></div>'
        + '<div class="banco"><div class="pila">'
        + '<div class="scheda"><div class="riga-flex" style="align-items:flex-end"><div class="campo-blocco" style="flex:1;min-width:220px"><label class="etichetta" for="banco-cerca">Aggiungi articolo (cerca o scansiona il barcode)</label>'
        + '<div class="cerca">' + ico('cerca') + '<input class="campo" id="banco-cerca" data-in="banco-cerca" data-invio="banco-invio" value="' + esc(u.q) + '" placeholder="es. valvola 3/4, tassello 8, 8012345678901" autocomplete="off" autocapitalize="off" spellcheck="false"></div></div>'
        + '<div class="campo-blocco"><span class="etichetta">Listino</span><div class="listini">' + ['A', 'B', 'C'].map((l) => '<button class="' + (u.listino === l ? 'scelta' : '') + '" data-az="banco-listino" data-l="' + l + '" aria-pressed="' + (u.listino === l) + '">' + l + '</button>').join('') + '</div></div></div>'
        + '<div id="banco-risultati">' + htmlRisultati(u) + '</div></div>'
        + '<div class="tab carrello"><table><thead><tr><th>Articolo</th><th>Q.tà</th><th class="n">Prezzo</th><th class="n">Sc. %</th><th class="n">Totale</th><th></th></tr></thead><tbody>'
        + (righe || '<tr class="vuoto"><td colspan="6">Il carrello è vuoto: cerca un articolo qui sopra e toccalo per aggiungerlo.</td></tr>') + '</tbody></table></div>'
        + (u.carrello.length ? '<div class="riga-flex"><button class="btn" data-az="banco-svuota">Svuota carrello</button><span class="muto">' + u.carrello.length + ' righe · sconto per riga deciso al banco</span></div>' : '')
        + '</div>'
        + '<div class="pila"><div class="scheda"><div class="etichetta">Totale</div><div class="totale-grande">' + eur(tot) + '</div>'
        + '<div class="pila" style="gap:12px;margin-top:14px">'
        + '<div class="campo-blocco"><span class="etichetta">Cliente (opzionale)</span>' + G.combo('banco-cliente', { voci: S.clienti.map((x) => ({ id: x.id, testo: x.nome, cerca: x.piva + ' ' + x.cf + ' ' + x.codice, sotto: x.citta + (x.piva ? ' · P.IVA ' + x.piva : '') + ' · listino ' + x.listino })), valore: u.clienteId, segnaposto: 'Nome, codice o partita IVA', onScegli: (id) => { u.clienteId = id; if (id) u.listino = G.cli(id).listino; u.msg = null; G.ridisegna(); } }) + '</div>'
        + '<div class="campo-blocco"><span class="etichetta">Patentino (per DDT fitosanitari)</span>' + G.combo('banco-patentino', { voci: patVoci, valore: u.patentinoId, segnaposto: 'Numero o nominativo', onScegli: (id) => { u.patentinoId = id; G.ridisegna(); } }) + (pat && G.statoPatentino(pat) === 'scaduto' ? '<span class="suggerimento rosso-t">Scaduto il ' + dataIt(pat.scadenza) + '</span>' : '') + '</div>'
        + '<div class="campo-blocco"><span class="etichetta">Pagamento</span><div class="scelte-pagamento">' + pag + '</div></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="banco-regime">Regime IVA (per fattura)</label><select class="campo" id="banco-regime" data-ch="banco-regime">' + REGIMI.map((r) => '<option value="' + r[0] + '"' + (u.regime === r[0] ? ' selected' : '') + '>' + r[1] + '</option>').join('') + '</select></div>'
        + msg
        + '<button class="btn primario grande" data-az="banco-scontrino"' + (u.carrello.length ? '' : ' disabled') + '>' + ico('scontrino') + 'Emetti scontrino</button>'
        + '<div class="documenti-banco">'
        + '<button class="btn" data-az="banco-fac"' + (u.carrello.length ? '' : ' disabled') + '>Fattura acc. (FAC)</button>'
        + '<button class="btn" data-az="banco-ddt"' + (u.carrello.length ? '' : ' disabled') + '>DDT (per cliente)</button>'
        + '<button class="btn" data-az="banco-fito"' + (u.carrello.length ? '' : ' disabled') + '>DDT fitosanitari</button>'
        + '<button class="btn" data-az="banco-prev"' + (u.carrello.length ? '' : ' disabled') + '>Preventivo</button>'
        + '</div></div></div>'
        + '<div class="scheda"><div class="testa-scheda"><h2>Scontrini di oggi</h2><span class="destra">' + scOggi.length + ' · ' + eur(somma(scOggi, (s) => s.totale)) + '</span></div>'
        + G.tabella('banco-oggi', {
          righe: scOggi, chiave: (s) => s.id, altezza: '360px', vuoto: 'Ancora nessuno scontrino oggi',
          colonne: [
            { k: 'numero', t: 'N.', n: true, noFiltro: true, noOrd: true },
            { k: 'ora', t: 'Ora', v: (s) => oraIt(s.data), noFiltro: true, noOrd: true },
            { k: 'pag', t: 'Pagamento', v: (s) => (s.metodoId === 2 ? 'Carta' : 'Contanti'), noFiltro: true, noOrd: true },
            { k: 'totale', t: 'Totale', n: true, f: (s) => eur(s.totale), noFiltro: true, noOrd: true },
          ],
          onSel: (s) => mostraScontrino(s),
        }) + '</div></div></div>';
    },
    monta() {
      const u = banco();
      if (!u.q && window.matchMedia('(pointer: fine)').matches) { const el = document.getElementById('banco-cerca'); if (el) el.focus({ preventScroll: true }); }
    },
  };

  function mostraScontrino(s) {
    const S = G.S;
    const righe = s.righe.map((r) => '<div>' + esc(r.descr.slice(0, 24)) + '</div><div class="r"><span>' + qta(r.qta) + ' x ' + num(r.prezzo) + (r.sconto ? ' -' + G.fmt(r.sconto, 0) + '%' : '') + '</span><span>' + num(G.totaleRiga(r)) + '</span></div>').join('');
    G.apriFinestra({
      titolo: 'Documento commerciale n. ' + s.numero,
      corpo: '<div class="foglio-cornice"><div class="scontrino-carta"><div class="c"><strong>' + esc(S.negozio.ragione) + '</strong><br>' + esc(S.negozio.indirizzo) + '<br>' + esc(S.negozio.citta) + ' · P.IVA ' + esc(S.negozio.piva) + '</div><div class="tratt"></div>'
        + '<div class="c">DOCUMENTO COMMERCIALE<br>di vendita o prestazione</div><div class="tratt"></div>' + righe + '<div class="tratt"></div>'
        + '<div class="r"><strong>TOTALE COMPLESSIVO</strong><strong>' + num(s.totale) + '</strong></div><div class="r"><span>' + (s.metodoId === 2 ? 'PAGAMENTO ELETTRONICO' : 'PAGAMENTO CONTANTE') + '</span><span>' + num(s.totale) + '</span></div><div class="tratt"></div>'
        + '<div class="c">' + dataIt(s.data) + ' ' + oraIt(s.data) + '<br>DOC. N. ' + String(s.rt).padStart(4, '0') + '-' + String(s.numero).slice(-4) + '<br>RT 99MEX000000 (simulazione)</div></div></div>'
        + '<p class="suggerimento" style="margin:12px 0 0">Nel negozio lo scontrino parte dal registratore telematico collegato al programma; qui è simulato.</p>',
      piede: '<button class="btn primario" data-az="chiudi-finestra">Chiudi</button>',
    });
  }

  // ---- azioni del banco ----
  const A = G.AZ;
  G.IN['banco-cerca'] = (el) => {
    const u = banco(); u.q = el.value;
    const box = document.getElementById('banco-risultati');
    if (box) box.innerHTML = htmlRisultati(u);
  };
  A['banco-invio'] = () => {
    const u = banco();
    const r = risultatiBanco(u.q);
    if (r.length) aggiungi(r[0].id);
  };
  function aggiungi(id) {
    const u = banco(), a = G.art(id);
    const esiste = u.carrello.find((r) => r.artId === id);
    if (esiste) esiste.qta += 1;
    else u.carrello.push({ artId: a.id, codice: a.codice, descr: a.descr, um: a.um, qta: 1, prezzo: prezzoListino(a, u.listino), sconto: 0, iva: a.iva, fito: a.fito });
    u.q = ''; u.msg = null;
    G.ridisegna();
    const el = document.getElementById('banco-cerca'); if (el && window.matchMedia('(pointer: fine)').matches) el.focus({ preventScroll: true });
  }
  A['banco-aggiungi'] = (el) => aggiungi(Number(el.dataset.id));
  A['banco-listino'] = (el) => {
    const u = banco(); u.listino = el.dataset.l;
    const box = document.getElementById('banco-risultati');
    document.querySelectorAll('.listini button').forEach((b) => { b.classList.toggle('scelta', b.dataset.l === u.listino); b.setAttribute('aria-pressed', b.dataset.l === u.listino); });
    if (box) box.innerHTML = htmlRisultati(u);
  };
  A['banco-qta'] = (el) => { const u = banco(); const r = u.carrello[Number(el.dataset.i)]; r.qta = Math.max(1, r.qta + Number(el.dataset.d)); G.ridisegna(); };
  G.CH['banco-qta-scrivi'] = (el) => { const u = banco(); const r = u.carrello[Number(el.dataset.i)]; r.qta = Math.max(0.01, G.leggiNumSemplice(el.value) || 1); G.ridisegna(); };
  G.CH['banco-prezzo'] = (el) => { const u = banco(); const r = u.carrello[Number(el.dataset.i)]; r.prezzo = Math.max(0, G.leggiNum(el.value)); G.ridisegna(); };
  G.CH['banco-sconto'] = (el) => { const u = banco(); const r = u.carrello[Number(el.dataset.i)]; r.sconto = Math.min(100, Math.max(0, G.leggiNumSemplice(el.value))); G.ridisegna(); };
  A['banco-togli'] = (el) => { const u = banco(); u.carrello.splice(Number(el.dataset.i), 1); G.ridisegna(); };
  A['banco-svuota'] = () => { const u = banco(); u.carrello = []; u.msg = null; G.ridisegna(); };
  A['banco-pag'] = (el) => { const u = banco(); u.metodoId = Number(el.dataset.m); u.msg = soloFattura(u.metodoId) ? { tipo: 'blu', testo: 'Con «' + G.metodo(u.metodoId).nome + '» si emette la fattura accompagnatoria (FAC): lo scontrino si batte con Contanti o Carta.' } : null; G.ridisegna(); };
  G.CH['banco-regime'] = (el) => { banco().regime = el.value; };

  function scaricaMagazzino(righe, segno) {
    righe.forEach((r) => { const a = G.art(r.artId); if (a) a.giac = G.r2(a.giac - segno * r.qta); });
  }
  function pulisci(u) { u.carrello = []; u.q = ''; u.clienteId = null; u.patentinoId = null; u.listino = 'A'; if (soloFattura(u.metodoId)) u.metodoId = 1; }

  A['banco-scontrino'] = () => {
    const S = G.S, u = banco();
    if (!u.carrello.length) return;
    if (soloFattura(u.metodoId)) {
      u.msg = { tipo: 'rosso', testo: '«' + G.metodo(u.metodoId).nome + '» si usa per la fattura accompagnatoria (FAC), non per lo scontrino: per lo scontrino scegli Contanti o Carta.' };
      G.ridisegna(); return;
    }
    if (u.carrello.some((r) => r.fito)) {
      u.msg = { tipo: 'rosso', testo: 'Nel carrello ci sono prodotti fitosanitari: si vendono col «DDT fitosanitari», che registra lo scarico sul patentino.' };
      G.ridisegna(); return;
    }
    const d = new Date();
    const righe = u.carrello.map((r) => Object.assign({}, r));
    const s = { id: G.nuovoId(), numero: S.prossimo.scontrino++, data: G.OGGI + 'T' + G.D.pad(d.getHours()) + ':' + G.D.pad(d.getMinutes()) + ':00', clienteId: u.clienteId, metodoId: u.metodoId, righe, totale: r2(somma(righe, G.totaleRiga)), rt: 0 };
    s.rt = s.numero - 1200;
    S.scontrini.push(s);
    scaricaMagazzino(righe, 1);
    G.log('Vendita', 'Emesso scontrino n. ' + s.numero + ' · ' + eur(s.totale) + ' (' + (s.metodoId === 2 ? 'carta' : 'contanti') + ')');
    pulisci(u); u.msg = { tipo: 'verde', testo: 'Scontrino n. ' + s.numero + ' · ' + eur(s.totale) + ' · cassa aggiornata (simulazione)' };
    G.salva(); G.ridisegna(); mostraScontrino(s);
  };

  function richiediCliente(u, perche) {
    if (u.clienteId) return G.cli(u.clienteId);
    u.msg = { tipo: 'rosso', testo: 'Per ' + perche + ' scegli prima il cliente.' };
    G.ridisegna(); return null;
  }

  A['banco-fac'] = () => {
    const S = G.S, u = banco();
    const c = richiediCliente(u, 'la fattura accompagnatoria'); if (!c) return;
    if (!c.piva && !c.cf) { u.msg = { tipo: 'rosso', testo: 'Il cliente deve avere partita IVA o codice fiscale per la fattura elettronica.' }; G.ridisegna(); return; }
    const righe = u.carrello.map((r) => Object.assign({}, r));
    const t = G.totaliRighe(righe);
    const anno = Number(G.OGGI.slice(0, 4));
    const f = { id: G.nuovoId(), tipo: 'FAC', numero: ++S.prossimo.fac, anno, data: G.OGGI, clienteId: c.id, righe, imponibile: t.imponibile, iva: t.iva, totale: t.totale, metodoId: u.metodoId, pagamentoTesto: '', ddtIds: [], sdi: 'GENERATO', mail: '', progressivo: String(++S.prossimo.progressivo).padStart(5, '0'), causale: u.regime === 'SPL' ? 'Scissione dei pagamenti art. 17-ter DPR 633/72' : u.regime === 'REV' ? 'Inversione contabile art. 17 DPR 633/72' : u.regime === 'ESE' ? 'Operazione esente art. 10 DPR 633/72' : 'Vendita' };
    S.fatture.push(f);
    S.scadenze.push({ id: G.nuovoId(), tipo: 'ATTIVA', soggettoId: c.id, fatturaId: f.id, documento: 'FAC ' + f.numero, dataDoc: f.data, scadenza: G.scadenzaDa(f.metodoId, f.data), importo: u.regime === 'SPL' ? t.imponibile : t.totale, pagato: 0, stato: 'APERTA', metodoId: f.metodoId });
    scaricaMagazzino(righe, 1);
    G.indicizza();
    G.log('Fattura', 'Emessa fattura accompagnatoria FAC ' + f.numero + ' a ' + c.nome + ' · ' + eur(f.totale));
    pulisci(u); u.msg = { tipo: 'verde', testo: 'Fattura accompagnatoria FAC ' + f.numero + ' emessa · XML per lo SDI pronto (IT' + S.negozio.piva + '_' + f.progressivo + '.xml)' };
    G.salva(); G.ridisegna(); G.apriDocumento(G.docDaFattura(f));
  };

  function creaDdt(u, c, causale) {
    const S = G.S;
    const righe = u.carrello.map((r) => Object.assign({}, r));
    const d = { id: G.nuovoId(), numero: ++S.prossimo.ddt, anno: Number(G.OGGI.slice(0, 4)), data: G.OGGI, clienteId: c.id, causale, righe, totale: G.totaliRighe(righe).totale, fatturaId: null };
    S.ddt.push(d);
    scaricaMagazzino(righe, 1);
    G.indicizza();
    return d;
  }
  A['banco-ddt'] = () => {
    const u = banco();
    const c = richiediCliente(u, 'il DDT'); if (!c) return;
    const d = creaDdt(u, c, 'Vendita');
    G.log('DDT', 'Emesso DDT n. ' + d.numero + ' a ' + c.nome + ' · ' + eur(d.totale));
    pulisci(u); u.msg = { tipo: 'verde', testo: 'DDT n. ' + d.numero + ' emesso: a fine mese finisce nella fattura riepilogativa del cliente.' };
    G.salva(); G.ridisegna(); G.apriDocumento(G.docDaDdt(d));
  };
  A['banco-fito'] = () => {
    const S = G.S, u = banco();
    const c = richiediCliente(u, 'il DDT fitosanitari (l\'azienda che acquista)'); if (!c) return;
    const p = u.patentinoId ? S.patentini.find((x) => x.id === u.patentinoId) : null;
    if (!p) { u.msg = { tipo: 'rosso', testo: 'Scegli il patentino dell\'acquirente (campo sotto il cliente).' }; G.ridisegna(); return; }
    if (G.statoPatentino(p) === 'scaduto') { u.msg = { tipo: 'rosso', testo: 'Patentino SCADUTO il ' + dataIt(p.scadenza) + ': la vendita di fitosanitari non è consentita.' }; G.ridisegna(); return; }
    const fito = u.carrello.filter((r) => r.fito);
    if (!fito.length) { u.msg = { tipo: 'ambra', testo: 'Nel carrello non ci sono prodotti fitosanitari: usa il normale «DDT (per cliente)».' }; G.ridisegna(); return; }
    const d = creaDdt(u, c, 'Vendita fitosanitari');
    fito.forEach((r) => S.registro.unshift({ id: G.nuovoId(), tipo: 'SCARICO', data: G.OGGI, artId: r.artId, qta: r.qta, patentinoId: p.id, clienteId: c.id, doc: 'DDT ' + d.numero, dataDoc: G.OGGI, lotto: (G.art(r.artId) || {}).lotto || '' }));
    G.log('Agrofarmaci', 'DDT fitosanitari n. ' + d.numero + ' · ' + fito.length + ' scarichi sul registro · patentino n. ' + p.numero);
    pulisci(u); u.msg = { tipo: 'verde', testo: 'DDT fitosanitari n. ' + d.numero + ' emesso · ' + fito.length + ' scarichi registrati sul registro agrofarmaci.' };
    G.salva(); G.ridisegna(); G.apriDocumento(G.docDaDdt(d));
  };
  A['banco-prev'] = () => {
    const u = banco();
    const c = richiediCliente(u, 'il preventivo'); if (!c) return;
    const righe = u.carrello.map((r) => Object.assign({}, r));
    G.log('Preventivo', 'Preparato preventivo per ' + c.nome);
    G.apriDocumento({ tipoDoc: 'PREVENTIVO', titolo: 'Preventivo', numero: 'P' + String(G.nuovoId()).slice(-4), data: G.OGGI, clienteId: c.id, righe, pagamento: c.pagamento, causale: 'Validità 30 giorni' });
    u.msg = { tipo: 'verde', testo: 'Preventivo pronto: il magazzino non viene toccato.' };
  };
})();
