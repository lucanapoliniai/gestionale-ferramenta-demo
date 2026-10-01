/* Dati dimostrativi della demo per iPad.
   Una ferramenta agraria INVENTATA: nessun cliente, prezzo o documento veri.
   Tutto nasce da un generatore ripetibile (stesso seme = stessi nomi) e le date sono
   calcolate a partire da oggi, cosi' la demo e' sempre "fresca" quando la si mostra. */
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

  function partitaIva(C) {
    let s = '';
    for (let i = 0; i < 7; i++) s += C.intero(0, 9);
    s += '054';
    let somma = 0;
    for (let i = 0; i < 10; i++) {
      let c = Number(s[i]);
      if (i % 2 === 1) { c *= 2; if (c > 9) c -= 9; }
      somma += c;
    }
    return s + ((10 - (somma % 10)) % 10);
  }

  // ---------- il negozio inventato ----------
  const NEGOZIO = {
    nome: 'Ferramenta Rossi',
    sotto: 'Agraria · dati dimostrativi',
    ragione: 'FERRAMENTA AGRARIA ROSSI S.N.C.',
    indirizzo: 'Via dei Mestieri 8',
    cap: '06100', citta: 'Perugia', prov: 'PG',
    piva: '01234567890',
    tel: '075 000 0000',
    email: 'info@ferramentarossi.example',
    iban: 'IT00 X000 0000 0000 0000 0000 000',
  };

  // codice, nome, IVA, ricarico A (min-max), colore delle barre (stessa tavolozza varia dell'Analisi vera)
  const CATEGORIE = [
    ['FERR', 'Ferramenta e minuteria', 22, 55, 95, '#2E7D32'],
    ['UTEN', 'Utensili', 22, 35, 60, '#5C6B7A'],
    ['IDRA', 'Idraulica', 22, 45, 80, '#0E9AA7'],
    ['ELET', 'Materiale elettrico', 22, 45, 75, '#3B82F6'],
    ['VERN', 'Vernici e colori', 22, 40, 65, '#6366F1'],
    ['GIAR', 'Giardinaggio', 22, 40, 70, '#8B5CF6'],
    ['IRRI', 'Irrigazione', 22, 35, 60, '#D9468A'],
    ['CONC', 'Concimi', 4, 18, 30, '#E8590C'],
    ['FITO', 'Fitosanitari', 22, 18, 32, '#F59F00'],
    ['SEME', 'Sementi', 4, 40, 70, '#0B7285'],
    ['MANG', 'Mangimi', 10, 15, 25, '#C0392B'],
    ['ENOL', 'Enologia', 22, 30, 55, '#7C3AED'],
    ['CASA', 'Casalinghi', 22, 45, 80, '#64748B'],
    ['ANTI', 'Antinfortunistica', 22, 40, 70, '#15803D'],
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

  const FORNITORI = [
    ['Viteria Centro Italia Srl', 'Arezzo', ['FERR']],
    ['Utensileria Adriatica Srl', 'Ancona', ['UTEN']],
    ['Idrotermica Tiberina Srl', 'Terni', ['IDRA']],
    ['Elettroforniture Valle Umbra Srl', 'Foligno', ['ELET']],
    ['Colorificio Appennino Snc', 'Gubbio', ['VERN']],
    ['Verde Attrezzature Srl', 'Pistoia', ['GIAR']],
    ['Irrigazione Moderna Srl', 'Latina', ['IRRI']],
    ['Agrochimica Centro Srl', 'Perugia', ['FITO', 'CONC']],
    ['Sementi Italia Centrale Spa', 'Bologna', ['SEME']],
    ['Mangimificio Colle Alto Srl', 'Todi', ['MANG']],
    ['Enoforniture Umbre Srl', 'Orvieto', ['ENOL']],
    ['Casalinghi Distribuzione Srl', 'Roma', ['CASA']],
    ['Sicurezza Lavoro Srl', 'Firenze', ['ANTI']],
  ];

  const AZIENDE = [
    'Az. Agr. Colle dei Gelsi', 'Az. Agr. Le Due Querce', 'Soc. Agr. Valle Verde S.S.', 'Cantina Poggio Alto Srl',
    'Frantoio Le Olivette Srl', 'Agriturismo Il Mulino Vecchio', 'Edil Costruzioni Martini Srl', 'Idraulica Fabbri & Figli Snc',
    'Impianti Elettrici Moretti Snc', 'Giardini Conti di Conti Luca', 'Vivaio Fiori del Colle', 'Falegnameria Ricci Snc',
    'Carpenteria Galli Srl', 'Az. Agr. San Martino', 'Coop. Agricola La Spiga', 'Allevamento La Fattoria Srl',
    'Manutenzioni Verdi S.S.', 'Az. Agr. I Tre Ulivi',
  ];
  const COGNOMI = ['Bianchi', 'Ferri', 'Conti', 'Marini', 'Galli', 'Costa', 'Fabbri', 'Moretti', 'Barbieri', 'Lombardi',
    'Rinaldi', 'Mancini', 'Longo', 'Leone', 'Martinelli', 'Vitale', 'Serra', 'De Santis', 'Fiore', 'Pellegrini',
    'Bruno', 'Gentile', 'Ricci', 'Ferrara', 'Silvestri', 'Testa', 'Benedetti', 'Orlando', 'Santoro', 'Mariani',
    'Rizzi', 'Monti', 'Bellini', 'Neri', 'Sartori', 'Valentini', 'Grassi', 'Cecchini', 'Piccioni', 'Tosi'];
  const NOMI = ['Mario', 'Giuseppe', 'Luigi', 'Franco', 'Paolo', 'Andrea', 'Marco', 'Stefano', 'Roberto', 'Giovanni',
    'Anna', 'Maria', 'Laura', 'Paola', 'Giulia', 'Francesca', 'Elena', 'Rita', 'Sandro', 'Fabio',
    'Matteo', 'Simone', 'Claudio', 'Sergio', 'Daniela', 'Silvia', 'Antonio', 'Alessandro', 'Carla', 'Enrico'];
  const PAESI = [['Perugia', 'PG', '06121'], ['Foligno', 'PG', '06034'], ['Assisi', 'PG', '06081'], ['Spello', 'PG', '06038'],
    ['Bevagna', 'PG', '06031'], ['Todi', 'PG', '06059'], ['Marsciano', 'PG', '06055'], ['Deruta', 'PG', '06053'],
    ['Torgiano', 'PG', '06089'], ['Bastia Umbra', 'PG', '06083']];
  const VIE = ['Via Roma', 'Via Garibaldi', 'Via dei Mille', 'Via della Stazione', 'Via San Francesco', 'Via dei Campi',
    'Via Molino', 'Strada delle Vigne', 'Via del Lavoro', 'Via Mazzini', 'Via Cavour', 'Via delle Fonti'];

  // pagamenti come nel programma vero (giorni esatti dalla data della fattura)
  const METODI = [
    { id: 1, nome: 'Contanti', fe: 'MP01', giorni: 0 },
    { id: 2, nome: 'Carta di pagamento', fe: 'MP08', giorni: 0 },
    { id: 3, nome: 'Assegno', fe: 'MP02', giorni: 0 },
    { id: 4, nome: 'Bonifico', fe: 'MP05', giorni: 0 },
    { id: 5, nome: 'Bonifico 30gg fine mese', fe: 'MP05', giorni: 30 },
    { id: 6, nome: 'Bonifico 60gg fine mese', fe: 'MP05', giorni: 60 },
    { id: 7, nome: 'Bonifico 90gg fine mese', fe: 'MP05', giorni: 90 },
    { id: 8, nome: 'Bonifico 120gg fine mese', fe: 'MP05', giorni: 120 },
    { id: 9, nome: 'Riba 30gg fine mese', fe: 'MP12', giorni: 30 },
    { id: 10, nome: 'Riba 60gg fine mese', fe: 'MP12', giorni: 60 },
    { id: 11, nome: 'Riba 90gg fine mese', fe: 'MP12', giorni: 90 },
    { id: 12, nome: 'Riba 120gg fine mese', fe: 'MP12', giorni: 120 },
  ];

  // stagionalita' (gen..dic) per gruppo di categorie
  const STAGIONI = {
    agri: [0.55, 0.75, 1.25, 1.5, 1.5, 1.35, 1.1, 0.85, 1.05, 0.95, 0.7, 0.5],
    enol: [0.6, 0.5, 0.6, 0.6, 0.6, 0.7, 0.9, 1.4, 2.4, 1.9, 0.9, 0.6],
    vern: [0.7, 0.8, 1.1, 1.3, 1.35, 1.3, 1.1, 0.8, 1.0, 0.95, 0.8, 0.7],
    piatta: [0.85, 0.9, 1.0, 1.05, 1.1, 1.05, 1.0, 0.8, 1.0, 1.05, 1.0, 1.1],
  };
  const GRUPPO = { CONC: 'agri', FITO: 'agri', SEME: 'agri', IRRI: 'agri', GIAR: 'agri', ENOL: 'enol', VERN: 'vern' };
  const QUOTA = { FERR: 12, UTEN: 7, IDRA: 9, ELET: 5, VERN: 6, GIAR: 8, IRRI: 6, CONC: 12, FITO: 13, SEME: 4, MANG: 7, ENOL: 4, CASA: 3, ANTI: 4 };
  const QUOTA_DDT = { FITO: 0.55, CONC: 0.5, IRRI: 0.45, SEME: 0.4, MANG: 0.35, GIAR: 0.3 };

  // ---------- generatore ----------
  function genera(oggi, adesso) {
    const C = creaCaso(20261001);
    const anno = daIso(oggi).getFullYear();
    const S = {
      versione: 3, generatoIl: oggi, negozio: Object.assign({}, NEGOZIO),
      metodi: METODI.map((m) => Object.assign({}, m)),
      conti: [
        { codice: 'CASSA', nome: 'Contanti', iniziale: 0 },
        { codice: 'BANCA', nome: 'Banca c/c', iniziale: 0 },
        { codice: 'POS', nome: 'POS / carte', iniziale: 0 },
        { codice: 'ASSEGNI', nome: 'Assegni', iniziale: 0 },
      ],
      prossimo: {},
      commercialista: { email: 'studio.contabile@example.it', attivo: true, invii: [] },
    };
    let ultimoId = 1000;
    const nuovoId = () => ++ultimoId;

    // categorie
    S.categorie = CATEGORIE.map((c, i) => ({ id: i + 1, codice: c[0], nome: c[1], iva: c[2], ricMin: c[3], ricMax: c[4], colore: c[5] }));
    const catPer = {}; S.categorie.forEach((c) => { catPer[c.codice] = c; });

    // fornitori
    S.fornitori = FORNITORI.map((f, i) => ({
      id: i + 1, codice: 'F' + pad(i + 1) + '0', nome: f[0], citta: f[1], cat: f[2],
      piva: partitaIva(C), tel: '0' + C.intero(71, 75) + ' ' + C.intero(100000, 999999),
      email: 'ordini@' + f[0].toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) + '.example',
      pagamento: C.scegli(['Bonifico 60gg fine mese', 'Riba 60gg fine mese', 'Riba 90gg fine mese', 'Bonifico 30gg fine mese']),
    }));
    const fornPer = {}; S.fornitori.forEach((f) => f.cat.forEach((c) => { if (!fornPer[c]) fornPer[c] = f.id; }));

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
          let ric = Math.round(C.tra(cat.ricMin, cat.ricMax));
          const iva = (cat.codice === 'GIAR' && m[0].startsWith('TERRICCIO')) ? 10 : cat.iva;
          const prezzo = (r) => prezzoBello(costo * (1 + r / 100) * (1 + iva / 100), C);
          const a = {
            id: nuovoId(), codice: cat.codice + String(progr[cat.codice]).padStart(4, '0'),
            barcode: C.prob(0.55) ? ean13(C) : '',
            descr: m[0].replace('{v}', v || ''), cat: cat.id, um: m[1], iva, costo,
            prezzoA: prezzo(ric), prezzoB: prezzo(Math.max(10, ric - C.intero(8, 12))), prezzoC: prezzo(Math.max(8, ric - C.intero(18, 24))),
            giac: C.intero(0, m[4]), scortaMin: 0, forn: fornPer[cat.codice],
            ultimoAcq: piuGiorni(oggi, -C.intero(3, 220)), lotto: '', scadenza: '', fito: cat.codice === 'FITO', nReg: '',
          };
          a.scortaMin = C.prob(0.6) ? Math.max(1, Math.round(m[4] * C.tra(0.1, 0.25))) : 0;
          if (a.scortaMin) a.giac = C.intero(a.scortaMin, Math.max(a.scortaMin, m[4]));
          if (cat.codice === 'FITO') {
            a.nReg = C.intero(10000, 17999) + ' del ' + piuGiorni(oggi, -C.intero(900, 6000)).split('-').reverse().join('/');
            a.lotto = 'L' + C.intero(2400, 2699) + '-' + C.intero(10, 99);
            a.scadenza = piuGiorni(oggi, C.intero(200, 1100));
          }
          if (cat.codice === 'ENOL' && C.prob(0.6)) {
            a.lotto = 'E' + C.intero(100, 999);
            a.scadenza = piuGiorni(oggi, C.intero(60, 700));
          }
          S.articoli.push(a);
        });
      }
    }
    // qualche situazione da tenere d'occhio: sotto scorta e venduti sottocosto
    C.mescola(S.articoli).slice(0, 18).forEach((a) => { if (!a.scortaMin) a.scortaMin = C.intero(3, 8); a.giac = C.intero(0, a.scortaMin - 1); });
    C.mescola(S.articoli.filter((a) => a.prezzoA > 3)).slice(0, 6).forEach((a) => { a.costo = r2(a.prezzoA / (1 + a.iva / 100) * C.tra(1.04, 1.18)); });
    const artPer = {}; S.articoli.forEach((a) => { artPer[a.id] = a; });
    const artDiCat = (cod) => S.articoli.filter((a) => a.cat === catPer[cod].id);

    // clienti
    S.clienti = [];
    let nCli = 1;
    const indirizzo = () => C.scegli(VIE) + ' ' + C.intero(1, 140);
    AZIENDE.forEach((nome) => {
      const p = C.scegli(PAESI);
      const slug = nome.toLowerCase().replace(/^(az\. agr\.|soc\. agr\.|coop\. agricola) /, '').replace(/[^a-z]/g, '').slice(0, 16);
      S.clienti.push({
        id: nuovoId(), codice: 'C' + String(nCli++).padStart(4, '0'), tipo: 'PG', nome, indirizzo: indirizzo(),
        citta: p[0], prov: p[1], cap: p[2], piva: partitaIva(C), cf: '', tel: '07' + C.intero(42, 59) + ' ' + C.intero(100000, 999999),
        email: 'amministrazione@' + slug + '.example', pec: slug + '@pec.example', sdi: C.prob(0.6) ? 'M5UXCR1' : '0000000',
        listino: C.scegli(['A', 'B', 'B', 'C']),
        pagamento: C.scegli(['Riba 60gg fine mese', 'Riba 90gg fine mese', 'Bonifico 30gg fine mese', 'Riba 30gg fine mese', 'Bonifico 60gg fine mese']),
      });
    });
    const usati = new Set();
    while (S.clienti.length < 70) {
      const nome = C.scegli(COGNOMI) + ' ' + C.scegli(NOMI);
      if (usati.has(nome)) continue;
      usati.add(nome);
      const p = C.scegli(PAESI);
      const conPiva = C.prob(0.25);   // artigiani e agricoltori con partita IVA
      S.clienti.push({
        id: nuovoId(), codice: 'C' + String(nCli++).padStart(4, '0'), tipo: conPiva ? 'DI' : 'PF', nome: nome.toUpperCase(),
        indirizzo: indirizzo(), citta: p[0], prov: p[1], cap: p[2],
        piva: conPiva ? partitaIva(C) : '',
        cf: nome.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6).padEnd(6, 'X') + C.intero(40, 99) + C.scegli(['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'P', 'R', 'S', 'T']) + pad(C.intero(1, 28)) + 'G478X',
        tel: '3' + C.intero(20, 49) + ' ' + C.intero(1000000, 9999999), email: C.prob(0.6) ? nome.toLowerCase().replace(' ', '.') + '@email.example' : '',
        pec: '', sdi: '0000000', listino: C.prob(0.85) ? 'A' : 'B',
        pagamento: C.scegli(['Contanti', 'Contanti', 'Assegno', 'Bonifico']),
      });
    }
    const cliPer = {}; S.clienti.forEach((c) => { cliPer[c.id] = c; });
    const aziende = S.clienti.filter((c) => c.tipo !== 'PF');

    // patentini per i fitosanitari: un quarto scaduti, qualcuno in scadenza
    S.patentini = [];
    const titolari = C.mescola(S.clienti).slice(0, 42);
    titolari.forEach((c, i) => {
      const scade = i < 11 ? piuGiorni(oggi, -C.intero(20, 900)) : i < 16 ? piuGiorni(oggi, C.intero(5, 58)) : piuGiorni(oggi, C.intero(90, 1700));
      S.patentini.push({
        id: nuovoId(), numero: String(C.intero(2100, 16999)),
        nominativo: c.tipo === 'PG' ? (C.scegli(COGNOMI) + ' ' + C.scegli(NOMI)).toUpperCase() : c.nome,
        clienteId: c.id, rilascio: piuGiorni(scade, -1826), scadenza: scade,
      });
    });

    // ---------- vendite al banco: gli ultimi giorni, scontrino per scontrino ----------
    S.scontrini = [];
    let nSc = 2300 + C.intero(0, 200);
    const pesoBanco = { FERR: 6, IDRA: 4, ELET: 4, CASA: 3, VERN: 3, GIAR: 3, UTEN: 2, ANTI: 2, SEME: 2, MANG: 2, CONC: 1, FITO: 0, IRRI: 1, ENOL: 1 };
    const vasoBanco = [];
    for (const cat of S.categorie) for (const a of artDiCat(cat.codice)) for (let k = 0; k < (pesoBanco[cat.codice] || 0); k++) vasoBanco.push(a);
    const oraAdesso = adesso.getHours() + adesso.getMinutes() / 60;
    for (let g = 9; g >= 0; g--) {
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
      orari.sort((a, b) => a - b).forEach((h) => {
        const righe = [];
        const nr = C.prob(0.55) ? 1 : C.intero(2, 4);
        for (let k = 0; k < nr; k++) {
          const a = C.scegli(vasoBanco);
          if (righe.some((r) => r.artId === a.id)) continue;
          const qta = a.um === 'MT' ? C.intero(2, 25) : a.um === 'KG' ? C.intero(1, 3) : C.prob(0.75) ? 1 : C.intero(2, 4);
          righe.push({ artId: a.id, codice: a.codice, descr: a.descr, qta, prezzo: a.prezzoA, sconto: 0, iva: a.iva });
        }
        const tot = r2(righe.reduce((s, r) => s + r.qta * r.prezzo, 0));
        const minuti = Math.round((h % 1) * 60);
        const pag = C.prob(0.6) ? 1 : 2;
        S.scontrini.push({
          id: nuovoId(), numero: ++nSc, data: giorno + 'T' + pad(Math.floor(h)) + ':' + pad(minuti) + ':00',
          clienteId: C.prob(0.12) ? C.scegli(S.clienti).id : null, metodoId: pag, righe, totale: tot, rt: nSc - 1200,
        });
      });
    }
    S.prossimo.scontrino = nSc + 1;

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
        out.push({ artId: a.id, codice: a.codice, descr: a.descr, um: a.um, qta, prezzo, sconto: 0, iva: a.iva });
      }
      return out;
    };
    const totali = (righe) => {
      let imp = 0, iva = 0;
      const perAliq = {};
      righe.forEach((r) => {
        const lordo = r.qta * r.prezzo * (1 - (r.sconto || 0) / 100);
        perAliq[r.iva] = (perAliq[r.iva] || 0) + lordo;
      });
      Object.keys(perAliq).forEach((k) => {
        const lordo = r2(perAliq[k]);
        const netto = r2(lordo / (1 + Number(k) / 100));
        imp += netto; iva += r2(lordo - netto);
      });
      return { imponibile: r2(imp), iva: r2(iva), totale: r2(imp + iva) };
    };
    S.totali = null; // calcolato dall'app

    const meseOggi = oggi.slice(0, 7);
    const giornoOggi = daIso(oggi).getDate();
    let nDdt = 0, prog = 9930;
    const mesi = [];
    for (let k = 3; k >= 0; k--) { const d = daIso(oggi); d.setDate(1); d.setMonth(d.getMonth() - k); mesi.push(iso(d).slice(0, 7)); }
    const metodoPer = (nome) => S.metodi.find((m) => m.nome === nome) || S.metodi[0];
    const mesePrecedente = mesi[mesi.length - 2];
    // numerazioni dell'anno: si parte come se il negozio lavorasse da gennaio
    // (solo per l'anno del primo mese generato; l'anno dopo riparte da 1)
    const annoPrimo = Number(mesi[0].slice(0, 4));
    const mesiPrima = Number(mesi[0].slice(5, 7)) - 1;
    const base = (y, perMese) => (y === annoPrimo ? mesiPrima * perMese : 0);
    nDdt = base(annoPrimo, 34);
    let annoNum = annoPrimo;

    for (const mese of mesi) {
      if (Number(mese.slice(0, 4)) !== annoNum) { annoNum = Number(mese.slice(0, 4)); nDdt = 0; }
      const corrente = mese === meseOggi;
      const ultimo = corrente ? giornoOggi : daIso(fineMese(mese + '-01')).getDate();
      // DDT del mese per i clienti "a fine mese"
      const ddtMese = [];
      clientiDdt.forEach((cli) => {
        const quanti = corrente ? (C.prob(0.75) ? C.intero(1, 3) : 0) : C.intero(1, 5);
        for (let k = 0; k < quanti; k++) {
          const g = C.intero(1, ultimo);
          const righe = righeDoc(C.intero(2, 6), cli.listino);
          if (!righe.length) continue;
          const t = totali(righe);
          ddtMese.push({ id: nuovoId(), numero: 0, data: mese + '-' + pad(g), clienteId: cli.id, causale: 'Vendita', righe, totale: t.totale, fatturaId: null });
        }
      });
      // almeno qualche DDT aperto nel mese in corso, per mostrare la fattura da DDT
      if (corrente && ddtMese.length < 6) {
        clientiDdt.slice(0, 4).forEach((cli) => {
          const righe = righeDoc(C.intero(2, 5), cli.listino);
          const t = totali(righe);
          ddtMese.push({ id: nuovoId(), numero: 0, data: mese + '-' + pad(C.intero(1, ultimo)), clienteId: cli.id, causale: 'Vendita', righe, totale: t.totale, fatturaId: null });
        });
      }
      ddtMese.sort((a, b) => a.data.localeCompare(b.data));
      ddtMese.forEach((d) => { d.numero = ++nDdt; d.anno = annoNum; S.ddt.push(d); });

      // fatture accompagnatorie (FAC) durante il mese
      const nAcc = corrente ? Math.min(3, C.intero(1, 3)) : C.intero(3, 6);
      for (let k = 0; k < nAcc; k++) {
        const cli = C.scegli(aziende);
        const g = C.intero(1, ultimo);
        const righe = righeDoc(C.intero(1, 4), cli.listino);
        if (!righe.length) continue;
        const t = totali(righe);
        S.fatture.push({
          id: nuovoId(), tipo: 'FAC', numero: 0, anno: annoNum, data: mese + '-' + pad(g), clienteId: cli.id, righe,
          imponibile: t.imponibile, iva: t.iva, totale: t.totale, metodoId: metodoPer(cli.pagamento).id, pagamentoTesto: '',
          ddtIds: [], sdi: 'GENERATO', mail: '', progressivo: '', causale: 'Vendita',
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
            imponibile: t.imponibile, iva: t.iva, totale: t.totale, metodoId: metodoPer(cli.pagamento).id, pagamentoTesto: '',
            ddtIds: suoi.map((d) => d.id), sdi: 'GENERATO', mail: '', progressivo: '',
            causale: 'Fattura differita — DDT ' + suoi.map((d) => d.numero + ' del ' + d.data.split('-').reverse().join('/')).join(', '),
          };
          if (f.causale.length > 200) f.causale = 'Fattura differita — ' + suoi.length + ' DDT del mese';
          suoi.forEach((d) => { d.fatturaId = f.id; });
          S.fatture.push(f);
        });
      }
    }
    // numeri e stati SDI in ordine di data
    S.fatture.sort((a, b) => (a.data + a.tipo).localeCompare(b.data + b.tipo));
    const contaAnno = {};
    S.fatture.forEach((f) => {
      const k = f.tipo + f.anno;
      if (contaAnno[k] === undefined) contaAnno[k] = base(f.anno, f.tipo === 'FT' ? 12 : 4);
      f.numero = ++contaAnno[k];
      f.progressivo = String(++prog).padStart(5, '0');
      const mese = f.data.slice(0, 7);
      if (mese < mesePrecedente) { f.sdi = C.prob(0.85) ? 'ACCETTATO' : 'CONSEGNATO'; f.mail = C.prob(0.7) ? 'INVIATA' : ''; }
      else if (mese === mesePrecedente) { f.sdi = giornoOggi > 10 ? 'CONSEGNATO' : 'GENERATO'; f.mail = giornoOggi > 10 && C.prob(0.6) ? 'INVIATA' : ''; }
      else f.sdi = 'GENERATO';
    });
    // uno scarto dello SDI da sistemare, per mostrare come si gestisce
    const vecchie = S.fatture.filter((f) => f.data.slice(0, 7) < mesePrecedente);
    if (vecchie.length) { const sc = vecchie[vecchie.length - 1]; sc.sdi = 'SCARTATO'; sc.scarto = '00305 · IdFiscaleIVA del cessionario non valido'; }
    S.prossimo.ft = contaAnno['FT' + anno] || 0;
    S.prossimo.fac = contaAnno['FAC' + anno] || 0;
    S.prossimo.ddt = nDdt;
    S.prossimo.progressivo = prog;

    // scadenze dei clienti: giorni esatti dalla data della fattura
    S.fatture.forEach((f) => {
      const m = S.metodi.find((x) => x.id === f.metodoId);
      const scad = piuGiorni(f.data, m ? m.giorni : 30);
      const s = {
        id: nuovoId(), tipo: 'ATTIVA', soggettoId: f.clienteId, fatturaId: f.id,
        documento: (f.tipo === 'FAC' ? 'FAC ' : '') + f.numero, dataDoc: f.data, scadenza: scad,
        importo: f.totale, pagato: 0, stato: 'APERTA', metodoId: f.metodoId,
      };
      if (scad < piuGiorni(oggi, -5) && C.prob(0.78)) { s.pagato = s.importo; s.stato = 'PAGATA'; s.incassoIl = piuGiorni(scad, C.intero(-3, 6)); }
      else if (scad < oggi && C.prob(0.25)) { s.pagato = r2(s.importo * C.tra(0.3, 0.6)); s.stato = 'PARZIALE'; s.incassoIl = piuGiorni(scad, C.intero(0, 8)); }
      S.scadenze.push(s);
    });
    // vecchie partite rimaste aperte dagli anni scorsi
    for (let k = 0; k < 9; k++) {
      const cli = C.scegli(S.clienti);
      const data = piuGiorni(oggi, -C.intero(200, 900));
      S.scadenze.push({
        id: nuovoId(), tipo: 'ATTIVA', soggettoId: cli.id, fatturaId: null, documento: String(C.intero(80, 480)),
        dataDoc: data, scadenza: data, importo: r2(C.tra(40, 900)), pagato: 0, stato: 'APERTA', metodoId: 1,
      });
    }
    // fatture dei fornitori (registro acquisti) e debiti
    S.acquisti = [];
    S.fornitori.forEach((fo) => {
      const quante = C.intero(1, 3);
      for (let k = 0; k < quante; k++) {
        const data = piuGiorni(oggi, -C.intero(5, 110));
        const tot = r2(C.tra(180, 3200));
        const m = metodoPer(fo.pagamento);
        const doc = { id: nuovoId(), tipo: 'FATTURA', fornitoreId: fo.id, numero: String(C.intero(100, 9999)) + '/' + data.slice(2, 4), data, totale: tot, stato: 'REGISTRATA' };
        S.acquisti.push(doc);
        const scad = piuGiorni(data, m.giorni);
        const s = { id: nuovoId(), tipo: 'PASSIVA', soggettoId: fo.id, acquistoId: doc.id, documento: doc.numero, dataDoc: data, scadenza: scad, importo: tot, pagato: 0, stato: 'APERTA', metodoId: m.id };
        if (scad < oggi && C.prob(0.8)) { s.pagato = tot; s.stato = 'PAGATA'; s.incassoIl = scad; }
        S.scadenze.push(s);
      }
    });

    // ---------- prima nota ----------
    S.primaNota = [];
    const mov = (data, tipo, conto, importo, causale, descr, dest) => S.primaNota.push({ id: nuovoId(), data, tipo, conto, contoDest: dest || '', importo: r2(importo), causale, descr });
    S.scadenze.filter((s) => s.pagato > 0 && s.incassoIl && s.incassoIl >= piuGiorni(oggi, -60) && s.incassoIl <= oggi).forEach((s) => {
      const m = S.metodi.find((x) => x.id === s.metodoId);
      const conto = s.tipo === 'PASSIVA' ? 'BANCA' : m && m.id === 1 ? 'CASSA' : m && m.id === 3 ? 'ASSEGNI' : 'BANCA';
      const sogg = s.tipo === 'ATTIVA' ? (cliPer[s.soggettoId] || {}).nome : (S.fornitori.find((f) => f.id === s.soggettoId) || {}).nome;
      mov(s.incassoIl, s.tipo === 'ATTIVA' ? 'ENTRATA' : 'USCITA', conto, s.pagato, s.tipo === 'ATTIVA' ? 'INCASSO FT ' + s.documento : 'PAGAMENTO FT ' + s.documento, sogg || '');
    });
    // versamenti e accrediti solo nei giorni coperti dagli scontrini, cosi' cassa e POS tornano
    for (let g = 8; g >= 2; g -= 3) {
      const d = piuGiorni(oggi, -g);
      mov(d, 'GIROCONTO', 'CASSA', C.tra(700, 1100), 'VERSAMENTO', 'Versamento contanti in banca', 'BANCA');
      mov(piuGiorni(d, 1), 'GIROCONTO', 'POS', C.tra(600, 950), 'ACCREDITO POS', 'Accredito incassi con carta', 'BANCA');
    }
    [['Spese postali e raccomandate', 12, 30], ['Carburante furgone', 40, 90], ['Cancelleria', 8, 25], ['Caffè e acqua per il negozio', 6, 18]].forEach((sp) => {
      for (let k = 0; k < 2; k++) mov(piuGiorni(oggi, -C.intero(1, 9)), 'USCITA', 'CASSA', C.tra(sp[1], sp[2]), 'SPESE', sp[0]);
    });
    [['Canone POS', 18, 30], ['Bolletta energia elettrica', 210, 380], ['Telefono e internet', 45, 70]].forEach((sp) => mov(piuGiorni(oggi, -C.intero(3, 50)), 'USCITA', 'BANCA', C.tra(sp[1], sp[2]), 'SPESE', sp[0]));
    S.primaNota.sort((a, b) => b.data.localeCompare(a.data));
    // saldi di partenza scelti perche' oggi i conti tornino su valori credibili per un negozio
    // (stesso calcolo del saldo che fa l'app: prima nota + incassi del banco)
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
    const obiettivo = { CASSA: 1850, BANCA: 38400, POS: 640, ASSEGNI: 1250 };
    S.conti.forEach((c) => { c.iniziale = r2(obiettivo[c.codice] - flusso(c.codice)); });

    // ---------- registro agrofarmaci ----------
    S.registro = [];
    const fito = artDiCat('FITO');
    const agro = S.fornitori.find((f) => f.cat.includes('FITO'));
    fito.forEach((a) => {
      const quanti = C.intero(1, 3);
      for (let k = 0; k < quanti; k++) {
        const data = piuGiorni(oggi, -C.intero(10, 170));
        S.registro.push({ id: nuovoId(), tipo: 'CARICO', data, artId: a.id, qta: C.intero(6, 30), fornitoreId: agro.id, doc: 'DDT forn. ' + C.intero(1200, 4800), dataDoc: data, lotto: a.lotto });
      }
    });
    const validi = (data) => S.patentini.filter((p) => p.scadenza >= data && p.rilascio <= data);
    for (let k = 0; k < 70; k++) {
      const data = piuGiorni(oggi, -C.intero(0, 95));
      const v = validi(data);
      if (!v.length) continue;
      const p = C.scegli(v);
      const a = C.scegli(fito);
      S.registro.push({ id: nuovoId(), tipo: 'SCARICO', data, artId: a.id, qta: C.intero(1, 5), patentinoId: p.id, clienteId: p.clienteId, doc: 'DDT ' + C.intero(1, Math.max(2, nDdt)), dataDoc: data, lotto: a.lotto });
    }
    S.registro.sort((a, b) => b.data.localeCompare(a.data));

    // ---------- cronologia ----------
    S.cronologia = [];
    const voce = (quando, tipo, descr) => S.cronologia.push({ id: nuovoId(), quando, tipo, descr });
    S.scontrini.slice(-12).forEach((s) => voce(s.data, 'Vendita', 'Emesso scontrino n. ' + s.numero + ' · € ' + s.totale.toFixed(2).replace('.', ',')));
    S.fatture.slice(-8).forEach((f) => voce(f.data + 'T18:' + pad(C.intero(10, 50)) + ':00', 'Fattura', 'Emessa ' + (f.tipo === 'FAC' ? 'fattura accompagnatoria FAC ' : 'fattura n. ') + f.numero + ' a ' + cliPer[f.clienteId].nome));
    C.mescola(S.articoli).slice(0, 5).forEach((a) => voce(piuGiorni(oggi, -C.intero(0, 6)) + 'T' + pad(C.intero(8, 18)) + ':' + pad(C.intero(0, 59)) + ':00', 'Articoli', 'Modificato il prezzo di ' + a.codice + ' · ' + a.descr));
    S.cronologia.sort((a, b) => b.quando.localeCompare(a.quando));

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

  window.GF_DATI = { genera, storico, iso, daIso, piuGiorni, fineMese, r2, pad };
})();
