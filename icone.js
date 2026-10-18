/* Icone a tratto che ricalcano i simboli «Segoe MDL2 Assets» del programma (casa, torta, carrello,
   orologio, elenco, pagina, persona, borsa, pacco, autobus, spunta, freccia giù, calcolatrice, schermo
   con scudo, grafico, cronologia, busta, cestino, lucchetto...). Disegnate in linea in stile Lucide
   (https://lucide.dev, licenza ISC): nessun file da scaricare, funzionano anche senza rete. */
(function () {
  'use strict';
  const P = {
    dashboard: '<path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>',
    analisi: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M21 12c.6 0 1-.4 1-1A10 10 0 0 0 13 2c-.6 0-1 .4-1 1v8a1 1 0 0 0 1 1z" fill="currentColor" fill-opacity=".35"/>',
    banco: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    orologio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6h4"/>',
    articoli: '<path d="M10 6h11"/><path d="M10 12h11"/><path d="M10 18h7"/><rect x="3" y="4.5" width="3" height="3"/><rect x="3" y="10.5" width="3" height="3"/><rect x="3" y="16.5" width="3" height="3"/>',
    cartella: '<path d="M5 2h14v16l-4 4H5z"/><path d="M19 18h-4v4"/>',
    clienti: '<circle cx="12" cy="8" r="5"/><path d="M3 22a9 9 0 0 1 18 0"/>',
    borsa: '<path d="M5 8h11v14H5z"/><path d="M16 8l3 2v12h-3"/><path d="M8 8V5a3 3 0 0 1 6 0v3"/>',
    pacco: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v13h16V8"/><path d="M7 15h5"/><path d="M7 18h3"/>',
    bus: '<rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 19v2"/><path d="M18 21v-2"/><path d="M2 7h2"/><path d="M20 7h2"/>',
    spunta: '<path d="M20 6 9 17l-5-5"/>',
    scarica: '<path d="M12 3v14"/><path d="m6 11 6 6 6-6"/><path d="M5 21h14"/>',
    pagina: '<path d="M14 2H5v20h14V7z"/><path d="M14 2v5h5"/>',
    calcolatrice: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M8 6h8v3H8z"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/><path d="M8 17h.01"/><path d="M12 17h.01"/><path d="M16 17h.01"/>',
    amministrazione: '<path d="M14 15H3V4h17v6"/><path d="M8 19h5"/><path d="M10.5 15v4"/><path d="M18.5 12.5 22 14v2.5c0 2.2-1.5 4-3.5 5-2-1-3.5-2.8-3.5-5V14z"/>',
    report: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M5 15h3l2-5 3 8 2-6 2 3h2"/>',
    cronologia: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 3"/>',
    posta: '<rect x="2" y="5" width="20" height="14" rx="1"/><path d="m2 6 10 7 10-7"/>',
    cestino: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M5 6l1 15h12l1-15"/><path d="M10 10v7"/><path d="M14 10v7"/>',
    lucchetto: '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    utente: '<circle cx="12" cy="8" r="5"/><path d="M3 22a9 9 0 0 1 18 0"/>',
    occhio: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    freccia: '<path d="m9 18 6-6-6-6"/>',
    indietro: '<path d="m15 18-6-6 6-6"/>',
    'freccia-sx': '<path d="M20 12H4"/><path d="m10 18-6-6 6-6"/>',
    avviso: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  };
  window.GF_ICONA = function (nome, classe) {
    return '<svg class="ico' + (classe ? ' ' + classe : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[nome] || P.info) + '</svg>';
  };
})();
