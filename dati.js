/* Dati dimostrativi della demo per iPad.
   Una ferramenta agraria INVENTATA: nessun cliente, prezzo o documento veri.
   Tutto nasce da un generatore ripetibile (stesso seme = stessi nomi) e le date sono calcolate a
   partire da oggi, così la demo è sempre "fresca" quando la si mostra. Le tabelle hanno gli stessi
   campi del programma vero (metodi di pagamento con gli stessi numeri, regimi IVA, aliquote...). */
(function () {
  'use strict';

  // ---------- date e numeri ----------
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const daIso = (s) => { const p = s.slice(0, 10).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const piuGiorni = (s, n) => { const d = daIso(s); d.setDate(d.getDate() + n); return iso(d); };
  const fineMese = (s) => { const d = daIso(s); return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
  const r2 = (n) => Math.round(n * 100) / 100;

  function creaCaso(seme) {
    let a = seme >>> 0;
    const r = () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      r,
      tra: (min, max) => min + (max - min) * r(),
      intero: (min, max) => Math.floor(min + (max - min + 1) * r()),
      scegli: (arr) => arr[Math.floor(r() * arr.length)],
      prob: (p) => r() < p,
      mescola: (arr) => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; },
    };
  }

  // prezzi "da negozio": 4,90 · 12,50 · 27,00
  function prezzoBello(p, C) {
    if (p < 5) return Math.max(0.1, Math.round(p * 10) / 10);
    if (p < 50) { let x = Math.round(p * 2) / 2; if (C.prob(0.3)) x -= 0.1; return r2(x); }
    let x = Math.round(p); if (C.prob(0.5)) x -= 0.1; return r2(x);
  }

  function ean13(C) {
    let s = '80';
    for (let i = 0; i < 10; i++) s += C.intero(0, 9);
    let somma = 0;
    for (let i = 0; i < 12; i++) somma += Number(s[i]) * (i % 2 ? 3 : 1);
    return s + ((10 - (somma % 10)) % 10);
  }

  // partita IVA: 7 cifre, ufficio 054 (Perugia), cifra di controllo come Anagrafica.PartitaIvaValida
  function controlloPiva(dieci) {
    let s = 0;
    for (let i = 0; i < 10; i++) { let c = Number(dieci[i]); if (i % 2 === 1) { c *= 2; if (c > 9) c -= 9; } s += c; }
    return String((10 - (s % 10)) % 10);
  }
  function partitaIva(C) { let s = ''; for (let i = 0; i < 7; i++) s += C.intero(0, 9); s += '054'; return s + controlloPiva(s); }

  // codice fiscale vero nella forma (cognome, nome, data, comune) con il carattere di controllo giusto
  const DISPARI = { 0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21, A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23 };
  const consonanti = (s) => s.toUpperCase().replace(/[^A-Z]/g, '').replace(/[AEIOU]/g, '');
  const vocali = (s) => s.toUpperCase().replace(/[^AEIOU]/g, '');
  function codiceFiscale(cognome, nome, anno, mese, giorno, femmina, comune) {
    const cg = (consonanti(cognome) + vocali(cognome) + 'XXX').slice(0, 3);
    const cn = consonanti(nome);
    const nm = cn.length >= 4 ? cn[0] + cn[2] + cn[3] : (cn + vocali(nome) + 'XXX').slice(0, 3);
    const base = cg + nm + pad(anno % 100) + 'ABCDEHLMPRST'[mese - 1] + pad(giorno + (femmina ? 40 : 0)) + comune;
    let somma = 0;
    for (let i = 0; i < 15; i++) { const c = base[i]; somma += i % 2 === 0 ? DISPARI[c] : (/\d/.test(c) ? Number(c) : c.charCodeAt(0) - 65); }
    return base + String.fromCharCode(65 + (somma % 26));
  }

  // ---------- il negozio inventato ----------
  const NEGOZIO = {
    nome1: 'Ferramenta Agraria', nome2: 'Rossi · Perugia', titolo: 'Ferramenta Agraria Rossi',
    ragione: 'FERRAMENTA AGRARIA ROSSI S.N.C. DI ROSSI GIORGIO & C.',
    indirizzo: 'Via dei Mestieri 8', cap: '06132', citta: 'Perugia', prov: 'PG',
    tel: '075 000 1234', email: 'info@ferramentarossi.example', pec: 'ferramentarossi@pec.example',
    iban: 'IT60 X054 2811 1010 0000 0123 456', banca: 'Banca del Centro', rea: 'PG-000000',
  };
  const OPERATORI = [
    { id: 1, utente: 'giorgio', nome: 'GIORGIO ROSSI', admin: true, attivo: true, haPin: true },
    { id: 2, utente: 'anna', nome: 'ANNA ROSSI', admin: true, attivo: true, haPin: true },
    { id: 3, utente: 'matteo', nome: 'MATTEO BIANCHI', admin: false, attivo: true, haPin: true },
  ];

  // pagamenti come nel programma vero: stessi numeri, stessi nomi, giorni esatti dalla data della fattura
  const METODI = [
    { id: 1, codice: 'CONTANTI', nome: 'Contanti', giorni: 0, fe: 'MP01', tipo: 'CONTANTI' },
    { id: 2, codice: 'CARTA', nome: 'Carta di pagamento', giorni: 0, fe: 'MP08', tipo: 'CARTA' },
    { id: 3, codice: 'BONIF30', nome: 'Bonifico 30gg fine mese', giorni: 30, fe: 'MP05', tipo: 'BONIFICO' },
    { id: 4, codice: 'BONIF60FM', nome: 'Bonifico 60gg fine mese', giorni: 60, fe: 'MP05', tipo: 'BONIFICO' },
    { id: 5, codice: 'BONIF90FM', nome: 'Bonifico 90gg fine mese', giorni: 90, fe: 'MP05', tipo: 'BONIFICO' },
    { id: 6, codice: 'BONIF120FM', nome: 'Bonifico 120gg fine mese', giorni: 120, fe: 'MP05', tipo: 'BONIFICO' },
    { id: 17, codice: 'ASSEGNO', nome: 'Assegno', giorni: 0, fe: 'MP02', tipo: 'ASSEGNO' },
    { id: 18, codice: 'BONIFICO', nome: 'Bonifico', giorni: 0, fe: 'MP05', tipo: 'BONIFICO' },
    { id: 19, codice: 'RIBA30FM', nome: 'Riba 30gg fine mese', giorni: 30, fe: 'MP12', tipo: 'CREDITO' },
    { id: 20, codice: 'RIBA60FM', nome: 'Riba 60gg fine mese', giorni: 60, fe: 'MP12', tipo: 'CREDITO' },
    { id: 21, codice: 'RIBA90FM', nome: 'Riba 90gg fine mese', giorni: 90, fe: 'MP12', tipo: 'CREDITO' },
    { id: 22, codice: 'RIBA120FM', nome: 'Riba 120gg fine mese', giorni: 120, fe: 'MP12', tipo: 'CREDITO' },
    { id: 25, codice: 'RID', nome: 'RID', giorni: 0, fe: 'MP09', tipo: 'BONIFICO' },
  ];
  const CAUSALI_IVA = [
    { id: 1, codice: 'ORD', descr: 'IVA ordinaria', natura: null, split: false, rc: false, dicitura: '' },
    { id: 2, codice: 'SPLIT', descr: 'Split payment (scissione pagamenti)', natura: null, split: true, rc: false, dicitura: 'Scissione dei pagamenti ai sensi dell\'art. 17-ter del DPR 633/72' },
    { id: 3, codice: 'RC', descr: 'Reverse charge (inversione contabile)', natura: 'N6.9', split: false, rc: true, dicitura: 'Inversione contabile ai sensi dell\'art. 17 del DPR 633/72' },
    { id: 4, codice: 'RC-ROTT', descr: 'Reverse charge rottami', natura: 'N6.1', split: false, rc: true, dicitura: 'Inversione contabile art. 74 c. 7 e 8 DPR 633/72' },
    { id: 5, codice: 'RC-EPAL', descr: 'Reverse charge bancali/EPAL usati', natura: 'N6.1', split: false, rc: true, dicitura: 'Inversione contabile art. 74 c. 7 e 8 DPR 633/72' },
    { id: 6, codice: 'NI-ESP', descr: 'Non imponibile - esportazione', natura: 'N3.1', split: false, rc: false, dicitura: 'Operazione non imponibile art. 8 DPR 633/72' },
    { id: 7, codice: 'ES', descr: 'Esente', natura: 'N4', split: false, rc: false, dicitura: 'Operazione esente art. 10 DPR 633/72' },
    { id: 8, codice: 'FC', descr: 'Fuori campo IVA', natura: 'N2.2', split: false, rc: false, dicitura: 'Operazione fuori campo IVA' },
  ];
  const ALIQUOTE = [
    { id: 1, codice: '22', aliquota: 22 }, { id: 2, codice: '10', aliquota: 10 }, { id: 3, codice: '05', aliquota: 5 },
    { id: 4, codice: '04', aliquota: 4 }, { id: 5, codice: 'N4', aliquota: 0 },
  ];
  const CONTI = [
    { codice: 'CASSA', nome: 'Contanti', tipo: 'CASSA' },
    { codice: 'BANCA', nome: 'Banca del Centro c/c', tipo: 'BANCA' },
    { codice: 'POS', nome: 'POS / carte', tipo: 'POS' },
    { codice: 'ASSEGNI', nome: 'Assegni', tipo: 'ASSEGNI' },
    { codice: 'BANCA2', nome: 'Credito Umbro c/c', tipo: 'BANCA' },
  ];

  // codice, descrizione, IVA, ricarico A (min-max), colore
  const CATEGORIE = [
    ['FERR', 'FERRAMENTA E MINUTERIA', 22, 55, 95], ['UTEN', 'UTENSILERIA', 22, 35, 60], ['IDRA', 'IDRAULICA', 22, 45, 80],
    ['ELET', 'MATERIALE ELETTRICO', 22, 45, 75], ['VERN', 'VERNICI E COLORI', 22, 40, 65], ['GIAR', 'GIARDINAGGIO', 22, 40, 70],
    ['IRRI', 'IRRIGAZIONE', 22, 35, 60], ['CONC', 'CONCIMI', 4, 18, 30], ['FITO', 'FITOSANITARI', 22, 18, 32],
    ['SEME', 'SEMENTI', 4, 40, 70], ['MANG', 'MANGIMI', 10, 15, 25], ['ENOL', 'ENOLOGIA', 22, 30, 55],
    ['CASA', 'CASALINGHI', 22, 45, 80], ['ANTI', 'ANTINFORTUNISTICA', 22, 40, 70],
  ];

  // descrizione ({v} = variante), unita' di misura, costo min, costo max, giacenza max, varianti
  const MODELLI = {
    FERR: [
      ['VITE TRUCIOLARE TESTA SVASATA {v} (CONF. 200)', 'CF', 2.2, 7.5, 40, ['3,5X30', '4X40', '4X50', '5X60', '5X80', '6X100']],
      ['TASSELLO NYLON {v} MM (CONF. 100)', 'CF', 2.5, 9, 35, ['6', '8', '10', '12']],
      ['BULLONE TE ZINCATO M{v} (CONF. 50)', 'CF', 4, 18, 20, ['6X40', '8X60', '10X80', '12X100']],
      ['CHIODI PUNTA DIAMANTE {v} MM', 'KG', 2.8, 4.5, 30, ['30', '50', '70', '100']],
      ['CERNIERA A PAUMELLE {v} MM ZINCATA', 'PZ', 1.6, 4.2, 40, ['80', '100', '120']],
      ['LUCCHETTO OTTONE ARCO ACCIAIO {v} MM', 'PZ', 4, 11, 15, ['30', '40', '50']],
      ['CATENA ZINCATA {v} MM (AL METRO)', 'MT', 1.1, 3.6, 120, ['4', '6', '8']],
      ['FILO DI FERRO ZINCATO N.{v} ROTOLO 5 KG', 'PZ', 9, 14, 25, ['14', '16', '18']],
      ['RETE ELETTROSALDATA H {v} CM ROTOLO 25 M', 'PZ', 28, 46, 12, ['100', '150']],
      ['STAFFA ANGOLARE ZINCATA {v} MM', 'PZ', 0.35, 1.1, 80, ['40', '60', '90']],
      ['TENDITORE OCCHIO-GANCIO M{v}', 'PZ', 0.8, 2.2, 50, ['6', '8', '10']],
      ['MOSCHETTONE ACCIAIO ZINCATO {v} MM', 'PZ', 0.6, 1.6, 60, ['6', '8', '10']],
    ],
    UTEN: [
      ['MARTELLO CARPENTIERE MANICO FIBRA {v} G', 'PZ', 7, 15, 12, ['300', '500', '800']],
      ['SET CACCIAVITI 6 PZ PIATTI E CROCE', 'PZ', 8, 16, 10, null],
      ['PINZA UNIVERSALE {v} MM', 'PZ', 6, 11, 10, ['180', '200']],
      ['CHIAVE REGOLABILE {v} POLLICI', 'PZ', 7, 16, 10, ['8', '10', '12']],
      ['FLESSOMETRO {v} M', 'PZ', 3, 9, 20, ['3', '5', '8']],
      ['LIVELLA ALLUMINIO {v} CM', 'PZ', 6, 18, 8, ['40', '60', '100']],
      ['SEGHETTO DA FERRO TELAIO REGOLABILE', 'PZ', 6, 10, 8, null],
      ['TRAPANO AVVITATORE 18V 2 BATTERIE', 'PZ', 65, 95, 5, null],
      ['SET PUNTE HSS 1-10 MM (19 PZ)', 'PZ', 9, 16, 10, null],
      ['SMERIGLIATRICE ANGOLARE 115 MM 750 W', 'PZ', 32, 48, 4, null],
      ['DISCO TAGLIO FERRO {v} MM', 'PZ', 0.7, 2.5, 60, ['115', '230']],
      ['CUTTER LAMA 18 MM CON 5 LAME', 'PZ', 2.2, 4, 20, null],
    ],
    IDRA: [
      ['RACCORDO OTTONE MANICOTTO {v} F-F', 'PZ', 1.1, 3.8, 40, ['1/2', '3/4', '1']],
      ['VALVOLA A SFERA {v} F-F LEVA', 'PZ', 3.2, 12, 25, ['3/8', '1/2', '3/4', '1']],
      ['RUBINETTO PORTAGOMMA {v}', 'PZ', 3.5, 6.5, 20, ['1/2', '3/4']],
      ['TUBO MULTISTRATO {v} (AL METRO)', 'MT', 0.9, 1.6, 200, ['16X2', '20X2']],
      ['NASTRO TEFLON 12 MM X 12 M', 'PZ', 0.3, 0.6, 80, null],
      ['SIFONE LAVELLO CON PILETTA', 'PZ', 4.5, 8, 10, null],
      ['MISCELATORE LAVELLO CANNA ALTA', 'PZ', 28, 55, 5, null],
      ['FLESSIBILE INOX {v} CM 3/8', 'PZ', 2.5, 4.2, 30, ['30', '40', '50']],
      ['GUARNIZIONE FIBRA {v} (CONF. 10)', 'CF', 0.6, 1.2, 40, ['1/2', '3/4', '1']],
      ['CANAPA PETTINATA 100 G', 'PZ', 1.5, 2.4, 25, null],
    ],
    ELET: [
      ['LAMPADINA LED E27 {v} W LUCE CALDA', 'PZ', 1.6, 3.2, 50, ['9', '12', '15']],
      ['PROLUNGA {v} M CAVO 3X1,5', 'PZ', 7, 28, 10, ['5', '10', '25']],
      ['MULTIPRESA 4 POSTI CON INTERRUTTORE', 'PZ', 5.5, 9, 15, null],
      ['CAVO FS17 {v} MMQ (AL METRO)', 'MT', 0.18, 0.42, 300, ['1,5', '2,5']],
      ['NASTRO ISOLANTE PVC 19 MM', 'PZ', 0.5, 1, 60, null],
      ['PILE ALCALINE {v} (CONF. 4)', 'CF', 2.4, 3.8, 40, ['AA', 'AAA']],
      ['INTERRUTTORE DA ESTERNO IP55', 'PZ', 3.5, 6.5, 15, null],
      ['FARO LED 50 W CON SENSORE', 'PZ', 16, 28, 6, null],
    ],
    VERN: [
      ['SMALTO SINTETICO {v} 750 ML', 'PZ', 7, 11, 12, ['BIANCO', 'VERDE', 'MARRONE', 'NERO', 'ROSSO']],
      ['IMPREGNANTE LEGNO {v} 2,5 L', 'PZ', 17, 26, 8, ['NOCE', 'CASTAGNO', 'INCOLORE']],
      ['ANTIRUGGINE GRIGIA 750 ML', 'PZ', 6.5, 9, 12, null],
      ['PENNELLO PIATTO {v} MM', 'PZ', 1.2, 3.6, 30, ['30', '50', '70']],
      ['RULLO ANTIGOCCIA {v} CM', 'PZ', 3, 6, 15, ['14', '23']],
      ['DILUENTE NITRO 1 L', 'PZ', 2.6, 4, 20, null],
      ['STUCCO IN PASTA 1 KG', 'PZ', 3.5, 5.5, 15, null],
      ['SILICONE ACETICO TRASPARENTE 280 ML', 'PZ', 2.6, 4.2, 30, null],
      ['IDROPITTURA TRASPIRANTE BIANCA 14 L', 'PZ', 24, 38, 8, null],
    ],
    GIAR: [
      ['FORBICE DA POTATURA BYPASS {v} MM', 'PZ', 9, 24, 12, ['200', '220']],
      ['RASTRELLO {v} DENTI MANICO LEGNO', 'PZ', 6, 10, 10, ['14', '16']],
      ['ZAPPA FORGIATA {v} G', 'PZ', 9, 15, 8, ['1200', '1600']],
      ['CARRIOLA RUOTA PIENA 90 L', 'PZ', 42, 60, 4, null],
      ['VASO PLASTICA TONDO {v} CM', 'PZ', 0.8, 4.5, 60, ['20', '30', '40']],
      ['TUBO GIARDINO 4 STRATI {v} ROTOLO 25 M', 'PZ', 14, 32, 10, ['1/2', '5/8', '3/4']],
      ['IRRIGATORE A IMPULSI SU PICCHETTO', 'PZ', 6, 11, 12, null],
      ['SVETTATOIO TELESCOPICO 4 M', 'PZ', 28, 45, 4, null],
      ['TERRICCIO UNIVERSALE {v} L', 'SC', 2.8, 8, 40, ['20', '50', '80']],
      ['TELO PACCIAMATURA NERO 1,2X100 M', 'PZ', 18, 28, 6, null],
    ],
    IRRI: [
      ['TUBO PE BASSA DENSITA {v} MM ROTOLO 100 M', 'PZ', 16, 58, 10, ['16', '20', '25', '32']],
      ['ALA GOCCIOLANTE 16 MM PASSO {v} CM ROTOLO 200 M', 'PZ', 28, 45, 8, ['20', '33']],
      ['GOCCIOLATORE AUTOCOMPENSANTE {v} L/H (CONF. 100)', 'CF', 12, 18, 10, ['2', '4']],
      ['RACCORDO A COMPRESSIONE TEE {v} MM', 'PZ', 1.6, 4.2, 40, ['20', '25', '32']],
      ['PROGRAMMATORE IRRIGAZIONE 1 VIA A BATTERIA', 'PZ', 26, 38, 6, null],
      ['FILTRO A RETE {v}', 'PZ', 6, 11, 10, ['3/4', '1']],
      ['MINIGOCCIOLATORE CON PICCHETTO (CONF. 50)', 'CF', 7, 10, 12, null],
    ],
    CONC: [
      ['CONCIME NPK {v} SACCO 25 KG', 'SC', 24, 36, 40, ['20-10-10', '15-15-15', '12-12-17', '8-24-24']],
      ['NITRATO AMMONICO 27% SACCO 25 KG', 'SC', 18, 24, 50, null],
      ['UREA 46% SACCO 25 KG', 'SC', 20, 26, 50, null],
      ['SOLFATO POTASSICO 50% SACCO 25 KG', 'SC', 26, 34, 30, null],
      ['STALLATICO PELLETTATO SACCO {v} KG', 'SC', 4, 12, 60, ['5', '25']],
      ['CONCIME LIQUIDO ORTO 1 L', 'PZ', 4, 6.5, 20, null],
      ['CORNUNGHIA 5 KG', 'PZ', 7, 11, 15, null],
    ],
    FITO: [
      ['FUNGICIDA RAMEICO WG 1 KG', 'PZ', 9, 14, 30, null],
      ['FUNGICIDA ZOLFO BAGNABILE 1 KG', 'PZ', 3.5, 6, 40, null],
      ['INSETTICIDA PIRETRINE NATURALI 250 ML', 'PZ', 14, 22, 15, null],
      ['DISERBANTE SISTEMICO GLIFOSATE {v} L', 'PZ', 9, 38, 20, ['1', '5']],
      ['INSETTICIDA OLIO MINERALE 1 L', 'PZ', 6, 9, 20, null],
      ['FUNGICIDA SISTEMICO VITE 1 KG', 'PZ', 24, 38, 15, null],
      ['INSETTICIDA BACILLUS THURINGIENSIS 500 G', 'PZ', 18, 26, 12, null],
      ['ESCA LUMACHICIDA 1 KG', 'PZ', 5, 8, 20, null],
      ['ACARICIDA VITE 1 L', 'PZ', 32, 48, 8, null],
      ['FUNGICIDA POLTIGLIA BORDOLESE 1 KG', 'PZ', 6, 9, 25, null],
      ['COADIUVANTE BAGNANTE 1 L', 'PZ', 7, 11, 12, null],
      ['RODENTICIDA ESCHE IN PASTA 500 G', 'PZ', 6, 10, 15, null],
    ],
    SEME: [
      ['SEMENTE PRATO RUSTICO {v} KG', 'PZ', 6, 26, 20, ['1', '5']],
      ['BUSTINA SEMI {v}', 'PZ', 0.7, 1.4, 50, ['ZUCCHINA', 'POMODORO CUORE DI BUE', 'LATTUGA', 'BASILICO', 'FAGIOLINO', 'CAROTA', 'PREZZEMOLO', 'SPINACIO']],
      ['CIPOLLINE DA TRAPIANTO 500 G', 'PZ', 1.8, 3, 30, null],
      ['PATATE DA SEME {v} 10 KG', 'SC', 9, 14, 20, ['AGATA', 'KENNEBEC']],
      ['GRANO DA SEMINA 25 KG', 'SC', 16, 22, 20, null],
    ],
    MANG: [
      ['MANGIME GALLINE OVAIOLE SACCO 25 KG', 'SC', 13, 18, 40, null],
      ['MAIS GRANELLA SACCO 25 KG', 'SC', 8, 11, 60, null],
      ['CRUSCA DI GRANO SACCO 20 KG', 'SC', 7, 10, 30, null],
      ['CROCCHETTE CANE ADULTO {v} KG', 'PZ', 8, 28, 20, ['4', '15']],
      ['MANGIME CONIGLI PELLETTATO 25 KG', 'SC', 14, 19, 20, null],
      ['BLOCCO SALE PASTORIZIA 10 KG', 'PZ', 4, 6, 15, null],
    ],
    ENOL: [
      ['METABISOLFITO DI POTASSIO 1 KG', 'PZ', 3.5, 6, 25, null],
      ['LIEVITO SELEZIONATO VINO ROSSO 500 G', 'PZ', 14, 22, 12, null],
      ['TAPPO SUGHERO {v} (CONF. 100)', 'CF', 7, 14, 30, ['24X44', '24X38']],
      ['DAMIGIANA VETRO {v} L CON CESTO', 'PZ', 18, 30, 8, ['34', '54']],
      ['TUBO TRAVASO ALIMENTARE {v} MM (AL METRO)', 'MT', 0.9, 2, 100, ['12', '15', '20']],
      ['CARTONI FILTRANTI 20X20 (CONF. 25)', 'CF', 9, 14, 12, null],
      ['ACIDO TARTARICO 1 KG', 'PZ', 6, 9, 15, null],
      ['TANNINO ENOLOGICO 500 G', 'PZ', 18, 26, 8, null],
    ],
    CASA: [
      ['SECCHIO MURATORE {v} L', 'PZ', 1.8, 3, 30, ['12', '16']],
      ['SCOPA SAGGINA MANICO LEGNO', 'PZ', 4, 7, 15, null],
      ['SACCHI IMMONDIZIA 70X110 (ROTOLO 10)', 'PZ', 1.2, 2, 60, null],
      ['STENDIBIANCHERIA ALLUMINIO 18 M', 'PZ', 14, 22, 6, null],
      ['ACIDO MURIATICO 1 L', 'PZ', 0.9, 1.4, 40, null],
      ['ALCOOL DENATURATO 1 L', 'PZ', 1.1, 1.8, 40, null],
      ['CANDEGGINA 2 L', 'PZ', 0.9, 1.5, 30, null],
    ],
    ANTI: [
      ['GUANTI NITRILE SPALMATI TG. {v}', 'PZ', 1.1, 2.2, 60, ['8', '9', '10']],
      ['OCCHIALI PROTETTIVI LENTE CHIARA', 'PZ', 2.2, 4, 20, null],
      ['SCARPA ANTINFORTUNISTICA S3 N. {v}', 'PZ', 32, 48, 4, ['41', '42', '43', '44']],
      ['MASCHERINA FFP2 (CONF. 10)', 'CF', 4, 7, 20, null],
      ['TUTA DA LAVORO COTONE TG. {v}', 'PZ', 16, 24, 6, ['M', 'L', 'XL']],
      ['CUFFIE ANTIRUMORE SNR 27', 'PZ', 7, 12, 8, null],
      ['GILET ALTA VISIBILITA', 'PZ', 2.5, 4.5, 20, null],
    ],
  };

  // ragione sociale, referente, città, provincia, CAP, categorie servite
  const FORNITORI = [
    ['VITERIA CENTRO ITALIA S.R.L.', 'Sig. Fabbri', 'Arezzo', 'AR', '52100', ['FERR']],
    ['UTENSILERIA ADRIATICA S.R.L.', 'Ufficio ordini', 'Ancona', 'AN', '60131', ['UTEN']],
    ['IDROTERMICA TIBERINA S.R.L.', 'Sig.ra Conti', 'Terni', 'TR', '05100', ['IDRA']],
    ['ELETTROFORNITURE VALLE UMBRA S.R.L.', 'Sig. Moretti', 'Foligno', 'PG', '06034', ['ELET']],
    ['COLORIFICIO APPENNINO S.N.C.', 'Sig. Galli', 'Gubbio', 'PG', '06024', ['VERN']],
    ['VERDE ATTREZZATURE S.R.L.', 'Ufficio commerciale', 'Pistoia', 'PT', '51100', ['GIAR']],
    ['IRRIGAZIONE MODERNA S.R.L.', 'Sig. Serra', 'Latina', 'LT', '04100', ['IRRI']],
    ['AGROCHIMICA CENTRO S.R.L.', 'Dott. Leone', 'Perugia', 'PG', '06135', ['FITO', 'CONC']],
    ['SEMENTI ITALIA CENTRALE S.P.A.', 'Ufficio vendite', 'Bologna', 'BO', '40138', ['SEME']],
    ['MANGIMIFICIO COLLE ALTO S.R.L.', 'Sig. Testa', 'Todi', 'PG', '06059', ['MANG']],
    ['ENOFORNITURE UMBRE S.R.L.', 'Sig.ra Neri', 'Orvieto', 'TR', '05018', ['ENOL']],
    ['CASALINGHI DISTRIBUZIONE S.R.L.', 'Ufficio ordini', 'Roma', 'RM', '00155', ['CASA']],
    ['SICUREZZA LAVORO S.R.L.', 'Sig. Monti', 'Firenze', 'FI', '50127', ['ANTI']],
  ];

  const AZIENDE = [
    'AZ. AGR. COLLE DEI GELSI', 'AZ. AGR. LE DUE QUERCE', 'SOC. AGR. VALLE VERDE S.S.', 'CANTINA POGGIO ALTO S.R.L.',
    'FRANTOIO LE OLIVETTE S.R.L.', 'AGRITURISMO IL MULINO VECCHIO S.R.L.', 'EDIL COSTRUZIONI MARTINI S.R.L.', 'IDRAULICA FABBRI & FIGLI S.N.C.',
    'IMPIANTI ELETTRICI MORETTI S.N.C.', 'VIVAIO FIORI DEL COLLE S.R.L.', 'FALEGNAMERIA RICCI S.N.C.',
    'CARPENTERIA GALLI S.R.L.', 'AZ. AGR. SAN MARTINO S.S.', 'COOP. AGRICOLA LA SPIGA', 'ALLEVAMENTO LA FATTORIA S.R.L.',
    'MANUTENZIONI VERDI S.S.', 'AZ. AGR. I TRE ULIVI S.S.',
  ];
  const COGNOMI = ['BIANCHI', 'FERRI', 'CONTI', 'MARINI', 'GALLI', 'COSTA', 'FABBRI', 'MORETTI', 'BARBIERI', 'LOMBARDI',
    'RINALDI', 'MANCINI', 'LONGO', 'LEONE', 'MARTINELLI', 'VITALE', 'SERRA', 'DE SANTIS', 'FIORE', 'PELLEGRINI',
    'BRUNO', 'GENTILE', 'RICCI', 'FERRARA', 'SILVESTRI', 'TESTA', 'BENEDETTI', 'ORLANDO', 'SANTORO', 'MARIANI',
    'RIZZI', 'MONTI', 'BELLINI', 'NERI', 'SARTORI', 'VALENTINI', 'GRASSI', 'CECCHINI', 'PICCIONI', 'TOSI'];
  const NOMI_M = ['MARIO', 'GIUSEPPE', 'LUIGI', 'FRANCO', 'PAOLO', 'ANDREA', 'MARCO', 'STEFANO', 'ROBERTO', 'GIOVANNI', 'SANDRO', 'FABIO', 'MATTEO', 'SIMONE', 'CLAUDIO', 'SERGIO', 'ANTONIO', 'ALESSANDRO', 'ENRICO'];
  const NOMI_F = ['ANNA', 'MARIA', 'LAURA', 'PAOLA', 'GIULIA', 'FRANCESCA', 'ELENA', 'RITA', 'DANIELA', 'SILVIA', 'CARLA'];
  const PAESI = [['PERUGIA', 'PG', '06121', 'G478'], ['FOLIGNO', 'PG', '06034', 'D653'], ['ASSISI', 'PG', '06081', 'A475'], ['SPELLO', 'PG', '06038', 'I888'],
    ['BEVAGNA', 'PG', '06031', 'A832'], ['TODI', 'PG', '06059', 'L188'], ['MARSCIANO', 'PG', '06055', 'E975'], ['DERUTA', 'PG', '06053', 'D269'],
    ['TORGIANO', 'PG', '06089', 'L216'], ['BASTIA UMBRA', 'PG', '06083', 'A710']];
  const VIE = ['VIA ROMA', 'VIA GARIBALDI', 'VIA DEI MILLE', 'VIA DELLA STAZIONE', 'VIA SAN FRANCESCO', 'VIA DEI CAMPI',
    'VIA MOLINO', 'STRADA DELLE VIGNE', 'VIA DEL LAVORO', 'VIA MAZZINI', 'VIA CAVOUR', 'VIA DELLE FONTI'];

  // stagionalità (gen..dic) per gruppo di categorie (per lo storico dell'Analisi)
  const STAGIONI = {
    agri: [0.55, 0.75, 1.25, 1.5, 1.5, 1.35, 1.1, 0.85, 1.05, 0.95, 0.7, 0.5],
    enol: [0.6, 0.5, 0.6, 0.6, 0.6, 0.7, 0.9, 1.4, 2.4, 1.9, 0.9, 0.6],
    vern: [0.7, 0.8, 1.1, 1.3, 1.35, 1.3, 1.1, 0.8, 1.0, 0.95, 0.8, 0.7],
    piatta: [0.85, 0.9, 1.0, 1.05, 1.1, 1.05, 1.0, 0.8, 1.0, 1.05, 1.0, 1.1],
  };
  const GRUPPO = { CONC: 'agri', FITO: 'agri', SEME: 'agri', IRRI: 'agri', GIAR: 'agri', ENOL: 'enol', VERN: 'vern' };
  const QUOTA = { FERR: 12, UTEN: 7, IDRA: 9, ELET: 5, VERN: 6, GIAR: 8, IRRI: 6, CONC: 12, FITO: 13, SEME: 4, MANG: 7, ENOL: 4, CASA: 3, ANTI: 4 };
  const QUOTA_DDT = { FITO: 0.55, CONC: 0.5, IRRI: 0.45, SEME: 0.4, MANG: 0.35, GIAR: 0.3 };
  const ADR = 'UN 3077 MATERIA PERICOLOSA PER L\'AMBIENTE, SOLIDA, N.A.S., 9, III';

  // ---------- generatore ----------
  function genera(oggi, adesso) {
    const C = creaCaso(20261001);
    const S = {
      versione: 8, generatoIl: oggi, negozio: Object.assign({}, NEGOZIO, { piva: '0123456' + '054' + controlloPiva('0123456054') }),
      operatori: OPERATORI.map((o) => Object.assign({}, o)),
      metodi: METODI.map((m) => Object.assign({}, m)), causaliIva: CAUSALI_IVA.map((c) => Object.assign({}, c)),
      aliquote: ALIQUOTE.map((a) => Object.assign({}, a)), conti: CONTI.map((c) => Object.assign({ iniziale: 0 }, c)),
      numeri: {}, impostazioni: {
        commercialista: 'studio.contabile@example.it', pecCasella: '', pecUtente: '', pecConfigurata: false,
        bloccoMinuti: 15, ddtFitoStile: 'B', provvAgente: 'Agente di zona',
      },
    };
    S.negozio.cf = S.negozio.piva;
    let ultimoId = 1000;
    const nuovoId = () => ++ultimoId;
    const annoOggi = daIso(oggi).getFullYear();

    // categorie
    S.categorie = CATEGORIE.map((c, i) => ({ id: i + 1, codice: c[0], descr: c[1], iva: c[2], ricMin: c[3], ricMax: c[4] }));
    const catPer = {}; S.categorie.forEach((c) => { catPer[c.codice] = c; });

    // fornitori (più qualcuno «DA COMPLETARE», come quelli nati dall'importazione del vecchio archivio)
    S.fornitori = FORNITORI.map((f, i) => {
      const slug = f[0].toLowerCase().replace(/ (s\.r\.l\.|s\.n\.c\.|s\.p\.a\.)$/, '').replace(/[^a-z]/g, '').slice(0, 16);
      return {
        id: i + 1, codice: 'F' + String(i + 1).padStart(3, '0'), nome: f[0], referente: f[1], indirizzo: C.scegli(VIE).replace(/^VIA/, 'Via').replace(/^STRADA/, 'Strada') + ' ' + C.intero(1, 90),
        citta: f[2].toUpperCase(), prov: f[3], cap: f[4], cat: f[5], piva: partitaIva(C), tel: '0' + C.intero(55, 75) + ' ' + C.intero(100000, 999999),
        email: 'ordini@' + slug + '.example', pec: slug + '@pec.example', iban: 'IT' + C.intero(10, 99) + ' X' + C.intero(1000, 9999) + ' ' + C.intero(1000, 9999) + ' ' + C.intero(1000, 9999) + ' ' + C.intero(100000, 999999),
        cond: C.scegli(['Bonifico 60gg fine mese', 'Riba 60gg fine mese', 'Riba 90gg fine mese', 'Bonifico 30gg fine mese', 'RID']),
      };
    });
    [14, 27, 31, 46].forEach((n, i) => S.fornitori.push({ id: 14 + i, codice: String(n), nome: 'DA COMPLETARE (' + n + ')', referente: '', indirizzo: '', citta: '', prov: '', cap: '', cat: [], piva: '', tel: '', email: '', pec: '', iban: '', cond: '' }));
    const fornPer = {}; S.fornitori.forEach((f) => f.cat.forEach((c) => { if (!fornPer[c]) fornPer[c] = f.id; }));
    const daCompletare = S.fornitori.filter((f) => f.nome.startsWith('DA COMPLETARE'));

    // articoli
    S.articoli = [];
    const progr = {};
    for (const cat of S.categorie) {
      for (const m of MODELLI[cat.codice]) {
        const varianti = m[5] || [null];
        varianti.forEach((v, i) => {
          progr[cat.codice] = (progr[cat.codice] || 0) + C.intero(3, 19);
          const t = varianti.length > 1 ? i / (varianti.length - 1) : C.r();
          const costo = r2((m[2] + (m[3] - m[2]) * t) * C.tra(0.92, 1.08));
          const ricA = Math.round(C.tra(cat.ricMin, cat.ricMax));
          const ricB = Math.max(10, ricA - C.intero(8, 12)), ricC = Math.max(8, ricA - C.intero(18, 24));
          const iva = (cat.codice === 'GIAR' && m[0].startsWith('TERRICCIO')) ? 10 : cat.iva;
          const prezzo = (r) => prezzoBello(costo * (1 + r / 100) * (1 + iva / 100), C);
          const forn = C.prob(0.08) ? C.scegli(daCompletare).id : fornPer[cat.codice];
          const a = {
            id: nuovoId(), codice: cat.codice + String(progr[cat.codice]).padStart(4, '0'),
            barcode: C.prob(0.55) ? ean13(C) : '', descr: m[0].replace('{v}', v || ''), cat: cat.id, um: m[1], iva, costo,
            prezzoA: prezzo(ricA), prezzoB: prezzo(ricB), prezzoC: prezzo(ricC), ricA, ricB, ricC,
            giac: C.intero(0, m[4]), scortaMin: 0, forn, codForn: C.prob(0.7) ? String(C.intero(10000, 99999)) : '',
            dataAcq: piuGiorni(oggi, -C.intero(3, 220)), lotto: '', scadenza: '', fito: cat.codice === 'FITO', info: '', nReg: '',
          };
          // nella scheda il ricarico è quello del prezzo arrotondato (come li scrive il negozio)
          const ricVero = (p) => Math.round((p / (1 + iva / 100) / costo - 1) * 100);
          a.ricA = ricVero(a.prezzoA); a.ricB = ricVero(a.prezzoB); a.ricC = ricVero(a.prezzoC);
          a.scortaMin = C.prob(0.6) ? Math.max(1, Math.round(m[4] * C.tra(0.1, 0.25))) : 0;
          if (a.scortaMin) a.giac = C.intero(a.scortaMin, Math.max(a.scortaMin, m[4]));
          if (cat.codice === 'FITO') {
            a.nReg = C.intero(10000, 17999) + ' DEL ' + piuGiorni(oggi, -C.intero(900, 6000)).split('-').reverse().join('/');
            a.produttore = C.scegli(['AGROSAN S.P.A.', 'FITOVERDE S.R.L.', 'CHIMICA AGRARIA ITALIA', 'BIOPROTEZIONE S.R.L.', 'AGRIDIFESA S.P.A.']);
            a.lotto = 'L' + C.intero(2400, 2699) + '-' + C.intero(10, 99);
            if (C.prob(0.6)) a.info = ADR;
          }
          if (cat.codice === 'ENOL' && C.prob(0.75)) { a.lotto = 'E' + C.intero(100, 999); a.scadenza = piuGiorni(oggi, C.intero(60, 700)); }
          S.articoli.push(a);
        });
      }
    }
    // qualche situazione da tenere d'occhio: sotto scorta, venduti sottocosto, ricarico della scheda che non torna
    C.mescola(S.articoli).slice(0, 18).forEach((a) => { if (!a.scortaMin) a.scortaMin = C.intero(3, 8); a.giac = C.intero(0, a.scortaMin - 1); });
    C.mescola(S.articoli.filter((a) => a.prezzoA > 3)).slice(0, 6).forEach((a) => { a.costo = r2(a.prezzoA / (1 + a.iva / 100) * C.tra(1.04, 1.18)); });
    C.mescola(S.articoli).slice(0, 9).forEach((a) => { a.ricA = a.ricA + C.intero(6, 14); });
    const artDiCat = (cod) => S.articoli.filter((a) => a.cat === catPer[cod].id);

    // clienti: aziende, ditte con partita IVA e privati, con codici fiscali e partite IVA validi
    S.clienti = [];
    let nCli = 1;
    const indirizzo = () => C.scegli(VIE) + ' ' + C.intero(1, 140);
    const persona = () => { const f = C.prob(0.35); return { cognome: C.scegli(COGNOMI), nome: C.scegli(f ? NOMI_F : NOMI_M), f }; };
    const cfPer = (p, paese) => codiceFiscale(p.cognome, p.nome, C.intero(1940, 1999), C.intero(1, 12), C.intero(1, 28), p.f, paese[3]);
    AZIENDE.forEach((nome) => {
      const p = C.scegli(PAESI);
      const slug = nome.toLowerCase().replace(/^(az\. agr\.|soc\. agr\.|coop\. agricola) /, '').replace(/ (s\.r\.l\.|s\.n\.c\.|s\.s\.)$/, '').replace(/[^a-z]/g, '').slice(0, 16);
      const piva = partitaIva(C);
      S.clienti.push({
        id: nuovoId(), codice: String(nCli++), tipoSogg: 'SOCIETA', nome, indirizzo: indirizzo(), citta: p[0], prov: p[1], cap: p[2],
        piva, cf: piva, tel: '07' + C.intero(42, 59) + ' ' + C.intero(100000, 999999), cell: C.prob(0.5) ? '3' + C.intero(20, 49) + ' ' + C.intero(1000000, 9999999) : '',
        email: 'amministrazione@' + slug + '.example', email2: '', pec: slug + '@pec.example', sdi: C.prob(0.6) ? 'M5UXCR1' : '0000000',
        listino: C.scegli(['A', 'B', 'B', 'C']),
        pagTesto: C.scegli(['Riba 60gg fine mese', 'Riba 90gg fine mese', 'Bonifico 30gg fine mese', 'Riba 30gg fine mese', 'Bonifico 60gg fine mese']),
      });
    });
    S.clienti.push({ id: nuovoId(), codice: String(nCli++), tipoSogg: 'PA', nome: 'COMUNE DI SAN TERENZIANO', indirizzo: 'PIAZZA DEL MUNICIPIO 1', citta: 'TODI', prov: 'PG', cap: '06059', piva: partitaIva(C), cf: '', tel: '075 000 0101', cell: '', email: 'protocollo@comune.example', email2: '', pec: 'comune@pec.example', sdi: 'UFX4K2', listino: 'B', pagTesto: 'Bonifico 30gg fine mese' });
    S.clienti[S.clienti.length - 1].cf = S.clienti[S.clienti.length - 1].piva;
    const usati = new Set();
    while (S.clienti.length < 72) {
      const pe = persona();
      const nome = pe.cognome + ' ' + pe.nome;
      if (usati.has(nome)) continue;
      usati.add(nome);
      const p = C.scegli(PAESI);
      const conPiva = C.prob(0.25);   // artigiani e agricoltori con partita IVA
      S.clienti.push({
        id: nuovoId(), codice: String(nCli++), tipoSogg: conPiva ? 'DITTA' : 'PRIVATO', nome, nomeP: pe,
        indirizzo: indirizzo(), citta: p[0], prov: p[1], cap: p[2], piva: conPiva ? partitaIva(C) : '', cf: cfPer(pe, p),
        tel: C.prob(0.4) ? '07' + C.intero(42, 59) + ' ' + C.intero(100000, 999999) : '', cell: '3' + C.intero(20, 49) + ' ' + C.intero(1000000, 9999999),
        email: C.prob(0.6) ? (pe.nome + '.' + pe.cognome.replace(/ /g, '')).toLowerCase() + '@email.example' : '', email2: '',
        pec: '', sdi: conPiva ? '0000000' : '', listino: C.prob(0.85) ? 'A' : 'B',
        pagTesto: conPiva ? C.scegli(['Rimessa diretta', 'Bonifico 30gg fine mese', '']) : '',
      });
    }
    S.clienti.forEach((c) => { delete c.nomeP; });
    const cliPer = {}; S.clienti.forEach((c) => { cliPer[c.id] = c; });
    const aziende = S.clienti.filter((c) => c.tipoSogg !== 'PRIVATO' && c.tipoSogg !== 'PA');

    // patentini per i fitosanitari: un quarto scaduti, qualcuno in scadenza
    S.patentini = [];
    C.mescola(S.clienti.filter((c) => c.tipoSogg !== 'PA')).slice(0, 44).forEach((c, i) => {
      const scade = i < 11 ? piuGiorni(oggi, -C.intero(20, 900)) : i < 16 ? piuGiorni(oggi, C.intero(5, 58)) : piuGiorni(oggi, C.intero(90, 1700));
      const titolare = c.tipoSogg === 'SOCIETA' ? (C.scegli(COGNOMI) + ' ' + C.scegli(NOMI_M)) : c.nome;
      S.patentini.push({
        id: nuovoId(), numero: String(C.intero(2100, 16999)), nominativo: titolare, indirizzo: c.indirizzo + ' - ' + c.citta,
        ente: 'REGIONE UMBRIA', rilascio: piuGiorni(scade, -1826), validoDa: piuGiorni(scade, -1826), validoA: scade, clienteId: c.id,
      });
    });

    // ---------- vendite al banco: gli ultimi 35 giorni, scontrino per scontrino ----------
    S.scontrini = []; S.chiusure = [];
    let nSc = 2300 + C.intero(0, 200);
    let nRt = 1400 + C.intero(0, 100), nZ = 180 + C.intero(0, 40);
    const pesoBanco = { FERR: 6, IDRA: 4, ELET: 4, CASA: 3, VERN: 3, GIAR: 3, UTEN: 2, ANTI: 2, SEME: 2, MANG: 2, CONC: 1, FITO: 0, IRRI: 1, ENOL: 1 };
    const vasoBanco = [];
    for (const cat of S.categorie) for (const a of artDiCat(cat.codice)) for (let k = 0; k < (pesoBanco[cat.codice] || 0); k++) vasoBanco.push(a);
    const oraAdesso = adesso.getHours() + adesso.getMinutes() / 60;
    const nomiOp = ['GIORGIO ROSSI', 'ANNA ROSSI', 'MATTEO BIANCHI'];
    for (let g = 35; g >= 0; g--) {
      const giorno = piuGiorni(oggi, -g);
      const dow = daIso(giorno).getDay();
      if (dow === 0) continue;
      let quanti = dow === 6 ? C.intero(14, 22) : C.intero(26, 40);
      let fine = dow === 6 ? 12.5 : 19.25;
      if (g === 0) { fine = Math.min(fine, Math.max(8.6, oraAdesso)); quanti = Math.max(4, Math.round(quanti * Math.min(1, (fine - 8.5) / 10.5))); }
      const orari = [];
      for (let k = 0; k < quanti; k++) {
        let h = C.tra(8.5, fine);
        if (dow !== 6 && h > 12.75 && h < 15.5) h = 15.5 + (h - 12.75) * 0.4;
        orari.push(h);
      }
      let totGiorno = 0, nGiorno = 0;
      orari.sort((a, b) => a - b).forEach((h, idx) => {
        const righe = [];
        const nr = C.prob(0.55) ? 1 : C.intero(2, 4);
        for (let k = 0; k < nr; k++) {
          const a = C.scegli(vasoBanco);
          if (righe.some((r) => r.artId === a.id)) continue;
          const qta = a.um === 'MT' ? C.intero(2, 25) : a.um === 'KG' ? C.intero(1, 3) : C.prob(0.75) ? 1 : C.intero(2, 4);
          righe.push({ artId: a.id, codice: a.codice, descr: a.descr, qta, prezzo: a.prezzoA, sconto: 0, iva: a.iva, listino: 'A' });
        }
        const tot = r2(righe.reduce((s, r) => s + r.qta * r.prezzo, 0));
        const minuti = Math.floor((h % 1) * 60), secondi = C.intero(0, 59);
        const pag = C.prob(0.6) ? 1 : 2;
        // un paio di scontrini battuti per sbaglio dal computer dell'ufficio (simulazione, in rosso)
        const sim = g === 4 && idx === 3;
        const sc = {
          id: nuovoId(), numero: ++nSc, data: giorno + 'T' + pad(Math.floor(h)) + ':' + pad(minuti) + ':' + pad(secondi),
          clienteId: C.prob(0.12) ? C.scegli(S.clienti).id : null, metodoId: pag, righe, totale: tot,
          postazione: sim ? 'UFFICIO-PC' : 'CASSA-PC', esito: sim ? 'SIMULAZIONE: cassa non collegata' : 'EMESSO (cassa n. ' + (++nRt) + ')',
          operatore: sim ? 'GIORGIO ROSSI' : C.scegli(nomiOp),
        };
        S.scontrini.push(sc);
        if (!sim) { totGiorno += tot; nGiorno++; }
      });
      if (g > 0) S.chiusure.push({ data: giorno, numero: ++nZ, scontrini: nGiorno, totale: r2(totGiorno) });
    }
    S.numeri.scontrino = nSc; S.numeri.rt = nRt; S.numeri.z = nZ;

    // ---------- DDT, fatture e scadenze ----------
    S.ddt = []; S.fatture = []; S.scadenze = [];
    const clientiDdt = C.mescola(aziende).slice(0, 12);
    const pesoDdt = { FITO: 5, CONC: 5, IRRI: 3, SEME: 2, MANG: 2, GIAR: 2, FERR: 2, IDRA: 2, VERN: 1, UTEN: 1, ANTI: 1, ELET: 1, ENOL: 1 };
    const vasoDdt = [];
    for (const cat of S.categorie) for (const a of artDiCat(cat.codice)) for (let k = 0; k < (pesoDdt[cat.codice] || 0); k++) vasoDdt.push(a);
    const righeDoc = (n, listino) => {
      const out = [];
      for (let k = 0; k < n; k++) {
        const a = C.scegli(vasoDdt);
        if (out.some((r) => r.artId === a.id)) continue;
        const qta = a.um === 'SC' ? C.intero(2, 12) : a.um === 'MT' ? C.intero(10, 100) : C.intero(1, 6);
        const prezzo = listino === 'C' ? a.prezzoC : listino === 'B' ? a.prezzoB : a.prezzoA;
        out.push({ artId: a.id, codice: a.codice, descr: a.descr, um: a.um, qta, prezzo, sconto: 0, iva: a.iva, listino: listino || 'A' });
      }
      return out;
    };
    const totali = (righe) => {
      let imp = 0, iva = 0;
      const perAliq = {};
      righe.forEach((r) => { perAliq[r.iva] = (perAliq[r.iva] || 0) + r.qta * r.prezzo * (1 - (r.sconto || 0) / 100); });
      Object.keys(perAliq).forEach((k) => { const lordo = r2(perAliq[k]); const netto = r2(lordo / (1 + Number(k) / 100)); imp += netto; iva += r2(lordo - netto); });
      return { imponibile: r2(imp), iva: r2(iva), totale: r2(imp + iva) };
    };
    const meseOggi = oggi.slice(0, 7);
    const giornoOggi = daIso(oggi).getDate();
    const mesi = [];
    for (let k = 3; k >= 0; k--) { const d = daIso(oggi); d.setDate(1); d.setMonth(d.getMonth() - k); mesi.push(iso(d).slice(0, 7)); }
    const metodoPer = (nome) => S.metodi.find((m) => m.nome === nome) || S.metodi[0];
    const mesePrecedente = mesi[mesi.length - 2];
    // numerazioni dell'anno: si parte come se il negozio lavorasse da gennaio
    const annoPrimo = Number(mesi[0].slice(0, 4));
    const mesiPrima = Number(mesi[0].slice(5, 7)) - 1;
    const base = (y, perMese) => (y === annoPrimo ? mesiPrima * perMese : 0);
    let nDdt = base(annoPrimo, 34), annoNum = annoPrimo;
    for (const mese of mesi) {
      if (Number(mese.slice(0, 4)) !== annoNum) { annoNum = Number(mese.slice(0, 4)); nDdt = 0; }
      const corrente = mese === meseOggi;
      const ultimo = corrente ? giornoOggi : daIso(fineMese(mese + '-01')).getDate();
      const ddtMese = [];
      clientiDdt.forEach((cli) => {
        const quanti = corrente ? (C.prob(0.75) ? C.intero(1, 3) : 0) : C.intero(1, 5);
        for (let k = 0; k < quanti; k++) {
          const g = C.intero(1, ultimo);
          const righe = righeDoc(C.intero(2, 6), cli.listino);
          if (!righe.length) continue;
          ddtMese.push({ id: nuovoId(), numero: 0, data: mese + '-' + pad(g), clienteId: cli.id, causale: 'VENDITA', righe, totale: totali(righe).totale, fatturaId: null, annullato: false, note: '' });
        }
      });
      if (corrente && ddtMese.length < 6) {
        clientiDdt.slice(0, 4).forEach((cli) => {
          const righe = righeDoc(C.intero(2, 5), cli.listino);
          ddtMese.push({ id: nuovoId(), numero: 0, data: mese + '-' + pad(C.intero(1, ultimo)), clienteId: cli.id, causale: 'VENDITA', righe, totale: totali(righe).totale, fatturaId: null, annullato: false, note: '' });
        });
      }
      ddtMese.sort((a, b) => a.data.localeCompare(b.data));
      ddtMese.forEach((d) => { d.numero = ++nDdt; d.anno = annoNum; S.ddt.push(d); });

      // fatture accompagnatorie (FAC) durante il mese
      const nAcc = corrente ? Math.min(3, C.intero(1, 3)) : C.intero(3, 6);
      for (let k = 0; k < nAcc; k++) {
        const cli = C.scegli(aziende);
        const righe = righeDoc(C.intero(1, 4), cli.listino);
        if (!righe.length) continue;
        const t = totali(righe);
        S.fatture.push({
          id: nuovoId(), tipo: 'FAC', numero: 0, anno: annoNum, data: mese + '-' + pad(C.intero(1, ultimo)), clienteId: cli.id, righe,
          imponibile: t.imponibile, iva: t.iva, totale: t.totale, metodoId: metodoPer(cli.pagTesto).id, pagTesto: '',
          ddtIds: [], sdi: 'GENERATO', mail: '', progressivo: '', causaleIvaId: 1, note: C.prob(0.4) ? 'CIG Z' + C.intero(1000000, 9999999) + 'A' : '',
        });
      }
      // fatture differite di fine mese (dal riepilogo dei DDT) per i mesi chiusi
      if (!corrente) {
        const fine = fineMese(mese + '-01');
        clientiDdt.forEach((cli) => {
          const suoi = ddtMese.filter((d) => d.clienteId === cli.id);
          if (!suoi.length) return;
          const righe = [].concat(...suoi.map((d) => d.righe));
          const t = totali(righe);
          const f = {
            id: nuovoId(), tipo: 'FT', numero: 0, anno: annoNum, data: fine, clienteId: cli.id, righe,
            imponibile: t.imponibile, iva: t.iva, totale: t.totale, metodoId: null, pagTesto: cli.pagTesto,
            ddtIds: suoi.map((d) => d.id), sdi: 'GENERATO', mail: '', progressivo: '', causaleIvaId: 1, note: '',
          };
          const mp = metodoPer(cli.pagTesto); if (mp && mp.nome === cli.pagTesto) f.metodoId = mp.id;
          suoi.forEach((d) => { d.fatturaId = f.id; });
          S.fatture.push(f);
        });
      }
    }
    // una nota di credito su una fattura vecchia
    const daStornare = S.fatture.find((f) => f.tipo === 'FAC' && f.data.slice(0, 7) === mesi[1]);
    if (daStornare) {
      const r0 = Object.assign({}, daStornare.righe[0], { qta: 1 });
      const t = totali([r0]);
      S.fatture.push({ id: nuovoId(), tipo: 'NC', numero: 0, anno: daStornare.anno, data: piuGiorni(daStornare.data, 6), clienteId: daStornare.clienteId, righe: [r0], imponibile: t.imponibile, iva: t.iva, totale: t.totale, metodoId: daStornare.metodoId, pagTesto: '', ddtIds: [], sdi: 'GENERATO', mail: '', progressivo: '', causaleIvaId: 1, note: 'Reso merce non conforme', origineId: daStornare.id });
    }
    // numeri e stati SDI in ordine di data
    S.fatture.sort((a, b) => (a.data + a.tipo).localeCompare(b.data + b.tipo));
    const contaAnno = {};
    let prog = 9930;
    S.fatture.forEach((f) => {
      const k = f.tipo + f.anno;
      if (contaAnno[k] === undefined) contaAnno[k] = base(f.anno, f.tipo === 'FT' ? 12 : f.tipo === 'FAC' ? 4 : 0);
      f.numero = ++contaAnno[k];
      f.progressivo = String(++prog).padStart(5, '0');
      const mese = f.data.slice(0, 7);
      // fra privati l'ultima ricevuta dello SDI è la consegna: «accettata» c'è solo con la Pubblica Amministrazione
      if (mese < mesePrecedente) { const acc = C.prob(0.85); f.sdi = acc && cliPer[f.clienteId].tipoSogg === 'PA' ? 'ACCETTATO' : 'CONSEGNATO'; f.mail = C.prob(0.7) ? 'INVIATA' : ''; }
      else if (mese === mesePrecedente) { f.sdi = giornoOggi > 10 ? 'CONSEGNATO' : 'INVIATO'; f.mail = giornoOggi > 10 && C.prob(0.6) ? 'INVIATA' : ''; }
      else f.sdi = C.prob(0.5) ? 'GENERATO' : 'CONSEGNATO';
      if (f.sdi !== 'GENERATO') f.inviatoIl = piuGiorni(f.data, C.intero(0, 2));
    });
    // uno scarto dello SDI da sistemare, per mostrare come si gestisce
    const vecchie = S.fatture.filter((f) => f.tipo !== 'NC' && f.data.slice(0, 7) < mesePrecedente);
    if (vecchie.length) {
      const sc = vecchie[vecchie.length - 1];
      sc.sdi = 'SCARTATO'; sc.scartoIl = piuGiorni(sc.data, 1); sc.inviatoIl = sc.data;
      // il codice destinatario del cliente è stato scritto con un carattere in meno: lo SDI non sa a chi recapitarla
      // (testo come lo salva il programma: «codice: descrizione», più errori separati da «|»)
      const cl = cliPer[sc.clienteId];
      cl.sdi = (cl.sdi && cl.sdi !== '0000000' ? cl.sdi : 'M5UXCR1').slice(0, 6);
      sc.scarto = '00311: 1.1.4 <CodiceDestinatario> non valido';
    }
    S.numeri.ddt = nDdt;
    S.numeri.ft = contaAnno['FT' + annoOggi] || 0; S.numeri.fac = contaAnno['FAC' + annoOggi] || 0; S.numeri.nc = contaAnno['NC' + annoOggi] || 0;
    S.numeri.progressivo = prog; S.numeri.preventivo = C.intero(40, 90);

    // provvigioni dell'agente: sulle fatture di alcuni clienti, riga per riga (la % la scrive il negozio)
    const conAgente = new Set(C.mescola(aziende).slice(0, 8).map((c) => c.id));
    S.fatture.forEach((f) => { if (conAgente.has(f.clienteId)) f.righe.forEach((r) => { r.provv = C.scegli([3, 3, 4, 5]); }); });
    S.scontrini.forEach((sc) => sc.righe.forEach((r) => { if (C.prob(0.04)) r.provv = 2; }));
    // scadenze dei clienti: giorni esatti dalla data della fattura
    const scadenzaFattura = (f) => {
      const m = S.metodi.find((x) => x.id === f.metodoId);
      const gg = m ? m.giorni : /rimessa|contant/i.test(f.pagTesto || '') ? 0 : ((f.pagTesto || '').match(/(\d{2,3})\s*gg/) || [0, 30])[1];
      return piuGiorni(f.data, Number(gg));
    };
    S.fatture.filter((f) => f.tipo !== 'NC').forEach((f) => {
      const scad = scadenzaFattura(f);
      const m = S.metodi.find((x) => x.id === f.metodoId);
      const s = { id: nuovoId(), tipo: 'ATTIVA', soggettoId: f.clienteId, fatturaId: f.id, documento: String(f.numero), dataDoc: f.data, scadenza: scad, importo: f.totale, stato: 'APERTA', metodo: m ? m.nome : (f.pagTesto || ''), conto: '', note: '', incassi: [] };
      if (scad < piuGiorni(oggi, -5) && C.prob(0.78)) s.incassi.push({ id: nuovoId(), data: piuGiorni(scad, C.intero(-3, 6)), importo: s.importo, conto: m && m.fe === 'MP01' ? 'CASSA' : 'BANCA', tipo: 'INCASSO', note: '', operatore: C.scegli(nomiOp) });
      else if (scad < oggi && C.prob(0.25)) s.incassi.push({ id: nuovoId(), data: piuGiorni(scad, C.intero(0, 8)), importo: r2(s.importo * C.tra(0.3, 0.6)), conto: 'BANCA', tipo: 'ACCONTO', note: '', operatore: C.scegli(nomiOp) });
      S.scadenze.push(s);
    });
    // vecchie partite rimaste aperte dagli anni scorsi (dal vecchio programma)
    for (let k = 0; k < 9; k++) {
      const cli = C.scegli(S.clienti);
      const data = piuGiorni(oggi, -C.intero(200, 900));
      S.scadenze.push({ id: nuovoId(), tipo: 'ATTIVA', soggettoId: cli.id, fatturaId: null, documento: String(C.intero(80, 480)), dataDoc: data, scadenza: data, importo: r2(C.tra(40, 900)), stato: 'APERTA', metodo: 'Contanti', conto: '', note: '', incassi: [] });
    }
    // fatture dei fornitori (registro acquisti) e debiti
    S.acquisti = [];
    let prot = 0;
    const destinazioni = ['MERCE', 'MERCE', 'MERCE', 'MERCE', 'SPESE'];
    S.fornitori.filter((f) => !f.nome.startsWith('DA COMPLETARE')).forEach((fo) => {
      const quante = C.intero(2, 4);
      for (let k = 0; k < quante; k++) {
        const data = piuGiorni(oggi, -C.intero(3, 110));
        const arts = S.articoli.filter((a) => a.forn === fo.id);
        const righe = C.mescola(arts).slice(0, C.intero(2, 6)).map((a) => ({ artId: a.id, codice: a.codice, descr: a.descr, qta: C.intero(2, 24), costo: a.costo, iva: a.iva }));
        let imp = 0, iva = 0; righe.forEach((r) => { const t = r2(r.qta * r.costo); imp += t; iva += r2(t * r.iva / 100); });
        const m = metodoPer(fo.cond);
        const doc = {
          id: nuovoId(), prot: 0, tipo: 'FATTURA_ACQUISTO', numero: C.intero(100, 9999) + '/' + data.slice(2, 4), data, fornitoreId: fo.id,
          imponibile: r2(imp), iva: r2(iva), totale: r2(imp + iva), destinazione: C.scegli(destinazioni), regime: 'ORDINARIA',
          pagamento: fo.cond || (m ? m.nome : ''), daControllare: C.prob(0.12), ordine: false, righe, allegati: C.prob(0.5) ? 1 : 0, ricevutaIl: piuGiorni(data, C.intero(0, 3)),
        };
        S.acquisti.push(doc);
        const scad = piuGiorni(data, m ? m.giorni : 30);
        const s = { id: nuovoId(), tipo: 'PASSIVA', soggettoId: fo.id, acquistoId: doc.id, documento: doc.numero, dataDoc: data, scadenza: scad, importo: doc.totale, stato: 'APERTA', metodo: fo.cond || '', conto: fo.cond === 'RID' ? 'RID su Banca del Centro' : '', note: '', incassi: [] };
        if (scad < oggi && C.prob(0.8)) s.incassi.push({ id: nuovoId(), data: scad, importo: doc.totale, conto: 'BANCA', tipo: 'PAGAMENTO', note: '', operatore: 'ANNA ROSSI' });
        S.scadenze.push(s);
      }
    });
    S.acquisti.sort((a, b) => a.ricevutaIl.localeCompare(b.ricevutaIl)).forEach((d) => { d.prot = ++prot; });
    // un paio di ordini (non sono fatture: nel registro si vedono solo con «anche gli ordini»)
    S.fornitori.slice(0, 2).forEach((fo) => S.acquisti.push({ id: nuovoId(), prot: 0, tipo: 'ORDINE', numero: 'ORD ' + C.intero(10, 99), data: piuGiorni(oggi, -C.intero(1, 9)), fornitoreId: fo.id, imponibile: 0, iva: 0, totale: r2(C.tra(200, 900)), destinazione: 'MERCE', regime: 'ORDINARIA', pagamento: fo.cond, daControllare: false, ordine: true, righe: [], allegati: 0, ricevutaIl: oggi }));
    S.numeri.protocollo = prot;
    S.scadenze.forEach((s) => {
      const pagato = r2(s.incassi.reduce((x, i) => x + i.importo, 0));
      s.pagato = pagato;
      s.stato = pagato >= s.importo - 0.005 ? 'PAGATA' : pagato > 0 ? 'PARZIALE' : 'APERTA';
    });
    S.acconti = [];

    // ---------- prima nota ----------
    S.primaNota = [];
    const mov = (data, tipo, conto, importo, causale, descr, soggetto, rif, note) => S.primaNota.push({ id: nuovoId(), data, tipo, conto, importo: r2(importo), causale, descr, soggetto: soggetto || '', rif: rif || '', note: note || '', cassa: 0, fuori: 0 });
    S.scadenze.forEach((s) => s.incassi.forEach((i) => {
      if (i.data < piuGiorni(oggi, -60) || i.data > oggi) return;
      const sogg = s.tipo === 'ATTIVA' ? (cliPer[s.soggettoId] || {}).nome : (S.fornitori.find((f) => f.id === s.soggettoId) || {}).nome;
      mov(i.data, s.tipo === 'ATTIVA' ? 'ENTRATA' : 'USCITA', i.conto, i.importo, (s.tipo === 'ATTIVA' ? 'INCASSO' : 'PAGAMENTO') + (s.documento ? ' FT ' + s.documento : ''), sogg, sogg, 'scad:' + s.id);
    }));
    for (let g = 8; g >= 2; g -= 3) {
      const d = piuGiorni(oggi, -g);
      mov(d, 'GIROCONTO', 'CASSA', C.tra(700, 1100), 'VERSAMENTO', 'Versamento contanti in banca', '', '', '');
      S.primaNota[S.primaNota.length - 1].contoDest = 'BANCA';
      mov(piuGiorni(d, 1), 'GIROCONTO', 'POS', C.tra(600, 950), 'ACCREDITO POS', 'Accredito incassi con carta', '', '', '');
      S.primaNota[S.primaNota.length - 1].contoDest = 'BANCA';
    }
    [['Spese postali e raccomandate', 12, 30], ['Carburante furgone', 40, 90], ['Cancelleria', 8, 25], ['Caffè e acqua per il negozio', 6, 18]].forEach((sp) => {
      for (let k = 0; k < 2; k++) mov(piuGiorni(oggi, -C.intero(1, 9)), 'USCITA', 'CASSA', C.tra(sp[1], sp[2]), 'SPESE VARIE', sp[0]);
    });
    [['Canone POS', 18, 30], ['Bolletta energia elettrica', 210, 380], ['Telefono e internet', 45, 70]].forEach((sp) => mov(piuGiorni(oggi, -C.intero(3, 50)), 'USCITA', 'BANCA', C.tra(sp[1], sp[2]), 'SPESE VARIE', sp[0]));
    S.primaNota.sort((a, b) => b.data.localeCompare(a.data));
    S.quadrature = [];
    // saldi di partenza scelti perché oggi i conti tornino su valori credibili per un negozio
    const flusso = (codice) => {
      let s = 0;
      S.primaNota.forEach((m) => {
        if (m.conto === codice) s += m.tipo === 'ENTRATA' ? m.importo : -m.importo;
        if (m.tipo === 'GIROCONTO' && m.contoDest === codice) s += m.importo;
      });
      if (codice === 'CASSA') S.scontrini.forEach((x) => { if (x.metodoId === 1) s += x.totale; });
      if (codice === 'POS') S.scontrini.forEach((x) => { if (x.metodoId === 2) s += x.totale; });
      return s;
    };
    const obiettivo = { CASSA: 1850, BANCA: 38400, POS: 640, ASSEGNI: 1250, BANCA2: 12650 };
    S.conti.forEach((c) => { c.iniziale = r2(obiettivo[c.codice] - flusso(c.codice)); });

    // ---------- registro agrofarmaci ----------
    S.registro = [];
    const fito = artDiCat('FITO');
    const agro = S.fornitori.find((f) => f.cat.includes('FITO'));
    fito.forEach((a) => {
      for (let k = 0; k < C.intero(1, 3); k++) {
        const data = piuGiorni(oggi, -C.intero(10, 170));
        S.registro.push({ id: nuovoId(), tipo: 'CARICO', data, artId: a.id, qta: C.intero(6, 30), fornitoreId: agro.id, nReg: a.nReg, produttore: a.produttore, doc: 'DDT forn. ' + C.intero(1200, 4800), dataDoc: piuGiorni(data, -C.intero(0, 2)), lotto: a.lotto });
      }
    });
    const validi = (data) => S.patentini.filter((p) => p.validoA >= data && p.validoDa <= data);
    const ddtFito = S.ddt.filter((d) => d.righe.some((r) => (S.articoli.find((a) => a.id === r.artId) || {}).fito));
    for (let k = 0; k < 70; k++) {
      const data = piuGiorni(oggi, -C.intero(0, 95));
      const v = validi(data);
      if (!v.length) continue;
      const p = C.scegli(v);
      const a = C.scegli(fito);
      const dd = C.scegli(ddtFito.length ? ddtFito : S.ddt);
      S.registro.push({ id: nuovoId(), tipo: 'SCARICO', data, artId: a.id, qta: C.intero(1, 5), patentinoId: p.id, clienteId: p.clienteId, doc: String(dd.numero), ddtId: dd.id, dataDoc: data, lotto: a.lotto, nma: '' });
    }
    S.registro.sort((a, b) => b.data.localeCompare(a.data));
    let nma = 4800 + C.intero(0, 120);
    S.registro.filter((r) => r.tipo === 'SCARICO').slice().reverse().forEach((r) => { r.nma = String(++nma); });
    S.numeri.nma = nma;

    // ---------- cronologia (registro delle operazioni) ----------
    S.cronologia = [];
    const voce = (quando, tipo, descr, rif) => S.cronologia.push({ id: nuovoId(), quando, tipo, descr, rif: rif || '' });
    S.scontrini.slice(-25).forEach((s) => voce(s.data, 'Vendita', 'Emesso scontrino n. ' + s.numero + ' · € ' + s.totale.toFixed(2).replace('.', ',') + ' · PC ' + s.postazione, 'sc:' + s.id));
    const euro = (n) => n.toFixed(2).replace('.', ',');
    S.fatture.slice(-10).forEach((f) => voce(f.data + 'T18:' + pad(C.intero(10, 50)) + ':00', f.tipo === 'NC' ? 'NotaCredito' : 'Fattura',
      f.tipo === 'NC' ? 'Emessa nota di credito n. ' + f.numero + ' su fattura n. ' + ((S.fatture.find((x) => x.id === f.origineId) || {}).numero || '') + ' (' + f.note + ') · € ' + euro(f.totale)
        : f.tipo === 'FAC' ? 'Emessa fattura accompagnatoria n. FAC ' + f.numero + ' a ' + cliPer[f.clienteId].nome + ' · € ' + euro(f.totale)
          : 'Emessa fattura differita n. ' + f.numero + ' (' + f.ddtIds.length + ' DDT) a ' + cliPer[f.clienteId].nome + ' · € ' + euro(f.totale), 'doc:' + f.id));
    S.ddt.slice(-8).forEach((d) => voce(d.data + 'T' + pad(C.intero(8, 12)) + ':' + pad(C.intero(0, 59)) + ':00', 'DDT', 'Emesso DDT n. ' + d.numero + ' · € ' + euro(d.totale), 'doc:' + d.id));
    C.mescola(S.articoli).slice(0, 6).forEach((a) => voce(piuGiorni(oggi, -C.intero(0, 6)) + 'T' + pad(C.intero(8, 18)) + ':' + pad(C.intero(0, 59)) + ':00', 'Prezzo', 'Modificato prezzo articolo id ' + a.id + ' → € ' + euro(a.prezzoA), 'art:' + a.id));
    for (let g = 6; g >= 0; g--) {
      const d = piuGiorni(oggi, -g);
      if (daIso(d).getDay() === 0) continue;
      voce(d + 'T08:2' + C.intero(0, 9) + ':00', 'Accesso', 'Accesso di ' + C.scegli(nomiOp) + ' su CASSA-PC');
    }
    S.cronologia.sort((a, b) => b.quando.localeCompare(a.quando));

    // ---------- cestino, posta PEC, inventario ----------
    S.cestino = [];
    S.pecPosta = [];
    S.inventario = {};
    S.periodi = [];
    return S;
  }

  // ---------- storico vendite per l'Analisi (non si salva: si ricalcola sempre uguale) ----------
  function storico(S, oggi) {
    const C = creaCaso(77031);
    const d0 = daIso(oggi);
    const annoOggi = d0.getFullYear();
    const anni = [annoOggi - 2, annoOggi - 1, annoOggi];
    const baseAnno = { [annoOggi - 2]: 478000, [annoOggi - 1]: 521000, [annoOggi]: 562000 };
    const mesi = [];
    const perCat = {};   // 'aaaa-mm' -> codice -> { banco, ddt } (imponibile, IVA esclusa)
    anni.forEach((anno) => {
      for (let m = 0; m < 12; m++) {
        const chiave = anno + '-' + pad(m + 1);
        if (anno === annoOggi && m > d0.getMonth()) break;
        let frazione = 1;
        if (anno === annoOggi && m === d0.getMonth()) frazione = d0.getDate() / new Date(anno, m + 1, 0).getDate();
        mesi.push(chiave);
        perCat[chiave] = {};
        S.categorie.forEach((cat) => {
          const st = STAGIONI[GRUPPO[cat.codice] || 'piatta'];
          const sommaSt = st.reduce((s, x) => s + x, 0);
          const val = baseAnno[anno] * (QUOTA[cat.codice] / 100) * (st[m] / sommaSt) * C.tra(0.9, 1.1) * frazione;
          const ddt = QUOTA_DDT[cat.codice] || C.tra(0.18, 0.3);
          perCat[chiave][cat.codice] = { banco: r2(val * (1 - ddt)), ddt: r2(val * ddt) };
        });
      }
    });
    // peso di ogni articolo dentro la sua categoria (pochi articoli fanno gran parte del venduto)
    const pesi = {};
    S.categorie.forEach((cat) => {
      const arts = S.articoli.filter((a) => a.cat === cat.id);
      const ordine = C.mescola(arts);
      let tot = 0;
      ordine.forEach((a, i) => { const p = 1 / Math.pow(i + 1, 0.85); pesi[a.id] = p; tot += p; });
      ordine.forEach((a) => { pesi[a.id] /= tot; });
    });
    return { anni, mesi, perCat, pesi };
  }

  window.GF_DATI = { genera, storico, iso, daIso, piuGiorni, fineMese, r2, pad, controlloPiva, codiceFiscale };
})();
