/* Registro agrofarmaci, Cronologia, Informazioni e contatti */
(function () {
  'use strict';
  const G = window.GF;
  const { esc, qta, dataIt, oraIt, ico } = G;
  const A = G.AZ;

  // =====================================================================
  // REGISTRO AGROFARMACI
  // =====================================================================
  const uReg = () => G.ui('registro', () => ({ artId: null, qta: '10', fornitoreId: null, doc: '', data: G.OGGI, lotto: '', msg: null }));
  G.VISTE.registro = {
    render() {
      const S = G.S, u = uReg();
      const fito = S.articoli.filter((a) => a.fito);
      const scaduti = S.patentini.filter((p) => G.statoPatentino(p) === 'scaduto').length;
      const agro = S.fornitori.filter((f) => f.cat.includes('FITO'));
      if (!u.fornitoreId && agro.length) u.fornitoreId = agro[0].id;
      const carichi = S.registro.filter((r) => r.tipo === 'CARICO');
      const scarichi = S.registro.filter((r) => r.tipo === 'SCARICO');
      const nomeArt = (r) => (G.art(r.artId) || {}).descr || '';
      const msg = u.msg ? '<div class="messaggio ' + u.msg.tipo + '" style="margin:12px 0 0">' + ico(u.msg.tipo === 'verde' ? 'spunta' : 'avviso') + '<div>' + u.msg.testo + '</div></div>' : '';
      return '<div class="titolo-pagina"><h1>Registro agrofarmaci</h1><span class="chip verde">' + fito.length + ' prodotti fitosanitari</span><span class="chip rosso">' + scaduti + ' patentini scaduti</span>'
        + '<span class="spinta"></span><button class="btn" data-az="reg-patentini">Gestione patentini…</button>'
        + '<div class="sotto">Lo scarico si registra dal banco: Vendite → «DDT fitosanitari», col patentino dell\'acquirente. Un patentino scaduto blocca la vendita.</div></div>'
        + '<div class="scheda" style="margin-bottom:16px"><h2>Registra carico <span class="muto">arrivo da fornitore</span></h2>'
        + '<div class="riga-campi" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">'
        + '<div class="campo-blocco" style="grid-column:span 2"><span class="etichetta">Prodotto *</span>' + G.combo('reg-prodotto', { voci: fito.map((a) => ({ id: a.id, testo: a.descr, sotto: a.codice + ' · reg. n. ' + a.nReg + ' · giac. ' + qta(a.giac) })), valore: u.artId, segnaposto: 'Scrivi per cercarlo', onScegli: (id) => { u.artId = id; const a = G.art(id); if (a) u.lotto = a.lotto; G.ridisegna(); } }) + '</div>'
        + '<div class="campo-blocco"><label class="etichetta" for="reg-qta">Quantità</label><input class="campo" id="reg-qta" inputmode="decimal" data-in="reg-campo" data-k="qta" value="' + esc(u.qta) + '"></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="reg-forn">Produttore / fornitore</label><select class="campo" id="reg-forn" data-ch="reg-forn">' + S.fornitori.map((f) => '<option value="' + f.id + '"' + (u.fornitoreId === f.id ? ' selected' : '') + '>' + esc(f.nome) + '</option>').join('') + '</select></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="reg-doc">N. documento</label><input class="campo" id="reg-doc" data-in="reg-campo" data-k="doc" value="' + esc(u.doc) + '" placeholder="es. 4821"></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="reg-data">Data documento</label><input class="campo" type="date" id="reg-data" data-in="reg-campo" data-k="data" value="' + esc(u.data) + '"></div>'
        + '<div class="campo-blocco"><label class="etichetta" for="reg-lotto">Lotto</label><input class="campo" id="reg-lotto" data-in="reg-campo" data-k="lotto" value="' + esc(u.lotto) + '"></div>'
        + '<div class="campo-blocco" style="justify-content:flex-end"><button class="btn primario" data-az="reg-carico">Registra carico</button></div>'
        + '</div>' + msg + '</div>'
        + '<div class="testa-scheda"><h2 class="rosso-t" style="letter-spacing:.02em">CARICO</h2><span class="muto">' + carichi.length + ' carichi</span></div>'
        + G.tabella('reg-carico', {
          righe: carichi, chiave: (r) => r.id, altezza: '300px', ordine: { k: 'data', dir: -1 },
          colonne: [
            { k: 'data', t: 'Data', f: (r) => dataIt(r.data), testo: (r) => dataIt(r.data), w: 92 },
            { k: 'prod', t: 'Prodotto · n. registrazione', v: nomeArt, testo: (r) => nomeArt(r) + ' ' + ((G.art(r.artId) || {}).nReg || ''), f: (r) => esc(nomeArt(r)) + '<div class="sotto-cella">Reg. n. ' + esc((G.art(r.artId) || {}).nReg || '') + '</div>', cls: 'lungo', w: 210 },
            { k: 'forn', t: 'Produttore', v: (r) => (G.forn(r.fornitoreId) || {}).nome || '', cls: 'due-righe', w: 140 },
            { k: 'doc', t: 'Doc. rif.', w: 110 },
            { k: 'qta', t: 'Q.tà', n: true, f: (r) => qta(r.qta), w: 60 },
            { k: 'lotto', t: 'Lotto', w: 90 },
          ],
        })
        + '<div class="testa-scheda" style="margin-top:18px"><h2 class="rosso-t" style="letter-spacing:.02em">SCARICO</h2><span class="muto">' + scarichi.length + ' scarichi</span></div>'
        + G.tabella('reg-scarico', {
          righe: scarichi, chiave: (r) => r.id, altezza: '320px', ordine: { k: 'data', dir: -1 },
          colonne: [
            { k: 'data', t: 'Data', f: (r) => dataIt(r.data), testo: (r) => dataIt(r.data), w: 92 },
            { k: 'prod', t: 'Prodotto', v: nomeArt, cls: 'lungo', w: 190 },
            { k: 'pat', t: 'Patentino', v: (r) => { const p = S.patentini.find((x) => x.id === r.patentinoId) || {}; return (p.numero || '') + ' ' + (p.nominativo || ''); }, f: (r) => { const p = S.patentini.find((x) => x.id === r.patentinoId) || {}; return 'N. ' + esc(p.numero || '') + '<div class="sotto-cella">' + esc(p.nominativo || '') + '</div>'; }, w: 150 },
            { k: 'cli', t: 'Cliente', v: (r) => (G.cli(r.clienteId) || {}).nome || '', cls: 'due-righe', w: 160 },
            { k: 'doc', t: 'Doc. rif.', w: 90 },
            { k: 'qta', t: 'Q.tà', n: true, f: (r) => qta(r.qta), w: 60 },
          ],
        });
    },
  };
  G.IN['reg-campo'] = (el) => { uReg()[el.dataset.k] = el.value; };
  G.CH['reg-forn'] = (el) => { uReg().fornitoreId = Number(el.value); };
  A['reg-carico'] = () => {
    const S = G.S, u = uReg();
    const a = u.artId ? G.art(u.artId) : null;
    const q = G.leggiNumSemplice(u.qta);
    if (!a) { u.msg = { tipo: 'rosso', testo: 'Scegli il prodotto fitosanitario.' }; G.ridisegna(); return; }
    if (!(q > 0)) { u.msg = { tipo: 'rosso', testo: 'Scrivi la quantità arrivata.' }; G.ridisegna(); return; }
    S.registro.unshift({ id: G.nuovoId(), tipo: 'CARICO', data: G.OGGI, artId: a.id, qta: q, fornitoreId: u.fornitoreId, doc: 'DDT forn. ' + (u.doc || '—'), dataDoc: u.data || G.OGGI, lotto: u.lotto || a.lotto });
    a.giac = G.r2(a.giac + q); a.ultimoAcq = G.OGGI;
    G.log('Agrofarmaci', 'Carico ' + qta(q) + ' × ' + a.descr + ' (lotto ' + (u.lotto || a.lotto) + ')');
    Object.assign(u, { artId: null, qta: '10', doc: '', lotto: '', msg: { tipo: 'verde', testo: 'Carico registrato: ' + esc(a.descr) + ' · giacenza ora ' + qta(a.giac) } });
    G.salva(); G.ridisegna();
  };

  function corpoPatentini() {
    const S = G.S;
    return '<p style="margin-top:0">Ogni vendita di fitosanitari va registrata col patentino di chi compra. Il programma avvisa prima della scadenza e blocca la vendita quando è scaduto.</p>'
      + G.tabella('patentini', {
        righe: S.patentini, chiave: (p) => p.id, altezza: '55vh', ordine: { k: 'scadenza', dir: 1 },
        classe: (p) => (G.statoPatentino(p) === 'scaduto' ? 'tinta-rossa' : ''),
        colonne: [
          { k: 'numero', t: 'Numero', w: 80 },
          { k: 'nominativo', t: 'Nominativo', w: 190 },
          { k: 'cli', t: 'Cliente', v: (p) => (G.cli(p.clienteId) || {}).nome || '', cls: 'lungo', w: 200 },
          { k: 'scadenza', t: 'Scadenza', f: (p) => dataIt(p.scadenza), testo: (p) => dataIt(p.scadenza), w: 100 },
          { k: 'stato', t: 'Stato', v: G.statoPatentino, f: (p) => { const s = G.statoPatentino(p); return '<span class="chip ' + (s === 'scaduto' ? 'rosso' : s === 'in scadenza' ? 'ambra' : 'verde') + '">' + s + '</span>'; }, w: 110 },
        ],
      });
  }
  A['reg-patentini'] = () => G.apriFinestra({ titolo: 'Patentini fitosanitari', larga: true, corpo: corpoPatentini, piede: '<button class="btn primario" data-az="chiudi-finestra">Chiudi</button>', fuoco: false });

  // =====================================================================
  // CRONOLOGIA
  // =====================================================================
  G.VISTE.cronologia = {
    render() {
      const S = G.S;
      return '<div class="titolo-pagina"><h1>Cronologia</h1><span class="chip grigio">' + S.cronologia.length + ' operazioni</span>'
        + '<div class="sotto">Ogni operazione resta scritta con data, ora e cosa è cambiato: anche quelle che fai adesso in questa demo.</div></div>'
        + G.tabella('cronologia', {
          righe: S.cronologia, chiave: (c) => c.id, altezza: 'calc(100vh - 190px)', ordine: { k: 'quando', dir: -1 },
          colonne: [
            { k: 'quando', t: 'Quando', f: (c) => dataIt(c.quando) + ' ' + oraIt(c.quando), testo: (c) => dataIt(c.quando) + ' ' + oraIt(c.quando), w: 150 },
            { k: 'tipo', t: 'Tipo', w: 130 },
            { k: 'descr', t: 'Descrizione', cls: 'lungo', w: 460 },
          ],
        });
    },
  };

  // =====================================================================
  // INFORMAZIONI E CONTATTI
  // =====================================================================
  const CONTATTI = { nome: 'Luca Napolini', ruolo: 'Sviluppo software · Montefalco (PG)', tel: '389 0460154', email: 'luca.napolini.ai@gmail.com' };
  const FUNZIONI = [
    ['banco', 'Banco e cassa', 'Scontrino al registratore telematico, sconto per riga, listini A/B/C, ricerca per codice, barcode o descrizione.'],
    ['fatture', 'Fatture elettroniche', 'Fattura da DDT a fine mese, accompagnatoria, note di credito. Invio allo SDI per PEC e lettura automatica delle ricevute.'],
    ['articoli', 'Margini sotto controllo', 'Ricarico e margine di ogni articolo, prezzo obiettivo, avviso degli articoli venduti sottocosto e sotto scorta.'],
    ['euro', 'Scadenzario e prima nota', 'Incassi anche parziali, Riba e bonifici con la scadenza giusta, saldi di cassa, banca e POS, quadratura del cassetto.'],
    ['agrofarmaci', 'Registro agrofarmaci', 'Carichi e scarichi col patentino dell\'acquirente: la vendita a un patentino scaduto viene bloccata.'],
    ['analisi', 'Analisi delle vendite', 'Fatturato e guadagno per mese e per categoria, confronto con l\'anno prima, prodotti che rendono di più.'],
    ['zip', 'Pronto per il commercialista', 'Ogni mese una cartella con fatture, corrispettivi e prima nota; i PDF delle fatture gli arrivano in uno ZIP.'],
    ['ripristina', 'Si parte dai tuoi dati', 'Articoli, clienti e scadenze si portano dal programma che usi oggi, con la verifica dei totali.'],
  ];
  G.VISTE.informazioni = {
    render() {
      return '<div class="titolo-pagina"><h1>Informazioni</h1></div>'
        + '<div class="info-hero" style="margin-bottom:16px">'
        + '<div class="scheda"><h2>Il gestionale per ferramenta e agrarie</h2>'
        + '<p style="margin:0 0 12px;max-width:62ch">Banco collegato alla cassa telematica, fatture elettroniche allo SDI senza intermediari, scadenzario, prima nota e registro agrofarmaci in un solo programma. Gira sui computer del negozio anche senza internet, con i dati in negozio e la copia di sicurezza ogni giorno.</p>'
        + '<div class="messaggio ambra" style="margin:0">' + ico('info') + '<div>Questa è una dimostrazione: la ferramenta, i clienti e i numeri sono inventati. Ogni giorno la demo riparte da capo; puoi anche farla ripartire adesso.</div></div>'
        + '<div class="riga-flex" style="margin-top:12px"><button class="btn" data-az="info-ripristina">' + ico('ripristina') + 'Ripristina i dati dimostrativi</button></div></div>'
        + '<div class="scheda"><h2>Contatti</h2><div style="font-weight:600;font-size:16px">' + esc(CONTATTI.nome) + '</div><div class="muto" style="margin-bottom:8px">' + esc(CONTATTI.ruolo) + '</div>'
        + '<div class="contatto">' + ico('telefono') + '<span class="v">' + esc(CONTATTI.tel) + '</span><span class="spazio"></span><button class="btn piccolo" data-az="info-copia" data-t="' + esc(CONTATTI.tel) + '">' + ico('copia') + 'Copia</button></div>'
        + '<div class="contatto">' + ico('posta') + '<span class="v">' + esc(CONTATTI.email) + '</span><span class="spazio"></span><button class="btn piccolo" data-az="info-copia" data-t="' + esc(CONTATTI.email) + '">' + ico('copia') + 'Copia</button></div></div>'
        + '</div>'
        + '<div class="scheda"><h2>Cosa fa</h2><div class="funzioni">'
        + FUNZIONI.map((f) => '<div class="funzione"><h3>' + ico(f[0]) + esc(f[1]) + '</h3><p>' + esc(f[2]) + '</p></div>').join('')
        + '</div></div>';
    },
  };
  A['info-copia'] = (el) => {
    const t = el.dataset.t;
    const fatto = () => G.avviso('Copiato: ' + esc(t));
    try {
      navigator.clipboard.writeText(t).then(fatto, () => G.avviso('Tieni premuto sul testo per copiarlo.', 'errore'));
    } catch (e) { G.avviso('Tieni premuto sul testo per copiarlo.', 'errore'); }
  };
  A['info-ripristina'] = () => G.chiedi({
    titolo: 'Ripristinare i dati dimostrativi?', si: 'Ripristina',
    testo: 'Scontrini, fatture e modifiche fatte durante la prova spariscono e la demo riparte come nuova.',
    onSi: () => { G.ripristina(); G.vai('dashboard'); G.avviso('Dati dimostrativi ripristinati'); },
  });
})();
