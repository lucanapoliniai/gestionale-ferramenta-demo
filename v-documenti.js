/* Documenti di trasporto, Inventario, Registro acquisti, Registro agrofarmaci (con Gestione patentini)
   e Scadenzario. Ricopiate da DdtView, InventarioView, AcquistiView, RegistroView, PatentiniWindow e
   ScadenzarioView: stesse colonne, stessi pannelli, stesse domande prima di toccare i dati. */
(function () {
  'use strict';
  const G = window.GF;
  const { esc, num, qta, dataIt, somma, r2 } = G;
  const A = G.AZ;
  const btn = (testo, az, o) => { o = o || {}; return '<button class="btn' + (o.primario ? ' primario' : '') + (o.cls ? ' ' + o.cls : '') + '" data-az="' + az + '"' + (o.dis ? ' disabled' : '') + (o.id ? ' id="' + o.id + '"' : '') + (o.stile ? ' style="' + o.stile + '"' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + (o.dati || '') + '>' + esc(testo) + '</button>'; };
  const msgSpan = (m, stile) => '<span style="font-size:12px;' + (stile || '') + ';color:' + (m ? m.colore : 'inherit') + '">' + (m ? esc(m.testo) : '') + '</span>';
  const tb = (id, val, attr) => '<input class="tb" id="' + id + '" value="' + esc(val === null || val === undefined ? '' : val) + '"' + (attr || '') + ' autocomplete="off" spellcheck="false">';
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  const n2 = (x) => String(Math.round(Number(x || 0) * 100) / 100).replace('.', ',');
  const clientiLookup = () => G.S.clienti.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => ({ id: c.id, testo: c.codice + ' — ' + c.nome + (c.piva ? ' · P.IVA ' + c.piva : c.cf ? ' · CF ' + c.cf : '') }));
  const fornLookup = () => G.S.fornitori.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((f) => ({ id: f.id, testo: f.codice + ' — ' + f.nome }));
  const displayArt = (a) => a.codice + ' — ' + a.descr + '   (disp. ' + qta(Math.round(a.giac * 100) / 100) + ')';
  function cercaArticoli(q, lista) {
    const t = G.normalizza(q).trim();
    if (!t) return [];
    const uguale = (s) => G.normalizza(s) === t;
    return (lista || G.S.articoli).filter((a) => G.normalizza(a.descr).includes(t) || G.normalizza(a.codice).includes(t) || G.normalizza(a.barcode).includes(t))
      .slice().sort((a, b) => a.descr.localeCompare(b.descr))
      .map((a) => ({ a, p: uguale(a.codice) || uguale(a.barcode) ? 0 : G.normalizza(a.descr).startsWith(t) ? 1 : 2 }))
      .sort((x, y) => x.p - y.p).map((x) => x.a).slice(0, 500);
  }
  const prezzoListino = (a, l) => (l === 'C' ? a.prezzoC : l === 'B' ? a.prezzoB : a.prezzoA) || a.prezzoA;
  const prezzo2 = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
  const scala = (righe, segno) => righe.forEach((r) => { const a = G.art(r.artId); if (a) a.giac = r2(a.giac - segno * r.qta); });

  // =====================================================================
  // DOCUMENTI DI TRASPORTO
  // =====================================================================
  const dd = () => G.ui('ddt', () => ({ msg: null, form: null }));
  const ddtNumero = (d) => d.numero + '/' + d.anno;
  G.VISTE.ddt = {
    nuova() { const u = dd(); u.msg = null; u.form = null; G.deseleziona('ddt'); },
    render() {
      const S = G.S, u = dd();
      const sel = G.selezionato('ddt');
      const righe = S.ddt.filter((d) => !d.annullato).slice().sort((a, b) => (b.anno - a.anno) || (b.numero - a.numero));
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga tesa" style="margin-bottom:10px"><div class="pila"><div class="h1">Documenti di trasporto</div><span class="muto" style="margin-left:16px">' + righe.length + ' DDT · ' + righe.filter((d) => !d.fatturaId).length + ' da fatturare</span></div>'
        + '<div class="riga tesa fisso">' + btn('Annulla DDT', 'ddt-annulla', { dis: !sel, stile: 'margin-right:8px', title: 'Elimina il DDT selezionato: la merce torna in magazzino, gli scarichi del registro agrofarmaci collegati vengono tolti e, se è l\'ultimo emesso, il numero torna libero' })
        + btn('Modifica DDT', 'ddt-modifica', { dis: !sel, stile: 'margin-right:8px', title: 'Cambia quantità, aggiungi o togli articoli sul DDT selezionato, tenendo numero e data. Il magazzino si riallinea da solo.' })
        + btn('Apri PDF', 'ddt-pdf', { dis: !sel, stile: 'margin-right:8px' }) + btn('+ Nuovo DDT', 'ddt-nuovo', { primario: true }) + '</div></div>'
        + '<div class="col riempi" style="position:relative">' + G.dg('ddt', {
          classe: 'riempi', righe, chiave: (d) => d.id, onSel: () => G.ridisegna(), onDoppio: (d) => { G.scegliRiga('ddt', d.id); A['ddt-pdf'](); },
          colonne: [
            { k: 'num', t: 'Numero', w: 90, mono: true, v: ddtNumero, ordina: (d) => d.anno * 100000 + d.numero },
            { k: 'data', t: 'Data', w: 96, v: (d) => dataIt(d.data), ordina: (d) => d.data },
            { k: 'cli', t: 'Cliente', w: '*', v: (d) => (G.cli(d.clienteId) || {}).nome || '' },
            { k: 'righe', t: 'Righe', w: 60, n: true, v: (d) => d.righe.length },
            { k: 'tot', t: 'Totale €', w: 100, n: true, v: (d) => num(d.totale), ordina: (d) => d.totale },
            { k: 'stato', t: 'Stato', w: 110, v: (d) => (d.fatturaId ? 'Fatturato' : 'Da fatturare'), f: (d) => (d.fatturaId ? '<span style="color:#2E7D32;font-weight:600">Fatturato</span>' : 'Da fatturare') },
          ],
        }) + (u.form ? '<div class="card col" style="position:absolute;inset:0;z-index:5">' + this.form(u) + '</div>' : '') + '</div>'
        + '<div class="muto" style="margin-top:10px;font-size:12.5px;min-height:17px;color:' + (u.msg ? u.msg.colore : 'var(--testo-2)') + '">' + (u.msg ? esc(u.msg.testo) : '') + '</div></div>';
    },
    form(u) {
      const f = u.form;
      const lb = (l) => '<button class="btn' + (f.evidenziato === l ? ' listino-scelto' : '') + '" style="width:34px;padding:4px 0;margin-right:' + (l === 'C' ? 10 : 4) + 'px" data-az="ddtf-listino" data-l="' + l + '">' + l + '</button>';
      const art = f.artSel ? G.art(f.artSel) : null;
      const tot = somma(f.righe, G.totaleRiga);
      return '<div class="h2" style="font-size:17px;margin-bottom:10px">' + esc(f.titolo) + '</div>'
        + '<div class="avvolgi">'
        + '<div style="width:300px;margin:0 14px 10px 0"><div class="muto">Cliente *</div><div style="margin-top:3px">' + G.cmb('ddtf-cliente', { voci: clientiLookup(), valore: f.clienteId, testoLibero: f.clienteTesto, title: 'Scrivi nome, codice o partita IVA', onScrivi: (t, v) => { f.clienteTesto = t; if (v !== f.clienteId) clienteDdt(f, v, false); }, onScegli: (v) => clienteDdt(f, v, true) }) + '</div></div>'
        + '<div style="width:220px;margin:0 14px 10px 0"><div class="muto">Causale</div><div style="margin-top:3px">' + G.cmb('ddtf-causale', { voci: ['Vendita', 'Conto visione', 'Reso', 'Riparazione', 'Omaggio', 'Trasferimento'].map((x) => ({ id: x, testo: x })), valore: null, testoLibero: f.causale, libero: true, onScrivi: (t) => { f.causale = t; } }) + '</div></div>'
        + '<div style="width:380px;margin:0 14px 10px 0"><div class="muto">Note (stampate sotto l\'elenco dei prodotti)</div>' + tb('ddtf-note', f.note, ' style="margin-top:3px" data-in="ddtf-note"') + '</div></div>'
        + '<div style="background:#F4F6F8;border-radius:8px;padding:10px;margin-bottom:8px"><div class="muto" style="margin-bottom:4px">Aggiungi articolo</div>'
        + tb('ddtf-cerca', f.q, ' data-in="ddtf-cerca" title="Cerca per descrizione, codice o barcode"')
        + '<div class="lb" id="ddtf-ris" style="height:86px;min-height:86px;margin:6px 0">' + this.risultati(f) + '</div>'
        + '<div class="avvolgi" style="align-items:center"><span style="font-weight:600;margin-right:12px;max-width:330px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (art ? esc(displayArt(art)) : '—') + '</span>'
        + '<span class="muto" style="margin-right:4px">Q.tà</span>' + tb('ddtf-qta', f.qtaTesto, ' style="width:64px;margin-right:10px" data-in="ddtf-qta" inputmode="decimal"')
        + '<span class="muto" style="margin-right:4px" title="Prezzo A, B o C dell\'articolo. Parte da quello del cliente del documento.">Listino</span>' + lb('A') + lb('B') + lb('C')
        + '<span class="muto" style="margin-right:4px">Prezzo</span>' + tb('ddtf-prezzo', f.prezzoTesto, ' style="width:80px;margin-right:10px" data-in="ddtf-prezzo" inputmode="decimal"')
        + btn('Aggiungi riga', 'ddtf-aggiungi', { stile: 'padding:5px 12px' }) + '</div>'
        + (art ? '<div class="muto" style="margin-top:6px">Listini di ' + esc(art.codice) + ':  A ' + num(art.prezzoA) + ' €' + (art.prezzoB ? '   ·   B ' + num(art.prezzoB) + ' €' : '   ·   B non impostato (vale A)') + (art.prezzoC ? '   ·   C ' + num(art.prezzoC) + ' €' : '   ·   C non impostato (vale A)') + '        cliente in listino ' + f.listinoCliente + '</div>' : '')
        + '</div>'
        + G.dg('ddtf-righe', { classe: 'riempi', righe: f.righe, chiave: (r) => r.k, colonne: [
          { k: 'codice', t: 'Codice', w: 96, mono: true }, { k: 'descr', t: 'Descrizione', w: '*', min: 180 },
          { k: 'qta', t: 'Q.tà', w: 62, n: true, v: (r) => qta(r.qta), input: { ch: 'ddtf-cella', cls: 'modifica' } },
          { k: 'listino', t: 'List.', w: 56, f: (r) => '<select data-ch="ddtf-listino-riga" data-k="' + r.k + '" title="Listino della riga. «—» vuol dire prezzo scritto a mano: cambiandolo in A, B o C il prezzo si aggiorna.">' + ['A', 'B', 'C', '—'].map((l) => '<option' + (r.listino === l ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' },
          { k: 'prezzo', t: 'Prezzo', w: 80, n: true, v: (r) => num(r.prezzo), input: { ch: 'ddtf-cella', cls: 'modifica' } },
          { k: 'sconto', t: 'Sconto %', w: 70, n: true, v: (r) => (r.sconto ? G.dec(r.sconto) : '0'), input: { ch: 'ddtf-cella', cls: 'modifica' } },
          { k: 'tot', t: 'Totale', w: 90, n: true, semi: true, v: (r) => num(G.totaleRiga(r)) }] })
        + '<div class="riga" style="margin-top:8px">' + btn(f.id ? 'Salva modifiche' : 'Emetti DDT', 'ddtf-emetti', { primario: true, stile: 'padding:7px 22px' }) + btn('Rimuovi riga', 'ddtf-rimuovi', { stile: 'padding:7px 14px;margin-left:10px' }) + btn('Annulla', 'ddtf-annulla', { stile: 'padding:7px 18px;margin-left:10px' })
        + '<span style="font-size:15px;font-weight:600;margin-left:18px">Totale: ' + num(tot) + ' €</span>' + msgSpan(f.msg, 'margin-left:14px') + '</div>';
    },
    risultati(f) { return f.risultati.map((a) => '<button class="lb-voce' + (f.artSel === a.id ? ' scelta' : '') + '" data-az="ddtf-ris" data-id="' + a.id + '">' + esc(displayArt(a)) + '</button>').join(''); },
  };
  function nuovoForm(titolo) { return { id: null, titolo, clienteId: null, clienteTesto: '', causale: 'Vendita', note: '', q: '', risultati: [], artSel: null, qtaTesto: '1', prezzoTesto: '', listinoCliente: 'A', listino: 'A', evidenziato: null, righe: [], msg: null }; }
  function clienteDdt(f, id, ridisegna) {
    f.clienteId = id || null;
    const c = id ? G.cli(id) : null;
    const prima = f.listinoCliente;
    f.listinoCliente = c ? c.listino || 'A' : 'A';
    f.listino = f.listinoCliente; f.evidenziato = f.listino;
    if (f.artSel) f.prezzoTesto = prezzo2(prezzoListino(G.art(f.artSel), f.listino));
    if (c && f.id && prima !== f.listinoCliente) {
      const daCambiare = f.righe.filter((r) => r.listino === prima);
      daCambiare.forEach((r) => { r.listino = f.listinoCliente; r.prezzo = prezzoListino(G.art(r.artId), r.listino); });
      if (daCambiare.length) f.msg = { colore: 'var(--testo-2)', testo: 'Questo cliente è in listino ' + f.listinoCliente + ': ' + (daCambiare.length === 1 ? 'la riga che era a listino ' + prima + ' ora è' : 'le ' + daCambiare.length + ' righe che erano a listino ' + prima + ' ora sono') + ' a listino ' + f.listinoCliente + '. I prezzi scritti a mano non cambiano.' };
    }
    if (ridisegna) G.ridisegna();
  }
  A['ddt-nuovo'] = () => { const u = dd(); u.form = nuovoForm('Nuovo documento di trasporto'); G.ridisegna(); };
  A['ddtf-annulla'] = () => { dd().form = null; G.ridisegna(); };
  G.IN['ddtf-note'] = (el) => { dd().form.note = el.value; };
  G.IN['ddtf-qta'] = (el) => { dd().form.qtaTesto = el.value; };
  G.IN['ddtf-prezzo'] = (el) => { dd().form.prezzoTesto = el.value; };
  G.IN['ddtf-cerca'] = (el) => { const f = dd().form; f.q = el.value; f.risultati = cercaArticoli(f.q); const b = document.getElementById('ddtf-ris'); if (b) b.innerHTML = G.VISTE.ddt.risultati(f); };
  A['ddtf-ris'] = (el) => { const f = dd().form; const a = G.art(Number(el.dataset.id)); f.artSel = a.id; f.listino = f.listino || f.listinoCliente; f.evidenziato = f.listino; f.prezzoTesto = prezzo2(prezzoListino(a, f.listino)); if (!f.qtaTesto.trim()) f.qtaTesto = '1'; G.ridisegna(); };
  A['ddtf-listino'] = (el) => { const f = dd().form; f.listino = el.dataset.l; f.evidenziato = f.listino; if (f.artSel) f.prezzoTesto = prezzo2(prezzoListino(G.art(f.artSel), f.listino)); G.ridisegna(); };
  A['ddtf-aggiungi'] = () => {
    const f = dd().form;
    if (!f.artSel) { f.msg = { colore: 'var(--rosso)', testo: 'Seleziona un articolo.' }; G.ridisegna(); return; }
    const q = G.leggiNum(f.qtaTesto);
    if (q <= 0) { f.msg = { colore: 'var(--rosso)', testo: 'Quantità non valida.' }; G.ridisegna(); return; }
    const a = G.art(f.artSel);
    f.righe.push({ k: G.nuovoId(), artId: a.id, codice: a.codice, descr: a.descr, um: a.um, qta: q, prezzo: G.leggiNum(f.prezzoTesto), sconto: 0, iva: a.iva, listino: f.listino });
    f.msg = null; f.q = ''; f.risultati = []; f.artSel = null; f.prezzoTesto = ''; f.qtaTesto = '1';
    G.ridisegna();
  };
  G.CH['ddtf-cella'] = (el) => { const f = dd().form; const r = f.righe.find((x) => String(x.k) === el.dataset.r); if (!r) return; const v = G.leggiNum(el.value); if (el.dataset.k === 'qta') r.qta = v; else if (el.dataset.k === 'prezzo') { r.prezzo = v; r.listino = '—'; } else r.sconto = v; G.ridisegna(); };
  G.CH['ddtf-listino-riga'] = (el) => { const f = dd().form; const r = f.righe.find((x) => String(x.k) === el.dataset.k); if (!r) return; r.listino = el.value; if (r.listino !== '—') r.prezzo = prezzoListino(G.art(r.artId), r.listino); G.ridisegna(); };
  A['ddtf-rimuovi'] = () => { const f = dd().form; const r = G.selezionato('ddtf-righe'); if (r) { f.righe = f.righe.filter((x) => x !== r); G.deseleziona('ddtf-righe'); G.ridisegna(); } };
  A['ddtf-emetti'] = () => {
    const S = G.S, u = dd(), f = u.form;
    if (!f.righe.length) { f.msg = { colore: 'var(--rosso)', testo: f.id ? 'Un DDT non può restare senza righe: se non serve più, chiudi e usa «Annulla DDT».' : 'Aggiungi almeno una riga.' }; G.ridisegna(); return; }
    const causale = (f.causale || '').trim() || 'Vendita';
    if (f.id) {
      const d = G.ddtDa(f.id);
      const nuovo = f.clienteId && f.clienteId !== d.clienteId ? f.clienteId : null;
      if (!f.clienteId && G.normalizza(f.clienteTesto).trim() !== G.normalizza((G.cli(d.clienteId) || {}).nome || '').trim() && !clientiLookup().some((c) => c.id === d.clienteId && c.testo === f.clienteTesto)) {
        f.msg = { colore: 'var(--rosso)', testo: 'Scegli il cliente dall\'elenco: scrivi una parte del nome (o la partita IVA) e cliccalo.' }; G.ridisegna(); return;
      }
      const salva = () => {
        scala(d.righe, -1); scala(f.righe, 1);
        d.righe = f.righe.map((r) => Object.assign({}, r)); d.causale = causale.toUpperCase(); d.note = f.note.trim(); d.totale = G.totaliRighe(d.righe).totale;
        const prima = (G.cli(d.clienteId) || {}).nome;
        if (nuovo) d.clienteId = nuovo;
        G.log('DDT', 'Modificato DDT n. ' + d.numero + ' · ' + d.righe.length + ' righe · € ' + G.z2(d.totale) + ' (magazzino riallineato)' + (nuovo ? ' · cliente da ' + prima + ' a ' + G.cli(nuovo).nome : ''), 'doc:' + d.id);
        G.salva(); u.form = null;
        u.msg = { colore: 'var(--verde)', testo: 'DDT modificato' + (nuovo ? ' · cliente: ' + clientiLookup().find((c) => c.id === nuovo).testo : '') + ' · magazzino riallineato · PDF aggiornato aperto' };
        G.ridisegna(); G.apriDocumento(G.docDaDdt(d));
      };
      if (nuovo) G.msgbox({ titolo: 'Cambio cliente del DDT', icona: 'domanda', testo: 'Cambio il cliente del DDT\n\nda:  ' + (G.cli(d.clienteId) || {}).nome + '\na:    ' + clientiLookup().find((c) => c.id === nuovo).testo + '\n\nNumero e data restano quelli; il PDF viene rifatto col cliente giusto.', pulsanti: [{ t: 'Sì', az: salva }, { t: 'No', annulla: true }] });
      else salva();
      return;
    }
    if (!f.clienteId) { f.msg = { colore: 'var(--rosso)', testo: 'Seleziona il cliente.' }; G.ridisegna(); return; }
    const righe = f.righe.map((r) => Object.assign({}, r));
    const d = { id: G.nuovoId(), numero: ++S.numeri.ddt, anno: Number(G.OGGI.slice(0, 4)), data: G.OGGI, clienteId: f.clienteId, causale: causale.toUpperCase(), righe, totale: G.totaliRighe(righe).totale, fatturaId: null, annullato: false, note: f.note.trim() };
    S.ddt.push(d); scala(righe, 1); G.indicizza();
    G.log('DDT', 'Emesso DDT n. ' + d.numero + ' · € ' + G.z2(d.totale), 'doc:' + d.id);
    G.salva(); u.form = null;
    u.msg = { colore: 'var(--testo-2)', testo: 'DDT n. ' + d.numero + ' emesso · magazzino scaricato · PDF aperto' };
    G.ridisegna(); G.apriDocumento(G.docDaDdt(d));
  };
  A['ddt-pdf'] = () => { const u = dd(); const d = G.selezionato('ddt'); if (!d) return; G.apriDocumento(G.docDaDdt(d)); u.msg = { colore: 'var(--testo-2)', testo: 'PDF aperto: DDT_' + d.numero + '_' + d.anno + '.pdf' }; G.ridisegna(); };
  const scarichiDi = (d) => G.S.registro.filter((r) => r.tipo === 'SCARICO' && r.ddtId === d.id);
  A['ddt-modifica'] = () => {
    const u = dd(), d = G.selezionato('ddt'); if (!d) return;
    const motivo = d.fatturaId ? 'Questo DDT è già stato fatturato. Per cambiarlo bisogna prima annullare la fattura che lo comprende.'
      : scarichiDi(d).length ? 'Questo DDT ha scarichi sul registro degli agrofarmaci, che è un registro obbligatorio: va annullato e rifatto, non modificato.' : null;
    if (motivo) { G.msgbox({ titolo: 'DDT non modificabile', testo: motivo, icona: 'avviso' }); return; }
    const c = G.cli(d.clienteId);
    const f = nuovoForm('Modifica DDT n. ' + ddtNumero(d) + ' · ' + (c ? c.nome : ''));
    Object.assign(f, { id: d.id, clienteId: d.clienteId, causale: d.causale ? d.causale.charAt(0) + d.causale.slice(1).toLowerCase() : 'Vendita', note: d.note || '', listinoCliente: c ? c.listino : 'A', listino: c ? c.listino : 'A', righe: d.righe.map((r) => Object.assign({ k: G.nuovoId() }, r)),
      msg: { colore: 'var(--testo-2)', testo: 'Numero e data restano quelli; il cliente, se è sbagliato, si corregge qui sopra. Il magazzino viene riallineato alle righe nuove.' } });
    if (G.COMBO['ddtf-cliente']) G.COMBO['ddtf-cliente'].valore = d.clienteId;
    u.form = f; G.ridisegna();
  };
  // annullamento come AnnullaDocumento.Esegui: verifica, elenco degli effetti, conferma con «No» proposto
  A['ddt-annulla'] = () => {
    const S = G.S, u = dd(), d = G.selezionato('ddt'); if (!d) return;
    if (d.fatturaId) { u.msg = { colore: 'var(--rosso)', testo: 'Questo DDT è già stato riepilogato in una fattura: prima annulla la fattura (se è l\'ultima emessa) oppure emetti una nota di credito.' }; G.ridisegna(); return; }
    const ultimo = d.anno === Number(G.OGGI.slice(0, 4)) && d.numero === S.numeri.ddt;
    const fito = scarichiDi(d).length;
    const effetti = ['le quantità di ' + d.righe.length + ' righe tornano in magazzino (ricarico)'];
    if (fito) effetti.push('vengono tolti ' + fito + ' scarichi dal registro agrofarmaci collegati a questo documento');
    effetti.push(ultimo ? 'il numero ' + ddtNumero(d) + ' torna libero: il prossimo DDT avrà di nuovo questo numero' : 'ATTENZIONE: non è l\'ultimo DDT emesso, il numero ' + ddtNumero(d) + ' resterà vuoto nella numerazione');
    const testo = 'Vuoi ANNULLARE il DDT n. ' + ddtNumero(d) + ' del ' + dataIt(d.data) + '\n' + (G.cli(d.clienteId) || {}).nome + ' · ' + num(d.totale) + ' €\n\nCosa succede:\n' + effetti.map((x) => '  • ' + x).join('\n') + '\n\nIl documento viene eliminato definitivamente (resta traccia nella Cronologia).';
    G.msgbox({ titolo: 'Conferma annullamento', testo, icona: 'avviso', predefinito: 1, pulsanti: [{ t: 'Sì', az: () => {
      scala(d.righe, -1);
      S.registro = S.registro.filter((r) => !(r.tipo === 'SCARICO' && r.ddtId === d.id));
      S.ddt = S.ddt.filter((x) => x !== d);
      if (ultimo) S.numeri.ddt--;
      G.log('Annullo', 'Annullato DDT n. ' + ddtNumero(d) + ' del ' + dataIt(d.data) + ' · ' + ((G.cli(d.clienteId) || {}).nome || '') + ' · € ' + G.z2(d.totale) + ' · ' + d.righe.length + ' righe · ' + effetti.join('; '), 'doc:' + d.id);
      G.indicizza(); G.deseleziona('ddt'); G.salva();
      u.msg = { colore: 'var(--verde)', testo: 'DDT n. ' + ddtNumero(d) + ' annullato: ' + (ultimo ? 'il numero ' + ddtNumero(d) + ' è di nuovo disponibile' : 'il numero ' + ddtNumero(d) + ' resta vuoto') + '.' };
      G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };

  // =====================================================================
  // INVENTARIO
  // =====================================================================
  const inv = () => G.ui('inventario', () => ({ msg: null }));
  const righeInventario = () => G.S.articoli.slice().sort((a, b) => a.descr.localeCompare(b.descr)).map((a) => {
    const c = G.S.inventario[a.id];
    return { id: a.id, codice: a.codice, descr: a.descr, cat: (G.cat(a.cat) || {}).codice || '', forn: (G.forn(a.forn) || {}).nome || '', um: a.um, giac: a.giac, conteggio: c === undefined ? null : c, diff: c === undefined ? null : r2(c - a.giac), costo: a.costo, valore: r2(a.giac * a.costo) };
  });
  function riepilogoInventario(righe) {
    const rett = righe.filter((r) => r.conteggio !== null && r.conteggio !== r.giac).length;
    const valore = somma(righe.filter((r) => r.giac > 0), (r) => r.valore);
    return { testo: righe.length + ' articoli · valore magazzino ' + num(valore) + ' € a prezzo di acquisto (esclusi ' + righe.filter((r) => r.giac <= 0).length + ' articoli con giacenza ≤ 0) · ' + rett + ' rettifiche da applicare', rett };
  }
  G.VISTE.inventario = {
    minW: 1250,
    nuova() { inv().msg = null; },
    render() {
      const u = inv();
      const righe = righeInventario();
      const r = riepilogoInventario(righe);
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga tesa" style="margin-bottom:12px"><div class="pila"><div class="h1">Inventario</div><span class="muto" id="inv-riep" style="margin-left:16px">' + esc(r.testo) + '</span></div>'
        + '<div class="riga tesa fisso">' + btn('Salva su file (CSV)', 'inv-csv', { stile: 'margin-right:8px' }) + btn('Stampa PDF', 'inv-pdf', { stile: 'margin-right:8px' }) + btn('Applica rettifiche', 'inv-applica', { primario: true, dis: !r.rett, id: 'inv-applica' }) + '</div></div>'
        + G.dg('inv', { classe: 'riempi', righe, chiave: (x) => x.id, colonne: [
          { k: 'codice', t: 'Codice', w: 100, mono: true }, { k: 'descr', t: 'Descrizione', w: '*' }, { k: 'cat', t: 'Categoria', w: 110 }, { k: 'forn', t: 'Fornitore', w: 150 },
          { k: 'um', t: 'UM', w: 55 }, { k: 'giac', t: 'Giacenza', w: 80, n: true, v: (x) => qta(x.giac), ordina: (x) => x.giac },
          { k: 'conteggio', t: 'Conteggio', w: 95, n: true, v: (x) => (x.conteggio === null ? '' : qta(x.conteggio)), input: { ch: 'inv-conta' }, ordina: (x) => (x.conteggio === null ? -1e9 : x.conteggio) },
          { k: 'diff', t: 'Differenza', w: 85, n: true, semi: true, v: (x) => (x.diff === null ? '' : qta(x.diff)), ordina: (x) => x.diff || 0 },
          { k: 'costo', t: 'Costo €', w: 80, n: true, v: (x) => num(x.costo), ordina: (x) => x.costo }, { k: 'valore', t: 'Valore €', w: 90, n: true, v: (x) => num(x.valore), ordina: (x) => x.valore }] })
        + '<div class="muto" style="margin-top:8px;font-size:12.5px;min-height:17px;color:' + (u.msg ? u.msg.colore : 'var(--testo-2)') + '">' + (u.msg ? esc(u.msg.testo) : '') + '</div></div>';
    },
  };
  G.CH['inv-conta'] = (el) => {
    const id = Number(el.dataset.r);
    if (el.value.trim() === '') delete G.S.inventario[id]; else G.S.inventario[id] = G.leggiNum(el.value);
    G.salva();
    const righe = righeInventario();
    const r = riepilogoInventario(righe);
    document.getElementById('inv-riep').textContent = r.testo;
    document.getElementById('inv-applica').disabled = !r.rett;
    const t = G.TAB.inv; if (t) { t.cfg.righe = righe; G.aggiornaDg('inv'); }
  };
  A['inv-applica'] = () => {
    const u = inv(), S = G.S;
    const rett = righeInventario().filter((x) => x.conteggio !== null && x.conteggio !== x.giac);
    if (!rett.length) return;
    G.msgbox({ titolo: 'Conferma rettifiche', icona: 'avviso', testo: 'Applicare ' + rett.length + ' rettifiche di giacenza?\nLe giacenze verranno aggiornate ai valori contati.', pulsanti: [{ t: 'Sì', az: () => {
      rett.forEach((x) => { const a = G.art(x.id); a.giac = x.conteggio; delete S.inventario[x.id]; G.log('Inventario', 'Rettifica giacenza articolo id ' + a.id + ': ' + G.z0(x.giac) + ' → ' + G.z0(x.conteggio), 'art:' + a.id); });
      G.salva(); u.msg = { colore: 'var(--verde)', testo: rett.length + ' rettifiche applicate.' }; G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };
  A['inv-csv'] = () => {
    const u = inv(), righe = righeInventario();
    const nome = 'Inventario_' + G.OGGI.replace(/-/g, '') + '.csv';
    G.scaricaFile(nome, G.csv(['Codice', 'Descrizione', 'Categoria', 'Fornitore', 'UM', 'Giacenza', 'Conteggio', 'Differenza', 'Costo €', 'Valore €'], righe.map((x) => [x.codice, x.descr, x.cat, x.forn, x.um, qta(x.giac), x.conteggio === null ? '' : qta(x.conteggio), x.diff === null ? '' : qta(x.diff), num(x.costo), num(x.valore)])));
    u.msg = { colore: 'var(--verde)', testo: 'Salvato: ' + nome }; G.ridisegna();
  };
  A['inv-pdf'] = () => {
    const u = inv(), righe = righeInventario().filter((x) => x.giac > 0);
    const corpo = righe.map((x) => '<tr><td>' + esc(x.codice) + '</td><td>' + esc(x.descr) + '</td><td>' + esc(x.um) + '</td><td class="n">' + qta(x.giac) + '</td><td class="n">' + num(x.costo) + '</td><td class="n">' + num(x.valore) + '</td></tr>').join('');
    G.finestra({ titolo: 'Inventario_' + G.OGGI.replace(/-/g, '') + '.pdf — Visualizzatore PDF', larghezza: 820, altezza: 700, bianca: true,
      corpo: '<div class="foglio-cornice"><div class="foglio"><div class="ditta">' + esc(G.S.negozio.ragione) + '</div><div class="tipo"><span>INVENTARIO DI MAGAZZINO</span><span>al ' + dataIt(G.OGGI) + '</span></div>'
        + '<table><thead><tr><th>Codice</th><th>Descrizione</th><th>UM</th><th class="n">Giacenza</th><th class="n">Costo €</th><th class="n">Valore €</th></tr></thead><tbody>' + corpo + '</tbody></table>'
        + '<div class="tot" style="margin-top:10px;width:260px;margin-left:auto"><div><span>Totale valore</span><span>' + num(somma(righe, (x) => x.valore)) + ' €</span></div></div></div></div>' });
    u.msg = { colore: 'var(--verde)', testo: 'PDF inventario aperto.' }; G.ridisegna();
  };

  // =====================================================================
  // REGISTRO ACQUISTI
  // =====================================================================
  const DEST = ['MERCE', 'STRUMENTALE', 'ATTREZZATURA', 'CANCELLERIA', 'CONSUMO', 'MANUTENZIONE', 'UTENZE', 'SPESE', 'AMMINISTRAT', 'ALTRO'];
  const REGIMI = ['ORDINARIA', 'REVERSE', 'ROTTAMI', 'EPAL', 'ALTRO'];
  const TIPO_ACQ = { FATTURA_ACQUISTO: 'Fattura', DDT_ACQUISTO: 'DDT', NOTA_CREDITO: 'Nota di credito', ORDINE: 'Ordine' };
  const aq = () => G.ui('acquisti', () => ({ msg: null, tipo: '', ordini: false, daClass: false, dest: '', regime: '', righeDi: null, mod: null }));
  const statoPagAcq = (d) => { const s = G.S.scadenze.find((x) => x.acquistoId === d.id); return s && s.stato === 'PAGATA' ? 'PAGATO' : 'APERTO'; };
  G.VISTE.acquisti = {
    nuova() { const u = aq(); u.msg = null; u.righeDi = null; u.mod = null; G.deseleziona('acq'); },
    render() {
      const S = G.S, u = aq();
      const rows = S.acquisti.filter((d) => (u.tipo ? d.tipo === u.tipo : (u.ordini || d.tipo !== 'ORDINE')) && (!u.daClass || d.daControllare))
        .slice().sort((a, b) => (b.data.localeCompare(a.data)) || (b.id - a.id));
      const sel = G.selezionato('acq');
      const daClass = rows.filter((d) => d.daControllare).length;
      const cosa = u.tipo === 'FATTURA_ACQUISTO' ? (rows.length === 1 ? 'fattura' : 'fatture') : u.tipo === 'DDT_ACQUISTO' ? 'DDT' : u.tipo === 'NOTA_CREDITO' ? (rows.length === 1 ? 'nota di credito' : 'note di credito') : (rows.length === 1 ? 'documento' : 'documenti');
      const titolo = 'Registro acquisti (' + rows.length + ' ' + cosa + (daClass ? ', ' + daClass + ' da classificare' : '') + ')';
      const righeDoc = u.righeDi ? S.acquisti.find((d) => d.id === u.righeDi) : null;
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga tesa" style="margin-bottom:12px"><div class="h1 spinta" style="align-self:flex-start">Registro acquisti</div><div class="riga tesa fisso">' + btn('Importa fatture XML (anche .p7m)…', 'acq-importa', { primario: true, title: 'Importa le fatture elettroniche di acquisto: fornitore, righe, scadenze di pagamento e PDF allegato in automatico' }) + '</div></div>'
        + (u.msg ? '<div style="font-size:12px;margin-bottom:8px;color:' + u.msg.colore + '">' + esc(u.msg.testo) + '</div>' : '')
        + '<div class="col riempi" style="position:relative"><div class="card col riempi" style="padding:0">'
        + '<div style="margin:8px 12px"><div class="avvolgi" style="align-items:center"><span class="muto" style="margin-right:24px">' + esc(titolo) + '</span><span class="muto" style="margin-right:6px">Mostra</span>'
        + '<div style="width:140px;margin-right:16px" title="Tutti i documenti, oppure solo le fatture o solo i DDT dei fornitori">' + G.sel('data-ch="acq-tipo"', [['', 'Tutti'], ['FATTURA_ACQUISTO', 'Solo fatture'], ['DDT_ACQUISTO', 'Solo DDT'], ['NOTA_CREDITO', 'Note di credito']], u.tipo) + '</div>'
        + '<span style="margin-right:14px" title="Mostra anche gli ordini a fornitore, che non sono documenti contabili e di norma restano fuori dal registro">' + G.chk('data-ch="acq-ordini"' + (u.tipo ? ' disabled' : ''), 'anche gli ordini', u.ordini, u.tipo ? '' : '') + '</span>' + G.chk('data-ch="acq-daclass"', 'solo da classificare', u.daClass) + '</div>'
        + '<div class="avvolgi" style="justify-content:flex-end;margin-top:8px;align-items:center"><span class="muto" style="margin-right:4px">Destinazione</span><div style="width:130px;margin-right:8px">' + G.sel('id="acq-dest"', [['', '']].concat(DEST.map((x) => [x, x])), u.dest) + '</div>'
        + '<span class="muto" style="margin-right:4px">Regime</span><div style="width:110px;margin-right:8px">' + G.sel('id="acq-regime"', [['', '']].concat(REGIMI.map((x) => [x, x])), u.regime) + '</div>'
        + btn('Classifica', 'acq-classifica', { dis: !sel, stile: 'margin-right:20px', title: 'Salva destinazione e regime del documento selezionato (tolto dai \'da controllare\')' })
        + btn('Allegati', 'acq-allegati', { dis: !sel, stile: 'margin-right:8px', title: 'Apre il PDF/XML allegato alla fattura selezionata' }) + btn('Vedi righe', 'acq-righe', { dis: !sel, stile: 'margin-right:8px', title: 'Mostra le righe del documento selezionato (anche con doppio clic)' })
        + btn('Modifica documento', 'acq-modifica', { dis: !sel, stile: 'margin-right:8px', title: 'Corregge il documento selezionato: numero, data, fornitore, tipo e righe. Magazzino e scadenza si riallineano da soli.' }) + btn('Elimina documento', 'acq-elimina', { dis: !sel, title: 'Elimina il documento sbagliato: se era un DDT il carico viene stornato dal magazzino' }) + '</div></div>'
        + G.dg('acq', { senzaBordo: true, classe: 'riempi', righe: rows, chiave: (d) => d.id, classeRiga: (d) => (d.daControllare ? 'dacontr' : ''),
          onSel: (d) => { u.dest = d.destinazione || ''; u.regime = d.regime || ''; G.ridisegna(); }, onDoppio: (d) => { G.scegliRiga('acq', d.id); u.righeDi = d.id; G.ridisegna(); },
          colonne: [
            { k: 'prot', t: 'Prot.', w: 62, v: (d) => (d.prot || ''), ordina: (d) => d.prot || 0 }, { k: 'tipo', t: 'Tipo', w: 96, v: (d) => TIPO_ACQ[d.tipo] || d.tipo },
            { k: 'numero', t: 'N. doc.', w: 86 }, { k: 'data', t: 'Data', w: 96, v: (d) => dataIt(d.data), ordina: (d) => d.data },
            { k: 'forn', t: 'Fornitore', w: '*', v: (d) => (G.forn(d.fornitoreId) || {}).nome || '' }, { k: 'tot', t: 'Totale €', w: 94, n: true, v: (d) => num(d.totale), ordina: (d) => d.totale },
            { k: 'dest', t: 'Destinazione', w: 106, v: (d) => d.destinazione || '' },
            { k: 'regime', t: 'Regime', w: 86, v: (d) => d.regime || '', f: (d) => (['REVERSE', 'ROTTAMI', 'EPAL'].includes(d.regime) ? '<span style="color:#C0392B;font-weight:600">' + esc(d.regime) + '</span>' : esc(d.regime || '')) },
            { k: 'pag', t: 'Pagamento', w: 104, v: statoPagAcq }, { k: 'dc', t: 'Da contr.', w: 84, c: true, v: (d) => (d.daControllare ? 'Sì' : ''), f: (d) => '<label class="chk"><input type="checkbox" disabled' + (d.daControllare ? ' checked' : '') + '></label>' }] })
        + '</div>' + (u.mod ? '<div class="card col" style="position:absolute;inset:0;z-index:5">' + this.modifica(u) + '</div>' : '') + '</div>'
        + (righeDoc ? '<div class="card" style="margin-top:10px"><div class="riga" style="margin-bottom:6px"><div class="h2 spinta" style="font-size:14px">Righe del documento ' + esc(righeDoc.numero || 'id ' + righeDoc.id) + ' — ' + esc((G.forn(righeDoc.fornitoreId) || {}).nome) + ' · ' + righeDoc.righe.length + ' righe · totale ' + num(righeDoc.totale) + ' €</div>' + btn('Chiudi', 'acq-righe-chiudi', { stile: 'padding:4px 12px' }) + '</div>'
          + G.dg('acq-righe', { senzaBordo: true, stile: 'max-height:200px', righe: righeDoc.righe.map((r, i) => Object.assign({ k: i }, r)), chiave: (r) => r.k, colonne: [
            { k: 'codice', t: 'Codice', w: 100, mono: true }, { k: 'descr', t: 'Descrizione', w: '*' }, { k: 'qta', t: 'Q.tà', w: 70, n: true, v: (r) => qta(r.qta) },
            { k: 'costo', t: 'Costo €', w: 86, n: true, v: (r) => num(r.costo) }, { k: 'iva', t: 'IVA %', w: 60, n: true }, { k: 'tot', t: 'Totale €', w: 94, n: true, v: (r) => num(r.qta * r.costo) }] }) + '</div>' : '')
        + '</div>';
    },
    modifica(u) {
      const m = u.mod;
      const art = m.artSel ? G.art(m.artSel) : null;
      const imp = somma(m.righe, (r) => r.qta * r.costo), iva = somma(m.righe, (r) => r.qta * r.costo * r.iva / 100);
      return '<div class="riga" style="margin-bottom:10px"><div class="h2 spinta" style="font-size:17px">' + esc(m.titolo) + '</div>' + btn('Chiudi senza salvare', 'acqm-chiudi', { stile: 'padding:4px 12px' }) + '</div>'
        + '<div class="avvolgi" style="margin-bottom:6px">'
        + '<div style="width:150px;margin:0 14px 8px 0"><div class="muto">Tipo</div><div style="margin-top:3px">' + G.sel('data-ch="acqm-tipo"', [['DDT_ACQUISTO', 'DDT di carico'], ['FATTURA_ACQUISTO', 'Fattura'], ['NOTA_CREDITO', 'Nota di credito'], ['ORDINE', 'Ordine']], m.tipo) + '</div></div>'
        + '<div style="width:150px;margin:0 14px 8px 0"><div class="muto">N. documento fornitore *</div>' + tb('acqm-num', m.numero, ' style="margin-top:3px" data-in="acqm-num"') + '</div>'
        + '<div style="width:130px;margin:0 14px 8px 0"><div class="muto">Data</div><div style="margin-top:3px">' + G.dp('acqm-data', m.data, { onCambia: (v) => { m.data = v || m.data; } }) + '</div></div>'
        + '<div style="width:320px;margin:0 14px 8px 0"><div class="muto">Fornitore * (scrivi per cercarlo)</div><div style="margin-top:3px">' + G.cmb('acqm-forn', { voci: fornLookup(), valore: m.fornitoreId, onScegli: (v) => { m.fornitoreId = v; } }) + '</div></div></div>'
        + '<div class="muto" style="margin-bottom:10px">' + esc(m.info) + '</div>'
        + '<div style="background:#F4F6F8;border-radius:8px;padding:10px;margin-bottom:8px"><div class="muto" style="margin-bottom:4px">Aggiungi un articolo dimenticato</div>'
        + tb('acqm-cerca', m.q, ' data-in="acqm-cerca" title="Cerca per descrizione, codice o barcode"') + '<div class="lb" id="acqm-ris" style="height:70px;min-height:70px;margin:6px 0">' + this.risMod(m) + '</div>'
        + '<div class="avvolgi" style="align-items:center"><span style="font-weight:600;margin-right:12px;max-width:380px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (art ? esc(displayArt(art)) : '—') + '</span>'
        + '<span class="muto" style="margin-right:4px">Q.tà</span>' + tb('acqm-qta', m.qtaTesto, ' style="width:64px;margin-right:10px" data-in="acqm-qta" inputmode="decimal"') + '<span class="muto" style="margin-right:4px">Costo €</span>' + tb('acqm-costo', m.costoTesto, ' style="width:80px;margin-right:10px" data-in="acqm-costo" inputmode="decimal"') + btn('Aggiungi riga', 'acqm-aggiungi', { stile: 'padding:5px 12px' }) + '</div></div>'
        + G.dg('acqm-righe', { classe: 'riempi', righe: m.righe, chiave: (r) => r.k, colonne: [
          { k: 'codice', t: 'Codice', w: 100, mono: true }, { k: 'descr', t: 'Descrizione', w: '*', min: 200, input: { ch: 'acqm-cella', cls: 'modifica sx', modo: 'text' } },
          { k: 'qta', t: 'Q.tà', w: 70, n: true, v: (r) => qta(r.qta), input: { ch: 'acqm-cella', cls: 'modifica' } }, { k: 'costo', t: 'Costo €', w: 90, n: true, v: (r) => String(r.costo).replace('.', ','), input: { ch: 'acqm-cella', cls: 'modifica' } },
          { k: 'iva', t: 'IVA', w: 120, f: (r) => '<select data-ch="acqm-iva" data-k="' + r.k + '">' + G.S.aliquote.slice().sort((a, b) => b.aliquota - a.aliquota).map((x) => '<option value="' + x.aliquota + '"' + (x.aliquota === r.iva ? ' selected' : '') + '>' + x.codice + ' (' + x.aliquota.toFixed(2) + '%)</option>').join('') + '</select>' },
          { k: 'tot', t: 'Totale €', w: 100, n: true, v: (r) => num(r.qta * r.costo) }] })
        + '<div class="riga" style="margin-top:8px">' + btn('Salva modifiche', 'acqm-salva', { primario: true, stile: 'padding:7px 22px' }) + btn('Rimuovi riga', 'acqm-rimuovi', { stile: 'padding:7px 14px;margin-left:10px' })
        + '<span style="font-size:15px;font-weight:600;margin-left:18px">Imponibile ' + num(imp) + ' · IVA ' + num(iva) + ' · Totale ' + num(imp + iva) + ' €</span>' + msgSpan(m.msg, 'margin-left:14px;max-width:520px') + '</div>';
    },
    risMod(m) { return m.risultati.map((a) => '<button class="lb-voce' + (m.artSel === a.id ? ' scelta' : '') + '" data-az="acqm-ris" data-id="' + a.id + '">' + esc(displayArt(a)) + '</button>').join(''); },
  };
  G.CH['acq-tipo'] = (el) => { const u = aq(); u.tipo = el.value; G.deseleziona('acq'); G.ridisegna(); };
  G.CH['acq-ordini'] = (el) => { aq().ordini = el.checked; G.ridisegna(); };
  G.CH['acq-daclass'] = (el) => { aq().daClass = el.checked; G.ridisegna(); };
  A['acq-righe'] = () => { const u = aq(); const d = G.selezionato('acq'); if (d) { u.righeDi = d.id; G.ridisegna(); } };
  A['acq-righe-chiudi'] = () => { aq().righeDi = null; G.ridisegna(); };
  A['acq-classifica'] = () => {
    const u = aq(), d = G.selezionato('acq'); if (!d) return;
    const dest = val('acq-dest') || 'MERCE', reg = val('acq-regime') || 'ORDINARIA';
    const fai = () => { d.destinazione = dest; d.regime = reg; d.daControllare = false; G.salva(); u.msg = { colore: 'var(--verde)', testo: 'Documento ' + d.numero + ' classificato: ' + dest + ', regime ' + reg + '.' }; G.ridisegna(); };
    if (dest !== 'MERCE' && d.destinazione === 'MERCE') G.msgbox({ titolo: 'Classificazione acquisto', icona: 'domanda', testo: 'Classifichi "' + d.numero + '" di ' + (G.forn(d.fornitoreId) || {}).nome + ' come ' + dest + ': i beni a uso interno NON movimentano il magazzino merci.\n\nConfermi?', pulsanti: [{ t: 'Sì', az: fai }, { t: 'No', annulla: true }] });
    else fai();
  };
  A['acq-allegati'] = () => {
    const u = aq(), d = G.selezionato('acq'); if (!d) return;
    if (!d.allegati) { u.msg = { colore: 'var(--rosso)', testo: 'Nessun allegato per questo documento (i PDF arrivano con l\'import XML).' }; G.ridisegna(); return; }
    const f = G.forn(d.fornitoreId) || {};
    const righe = d.righe.map((r) => '<tr><td>' + esc(r.descr) + '</td><td class="n">' + qta(r.qta) + '</td><td class="n">' + num(r.costo) + '</td><td class="n">' + r.iva + '%</td><td class="n">' + num(r.qta * r.costo) + '</td></tr>').join('');
    G.finestra({ titolo: 'Fattura_' + String(d.numero).replace(/\W+/g, '_') + '.pdf — Visualizzatore PDF', larghezza: 820, altezza: 700, bianca: true,
      corpo: '<div class="foglio-cornice"><div class="foglio"><div class="intesta"><div><div class="ditta">' + esc(f.nome) + '</div><div>' + esc(f.indirizzo) + ' - ' + esc(f.cap) + ' ' + esc(f.citta) + ' (' + esc(f.prov) + ')</div><div>P.IVA ' + esc(f.piva) + '</div></div>'
        + '<div class="box"><div class="et">Spett.le</div><b>' + esc(G.S.negozio.ragione) + '</b><br>' + esc(G.S.negozio.indirizzo) + '<br>' + esc(G.S.negozio.cap + ' ' + G.S.negozio.citta) + '<br>P.IVA ' + esc(G.S.negozio.piva) + '</div></div>'
        + '<div class="tipo"><span>FATTURA</span><span>N. ' + esc(d.numero) + '</span><span>del ' + dataIt(d.data) + '</span></div><table><thead><tr><th>Descrizione</th><th class="n">Q.tà</th><th class="n">Prezzo</th><th class="n">IVA</th><th class="n">Importo</th></tr></thead><tbody>' + righe + '</tbody></table>'
        + '<div class="piede"><div></div><div class="tot"><div><span>Imponibile</span><span>' + num(d.imponibile) + '</span></div><div><span>IVA</span><span>' + num(d.iva) + '</span></div><div><span>Totale documento €</span><span>' + num(d.totale) + '</span></div></div></div></div></div>' });
    u.msg = { colore: 'var(--verde)', testo: 'Aperti 1 allegati di 1.' }; G.ridisegna();
  };
  A['acq-elimina'] = () => {
    const S = G.S, u = aq(), d = G.selezionato('acq'); if (!d) return;
    const f = (G.forn(d.fornitoreId) || {}).nome;
    const extra = d.tipo === 'DDT_ACQUISTO' ? '\nEra un DDT di carico: la merce verrà STORNATA dal magazzino.' : d.tipo === 'FATTURA_ACQUISTO' ? '\nVerrà eliminata anche la scadenza di pagamento collegata.' : '';
    G.msgbox({ titolo: 'Conferma eliminazione', icona: 'avviso', testo: 'Sei sicuro di voler eliminare il documento ' + (d.numero || 'id ' + d.id) + ' di ' + f + ' (' + num(d.totale) + ' €)?' + extra, pulsanti: [{ t: 'Sì', az: () => {
      if (d.tipo === 'DDT_ACQUISTO') d.righe.forEach((r) => { const a = G.art(r.artId); if (a) a.giac = r2(a.giac - r.qta); });
      S.scadenze = S.scadenze.filter((s) => s.acquistoId !== d.id);
      S.acquisti = S.acquisti.filter((x) => x !== d);
      G.log('Acquisto', 'Eliminato documento di acquisto ' + (d.numero || 'id ' + d.id) + ' (' + d.tipo + ')' + (d.tipo === 'DDT_ACQUISTO' ? ' · carico stornato dal magazzino' : ''), 'acq:' + d.id);
      G.deseleziona('acq'); u.righeDi = null; G.salva();
      u.msg = { colore: 'var(--verde)', testo: 'Documento eliminato' + (d.tipo === 'DDT_ACQUISTO' ? ' · carico stornato dal magazzino' : '') + '.' }; G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };
  A['acq-modifica'] = () => {
    const u = aq(), d = G.selezionato('acq'); if (!d) return;
    const carica = d.tipo === 'DDT_ACQUISTO';
    u.mod = { id: d.id, titolo: 'Modifica documento ' + (d.numero || 'id ' + d.id) + ' · ' + (G.forn(d.fornitoreId) || {}).nome, tipo: d.tipo, numero: d.numero, data: d.data, fornitoreId: d.fornitoreId,
      info: carica ? 'Questo documento ha caricato merce: salvando, il magazzino si riallinea alle quantità nuove. Il costo in anagrafica prende quello del documento (anche per gli articoli aggiunti), a meno che nel frattempo non sia arrivato un acquisto più recente.'
        : 'Questo documento non ha caricato merce (per esempio una fattura importata da XML): cambiano righe e importi, il magazzino no.',
      carica, righe: d.righe.map((r) => Object.assign({ k: G.nuovoId() }, r)), q: '', risultati: [], artSel: null, qtaTesto: '1', costoTesto: '', msg: null };
    if (G.COMBO['acqm-forn']) G.COMBO['acqm-forn'].valore = d.fornitoreId;
    G.ridisegna();
  };
  A['acqm-chiudi'] = () => { aq().mod = null; G.ridisegna(); };
  G.CH['acqm-tipo'] = (el) => { aq().mod.tipo = el.value; };
  G.IN['acqm-num'] = (el) => { aq().mod.numero = el.value; };
  G.IN['acqm-qta'] = (el) => { aq().mod.qtaTesto = el.value; };
  G.IN['acqm-costo'] = (el) => { aq().mod.costoTesto = el.value; };
  G.IN['acqm-cerca'] = (el) => { const m = aq().mod; m.q = el.value; m.risultati = cercaArticoli(m.q); const b = document.getElementById('acqm-ris'); if (b) b.innerHTML = G.VISTE.acquisti.risMod(m); };
  A['acqm-ris'] = (el) => { const m = aq().mod; const a = G.art(Number(el.dataset.id)); m.artSel = a.id; m.costoTesto = String(a.costo).replace('.', ','); G.ridisegna(); };
  A['acqm-aggiungi'] = () => {
    const m = aq().mod;
    if (!m.artSel) { m.msg = { colore: 'var(--rosso)', testo: 'Scegli prima l\'articolo.' }; G.ridisegna(); return; }
    const q = G.leggiNum(m.qtaTesto); if (q <= 0) { m.msg = { colore: 'var(--rosso)', testo: 'Quantità non valida.' }; G.ridisegna(); return; }
    const a = G.art(m.artSel);
    m.righe.push({ k: G.nuovoId(), artId: a.id, codice: a.codice, descr: a.descr, qta: q, costo: G.leggiNum(m.costoTesto) || a.costo, iva: a.iva });
    m.q = ''; m.risultati = []; m.artSel = null; m.costoTesto = ''; m.qtaTesto = '1'; m.msg = null; G.ridisegna();
  };
  G.CH['acqm-cella'] = (el) => { const m = aq().mod; const r = m.righe.find((x) => String(x.k) === el.dataset.r); if (!r) return; if (el.dataset.k === 'descr') r.descr = el.value; else if (el.dataset.k === 'qta') r.qta = G.leggiNum(el.value); else r.costo = G.leggiNum(el.value); G.ridisegna(); };
  G.CH['acqm-iva'] = (el) => { const m = aq().mod; const r = m.righe.find((x) => String(x.k) === el.dataset.k); if (r) { r.iva = Number(el.value); G.ridisegna(); } };
  A['acqm-rimuovi'] = () => { const m = aq().mod; const r = G.selezionato('acqm-righe'); if (r) { m.righe = m.righe.filter((x) => x !== r); G.deseleziona('acqm-righe'); G.ridisegna(); } };
  A['acqm-salva'] = () => {
    const S = G.S, u = aq(), m = u.mod;
    const fornId = G.valoreCombo('acqm-forn') || m.fornitoreId;
    if (!m.numero.trim()) { m.msg = { colore: 'var(--rosso)', testo: 'Il numero del documento è obbligatorio.' }; G.ridisegna(); return; }
    const d = S.acquisti.find((x) => x.id === m.id);
    let avviso = '';
    if (m.tipo === 'FATTURA_ACQUISTO' && d.tipo !== 'FATTURA_ACQUISTO') avviso = '\n\nDiventa una fattura: nello Scadenzario nascerà la partita da pagare.';
    else if (m.tipo !== 'FATTURA_ACQUISTO' && d.tipo === 'FATTURA_ACQUISTO') avviso = '\n\nNon è più una fattura: la sua partita nello Scadenzario verrà tolta.';
    G.msgbox({ titolo: 'Modifica documento di acquisto', icona: 'domanda', testo: 'Salvare le modifiche al documento ' + m.numero.trim() + '?' + (m.carica ? '\n\nIl magazzino si riallinea alle quantità nuove.' : '') + avviso, pulsanti: [{ t: 'Sì', az: () => {
      let costi = 0;
      const chiaveRighe = (rr) => JSON.stringify(rr.map((r) => [r.artId, r.codice, r.qta, r.costo, r.iva]));
      const righeCambiate = chiaveRighe(d.righe) !== chiaveRighe(m.righe);
      if (m.carica) { d.righe.forEach((r) => { const a = G.art(r.artId); if (a) a.giac = r2(a.giac - r.qta); }); m.righe.forEach((r) => { const a = G.art(r.artId); if (a) { a.giac = r2(a.giac + r.qta); if (a.costo !== r.costo) { a.costo = r.costo; costi++; } } }); }
      d.tipo = m.tipo; d.numero = m.numero.trim(); d.data = m.data; d.fornitoreId = fornId;
      d.righe = m.righe.map((r) => ({ artId: r.artId, codice: r.codice, descr: r.descr, qta: r.qta, costo: r.costo, iva: r.iva }));
      d.imponibile = r2(somma(d.righe, (r) => r.qta * r.costo)); d.iva = r2(somma(d.righe, (r) => r.qta * r.costo * r.iva / 100)); d.totale = r2(d.imponibile + d.iva);
      const s = S.scadenze.find((x) => x.acquistoId === d.id);
      if (d.tipo === 'FATTURA_ACQUISTO' && !s) S.scadenze.push({ id: G.nuovoId(), tipo: 'PASSIVA', soggettoId: fornId, acquistoId: d.id, documento: d.numero, dataDoc: d.data, scadenza: d.data, importo: d.totale, pagato: 0, stato: 'APERTA', metodo: (G.forn(fornId) || {}).cond || '', conto: '', note: '', incassi: [] });
      else if (d.tipo !== 'FATTURA_ACQUISTO' && s) S.scadenze = S.scadenze.filter((x) => x !== s);
      else if (s) { s.importo = d.totale; s.documento = d.numero; s.soggettoId = fornId; }
      G.log('Acquisto', 'Modificato documento di acquisto ' + d.numero + ' · ' + d.righe.length + ' righe · € ' + G.z2(d.totale) + (!righeCambiate ? ' · solo testata (righe e totali invariati)' : '') + (righeCambiate && m.carica ? ' · magazzino riallineato' : '') + (costi > 0 ? ' · costo corretto su ' + costi + ' articoli' : ''), 'acq:' + d.id);
      G.salva(); u.mod = null;
      u.msg = { colore: 'var(--verde)', testo: 'Documento ' + d.numero + ' modificato ✓' + (costi ? ' · costo aggiornato in anagrafica su ' + costi + ' articol' + (costi === 1 ? 'o' : 'i') : '') };
      G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };
  // importazione delle fatture elettroniche di acquisto (anche firmate .p7m), come Db.ImportaFatturaAcquistoXml
  A['acq-importa'] = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.accept = '.xml,.p7m,application/xml,text/xml';
    inp.onchange = async () => {
      const S = G.S, u = aq();
      let ok = 0; const righe = [], errori = [];
      for (const file of inp.files) {
        try { righe.push('✓ ' + importaXml(await file.arrayBuffer())); ok++; }
        catch (e) { errori.push('✗ ' + file.name + ': ' + e.message); }
      }
      G.salva();
      u.msg = { colore: errori.length ? 'var(--rosso)' : 'var(--verde)', testo: 'Import completato: ' + ok + ' fatture importate, ' + errori.length + ' scartate.' };
      G.ridisegna();
      G.msgbox({ titolo: 'Import fatture di acquisto', icona: errori.length ? 'avviso' : 'info', testo: righe.concat(errori).join('\n') + (ok ? '\n\nLe fatture importate sono evidenziate come DA CLASSIFICARE: scegli destinazione (merce/uso interno) e regime, poi premi Classifica.' : '') });
      void S;
    };
    inp.click();
  };
  function importaXml(buf) {
    const S = G.S;
    const testo = new TextDecoder('utf-8').decode(new Uint8Array(buf));
    const m = testo.match(/<\?xml[\s\S]*?<\/[\w.]*:?FatturaElettronica\s*>/) || testo.match(/<[\w.]*:?FatturaElettronica[\s>][\s\S]*?<\/[\w.]*:?FatturaElettronica\s*>/);
    if (!m) throw new Error('Nel file non è stato trovato un XML FatturaPA valido.');
    const doc = new DOMParser().parseFromString(m[0], 'application/xml');
    const el = (n, dove) => (dove || doc).getElementsByTagNameNS('*', n)[0] || (dove || doc).getElementsByTagName(n)[0] || null;
    const v = (n, dove) => { const e = el(n, dove); return e ? e.textContent.trim() : ''; };
    const header = el('FatturaElettronicaHeader'), body = el('FatturaElettronicaBody');
    if (!header) throw new Error('XML non valido: manca l\'header.');
    if (!body) throw new Error('XML non valido: manca il body.');
    const ced = el('CedentePrestatore', header); if (!ced) throw new Error('XML non valido: manca il cedente.');
    const dg = el('DatiGeneraliDocumento', body); if (!dg) throw new Error('XML non valido: mancano i dati documento.');
    const piva = v('IdCodice', el('IdFiscaleIVA', ced) || ced);
    const nome = v('Denominazione', ced) || (v('Cognome', ced) + ' ' + v('Nome', ced)).trim();
    const numero = v('Numero', dg), data = v('Data', dg).slice(0, 10), totale = Number(v('ImportoTotaleDocumento', dg) || 0);
    const tipoDoc = v('TipoDocumento', dg);
    if (S.acquisti.some((d) => d.numero === numero && d.data === data && (G.forn(d.fornitoreId) || {}).piva === piva)) throw new Error('La fattura ' + numero + ' del ' + dataIt(data) + ' di ' + nome + ' risulta GIÀ importata.');
    let f = S.fornitori.find((x) => x.piva && x.piva === piva), creato = false;
    if (!f) {
      const sede = el('Sede', ced);
      f = { id: G.nuovoId(), codice: 'F' + String(S.fornitori.length + 1).padStart(3, '0'), nome: nome.toUpperCase(), referente: '', indirizzo: v('Indirizzo', sede), cap: v('CAP', sede), citta: v('Comune', sede), prov: v('Provincia', sede), cat: [], piva, tel: '', email: '', pec: '', iban: '', cond: '' };
      S.fornitori.push(f); creato = true;
    }
    const linee = Array.from(body.getElementsByTagNameNS('*', 'DettaglioLinee'));
    const righe = linee.map((l) => ({ artId: null, codice: v('CodiceValore', l), descr: v('Descrizione', l), qta: Number(v('Quantita', l) || 1), costo: Number(v('PrezzoUnitario', l) || 0), iva: Number(v('AliquotaIVA', l) || 0) }));
    const nature = Array.from(body.getElementsByTagNameNS('*', 'DatiRiepilogo')).map((r) => v('Natura', r)).filter(Boolean);
    let regime = 'ORDINARIA';
    if (nature.some((n) => n.startsWith('N6'))) { const t = G.normalizza(righe.map((r) => r.descr).join(' ')); regime = t.includes('rottam') ? 'ROTTAMI' : (t.includes('pallet') || t.includes('epal') || t.includes('bancal')) ? 'EPAL' : 'REVERSE'; }
    const imp = r2(somma(righe, (r) => r.qta * r.costo));
    const d = { id: G.nuovoId(), prot: ++S.numeri.protocollo, tipo: tipoDoc === 'TD04' ? 'NOTA_CREDITO' : 'FATTURA_ACQUISTO', numero, data, fornitoreId: f.id, imponibile: imp, iva: r2(totale - imp), totale, destinazione: 'MERCE', regime, pagamento: '', daControllare: true, ordine: false, righe, allegati: body.getElementsByTagNameNS('*', 'Allegati').length, ricevutaIl: G.OGGI };
    S.acquisti.push(d);
    const pag = Array.from(body.getElementsByTagNameNS('*', 'DettaglioPagamento'));
    let nScad = 0;
    if (d.tipo === 'FATTURA_ACQUISTO') {
      (pag.length ? pag : [null]).forEach((p) => { S.scadenze.push({ id: G.nuovoId(), tipo: 'PASSIVA', soggettoId: f.id, acquistoId: d.id, documento: numero, dataDoc: data, scadenza: (p && v('DataScadenzaPagamento', p)) || data, importo: p ? Number(v('ImportoPagamento', p) || totale) : totale, pagato: 0, stato: 'APERTA', metodo: '', conto: '', note: '', incassi: [] }); nScad++; });
    }
    G.indicizza();
    G.log('Acquisti', 'Importata fattura di acquisto ' + numero + ' di ' + f.nome + ' · ' + num(totale) + ' € (prot. ' + d.prot + ', regime ' + regime + ')', 'acq:' + d.id);
    return f.nome + ' · n. ' + numero + ' · ' + num(totale) + ' € · regime ' + regime + (nScad ? ' · ' + nScad + ' scadenze' : '') + (d.allegati ? ' · ' + d.allegati + ' allegati' : '') + (creato ? ' · NUOVO fornitore creato' : '');
  }

  // =====================================================================
  // REGISTRO AGROFARMACI
  // =====================================================================
  const rg = () => G.ui('registro', () => ({ msg: null, artId: null, qtaTesto: '1', data: G.OGGI, nReg: '', produttore: '', tipoDoc: 'DDT', doc: '', dataDoc: G.OGGI, lotto: '', cercaC: '', cercaS: '' }));
  const fitoLookup = () => G.S.articoli.filter((a) => a.fito).sort((a, b) => a.descr.localeCompare(b.descr)).map((a) => ({ id: a.id, testo: a.codice + ' — ' + a.descr }));
  function movimenti(tipo) {
    return G.S.registro.filter((r) => r.tipo === tipo).map((r) => {
      const a = G.art(r.artId) || { codice: '', descr: '(articolo eliminato)' };
      const p = r.patentinoId ? G.patentino(r.patentinoId) : null;
      return { id: r.id, r, data: r.data, articolo: a.descr, codice: a.codice, nReg: r.nReg || '', produttore: r.produttore || '', docRif: r.doc || '', dataDoc: r.dataDoc, qta: r.qta,
        patNome: p ? p.nominativo : '', patNumero: p ? p.numero : '', patScaduto: p ? p.validoA < r.data : false, cliente: r.clienteId ? (G.cli(r.clienteId) || {}).nome || '' : '', nma: r.nma || '' };
    }).sort((a, b) => b.data.localeCompare(a.data));
  }
  const riepilogoMov = (righe, ricerca, cosa) => (righe.length === 0 ? (ricerca ? 'nessun risultato' : 'nessun movimento') : (ricerca ? righe.length + ' ' + cosa + ' trovati' : righe.length + ' ' + cosa) + ' · dal ' + dataIt(righe.reduce((m, x) => (x.data < m ? x.data : m), righe[0].data)) + ' al ' + dataIt(righe.reduce((m, x) => (x.data > m ? x.data : m), righe[0].data)));
  G.VISTE.registro = {
    minH: 700,
    nuova() { const u = rg(); u.msg = null; G.deseleziona('reg-c'); G.deseleziona('reg-s'); },
    render() {
      const S = G.S, u = rg();
      const nFito = S.articoli.filter((a) => a.fito).length, nScad = S.patentini.filter(G.patScaduto).length;
      const inC = (m, q) => !q || [m.articolo, m.produttore, m.nReg, m.docRif, m.codice].some((s) => G.normalizza(s).includes(G.normalizza(q)));
      const inS = (m, q) => !q || [m.articolo, m.patNome, m.patNumero, m.cliente, m.docRif, m.nma, m.codice].some((s) => G.normalizza(s).includes(G.normalizza(q)));
      const carichi = movimenti('CARICO').filter((m) => inC(m, u.cercaC.trim()));
      const scarichi = movimenti('SCARICO').filter((m) => inS(m, u.cercaS.trim()));
      const selC = G.selezionato('reg-c'), selS = G.selezionato('reg-s');
      const lab = (t) => '<div style="color:#888;font-size:11px">' + t + '</div>';
      const pic = ' style="margin-top:2px;height:32px;padding:0 6px"';
      const prod = [...new Set(S.registro.map((r) => r.produttore).filter(Boolean))].sort().map((x) => ({ id: x, testo: x }));
      const regOk = u.artId && G.leggiNum(u.qtaTesto) > 0;
      const testaGrid = (titolo, idCerca, cerca, tip, pulsanti, conta) => '<div class="avvolgi" style="margin-bottom:4px;align-items:center"><span style="font-weight:700;color:#A32D2D;font-size:13.5px;margin-right:14px">' + titolo + '</span>'
        + '<input class="tb" style="width:240px" data-in="' + idCerca + '" value="' + esc(cerca) + '" title="' + esc(tip) + '" autocomplete="off">' + pulsanti + '<span style="color:#666;font-size:12px;margin-left:12px">' + esc(conta) + '</span></div>';
      const colonneReg = { stile: 'border-color:#E2E2DE', classe: 'riempi reg' };
      return '<div class="col" style="padding:14px;height:100%">'
        + '<div class="pila" style="margin-bottom:10px;flex:none"><div style="font-size:22px;font-weight:600">Registro agrofarmaci</div>'
        + '<span style="background:#EAF3DE;color:#3B6D11;border-radius:6px;padding:3px 8px;font-size:12px;margin-left:18px">' + nFito + ' prodotti fitosanitari e coadiuvanti</span>'
        + '<span style="background:#FCEBEB;color:#A32D2D;border-radius:6px;padding:3px 8px;font-size:12px;margin-left:8px">' + nScad + ' patentini scaduti</span>'
        + btn('Gestione patentini…', 'reg-patentini', { stile: 'margin-left:16px;padding:5px 12px', title: 'Anagrafica dei patentini come nel vecchio programma: nuovo, rinnovo (si aggiornano le date), collegamento al cliente' })
        + '<span style="color:#888;font-size:11.5px;margin-left:16px">Lo scarico si registra dal banco: Vendite → «Emetti DDT fitosanitari»</span></div>'
        + '<div style="background:#fff;border:1px solid #E2E2DE;border-radius:8px;padding:12px 14px;margin-bottom:10px;flex:none"><div style="font-weight:600;font-size:14px;margin-bottom:8px">Registra carico (arrivo da fornitore)</div><div class="avvolgi basso">'
        + '<div style="width:330px;margin:0 12px 8px 0">' + lab('Prodotto (scrivi per cercarlo)') + '<div style="margin-top:2px">' + G.cmb('reg-art', { voci: fitoLookup(), valore: u.artId, title: 'Scrivi una parte della descrizione o del codice: la lista si restringe da sola', onScegli: (v) => scegliProdotto(v) }) + '</div></div>'
        + '<div style="width:80px;margin:0 12px 8px 0">' + lab('Quantità') + tb('reg-qta', u.qtaTesto, pic.replace('style="', 'style="') + ' data-in="reg-qta" inputmode="decimal"') + '</div>'
        + '<div style="width:105px;margin:0 12px 8px 0">' + lab('Data acquisto') + '<div style="margin-top:2px">' + G.dp('reg-data', u.data, { larghezza: 105, onCambia: (v) => { u.data = v; } }) + '</div></div>'
        + '<div style="width:190px;margin:0 12px 8px 0">' + lab('Num. registrazione') + tb('reg-nreg', u.nReg, pic + ' data-in="reg-nreg" title="Registrazione ministeriale del fitofarmaco (es. 11614 DEL 21/02/2003): si compila da sola col prodotto"') + '</div>'
        + '<div style="width:180px;margin:0 12px 8px 0">' + lab('Produttore (scrivi o scegli)') + '<div style="margin-top:2px">' + G.cmb('reg-prod', { voci: prod, valore: null, testoLibero: u.produttore, libero: true, title: 'Casa produttrice: si compila da sola col prodotto, si può scrivere liberamente', onScrivi: (t) => { u.produttore = t; }, onScegli: (v) => { u.produttore = v || ''; } }) + '</div></div>'
        + '<div style="width:90px;margin:0 12px 8px 0" title="Con che documento e\' arrivata la merce: finisce nella colonna «Doc. Rif.» del registro">' + lab('Tipo doc.') + '<div style="margin-top:2px">' + G.sel('data-ch="reg-tipodoc"', ['DDT', 'FATT'], u.tipoDoc) + '</div></div>'
        + '<div style="width:120px;margin:0 12px 8px 0">' + lab('N. documento') + tb('reg-doc', u.doc, pic + ' data-in="reg-doc" title="Numero del DDT o della fattura del fornitore"') + '</div>'
        + '<div style="width:105px;margin:0 12px 8px 0">' + lab('Data doc.') + '<div style="margin-top:2px">' + G.dp('reg-datadoc', u.dataDoc, { larghezza: 105, onCambia: (v) => { u.dataDoc = v; } }) + '</div></div>'
        + '<div style="width:120px;margin:0 12px 8px 0">' + lab('Lotto (opz.)') + tb('reg-lotto', u.lotto, pic + ' data-in="reg-lotto"') + '</div>'
        + btn('Registra carico', 'reg-registra', { dis: !regOk, id: 'reg-registra', stile: 'padding:7px 14px;margin:0 12px 8px 0' })
        + (u.msg ? '<span style="font-size:12px;max-width:360px;margin:0 0 12px;color:' + u.msg.colore + '">' + esc(u.msg.testo) + '</span>' : '') + '</div></div>'
        + '<div class="col riempi">'
        + testaGrid('CARICO', 'reg-cercac', u.cercaC, 'Cerca fra i carichi: prodotto, produttore, numero di registrazione o documento', btn('Elimina riga', 'reg-elimina-c', { dis: !selC, stile: 'margin-left:12px;padding:4px 10px', title: 'Cancella il carico selezionato e ritoglie dal magazzino la quantita\' che aveva caricato' }), riepilogoMov(carichi, u.cercaC.trim(), 'carichi'))
        + '<div class="col" style="flex:1 1 0;min-height:0">' + G.dg('reg-c', Object.assign({}, colonneReg, { righe: carichi, chiave: (m) => m.id, onSel: () => G.ridisegna(), colonne: [
          { k: 'data', t: 'Data Acq.', w: 86, v: (m) => dataIt(m.data), ordina: (m) => m.data }, { k: 'articolo', t: 'Prodotto', w: '*' }, { k: 'nReg', t: 'Num.Registrazione', w: 170 },
          { k: 'produttore', t: 'Produttore', w: 150 }, { k: 'docRif', t: 'Doc. Rif.', w: 100 }, { k: 'dataDoc', t: 'Data Doc.', w: 86, v: (m) => dataIt(m.dataDoc), ordina: (m) => m.dataDoc || '' }, { k: 'qta', t: 'Q.tà', w: 58, n: true, v: (m) => qta(m.qta), ordina: (m) => m.qta }] })) + '</div>'
        + '<div style="height:10px;flex:none"></div>'
        + testaGrid('SCARICO', 'reg-cercas', u.cercaS, 'Cerca fra gli scarichi: prodotto, patentino, cliente o documento', btn('Stampa DDT del movimento', 'reg-ddt', { dis: !selS, stile: 'margin-left:12px;padding:4px 10px', title: 'Apre il DDT collegato allo scarico selezionato; se non ne ha uno, lo emette adesso (anche con doppio clic sulla riga)' }) + btn('Elimina riga', 'reg-elimina-s', { dis: !selS, stile: 'margin-left:8px;padding:4px 10px', title: 'Cancella lo scarico selezionato dal registro (non si puo\' se nasce da un DDT: va annullato il documento)' }), riepilogoMov(scarichi, u.cercaS.trim(), 'scarichi'))
        + '<div class="col" style="flex:1 1 0;min-height:0">' + G.dg('reg-s', Object.assign({}, colonneReg, { righe: scarichi, chiave: (m) => m.id, onSel: () => G.ridisegna(), onDoppio: (m) => { G.scegliRiga('reg-s', m.id); A['reg-ddt'](); }, colonne: [
          { k: 'data', t: 'Data Ven.', w: 86, v: (m) => dataIt(m.data), ordina: (m) => m.data }, { k: 'articolo', t: 'Prodotto', w: '*' },
          { k: 'patNome', t: 'Pat.Nome', w: 170, f: (m) => '<span style="' + (m.patScaduto ? 'color:#A32D2D' : '') + '">' + esc(m.patNome) + '</span>' }, { k: 'patNumero', t: 'Pat.Numero', w: 88 },
          { k: 'cliente', t: 'Cliente', w: 210 }, { k: 'nma', t: 'N.M.A.', w: 70 }, { k: 'docRif', t: 'Doc. Rif.', w: 110 }, { k: 'dataDoc', t: 'Data Doc.', w: 86, v: (m) => dataIt(m.dataDoc), ordina: (m) => m.dataDoc || '' }, { k: 'qta', t: 'Q.tà', w: 58, n: true, v: (m) => qta(m.qta), ordina: (m) => m.qta }] })) + '</div>'
        + '</div></div>';
    },
  };
  function scegliProdotto(id) {
    const u = rg(); u.artId = id || null;
    if (!id) { G.ridisegna(); return; }
    // numero di registrazione e produttore dell'ultimo carico di quel prodotto
    const ultimo = G.S.registro.filter((r) => r.tipo === 'CARICO' && r.artId === id).sort((a, b) => b.data.localeCompare(a.data))[0];
    u.nReg = ultimo ? ultimo.nReg || '' : ''; u.produttore = ultimo ? ultimo.produttore || '' : '';
    if (G.COMBO['reg-prod']) G.COMBO['reg-prod'].testo = u.produttore;
    if (!ultimo || (!u.nReg && !u.produttore)) u.msg = { colore: 'var(--ambra)', testo: 'Di questo prodotto non risulta un carico precedente: numero di registrazione e produttore vanno scritti a mano (la prossima volta si compileranno da soli).' };
    else if (u.msg && u.msg.testo.startsWith('Di questo prodotto')) u.msg = null;
    G.ridisegna();
  }
  G.IN['reg-qta'] = (el) => { const u = rg(); u.qtaTesto = el.value; const b = document.getElementById('reg-registra'); if (b) b.disabled = !(u.artId && G.leggiNum(u.qtaTesto) > 0); };
  G.IN['reg-nreg'] = (el) => { rg().nReg = el.value; };
  G.IN['reg-doc'] = (el) => { rg().doc = el.value; };
  G.IN['reg-lotto'] = (el) => { rg().lotto = el.value; };
  G.CH['reg-tipodoc'] = (el) => { rg().tipoDoc = el.value; };
  G.IN['reg-cercac'] = (el) => { rg().cercaC = el.value; G.ridisegna(); const n = document.querySelector('[data-in="reg-cercac"]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  G.IN['reg-cercas'] = (el) => { rg().cercaS = el.value; G.ridisegna(); const n = document.querySelector('[data-in="reg-cercas"]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  A['reg-registra'] = () => {
    const S = G.S, u = rg();
    const a = u.artId ? G.art(u.artId) : null, q = G.leggiNum(u.qtaTesto);
    if (!a || q <= 0) { u.msg = { colore: 'var(--rosso)', testo: 'Per il carico servono prodotto e quantità.' }; G.ridisegna(); return; }
    S.registro.unshift({ id: G.nuovoId(), tipo: 'CARICO', data: u.data || G.OGGI, artId: a.id, qta: q, nReg: u.nReg.trim(), produttore: (G.testoCombo('reg-prod') || u.produttore).trim(), doc: u.doc.trim() ? u.tipoDoc + ' forn. ' + u.doc.trim() : '', dataDoc: u.dataDoc, lotto: u.lotto.trim() || a.lotto });
    a.giac = r2(a.giac + q);
    G.log('Registro', 'Carico agrofarmaco articolo id ' + a.id + ': +' + G.z0(q) + ' · giacenza aggiornata', 'art:' + a.id);
    G.salva();
    u.msg = { colore: 'var(--verde)', testo: 'Carico registrato: ' + a.codice + ' · q.tà ' + qta(q) + '.' };
    u.qtaTesto = '1'; u.lotto = ''; u.doc = '';
    G.ridisegna();
  };
  function eliminaRiga(daCarico) {
    const S = G.S, u = rg();
    const mv = G.selezionato(daCarico ? 'reg-c' : 'reg-s'); if (!mv) return;
    if (!daCarico && mv.r.ddtId) {
      const d = G.ddtDa(mv.r.ddtId);
      G.msgbox({ titolo: 'Riga non cancellabile', icona: 'avviso', testo: 'Questo scarico nasce dal DDT n. ' + (d ? d.numero + '/' + d.anno : mv.docRif) + ': cancellarlo qui lascerebbe il documento senza la sua registrazione. Va annullato il DDT dalla sezione Documenti di trasporto.' });
      return;
    }
    const cosa = daCarico ? 'carico' : 'scarico';
    const effetto = daCarico ? '\n\nLa quantità torna a scendere dal magazzino di ' + qta(mv.qta) + '.' : '';
    G.msgbox({ titolo: 'Elimina riga del registro', icona: 'avviso', predefinito: 1, testo: 'Eliminare questo ' + cosa + ' dal registro agrofarmaci?\n\n' + dataIt(mv.data) + ' · ' + mv.articolo + '\nQuantità ' + qta(mv.qta) + effetto + '\n\nL\'operazione non si può annullare.', pulsanti: [{ t: 'Sì', az: () => {
      if (daCarico) { const a = G.art(mv.r.artId); if (a) a.giac = r2(a.giac - mv.qta); }
      S.registro = S.registro.filter((r) => r !== mv.r);
      G.deseleziona(daCarico ? 'reg-c' : 'reg-s'); G.salva();
      u.msg = { colore: 'var(--verde)', testo: 'Riga di ' + cosa + ' eliminata: ' + mv.articolo + (daCarico ? ' · magazzino aggiornato.' : '.') };
      G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  }
  A['reg-elimina-c'] = () => eliminaRiga(true);
  A['reg-elimina-s'] = () => eliminaRiga(false);
  function docFito(d, p) {
    const doc = G.docDaDdt(d);
    doc.titolo = 'DOCUMENTO DI TRASPORTO — PRODOTTI FITOSANITARI';
    if (p) doc.extra = '<div class="box" style="margin-top:10px"><div class="et">Acquirente utilizzatore professionale</div>' + esc(p.nominativo) + ' — patentino n. ' + esc(p.numero) + ' rilasciato da ' + esc(p.ente) + ', valido fino al ' + dataIt(p.validoA) + '<br>Il sottoscritto dichiara che i prodotti fitosanitari acquistati saranno impiegati esclusivamente per gli usi consentiti in etichetta.</div>';
    return doc;
  }
  A['reg-ddt'] = () => {
    const S = G.S, u = rg();
    const mv = G.selezionato('reg-s'); if (!mv) return;
    const p = mv.r.patentinoId ? G.patentino(mv.r.patentinoId) : null;
    if (mv.r.ddtId && G.ddtDa(mv.r.ddtId)) { const d = G.ddtDa(mv.r.ddtId); G.apriDocumento(docFito(d, p)); u.msg = { colore: 'var(--verde)', testo: 'Aperto il DDT n. ' + d.numero + '/' + d.anno + ' collegato al movimento.' }; G.ridisegna(); return; }
    if (!mv.r.clienteId) { u.msg = { colore: 'var(--rosso)', testo: 'Questo scarico non ha un cliente collegato (patentino senza cliente): impossibile emettere il DDT.' }; G.ridisegna(); return; }
    G.msgbox({ titolo: 'Stampa DDT dal registro', icona: 'domanda', testo: 'Questo scarico non ha ancora un DDT.\n\nEmettere ADESSO il documento di trasporto per ' + mv.cliente + ' (' + mv.articolo + ', q.tà ' + qta(mv.qta) + ')?\nIl prezzo segue il listino del cliente e il magazzino viene scaricato.', pulsanti: [{ t: 'Sì', az: () => {
      const a = G.art(mv.r.artId), c = G.cli(mv.r.clienteId);
      const righe = [{ artId: a.id, codice: a.codice, descr: a.descr, um: a.um, qta: mv.qta, prezzo: prezzoListino(a, c.listino), sconto: 0, iva: a.iva, listino: c.listino, info: a.info }];
      const d = { id: G.nuovoId(), numero: ++S.numeri.ddt, anno: Number(G.OGGI.slice(0, 4)), data: G.OGGI, clienteId: c.id, causale: 'VENDITA FITOSANITARI', righe, totale: G.totaliRighe(righe).totale, fatturaId: null, annullato: false, note: 'Registro agrofarmaci: scarico del ' + dataIt(mv.data) + ' — ' + mv.patNome };
      S.ddt.push(d); a.giac = r2(a.giac - mv.qta); mv.r.ddtId = d.id; mv.r.doc = String(d.numero);
      G.indicizza(); G.salva();
      u.msg = { colore: 'var(--verde)', testo: 'DDT n. ' + d.numero + ' emesso e collegato al movimento · PDF aperto.' };
      G.ridisegna(); G.apriDocumento(docFito(d, p));
    } }, { t: 'No', annulla: true }] });
  };
  // ---- Gestione patentini (PatentiniWindow) ----
  A['reg-patentini'] = () => {
    const S = G.S;
    const st = { id: null, msg: null, cercaNome: '', cercaNum: '' };
    const vuoto = { nominativo: '', indirizzo: '', numero: '', rilascio: '', ente: '', validoDa: '', validoA: '' };
    let form = Object.assign({}, vuoto);
    const o = G.finestra({
      titolo: 'Gestione patentini — anagrafica certificati di abilitazione', larghezza: 1020, altezza: 680,
      corpo: () => {
        const righe = S.patentini.filter((p) => G.normalizza(p.nominativo).includes(G.normalizza(st.cercaNome)) && G.normalizza(p.numero).includes(G.normalizza(st.cercaNum))).slice().sort((a, b) => a.nominativo.localeCompare(b.nominativo));
        const campo = (et, html, w, tip) => '<div style="width:' + w + 'px;margin:0 12px 10px 0"><div class="muto"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + et + '</div><div style="margin-top:3px">' + html + '</div></div>';
        return '<div class="col" style="padding:16px;height:100%">'
          + '<div class="card" style="margin-bottom:12px"><div class="h2" style="font-size:16px;margin-bottom:10px">' + (st.id ? 'Anagrafica patentino — modifica (' + esc(form.nominativo) + ')' : 'Anagrafica patentino — nuovo') + '</div><div class="avvolgi">'
          + campo('Nominativo *', tb('pt-nom', form.nominativo), 250) + campo('Indirizzo', tb('pt-ind', form.indirizzo), 230) + campo('Patentino n. *', tb('pt-num', form.numero), 130)
          + campo('Data rilascio', G.dp('pt-ril', form.rilascio), 130) + campo('Rilasciato da', tb('pt-ente', form.ente), 280) + campo('Valido dal', G.dp('pt-da', form.validoDa), 130)
          + campo('Valido fino al *', G.dp('pt-a', form.validoA), 130, 'Al rinnovo del patentino basta aggiornare questa data (e quella del rilascio)') + '</div>'
          + '<div class="riga" style="margin-top:2px">' + btn('Nuovo', 'pt-nuovo', { stile: 'padding:7px 16px' }) + btn('Salva', 'pt-salva', { primario: true, stile: 'margin-left:8px;padding:7px 22px' }) + btn('Elimina', 'pt-elimina', { dis: !st.id, stile: 'margin-left:8px;padding:7px 16px' }) + btn('Chiudi', 'chiudi-finestra', { stile: 'margin-left:8px;padding:7px 16px' })
          + msgSpan(st.msg, 'margin-left:14px;max-width:420px') + '</div></div>'
          + '<div class="avvolgi" style="margin-bottom:8px;align-items:center"><span class="muto" style="margin-right:4px">Cerca nominativo:</span><input class="tb" style="width:220px;margin-right:12px" data-in="pt-cercanome" value="' + esc(st.cercaNome) + '">'
          + '<span class="muto" style="margin-right:4px">Cerca patentino n.:</span><input class="tb" style="width:140px" data-in="pt-cercanum" value="' + esc(st.cercaNum) + '"><span class="muto" style="margin-left:14px">' + righe.length + ' patentini · ' + righe.filter(G.patScaduto).length + ' scaduti</span></div>'
          + G.dg('patentini', { classe: 'riempi', righe, chiave: (p) => p.id, onSel: (p) => apri(p), onDoppio: (p) => apri(p), colonne: [
            { k: 'nominativo', t: 'Nominativo', w: '*' }, { k: 'numero', t: 'N. patentino', w: 110, mono: true }, { k: 'indirizzo', t: 'Indirizzo', w: 220 }, { k: 'ente', t: 'Rilasciato da', w: 200 },
            { k: 'validoA', t: 'Valido fino al', w: 110, v: (p) => dataIt(p.validoA), ordina: (p) => p.validoA, f: (p) => (G.patScaduto(p) ? '<span style="color:#C0392B;font-weight:600">' + dataIt(p.validoA) + '</span>' : dataIt(p.validoA)) }] })
          + '</div>';
      },
      dopoChiusa: () => G.ridisegna(),
    });
    const apri = (p) => { st.id = p.id; form = { nominativo: p.nominativo, indirizzo: p.indirizzo, numero: p.numero, rilascio: p.rilascio, ente: p.ente, validoDa: p.validoDa, validoA: p.validoA }; st.msg = G.patScaduto(p) ? { colore: 'var(--rosso)', testo: 'Patentino SCADUTO: per il rinnovo aggiorna data rilascio e date di validità, poi Salva.' } : null; G.aggiornaFinestra(o); };
    const leggi = () => { form = { nominativo: val('pt-nom').trim(), indirizzo: val('pt-ind').trim(), numero: val('pt-num').trim(), rilascio: G.valoreDp('pt-ril'), ente: val('pt-ente').trim(), validoDa: G.valoreDp('pt-da'), validoA: G.valoreDp('pt-a') }; };
    A['pt-nuovo'] = () => { st.id = null; form = Object.assign({}, vuoto); st.msg = null; G.deseleziona('patentini'); G.aggiornaFinestra(o); };
    A['pt-salva'] = () => {
      leggi();
      if (!form.nominativo || !form.numero || !form.validoA) { st.msg = { colore: 'var(--rosso)', testo: 'Nominativo, numero patentino e data \'valido fino al\' sono obbligatori.' }; G.aggiornaFinestra(o); return; }
      let p = st.id ? G.patentino(st.id) : null;
      if (!p) { p = { id: G.nuovoId(), clienteId: null }; S.patentini.push(p); }
      Object.assign(p, form);
      G.indicizza(); G.salva();
      st.msg = { colore: 'var(--verde)', testo: st.id ? 'Patentino n. ' + p.numero + ' aggiornato (valido fino al ' + dataIt(p.validoA) + ').' : 'Patentino n. ' + p.numero + ' creato.' };
      st.id = p.id; G.scegliRiga('patentini', p.id); G.aggiornaFinestra(o);
    };
    A['pt-elimina'] = () => {
      leggi();
      const p = G.patentino(st.id); if (!p) return;
      if (S.registro.some((r) => r.patentinoId === p.id)) { st.msg = { colore: 'var(--rosso)', testo: 'Il patentino ha movimenti sul registro agrofarmaci: non si può eliminare.' }; G.aggiornaFinestra(o); return; }
      G.msgbox({ titolo: 'Conferma eliminazione', icona: 'avviso', testo: 'Sei sicuro di voler eliminare il patentino n. ' + p.numero + ' di ' + p.nominativo + '?', pulsanti: [{ t: 'Sì', az: () => {
        S.patentini = S.patentini.filter((x) => x !== p); G.indicizza(); G.salva(); st.id = null; form = Object.assign({}, vuoto); st.msg = { colore: 'var(--verde)', testo: 'Patentino eliminato.' }; G.deseleziona('patentini'); G.aggiornaFinestra(o);
      } }, { t: 'No', annulla: true }] });
    };
    G.IN['pt-cercanome'] = (el) => { st.cercaNome = el.value; G.aggiornaFinestra(o); const n = document.querySelector('[data-in="pt-cercanome"]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
    G.IN['pt-cercanum'] = (el) => { st.cercaNum = el.value; G.aggiornaFinestra(o); const n = document.querySelector('[data-in="pt-cercanum"]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  };

  // =====================================================================
  // SCADENZARIO
  // =====================================================================
  const sc = () => G.ui('scadenzario', () => ({ tipo: 'ATTIVA', stato: 'Aperte', dal: '', al: '', cerca: '', msg: null, pannello: null }));
  const contoNome = (cod) => (G.S.conti.find((c) => c.codice === cod) || { nome: cod }).nome;
  const vociConto = () => G.S.conti.map((c) => [c.codice, c.nome]).concat(G.S.conti.filter((c) => c.codice.startsWith('BANCA')).map((c) => ['RID:' + c.codice, 'RID su ' + c.nome]));
  function righeScad(u) {
    const q = G.normalizza(u.cerca).trim();
    return G.S.scadenze.filter((s) => s.tipo === u.tipo)
      .filter((s) => (u.stato === 'Aperte' ? ['APERTA', 'PARZIALE', 'INSOLUTA'].includes(s.stato) : u.stato === 'Tutte' ? true : s.stato === u.stato))
      .filter((s) => (!u.dal || s.scadenza >= u.dal) && (!u.al || s.scadenza <= u.al))
      .filter((s) => !q || G.normalizza(G.nomeSoggetto(s)).includes(q) || G.normalizza(s.documento).includes(q) || String(s.importo).replace('.', ',').includes(q) || num(s.importo).includes(q))
      .sort((a, b) => a.scadenza.localeCompare(b.scadenza) || a.id - b.id);
  }
  G.VISTE.scadenzario = {
    nuova() { const u = sc(); u.msg = null; u.pannello = null; G.deseleziona('scad'); },
    render() {
      const u = sc();
      const rows = righeScad(u);
      const sel = G.selezionato('scad');
      const aperte = rows.filter((r) => ['APERTA', 'PARZIALE', 'INSOLUTA'].includes(r.stato));
      const residuo = somma(aperte, G.residuo), scaduto = somma(aperte.filter((r) => r.scadenza < G.OGGI), G.residuo);
      const filtro = !!u.cerca.trim();
      const aperta = sel && ['APERTA', 'PARZIALE', 'INSOLUTA'].includes(sel.stato) && G.residuo(sel) > 0;
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga" style="margin-bottom:10px"><div class="pila">'
        + '<div class="h1">Scadenzario</div><div style="width:180px;margin-left:16px">' + G.sel('data-ch="scad-tipo"', [['ATTIVA', 'Incassi (clienti)'], ['PASSIVA', 'Pagamenti (fornitori)']], u.tipo) + '</div>'
        + '<div style="width:130px;margin-left:10px">' + G.sel('data-ch="scad-stato"', ['Aperte', 'Tutte', 'APERTA', 'PARZIALE', 'PAGATA', 'INSOLUTA'], u.stato) + '</div>'
        + '<span style="margin-left:10px">' + G.dp('scad-dal', u.dal, { larghezza: 120, title: 'Scadenza dal', onCambia: (v) => { u.dal = v; G.deseleziona('scad'); G.ridisegna(); } }) + '</span>'
        + '<span style="margin-left:6px">' + G.dp('scad-al', u.al, { larghezza: 120, title: 'Scadenza al', onCambia: (v) => { u.al = v; G.deseleziona('scad'); G.ridisegna(); } }) + '</span>'
        + '<input class="tb" style="width:200px;margin-left:10px" data-in="scad-cerca" value="' + esc(u.cerca) + '" title="Cerca per soggetto, n. fattura o importo" autocomplete="off">'
        + '<span class="muto" style="margin-left:14px">' + rows.length + ' partite' + (filtro ? ' · residuo di questa ricerca: ' + num(residuo) + ' €' : '') + '</span></div>'
        + '<div class="card fisso" style="padding:8px 14px;margin-left:10px"><div class="riga alto"><div style="margin-right:18px"><div class="muto">' + (filtro ? 'Totale del soggetto cercato' : u.tipo === 'ATTIVA' ? 'Totale da incassare' : 'Totale da pagare') + '</div><div style="font-size:19px;font-weight:600;color:var(--rosso)">' + num(residuo) + ' €</div></div>'
        + '<div><div class="muto">di cui scaduto</div><div style="font-size:19px;font-weight:600;color:#C0392B">' + num(scaduto) + ' €</div></div></div></div></div>'
        + '<div class="col riempi" style="position:relative">' + G.dg('scad', {
          classe: 'riempi', righe: rows, chiave: (s) => s.id, onSel: () => G.ridisegna(),
          classeRiga: (s) => (s.scadenza < G.OGGI && s.stato !== 'PAGATA' ? 'scaduta' : ''),
          colonne: [
            { k: 'sogg', t: 'Soggetto', w: '*', v: G.nomeSoggetto }, { k: 'doc', t: 'Doc.', w: 66, v: (s) => s.documento },
            { k: 'datadoc', t: 'Data doc.', w: 88, v: (s) => dataIt(s.dataDoc), ordina: (s) => s.dataDoc || '' }, { k: 'scad', t: 'Scadenza', w: 88, v: (s) => dataIt(s.scadenza), ordina: (s) => s.scadenza },
            { k: 'importo', t: 'Importo €', w: 94, n: true, v: (s) => num(s.importo), ordina: (s) => s.importo },
            { k: 'pagato', t: 'Pagato €', w: 94, n: true, v: (s) => num(G.pagatoScad(s)), ordina: (s) => G.pagatoScad(s), f: (s) => '<span style="color:#2E7D32">' + num(G.pagatoScad(s)) + '</span>' },
            { k: 'residuo', t: 'Residuo €', w: 94, n: true, semi: true, v: (s) => num(G.residuo(s)), ordina: (s) => G.residuo(s) },
            { k: 'stato', t: 'Stato', w: 86, semi: true, v: (s) => s.stato, f: (s) => '<span style="color:' + ({ PAGATA: '#2E7D32', PARZIALE: '#B07400', INSOLUTA: '#C0392B' }[s.stato] || 'inherit') + '">' + s.stato + '</span>' },
            { k: 'metodo', t: 'Metodo', w: 110, v: (s) => s.metodo || '' },
          ],
        }) + (u.pannello ? '<div class="card" style="position:absolute;left:0;right:0;top:0;z-index:5">' + this.pannello(u, sel) + '</div>' : '') + '</div>'
        + '<div class="card riga" style="margin-top:10px;padding:10px 14px"><span class="muto spinta" style="color:' + (u.msg ? u.msg.colore : 'var(--testo-2)') + '">' + (u.msg ? esc(u.msg.testo) : '') + '</span>'
        + '<div class="riga fisso">' + btn('Modifica…', 'scad-modifica', { dis: !sel, stile: 'margin-right:8px', title: 'Correggi a mano la data di scadenza, quanto risulta pagato e lo stato della partita, senza muovere soldi' })
        + btn('Elimina', 'scad-elimina', { dis: !sel, stile: 'margin-right:8px', title: 'Toglie la partita dallo scadenzario: serve per le cose vecchie, gia\' sistemate col vecchio programma' })
        + btn('Segna insoluta', 'scad-insoluta', { dis: !(sel && ['APERTA', 'PARZIALE'].includes(sel.stato)), stile: 'margin-right:8px' })
        + btn('Riapri', 'scad-riapri', { dis: !(sel && ['INSOLUTA', 'PAGATA'].includes(sel.stato)), stile: 'margin-right:8px', title: 'Rimette la partita fra quelle da incassare senza toccare gli importi gia\' registrati' })
        + btn('Annulla incasso...', 'scad-storna', { dis: !(sel && G.pagatoScad(sel) > 0), stile: 'margin-right:8px', title: 'Cancella un incasso sbagliato: la partita torna aperta per quella cifra e il movimento sparisce dalla prima nota' })
        + btn(u.tipo === 'ATTIVA' ? '+ Nuovo incasso' : '+ Nuovo pagamento', 'scad-nuova', { stile: 'margin-right:8px', title: 'Scrivi a mano una partita che non nasce da un documento del programma: una fattura arrivata su carta, un affitto, una rata' })
        + btn('+ Acconto', 'scad-acconto', { stile: 'margin-right:8px' }) + btn('Esporta Excel', 'scad-esporta', { stile: 'margin-right:8px' }) + btn('Incassa / paga…', 'scad-paga', { primario: true, dis: !aperta }) + '</div></div>'
        + '</div>';
    },
    pannello(u, sel) {
      const p = u.pannello;
      const campo = (et, html, w) => '<div style="width:' + w + 'px;margin:0 14px 12px 0"><div class="muto">' + et + '</div><div style="margin-top:3px">' + html + '</div></div>';
      const piede = (pulsanti) => '<div class="riga">' + pulsanti + msgSpan(p.msg, 'margin-left:16px;max-width:430px') + '</div>';
      const grande = ' style="font-size:15px;font-weight:600"';
      if (p.tipo === 'paga') {
        return '<div class="h2" style="font-size:17px;margin-bottom:4px">' + (sel.tipo === 'ATTIVA' ? 'Registra incasso' : 'Registra pagamento') + '</div>'
          + '<div class="muto" style="margin-bottom:12px">' + esc(G.nomeSoggetto(sel) + ' · FT ' + sel.documento + ' · scadenza ' + dataIt(sel.scadenza) + ' · importo ' + num(sel.importo) + ' € · già pagato ' + num(G.pagatoScad(sel)) + ' € · residuo ' + num(G.residuo(sel)) + ' €') + '</div>'
          + '<div class="avvolgi">' + campo('Importo € *', tb('pg-imp', p.importo, grande.replace('style="', 'style="') + ' inputmode="decimal"'), 120) + campo('Data', G.dp('pg-data', p.data), 130)
          + campo('Conto *', '<span title="RID: si sceglie la banca da cui il fornitore si prende i soldi, così il saldo di quella banca resta giusto">' + G.sel('id="pg-conto"', [['', '']].concat(vociConto()), p.conto) + '</span>', 210) + campo('Note', tb('pg-note', ''), 240) + '</div>'
          + piede(btn('Registra', 'pg-ok', { primario: true, stile: 'padding:7px 22px' }) + btn('Tutto il residuo', 'pg-tutto', { stile: 'margin-left:10px;padding:7px 14px' }) + btn('Annulla', 'pn-chiudi', { stile: 'margin-left:10px;padding:7px 18px' }));
      }
      if (p.tipo === 'storno') {
        const incassi = (sel.incassi || []).map((i) => Object.assign({}, i));
        return '<div class="h2" style="font-size:17px;margin-bottom:4px">Incassi registrati su questa partita</div>'
          + '<div class="muto" style="margin-bottom:10px">' + esc(G.nomeSoggetto(sel) + ' · FT ' + sel.documento + ' · importo ' + num(sel.importo) + ' € · già incassato ' + num(G.pagatoScad(sel)) + ' € · residuo ' + num(G.residuo(sel)) + ' €') + '</div>'
          + G.dg('storni', { stile: 'max-height:200px', righe: incassi, chiave: (i) => i.id, onSel: () => { const b = document.querySelector('[data-az="st-ok"]'); if (b) b.disabled = false; }, colonne: [
            { k: 'data', t: 'Data', w: 90, v: (i) => dataIt(i.data) }, { k: 'importo', t: 'Importo €', w: 100, n: true, v: (i) => num(i.importo) }, { k: 'conto', t: 'Conto', w: 150, v: (i) => (i.rid ? 'RID su ' : '') + contoNome(i.conto) },
            { k: 'tipo', t: 'Tipo', w: 130, v: (i) => (i.tipo === 'ACCONTO' ? 'Da acconto' : 'Incasso') }, { k: 'note', t: 'Note', w: '*', min: 200 }, { k: 'op', t: 'Operatore', w: 110, v: (i) => i.operatore || '' }] })
          + '<div style="margin-top:12px">' + piede(btn('Annulla l\'incasso selezionato', 'st-ok', { dis: true, stile: 'padding:7px 18px' }) + btn('Chiudi', 'pn-chiudi', { stile: 'margin-left:10px;padding:7px 18px' })) + '</div>';
      }
      if (p.tipo === 'modifica') {
        const forn = sel.tipo === 'PASSIVA';
        return '<div class="h2" style="font-size:17px;margin-bottom:4px">Correggi la partita</div>'
          + '<div class="muto" style="margin-bottom:4px">' + esc(G.nomeSoggetto(sel) + ' · doc. ' + sel.documento + (sel.fatturaId || sel.acquistoId ? ' · ' + (sel.fatturaId ? 'fattura' : 'documento') + ' di questo programma' : ' · arriva dal vecchio gestionale')) + '</div>'
          + '<div class="muto" style="margin-bottom:12px">Qui non si muovono soldi e non si scrive niente in prima nota: si sistema solo come risulta la partita nello scadenzario.</div>'
          + '<div class="avvolgi">' + campo('Importo della partita', forn ? tb('md-imp', n2(sel.importo), grande + ' data-in="md-cifre" inputmode="decimal"') : '<div style="font-size:15px;font-weight:600;margin-top:6px">' + num(sel.importo) + ' €</div>', 140)
          + campo('Scadenza *', G.dp('md-scad', sel.scadenza), 140)
          + (forn ? campo('Metodo', G.sel('id="md-metodo"', [['', '(nessuno)']].concat(G.S.metodi.map((m) => [m.nome, m.nome])), sel.metodo || ''), 210) : '')
          + campo('Pagato € *', tb('md-pag', n2(G.pagatoScad(sel)), grande + ' data-in="md-cifre" inputmode="decimal"'), 140)
          + campo('Stato *', G.sel('id="md-stato" data-ch="md-stato"', ['APERTA', 'PARZIALE', 'PAGATA', 'INSOLUTA'], sel.stato), 160)
          + campo('&nbsp;', btn('Tutto pagato', 'md-tutto', { stile: 'padding:6px 12px', title: 'Mette il pagato uguale all\'importo e lo stato su PAGATA' }), 150) + '</div>'
          + ((sel.incassi || []).length ? '<div style="color:#B07400;font-size:12px;margin-bottom:10px">Attenzione: su questa partita ci sono ' + sel.incassi.length + ' movimenti di prima nota per ' + num(somma(sel.incassi, (i) => i.importo)) + ' € — soldi passati davvero per la cassa. Se cambi il pagato a mano il conto non corrisponderà più agli incassi registrati, e tornerà a posto da solo appena ne registri o ne annulli uno. Per correggere un incasso sbagliato è meglio «Annulla incasso…».</div>' : '')
          + piede(btn('Salva', 'md-ok', { primario: true, stile: 'padding:7px 22px' }) + btn('Annulla', 'pn-chiudi', { stile: 'margin-left:10px;padding:7px 18px' }));
      }
      if (p.tipo === 'nuova') {
        const cli = u.tipo === 'ATTIVA';
        return '<div class="h2" style="font-size:17px;margin-bottom:4px">' + (cli ? 'Nuovo incasso da avere' : 'Nuovo pagamento da fare') + '</div>'
          + '<div class="muto" style="margin-bottom:12px">' + (cli ? 'Una somma da incassare da un cliente che non nasce da una fattura del programma.' : 'Una somma da pagare a un fornitore che non è nel registro acquisti: una fattura arrivata su carta, un affitto, una rata.') + ' Entra nello scadenzario come partita aperta; quando si salda si registra con «Incassa / paga…», come le altre.</div>'
          + '<div class="avvolgi">' + campo(cli ? 'Cliente *' : 'Fornitore *', G.cmb('nv-sogg', { voci: cli ? clientiLookup() : fornLookup(), valore: null, title: 'Scrivi una parte qualsiasi del nome (anche in mezzo): la lista si restringe da sola' }), 250)
          + campo('N. documento', tb('nv-num', ''), 120) + campo('Data documento', G.dp('nv-datadoc', G.OGGI), 130) + campo('Scadenza *', G.dp('nv-scad', G.OGGI), 130)
          + campo('Importo € *', tb('nv-imp', '', grande + ' inputmode="decimal"'), 120) + campo('Metodo di pagamento', G.sel('id="nv-metodo"', [['', '(nessuno)']].concat(G.S.metodi.map((m) => [m.nome, m.nome])), ''), 200) + campo('Note', tb('nv-note', ''), 250) + '</div>'
          + '<div class="avvolgi" style="margin-bottom:12px;align-items:center"><label class="chk" style="margin-right:14px" title="Se i soldi sono già usciti (o entrati), la partita nasce saldata e il movimento va in prima nota"><input type="checkbox" id="nv-gia" data-ch="nv-gia"' + (p.gia ? ' checked' : '') + '>' + (cli ? 'Già incassato: registralo subito' : 'Già pagato: registralo subito') + '</label>'
          + '<span class="muto" style="margin-right:6px">il</span><span style="margin-right:14px">' + G.dp('nv-datapag', G.OGGI, { disabilitato: !p.gia }) + '</span><span class="muto" style="margin-right:6px">conto</span><div style="width:210px">' + G.sel('id="nv-conto"' + (p.gia ? '' : ' disabled'), [['', '']].concat(vociConto()), '') + '</div></div>'
          + piede(btn(p.gia ? 'Crea e registra' : 'Crea', 'nv-ok', { primario: true, stile: 'padding:7px 22px' }) + btn('Annulla', 'pn-chiudi', { stile: 'margin-left:10px;padding:7px 18px' }));
      }
      if (p.tipo === 'acconto') {
        const cli = u.tipo === 'ATTIVA';
        return '<div class="h2" style="font-size:17px;margin-bottom:4px">Registra acconto</div>'
          + '<div class="muto" style="margin-bottom:12px">Acconto ricevuto da un cliente o versato a un fornitore, senza fattura collegata. Poi si collega a una partita dello stesso soggetto: selezionala e premi «Incassa / paga…».</div>'
          + '<div class="avvolgi">' + campo(cli ? 'Cliente *' : 'Fornitore *', G.cmb('ac-sogg', { voci: cli ? clientiLookup() : fornLookup(), valore: null, title: 'Scrivi una parte qualsiasi del nome (anche in mezzo): la lista si restringe da sola' }), 250)
          + campo('Importo € *', tb('ac-imp', '', ' inputmode="decimal"'), 120) + campo('Data', G.dp('ac-data', G.OGGI), 130) + campo('Conto *', G.sel('id="ac-conto"', [['', '']].concat(G.S.conti.map((c) => [c.codice, c.nome])), ''), 140) + campo('Note', tb('ac-note', ''), 220) + '</div>'
          + piede(btn('Registra acconto', 'ac-ok', { primario: true, stile: 'padding:7px 22px' }) + btn('Annulla', 'pn-chiudi', { stile: 'margin-left:10px;padding:7px 18px' }));
      }
      return '';
    },
  };
  G.CH['scad-tipo'] = (el) => { const u = sc(); u.tipo = el.value; u.pannello = null; G.deseleziona('scad'); G.ridisegna(); };
  G.CH['scad-stato'] = (el) => { const u = sc(); u.stato = el.value; G.deseleziona('scad'); G.ridisegna(); };
  G.IN['scad-cerca'] = (el) => { const u = sc(); u.cerca = el.value; G.ridisegna(); const n = document.querySelector('[data-in="scad-cerca"]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  A['pn-chiudi'] = () => { sc().pannello = null; G.ridisegna(); };
  const pnMsg = (t, colore) => { const u = sc(); u.pannello.msg = { colore: colore || 'var(--rosso)', testo: t }; G.ridisegna(); };
  // incasso o pagamento: sulla partita, in prima nota (sul conto scelto, anche come RID) e nella cronologia
  function registraPagamento(s, importo, data, contoVoce, note, tipo) {
    const S = G.S;
    const rid = contoVoce.startsWith('RID:');
    const conto = rid ? contoVoce.slice(4) : contoVoce;
    const inc = { id: G.nuovoId(), data, importo: r2(importo), conto, rid, tipo: tipo || (s.tipo === 'ATTIVA' ? 'INCASSO' : 'PAGAMENTO'), note: note || '', operatore: G.operatore ? G.operatore.nome : '' };
    s.incassi = s.incassi || []; s.incassi.push(inc);
    s.pagato = r2(G.pagatoScad(s) + importo);
    s.stato = s.pagato >= s.importo - 0.005 ? 'PAGATA' : s.pagato > 0 ? 'PARZIALE' : 'APERTA';
    const causale = (s.tipo === 'ATTIVA' ? 'INCASSO' : 'PAGAMENTO') + (rid ? ' RID' : '') + (s.documento ? ' FT ' + s.documento : '');
    S.primaNota.unshift({ id: G.nuovoId(), data, tipo: s.tipo === 'ATTIVA' ? 'ENTRATA' : 'USCITA', conto, importo: r2(importo), causale, descr: note || G.nomeSoggetto(s), soggetto: G.nomeSoggetto(s), rif: 'scad:' + s.id, note: note || '', incassoId: inc.id });
    G.log(s.tipo === 'ATTIVA' ? 'Incasso' : 'Pagamento', causale + ' · ' + num(importo) + ' € ' + (s.stato === 'PAGATA' ? '(partita chiusa)' : '(residuo ' + num(s.importo - s.pagato) + ' €)') + ' · ' + G.nomeSoggetto(s), 'scad:' + s.id);
    return inc;
  }
  A['scad-paga'] = () => {
    const S = G.S, u = sc(), s = G.selezionato('scad'); if (!s) return;
    const apri = () => { u.pannello = { tipo: 'paga', importo: n2(G.residuo(s)), data: G.OGGI, conto: '', msg: null }; G.ridisegna(); };
    const acc = S.acconti.find((a) => a.tipo === s.tipo && a.soggettoId === s.soggettoId && !a.collegato);
    if (!acc || G.residuo(s) <= 0) { apri(); return; }
    const normale = s.tipo === 'ATTIVA' ? 'un incasso normale' : 'un pagamento normale';
    G.msgbox({ titolo: 'Collega acconto', icona: 'domanda', testo: 'C\'è un acconto libero di ' + num(acc.importo) + ' € del ' + dataIt(acc.data) + ' per ' + G.nomeSoggetto(s) + '.\n\nVuoi collegarlo a questa partita (FT ' + s.documento + ', residuo ' + num(G.residuo(s)) + ' €)?\n\nSì = collega l\'acconto · No = registra ' + normale,
      pulsanti: [{ t: 'Sì', az: () => {
        const imp = Math.min(acc.importo, G.residuo(s));
        s.incassi = s.incassi || []; s.incassi.push({ id: G.nuovoId(), data: acc.data, importo: imp, conto: acc.conto, tipo: 'ACCONTO', note: acc.note, operatore: G.operatore ? G.operatore.nome : '' });
        s.pagato = r2(G.pagatoScad(s) + imp); s.stato = s.pagato >= s.importo - 0.005 ? 'PAGATA' : 'PARZIALE';
        acc.collegato = s.id; G.salva(); u.msg = { colore: 'var(--verde)', testo: 'Acconto collegato ✓' }; G.ridisegna();
      } }, { t: 'No', az: apri }, { t: 'Annulla', annulla: true }] });
  };
  A['pg-tutto'] = () => { const s = G.selezionato('scad'); if (s) document.getElementById('pg-imp').value = n2(G.residuo(s)); };
  A['pg-ok'] = () => {
    const u = sc(), s = G.selezionato('scad'); if (!s) return;
    const conto = val('pg-conto'); if (!conto) { pnMsg('Scegli il conto.'); return; }
    const imp = G.leggiNum(val('pg-imp')); if (imp <= 0) { pnMsg('Importo non valido.'); return; }
    const data = G.valoreDp('pg-data') || G.OGGI;
    registraPagamento(s, imp, data, conto, val('pg-note').trim());
    G.salva(); u.pannello = null;
    const voce = vociConto().find((v) => v[0] === conto);
    u.msg = { colore: 'var(--verde)', testo: (s.tipo === 'ATTIVA' ? 'Incasso' : 'Pagamento') + ' registrato ✓ ' + num(imp) + ' € del ' + dataIt(data) + ' su «' + voce[1] + '» · lo trovi in Prima nota a quella data' };
    G.ridisegna();
  };
  A['scad-storna'] = () => { const u = sc(), s = G.selezionato('scad'); if (!s) return; u.pannello = { tipo: 'storno', msg: (s.incassi || []).length ? null : { colore: 'var(--rosso)', testo: 'Di questa partita non risulta nessun incasso registrato col programma (forse arriva dal vecchio gestionale): per correggerla usa «Modifica…».' } }; G.deseleziona('storni'); G.ridisegna(); };
  A['st-ok'] = () => {
    const S = G.S, u = sc(), s = G.selezionato('scad'), i = G.selezionato('storni'); if (!s || !i) return;
    const vero = s.incassi.find((x) => x.id === i.id);
    G.msgbox({ titolo: 'Annulla incasso', icona: 'avviso', predefinito: 1, testo: 'Annullo ' + (s.tipo === 'ATTIVA' ? 'l\'incasso' : 'il pagamento') + ' di ' + num(vero.importo) + ' € del ' + dataIt(vero.data) + ' su «' + contoNome(vero.conto) + '»?\n\nLa partita torna aperta per quella cifra e il movimento sparisce dalla prima nota.', pulsanti: [{ t: 'Sì', az: () => {
      s.incassi = s.incassi.filter((x) => x !== vero);
      s.pagato = r2(Math.max(0, G.pagatoScad(s) - vero.importo));
      s.stato = s.pagato >= s.importo - 0.005 ? 'PAGATA' : s.pagato > 0 ? 'PARZIALE' : 'APERTA';
      S.primaNota = S.primaNota.filter((m) => m.incassoId !== vero.id && !(m.rif === 'scad:' + s.id && m.data === vero.data && Math.abs(m.importo - vero.importo) < 0.005));
      if (vero.tipo === 'ACCONTO') { const a = S.acconti.find((x) => x.collegato === s.id); if (a) a.collegato = null; }
      G.log('Scadenza', vero.tipo === 'ACCONTO' ? 'Acconto di ' + num(vero.importo) + ' € scollegato dalla partita: torna libero · partita ' + s.stato.toLowerCase() : 'Annullato incasso/pagamento di ' + num(vero.importo) + ' € del ' + dataIt(vero.data) + ' · partita ' + s.stato.toLowerCase(), 'scad:' + s.id);
      G.salva(); u.pannello = null;
      u.msg = { colore: 'var(--verde)', testo: vero.tipo === 'ACCONTO' ? 'Acconto scollegato: la partita torna aperta per ' + num(vero.importo) + ' € e l\'acconto torna libero.' : (s.tipo === 'ATTIVA' ? 'Incasso' : 'Pagamento') + ' annullato: la partita torna aperta per ' + num(vero.importo) + ' € e il movimento è stato tolto dalla prima nota.' };
      G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };
  A['scad-modifica'] = () => { const u = sc(), s = G.selezionato('scad'); if (!s) return; u.pannello = { tipo: 'modifica', msg: null }; G.ridisegna(); };
  G.IN['md-cifre'] = () => {
    const s = G.selezionato('scad'); if (!s) return;
    const pag = G.leggiNum(val('md-pag'));
    const imp = s.tipo === 'PASSIVA' ? (G.leggiNum(val('md-imp')) || s.importo) : s.importo;
    const st = document.getElementById('md-stato');
    if (st && !st.dataset.mano) st.value = pag >= imp - 0.005 ? 'PAGATA' : pag > 0 ? 'PARZIALE' : 'APERTA';
  };
  G.CH['md-stato'] = (el) => { el.dataset.mano = '1'; };
  A['md-tutto'] = () => { const s = G.selezionato('scad'); if (!s) return; const imp = s.tipo === 'PASSIVA' ? (G.leggiNum(val('md-imp')) || s.importo) : s.importo; document.getElementById('md-pag').value = n2(imp); const st = document.getElementById('md-stato'); st.value = 'PAGATA'; st.dataset.mano = '1'; };
  A['md-ok'] = () => {
    const u = sc(), s = G.selezionato('scad'); if (!s) return;
    const testoPag = val('md-pag').trim();
    const pag = G.leggiNum(testoPag);
    if (testoPag === '' || pag < 0 || isNaN(pag)) { pnMsg('Il pagato non è un importo valido.'); return; }
    const scad = G.valoreDp('md-scad'); if (!scad) { pnMsg('Scegli la data di scadenza.'); return; }
    let imp = s.importo;
    if (s.tipo === 'PASSIVA') { imp = G.leggiNum(val('md-imp')); if (imp <= 0) { pnMsg('L\'importo della partita non è valido.'); return; } }
    const stato = val('md-stato');
    const fai = () => {
      const prima = { pagato: G.pagatoScad(s), stato: s.stato, scadenza: s.scadenza, importo: s.importo, metodo: s.metodo || '' };
      s.pagato = r2(pag); s.stato = stato; s.scadenza = scad;
      if (s.tipo === 'PASSIVA') { s.importo = r2(imp); s.metodo = val('md-metodo'); }
      G.log('Scadenza', 'Corretta a mano la partita di ' + G.nomeSoggetto(s) + ' · doc. ' + s.documento + ': pagato da ' + num(prima.pagato) + ' € a ' + num(s.pagato) + ' €, stato da ' + prima.stato + ' a ' + s.stato
        + (prima.scadenza !== s.scadenza ? ', scadenza dal ' + dataIt(prima.scadenza) + ' al ' + dataIt(s.scadenza) : '') + (Math.abs(prima.importo - s.importo) > 0.004 ? ', importo da ' + num(prima.importo) + ' € a ' + num(s.importo) + ' €' : '')
        + ((s.metodo || '') !== prima.metodo ? ', metodo da ' + prima.metodo + ' a ' + s.metodo : ''), 'scad:' + s.id);
      G.salva(); u.pannello = null;
      u.msg = { colore: 'var(--verde)', testo: 'Partita aggiornata: pagato ' + num(pag) + ' € su ' + num(s.importo) + ' €, stato ' + stato };
      G.ridisegna();
    };
    const mov = s.incassi || [];
    if (mov.length && Math.abs(pag - G.pagatoScad(s)) > 0.004) G.msgbox({ titolo: 'Correzione a mano', icona: 'avviso', testo: 'Su questa partita ci sono ' + mov.length + ' movimenti di prima nota per ' + num(somma(mov, (i) => i.importo)) + ' €.\n\nScrivendo «pagato ' + num(pag) + ' €» il conto non corrisponderà più agli incassi registrati.\n\nProcedo lo stesso?', pulsanti: [{ t: 'Sì', az: fai }, { t: 'No', annulla: true }] });
    else fai();
  };
  A['scad-elimina'] = () => {
    const S = G.S, u = sc(), s = G.selezionato('scad'); if (!s) return;
    const mov = (s.incassi || []).filter((i) => i.tipo !== 'ACCONTO');
    if (mov.length) {
      G.msgbox({ titolo: 'Questa partita non si può eliminare', icona: 'info', testo: (mov.length === 1 ? 'Su questa partita c\'è un movimento registrato in prima nota' : 'Su questa partita ci sono ' + mov.length + ' movimenti registrati in prima nota') + ' per ' + num(somma(mov, (i) => i.importo)) + ' €: sono soldi passati per la cassa di questo programma.\n\nPrima annullali con «Annulla incasso…» (la partita torna aperta e la prima nota si sistema), poi si può eliminare.' });
      return;
    }
    const doc = s.fatturaId ? 'fattura ' + G.numeroFattura(G.fattura(s.fatturaId)) : s.acquistoId ? 'documento di acquisto ' + s.documento : '';
    const testo = 'Tolgo dallo scadenzario la partita di ' + G.nomeSoggetto(s) + ':\n\ndocumento ' + s.documento + ' · importo ' + num(s.importo) + ' € · già segnati ' + num(G.pagatoScad(s)) + ' €\n' + (doc ? 'È collegata al ' + doc + ' di questo programma.\n' : 'Arriva dal vecchio gestionale.\n') + '\nNon si torna indietro. Procedo?';
    G.msgbox({ titolo: 'Elimina dallo scadenzario', icona: 'avviso', testo, pulsanti: [{ t: 'Sì', az: () => {
      S.scadenze = S.scadenze.filter((x) => x !== s);
      G.log('Scadenza', 'Eliminata dallo scadenzario la partita ' + (s.tipo === 'PASSIVA' ? 'da pagare' : 'da incassare') + ' di ' + G.nomeSoggetto(s) + ' · doc. ' + s.documento + ' · ' + num(s.importo) + ' € (già segnati ' + num(G.pagatoScad(s)) + ' €)', 'scad:' + s.id);
      G.deseleziona('scad'); G.salva(); u.pannello = null;
      u.msg = { colore: 'var(--verde)', testo: 'Partita eliminata: ' + G.nomeSoggetto(s) + ' · doc. ' + s.documento + ' · ' + num(s.importo) + ' €.' };
      G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };
  A['scad-insoluta'] = () => {
    const s = G.selezionato('scad'); if (!s) return;
    G.msgbox({ titolo: 'Insoluto', icona: 'domanda', testo: 'Segnare come INSOLUTA la partita di ' + G.nomeSoggetto(s) + ' (FT ' + s.documento + ', residuo ' + num(G.residuo(s)) + ' €)?', pulsanti: [{ t: 'Sì', az: () => { s.stato = 'INSOLUTA'; G.log('Scadenza', 'Partita segnata INSOLUTA', 'scad:' + s.id); G.salva(); G.ridisegna(); } }, { t: 'No', annulla: true }] });
  };
  A['scad-riapri'] = () => { const s = G.selezionato('scad'); if (!s) return; const p = G.pagatoScad(s); s.stato = p >= s.importo - 0.005 ? 'PARZIALE' : p > 0 ? 'PARZIALE' : 'APERTA'; if (p <= 0) s.stato = 'APERTA'; G.salva(); G.ridisegna(); };
  A['scad-nuova'] = () => { const u = sc(); u.pannello = { tipo: 'nuova', gia: false, msg: null }; G.ridisegna(); };
  G.CH['nv-gia'] = (el) => { const u = sc(); u.pannello.gia = el.checked; const c = document.getElementById('nv-conto'); if (c) c.disabled = !el.checked; const d = document.getElementById('dp-nv-datapag'); if (d) d.setAttribute('aria-disabled', String(!el.checked)); const b = document.querySelector('[data-az="nv-ok"]'); if (b) b.textContent = el.checked ? 'Crea e registra' : 'Crea'; };
  A['nv-ok'] = () => {
    const S = G.S, u = sc(), cli = u.tipo === 'ATTIVA';
    const sogg = G.valoreCombo('nv-sogg'); if (!sogg) { pnMsg(cli ? 'Scegli il cliente.' : 'Scegli il fornitore.'); return; }
    const imp = G.leggiNum(val('nv-imp')); if (imp <= 0) { pnMsg('Scrivi l\'importo.'); return; }
    const scad = G.valoreDp('nv-scad'); if (!scad) { pnMsg('Scegli la data di scadenza.'); return; }
    const gia = u.pannello.gia, conto = val('nv-conto'), dataPag = G.valoreDp('nv-datapag') || G.OGGI;
    if (gia && !conto) { pnMsg('Scegli il conto da cui sono usciti (o entrati) i soldi.'); return; }
    const s = { id: G.nuovoId(), tipo: u.tipo, soggettoId: sogg, fatturaId: null, documento: val('nv-num').trim(), dataDoc: G.valoreDp('nv-datadoc') || '', scadenza: scad, importo: r2(imp), pagato: 0, stato: 'APERTA', metodo: val('nv-metodo'), conto: '', note: val('nv-note').trim(), incassi: [] };
    S.scadenze.push(s);
    if (gia) registraPagamento(s, imp, dataPag, conto, s.note);
    G.log('Scadenza', 'Nuova partita ' + (cli ? 'da incassare da' : 'da pagare a') + ' ' + G.nomeSoggetto(s) + (s.documento ? ' · doc. ' + s.documento : '') + ' · ' + num(imp) + ' € · scadenza ' + dataIt(scad), 'scad:' + s.id);
    G.salva(); u.pannello = null;
    const testoSogg = (cli ? clientiLookup() : fornLookup()).find((x) => x.id === sogg).testo;
    u.msg = { colore: 'var(--verde)', testo: gia ? (cli ? 'Incasso' : 'Pagamento') + ' di ' + num(imp) + ' € a ' + testoSogg + ' registrato ✓ · partita saldata · in prima nota il ' + dataIt(dataPag) + ' su «' + vociConto().find((v) => v[0] === conto)[1] + '»'
      : 'Partita creata ✓ ' + testoSogg + ' · ' + num(imp) + ' € · scadenza ' + dataIt(scad) + (['Aperte', 'Tutte', 'APERTA'].includes(u.stato) ? '' : ' · la vedi col filtro «Aperte»') };
    G.ridisegna();
  };
  A['scad-acconto'] = () => { const u = sc(); u.pannello = { tipo: 'acconto', msg: null }; G.ridisegna(); };
  A['ac-ok'] = () => {
    const S = G.S, u = sc();
    const sogg = G.valoreCombo('ac-sogg'); if (!sogg) { pnMsg('Scegli il soggetto.'); return; }
    const imp = G.leggiNum(val('ac-imp')); if (imp <= 0) { pnMsg('Importo non valido.'); return; }
    const conto = val('ac-conto'); if (!conto) { pnMsg('Scegli il conto.'); return; }
    const data = G.valoreDp('ac-data') || G.OGGI;
    const acc = { id: G.nuovoId(), tipo: u.tipo, soggettoId: sogg, importo: r2(imp), data, conto, note: val('ac-note').trim(), collegato: null };
    S.acconti.push(acc);
    const nome = u.tipo === 'ATTIVA' ? (G.cli(sogg) || {}).nome : (G.forn(sogg) || {}).nome;
    S.primaNota.unshift({ id: G.nuovoId(), data, tipo: u.tipo === 'ATTIVA' ? 'ENTRATA' : 'USCITA', conto, importo: r2(imp), causale: 'ACCONTO', descr: 'Acconto ' + (u.tipo === 'ATTIVA' ? 'ricevuto' : 'versato'), soggetto: nome, rif: 'acc:' + acc.id, note: acc.note });
    G.log('Acconto', 'Acconto ' + (u.tipo === 'ATTIVA' ? 'ricevuto da' : 'versato a') + ' ' + nome + ' · ' + num(imp) + ' €', 'pag:' + acc.id);
    G.salva(); u.pannello = null;
    u.msg = { colore: 'var(--verde)', testo: 'Acconto registrato ✓ — per collegarlo a una fattura seleziona la partita e premi «Incassa / paga…»' };
    G.ridisegna();
  };
  A['scad-esporta'] = () => {
    const u = sc(), rows = righeScad(u);
    const nome = 'Scadenzario_' + (u.tipo === 'ATTIVA' ? 'incassi' : 'pagamenti') + '_' + G.OGGI.replace(/-/g, '') + '.csv';
    G.scaricaFile(nome, G.csv(['Soggetto', 'Doc.', 'Data doc.', 'Scadenza', 'Importo €', 'Pagato €', 'Residuo €', 'Stato', 'Metodo'], rows.map((s) => [G.nomeSoggetto(s), s.documento, dataIt(s.dataDoc), dataIt(s.scadenza), num(s.importo), num(G.pagatoScad(s)), num(G.residuo(s)), s.stato, s.metodo || ''])));
    u.msg = { colore: 'var(--testo-2)', testo: 'Esportato: ' + nome }; G.ridisegna();
  };

  G.documenti = { registraPagamento, vociConto, cercaArticoli, displayArt };
})();
