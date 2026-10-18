/* Fatture (nota di credito, accompagnatoria, fattura da DDT, PDF, XML, invio SDI ed email), finestre
   PEC / SDI, Email al cliente e Commercialista, Cronologia, PEC / Scarti SDI (con la correzione dello
   scarto) e Cestino. Ricopiate da FattureView, SdiWindow, MailWindow, CommercialistaWindow, CronologiaView,
   PecView, ScartoWindow e CestinoView. Nella demo niente esce davvero: SDI, PEC ed email sono simulati. */
(function () {
  'use strict';
  const G = window.GF;
  const { esc, num, qta, dataIt, somma, r2 } = G;
  const A = G.AZ;
  const btn = (testo, az, o) => { o = o || {}; return '<button class="btn' + (o.primario ? ' primario' : '') + (o.cls ? ' ' + o.cls : '') + '" data-az="' + az + '"' + (o.dis ? ' disabled' : '') + (o.id ? ' id="' + o.id + '"' : '') + (o.stile ? ' style="' + o.stile + '"' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + (o.dati || '') + '>' + esc(testo) + '</button>'; };
  const msgSpan = (m, stile) => '<span style="font-size:12px;' + (stile || '') + ';color:' + (m ? m.colore : 'inherit') + '">' + (m ? esc(m.testo) : '') + '</span>';
  const tb = (id, val, attr) => '<input class="tb" id="' + id + '" value="' + esc(val === null || val === undefined ? '' : val) + '"' + (attr || '') + ' autocomplete="off" spellcheck="false">';
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  const campo = (et, html, w, mr) => '<div style="width:' + w + 'px;margin:0 ' + (mr === undefined ? 14 : mr) + 'px 10px 0"><div class="muto">' + et + '</div><div style="margin-top:3px">' + html + '</div></div>';
  const prezzo2 = (n) => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
  const prezzoListino = (a, l) => (l === 'C' ? a.prezzoC : l === 'B' ? a.prezzoB : a.prezzoA) || a.prezzoA;
  const clientiLookup = (lista) => (lista || G.S.clienti).slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => ({ id: c.id, testo: c.codice + ' — ' + c.nome + (c.piva ? ' · P.IVA ' + c.piva : c.cf ? ' · CF ' + c.cf : '') }));
  const tipoDoc = (f) => (f.tipo === 'NC' ? 'NOTA_CREDITO' : f.tipo === 'FAC' ? 'ACCOMPAGNATORIA' : 'FATTURA');
  const nomeFile = (f) => 'IT' + G.S.negozio.piva + '_' + f.progressivo + '.xml';

  // ---------- XML FatturaPA (come FatturaElettronica.GeneraXml) ----------
  function xmlFattura(f) {
    const S = G.S, n = S.negozio, c = G.cli(f.clienteId) || {};
    const x = (s) => String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const m = G.metodo(f.metodoId);
    const fe = m ? m.fe : (G.interpretaPagamento(f.pagTesto) || { codice: 'MP05' }).codice;
    const scad = S.scadenze.find((s) => s.fatturaId === f.id);
    const reg = S.causaliIva.find((r) => r.id === f.causaleIvaId) || S.causaliIva[0];
    const t = G.totaliRighe(f.righe);
    const tdoc = f.tipo === 'NC' ? 'TD04' : f.ddtIds && f.ddtIds.length ? 'TD24' : 'TD01';
    const righe = f.righe.map((r, i) => {
      const pu = r.prezzo / (1 + r.iva / 100);
      return '      <DettaglioLinee>\n        <NumeroLinea>' + (i + 1) + '</NumeroLinea>\n        <Descrizione>' + x(r.descr) + '</Descrizione>\n        <Quantita>' + Number(r.qta).toFixed(2) + '</Quantita>\n        <UnitaMisura>' + x(r.um || 'PZ') + '</UnitaMisura>\n        <PrezzoUnitario>' + pu.toFixed(4) + '</PrezzoUnitario>\n'
        + (r.sconto ? '        <ScontoMaggiorazione><Tipo>SC</Tipo><Percentuale>' + Number(r.sconto).toFixed(2) + '</Percentuale></ScontoMaggiorazione>\n' : '')
        + '        <PrezzoTotale>' + (pu * r.qta * (1 - (r.sconto || 0) / 100)).toFixed(2) + '</PrezzoTotale>\n        <AliquotaIVA>' + Number(reg.natura ? 0 : r.iva).toFixed(2) + '</AliquotaIVA>\n' + (reg.natura ? '        <Natura>' + reg.natura + '</Natura>\n' : '') + '      </DettaglioLinee>';
    }).join('\n');
    const riep = t.riepilogo.map((r) => '      <DatiRiepilogo>\n        <AliquotaIVA>' + Number(reg.natura ? 0 : r.aliquota).toFixed(2) + '</AliquotaIVA>\n' + (reg.natura ? '        <Natura>' + reg.natura + '</Natura>\n' : '') + '        <ImponibileImporto>' + r.imponibile.toFixed(2) + '</ImponibileImporto>\n        <Imposta>' + (reg.natura ? '0.00' : r.imposta.toFixed(2)) + '</Imposta>\n        <EsigibilitaIVA>' + (reg.split ? 'S' : 'I') + '</EsigibilitaIVA>\n' + (reg.dicitura ? '        <RiferimentoNormativo>' + x(reg.dicitura.slice(0, 100)) + '</RiferimentoNormativo>\n' : '') + '      </DatiRiepilogo>').join('\n');
    const causali = [];
    if (f.note) { const s = f.note.replace(/€/g, 'EUR').replace(/[\r\n]+/g, ' '); for (let i = 0; i < s.length; i += 200) causali.push(s.slice(i, i + 200)); }
    if (reg.dicitura) causali.push(reg.dicitura);
    const ddt = (f.ddtIds || []).map((id) => G.ddtDa(id)).filter(Boolean).map((d) => '      <DatiDDT>\n        <NumeroDDT>' + d.numero + '</NumeroDDT>\n        <DataDDT>' + d.data + '</DataDDT>\n      </DatiDDT>').join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">\n  <FatturaElettronicaHeader>\n    <DatiTrasmissione>\n      <IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>' + n.piva + '</IdCodice></IdTrasmittente>\n      <ProgressivoInvio>' + f.progressivo + '</ProgressivoInvio>\n      <FormatoTrasmissione>FPR12</FormatoTrasmissione>\n      <CodiceDestinatario>' + x(c.sdi || '0000000') + '</CodiceDestinatario>\n' + (c.pec && (!c.sdi || c.sdi === '0000000') ? '      <PECDestinatario>' + x(c.pec) + '</PECDestinatario>\n' : '') + '    </DatiTrasmissione>\n'
      + '    <CedentePrestatore>\n      <DatiAnagrafici>\n        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>' + n.piva + '</IdCodice></IdFiscaleIVA>\n        <Anagrafica><Denominazione>' + x(n.ragione) + '</Denominazione></Anagrafica>\n        <RegimeFiscale>RF01</RegimeFiscale>\n      </DatiAnagrafici>\n      <Sede><Indirizzo>' + x(n.indirizzo) + '</Indirizzo><CAP>' + n.cap + '</CAP><Comune>' + x(n.citta) + '</Comune><Provincia>' + n.prov + '</Provincia><Nazione>IT</Nazione></Sede>\n    </CedentePrestatore>\n'
      + '    <CessionarioCommittente>\n      <DatiAnagrafici>\n' + (c.piva ? '        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>' + c.piva + '</IdCodice></IdFiscaleIVA>\n' : '') + (c.cf ? '        <CodiceFiscale>' + c.cf + '</CodiceFiscale>\n' : '') + '        <Anagrafica><Denominazione>' + x(c.nome) + '</Denominazione></Anagrafica>\n      </DatiAnagrafici>\n      <Sede><Indirizzo>' + x(c.indirizzo) + '</Indirizzo><CAP>' + x(c.cap) + '</CAP><Comune>' + x(c.citta) + '</Comune><Provincia>' + x(c.prov) + '</Provincia><Nazione>IT</Nazione></Sede>\n    </CessionarioCommittente>\n  </FatturaElettronicaHeader>\n'
      + '  <FatturaElettronicaBody>\n    <DatiGenerali>\n      <DatiGeneraliDocumento>\n        <TipoDocumento>' + tdoc + '</TipoDocumento>\n        <Divisa>EUR</Divisa>\n        <Data>' + f.data + '</Data>\n        <Numero>' + (f.tipo === 'FT' ? '' : f.tipo + ' ') + f.numero + '/' + f.anno + '</Numero>\n        <ImportoTotaleDocumento>' + t.totale.toFixed(2) + '</ImportoTotaleDocumento>\n' + causali.map((cz) => '        <Causale>' + x(cz) + '</Causale>\n').join('') + '      </DatiGeneraliDocumento>\n' + (ddt ? ddt + '\n' : '') + '    </DatiGenerali>\n'
      + '    <DatiBeniServizi>\n' + righe + '\n' + riep + '\n    </DatiBeniServizi>\n'
      + (f.tipo === 'NC' ? '' : '    <DatiPagamento>\n      <CondizioniPagamento>TP02</CondizioniPagamento>\n      <DettaglioPagamento>\n        <ModalitaPagamento>' + fe + '</ModalitaPagamento>\n' + (scad ? '        <DataScadenzaPagamento>' + scad.scadenza + '</DataScadenzaPagamento>\n' : '') + '        <ImportoPagamento>' + (reg.split ? t.imponibile : t.totale).toFixed(2) + '</ImportoPagamento>\n' + (['MP05', 'MP12', 'MP09'].includes(fe) ? '        <IBAN>' + n.iban.replace(/\s/g, '') + '</IBAN>\n' : '') + '      </DettaglioPagamento>\n    </DatiPagamento>\n')
      + '  </FatturaElettronicaBody>\n</p:FatturaElettronica>\n';
  }
  function apriXml(f) {
    const testo = esc(xmlFattura(f)).replace(/(&lt;\/?)([\w:.]+)/g, '$1<span class="tag">$2</span>');
    G.finestra({ titolo: nomeFile(f) + ' — Blocco note', larghezza: 820, altezza: 680, bianca: true, corpo: '<pre class="xml">' + testo + '</pre>' });
  }

  // =====================================================================
  // FATTURE
  // =====================================================================
  const ft = () => G.ui('fatture', () => ({ msg: null, pannello: null }));
  const statoPag = (f) => { if (f.tipo === 'NC') return 'APERTO'; const s = G.S.scadenze.find((x) => x.fatturaId === f.id); if (!s) return 'PAGATO'; return s.stato === 'PAGATA' ? 'PAGATO' : s.stato === 'PARZIALE' ? 'PARZIALE' : 'APERTO'; };
  const testoScadenza = (metodoId, testo) => { if (!metodoId && !(testo || '').trim()) return ''; const sc = G.scadenzaFattura(metodoId, testo, G.OGGI); return 'Scadenza nello scadenzario: ' + dataIt(sc) + (sc === G.OGGI ? ' (il giorno della fattura)' : ''); };
  G.VISTE.fatture = {
    nuova() { const u = ft(); u.msg = null; u.pannello = null; G.deseleziona('ft'); },
    render() {
      const S = G.S, u = ft();
      const rows = S.fatture.slice().sort((a, b) => (b.anno - a.anno) || b.data.localeCompare(a.data) || (b.numero - a.numero));
      const sel = G.selezionato('ft');
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="pila" style="margin-bottom:8px;flex:none"><div class="h1">Fatture</div><span class="muto" style="margin-left:16px">' + rows.length + ' fatture · ' + rows.filter((f) => !f.mail).length + ' non ancora inviate</span></div>'
        + '<div class="avvolgi" style="margin-bottom:10px">'
        + btn('Fattura da DDT', 'ft-diff', { stile: 'margin:0 8px 6px 0', title: 'Riepiloga in un\'unica fattura i DDT non ancora fatturati di un cliente' })
        + btn('Fattura accompagnatoria', 'ft-acc', { stile: 'margin:0 8px 6px 0', title: 'Fattura immediata che accompagna la merce (serie FAC): componi le righe ed emetti, il magazzino viene scaricato' })
        + btn('Nota di credito', 'ft-nc', { stile: 'margin:0 8px 6px 0', title: 'Storna la fattura selezionata con una nota di credito TD04 (seleziona prima la fattura nell\'elenco)' })
        + btn('PEC / SDI…', 'ft-sdiwin', { stile: 'margin:0 8px 6px 0', title: 'Invio delle fatture allo SDI via PEC, ricevute e scarico fatture fornitori' })
        + btn('Email al cliente…', 'ft-mailwin', { stile: 'margin:0 8px 6px 0', title: 'Casella email normale del negozio: server, password e testo con cui partono le fatture in PDF ai clienti' })
        + btn('Commercialista…', 'ft-comm', { stile: 'margin:0 20px 6px 0', title: 'Email del commercialista, invio automatico di ogni fattura emessa e registro di quelle inviate' })
        + btn('Apri PDF', 'ft-pdf', { primario: true, dis: !sel, stile: 'margin:0 8px 6px 0' }) + btn('Apri XML', 'ft-xml', { dis: !sel, stile: 'margin:0 8px 6px 0' })
        + btn('Invia per email al cliente', 'ft-invia', { dis: !sel, stile: 'margin:0 8px 6px 0', title: 'Manda il PDF della fattura agli indirizzi email della scheda cliente (tutti e due, se ne ha due)' })
        + btn('Invia SDI', 'ft-sdi', { dis: !sel, stile: 'margin:0 20px 6px 0', title: 'Trasmette QUESTO documento all\'Agenzia delle Entrate via PEC (senza aspettare l\'invio di fine mese)' })
        + btn('Annulla documento', 'ft-annulla', { dis: !sel, stile: 'margin:0 0 6px 0', title: 'Elimina la fattura / accompagnatoria / nota di credito selezionata se non è ancora stata inviata allo SDI ed è l\'ultima emessa: la merce torna in magazzino e il numero torna libero' }) + '</div>'
        + '<div class="col riempi" style="position:relative">' + G.dg('ft', {
          classe: 'riempi', righe: rows, chiave: (f) => f.id, onSel: () => G.ridisegna(), onDoppio: (f) => { G.scegliRiga('ft', f.id); A['ft-pdf'](); },
          colonne: [
            { k: 'num', t: 'Numero', w: 108, mono: true, v: G.numeroFattura, ordina: (f) => f.anno * 1e6 + f.numero }, { k: 'data', t: 'Data', w: 92, v: (f) => dataIt(f.data), ordina: (f) => f.data },
            { k: 'cli', t: 'Cliente', w: '*', v: (f) => (G.cli(f.clienteId) || {}).nome || '' }, { k: 'tot', t: 'Totale €', w: 100, n: true, v: (f) => num(f.totale), ordina: (f) => f.totale },
            { k: 'pag', t: 'Pagamento', w: 92, semi: true, v: statoPag, f: (f) => { const s = statoPag(f); return '<span style="color:' + (s === 'PAGATO' ? '#2E7D32' : s === 'PARZIALE' ? '#B07400' : 'inherit') + '">' + s + '</span>'; } },
            { k: 'fe', t: 'Fattura el.', w: 94, v: (f) => f.sdi }, { k: 'mail', t: 'Email', w: 120, v: (f) => (f.mail || 'Non inviata') },
          ],
        }) + (u.pannello ? '<div class="card scorri" id="ft-pannello" style="position:absolute;left:0;right:0;top:0;z-index:5;max-height:100%;overflow:auto">' + this.pannello(u) + '</div>' : '') + '</div>'
        + '<div style="margin-top:10px;font-size:12.5px;min-height:17px;color:' + (u.msg ? u.msg.colore : 'var(--testo-2)') + '">' + (u.msg ? esc(u.msg.testo) : '') + '</div></div>';
    },
    pannello(u) {
      const S = G.S, p = u.pannello;
      if (p.tipo === 'nc') {
        const f = G.fattura(p.fatturaId);
        return '<div class="h2" style="font-size:17px;margin-bottom:4px">Nota di credito (storno fattura)</div><div class="muto" style="margin-bottom:12px">Storno TOTALE della fattura ' + esc(G.numeroFattura(f)) + ' — ' + esc((G.cli(f.clienteId) || {}).nome) + ' · ' + num(f.totale) + ' €. La partita aperta viene ridotta/chiusa.</div>'
          + '<div class="avvolgi basso">' + campo('Motivo *', tb('nc-motivo', p.motivo || '', ' data-in="ftp-campo" data-k="motivo"'), 360) + '<label class="chk" style="margin:0 14px 18px 0"><input type="checkbox" id="nc-mag" checked>La merce rientra in magazzino</label></div>'
          + '<div class="riga">' + btn('Emetti nota di credito', 'nc-ok', { primario: true, stile: 'padding:7px 20px' }) + btn('Annulla', 'ftp-chiudi', { stile: 'margin-left:10px;padding:7px 18px' }) + msgSpan(p.msg, 'margin-left:16px') + '</div>';
      }
      if (p.tipo === 'acc') {
        const art = p.artSel ? G.art(p.artSel) : null;
        return '<div class="h2" style="font-size:17px;margin-bottom:4px">Fattura accompagnatoria (serie FAC)</div><div class="muto" style="margin-bottom:12px">La fattura che viaggia con la merce: scegli il cliente, aggiungi gli articoli ed emetti. Il magazzino viene scaricato e l\'XML FatturaPA generato (numerazione FAC separata).</div>'
          + '<div class="avvolgi">' + campo('Cliente *', G.cmb('acc-cli', { voci: clientiLookup(), valore: p.clienteId, title: 'Scrivi una parte qualsiasi del nome (anche in mezzo): la lista si restringe da sola', onScegli: (v) => { p.clienteId = v; const c = v ? G.cli(v) : null; p.listino = c ? c.listino : 'A'; if (p.artSel) p.prezzo = prezzo2(prezzoListino(G.art(p.artSel), p.listino)); G.ridisegna(); } }), 300)
          + '<div style="width:220px;margin:0 14px 10px 0"><div class="muto">Pagamento</div><div style="margin-top:3px">' + G.sel('data-ch="acc-pag"', S.metodi.slice().sort(ordMetodi).map((m) => [m.id, m.nome]), p.metodoId) + '</div><div class="muto" style="margin-top:4px">' + esc(testoScadenza(p.metodoId, '')) + '</div></div>'
          + campo('Regime IVA', G.sel('data-ch="acc-reg"', S.causaliIva.map((c) => [c.id, c.codice + ' — ' + c.descr]), p.regimeId), 220)
          + campo('Note (in fattura e nella Causale XML)', '<textarea class="tb" id="acc-note" data-in="ftp-campo" data-k="note" maxlength="1000" style="height:40px;max-height:58px" title="Testo libero (es. CIG, riferimento dell\'ordine, IBAN): si stampa sulla fattura sotto gli articoli e va nel campo «Causale» dell\'XML per lo SDI">' + esc(p.note || '') + '</textarea>', 280) + '</div>'
          + '<div style="background:#F4F6F8;border-radius:8px;padding:10px;margin-bottom:8px"><div class="muto" style="margin-bottom:4px">Aggiungi articolo (il prezzo segue il listino A/B/C del cliente)</div>'
          + tb('acc-cerca', p.q || '', ' data-in="acc-cerca"') + '<div class="lb" id="acc-ris" style="height:120px;margin:6px 0">' + risAcc(p) + '</div>'
          + '<div class="avvolgi basso"><div style="width:300px;margin-right:12px"><div class="muto">Articolo</div><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (art ? esc(G.documenti.displayArt(art)) : '—') + '</div></div>'
          + '<div style="width:80px;margin-right:12px"><div class="muto">Q.tà</div>' + tb('acc-qta', p.qta || '1', ' data-in="ftp-campo" data-k="qta" inputmode="decimal"') + '</div>'
          + '<div style="width:110px;margin-right:12px"><div class="muto">Prezzo</div>' + tb('acc-prezzo', p.prezzo || '', ' data-in="ftp-campo" data-k="prezzo" inputmode="decimal"') + '</div>' + btn('Aggiungi riga', 'acc-aggiungi') + '</div></div>'
          + G.dg('acc-righe', { stile: 'max-height:200px;margin-bottom:8px', righe: p.righe, chiave: (r) => r.k, colonne: [
            { k: 'codice', t: 'Codice', w: 100, mono: true }, { k: 'descr', t: 'Descrizione', w: '*' }, { k: 'qta', t: 'Q.tà', w: 62, n: true, v: (r) => qta(r.qta), input: { ch: 'acc-cella', cls: 'modifica' } },
            { k: 'prezzo', t: 'Prezzo', w: 80, n: true, v: (r) => num(r.prezzo), input: { ch: 'acc-cella', cls: 'modifica' } }, { k: 'sconto', t: 'Sconto %', w: 70, n: true, v: (r) => (r.sconto ? G.dec(r.sconto) : '0'), input: { ch: 'acc-cella', cls: 'modifica' } },
            { k: 'tot', t: 'Totale', w: 88, n: true, semi: true, v: (r) => num(G.totaleRiga(r)) }] })
          + '<div class="riga">' + btn('Emetti fattura accompagnatoria', 'acc-emetti', { primario: true, stile: 'padding:7px 20px' }) + btn('Rimuovi riga', 'acc-rimuovi', { stile: 'margin-left:10px;padding:7px 14px' }) + btn('Annulla', 'ftp-chiudi', { stile: 'margin-left:10px;padding:7px 18px' })
          + '<span style="margin-left:16px;font-size:14px;font-weight:600">Totale: ' + num(somma(p.righe, G.totaleRiga)) + ' €</span>' + msgSpan(p.msg, 'margin-left:16px') + '</div>';
      }
      if (p.tipo === 'diff') {
        const conDdt = S.clienti.filter((c) => S.ddt.some((d) => d.clienteId === c.id && !d.fatturaId));
        const ddt = p.clienteId ? S.ddt.filter((d) => d.clienteId === p.clienteId && !d.fatturaId).sort((a, b) => a.data.localeCompare(b.data)) : [];
        const pagVoci = S.metodi.slice().sort(ordMetodi).map((m) => ({ id: m.id, testo: m.nome }));
        return '<div class="h2" style="font-size:17px;margin-bottom:4px">Fattura da DDT (riepilogativa di fine mese)</div><div class="muto" style="margin-bottom:12px">Seleziona il cliente e spunta i DDT da riepilogare: la fattura non riscarica il magazzino (già scaricato dai DDT) e nell\'XML riporta i riferimenti dei DDT (TD24).</div>'
          + '<div class="avvolgi">' + campo('Cliente *', G.cmb('diff-cli', { voci: clientiLookup(conDdt), valore: p.clienteId, title: 'Scrivi una parte qualsiasi del nome (anche in mezzo): la lista si restringe da sola', onScegli: (v) => scegliClienteDiff(p, v) }), 280)
          + campo('Regime IVA', G.sel('data-ch="diff-reg"', S.causaliIva.map((c) => [c.id, c.codice + ' — ' + c.descr]), p.regimeId), 200)
          + '<div style="width:280px;margin:0 14px 10px 0"><div class="muto">Pagamento (scegli o scrivi)</div><div style="margin-top:3px">' + G.cmb('diff-pag', { voci: pagVoci, valore: p.metodoId, testoLibero: p.pagTesto || '', libero: true, title: 'Scegli dall\'elenco oppure scrivi il pagamento come deve comparire in fattura (es. \'Bonifico 45 gg d.f.\', \'RiBa 60/90 fine mese\'): codice per lo SDI e scadenza si ricavano dal testo', onScrivi: (t, v) => { p.pagTesto = t; p.metodoId = v; const el = document.getElementById('diff-scad'); if (el) el.textContent = testoScadenza(v, v ? '' : t); }, onScegli: (v) => { p.metodoId = v; p.pagTesto = v ? G.metodo(v).nome : p.pagTesto; G.ridisegna(); } })
          + '</div><div class="muto" id="diff-scad" style="margin-top:4px">' + esc(testoScadenza(p.metodoId, p.metodoId ? '' : p.pagTesto)) + '</div></div></div>'
          + G.dg('diff-ddt', { stile: 'max-height:240px;margin-bottom:10px', righe: ddt, chiave: (d) => d.id, colonne: [
            { k: 'sel', t: '✔', w: 40, c: true, v: (d) => (p.scelti.includes(d.id) ? '1' : ''), f: (d) => '<label class="chk"><input type="checkbox" data-ch="diff-spunta" data-id="' + d.id + '"' + (p.scelti.includes(d.id) ? ' checked' : '') + '></label>' },
            { k: 'num', t: 'DDT n.', w: 80, v: (d) => d.numero }, { k: 'data', t: 'Data', w: 100, v: (d) => dataIt(d.data) }, { k: 'tot', t: 'Totale €', w: 110, n: true, v: (d) => num(d.totale) }] })
          + '<div class="riga">' + btn('Emetti fattura differita', 'diff-emetti', { primario: true, stile: 'padding:7px 20px' }) + btn('Seleziona tutti', 'diff-tutti', { stile: 'margin-left:10px;padding:7px 14px' }) + btn('Annulla', 'ftp-chiudi', { stile: 'margin-left:10px;padding:7px 18px' })
          + msgSpan(p.msg || (p.clienteId ? { colore: 'var(--verde)', testo: ddt.length + ' DDT — totale ' + num(somma(ddt, (d) => d.totale)) + ' €' } : { colore: 'var(--verde)', testo: conDdt.length ? conDdt.length + ' clienti con DDT da fatturare' : 'Non ci sono DDT da fatturare.' }), 'margin-left:16px') + '</div>';
      }
      return '';
    },
  };
  // metodi nell'ordine della tendina del programma: prima quelli a vista, poi bonifici, poi ri.ba.
  const ordMetodi = (a, b) => ((a.giorni > 0) - (b.giorni > 0)) || ((a.fe === 'MP12') - (b.fe === 'MP12')) || (a.giorni - b.giorni) || (a.id - b.id);
  function risAcc(p) { return (p.risultati || []).map((a) => '<button class="lb-voce' + (p.artSel === a.id ? ' scelta' : '') + '" data-az="acc-ris" data-id="' + a.id + '">' + esc(G.documenti.displayArt(a)) + '</button>').join(''); }
  function scegliClienteDiff(p, v) {
    // come DiffCliente_Changed: si propone il pagamento scritto nella scheda del cliente e si spuntano tutti i suoi DDT
    p.clienteId = v; p.msg = null;
    p.scelti = v ? G.S.ddt.filter((d) => d.clienteId === v && !d.fatturaId).map((d) => d.id) : [];
    const c = v ? G.cli(v) : null;
    if (c && c.pagTesto) { p.metodoId = null; p.pagTesto = c.pagTesto; if (G.COMBO['diff-pag']) { G.COMBO['diff-pag'].valore = null; G.COMBO['diff-pag'].testo = c.pagTesto; } }
    G.ridisegna();
  }
  A['ftp-chiudi'] = () => { ft().pannello = null; G.ridisegna(); };
  G.IN['ftp-campo'] = (el) => { ft().pannello[el.dataset.k] = el.value; };
  // ---- nota di credito ----
  A['ft-nc'] = () => {
    const u = ft(), f = G.selezionato('ft');
    if (!f || f.tipo === 'NC') { u.msg = { colore: 'var(--rosso)', testo: 'Per emettere una nota di credito seleziona prima nell\'elenco la fattura da stornare.' }; G.ridisegna(); return; }
    u.pannello = { tipo: 'nc', fatturaId: f.id, motivo: '', msg: null }; G.ridisegna();
  };
  A['nc-ok'] = () => {
    const S = G.S, u = ft(), p = u.pannello, f = G.fattura(p.fatturaId);
    const motivo = val('nc-motivo').trim();
    if (!motivo) { p.msg = { colore: 'var(--rosso)', testo: 'Indica il motivo dello storno.' }; G.ridisegna(); return; }
    const rientra = document.getElementById('nc-mag').checked;
    G.msgbox({ titolo: 'Conferma nota di credito', icona: 'avviso', testo: 'Sei sicuro di voler stornare la fattura ' + G.numeroFattura(f) + ' con una nota di credito?', pulsanti: [{ t: 'Sì', az: () => {
      const righe = f.righe.map((r) => Object.assign({}, r));
      const anno = Number(G.OGGI.slice(0, 4));
      const nc = { id: G.nuovoId(), tipo: 'NC', numero: ++S.numeri.nc, anno, data: G.OGGI, clienteId: f.clienteId, righe, imponibile: f.imponibile, iva: f.iva, totale: f.totale, metodoId: f.metodoId, pagTesto: f.pagTesto, ddtIds: [], sdi: 'GENERATO', mail: '', progressivo: String(++S.numeri.progressivo).padStart(5, '0'), causaleIvaId: f.causaleIvaId, note: motivo, origineId: f.id, rientro: rientra, ridotto: 0 };
      S.fatture.push(nc);
      if (rientra) righe.forEach((r) => { const a = G.art(r.artId); if (a) a.giac = r2(a.giac + r.qta); });
      const s = S.scadenze.find((x) => x.fatturaId === f.id);
      if (s) { const prima = s.importo; s.importo = r2(Math.max(G.pagatoScad(s), s.importo - nc.totale)); nc.ridotto = r2(prima - s.importo); s.stato = G.pagatoScad(s) >= s.importo - 0.005 ? 'PAGATA' : G.pagatoScad(s) > 0 ? 'PARZIALE' : 'APERTA'; }
      G.indicizza(); G.log('NotaCredito', 'Emessa nota di credito n. ' + nc.numero + ' su fattura n. ' + f.numero + ' (' + motivo + ') · € ' + G.z2(nc.totale) + (rientra ? ' · merce rientrata' : ''), 'doc:' + nc.id); G.salva();
      u.pannello = null; u.msg = { colore: 'var(--verde)', testo: 'Nota di credito n. ' + nc.numero + ' emessa (XML TD04 generato).' }; G.deseleziona('ft'); G.ridisegna();
      G.apriDocumento(G.docDaFattura(nc));
    } }, { t: 'No', annulla: true }] });
  };
  // ---- accompagnatoria ----
  A['ft-acc'] = () => { ft().pannello = { tipo: 'acc', clienteId: null, metodoId: 1, regimeId: 1, note: '', q: '', risultati: [], artSel: null, qta: '1', prezzo: '', listino: 'A', righe: [], msg: null }; if (G.COMBO['acc-cli']) G.COMBO['acc-cli'].valore = null; G.ridisegna(); };
  G.CH['acc-pag'] = (el) => { ft().pannello.metodoId = Number(el.value); G.ridisegna(); };
  G.CH['acc-reg'] = (el) => { ft().pannello.regimeId = Number(el.value); };
  G.IN['acc-cerca'] = (el) => { const p = ft().pannello; p.q = el.value; p.risultati = G.documenti.cercaArticoli(p.q); const b = document.getElementById('acc-ris'); if (b) b.innerHTML = risAcc(p); };
  A['acc-ris'] = (el) => { const p = ft().pannello; const a = G.art(Number(el.dataset.id)); p.artSel = a.id; p.prezzo = prezzo2(prezzoListino(a, p.listino)); if (!String(p.qta || '').trim()) p.qta = '1'; G.ridisegna(); };
  A['acc-aggiungi'] = () => {
    const p = ft().pannello;
    if (!p.artSel) { p.msg = { colore: 'var(--rosso)', testo: 'Seleziona un articolo dall\'elenco.' }; G.ridisegna(); return; }
    const q = G.leggiNum(p.qta); if (q <= 0) { p.msg = { colore: 'var(--rosso)', testo: 'Quantità non valida.' }; G.ridisegna(); return; }
    const a = G.art(p.artSel);
    p.righe.push({ k: G.nuovoId(), artId: a.id, codice: a.codice, descr: a.descr, um: a.um, qta: q, prezzo: G.leggiNum(p.prezzo), sconto: 0, iva: a.iva, listino: p.listino });
    p.q = ''; p.risultati = []; p.artSel = null; p.prezzo = ''; p.qta = '1'; p.msg = null; G.ridisegna();
  };
  G.CH['acc-cella'] = (el) => { const p = ft().pannello; const r = p.righe.find((x) => String(x.k) === el.dataset.r); if (!r) return; const v = G.leggiNum(el.value); if (el.dataset.k === 'qta') r.qta = v; else if (el.dataset.k === 'prezzo') r.prezzo = v; else r.sconto = v; G.ridisegna(); };
  A['acc-rimuovi'] = () => { const p = ft().pannello; const r = G.selezionato('acc-righe'); if (r) { p.righe = p.righe.filter((x) => x !== r); G.deseleziona('acc-righe'); G.ridisegna(); } };
  A['acc-emetti'] = () => {
    const S = G.S, u = ft(), p = u.pannello;
    if (!p.righe.length) { p.msg = { colore: 'var(--rosso)', testo: 'Aggiungi almeno una riga.' }; G.ridisegna(); return; }
    const c = p.clienteId ? G.cli(p.clienteId) : null;
    if (!c || (!c.piva && !c.cf)) { p.msg = { colore: 'var(--rosso)', testo: 'Seleziona il cliente (con P.IVA o codice fiscale).' }; G.ridisegna(); return; }
    const reg = S.causaliIva.find((x) => x.id === p.regimeId) || S.causaliIva[0];
    const righe = p.righe.map((r) => Object.assign({}, r, { iva: reg.natura ? 0 : r.iva }));
    const t = G.totaliRighe(righe), anno = Number(G.OGGI.slice(0, 4));
    const f = { id: G.nuovoId(), tipo: 'FAC', numero: ++S.numeri.fac, anno, data: G.OGGI, clienteId: c.id, righe, imponibile: t.imponibile, iva: t.iva, totale: t.totale, metodoId: p.metodoId, pagTesto: '', ddtIds: [], sdi: 'GENERATO', mail: '', progressivo: String(++S.numeri.progressivo).padStart(5, '0'), causaleIvaId: reg.id, note: (val('acc-note') || p.note || '').trim() };
    S.fatture.push(f);
    S.scadenze.push({ id: G.nuovoId(), tipo: 'ATTIVA', soggettoId: c.id, fatturaId: f.id, documento: String(f.numero), dataDoc: f.data, scadenza: G.scadenzaFattura(f.metodoId, '', f.data), importo: reg.split ? t.imponibile : t.totale, pagato: 0, stato: 'APERTA', metodo: G.metodo(f.metodoId).nome, conto: '', note: '', incassi: [] });
    righe.forEach((r) => { const a = G.art(r.artId); if (a) a.giac = r2(a.giac - r.qta); });
    G.indicizza(); G.log('Fattura', 'Emessa fattura accompagnatoria n. FAC ' + f.numero + ' a ' + c.nome + ' · € ' + G.z2(f.totale), 'doc:' + f.id); G.salva();
    u.pannello = null; u.msg = { colore: 'var(--verde)', testo: 'Fattura accompagnatoria FAC ' + f.numero + ' emessa · magazzino scaricato · XML generato.' }; G.deseleziona('ft');
    G.ridisegna(); G.apriDocumento(G.docDaFattura(f));
  };
  // ---- differita da DDT ----
  A['ft-diff'] = () => {
    const primo = G.S.metodi.slice().sort(ordMetodi)[0];
    ft().pannello = { tipo: 'diff', clienteId: null, regimeId: 1, metodoId: primo.id, pagTesto: primo.nome, scelti: [], msg: null };
    if (G.COMBO['diff-cli']) G.COMBO['diff-cli'].valore = null;
    if (G.COMBO['diff-pag']) { G.COMBO['diff-pag'].valore = primo.id; G.COMBO['diff-pag'].testo = primo.nome; }
    G.ridisegna();
  };
  G.CH['diff-reg'] = (el) => { ft().pannello.regimeId = Number(el.value); };
  G.CH['diff-spunta'] = (el) => { const p = ft().pannello; const id = Number(el.dataset.id); p.scelti = el.checked ? p.scelti.concat([id]) : p.scelti.filter((x) => x !== id); };
  A['diff-tutti'] = () => { const p = ft().pannello; if (!p.clienteId) return; p.scelti = G.S.ddt.filter((d) => d.clienteId === p.clienteId && !d.fatturaId).map((d) => d.id); G.ridisegna(); };
  A['diff-emetti'] = () => {
    const S = G.S, u = ft(), p = u.pannello;
    if (!p.clienteId) { p.msg = { colore: 'var(--rosso)', testo: 'Scegli il cliente.' }; G.ridisegna(); return; }
    const ddt = S.ddt.filter((d) => p.scelti.includes(d.id) && !d.fatturaId).sort((a, b) => a.data.localeCompare(b.data));
    if (!ddt.length) { p.msg = { colore: 'var(--rosso)', testo: 'Spunta almeno un DDT.' }; G.ridisegna(); return; }
    const reg = S.causaliIva.find((x) => x.id === p.regimeId) || S.causaliIva[0];
    const pagTesto = (G.testoCombo('diff-pag') || p.pagTesto || '').trim();
    const metodoId = G.valoreCombo('diff-pag') || null;
    const righe = [].concat(...ddt.map((d) => d.righe.map((r) => Object.assign({}, r, { iva: reg.natura ? 0 : r.iva }))));
    const t = G.totaliRighe(righe), anno = Number(G.OGGI.slice(0, 4));
    const f = { id: G.nuovoId(), tipo: 'FT', numero: ++S.numeri.ft, anno, data: G.OGGI, clienteId: p.clienteId, righe, imponibile: t.imponibile, iva: t.iva, totale: t.totale, metodoId, pagTesto: metodoId ? '' : pagTesto, ddtIds: ddt.map((d) => d.id), sdi: 'GENERATO', mail: '', progressivo: String(++S.numeri.progressivo).padStart(5, '0'), causaleIvaId: reg.id, note: '' };
    S.fatture.push(f); ddt.forEach((d) => { d.fatturaId = f.id; });
    const met = metodoId ? G.metodo(metodoId) : null;
    S.scadenze.push({ id: G.nuovoId(), tipo: 'ATTIVA', soggettoId: p.clienteId, fatturaId: f.id, documento: String(f.numero), dataDoc: f.data, scadenza: G.scadenzaFattura(metodoId, pagTesto, f.data), importo: reg.split ? t.imponibile : t.totale, pagato: 0, stato: 'APERTA', metodo: met ? met.nome : pagTesto, conto: '', note: '', incassi: [] });
    G.indicizza(); G.log('Fattura', 'Emessa fattura differita n. ' + f.numero + ' (' + ddt.length + ' DDT) a ' + G.cli(p.clienteId).nome + ' · € ' + G.z2(f.totale), 'doc:' + f.id); G.salva();
    u.pannello = null; u.msg = { colore: 'var(--verde)', testo: 'Fattura differita n. ' + f.numero + ' emessa (' + ddt.length + ' DDT riepilogati, XML TD24 con riferimenti).' }; G.deseleziona('ft');
    G.ridisegna(); G.apriDocumento(G.docDaFattura(f));
  };
  // ---- PDF, XML, email, SDI, annullamento ----
  A['ft-pdf'] = () => { const u = ft(), f = G.selezionato('ft'); if (!f) return; const d = G.docDaFattura(f); G.apriDocumento(d); u.msg = { colore: 'var(--testo-2)', testo: 'PDF aperto: ' + d.file + '.pdf' }; G.ridisegna(); };
  A['ft-xml'] = () => { const u = ft(), f = G.selezionato('ft'); if (!f) return; apriXml(f); u.msg = { colore: 'var(--testo-2)', testo: 'XML aperto: ' + nomeFile(f) }; G.ridisegna(); };
  // casella email del negozio (MailWindow): nella demo è già configurata, con la password salvata
  const mailCfg = () => { const S = G.S; if (!S.mailCfg) S.mailCfg = { indirizzo: 'fatture@ferramentarossi.example', nome: '', smtp: 'ferramentarossi.example', sicurezza: 'SSL', porta: 465, copia: '', oggetto: '{tipo} n. {numero} del {data}', testo: 'Buongiorno {cliente},\n\nin allegato trovate la {tipo} n. {numero} del {data}, di {totale} euro.\n\nCordiali saluti\n{mittente}', pwdSalvata: true }; return S.mailCfg; };
  const titoloDoc = (f) => (f.tipo === 'NC' ? 'Nota di credito' : f.tipo === 'FAC' ? 'Fattura accompagnatoria' : 'Fattura');
  // le parole fra graffe come PostaCliente.Compila
  const compilaMail = (t, f) => String(t || '').replace(/\{cliente\}/g, (G.cli(f.clienteId) || {}).nome || '').replace(/\{tipo\}/g, titoloDoc(f)).replace(/\{numero\}/g, f.numero).replace(/\{anno\}/g, f.anno)
    .replace(/\{data\}/g, dataIt(f.data)).replace(/\{totale\}/g, num(f.totale)).replace(/\{mittente\}/g, mailCfg().nome || G.S.negozio.ragione);
  A['ft-invia'] = () => {
    const u = ft(), f = G.selezionato('ft'); if (!f) return;
    const c = G.cli(f.clienteId) || {};
    const dest = [c.email, c.email2].filter((x) => x && x.includes('@'));
    if (!dest.length) { u.msg = { colore: 'var(--rosso)', testo: (c.nome || 'Il cliente') + ' non ha nessun indirizzo email: scrivilo nella sua scheda, in «Email» o «Email 2».' }; G.ridisegna(); return; }
    const m = mailCfg();
    const chiediEManda = () => {
      const oggetto = compilaMail(m.oggetto, f);
      G.msgbox({ titolo: 'Invio della fattura al cliente', icona: 'domanda', testo: 'Mando il PDF della fattura n. ' + f.numero + ' del ' + dataIt(f.data) + ' a:\n\n' + dest.join('\n') + (oggetto ? '\n\nOggetto: ' + oggetto : '') + '\n\nProcedo?', pulsanti: [{ t: 'Sì', az: () => {
        // nella demo non parte nessuna email: si segna come inviata, come farebbe il programma
        f.mail = 'INVIATA';
        G.log('Email', 'Fattura inviata per email a ' + dest.join(', '), 'doc:' + f.id); G.salva();
        u.msg = { colore: 'var(--verde)', testo: dest.length === 1 ? titoloDoc(f) + ' n. ' + f.numero + ' inviata a ' + dest[0] + '.' : titoloDoc(f) + ' n. ' + f.numero + ' inviata a tutti e due gli indirizzi: ' + dest.join(', ') + '.' }; G.ridisegna();
      } }, { t: 'No', annulla: true }] });
    };
    if (mailPronta()) { chiediEManda(); return; }
    // casella non ancora pronta: come il programma, si propone di configurarla e poi si riprova
    G.msgbox({ titolo: 'Email al cliente', icona: 'domanda', testo: 'La casella email del negozio non è ancora pronta su questo computer.\n\nLa apro adesso per configurarla?', pulsanti: [{ t: 'Sì', az: () => {
      finestraMail(() => { if (mailPronta()) chiediEManda(); else { u.msg = { colore: 'var(--rosso)', testo: 'Email non inviata: manca ancora la configurazione della casella.' }; G.ridisegna(); } });
    } }, { t: 'No', annulla: true }] });
  };
  A['ft-sdi'] = () => {
    const u = ft(), f = G.selezionato('ft'); if (!f) return;
    const che = f.tipo === 'NC' ? 'nota di credito n. ' + f.numero + '/' + f.anno : f.tipo === 'FAC' ? 'fattura accompagnatoria FAC ' + f.numero + '/' + f.anno : 'fattura n. ' + f.numero + '/' + f.anno;
    G.msgbox({ titolo: 'Conferma invio allo SDI', icona: 'avviso', predefinito: 1, testo: 'Stai per inviare DAVVERO allo SDI (Agenzia delle Entrate) la ' + che + ' — ' + (G.cli(f.clienteId) || {}).nome + '.\n\nFile: ' + nomeFile(f) + '\nDestinatario PEC: ' + sdiCfg().sportello + '\n\nConfermi l\'invio?', pulsanti: [{ t: 'Sì', az: () => {
      if (f.sdi === 'SCARTATO') { u.msg = { colore: 'var(--rosso)', testo: 'La ' + che + ' e\' stata SCARTATA dallo SDI: va corretta e RIEMESSA. Non si puo\' rispedire lo stesso file, perche\' il suo numero di invio risulta gia\' usato.' }; G.ridisegna(); return; }
      if (f.sdi !== 'GENERATO') { u.msg = { colore: 'var(--rosso)', testo: 'La ' + che + ' risulta gia\' trasmessa allo SDI' + (f.inviatoIl ? ' il ' + dataIt(f.inviatoIl) + ' alle ' + (f.inviatoOra || '09:' + G.D.pad(f.id % 60)) : '') + ' (stato ' + f.sdi + '). Non va inviata due volte.' }; G.ridisegna(); return; }
      if (!sdiCfg().indirizzo) { u.msg = { colore: 'var(--rosso)', testo: 'Prima va configurata la casella PEC (pulsante «PEC / SDI…»).' }; G.ridisegna(); return; }
      // nella demo non parte nessuna PEC: lo stato diventa «INVIATO» come nel programma
      f.sdi = 'INVIATO'; f.inviatoIl = G.OGGI; f.inviatoOra = G.adessoIso().slice(11, 16); G.log('SDI', 'Inviata allo SDI via PEC la ' + che + ' (' + nomeFile(f) + ')', 'doc:' + f.id); G.salva();
      u.msg = { colore: 'var(--verde)', testo: nomeFile(f) + ' inviato a ' + sdiCfg().sportello + '. La ricevuta arrivera\' sulla PEC: usa «PEC / SDI…» → «Controlla e lavora ricevute».' }; G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };
  // annullamento come AnnullaDocumento.Esegui + Db.VerificaAnnulloDocumento: verifica, elenco degli effetti,
  // conferma con «No» proposto; fine(ok, messaggio) come l'esito che il programma mostra sotto l'elenco
  const tipoIt = (f) => (f.tipo === 'NC' ? 'nota di credito' : f.tipo === 'FAC' ? 'fattura accompagnatoria' : 'fattura');
  const numeroIt = (f) => (f.tipo === 'FAC' ? 'FAC ' : '') + f.numero + '/' + f.anno;
  function annullaFattura(f, fine) {
    const S = G.S, tIt = tipoIt(f), nIt = numeroIt(f);
    const s = S.scadenze.find((x) => x.fatturaId === f.id);
    const nc = f.tipo !== 'NC' ? S.fatture.find((x) => x.origineId === f.id) : null;
    const ultimo = Math.max(...S.fatture.filter((x) => x.tipo === f.tipo && x.anno === f.anno).map((x) => x.numero)) === f.numero;
    const blocco = f.sdi !== 'GENERATO' && f.sdi !== 'SCARTATO' ? 'La ' + tIt + ' n. ' + nIt + ' risulta già trasmessa allo SDI (stato ' + f.sdi + '): non si può annullare. ' + (f.tipo === 'NC' ? '' : 'Per correggerla emetti una nota di credito.')
      : s && G.pagatoScad(s) > 0 ? 'La ' + tIt + ' n. ' + nIt + ' ha già incassi registrati: eliminali prima dallo scadenzario.'
        : nc ? 'La fattura n. ' + nIt + ' è già stornata dalla nota di credito n. ' + nc.numero + ': la numerazione è a posto così.'
          : !ultimo ? 'Si può annullare solo l\'ULTIMA ' + tIt + ' emessa dell\'anno: la n. ' + nIt + ' non lo è, quindi cancellandola resterebbe un buco nella numerazione. ' + (f.tipo === 'NC' ? '' : 'Per correggerla emetti una nota di credito.') : null;
    if (blocco) { fine(false, blocco); return; }
    const effetti = [f.sdi === 'SCARTATO' ? 'il file XML ' + nomeFile(f) + ', che lo SDI aveva SCARTATO, viene eliminato' : 'il file XML ' + nomeFile(f) + ' viene eliminato (non era ancora stato inviato)'];
    // la differita non muove il magazzino (l'hanno già fatto i DDT); la nota di credito solo se la merce è rientrata
    const magazzino = f.tipo === 'FAC' || (f.tipo === 'NC' && f.rientro !== false);
    if (magazzino) effetti.push(f.tipo === 'NC' ? 'le quantità di ' + f.righe.length + ' righe vengono di nuovo scaricate dal magazzino (era un rientro merce)' : 'le quantità di ' + f.righe.length + ' righe tornano in magazzino (ricarico)');
    if (f.tipo === 'FT' && f.ddtIds.length) effetti.push('i DDT n. ' + f.ddtIds.map((id) => (G.ddtDa(id) || {}).numero).sort((x, y) => x - y).join(', ') + ' tornano «da fatturare»');
    const orig = f.tipo === 'NC' && f.origineId ? G.fattura(f.origineId) : null;
    if (orig) effetti.push('la fattura n. ' + orig.numero + ' torna in essere con la sua partita da incassare');
    if (s) effetti.push('la sua partita nello scadenzario viene eliminata');
    effetti.push('il numero ' + nIt + ' torna libero: il prossimo ' + tIt + ' avrà di nuovo questo numero');
    const art = f.tipo === 'NC' ? 'la nota di credito' : f.tipo === 'FAC' ? 'la fattura accompagnatoria' : 'la fattura';
    const cliente = (G.cli(f.clienteId) || {}).nome || '';
    G.msgbox({ titolo: 'Conferma annullamento', icona: 'avviso', predefinito: 1, testo: 'Vuoi ANNULLARE ' + art + ' n. ' + nIt + ' del ' + dataIt(f.data) + (cliente ? '\n' + cliente : '') + ' · ' + num(f.totale) + ' €\n\nCosa succede:\n' + effetti.map((x) => '  • ' + x).join('\n') + '\n\nIl documento viene eliminato definitivamente (resta traccia nella Cronologia).', pulsanti: [{ t: 'Sì', az: () => {
      if (magazzino) f.righe.forEach((r) => { const a = G.art(r.artId); if (a) a.giac = r2(a.giac + (f.tipo === 'NC' ? -r.qta : r.qta)); });
      if (f.tipo === 'FT') f.ddtIds.forEach((id) => { const d = G.ddtDa(id); if (d) d.fatturaId = null; });
      if (orig && f.ridotto) { const so = S.scadenze.find((x) => x.fatturaId === orig.id); if (so) { so.importo = r2(so.importo + f.ridotto); const pg = G.pagatoScad(so); so.stato = pg >= so.importo - 0.005 ? 'PAGATA' : pg > 0 ? 'PARZIALE' : 'APERTA'; } }
      S.scadenze = S.scadenze.filter((x) => x.fatturaId !== f.id);
      S.fatture = S.fatture.filter((x) => x !== f);
      if (f.anno === Number(G.OGGI.slice(0, 4))) { if (f.tipo === 'FAC') S.numeri.fac--; else if (f.tipo === 'NC') S.numeri.nc--; else S.numeri.ft--; }
      G.indicizza();
      G.log('Annullo', 'Annullato ' + tIt + ' n. ' + nIt + ' del ' + dataIt(f.data) + ' · ' + cliente + ' · € ' + G.z2(f.totale) + ' · ' + f.righe.length + ' righe · ' + effetti.join('; '), 'doc:' + f.id);
      G.salva();
      fine(true, tIt.charAt(0).toUpperCase() + tIt.slice(1) + ' n. ' + nIt + ' annullata: il numero ' + nIt + ' è di nuovo disponibile.');
    } }, { t: 'No', annulla: true }] });
  }
  A['ft-annulla'] = () => {
    const u = ft(), f = G.selezionato('ft'); if (!f) return;
    annullaFattura(f, (ok, testo) => { if (ok) G.deseleziona('ft'); u.msg = { colore: ok ? 'var(--verde)' : 'var(--rosso)', testo }; G.ridisegna(); });
  };

  // ridisegna una finestra lasciando com'erano i campi scritti e non ancora salvati, come una finestra vera;
  // «rifai» sono i campi che l'azione ha appena cambiato (o svuotato) e vanno presi dallo stato
  function aggiornaTenendo(o, rifai) {
    const v = {};
    o.el.querySelectorAll('.fin-corpo input[id], .fin-corpo textarea[id], .fin-corpo select[id]').forEach((el) => { if (!(rifai || []).includes(el.id)) v[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
    G.aggiornaFinestra(o);
    Object.keys(v).forEach((id) => { const el = document.getElementById(id); if (el) { if (el.type === 'checkbox') el.checked = v[id]; else el.value = v[id]; } });
  }
  const oraLog = () => G.adessoIso().slice(11, 19) + '  ';
  // il «Registro operazioni» delle finestre (ListBox: l'ultima riga in alto, vale finché la finestra è aperta)
  const registro = (righe, alto) => '<div class="card"><div class="muto" style="margin-bottom:6px">Registro operazioni</div><div class="lb" style="height:' + alto + 'px;min-height:0">' + righe.map((r) => '<div class="lb-voce" style="font:12px/18px var(--mono)">' + esc(r) + '</div>').join('') + '</div></div>';
  // etichetta di un campo larga quanto il campo: il testo che non ci sta resta tagliato, come un TextBlock
  const etichetta = (t, tip) => '<div class="muto" style="white-space:nowrap;overflow:hidden"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + esc(t) + '</div>';
  const campoF = (et, html, w, mr, tip) => '<div style="width:' + w + 'px;margin:0 ' + (mr === undefined ? 14 : mr) + 'px 10px 0">' + etichetta(et, tip) + '<div style="margin-top:3px">' + html + '</div></div>';
  const titoloSez = (t, mb) => '<div class="h2" style="font-size:16px;margin-bottom:' + (mb === undefined ? 10 : mb) + 'px">' + t + '</div>';

  // ---------- finestra PEC / SDI (SdiWindow) ----------
  // nella demo la casella è già configurata; niente parte davvero: invii e ricevute sono simulati
  const sdiCfg = () => { const S = G.S; if (!S.sdiCfg) S.sdiCfg = { indirizzo: 'ferramentarossi@pec.example', sportello: 'sdi01@pec.fatturapa.it', smtp: 'smtps.pec.aruba.it', smtpPorta: 465, imap: 'imaps.pec.aruba.it', imapPorta: 993, progBase: 9599, pwdSalvata: true }; return S.sdiCfg; };
  const meseScorso = () => { const d = G.D.daIso(G.D.piuGiorni(G.OGGI.slice(0, 8) + '01', -1)); return { mese: d.getMonth() + 1, anno: d.getFullYear() }; };
  function finestraSdi() {
    const S = G.S, c = sdiCfg(), sc = meseScorso(), annoOggi = Number(G.OGGI.slice(0, 4));
    const st = { mese: sc.mese, anno: sc.anno, zip: null, cfgMsg: null, invioMsg: '', ricMsg: null, log: [] };
    const o = G.finestra({ titolo: 'Fattura elettronica — canale PEC → SDI', larghezza: 880, altezza: 700,
      corpo: () => '<div class="fin-scorre" id="sdi-scorri" style="padding:14px 18px;overflow:auto;flex:1;min-height:0">'
        + '<div class="h1" style="font-size:19px">Fattura elettronica via PEC (canale SDI)</div><div class="muto" style="margin:4px 0 12px">Stesso flusso usato dal negozio dal 2019, ma automatico: il programma prepara lo ZIP del mese, lo invia dalla casella PEC allo sportello SDI, poi legge le ricevute (consegnata/scartata) e scarica le fatture dei fornitori.</div>'
        + '<div class="card" style="margin-bottom:12px">' + titoloSez('1 · Casella PEC (Aruba)') + '<div class="avvolgi">'
        + campoF('Indirizzo PEC *', tb('sdi-ind', c.indirizzo), 250)
        + campoF(c.pwdSalvata ? 'Password PEC (già salvata — riscrivi solo per cambiarla)' : 'Password PEC *', '<input class="pwd-wpf" type="password" id="sdi-pwd" autocomplete="new-password">', 180, 14, c.pwdSalvata ? 'Password PEC (già salvata — riscrivi solo per cambiarla)' : '')
        + campoF('Sportello SDI (destinatario)', tb('sdi-sport', c.sportello), 220)
        + campoF('Server invio (SMTP)', tb('sdi-smtp', c.smtp), 170) + campoF('Porta', tb('sdi-smtpp', c.smtpPorta), 60)
        + campoF('Server ricezione (IMAP)', tb('sdi-imap', c.imap), 170) + campoF('Porta', tb('sdi-imapp', c.imapPorta), 60)
        + campoF('Progressivo minimo file', tb('sdi-prog', c.progBase), 190, 14, 'Il vecchio gestionale è arrivato a 9598: il nuovo deve continuare da 9599, altrimenti lo SDI scarta i nomi file già usati') + '</div>'
        + '<div class="riga">' + btn('Salva configurazione', 'sdi-salva', { primario: true, stile: 'padding:7px 16px' }) + btn('Prova collegamento', 'sdi-prova', { stile: 'padding:7px 14px;margin-left:8px' }) + msgSpan(st.cfgMsg, 'margin-left:14px;max-width:380px') + '</div></div>'
        + '<div class="card" style="margin-bottom:12px">' + titoloSez('2 · Invio delle fatture del mese') + '<div class="avvolgi basso">'
        + campoF('Mese', G.sel('id="sdi-mese" data-ch="sdi-mese"', Array.from({ length: 12 }, (x, i) => G.D.pad(i + 1)), G.D.pad(st.mese)), 110, 10)
        + campoF('Anno', G.sel('id="sdi-anno" data-ch="sdi-anno"', [annoOggi - 1, annoOggi], st.anno), 90)
        + btn('Prepara ZIP', 'sdi-zip', { stile: 'padding:7px 16px;margin:0 8px 10px 0' })
        + btn('Invia via PEC allo SDI', 'sdi-invia', { primario: true, dis: !st.zip, stile: 'padding:7px 16px;margin:0 8px 10px 0' })
        + btn('Apri cartella ZIP', 'sdi-cartella', { dis: !st.zip, stile: 'padding:7px 12px;margin:0 0 10px 0', title: 'Se preferisci, puoi allegare lo ZIP alla PEC a mano come hai sempre fatto' }) + '</div>'
        + '<div class="muto" style="min-height:16px">' + esc(st.invioMsg) + '</div></div>'
        + '<div class="card" style="margin-bottom:12px">' + titoloSez('3 · Ricezione: ricevute SDI e fatture dei fornitori', 6) + '<div class="muto" style="margin-bottom:10px">Controlla la casella PEC: le ricevute aggiornano lo stato delle fatture (consegnata / scartata con motivo), le fatture di acquisto vengono scaricate e registrate con scadenze e allegati.</div>'
        + '<div class="riga">' + btn('Controlla casella adesso', 'sdi-controlla', { primario: true, stile: 'padding:7px 16px' }) + msgSpan(st.ricMsg, 'margin-left:14px') + '</div></div>'
        + registro(st.log, 150) + '</div>' });
    const scrivi = (t) => { st.log.unshift(oraLog() + t); };
    const daMandare = () => S.fatture.filter((f) => f.tipo === 'FT' && f.sdi === 'GENERATO' && f.data.startsWith(st.anno + '-' + G.D.pad(st.mese)));
    G.CH['sdi-mese'] = (el) => { st.mese = Number(el.value); };
    G.CH['sdi-anno'] = (el) => { st.anno = Number(el.value); };
    A['sdi-salva'] = () => {
      const ind = val('sdi-ind').trim();
      if (!ind.includes('@')) { st.cfgMsg = { colore: 'var(--rosso)', testo: 'Indirizzo PEC non valido.' }; aggiornaTenendo(o); return; }
      Object.assign(c, { indirizzo: ind, sportello: val('sdi-sport').trim(), smtp: val('sdi-smtp').trim(), smtpPorta: parseInt(val('sdi-smtpp'), 10) || 465, imap: val('sdi-imap').trim(), imapPorta: parseInt(val('sdi-imapp'), 10) || 993 });
      if (val('sdi-pwd')) c.pwdSalvata = true;   // nella demo la password non si conserva: basta sapere che c'è
      const pb = parseInt(val('sdi-prog').trim(), 10); if (pb > 0) c.progBase = pb;
      G.salva();
      st.cfgMsg = { colore: 'var(--verde)', testo: 'Configurazione salvata ✓ (password cifrata sul profilo Windows di questo PC)' }; scrivi('Configurazione PEC salvata');
      aggiornaTenendo(o, ['sdi-pwd']);
    };
    A['sdi-prova'] = () => {
      if (!c.indirizzo) { st.cfgMsg = { colore: 'var(--rosso)', testo: 'Collegamento fallito: Configura prima la casella PEC.' }; scrivi('Test fallito: Configura prima la casella PEC.'); aggiornaTenendo(o); return; }
      const t = 'Connessione OK (' + c.indirizzo + '): invio e ricezione funzionano. Messaggi in casella: ' + (1180 + S.fatture.length * 3) + '.';
      st.cfgMsg = { colore: 'var(--verde)', testo: t }; scrivi(t); aggiornaTenendo(o);
    };
    A['sdi-zip'] = () => {
      const f = daMandare(), mm = G.D.pad(st.mese);
      if (!f.length) { st.zip = null; st.invioMsg = 'Nessuna fattura da inviare per ' + mm + '/' + st.anno + ' (tutte già trasmesse o nessuna emessa).'; scrivi(st.invioMsg); aggiornaTenendo(o); return; }
      st.zip = { nome: 'IT' + S.negozio.piva + '_Z' + mm + String(st.anno % 100).padStart(2, '0') + '.zip', ids: f.map((x) => x.id), anno: st.anno, mese: st.mese };
      st.invioMsg = 'ZIP pronto: ' + st.zip.nome + ' — ' + f.length + ' fatture del ' + mm + '/' + st.anno + '. Puoi inviarlo col pulsante qui sopra, oppure allegarlo a mano alla PEC come sempre.';
      scrivi('ZIP preparato: ' + st.zip.nome + ' (' + f.length + ' fatture)');
      G.log('SDI', 'Preparato ZIP mese ' + mm + '/' + st.anno + ' con ' + f.length + ' fatture (' + st.zip.nome + ')'); G.salva();
      aggiornaTenendo(o);
    };
    // «Apri cartella ZIP»: sull'iPad il file preparato si salva in «File»
    A['sdi-cartella'] = () => { if (!st.zip) return; G.scaricaZip(st.zip.nome, st.zip.ids.map((id) => G.fattura(id)).filter(Boolean).map((x) => ({ nome: nomeFile(x), testo: xmlFattura(x), bom: false }))); };
    A['sdi-invia'] = () => {
      const z = st.zip; if (!z) return;
      G.msgbox({ titolo: 'Conferma invio allo SDI', icona: 'avviso', predefinito: 1, testo: 'Stai per inviare DAVVERO ' + z.ids.length + ' fatture allo SDI (Agenzia delle Entrate) via PEC.\n\nFile: ' + z.nome + '\nDestinatario: ' + c.sportello + '\n\nConfermi l\'invio?', pulsanti: [{ t: 'Sì', az: () => {
        if (!c.indirizzo) { st.invioMsg = 'Invio fallito: Configura prima la casella PEC. (le fatture restano DA INVIARE, nessun danno)'; scrivi('Invio fallito: Configura prima la casella PEC.'); aggiornaTenendo(o); return; }
        // nella demo non parte nessuna PEC: le fatture diventano «INVIATO» come nel programma
        const ora = G.adessoIso().slice(11, 16);
        z.ids.forEach((id) => { const f = G.fattura(id); if (f && f.sdi === 'GENERATO') { f.sdi = 'INVIATO'; f.inviatoIl = G.OGGI; f.inviatoOra = ora; } });
        G.log('SDI', 'Inviate allo SDI via PEC ' + z.ids.length + ' fatture');
        G.log('SDI', 'PEC inviata a ' + c.sportello + ': ' + z.nome + ' (' + z.ids.length + ' fatture)');
        let esito = 'PEC inviata a ' + c.sportello + ' con ' + z.ids.length + ' fatture. Le ricevute arriveranno sulla casella (controlla tra qualche minuto/ora).';
        scrivi(esito);
        st.zip = null;
        // al commercialista le fatture del mese che non ha ancora, in uno ZIP di PDF (se l'invio è acceso)
        if (commCfg().attivo) {
          const docs = docsDelMese(z.anno, z.mese, true);
          const r = docs.length ? inviaAlCommercialista(docs, 'Fatture di ' + nomeMese(z.anno, z.mese)) : { testo: 'il commercialista aveva già tutte le fatture di ' + nomeMese(z.anno, z.mese) };
          esito += ' · ' + r.testo; scrivi('Commercialista: ' + r.testo);
        }
        st.invioMsg = esito; G.salva();
        aggiornaTenendo(o);
      } }, { t: 'No', annulla: true }] });
    };
    A['sdi-controlla'] = () => {
      const e = lavoraRicevute();
      st.ricMsg = { colore: 'var(--verde)', testo: e.letti + ' messaggi letti · ' + e.ricevute + ' ricevute lavorate · 0 fatture di acquisto importate' };
      if (e.dettagli.length) e.dettagli.forEach(scrivi); else scrivi('Nessuna novità nella casella.');
      aggiornaTenendo(o);
    };
    return o;
  }
  // le ricevute dello SDI: inviate → consegnate (e dopo i 15 giorni, accettate per decorrenza dei termini)
  function lavoraRicevute(rileggi) {
    const S = G.S, dettagli = [];
    let ricevute = 0;
    const segna = (f, stato, messaggi) => { f.sdi = stato; ricevute++; const t = 'Fattura n. ' + f.numero + '/' + f.anno + ': ' + stato + (messaggi ? ' — ' + messaggi : ''); dettagli.push('✓ ' + t); G.log('SDI', t); };
    S.fatture.filter((f) => f.sdi === 'INVIATO').forEach((f) => segna(f, 'CONSEGNATO'));
    // la decorrenza dei termini arriva solo per le fatture alla Pubblica Amministrazione, dopo 15 giorni senza esito
    S.fatture.filter((f) => f.sdi === 'CONSEGNATO' && (G.cli(f.clienteId) || {}).tipoSogg === 'PA' && f.inviatoIl && f.inviatoIl < G.D.piuGiorni(G.OGGI, -15)).forEach((f) => segna(f, 'ACCETTATO', 'Decorrenza termini (accettata per silenzio-assenso).'));
    const letti = ricevute + (rileggi || 0);
    G.log('SDI', 'Controllo PEC: ' + letti + ' messaggi, ' + ricevute + ' ricevute, 0 acquisti importati'); G.salva();
    return { letti, ricevute, testo: 'Letti ' + letti + ' messaggi · ' + ricevute + ' ricevute lavorate', dettagli };
  }
  A['ft-sdiwin'] = () => finestraSdi();

  // ---------- finestra Email al cliente (MailWindow) ----------
  const TESTO_STD = 'Buongiorno {cliente},\n\nin allegato trovate la {tipo} n. {numero} del {data}, di {totale} euro.\n\nCordiali saluti\n{mittente}';
  const OGGETTO_STD = '{tipo} n. {numero} del {data}';
  const mailPronta = () => { const m = mailCfg(); return !!m.indirizzo && m.pwdSalvata; };
  function finestraMail(dopo) {
    const m = mailCfg();
    const st = { cfgMsg: null, provaMsg: null, log: [] };
    const etPwd = () => (m.pwdSalvata ? 'Password (già salvata — riscrivila solo per cambiarla)' : 'Password *');
    const o = G.finestra({ titolo: 'Email al cliente — casella del negozio', larghezza: 900, altezza: 720,
      corpo: () => '<div class="fin-scorre" id="mail-scorri" style="padding:14px 18px;overflow:auto;flex:1;min-height:0">'
        + '<div class="h1" style="font-size:19px">Invio delle fatture ai clienti per email</div><div class="muto" style="margin:4px 0 12px">Questa è la casella normale del negozio (quella di webmail.ferramentarossi.example), non la PEC: la PEC parla solo con l\'Agenzia delle Entrate, da qui invece parte il PDF della fattura al cliente.</div>'
        + '<div class="card" style="margin-bottom:12px">' + titoloSez('1 · La casella del negozio') + '<div class="avvolgi">'
        + campoF('Indirizzo email *', tb('ml-ind', m.indirizzo, ' title="Lo stesso che si usa per entrare in webmail.ferramentarossi.example"'), 250)
        + campoF(etPwd(), '<input class="pwd-wpf" type="password" id="ml-pwd" autocomplete="new-password">', 200, 14, etPwd())
        + campoF('Nome mittente', tb('ml-nome', m.nome, ' title="Il nome che il cliente vede nella posta. Se lo lasci vuoto viene usata la ragione sociale."'), 230)
        + campoF('Server invio (SMTP)', tb('ml-smtp', m.smtp), 230)
        + campoF('Sicurezza', G.sel('id="ml-sic" data-ch="ml-sic"', [['SSL', 'SSL — porta 465'], ['TLS', 'STARTTLS — porta 587']], m.sicurezza), 200)
        + campoF('Porta', tb('ml-porta', m.porta), 70)
        + campoF('Copia nascosta a (facoltativo)', tb('ml-copia', m.copia, ' title="Ogni fattura spedita arriva in copia anche a questo indirizzo, per tenerne traccia. Il cliente non lo vede."'), 250) + '</div>'
        + '<div class="riga">' + btn('Salva configurazione', 'ml-salva', { primario: true, stile: 'padding:7px 16px' }) + btn('Prova collegamento', 'ml-provacoll', { stile: 'padding:7px 14px;margin-left:8px', title: 'Si collega alla casella e controlla la password, senza mandare niente a nessuno' }) + msgSpan(st.cfgMsg, 'margin-left:14px;max-width:380px') + '</div>'
        + '<div class="muto" style="margin-top:10px;font-size:12px">Indirizzo, server e porta valgono per tutte le postazioni. La password, invece, resta cifrata sul profilo Windows del computer dove la scrivi: sul PC del negozio va salvata una volta anche lì.</div></div>'
        + '<div class="card" style="margin-bottom:12px">' + titoloSez('2 · Cosa legge il cliente', 4) + '<div class="muto" style="margin-bottom:10px">Si possono usare queste parole fra parentesi graffe, che vengono sostituite con i dati della fattura: {cliente}, {tipo}, {numero}, {anno}, {data}, {totale}, {mittente}.</div>'
        + '<div class="muto">Oggetto</div>' + tb('ml-ogg', m.oggetto, ' style="margin:3px 0 10px"')
        + '<div class="muto">Testo</div><textarea class="tb" id="ml-testo" style="height:130px;margin:3px 0 10px;resize:none">' + esc(m.testo) + '</textarea>'
        + '<div class="riga">' + btn('Rimetti il testo standard', 'ml-std', { stile: 'padding:7px 14px' }) + '<span class="muto" style="margin-left:14px;font-size:12px">Il PDF della fattura viene allegato da solo.</span></div></div>'
        + '<div class="card" style="margin-bottom:12px">' + titoloSez('3 · Prova d\'invio') + '<div class="riga basso"><div style="width:280px;flex:none"><div class="muto">Manda una email di prova a</div>' + tb('ml-provaa', m.indirizzo, ' style="margin-top:3px"') + '</div>'
        + btn('Manda la prova', 'ml-prova', { primario: true, stile: 'padding:7px 16px;margin-left:10px' }) + msgSpan(st.provaMsg, 'margin:0 0 8px 14px;max-width:330px') + '</div></div>'
        + registro(st.log, 110) + '</div>',
      dopoChiusa: dopo });
    const scrivi = (t) => { st.log.unshift(oraLog() + t); };
    // cambiando sicurezza si propone la porta giusta, se quella scritta era ancora l'altra standard
    G.CH['ml-sic'] = (el) => { const p = document.getElementById('ml-porta'); const v = p.value.trim(); if (el.value === 'SSL' && (v === '587' || v === '')) p.value = '465'; else if (el.value === 'TLS' && (v === '465' || v === '')) p.value = '587'; };
    A['ml-salva'] = () => {
      const ind = val('ml-ind').trim(), smtp = val('ml-smtp').trim(), copia = val('ml-copia').trim(), ssl = val('ml-sic') !== 'TLS';
      const errore = !ind.includes('@') ? 'L\'indirizzo email non è valido.' : !smtp ? 'Manca il server di invio (SMTP).' : copia && !copia.includes('@') ? 'L\'indirizzo della copia nascosta non è valido.' : null;
      if (errore) { st.cfgMsg = { colore: 'var(--rosso)', testo: errore }; aggiornaTenendo(o); return; }
      const porta = parseInt(val('ml-porta').trim(), 10);
      Object.assign(m, { indirizzo: ind, nome: val('ml-nome').trim(), smtp, sicurezza: ssl ? 'SSL' : 'TLS', porta: porta > 0 ? porta : (ssl ? 465 : 587), copia, oggetto: val('ml-ogg'), testo: val('ml-testo') });
      if (val('ml-pwd')) m.pwdSalvata = true;   // nella demo la password non si conserva: basta sapere che c'è
      G.log('Email', 'Aggiornata la configurazione della casella email del negozio'); G.salva();
      st.cfgMsg = m.pwdSalvata ? { colore: 'var(--verde)', testo: 'Configurazione salvata ✓ (la password è cifrata sul profilo Windows di questo PC)' } : { colore: 'var(--verde)', testo: 'Configurazione salvata, ma manca ancora la password: senza, le email non partono.' };
      scrivi('Configurazione salvata');
      aggiornaTenendo(o, ['ml-pwd', 'ml-porta']);
    };
    A['ml-provacoll'] = () => {
      if (!m.indirizzo) { st.cfgMsg = { colore: 'var(--rosso)', testo: 'Collegamento non riuscito: Manca l\'indirizzo della casella.' }; scrivi('Collegamento non riuscito: Manca l\'indirizzo della casella.'); aggiornaTenendo(o); return; }
      const t = 'Collegamento riuscito: ' + m.indirizzo + ' su ' + m.smtp + ':' + m.porta + '. La casella e\' pronta per mandare le fatture.';
      st.cfgMsg = { colore: 'var(--verde)', testo: t }; scrivi(t); aggiornaTenendo(o);
    };
    A['ml-std'] = () => {
      document.getElementById('ml-ogg').value = OGGETTO_STD; document.getElementById('ml-testo').value = TESTO_STD;
      st.cfgMsg = { colore: 'var(--testo-2)', testo: 'Testo standard rimesso: ricordati di salvare.' }; aggiornaTenendo(o);
    };
    A['ml-prova'] = () => {
      const a = val('ml-provaa').trim();
      // nella demo non parte niente: si risponde come il programma quando la prova è andata
      const errore = !m.indirizzo ? 'Manca l\'indirizzo della casella.' : !a ? 'Scrivi a chi mandare la prova.' : null;
      if (errore) { st.provaMsg = { colore: 'var(--rosso)', testo: 'Non inviata: ' + errore }; scrivi('Prova non inviata: ' + errore); aggiornaTenendo(o); return; }
      const t = 'Email di prova inviata a ' + a + ': controlla che sia arrivata.';
      G.log('Email', 'Inviata email di prova a ' + a); G.salva();
      st.provaMsg = { colore: 'var(--verde)', testo: t }; scrivi(t); aggiornaTenendo(o);
    };
  }
  A['ft-mailwin'] = () => finestraMail();

  // ---------- fatture al commercialista (InvioCommercialista + CommercialistaWindow) ----------
  const nomeMese = (anno, mese) => G.MESI_LUNGHI[mese - 1] + ' ' + anno;
  // nella demo l'invio è acceso dal mese corrente e lo ZIP del mese scorso è già partito con l'invio allo SDI
  const commCfg = () => {
    const S = G.S;
    if (!S.comm) {
      const sc = meseScorso(), chiave = sc.anno + '-' + G.D.pad(sc.mese);
      const prec = S.fatture.filter((f) => f.data.startsWith(chiave));
      const inviate = prec.filter((f) => f.tipo === 'FT' && f.sdi !== 'GENERATO' && f.inviatoIl).map((f) => f.inviatoIl).sort();
      const quando = inviate.length ? inviate[0] + 'T18:42:00' : null;
      const dal = quando && quando.slice(0, 10) < G.OGGI.slice(0, 8) + '01' ? quando.slice(0, 10) : G.OGGI.slice(0, 8) + '01';
      S.comm = { email: S.impostazioni.commercialista, attivo: true, attivoDal: dal, invii: [], arrivati: [] };
      if (quando && quando.slice(0, 10) <= G.OGGI) {
        S.comm.invii.push({ id: G.nuovoId(), quando, cosa: 'Fatture di ' + nomeMese(sc.anno, sc.mese) + ' · ' + prec.length + ' PDF', a: S.comm.email, esito: 'INVIATA', dett: '', post: 'UFFICIO-PC', fatture: prec.map((f) => f.id) });
        S.comm.arrivati = prec.map((f) => f.id);
      }
    }
    return S.comm;
  };
  const docsDelMese = (anno, mese, soloNonArrivati) => G.S.fatture.filter((f) => f.data.startsWith(anno + '-' + G.D.pad(mese)) && (!soloNonArrivati || !commCfg().arrivati.includes(f.id)));
  const nonArrivati = () => { const c = commCfg(); return c.attivoDal ? G.S.fatture.filter((f) => f.data >= c.attivoDal && !c.arrivati.includes(f.id)) : []; };
  // uno ZIP di PDF, una email, una riga nel registro (riuscita o no). Nella demo non parte nessuna email.
  function inviaAlCommercialista(docs, titolo) {
    const c = commCfg(), descr = titolo + ' · ' + docs.length + ' PDF';
    const riga = (esito, dett) => c.invii.unshift({ id: G.nuovoId(), quando: G.adessoIso(), cosa: descr, a: c.email, esito, dett, post: 'IPAD-DEMO', fatture: docs.map((f) => f.id) });
    if (!c.email.includes('@')) { riga('ERRORE', 'manca l\'indirizzo email del commercialista'); G.salva(); return { ok: false, testo: 'NON inviate al commercialista: manca il suo indirizzo email (Fatture → «Commercialista…»)' }; }
    if (!mailPronta()) { const motivo = 'la casella email del negozio non è ancora configurata'; riga('ERRORE', motivo); G.salva(); return { ok: false, testo: 'al commercialista sono partite 0 email su 1 — ' + motivo + '. Si rimanda da «Commercialista…»' }; }
    riga('INVIATA', '');
    docs.forEach((f) => { if (!c.arrivati.includes(f.id)) c.arrivati.push(f.id); });
    G.salva();
    return { ok: true, testo: docs.length + ' fatture in PDF inviate al commercialista in uno ZIP ✓' };
  }
  function finestraCommercialista() {
    const S = G.S, c = commCfg(), sc = meseScorso(), annoOggi = Number(G.OGGI.slice(0, 4));
    const st = { mese: sc.mese, anno: sc.anno, cfgMsg: null, regMsg: null };
    const o = G.finestra({ titolo: 'Fatture al commercialista', larghezza: 1000, altezza: 760,
      corpo: () => {
        const manc = nonArrivati();
        const info = !c.attivoDal ? { colore: 'var(--testo-2)', testo: 'L\'invio al commercialista non è ancora stato acceso: scrivi l\'indirizzo, spunta la casella qui sopra e salva.' }
          : !manc.length ? { colore: 'var(--verde)', testo: 'Il commercialista ha tutte le fatture emesse dal ' + dataIt(c.attivoDal) + ' ✓' }
            : { colore: 'var(--testo)', testo: (manc.length === 1 ? '1 fattura emessa' : manc.length + ' fatture emesse') + ' dal ' + dataIt(c.attivoDal) + ' non ' + (manc.length === 1 ? 'è ancora arrivata' : 'sono ancora arrivate') + ' al commercialista: ' + (c.attivo ? 'partiranno con l\'invio del mese allo SDI, oppure mandale adesso.' : 'mandale adesso.') };
        const casella = mailPronta() ? { colore: 'var(--testo-2)', testo: 'Le email partono dalla casella del negozio (' + mailCfg().indirizzo + '), la stessa degli invii ai clienti.' }
          : { colore: 'var(--rosso)', testo: 'Attenzione: su questo computer la casella email del negozio non è ancora pronta (pulsante «Email al cliente…» in Fatture). Finché manca, gli invii finiscono in rosso qui sotto.' };
        return '<div class="col" style="padding:14px 18px;height:100%"><div class="h1" style="font-size:19px">Fatture al commercialista</div><div class="muto" style="margin:4px 0 12px">Quando invii allo SDI le fatture del mese (PEC / SDI…), il commercialista riceve un\'email sola con uno ZIP dei PDF di tutte le fatture, fatture accompagnatorie e note di credito del mese che non ha ancora. Se il mese è molto grande lo ZIP si divide in più email. Qui sotto il registro degli invii: quelli in rosso non sono arrivati e si possono rimandare.</div>'
          + '<div class="card" style="margin-bottom:12px;flex:none"><div class="avvolgi basso"><div style="width:320px;margin:0 18px 10px 0"><div class="muto">Email del commercialista *</div>' + tb('cm-email', c.email, ' style="margin-top:3px"') + '</div>'
          + '<label class="chk" style="margin:0 14px 14px 0"><input type="checkbox" id="cm-attivo"' + (c.attivo ? ' checked' : '') + '>Quando invio allo SDI le fatture del mese, mandale anche al commercialista (ZIP con i PDF)</label></div>'
          + '<div class="riga">' + btn('Salva', 'cm-salva', { primario: true, stile: 'padding:7px 22px' }) + msgSpan(st.cfgMsg, 'margin-left:14px;max-width:620px') + '</div>'
          + '<div style="margin-top:10px;font-size:12px;color:' + casella.colore + '">' + esc(casella.testo) + '</div></div>'
          + '<div class="card" style="margin-bottom:12px;padding:10px 14px;flex:none"><div class="riga"><span class="spinta" style="margin-right:14px;color:' + info.colore + '">' + esc(info.testo) + '</span>' + btn('Mandale adesso', 'cm-mancanti', { dis: !manc.length, stile: 'padding:7px 16px;flex:none', title: 'Manda subito in uno ZIP le fatture che il commercialista non ha ancora, senza aspettare l\'invio del mese allo SDI' }) + '</div>'
          + '<div style="border-top:1px solid #A0A0A0;margin:10px 0"></div>'
          + '<div class="riga"><span class="muto spinta" style="margin-right:14px">Un mese intero, anche le fatture che il commercialista ha già (per un mese che gli manca o che ha perso):</span><div style="width:130px;margin-right:8px;flex:none">' + G.sel('id="cm-mese" data-ch="cm-mese"', G.MESI_LUNGHI.map((x, i) => [i + 1, x]), st.mese) + '</div><div style="width:90px;margin-right:10px;flex:none">' + G.sel('id="cm-anno" data-ch="cm-anno"', [annoOggi - 1, annoOggi], st.anno) + '</div>'
          + btn('Manda il mese intero', 'cm-mese-invia', { stile: 'padding:7px 16px;flex:none', title: 'Tutte le fatture del mese scelto in uno ZIP, anche quelle che il commercialista ha già: per un mese che gli manca o che ha perso' }) + '</div></div>'
          + '<div class="card col riempi"><div class="riga" style="margin-bottom:8px"><div class="h2" style="font-size:16px">Registro degli invii</div>' + msgSpan(st.regMsg, 'margin-left:14px') + '<span class="spinta"></span>' + btn('Rimanda la selezionata', 'cm-rimanda', { dis: !G.selezionato('cm-registro'), stile: 'padding:6px 14px;flex:none' }) + '</div>'
          + G.dg('cm-registro', { classe: 'riempi comm', righe: c.invii, chiave: (x) => x.id, onSel: () => { const b = o.el.querySelector('[data-az="cm-rimanda"]'); if (b) b.disabled = false; }, classeRiga: (x) => (x.esito === 'INVIATA' ? '' : 'errcomm'), colonne: [
            { k: 'quando', t: 'Quando', w: 118, min: 118, v: (x) => dataIt(x.quando) + ' ' + x.quando.slice(11, 16), ordina: (x) => x.quando }, { k: 'cosa', t: 'Cosa', w: '*', min: 280 }, { k: 'a', t: 'Inviata a', w: 190, min: 150 },
            { k: 'esito', t: 'Esito', w: 76, min: 76, semi: true }, { k: 'dett', t: 'Dettaglio', w: 240, min: 160, cls: 'puntini', tip: (x) => x.dett }, { k: 'post', t: 'Postazione', w: 112, min: 112 }] }) + '</div></div>';
      } });
    const fatto = (r) => { st.regMsg = { colore: r.ok ? 'var(--verde)' : 'var(--rosso)', testo: r.testo }; G.deseleziona('cm-registro'); aggiornaTenendo(o); };
    A['cm-salva'] = () => {
      const email = val('cm-email').trim(), attivo = document.getElementById('cm-attivo').checked;
      if (attivo && !email.includes('@')) { st.cfgMsg = { colore: 'var(--rosso)', testo: 'Scrivi un indirizzo email valido per il commercialista.' }; aggiornaTenendo(o); return; }
      if (attivo && (!c.attivo || !c.attivoDal)) c.attivoDal = G.OGGI;
      c.email = email; c.attivo = attivo;
      G.log('Email', attivo ? 'Fatture al commercialista con l\'invio del mese allo SDI (ZIP di PDF): acceso, ' + email : 'Fatture al commercialista con l\'invio del mese allo SDI: spento'); G.salva();
      st.cfgMsg = { colore: 'var(--verde)', testo: attivo ? 'Salvato ✓ Quando invii allo SDI le fatture del mese, ' + email + ' riceve lo ZIP con i PDF.' : 'Salvato: l\'invio al commercialista con le fatture del mese è spento.' };
      aggiornaTenendo(o, ['cm-email', 'cm-attivo']);
    };
    A['cm-mancanti'] = () => { const m = nonArrivati(); if (m.length) fatto(inviaAlCommercialista(m, 'Fatture non ancora inviate')); };
    G.CH['cm-mese'] = (el) => { st.mese = Number(el.value); };
    G.CH['cm-anno'] = (el) => { st.anno = Number(el.value); };
    A['cm-mese-invia'] = () => {
      const docs = docsDelMese(st.anno, st.mese, false);
      if (!docs.length) { st.regMsg = { colore: 'var(--rosso)', testo: 'Non ci sono fatture con data di ' + nomeMese(st.anno, st.mese) + '.' }; aggiornaTenendo(o); return; }
      G.msgbox({ titolo: 'Mese intero al commercialista', icona: 'domanda', testo: 'Mando al commercialista tutte le ' + docs.length + ' fatture di ' + nomeMese(st.anno, st.mese) + ' in PDF, anche quelle che ha già ricevuto?', pulsanti: [{ t: 'Sì', az: () => fatto(inviaAlCommercialista(docs, 'Fatture di ' + nomeMese(st.anno, st.mese))) }, { t: 'No', annulla: true }] });
    };
    A['cm-rimanda'] = () => {
      const x = G.selezionato('cm-registro'); if (!x) return;
      if (!c.email.includes('@')) { st.regMsg = { colore: 'var(--rosso)', testo: 'Prima scrivi e salva l\'indirizzo del commercialista.' }; aggiornaTenendo(o); return; }
      const docs = (x.fatture || []).map((id) => G.fattura(id)).filter(Boolean);
      if (!docs.length) { st.regMsg = { colore: 'var(--rosso)', testo: 'Le fatture di quell\'invio non esistono più (annullate).' }; aggiornaTenendo(o); return; }
      fatto(inviaAlCommercialista(docs, x.cosa.replace(/ · \d+ PDF$/, '').replace(/ \(parte \d+ di \d+\)$/, '')));
    };
  }
  A['ft-comm'] = () => finestraCommercialista();

  // =====================================================================
  // CRONOLOGIA
  // =====================================================================
  const cr = () => G.ui('cronologia', () => ({ cerca: '', tipo: '' }));
  G.VISTE.cronologia = {
    nuova() { delete G.U.cronologia; G.deseleziona('cron'); },
    render() {
      const S = G.S, u = cr();
      const tipi = [...new Set(S.cronologia.map((c) => c.tipo))].sort();
      const q = G.normalizza(u.cerca).trim();
      const righe = S.cronologia.filter((c) => (!u.tipo || c.tipo === u.tipo) && (!q || G.normalizza(c.descr + ' ' + c.tipo).includes(q)));
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga tesa" style="margin-bottom:12px"><div class="pila"><div class="h1">Cronologia</div><input class="tb" style="width:280px;margin-left:18px" data-in="cron-cerca" value="' + esc(u.cerca) + '" title="Cerca nella descrizione" autocomplete="off">'
        + '<span class="muto" style="margin:0 6px 0 14px">Tipo</span><div style="width:150px">' + G.sel('data-ch="cron-tipo"', [['', 'Tutti i tipi']].concat(tipi.map((t) => [t, t])), u.tipo) + '</div><span class="muto" style="margin-left:16px">' + S.cronologia.length + ' eventi</span></div>'
        + '<div class="riga tesa fisso">' + btn('Elimina selezionate', 'cron-elimina', { stile: 'margin-right:8px', dis: !G.selezionati('cron').length, id: 'cron-btn-elimina' }) + btn('Svuota tutto', 'cron-svuota', { stile: 'margin-right:8px' }) + btn('Aggiorna', 'cron-aggiorna') + '</div></div>'
        + G.dg('cron', { classe: 'riempi', multiSel: true, righe, chiave: (c) => c.id, onSel: () => { const b = document.getElementById('cron-btn-elimina'); if (b) b.disabled = !G.selezionati('cron').length; }, colonne: [
          { k: 'quando', t: 'Quando', w: 150, mono: true, v: (c) => dataIt(c.quando) + ' ' + c.quando.slice(11, 16), ordina: (c) => c.quando }, { k: 'tipo', t: 'Tipo', w: 120 }, { k: 'descr', t: 'Descrizione', w: '*' }, { k: 'rif', t: 'Rif.', w: 110, mono: true }] })
        + '</div>';
    },
  };
  G.IN['cron-cerca'] = (el) => { cr().cerca = el.value; G.ridisegna(); const n = document.querySelector('[data-in="cron-cerca"]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  G.CH['cron-tipo'] = (el) => { cr().tipo = el.value; G.ridisegna(); };
  A['cron-aggiorna'] = () => G.ridisegna();
  A['cron-elimina'] = () => {
    const sel = G.selezionati('cron'); if (!sel.length) return;
    G.msgbox({ titolo: 'Conferma eliminazione', icona: 'avviso', testo: 'Eliminare ' + sel.length + ' voce/i dalla cronologia?\nNon riappariranno più.', pulsanti: [{ t: 'Sì', az: () => { const ids = new Set(sel.map((c) => c.id)); G.S.cronologia = G.S.cronologia.filter((c) => !ids.has(c.id)); G.deseleziona('cron'); G.salva(); G.ridisegna(); } }, { t: 'No', annulla: true }] });
  };
  A['cron-svuota'] = () => {
    G.msgbox({ titolo: 'Conferma', icona: 'avviso', testo: 'Svuotare TUTTA la cronologia?\nL\'operazione non è reversibile.', pulsanti: [{ t: 'Sì', az: () => { G.S.cronologia = []; G.deseleziona('cron'); G.salva(); G.ridisegna(); } }, { t: 'No', annulla: true }] });
  };

  // =====================================================================
  // PEC — POSTA IN ARRIVO E SCARTI SDI
  // =====================================================================
  const pc = () => G.ui('pec', () => ({ msg: null }));
  G.VISTE.pec = {
    nuova() { pc().msg = null; G.deseleziona('pec-scarti'); },
    render() {
      const S = G.S, u = pc();
      const scarti = S.fatture.filter((f) => f.sdi === 'SCARTATO');
      const posta = S.pecPosta;
      const nScarti = posta.filter((p) => p.scarto).length;
      return '<div class="col" style="padding:16px 20px;height:100%">'
        + '<div class="riga tesa" style="margin-bottom:6px"><div class="pila"><div class="h1">PEC — posta in arrivo e scarti SDI</div></div><div class="riga tesa fisso">'
        + btn('Scarica posta in arrivo', 'pec-scarica', { primario: true, stile: 'margin-right:8px' }) + btn('Controlla e lavora ricevute', 'pec-lavora', { stile: 'margin-right:8px' }) + btn('Rileggi ricevute…', 'pec-rileggi', { stile: 'margin-right:8px' }) + btn('Configura casella…', 'pec-config') + '</div></div>'
        + (u.msg ? '<div style="font-size:12px;margin-bottom:10px;color:' + u.msg.colore + '">' + esc(u.msg.testo) + '</div>' : '')
        + '<div class="card col" style="padding:0;flex:0 1 auto;max-height:300px;min-height:0;margin-bottom:12px"><div class="riga" style="margin:10px 12px 6px"><div class="h2 spinta" style="font-size:14px">' + (scarti.length ? 'Fatture SCARTATE dallo SDI — ' + scarti.length + ' da correggere e rinviare' : 'Fatture SCARTATE dallo SDI — nessuna, tutto regolare ✓') + '</div>' + btn('Apri e correggi', 'pec-correggi', { dis: !G.selezionato('pec-scarti'), stile: 'padding:4px 12px', title: 'Apre la fattura scartata: motivo dello scarto spiegato, dati del cliente da correggere e file da rigenerare (anche col doppio clic sulla riga)' }) + '</div>'
        + G.dg('pec-scarti', { senzaBordo: true, stile: 'max-height:230px', righe: scarti, chiave: (f) => f.id, onSel: () => G.ridisegna(), onDoppio: (f) => { G.scegliRiga('pec-scarti', f.id); A['pec-correggi'](); }, colonne: [
          { k: 'num', t: 'Numero', w: 96, mono: true, v: G.numeroFattura }, { k: 'esito', t: 'Esito del', w: 90, v: (f) => dataIt(f.scartoIl || f.data) }, { k: 'cli', t: 'Cliente', w: 240, v: (f) => (G.cli(f.clienteId) || {}).nome },
          { k: 'tot', t: 'Totale €', w: 90, n: true, v: (f) => num(f.totale) }, { k: 'file', t: 'File', w: 200, mono: true, v: nomeFile }, { k: 'motivo', t: 'Motivo dello scarto', w: '*', v: (f) => f.scarto || '', f: (f) => '<span style="color:#C0392B;white-space:normal">' + esc(f.scarto || '') + '</span>' }] }) + '</div>'
        + '<div class="card col" style="padding:0;flex:1 1 0;min-height:0"><div class="h2" style="font-size:14px;margin:10px 12px 6px">' + (posta.length ? 'Posta in arrivo PEC — ultimi ' + posta.length + ' messaggi' + (nScarti ? ' · ' + nScarti + ' notifiche di scarto/mancata consegna (in rosso)' : '') : 'Posta in arrivo PEC — premi «Scarica posta in arrivo» per leggere la casella') + '</div>'
        + G.dg('pec-posta', { senzaBordo: true, classe: 'riempi', righe: posta, chiave: (p) => p.id, classeRiga: (p) => (p.scarto ? 'rosa' : ''), colonne: [{ k: 'data', t: 'Data', w: 120, v: (p) => dataIt(p.data) + ' ' + p.data.slice(11, 16) }, { k: 'mitt', t: 'Mittente', w: 280 }, { k: 'ogg', t: 'Oggetto', w: '*', f: (p) => (p.scarto ? '<span style="color:#C0392B;font-weight:600">' + esc(p.ogg) + '</span>' : esc(p.ogg)) }] }) + '</div>'
        + '</div>';
    },
  };
  A['pec-config'] = () => finestraSdi();
  A['pec-scarica'] = () => {
    const S = G.S, u = pc();
    const posta = [];
    // ricevute degli ultimi due mesi, e sempre la notifica dello scarto ancora da sistemare
    const da = G.D.piuGiorni(G.OGGI, -60);
    S.fatture.filter((f) => f.sdi !== 'GENERATO' && (f.sdi === 'SCARTATO' || (f.inviatoIl || f.data) >= da)).forEach((f, i) => {
      const quando = (f.sdi === 'SCARTATO' ? f.scartoIl || f.data : f.inviatoIl || f.data) + 'T' + G.D.pad(9 + (i % 8)) + ':' + G.D.pad((i * 7) % 60) + ':00';
      posta.push({ id: G.nuovoId(), data: quando, mitt: sdiCfg().sportello, ogg: (f.sdi === 'SCARTATO' ? 'POSTA CERTIFICATA: Notifica di scarto ' : 'POSTA CERTIFICATA: Ricevuta di consegna ') + (10183900000 + f.id * 7), scarto: f.sdi === 'SCARTATO' });
    });
    S.acquisti.filter((d) => d.tipo === 'FATTURA_ACQUISTO').slice(-6).forEach((d, i) => posta.push({ id: G.nuovoId(), data: d.ricevutaIl + 'T1' + i + ':05:00', mitt: sdiCfg().sportello, ogg: 'POSTA CERTIFICATA: Invio File ' + (10183900000 + d.id * 7), scarto: false }));
    posta.push({ id: G.nuovoId(), data: G.D.piuGiorni(G.OGGI, -2) + 'T08:40:00', mitt: 'comunicazioni@pec.example', ogg: 'POSTA CERTIFICATA: Comunicazione periodica dal gestore', scarto: false });
    // gli ultimi 50 messaggi, con le notifiche di scarto sempre dentro
    const recenti = (a, b) => b.data.localeCompare(a.data);
    const scarti = posta.filter((p) => p.scarto);
    S.pecPosta = posta.filter((p) => !p.scarto).sort(recenti).slice(0, 50 - scarti.length).concat(scarti).sort(recenti);
    G.salva(); u.msg = { colore: 'var(--verde)', testo: 'Casella letta.' }; G.ridisegna();
  };
  function lavoraEMostra(rileggi) {
    const u = pc();
    const e = lavoraRicevute(rileggi);
    u.msg = { colore: 'var(--verde)', testo: e.testo + '.' }; G.ridisegna();
    if (e.dettagli.length) G.finestra({ titolo: 'Posta PEC — cosa ha fatto il programma', larghezza: 820, altezza: 460, corpo: '<div class="col" style="padding:16px;height:100%"><div style="font-weight:600;margin-bottom:10px">' + esc(e.testo) + '</div><textarea class="riempi" readonly style="border:0;background:transparent;font:inherit;font-size:12.5px;line-height:1.45;padding:2px;resize:none;white-space:pre-wrap;color:inherit">' + esc(e.dettagli.join('\n')) + '</textarea><div style="text-align:right;margin-top:10px">' + btn('Chiudi', 'chiudi-finestra', { stile: 'padding:6px 18px' }) + '</div></div>' });
  }
  A['pec-lavora'] = () => lavoraEMostra(0);
  A['pec-rileggi'] = () => G.msgbox({ titolo: 'Rileggi le ricevute', icona: 'domanda', predefinito: 0, testo: 'Rileggo gli ultimi 40 messaggi della casella PEC anche se erano già stati letti?\n\nServe quando una ricevuta dello SDI non è finita sulla fattura (per esempio uno scarto che non compare qui sopra). Non viene rimandato niente: si rileggono soltanto i messaggi.', pulsanti: [{ t: 'Sì', az: () => lavoraEMostra(40) }, { t: 'No', annulla: true }] });
  // ---- correzione della fattura scartata (ScartoWindow) ----
  // traduzione dei codici di scarto: la stessa tabella del programma (Db.Scarti.cs, ScartiNoti)
  const SCARTI_NOTI = {
    // dati del cliente e codice destinatario: si correggono qui nella finestra
    '00305': ['La partita IVA del cliente non è valida: è scritta male oppure non risulta in Anagrafe tributaria (per esempio è cessata).', 'Dati del cliente, campo Partita IVA (11 cifre): ricontrollala col cliente o con «Verifica partita IVA» sul sito dell\'Agenzia delle Entrate.'],
    '00306': ['Il codice fiscale del cliente non è valido: è scritto male oppure non risulta in Anagrafe tributaria.', 'Dati del cliente, campo Codice fiscale (16 caratteri per le persone, 11 cifre per società ed enti).'],
    '00324': ['Partita IVA e codice fiscale del cliente non appartengono allo stesso soggetto.', 'Dati del cliente: ricontrolla Partita IVA e Codice fiscale (per un\'impresa la fattura elettronica accetta anche la sola partita IVA).'],
    '00417': ['Del cliente non c\'è né partita IVA né codice fiscale.', 'Dati del cliente: per un privato serve almeno il codice fiscale.'],
    '00311': ['Il codice destinatario non è valido.', 'Dati del cliente, campo Codice destinatario.'],
    '00312': ['Il codice destinatario esiste ma non è attivo (dismesso o non ancora attivato).', 'Chiedi al cliente il codice aggiornato, oppure metti 0000000 (e la sua PEC, se ce l\'ha).'],
    '00427': ['Il codice destinatario ha 6 caratteri (codice di un ufficio della Pubblica Amministrazione), ma il programma prepara fatture tra privati (FPR12), che vogliono 7 caratteri.', 'Dati del cliente, campo Codice destinatario: per imprese e privati 7 caratteri (o 0000000). Se il cliente è un ente pubblico serve la FatturaPA, che il programma non prepara: avvisa chi ti assiste.'],
    '00399': ['Il cliente è una Pubblica Amministrazione (è nell\'Indice PA): le sue fatture vanno fatte in formato FatturaPA, non come fattura tra privati.', 'Il programma prepara solo fatture tra privati (FPR12): per un ente pubblico avvisa chi ti assiste.'],
    // dati del negozio (chi trasmette e chi emette) e rappresentante fiscale: non si correggono qui
    '00300': ['La partita IVA di chi trasmette il file non è valida: il programma ci mette quella del negozio.', 'Non è un dato del cliente: è la partita IVA del negozio, impostata all\'installazione del programma. Avvisa chi ti assiste.'],
    '00301': ['La partita IVA del negozio (chi emette la fattura) non risulta valida in Anagrafe tributaria.', 'Non è un dato del cliente: è la partita IVA del negozio, impostata all\'installazione del programma. Avvisa chi ti assiste.'],
    '00302': ['Il codice fiscale del negozio (chi emette la fattura) non è valido.', 'Non è un dato del cliente: è il codice fiscale del negozio, impostato all\'installazione del programma. Avvisa chi ti assiste.'],
    '00303': ['La partita IVA del rappresentante fiscale (di un venditore o di un cliente estero) non è valida.', 'Il programma non compila il rappresentante fiscale: se compare questo scarto, avvisa chi ti assiste.'],
    '00320': ['Partita IVA e codice fiscale del negozio (chi emette la fattura) non corrispondono tra loro.', 'Non sono dati del cliente: sono quelli del negozio, impostati all\'installazione del programma. Avvisa chi ti assiste.'],
    '00321': ['Il codice fiscale del negozio non fa parte del gruppo IVA indicato dalla partita IVA (riguarda solo i gruppi IVA).', 'Non sono dati del cliente: sono quelli del negozio, impostati all\'installazione del programma. Avvisa chi ti assiste.'],
    // righe, aliquote e riepilogo IVA
    '00400': ['Una riga ha IVA a zero ma manca la «natura» che spiega il perché (esente, non imponibile, reverse charge…).', 'IVA a zero voluta: rifai il documento col regime IVA giusto (esente, non imponibile…). IVA a zero per sbaglio: correggi l\'aliquota dell\'articolo e rifai il documento.'],
    '00401': ['C\'è una «natura» su una riga che però ha IVA diversa da zero.', 'Il regime IVA scelto non va d\'accordo con le aliquote: rifai il documento col regime giusto.'],
    '00429': ['Nel riepilogo IVA c\'è un\'aliquota a zero senza la «natura» che spiega il perché.', 'IVA a zero voluta: rifai il documento col regime IVA giusto (esente, non imponibile…). IVA a zero per sbaglio: correggi l\'aliquota dell\'articolo e rifai il documento.'],
    '00430': ['Nel riepilogo IVA c\'è una «natura» su un\'aliquota diversa da zero.', 'Il regime IVA scelto non va d\'accordo con le aliquote: rifai il documento col regime giusto.'],
    '00411': ['Una riga è segnata come soggetta a ritenuta d\'acconto, ma nel documento mancano i dati della ritenuta.', 'Il programma non gestisce la ritenuta d\'acconto: se compare questo scarto, avvisa chi ti assiste.'],
    '00419': ['Manca il riepilogo IVA per un\'aliquota usata nelle righe.', 'Problema di calcolo: rigenera il file; se resta, avvisa chi ti assiste.'],
    '00421': ['Nel riepilogo IVA l\'imposta non è uguale a imponibile × aliquota (sbaglio oltre 1 centesimo).', 'È un errore di calcolo del file, non dei dati: rigenera il file; se lo scarto si ripete, avvisa chi ti assiste.'],
    '00422': ['Nel riepilogo IVA l\'imponibile non è uguale alla somma delle righe con quell\'aliquota (sbaglio di 1 euro o più).', 'È un errore di calcolo del file, non dei dati: rigenera il file; se lo scarto si ripete, avvisa chi ti assiste.'],
    '00423': ['Su una riga il prezzo totale non è uguale a prezzo unitario × quantità, sconti compresi (sbaglio oltre 1 centesimo).', 'Guarda quella riga in «Righe del documento» qui sotto (quantità, prezzo, sconto) e rigenera il file; se lo scarto si ripete, avvisa chi ti assiste.'],
    '00424': ['Un\'aliquota IVA è scritta come frazione (0,22) invece che in percentuale (22).', 'Controlla l\'aliquota IVA delle righe: va scritta 22, 10, 4…; poi rigenera il file. Se è giusta, avvisa chi ti assiste.'],
    '00443': ['Un\'aliquota IVA usata in una riga non compare nel riepilogo IVA del documento.', 'È un errore di calcolo del file, non dei dati: rigenera il file; se lo scarto si ripete, avvisa chi ti assiste.'],
    // numero e data del documento
    '00403': ['La data della fattura non è ammessa.', 'La data del documento non può essere futura.'],
    '00404': ['Fattura DOPPIA: allo SDI risulta già una fattura del negozio con lo stesso numero nello stesso anno (non scartata).', 'Prima controlla se quella fattura era già stata consegnata: se è la stessa, è valida e non va rimandata; se è un documento diverso, va rifatto con un numero nuovo.'],
    '00409': ['Fattura doppia nello stesso file: un file con più fatture (lotto) ne contiene due con lo stesso numero nello stesso anno.', 'Il programma mette una fattura per file: rigenera il file; se lo scarto si ripete, avvisa chi ti assiste.'],
    '00418': ['La nota di credito ha una data precedente a quella della fattura che corregge.', 'Controlla la data della nota di credito e quella della fattura a cui si riferisce.'],
    '00425': ['Il numero della fattura non è valido: deve contenere almeno una cifra.', 'Numerazione del documento.'],
    // file e firma
    '00200': ['Il file non rispetta il formato richiesto dall\'Agenzia.', 'Rigenera il file; se lo scarto si ripete, avvisa chi ti assiste.'],
    '00001': ['Nome del file non valido.', 'Rigenera il file: il programma assegna un nome nuovo.'],
    '00002': ['Nome del file già usato per un invio precedente.', 'Rigenera il file: il programma assegna un progressivo nuovo.'],
    '00100': ['Certificato di firma scaduto.', 'Riguarda la firma digitale (serve solo per la Pubblica Amministrazione).'],
    '00102': ['File senza firma digitale valida.', 'Riguarda la firma con la chiavetta (solo per la Pubblica Amministrazione).'],
  };
  // come Db.LeggiErroriScarto: «00311: testo | 00423: testo» → un riquadro per errore
  const erroriScarto = (testo) => String(testo || '').split('|').map((x) => x.trim()).filter(Boolean).map((t) => {
    const dp = t.indexOf(':');
    const codice = dp > 0 && dp <= 6 ? t.slice(0, dp).trim() : '';
    const noto = SCARTI_NOTI[codice];
    return { titolo: codice ? 'Errore ' + codice : 'Errore', descr: codice ? t.slice(dp + 1).trim() : t, significa: noto ? noto[0] : 'Motivo indicato dall\'Agenzia delle Entrate (qui sotto).', dove: noto ? noto[1] : 'Correggi il dato segnalato, poi rigenera il file e rimandalo.' };
  });
  A['pec-correggi'] = () => {
    const u = pc(), f = G.selezionato('pec-scarti');
    if (!f) { u.msg = { colore: 'var(--rosso)', testo: 'Scegli prima una fattura scartata nell\'elenco qui sopra.' }; G.ridisegna(); return; }
    const S = G.S, c = G.cli(f.clienteId);
    // titolo e motivo come al momento dell'apertura (la finestra non li ricalcola)
    const titolo = G.numeroFattura(f) + ' — ' + (c ? c.nome : '') + ' · ' + num(f.totale) + ' € · SCARTATA dallo SDI' + (f.scartoIl ? ' il ' + dataIt(f.scartoIl) : '');
    const sottotitolo = 'Una fattura scartata NON risulta emessa: si corregge il dato sbagliato e si rimanda con lo stesso numero e la stessa data (il programma le assegna solo un nuovo numero di invio).   File: ' + nomeFile(f);
    const errori = erroriScarto(f.scarto);
    const st = { msg: null, cliMsg: c ? null : { colore: 'var(--rosso)', testo: 'Cliente non trovato: i dati vanno corretti dalla sezione Clienti.' }, rigenerato: false, modificato: false };
    const campoCli = (et, id, v, w, mr, tip) => '<div style="width:' + w + 'px;margin:0 ' + mr + 'px 8px 0"><div class="muto">' + et + '</div>' + tb(id, v, ' style="margin-top:2px"' + (tip ? ' title="' + esc(tip) + '"' : '')) + '</div>';
    const o = G.finestra({ titolo: 'Correggi la fattura scartata', larghezza: 1080, altezza: 820,
      corpo: () => '<div class="col" style="padding:16px;height:100%">'
        + '<div style="background:#FDECEA;border:1px solid #E6B0AA;border-radius:8px;padding:10px 14px;margin-bottom:12px;flex:none"><div style="font-size:16px;font-weight:600;color:#A32D2D">' + esc(titolo) + '</div><div class="muto" style="margin-top:3px">' + esc(sottotitolo) + '</div></div>'
        + '<div class="riga riempi" style="align-items:stretch;min-height:0">'
        + '<div class="col riempi" style="min-width:0"><div class="h2" style="font-size:14px;margin-bottom:6px">Perché è stata scartata</div><div class="card fin-scorre" id="sc-sx" style="padding:0;flex:1;min-height:0;overflow:auto">'
        + errori.map((e) => '<div style="border-bottom:1px solid var(--bordo);padding:10px 14px"><div style="font-weight:700;color:#A32D2D;font-size:13px">' + esc(e.titolo) + '</div><div style="font-size:13px;margin-top:4px">' + esc(e.significa) + '</div><div style="font-size:12.5px;color:#1E6B2E;margin-top:4px">' + esc(e.dove) + '</div><div class="muto" style="font-size:11px;margin-top:6px">' + esc(e.descr) + '</div></div>').join('')
        + '<div class="h2" style="font-size:13px;margin:12px 0 6px 14px">Righe del documento</div>' + G.dg('sc-righe', { senzaBordo: true, stile: 'max-height:240px;margin-bottom:8px', righe: f.righe.map((r, i) => Object.assign({ k: i }, r)), chiave: (r) => r.k, colonne: [
          { k: 'descr', t: 'Descrizione', w: '*' }, { k: 'qta', t: 'Q.tà', w: 60, n: true, v: (r) => qta(r.qta) }, { k: 'pu', t: 'Prz.unit.', w: 80, n: true, v: (r) => num(r.iva > 0 ? r.prezzo / (1 + r.iva / 100) : r.prezzo) },
          { k: 'iva', t: 'IVA %', w: 60, n: true, v: (r) => G.dec(r.iva) }, { k: 'imp', t: 'Imponibile', w: 86, n: true, v: (r) => num(r.iva > 0 ? G.totaleRiga(r) / (1 + r.iva / 100) : G.totaleRiga(r)) }] }) + '</div></div>'
        + '<div style="width:14px;flex:none"></div>'
        + '<div class="col" style="width:400px;flex:none"><div class="h2" style="font-size:14px;margin-bottom:6px">Dati del cliente (si correggono qui)</div><div class="card fin-scorre" id="sc-dx" style="flex:1;min-height:0;overflow:auto">'
        + (c ? '<div class="muto" style="margin-bottom:10px">Sono i dati che finiscono nella fattura elettronica: quasi tutti gli scarti nascono da qui.</div>'
          + '<div class="muto">Ragione sociale</div>' + tb('sc-rag', c.nome, ' style="margin:2px 0 8px"')
          + '<div class="avvolgi">' + campoCli('Partita IVA', 'sc-piva', c.piva, 170, 10) + campoCli('Codice fiscale', 'sc-cf', c.cf, 180, 0) + '</div>'
          + '<div class="avvolgi">' + campoCli('Codice destinatario', 'sc-sdi', c.sdi, 170, 10, '7 caratteri. Se il cliente non ha un codice: 0000000, più la sua PEC se ce l\'ha') + campoCli('PEC del cliente', 'sc-pec', c.pec, 180, 0) + '</div>'
          + '<div class="muto">Indirizzo</div>' + tb('sc-ind', c.indirizzo, ' style="margin:2px 0 8px"')
          + '<div class="avvolgi">' + campoCli('CAP', 'sc-cap', c.cap, 80, 10) + campoCli('Città', 'sc-citta', c.citta, 180, 10) + campoCli('Prov.', 'sc-prov', c.prov, 60, 0) + '</div>'
          + btn('Salva i dati del cliente', 'sc-salvacli', { stile: 'padding:7px 14px;margin-top:4px' })
          : '')
        + '<div style="font-size:12px;margin-top:8px;white-space:pre-line;color:' + (st.cliMsg ? st.cliMsg.colore : 'inherit') + '">' + (st.cliMsg ? esc(st.cliMsg.testo) : '') + '</div></div></div></div>'
        + '<div class="avvolgi" style="margin-top:12px;align-items:center;flex:none">' + btn('Rigenera il file e rimettilo tra quelli da inviare', 'sc-rigenera', { primario: true, dis: st.rigenerato, stile: 'padding:8px 16px;margin:0 8px 6px 0', title: 'Ricostruisce l\'XML con i dati corretti, stesso numero e stessa data, con un nuovo numero di invio' })
        + btn('Apri PDF', 'sc-pdf', { stile: 'padding:8px 14px;margin:0 8px 6px 0' }) + btn('Apri XML', 'sc-xml', { stile: 'padding:8px 14px;margin:0 8px 6px 0' })
        + btn('Annulla il documento', 'sc-annulla', { stile: 'padding:8px 14px;margin:0 8px 6px 0', title: 'Se il documento è sbagliato nelle righe: lo elimina (una fattura scartata non è mai stata emessa) così si può rifare' })
        + btn('Chiudi', 'chiudi-finestra', { stile: 'padding:8px 18px;margin:0 0 6px 0' })
        + '<span style="margin:0 0 6px 14px;font-size:12.5px;max-width:420px;color:' + (st.msg ? st.msg.colore : 'inherit') + '">' + (st.msg ? esc(st.msg.testo) : '') + '</span></div></div>',
      dopoChiusa: () => { if (st.modificato) { G.deseleziona('pec-scarti'); pc().msg = { colore: 'var(--verde)', testo: 'Elenco aggiornato dopo la correzione.' }; } G.ridisegna(); } });
    // avvisi sui dati che fanno scartare i file (come Controlli(): avvisano, non bloccano); codice vuoto
    // o 0000000 senza PEC non fa scartare niente: il programma scrive 0000000 e lo SDI lo accetta
    const controlli = () => {
      const piva = val('sc-piva').trim(), cf = val('sc-cf').trim(), cod = val('sc-sdi').trim();
      if (!piva && !cf) return '⚠ Senza partita IVA né codice fiscale il file verrà scartato di nuovo.';
      if (piva && !/^\d{11}$/.test(piva)) return '⚠ La partita IVA dovrebbe essere di 11 cifre.';
      // il file è sempre una fattura tra privati (FPR12): un codice di 6 caratteri lo SDI lo scarta (00427)
      if (cod && cod.length !== 7) return '⚠ Il codice destinatario deve avere 7 caratteri: quelli di 6 sono degli enti pubblici, e il programma non prepara la FatturaPA.';
      return '';
    };
    // i campi non ancora salvati restano scritti quando la finestra si ridisegna
    const CAMPI = ['sc-rag', 'sc-piva', 'sc-cf', 'sc-sdi', 'sc-pec', 'sc-ind', 'sc-cap', 'sc-citta', 'sc-prov'];
    const tieni = () => { const v = {}; CAMPI.forEach((id) => { const el = document.getElementById(id); if (el) v[id] = el.value; }); return v; };
    const rimetti = (v) => Object.keys(v).forEach((id) => { const el = document.getElementById(id); if (el) el.value = v[id]; });
    const aggiorna = () => { const v = tieni(); G.aggiornaFinestra(o); rimetti(v); };
    A['sc-salvacli'] = () => {
      if (!c) return;
      const rag = val('sc-rag').trim();
      if (!rag) { st.cliMsg = { colore: 'var(--rosso)', testo: 'La ragione sociale non può restare vuota.' }; aggiorna(); return; }
      Object.assign(c, { nome: rag, piva: val('sc-piva').trim(), cf: val('sc-cf').trim(), sdi: val('sc-sdi').trim(), pec: val('sc-pec').trim(), indirizzo: val('sc-ind').trim(), cap: val('sc-cap').trim(), citta: val('sc-citta').trim(), prov: val('sc-prov').trim() });
      st.modificato = true;
      G.log('Cliente', 'Corretti i dati di fatturazione del cliente id ' + c.id + ' (dopo uno scarto SDI)', 'cli:' + c.id); G.salva();
      const avviso = controlli();
      st.cliMsg = { colore: avviso ? 'var(--rosso)' : 'var(--verde)', testo: 'Dati salvati. Ora premi «Rigenera il file» qui sotto: l\'XML verrà rifatto coi dati nuovi.' + (avviso ? '\n' + avviso : '') };
      aggiorna();
    };
    A['sc-rigenera'] = () => {
      const avviso = c ? controlli() : '';
      G.msgbox({ titolo: 'Rigenera la fattura elettronica', icona: 'domanda', predefinito: 0, testo: (avviso ? avviso + '\n\n' : '') + 'Rifaccio il file della ' + G.numeroFattura(f) + ' con i dati aggiornati?\n\nNumero e data del documento restano gli stessi; cambia solo il numero di invio, perché lo SDI non accetta due volte lo stesso file. Poi il documento torna fra quelli DA INVIARE.', pulsanti: [{ t: 'Sì', az: () => {
        f.progressivo = String(++S.numeri.progressivo).padStart(5, '0'); f.sdi = 'GENERATO'; delete f.scarto; delete f.scartoIl;
        st.modificato = true; st.rigenerato = true;
        G.log('SDI', 'Rigenerato il file della ' + tipoIt(f) + ' n. ' + numeroIt(f) + ' coi dati aggiornati → ' + nomeFile(f) + ' (torna da inviare)', 'doc:' + f.id); G.salva();
        st.msg = { colore: 'var(--verde)', testo: 'File rifatto: ' + nomeFile(f) + '. Ora la fattura è fra quelle da inviare: mandala con «Invia SDI» nella sezione Fatture.' };
        aggiorna();
      } }, { t: 'No', annulla: true }] });
    };
    A['sc-pdf'] = () => G.apriDocumento(G.docDaFattura(f));
    A['sc-xml'] = () => apriXml(f);
    A['sc-annulla'] = () => annullaFattura(f, (ok, testo) => {
      st.msg = { colore: ok ? 'var(--verde)' : 'var(--rosso)', testo };
      if (ok) { st.modificato = true; G.chiudiFinestra(o); return; }
      aggiorna();
    });
  };

  // =====================================================================
  // CESTINO
  // =====================================================================
  const ce = () => G.ui('cestino', () => ({ tipo: 'Tutti', cerca: '', msg: null }));
  G.VISTE.cestino = {
    nuova() { const u = ce(); u.msg = null; G.deseleziona('cestino'); },
    render() {
      const S = G.S, u = ce();
      const q = G.normalizza(u.cerca).trim();
      const tutti = S.cestino;
      const vista = tutti.filter((r) => (u.tipo === 'Tutti' || r.tipo === u.tipo) && (!q || G.normalizza(r.codice + ' ' + r.descr).includes(q)));
      const riep = !tutti.length ? 'Il cestino è vuoto.' : vista.length + ' elementi · ' + tutti.filter((x) => x.tipo === 'Articolo').length + ' articoli · ' + tutti.filter((x) => x.tipo === 'Cliente').length + ' clienti · ' + tutti.filter((x) => x.tipo === 'Fornitore').length + ' fornitori';
      return '<div class="col" style="padding:22px 26px;height:100%">'
        + '<div class="riga basso" style="margin-bottom:6px"><div class="h1">Cestino</div><span class="muto" style="margin:0 0 4px 12px">elementi eliminati — ripristinabili</span></div>'
        + '<div class="riga" style="margin:8px 0 12px"><div style="width:150px">' + G.sel('data-ch="ce-tipo" style="height:40px"', ['Tutti', 'Articolo', 'Cliente', 'Fornitore'], u.tipo) + '</div><input class="tb" style="width:240px;margin-left:10px;padding:5px 6px" data-in="ce-cerca" value="' + esc(u.cerca) + '" title="Cerca per codice o descrizione" autocomplete="off">'
        + '<span class="muto spinta" style="margin-left:16px">' + esc(riep) + '</span>' + btn('Ripristina selezionato', 'ce-ripristina', { dis: !G.selezionato('cestino'), stile: 'padding:7px 14px' }) + '</div>'
        + '<div class="card col riempi" style="padding:0">' + G.dg('cestino', { senzaBordo: true, classe: 'riempi', righe: vista, chiave: (r) => r.id, onSel: () => G.ridisegna(), onDoppio: (r) => { G.scegliRiga('cestino', r.id); A['ce-ripristina'](); }, colonne: [
          { k: 'tipo', t: 'Tipo', w: 110 }, { k: 'codice', t: 'Codice', w: 120, mono: true }, { k: 'descr', t: 'Descrizione / Ragione sociale', w: '*' }, { k: 'quando', t: 'Eliminato il', w: 160, v: (r) => dataIt(r.eliminatoIl) + ' ' + r.eliminatoIl.slice(11, 16), ordina: (r) => r.eliminatoIl }] }) + '</div>'
        + '<div style="margin:10px 0 0 2px;font-size:13px;min-height:17px;color:' + (u.msg ? u.msg.colore : 'inherit') + '">' + (u.msg ? esc(u.msg.testo) : '') + '</div></div>';
    },
  };
  G.CH['ce-tipo'] = (el) => { ce().tipo = el.value; G.ridisegna(); };
  G.IN['ce-cerca'] = (el) => { ce().cerca = el.value; G.ridisegna(); const n = document.querySelector('[data-in="ce-cerca"]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  A['ce-ripristina'] = () => {
    const S = G.S, u = ce(), r = G.selezionato('cestino'); if (!r) return;
    G.msgbox({ titolo: 'Ripristina dal cestino', icona: 'domanda', testo: 'Vuoi ripristinare questo elemento?\n\n' + r.tipo + ': ' + r.codice + '  ' + r.descr, pulsanti: [{ t: 'Sì', az: () => {
      const tab = r.dati && r.dati.tabella;
      if (tab && S[tab]) S[tab].push(r.dati.oggetto);
      S.cestino = S.cestino.filter((x) => x !== r);
      const sigla = r.tipo === 'Articolo' ? 'art' : r.tipo === 'Cliente' ? 'cli' : 'for';
      G.indicizza(); G.log('Cestino', 'Ripristinato ' + r.tipo.toLowerCase() + ' id ' + (r.dati && r.dati.oggetto ? r.dati.oggetto.id : r.id), sigla + ':' + (r.dati && r.dati.oggetto ? r.dati.oggetto.id : r.id)); G.deseleziona('cestino'); G.salva();
      u.msg = { colore: 'var(--verde)', testo: r.tipo + ' «' + r.descr + '» ripristinato.' }; G.ridisegna();
    } }, { t: 'No', annulla: true }] });
  };
})();
