'use strict';

// Muntjes-app: ouder-app + kind-app met gedeelde gegevens.
// Twee standen:
// - demo (GitHub Pages, localhost): alles in deze browser, met demo-balk en voorbeeldgegevens;
// - echt (muntjes.darkesttimes.nl): gegevens op de server via api.php,
//   ouder logt in met de pincode, een tablet wordt eenmalig aan een kind gekoppeld.

const PARAMS = new URLSearchParams(location.search);
const DEMO = PARAMS.has('demo') || (!PARAMS.has('echt') && (/github\.io$/.test(location.hostname) || ['localhost', '127.0.0.1', ''].includes(location.hostname)));
const DATA_KEYS = ['kids', 'klusjes', 'beloningen', 'taken', 'focus', 'maxFocus', 'tx', 'timers', 'kindMelden', 'maxWeek', 'nextId'];
const TOKEN_SLEUTEL = 'muntjes-apparaat';

const IC = {
  plate: 'M4 3v18M2 3v5a2 2 0 0 0 4 0V3M10 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
  table: 'M3 9h18M5 9v11M19 9v11M3 13h18M9 5h6',
  bed: 'M3 19V6M3 14h18v5M21 14v-1a3 3 0 0 0-3-3h-7v4M5.5 11.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
  tooth: 'M7.5 3C5 3 4 5 4 7c0 3 1.5 4 2 7s1 7 2.5 7 1.5-5 3.5-5 2 5 3.5 5 2-4 2.5-7 2-4 2-7c0-2-1-4-3.5-4-1.5 0-2.5 1-4.5 1S9 3 7.5 3z',
  shirt: 'M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z',
  blocks: 'M4 13h7v7H4zM13 13h7v7h-7zM8.5 4h7v7h-7z',
  kamer: 'M3 10h18l-2 10H5zM7 10V6h4v4M14 10l1.5-5 3 1-1.2 4',
  bag: 'M5 8h14l-1 13H6L5 8zM9 8V6a3 3 0 0 1 6 0v2',
  mand: 'M3 10h18l-2 10H5zM7 10l3-6M17 10l-3-6M9 14v3M12 14v3M15 14v3',
  paw: 'M12 13c-3 0-5 3-5 5.5 0 1.5 1.5 2 2.5 1.5s1.5-1 2.5-1 1.5.5 2.5 1 2.5 0 2.5-1.5c0-2.5-2-5.5-5-5.5zM3.5 10a1.5 2 0 1 0 3 0a1.5 2 0 1 0-3 0M7.5 5.5a1.5 2 0 1 0 3 0a1.5 2 0 1 0-3 0M13.5 5.5a1.5 2 0 1 0 3 0a1.5 2 0 1 0-3 0M17.5 10a1.5 2 0 1 0 3 0a1.5 2 0 1 0-3 0',
  tablet: 'M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
  tv: 'M3 7h18v12H3zM8 3l4 4 4-4',
  book: 'M12 6C10 4.5 7 4 3 4v15c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2zM12 6v15',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  ice: 'M8 10a4 4 0 1 1 8 0M7 10h10l-5 11z',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  broom: 'M19 3l-7 7M9 9l6 6M4 20c0-4 3-8 6-10l4 4c-2 3-6 6-10 6z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  game: 'M6 9h12a4 4 0 0 1 0 8c-1.5 0-2.5-1-3-2H9c-.5 1-1.5 2-3 2a4 4 0 0 1 0-8zM8 11v3M6.5 12.5h3M15.5 12h.01M17.5 14h.01',
  gift: 'M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7c-2-4-6-4-6-1s6 1 6 1zM12 7c2-4 6-4 6-1s-6 1-6 1z',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0M20 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0',
  ball: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  chev: 'M9 6l6 6-6 6',
  slot: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  persoon: 'M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8M4 21c0-4 3.6-6 8-6s8 2 8 6',
  herhaal: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  minus: 'M5 12h14M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0',
  melden: 'M12 8v8M8 12h8M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0',
  inbox: 'M3 13h5l1.5 3h5l1.5-3h5M5 5h14l2 8v6H3v-6z',
  klok: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2',
  beheer: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
  vink: 'M5 12.5l4.5 4.5L19 7.5',
  kruis: 'M6 6l12 12M18 6L6 18',
  speel: 'M8 5.5v13a.8.8 0 0 0 1.2.7l10.4-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5z'
};

const OPSLAG = 'muntjes-preview-v2';
const KLEUREN = [
  ['#7A4FD0', '#F1ECFB'], ['#0F7C74', '#E4F3F1'], ['#2457C5', '#E8EFFB'], ['#C2410C', '#FCEDE5'],
  ['#B0306A', '#FAE8F0'], ['#4D7C0F', '#EEF5E4'], ['#1D2733', '#ECEFF3']
];
const ICOON_KEUZE = ['plate', 'table', 'kamer', 'bed', 'tooth', 'shirt', 'blocks', 'mand', 'bag', 'paw', 'broom', 'trash', 'tablet', 'tv', 'game', 'book', 'moon', 'ice', 'gift', 'music', 'ball', 'star'];
const DUREN = [0, 5, 10, 15, 20, 30, 45, 60];
const THEMAS = [['geen', 'Standaard'], ['eenhoorn', 'Eenhoorns'], ['dino', 'Dinosaurussen']];
// Spelletjes die een beloning direct kan openen.
const SPELLEN = [['', 'Geen'], ['https://spelletjes.darkesttimes.nl/', 'Flesjes Sorteren']];
const spelNaam = (url) => (SPELLEN.find(([u]) => u === url) || [url, 'Spelletje'])[1];

// Getekende plaatjes voor de kind-app, per thema. Iconen zonder plaatje blijven een lijnicoon.
const PLAATJES = { plate: 'tafel-dekken', table: 'tafel-afruimen', blocks: 'speelgoed-opruimen', mand: 'boodschappen', paw: 'huisdier-voeren', tooth: 'tanden-poetsen', tablet: 'tablet', game: 'spelletje' };
const PLAATJE_MAP = { geen: 'neutral', eenhoorn: 'unicorn', dino: 'dinosaurus' };
const plaatje = (d, thema, size, sw) => (PLAATJES[d] ? `<img class="ill" src="img/${PLAATJE_MAP[thema] || 'neutral'}/${PLAATJES[d]}.webp" width="${size}" height="${size}" alt="">` : icon(d, size, sw));

// Mascottes voor de kind-app, per thema.
const MASCOTTE = {
  eenhoorn: (size) => `<svg width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <g stroke="#5B4A86" stroke-width="2.5">
      <circle cx="60" cy="34" r="10" fill="#F9A8D4"/><circle cx="50" cy="46" r="10" fill="#C4B5FD"/>
      <circle cx="44" cy="60" r="10" fill="#93C5FD"/><circle cx="40" cy="74" r="9" fill="#F9A8D4"/>
      <circle cx="38" cy="88" r="9" fill="#C4B5FD"/><circle cx="38" cy="101" r="8" fill="#93C5FD"/>
      <path d="M46 110C42 94 42 78 48 66C52 46 66 33 82 33C94 33 102 41 106 53C110 63 108 73 100 77C94 80 86 79 80 75C76 85 74 97 76 110Z" fill="#fff" stroke-linejoin="round"/>
      <path d="M70 38L65 19L80 31Z" fill="#fff" stroke-linejoin="round"/>
      <path d="M82 33L97 6L91 35Z" fill="#FCD34D" stroke="#B45309" stroke-linejoin="round"/>
      <path d="M86 25L93 23M84 30L92 28M89 18L95 16" stroke="#B45309" stroke-width="2"/>
      <path d="M83 52q5-5 10 0" fill="none" stroke-linecap="round"/>
    </g>
    <circle cx="94" cy="63" r="5" fill="#F9A8D4" opacity=".7"/>
    <circle cx="103" cy="66" r="2" fill="#5B4A86"/>
  </svg>`,
  dino: (size) => `<svg width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <g stroke="#2F5A1C" stroke-width="2.5" stroke-linejoin="round">
      <path d="M48 58l5-11 6 10zM62 56l6-11 5 11zM76 52l7-9 3 11zM86 36l8-6 1 10z" fill="#FB923C"/>
      <path d="M24 88C12 90 6 84 3 74C11 80 18 80 26 78Z" fill="#84CC16"/>
      <rect x="32" y="90" width="12" height="20" rx="5" fill="#65A30D"/>
      <rect x="64" y="90" width="12" height="20" rx="5" fill="#65A30D"/>
      <path d="M20 90C20 70 38 58 58 58C70 58 78 62 82 52C86 40 88 26 98 22C108 18 117 26 115 36C113 44 105 46 99 46C95 56 93 70 91 80C89 92 80 100 66 100L30 100C24 100 20 97 20 90Z" fill="#84CC16"/>
      <path d="M40 92C40 80 50 74 62 74C72 74 78 80 78 90" fill="#D9F99D" stroke-width="2"/>
    </g>
    <circle cx="104" cy="31" r="3" fill="#1D2733"/>
    <path d="M100 40q6 3 11-1" fill="none" stroke="#2F5A1C" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="52" cy="68" r="3" fill="#65A30D"/><circle cx="66" cy="66" r="2.5" fill="#65A30D"/>
  </svg>`
};
const UUR = 3600e3;
const DAG = 24 * UUR;
const DAGEN = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

// ---------- hulpjes ----------
const $ = (sel) => document.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const munt = (n) => (n === 1 ? 'muntje' : 'muntjes');
const pad = (n) => String(n).padStart(2, '0');
const mmss = (sec) => { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + pad(sec % 60); };
const kidVan = (id) => s.kids.find((k) => k.id === id);
const klusVan = (id) => s.klusjes.find((k) => k.id === id);
const belVan = (id) => s.beloningen.find((b) => b.id === id);
const icon = (d, size = 24, sw = 1.6) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[d] || d}"/></svg>`;
const coin = (size = 24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#F2B705" stroke="#B07F00" stroke-width="1.5"/><circle cx="12" cy="12" r="6" fill="none" stroke="#B07F00" stroke-width="1.5"/></svg>`;
const hart = (size = 24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 4.5 6.9 4.5c2.1 0 3.6 1.1 5.1 3 1.5-1.9 3-3 5.1-3 3.7 0 5.9 3.8 4.4 7.3C19.5 16.4 12 21 12 21z" fill="#F472B6" stroke="#BE185D" stroke-width="1.5" stroke-linejoin="round"/><path d="M6.5 8.2c.6-1.2 1.7-1.7 2.8-1.5" fill="none" stroke="#FCE7F3" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const vlees = (size = 24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 13.5L5.2 18.8" stroke="#7C2D12" stroke-width="4.6" stroke-linecap="round"/><path d="M10.5 13.5L5.2 18.8" stroke="#FFF7E6" stroke-width="2.4" stroke-linecap="round"/><circle cx="3.9" cy="17.6" r="1.9" fill="#FFF7E6" stroke="#7C2D12" stroke-width="1.2"/><circle cx="6.4" cy="20.1" r="1.9" fill="#FFF7E6" stroke="#7C2D12" stroke-width="1.2"/><path d="M9.5 13.5C7 11 7.6 6.6 10.6 4.6 13.6 2.6 18.5 3.2 20.3 6.4 22 9.6 20.2 13.8 16.6 15.2 14 16.2 11.3 15.3 9.5 13.5z" fill="#C2410C" stroke="#7C2D12" stroke-width="1.4" stroke-linejoin="round"/><path d="M13 6.6c1.5-1 3.5-1 4.7.2" fill="none" stroke="#FDBA74" stroke-width="1.5" stroke-linecap="round"/></svg>`;
// Wat een kind verzamelt hangt af van zijn thema.
const VALUTA = {
  geen: { een: 'muntje', veel: 'muntjes', titel: 'Jouw muntjes', vandaan: 'Waar komen je muntjes vandaan?', icoon: coin },
  eenhoorn: { een: 'hartje', veel: 'hartjes', titel: 'Jouw hartjes', vandaan: 'Waar komen je hartjes vandaan?', icoon: hart },
  dino: { een: 'stukje vlees', veel: 'stukjes vlees', titel: 'Jouw vlees', vandaan: 'Waar komt je vlees vandaan?', icoon: vlees }
};
const valuta = (kid) => {
  const v = VALUTA[kid && kid.thema] || VALUTA.geen;
  return { ...v, woord: (n) => (n === 1 ? v.een : v.veel) };
};
const avatar = (k, size = 28) => `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px;background:${k.kleur}" aria-hidden="true">${k.naam[0]}</span>`;

function weekStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
}
const dezeWeek = (t) => t.ts >= weekStart();
function dagStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
const periodeStart = (per) => (per === 'dag' ? dagStart() : weekStart());
const perTekst = (x) => x.keer + '× per ' + x.per;
const periodeNu = (per) => (per === 'dag' ? 'vandaag' : 'deze week');

// Timers: een lopende timer onthoudt zijn eindtijd, zodat hij doorloopt als de app dicht is.
// In de demo kan 1 seconde 1 minuut zijn.
const snelheid = () => (DEMO && s.demoSnel ? 60 : 1);
const timerRest = (t) => (t.status === 'loopt' ? Math.max(0, ((t.eind - Date.now()) / 1000) * snelheid()) : t.rest);
const timerKlaar = (t) => t.status === 'loopt' && timerRest(t) <= 0;

function tijdLabel(ts) {
  const d = new Date(ts);
  const nu = new Date();
  const vandaag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate()).getTime();
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (ts >= vandaag) return 'vandaag ' + hm;
  if (ts >= vandaag - DAG) return 'gisteren ' + hm;
  if (ts >= vandaag - 6 * DAG) return DAGEN[d.getDay()] + ' ' + hm;
  return d.getDate() + '/' + (d.getMonth() + 1);
}

// ---------- toestand ----------
function beginState() {
  const nu = Date.now();
  const t = (id, kid, type, ref, label, amount, status, bron, geleden, msg) => ({ id, kid, type, ref, label, amount, status, bron, ts: nu - geleden, msg: msg || '' });
  return {
    v: 2,
    kids: [
      { id: 'noor', naam: 'Noor', kleur: '#7A4FD0', zacht: '#F1ECFB', thema: 'eenhoorn' },
      { id: 'daan', naam: 'Daan', kleur: '#0F7C74', zacht: '#E4F3F1', thema: 'dino', groot: true }
    ],
    klusjes: [
      { id: 'k1', naam: 'Tafel dekken', icon: 'plate', waarde: 1, keer: 1, per: 'dag' },
      { id: 'k2', naam: 'Tafel afruimen', icon: 'table', waarde: 1, keer: 1, per: 'dag' },
      { id: 'k3', naam: 'Kamer opruimen', icon: 'kamer', waarde: 1, keer: 1, per: 'dag' },
      { id: 'k4', naam: 'Tanden poetsen zonder zeuren', icon: 'tooth', waarde: 1, keer: 1, per: 'dag' },
      { id: 'k5', naam: 'Aankleden', icon: 'shirt', waarde: 1, keer: 1, per: 'dag' },
      { id: 'k6', naam: 'Speelgoed opruimen', icon: 'blocks', waarde: 1, keer: 1, per: 'dag' },
      { id: 'k7', naam: 'Helpen met boodschappen', icon: 'mand', waarde: 1, keer: 1, per: 'dag' },
      { id: 'k8', naam: 'Huisdier voeren', icon: 'paw', waarde: 1, keer: 1, per: 'dag' }
    ],
    beloningen: [
      { id: 'b1', naam: 'Tablet', icon: 'tablet', kosten: 2, duur: 15, keer: 1, per: 'week' },
      { id: 'b2', naam: 'Tv kijken', icon: 'tv', kosten: 2, duur: 15, keer: 1, per: 'week' },
      { id: 'b3', naam: 'Extra voorleesverhaal', icon: 'book', kosten: 1, keer: 1, per: 'week' },
      { id: 'b4', naam: 'Later naar bed', icon: 'moon', kosten: 3, keer: 1, per: 'week' },
      { id: 'b5', naam: 'Toetje kiezen', icon: 'ice', kosten: 1, keer: 1, per: 'week' },
      { id: 'b6', naam: 'Flesjes Sorteren', icon: 'game', kosten: 2, duur: 15, keer: 1, per: 'week', spel: SPELLEN[1][0] }
    ],
    // Taken: elke keer een ster; alle sterren binnen een week = taak voltooid = beloning.
    taken: [
      { id: 't1', naam: 'Zelf aankleden', icon: 'shirt', doel: 5, beloning: 1 },
      { id: 't2', naam: 'Zelf tanden poetsen', icon: 'tooth', doel: 7, beloning: 1 },
      { id: 't3', naam: 'Bed opmaken', icon: 'bed', doel: 5, beloning: 1 },
      { id: 't4', naam: 'Schooltas inpakken', icon: 'bag', doel: 5, beloning: 1 },
      { id: 't5', naam: 'Op tijd naar bed', icon: 'moon', doel: 5, beloning: 1 }
    ],
    focus: { noor: { week: weekStart(), ids: ['t1', 't3'] } },
    maxFocus: 3,
    maxWeek: 7,
    edit: null,
    tx: [
      t(14, 'daan', 'klus', 'k3', 'Kamer opruimen', 1, 'aangevraagd', 'kind', 0.2 * UUR),
      t(1, 'noor', 'klus', 'k1', 'Tafel dekken', 1, 'goed', 'ouder', 0.5 * UUR),
      t(8, 'daan', 'beloning', 'b2', 'Tv kijken', -2, 'aangevraagd', 'kind', 1 * UUR),
      t(7, 'daan', 'klus', 'k8', 'Huisdier voeren', 1, 'goed', 'ouder', 9 * UUR),
      t(2, 'noor', 'beloning', 'b5', 'Toetje kiezen', -1, 'goed', 'kind', 23 * UUR),
      t(9, 'daan', 'klus', 'k6', 'Speelgoed opruimen', 1, 'goed', 'ouder', 24 * UUR),
      t(3, 'noor', 'overig', null, 'Lief voor broertje geweest', 1, 'goed', 'ouder', 25 * UUR, 'Wat zorgzaam van je!'),
      t(10, 'daan', 'overig', null, 'Afspraak niet nagekomen', -1, 'goed', 'ouder', 30 * UUR),
      t(4, 'noor', 'klus', 'k4', 'Tanden poetsen zonder zeuren', 1, 'goed', 'ouder', 48 * UUR),
      t(11, 'daan', 'klus', 'k2', 'Tafel afruimen', 1, 'goed', 'ouder', 49 * UUR),
      t(5, 'noor', 'klus', 'k3', 'Kamer opruimen', 1, 'goed', 'ouder', 8 * DAG),
      t(6, 'noor', 'klus', 'k7', 'Helpen met boodschappen', 1, 'goed', 'ouder', 8 * DAG, 'Super geholpen met de boodschappen!'),
      t(12, 'daan', 'klus', 'k5', 'Aankleden', 1, 'goed', 'ouder', 9 * DAG),
      t(13, 'daan', 'klus', 'k1', 'Tafel dekken', 1, 'goed', 'ouder', 9 * DAG),
      t(20, 'noor', 'ster', 't1', 'Zelf aankleden', 0, 'goed', 'ouder', 0.6 * UUR),
      t(21, 'noor', 'ster', 't1', 'Zelf aankleden', 0, 'goed', 'ouder', 0.7 * UUR),
      t(22, 'noor', 'ster', 't1', 'Zelf aankleden', 0, 'goed', 'ouder', 0.8 * UUR),
      t(23, 'noor', 'ster', 't3', 'Bed opmaken', 0, 'aangevraagd', 'kind', 0.3 * UUR)
    ],
    nextId: 100,
    tabletKid: 'noor',
    scherm: 'melden',
    sheet: null,
    bericht: '',
    ovKid: 'noor', ovSign: 1, ovAmt: 1, ovReden: '', ovZeker: false,
    toast: null,
    timers: [],
    kindMelden: { noor: true, daan: true },
    demoSnel: true
  };
}

// Oudere demo-stand had de tijd in de naam ("15 min tablet"); die staat nu apart.
function zonderTijdInNaam(st) {
  const oud = { '15 min tablet': 'Tablet', '15 min tv': 'Tv kijken' };
  return {
    ...st,
    beloningen: st.beloningen.map((b) => (oud[b.naam] ? { ...b, naam: oud[b.naam] } : b)),
    tx: st.tx.map((t) => (t.type === 'beloning' && oud[t.label] ? { ...t, label: oud[t.label] } : t))
  };
}

// Oudere demo-stand kende nog geen "hoe vaak" per klusje of beloning.
function metHoeVaak(st) {
  return {
    ...st,
    // Kamer opruimen deelde het bed-icoon met Bed opmaken, boodschappen de tas met Schooltas inpakken.
    klusjes: st.klusjes.map((k) => ({ keer: 1, per: 'dag', ...k, ...(k.id === 'k3' && k.icon === 'bed' ? { icon: 'kamer' } : k.id === 'k7' && k.icon === 'bag' ? { icon: 'mand' } : {}) })),
    beloningen: [...st.beloningen.map((b) => ({ keer: 1, per: 'week', ...b })),
      ...(st.spelErbij || st.beloningen.some((b) => b.spel) ? [] : [beginState().beloningen.find((b) => b.spel)])],
    spelErbij: true,
    kids: st.kids.map((k) => ({ thema: { noor: 'eenhoorn', daan: 'dino' }[k.id] || 'geen', ...k })),
    // Timers onthouden nu hun eindtijd; oude demo-timers worden gepauzeerd.
    timers: st.timers.filter((t) => t.status !== 'klaar').map((t) => (t.status === 'loopt' && !t.eind ? { ...t, status: 'pauze' } : t))
  };
}

// Begin van de echte app: standaardklusjes en -beloningen, nog geen kinderen.
function startData() {
  const b = beginState();
  return { kids: [], klusjes: b.klusjes, beloningen: b.beloningen, taken: b.taken, focus: {}, maxFocus: 3, tx: [], timers: [], kindMelden: {}, maxWeek: 7, nextId: 1 };
}
const dataVan = (st) => Object.fromEntries(DATA_KEYS.map((k) => [k, st[k]]));

function laad() {
  if (!DEMO) return { ...beginState(), ...startData(), tabletKid: null, login: { stap: 'kies', pin: '', fout: '' } };
  try {
    const raw = localStorage.getItem(OPSLAG);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.v === 2) return metHoeVaak(zonderTijdInNaam({ ...beginState(), ...d, toast: null, sheet: null, edit: null }));
    }
  } catch (e) { /* geen opslag beschikbaar: begin opnieuw */ }
  return beginState();
}

function bewaar() {
  if (!DEMO) return;
  try { localStorage.setItem(OPSLAG, JSON.stringify({ ...s, toast: null, sheet: null, edit: null })); } catch (e) { /* negeren */ }
}

let s = laad();
let weergave = ['ouder', 'kind'].includes(PARAMS.get('view')) ? PARAMS.get('view') : 'beide';
let toastTimer = null;
// Demo: ?kind=<id> toont de tablet van dat kind.
const kindUitUrl = PARAMS.get('kind');
if (DEMO && kindUitUrl && s.kids.some((k) => k.id === kindUitUrl)) s = { ...s, tabletKid: kindUitUrl };
if (DEMO && PARAMS.get('scherm') === 'taken') s = { ...s, kindScherm: 'taken' };

function zet(patch) {
  const oud = s;
  const delta = typeof patch === 'function' ? patch(s) : patch;
  s = { ...s, ...delta };
  bewaar();
  if (!DEMO && rol && DATA_KEYS.some((k) => k in delta && delta[k] !== oud[k])) {
    onbevestigd.push(patch);
    synchroniseer();
  }
  render();
}

// ---------- server (alleen in de echte app) ----------
let rol = null;          // 'ouder', 'familie' of 'kind' zodra ingelogd of gekoppeld
let ik = null;           // ingelogde gebruiker: { id, naam }
const volwassene = () => rol === 'ouder' || rol === 'familie';
const magBeheren = () => DEMO || rol === 'ouder';
const mijnNaam = () => (DEMO ? 'Papa' : (ik && ik.naam) || '');
let geladen = DEMO;
let versie = 0;          // versie van de gegevens op de server
let onbevestigd = [];    // wijzigingen die de server nog niet heeft bevestigd
let bezig = false;

function leesToken() {
  try { return localStorage.getItem(TOKEN_SLEUTEL) || ''; } catch (e) { return ''; }
}
function zetToken(t) {
  try { if (t) localStorage.setItem(TOKEN_SLEUTEL, t); else localStorage.removeItem(TOKEN_SLEUTEL); } catch (e) { /* negeren */ }
}

async function api(actie, body, query = '') {
  const headers = {};
  const token = leesToken();
  if (token) headers['X-Apparaat'] = token;
  const init = { headers, credentials: 'same-origin', cache: 'no-store' };
  if (body !== undefined) {
    init.method = 'POST';
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  try {
    const res = await fetch('api.php?actie=' + actie + query, init);
    let data = null;
    if (res.status !== 204) { try { data = await res.json(); } catch (e) { /* geen JSON */ } }
    return { status: res.status, ok: res.ok, data: data || {} };
  } catch (e) {
    return { status: 0, ok: false, data: {} };
  }
}

// Stuurt de gegevens naar de server. Was iemand anders net eerder (409), dan nemen we zijn
// versie over en voeren we onze eigen wijzigingen er opnieuw op uit.
async function synchroniseer() {
  if (bezig) return;
  bezig = true;
  let herlaad = false;
  try {
    while (onbevestigd.length) {
      const n = onbevestigd.length;
      const r = await api('opslaan', { versie, data: dataVan(s) });
      if (r.ok) {
        versie = r.data.versie;
        onbevestigd.splice(0, n);
      } else if (r.status === 409) {
        s = { ...s, ...(r.data.data || startData()) };
        versie = r.data.versie;
        onbevestigd.forEach((p) => { s = { ...s, ...(typeof p === 'function' ? p(s) : p) }; });
        render();
      } else if (r.status === 401) {
        afgemeld();
        return;
      } else {
        // Geweigerd: de wijziging weggooien en de gegevens van de server opnieuw ophalen.
        if (r.status === 403) { onbevestigd = []; herlaad = true; }
        melding(r.data.fout || 'Niet opgeslagen: geen verbinding. Ik probeer het zo opnieuw.');
        break;
      }
    }
  } finally {
    bezig = false;
  }
  if (herlaad || (!onbevestigd.length && versie === 0)) haal(true);
}

async function haal(alles) {
  if (!rol || bezig) return;
  if (onbevestigd.length) { synchroniseer(); return; }
  const r = await api('staat', undefined, '&sinds=' + (alles ? -1 : versie));
  if (r.status === 401) { afgemeld(); return; }
  if (r.status !== 200 || onbevestigd.length || bezig) return;
  versie = r.data.versie;
  if (r.data.data) s = { ...s, ...r.data.data };
  if (rol === 'kind' && !kidVan(s.tabletKid)) { zetToken(''); afgemeld(); return; }
  render();
}

function afgemeld() {
  rol = null;
  ik = null;
  versie = 0;
  onbevestigd = [];
  geladen = true;
  s = { ...s, ...startData(), tabletKid: null, sheet: null, edit: null, scherm: 'melden', login: { stap: 'kies', pin: '', fout: '' } };
  render();
}

async function start() {
  const r = await api('status');
  if (r.status === 0) {
    geladen = true;
    s = { ...s, login: { stap: 'kies', pin: '', fout: 'Geen verbinding met de server. Controleer het internet.' } };
    render();
    return;
  }
  if (!['ouder', 'familie', 'kind'].includes(r.data.rol)) {
    if (leesToken()) zetToken('');   // tablet was ontkoppeld
    afgemeld();
    return;
  }
  rol = r.data.rol;
  ik = rol === 'kind' ? null : { id: r.data.id, naam: r.data.naam };
  s = { ...s, login: null, tabletKid: rol === 'kind' ? r.data.kid : null, scherm: rol === 'familie' && s.scherm === 'beheer' ? 'melden' : s.scherm };
  await haal(true);
  if (!rol) return;
  if (rol === 'ouder' && versie === 0) {
    // Allereerste keer: standaardklusjes en -beloningen op de server zetten.
    s = { ...s, ...startData() };
    onbevestigd.push({});
    synchroniseer();
  }
  geladen = true;
  if (rol === 'ouder' && s.scherm === 'beheer') laadBeheer();
  if (volwassene()) {
    if (PARAMS.get('scherm') === 'timers') s = { ...s, scherm: 'timers' };
    laadPush();
  }
  render();
}

// ---------- meldingen op de telefoon (Web Push) ----------
// Stand: 'aan', 'uit', 'geen' (browser kan het niet), 'ios' (eerst op beginscherm zetten),
// 'geblokkeerd' (meldingen geweigerd in de browser) of 'bezig'.
let pushStand = null;
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const losseApp = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const pushKan = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function laadPush() {
  if (DEMO) return;
  if (!pushKan()) { pushStand = isIos() && !losseApp() ? 'ios' : 'geen'; render(); return; }
  if (Notification.permission === 'denied') { pushStand = 'geblokkeerd'; render(); return; }
  try {
    const reg = await navigator.serviceWorker.ready;
    const abo = await reg.pushManager.getSubscription();
    pushStand = abo && Notification.permission === 'granted' ? 'aan' : 'uit';
    // Server bijwerken (bijv. als nu iemand anders op deze telefoon is ingelogd).
    if (pushStand === 'aan') { const j = abo.toJSON(); api('push_aan', { endpoint: j.endpoint, keys: j.keys }); }
  } catch (e) {
    pushStand = 'geen';
  }
  render();
}

function sleutelBytes(b64) {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function laadBeheer() {
  const [a, g] = await Promise.all([api('apparaten'), api('gebruikers')]);
  zet({ apparaten: a.ok ? a.data.apparaten || [] : s.apparaten, gebruikers: g.ok ? g.data.gebruikers || [] : s.gebruikers });
}

function melding(tekst) {
  clearTimeout(toastTimer);
  zet({ toast: tekst });
  toastTimer = setTimeout(() => zet({ toast: null }), 2600);
}

const nieuwsteEerst = (tx) => tx.slice().sort((a, b) => b.ts - a.ts);

function voegToe(t) {
  zet((st) => ({ tx: [{ msg: '', ...t, id: st.nextId, ts: Date.now() }, ...st.tx], nextId: st.nextId + 1 }));
}

function stats(kid) {
  const mijn = s.tx.filter((t) => t.kid === kid);
  const saldo = mijn.filter((t) => t.status === 'goed').reduce((a, t) => a + t.amount, 0);
  const gereserveerd = mijn.filter((t) => t.status === 'aangevraagd' && t.amount < 0).reduce((a, t) => a - t.amount, 0);
  const week = mijn.filter((t) => dezeWeek(t) && t.status === 'goed' && t.type === 'klus').reduce((a, t) => a + t.amount, 0);
  return { saldo, gereserveerd, beschikbaar: saldo - gereserveerd, week };
}

const openMeldingen = (kid) => s.tx.filter((t) => t.kid === kid && t.type === 'klus' && t.status === 'aangevraagd').reduce((a, t) => a + t.amount, 0);

// Hoe vaak een klusje of beloning in de huidige periode (dag of week) gedaan of aangevraagd is.
function gebruikt(kid, type, item) {
  const van = periodeStart(item.per);
  return s.tx.filter((t) => t.kid === kid && t.type === type && t.ref === item.id && t.ts >= van && (t.status === 'goed' || t.status === 'aangevraagd')).length;
}

function belStatus(kid, b) {
  const van = periodeStart(b.per);
  const mijn = nieuwsteEerst(s.tx.filter((t) => t.kid === kid && t.type === 'beloning' && t.ref === b.id && t.ts >= van));
  if (mijn.some((t) => t.status === 'aangevraagd')) return 'aangevraagd';
  if (gebruikt(kid, 'beloning', b) >= b.keer) return 'op';
  if (mijn[0] && mijn[0].status === 'afgewezen') return 'afgewezen';
  if (mijn[0] && mijn[0].status === 'goed') return 'goed';
  return 'vrij';
}

// Timer van een goedgekeurde spelletje-beloning die nog niet om is.
function spelTimer(kid, b) {
  if (!b || !b.spel || !b.duur) return null;
  return s.timers.find((t) => t.kid === kid && t.ref === b.id && !timerKlaar(t)) || null;
}

// ---------- taken ----------
const taakVan = (id) => (s.taken || []).find((t) => t.id === id);
// Taken waar het kind deze week op focust (een nieuwe week begint leeg).
function focusVan(kid) {
  const f = (s.focus || {})[kid];
  return f && f.week === weekStart() ? f.ids.filter((id) => taakVan(id)) : [];
}
const sterTx = (kid, taakId, status) => s.tx.filter((t) => t.type === 'ster' && t.kid === kid && t.ref === taakId && dezeWeek(t) && (!status || t.status === status));
const taakKlaar = (kid, taakId) => s.tx.some((t) => t.type === 'taakklaar' && t.kid === kid && t.ref === taakId && dezeWeek(t));
const sterrenDezeWeek = (kid) => s.tx.filter((t) => t.type === 'ster' && t.kid === kid && t.status === 'goed' && dezeWeek(t)).length;

// Alle sterren binnen? Dan de taak voltooien: de beloning gaat erbij (eenmalig per week).
function voltooi(st, kid, taakId) {
  const taak = (st.taken || []).find((t) => t.id === taakId);
  if (!taak) return {};
  const van = weekStart();
  const n = st.tx.filter((t) => t.type === 'ster' && t.kid === kid && t.ref === taakId && t.status === 'goed' && t.ts >= van).length;
  if (n < taak.doel || st.tx.some((t) => t.type === 'taakklaar' && t.kid === kid && t.ref === taakId && t.ts >= van)) return {};
  const klaar = { id: st.nextId, kid, type: 'taakklaar', ref: taakId, label: 'Taak voltooid: ' + taak.naam, amount: taak.beloning, status: 'goed', bron: 'ouder', door: mijnNaam(), ts: Date.now(), msg: '' };
  return { tx: [klaar, ...st.tx], nextId: st.nextId + 1 };
}

const ster = (size = 24, vol = true) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.7l-5.4 2.9 1.1-6.1-4.5-4.3 6.1-.8z" fill="${vol ? '#FBBF24' : 'none'}" stroke="${vol ? '#B45309' : '#AEB6C1'}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

const laatsteMelding = (kid, k) => nieuwsteEerst(s.tx).find((t) => t.kid === kid && t.type === 'klus' && t.ref === k.id && t.bron === 'kind' && !t.gezien);

// Geluidjes op de tablet van het kind, gemaakt met Web Audio (geen geluidsbestanden).
let audio = null;
function audioCtx() {
  if (!audio) {
    try { const C = window.AudioContext || window.webkitAudioContext; audio = new C(); } catch (e) { return null; }
  }
  if (audio.state === 'suspended') audio.resume().catch(() => {});
  return audio;
}
// Browsers laten pas geluid toe na een eerste tik; dan alvast aanzetten.
document.addEventListener('pointerdown', () => { if (audio) audio.resume().catch(() => {}); else if (weergave !== 'ouder') audioCtx(); }, { capture: true });

function toon(c, freq, start, duur, type = 'sine', vol = 0.18, naar = null) {
  const g = c.createGain();
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (naar) o.frequency.exponentialRampToValueAtTime(naar, c.currentTime + start + duur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duur);
  o.connect(g);
  g.connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + duur + 0.05);
}

const GELUIDEN = {
  tik: (c) => toon(c, 520, 0, 0.09, 'triangle', 0.14, 880),
  munt: (c) => { toon(c, 1319, 0, 0.12, 'square', 0.05); toon(c, 1760, 0.07, 0.3, 'square', 0.05); },
  ster: (c) => [1568, 1976, 2349, 2637, 3136].forEach((f, i) => toon(c, f, i * 0.06, 0.35, 'sine', 0.1)),
  feest: (c) => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => toon(c, f, i * 0.11, i === 5 ? 0.6 : 0.16, 'triangle', 0.16)),
  terug: (c) => { toon(c, 392, 0, 0.18, 'triangle', 0.14, 330); toon(c, 523, 0.2, 0.3, 'triangle', 0.14, 784); }
};

// Alleen op de kind-app, en niet als papa of mama de geluidjes voor dit kind uit heeft gezet.
function geluid(naam) {
  const kind = kidVan(s.tabletKid);
  if (weergave === 'ouder' || !kind || kind.stil || (!DEMO && rol !== 'kind')) return;
  const c = audioCtx();
  if (c && GELUIDEN[naam]) { try { GELUIDEN[naam](c); } catch (e) { /* geen geluid mogelijk */ } }
}

function piep() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    const c = new C();
    [0, 0.25, 0.5].forEach((o) => {
      const g = c.createGain();
      const os = c.createOscillator();
      os.frequency.value = 880;
      os.connect(g);
      g.connect(c.destination);
      g.gain.setValueAtTime(0.2, c.currentTime + o);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + o + 0.2);
      os.start(c.currentTime + o);
      os.stop(c.currentTime + o + 0.2);
    });
  } catch (e) { /* geen geluid mogelijk */ }
}

// ---------- acties ----------
const acties = {
  view(d) {
    weergave = d.id;
    const url = new URL(location.href);
    if (weergave === 'beide') url.searchParams.delete('view'); else url.searchParams.set('view', weergave);
    history.replaceState(null, '', url);
    render();
    window.scrollTo(0, 0);
  },
  reset() {
    if (!DEMO) return;
    s = beginState();
    bewaar();
    gevierd = null;
    saldoBasis = null;
    try { localStorage.removeItem(GEVIERD); } catch (e) { /* negeren */ }
    melding('Demo is teruggezet');
  },
  tablet(d) { zet({ tabletKid: d.id }); },
  nav(d) {
    zet({ scherm: d.id, sheet: null });
    if (!DEMO && d.id === 'beheer' && rol === 'ouder') laadBeheer();
  },
  sluit() { zet({ sheet: null, bericht: '', ovZeker: false }); },

  klusOpen(d) {
    if (!s.kids.length) { melding('Voeg eerst een kind toe in Beheer'); return; }
    zet({ sheet: { type: 'klus', id: d.id }, bericht: '' });
  },
  klusKies(d) {
    const klus = s.sheet && klusVan(s.sheet.id);
    const kid = kidVan(d.id);
    if (!klus || stats(kid.id).week + klus.waarde > s.maxWeek || gebruikt(kid.id, 'klus', klus) >= klus.keer) return;
    voegToe({ kid: kid.id, type: 'klus', ref: klus.id, label: klus.naam, amount: klus.waarde, status: 'goed', bron: 'ouder', door: mijnNaam(), msg: s.bericht.trim() });
    zet({ sheet: null, bericht: '' });
    melding('+' + klus.waarde + ' voor ' + kid.naam + ' · ' + klus.naam);
  },

  // Taken (ouder geeft een ster)
  taakOpen(d) {
    if (!s.kids.length) { melding('Voeg eerst een kind toe in Beheer'); return; }
    zet({ sheet: { type: 'taak', id: d.id }, bericht: '' });
  },
  taakKies(d) {
    const taak = s.sheet && taakVan(s.sheet.id);
    const kid = kidVan(d.id);
    if (!taak || !kid || taakKlaar(kid.id, taak.id) || sterTx(kid.id, taak.id, 'goed').length >= taak.doel) return;
    voegToe({ kid: kid.id, type: 'ster', ref: taak.id, label: taak.naam, amount: 0, status: 'goed', bron: 'ouder', door: mijnNaam(), msg: s.bericht.trim() });
    zet((st) => voltooi(st, kid.id, taak.id));
    zet({ sheet: null, bericht: '' });
    melding(taakKlaar(kid.id, taak.id)
      ? kid.naam + ' heeft "' + taak.naam + '" voltooid! +' + taak.beloning + ' ' + valuta(kid).woord(taak.beloning)
      : '⭐ voor ' + kid.naam + ' · ' + taak.naam + ' (' + sterTx(kid.id, taak.id, 'goed').length + '/' + taak.doel + ')');
  },

  overigOpen() {
    if (!s.kids.length) { melding('Voeg eerst een kind toe in Beheer'); return; }
    zet({ sheet: { type: 'overig' }, ovKid: kidVan(s.ovKid) ? s.ovKid : s.kids[0].id, ovSign: 1, ovAmt: 1, ovReden: '', ovZeker: false });
  },
  ovKid(d) { zet({ ovKid: d.id, ovAmt: 1, ovZeker: false }); },
  ovPlus() { zet({ ovSign: 1, ovZeker: false }); },
  ovMin() { if (magBeheren()) zet({ ovSign: -1, ovAmt: 1, ovZeker: false }); },
  ovMinder() { const o = overigInfo(); zet({ ovAmt: Math.max(1, o.aantal - 1), ovZeker: false }); },
  ovMeer() { const o = overigInfo(); zet({ ovAmt: Math.min(o.max, o.aantal + 1), ovZeker: false }); },
  ovBevestig() {
    const o = overigInfo();
    if (o.uit) return;
    if (o.isMin && !s.ovZeker) { zet({ ovZeker: true }); return; }
    const reden = s.ovReden.trim();
    voegToe({ kid: s.ovKid, type: 'overig', ref: null, label: reden, amount: s.ovSign * o.aantal, status: 'goed', bron: 'ouder', door: mijnNaam() });
    zet({ sheet: null, ovReden: '', ovAmt: 1, ovZeker: false });
    melding((o.isMin ? '−' + o.aantal + ' van ' : '+' + o.aantal + ' voor ') + o.kind.naam + ' · ' + reden);
  },

  beslis(d) {
    const ok = d.x === 'ja';
    const t = s.tx.find((x) => String(x.id) === d.id);
    if (!t) return;
    const kid = kidVan(t.kid);
    const isKlus = t.type === 'klus';
    if (ok && isKlus && stats(t.kid).week + t.amount > s.maxWeek) {
      melding(kid.naam + ' heeft deze week al ' + s.maxWeek + ' muntjes verdiend');
      return;
    }
    if (t.type === 'ster') {
      const taak = taakVan(t.ref);
      if (ok && taak && (taakKlaar(t.kid, t.ref) || sterTx(t.kid, t.ref, 'goed').length >= taak.doel)) { melding(t.label + ' is al voltooid deze week'); return; }
      zet((st) => ({ tx: st.tx.map((x) => (x.id === t.id ? { ...x, status: ok ? 'goed' : 'afgewezen', beslistDoor: mijnNaam() } : x)) }));
      if (ok) zet((st) => voltooi(st, t.kid, t.ref));
      melding(ok ? (taakKlaar(t.kid, t.ref) ? kid.naam + ' heeft "' + t.label + '" voltooid!' : '⭐ voor ' + kid.naam + ' · ' + t.label) : kid.naam + ': ster niet gegeven');
      return;
    }
    const b = isKlus ? null : belVan(t.ref);
    zet((st) => ({
      tx: st.tx.map((x) => (x.id === t.id ? { ...x, status: ok ? 'goed' : 'afgewezen', beslistDoor: mijnNaam() } : x)),
      timers: ok && b && b.duur ? [...st.timers, { id: 't' + t.id, kid: t.kid, ref: b.id, naam: b.naam, totaal: b.duur * 60, rest: b.duur * 60, status: 'wacht', eind: null }] : st.timers
    }));
    if (isKlus) melding(ok ? '+' + t.amount + ' voor ' + kid.naam + ' · ' + t.label : kid.naam + ': melding afgewezen');
    else melding(ok ? kid.naam + ': ' + t.label + ' goedgekeurd' + (b && b.duur ? ' · timer klaar' : '') : kid.naam + ': afgewezen, muntjes terug');
  },

  timer(d) {
    const nu = Date.now();
    const f = snelheid();
    zet((st) => ({
      timers: st.timers
        .filter((t) => !(t.id === d.id && d.x === 'stop'))
        .map((t) => {
          if (t.id !== d.id) return t;
          const rest = timerRest(t);
          // Wie de timer startte krijgt ook de melding "Tijd is om" (ouders altijd).
          const door = !DEMO && ik ? { startDoor: ik.id } : {};
          if (d.x === 'start') return { ...t, ...door, status: 'loopt', eind: nu + (rest * 1000) / f };
          if (d.x === 'pauze') return t.status === 'loopt' ? { ...t, status: 'pauze', rest, eind: null } : { ...t, ...door, status: 'loopt', eind: nu + (rest * 1000) / f };
          if (d.x === 'plus') {
            return t.status === 'loopt'
              ? { ...t, totaal: t.totaal + 300, eind: Math.max(t.eind, nu) + 300000 / f }
              : { ...t, rest: rest + 300, totaal: t.totaal + 300 };
          }
          return t;
        })
    }));
  },
  snel() {
    // Lopende timers houden hun resttijd als de demo-snelheid wisselt.
    const nu = Date.now();
    const nieuw = s.demoSnel ? 1 : 60;
    const timers = s.timers.map((t) => (t.status === 'loopt' ? { ...t, eind: nu + (timerRest(t) * 1000) / nieuw } : t));
    zet({ demoSnel: !s.demoSnel, timers });
  },
  maxFocus(d) { zet({ maxFocus: Math.min(5, Math.max(1, (s.maxFocus || 3) + (d.x === '+' ? 1 : -1))) }); },
  meldToggle(d) { zet((st) => ({ kindMelden: { ...st.kindMelden, [d.id]: !st.kindMelden[d.id] } })); },
  maxWeek(d) { zet({ maxWeek: Math.min(30, Math.max(1, s.maxWeek + (d.x === '+' ? 1 : -1))) }); },

  // Beheer: kinderen, klusjes en beloningen
  bewerk(d) {
    if (d.x === 'kid') { const k = kidVan(d.id); zet({ edit: { soort: 'kid', id: k.id, naam: k.naam, kleur: k.kleur, thema: k.thema || 'geen', groot: !!k.groot, stil: !!k.stil, zeker: false } }); }
    else if (d.x === 'klus') { const k = klusVan(d.id); zet({ edit: { soort: 'klus', id: k.id, naam: k.naam, icon: k.icon, waarde: k.waarde, keer: k.keer, per: k.per, zeker: false } }); }
    else if (d.x === 'taak') { const t = taakVan(d.id); zet({ edit: { soort: 'taak', id: t.id, naam: t.naam, icon: t.icon, doel: t.doel, beloning: t.beloning, zeker: false } }); }
    else { const b = belVan(d.id); zet({ edit: { soort: 'bel', id: b.id, naam: b.naam, icon: b.icon, kosten: b.kosten, duur: b.duur || 0, keer: b.keer, per: b.per, spel: b.spel || '', zeker: false } }); }
  },
  nieuw(d) {
    const vrij = KLEUREN.find(([c]) => !s.kids.some((k) => k.kleur === c)) || KLEUREN[0];
    const basis = d.x === 'kid' ? { naam: '', kleur: vrij[0], thema: 'geen', groot: false, stil: false } : d.x === 'klus' ? { naam: '', icon: 'star', waarde: 1, keer: 1, per: 'dag' } : d.x === 'taak' ? { naam: '', icon: 'star', doel: 5, beloning: 1 } : { naam: '', icon: 'gift', kosten: 1, duur: 0, keer: 1, per: 'week', spel: '' };
    zet({ edit: { soort: d.x, id: null, ...basis, zeker: false } });
  },
  editVeld(d) {
    const e = s.edit;
    if (!e) return;
    let v = d.id;
    if (d.x === 'waarde' || d.x === 'kosten' || d.x === 'beloning') v = Math.min(10, Math.max(1, e[d.x] + (d.id === '+' ? 1 : -1)));
    if (d.x === 'doel') v = Math.min(14, Math.max(1, e.doel + (d.id === '+' ? 1 : -1)));
    if (d.x === 'duur' || d.x === 'keer') v = Number(d.id);
    if (d.x === 'groot') v = !e.groot;
    if (d.x === 'stil') v = !e.stil;
    zet({ edit: { ...e, [d.x]: v, zeker: false } });
  },
  editSluit() { zet({ edit: null }); },
  editOpslaan() {
    const e = s.edit;
    const naam = (e.naam || '').replace(/[<>&"]/g, '').trim().slice(0, 30);
    if (!naam) return;
    const nieuwId = (p) => p + Date.now().toString(36);
    if (e.soort === 'kid') {
      const [kleur, zacht] = KLEUREN.find(([c]) => c === e.kleur) || KLEUREN[0];
      if (e.id) zet((st) => ({ kids: st.kids.map((k) => (k.id === e.id ? { ...k, naam, kleur, zacht, thema: e.thema, groot: e.groot, stil: e.stil } : k)), edit: null }));
      else {
        const id = nieuwId('kid');
        zet((st) => ({ kids: [...st.kids, { id, naam, kleur, zacht, thema: e.thema, groot: e.groot, stil: e.stil }], kindMelden: { ...st.kindMelden, [id]: true }, edit: null }));
      }
    } else if (e.soort === 'klus') {
      const item = { naam, icon: e.icon, waarde: e.waarde, keer: e.keer, per: e.per };
      if (e.id) zet((st) => ({ klusjes: st.klusjes.map((k) => (k.id === e.id ? { ...k, ...item } : k)), edit: null }));
      else zet((st) => ({ klusjes: [...st.klusjes, { id: nieuwId('k'), ...item }], edit: null }));
    } else if (e.soort === 'taak') {
      const item = { naam, icon: e.icon, doel: e.doel, beloning: e.beloning };
      if (e.id) zet((st) => ({ taken: st.taken.map((t) => (t.id === e.id ? { ...t, ...item } : t)), edit: null }));
      else zet((st) => ({ taken: [...st.taken, { id: nieuwId('t'), ...item }], edit: null }));
    } else {
      const item = { naam, icon: e.icon, kosten: e.kosten, duur: e.duur || 0, keer: e.keer, per: e.per, spel: e.spel || '' };
      if (e.id) zet((st) => ({ beloningen: st.beloningen.map((b) => (b.id === e.id ? { ...b, ...item } : b)), edit: null }));
      else zet((st) => ({ beloningen: [...st.beloningen, { id: nieuwId('b'), ...item }], edit: null }));
    }
    melding('Opgeslagen: ' + naam);
  },
  editVerwijder() {
    const e = s.edit;
    if (!e || !e.id) return;
    if (!e.zeker) { zet({ edit: { ...e, zeker: true } }); return; }
    if (e.soort === 'kid') {
      if (DEMO && s.kids.length <= 1) return;
      zet((st) => {
        const kids = st.kids.filter((k) => k.id !== e.id);
        return {
          kids,
          tx: st.tx.filter((t) => t.kid !== e.id),
          timers: st.timers.filter((t) => t.kid !== e.id),
          tabletKid: st.tabletKid === e.id ? (kids[0] || {}).id || null : st.tabletKid,
          ovKid: st.ovKid === e.id ? (kids[0] || {}).id || null : st.ovKid,
          edit: null
        };
      });
    } else if (e.soort === 'klus') zet((st) => ({ klusjes: st.klusjes.filter((k) => k.id !== e.id), edit: null }));
    else if (e.soort === 'taak') zet((st) => ({ taken: st.taken.filter((t) => t.id !== e.id), edit: null }));
    else zet((st) => ({ beloningen: st.beloningen.filter((b) => b.id !== e.id), edit: null }));
    melding('Verwijderd: ' + e.naam);
  },

  async pushToggle() {
    if (DEMO || pushStand === 'bezig' || !pushKan()) return;
    const was = pushStand;
    pushStand = 'bezig';
    render();
    try {
      const reg = await navigator.serviceWorker.ready;
      const oud = await reg.pushManager.getSubscription();
      if (was === 'aan') {
        if (oud) { await api('push_uit', { endpoint: oud.endpoint }); await oud.unsubscribe(); }
        pushStand = 'uit';
        melding('Meldingen staan uit op deze telefoon');
      } else {
        const toestemming = await Notification.requestPermission();
        if (toestemming !== 'granted') {
          pushStand = toestemming === 'denied' ? 'geblokkeerd' : 'uit';
          melding('Geen toestemming voor meldingen');
          return;
        }
        const r = await api('push_sleutel');
        if (!r.ok) throw new Error(r.data.fout || 'Geen verbinding met de server.');
        if (oud) await oud.unsubscribe();
        const abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: sleutelBytes(r.data.sleutel) });
        const j = abo.toJSON();
        const a = await api('push_aan', { endpoint: j.endpoint, keys: j.keys });
        if (!a.ok) { await abo.unsubscribe(); throw new Error(a.data.fout || 'Geen verbinding met de server.'); }
        pushStand = 'aan';
        melding('Meldingen staan aan op deze telefoon');
      }
    } catch (e) {
      pushStand = was;
      melding('Lukt niet: ' + (e.message || 'onbekende fout'));
    } finally {
      if (pushStand === 'bezig') pushStand = was;
      render();
    }
  },
  async pushTest() {
    const r = await api('push_test', {});
    melding(r.ok ? 'Testmelding verstuurd' : r.data.fout || 'Geen verbinding met de server.');
  },

  // Gegevens: exporteren naar een bestand en terugzetten
  exporteer() {
    const d = new Date();
    const datum = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const inhoud = JSON.stringify({ app: 'muntjes', formaat: 1, gemaakt: d.toISOString(), data: dataVan(s) }, null, 2);
    const url = URL.createObjectURL(new Blob([inhoud], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'muntjes-' + datum + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    melding('Bestand opgeslagen: muntjes-' + datum + '.json');
  },
  terugzetOk() {
    if (!terugzet || !magBeheren()) return;
    const data = terugzet.data;
    terugzet = null;
    zet({ ...data, sheet: null, tabletKid: DEMO ? (data.kids[0] || {}).id || null : s.tabletKid });
    melding('Gegevens teruggezet');
  },
  terugzetWeg() { terugzet = null; zet({ sheet: null }); },

  // Inloggen, tablet koppelen en pincode (echte app)
  welkom(d) { zet({ login: { stap: 'pin', doel: d.id, pin: '', fout: '' } }); },
  terug() { zet({ login: { stap: 'kies', pin: '', fout: '' } }); },
  toets(d) {
    const l = s.login;
    if (!l || l.stap !== 'pin' || l.bezig) return;
    if (d.id === 'wis') zet({ login: { ...l, pin: l.pin.slice(0, -1), fout: '' } });
    else if (l.pin.length < 8) zet({ login: { ...l, pin: l.pin + d.id, fout: '' } });
  },
  async pinOk() {
    const l = s.login;
    if (!l || l.stap !== 'pin' || l.bezig) return;
    if (l.pin.length < 4) { zet({ login: { ...l, fout: 'De pincode heeft minstens 4 cijfers.' } }); return; }
    zet({ login: { ...l, bezig: true } });
    const r = await api(l.doel === 'ouder' ? 'inloggen' : 'koppelstart', { pin: l.pin });
    if (!r.ok) { zet({ login: { ...l, pin: '', bezig: false, fout: r.data.fout || 'Geen verbinding met de server.' } }); return; }
    if (l.doel === 'ouder') { s = { ...s, scherm: 'melden' }; await start(); return; }
    const kids = r.data.kids || [];
    zet({ login: { stap: 'kind', kids, pin: '', fout: kids.length ? '' : 'Er zijn nog geen kinderen. Voeg ze eerst toe in de ouder-app (Beheer).' } });
  },
  async koppel(d) {
    const r = await api('koppel', { kid: d.id });
    if (!r.ok) { zet({ login: { ...s.login, fout: r.data.fout || 'Koppelen is niet gelukt.' } }); return; }
    zetToken(r.data.token);
    await start();
  },
  async vergrendel() {
    await api('uitloggen', {});
    rol = null;
    await start();
  },
  async ontkoppel(d) {
    const r = await api('ontkoppel', { id: Number(d.id), soort: d.x || 'tablet' });
    if (r.ok) { melding(d.x === 'widget' ? 'Widget ontkoppeld' : 'Tablet ontkoppeld'); laadBeheer(); }
  },
  gebruikerOpen(d) {
    const g = (s.gebruikers || []).find((x) => String(x.id) === d.id);
    zet({ sheet: { type: 'gebruiker', id: g ? g.id : 0, zeker: false }, gbNaam: g ? g.naam : '', gbRol: g ? g.rol : 'familie', gbPin: '', gbFout: '' });
  },
  gbRol(d) { zet({ gbRol: d.id }); },
  async gebruikerOpslaan() {
    const id = s.sheet.id;
    const r = await api('gebruiker', { id, naam: s.gbNaam || '', rol: s.gbRol, pin: s.gbPin || '' });
    if (!r.ok) { zet({ gbFout: r.data.fout || 'Geen verbinding met de server.' }); return; }
    zet({ sheet: null, gebruikers: r.data.gebruikers, gbPin: '', gbFout: '' });
    melding('Opgeslagen: ' + (s.gbNaam || '').trim());
    if (ik && id === ik.id) start();   // eigen naam of rol is veranderd
  },
  async gebruikerWeg() {
    if (!s.sheet.zeker) { zet({ sheet: { ...s.sheet, zeker: true } }); return; }
    const r = await api('gebruiker_weg', { id: s.sheet.id });
    if (!r.ok) { zet({ gbFout: r.data.fout || 'Geen verbinding met de server.' }); return; }
    const zelf = ik && s.sheet.id === ik.id;
    zet({ sheet: null, gebruikers: r.data.gebruikers });
    melding('Gebruiker verwijderd');
    if (zelf) start();
  },
  pinOpen() { zet({ sheet: { type: 'pin' }, pinOud: '', pinNieuw: '', pinFout: '' }); },
  async pinOpslaan() {
    if (!/^\d{4,8}$/.test(s.pinNieuw || '')) { zet({ pinFout: 'De nieuwe pincode moet uit 4 tot 8 cijfers bestaan.' }); return; }
    const r = await api('pin', { oud: s.pinOud || '', nieuw: s.pinNieuw });
    if (!r.ok) { zet({ pinFout: r.data.fout || 'Geen verbinding met de server.' }); return; }
    zet({ sheet: null, pinOud: '', pinNieuw: '', pinFout: '' });
    melding('Pincode gewijzigd');
  },

  beloning(d) {
    const b = belVan(d.id);
    const kid = s.tabletKid;
    const status = belStatus(kid, b);
    if (status === 'aangevraagd') {
      zet((st) => ({ tx: st.tx.filter((t) => !(t.kid === kid && t.type === 'beloning' && t.ref === b.id && t.status === 'aangevraagd')) }));
      return;
    }
    if (status === 'op' || stats(kid).beschikbaar < b.kosten) return;
    geluid('tik');
    voegToe({ kid, type: 'beloning', ref: b.id, label: b.naam, amount: -b.kosten, status: 'aangevraagd', bron: 'kind' });
  },
  // Spelletje-beloning: openen en (als er een timer bij hoort) de timer starten.
  // Het spel krijgt een sleutel voor deze timer en stopt vanzelf als de tijd om is.
  async spelen(d) {
    const b = belVan(d.id);
    const t = spelTimer(s.tabletKid, b);
    if (!b || !b.spel || (b.duur && !t)) return;
    if (t && t.status === 'wacht') acties.timer({ id: t.id, x: 'start' });
    const url = new URL(b.spel);
    if (t && DEMO) url.searchParams.set('speeltijd', Math.ceil(timerRest(t)));
    if (t && !DEMO) {
      // Venster meteen openen (anders blokkeert de browser het), daarna het adres met de sleutel.
      const w = window.open('about:blank', '_blank');
      const r = await api('speelsleutel', undefined, '&timer=' + encodeURIComponent(t.id));
      if (r.ok) {
        url.searchParams.set('muntjes', location.origin + location.pathname.replace(/[^/]*$/, ''));
        url.searchParams.set('timer', t.id);
        url.searchParams.set('sleutel', r.data.sleutel);
      }
      if (w) { w.opener = null; w.location.href = url.href; } else location.href = url.href;
      return;
    }
    window.open(url.href, '_blank', 'noopener');
  },
  groot() { zet((st) => ({ kids: st.kids.map((k) => (k.id === st.tabletKid ? { ...k, groot: !k.groot } : k)) })); },
  feestWeg() { volgendFeest(); },
  kindScherm(d) { zet({ kindScherm: d.id }); },
  // Kind kiest een taak voor deze week (of haalt hem weg zolang er nog geen ster op staat).
  focusKies(d) {
    const kid = s.tabletKid;
    const ids = focusVan(kid);
    if (ids.includes(d.id)) {
      if (sterTx(kid, d.id).length) return;
      zet((st) => ({ focus: { ...st.focus, [kid]: { week: weekStart(), ids: ids.filter((x) => x !== d.id) } } }));
    } else if (ids.length < (s.maxFocus || 3)) {
      zet((st) => ({ focus: { ...st.focus, [kid]: { week: weekStart(), ids: [...ids, d.id] } } }));
    }
  },
  // Kind meldt dat het een taak gedaan heeft; papa of mama geeft de ster.
  taakMeld(d) {
    const kid = s.tabletKid;
    const taak = taakVan(d.id);
    if (!taak || !s.kindMelden[kid] || !focusVan(kid).includes(taak.id)) return;
    const open = sterTx(kid, taak.id, 'aangevraagd')[0];
    if (open) { zet((st) => ({ tx: st.tx.filter((x) => x.id !== open.id) })); return; }
    if (taakKlaar(kid, taak.id) || sterTx(kid, taak.id, 'goed').length >= taak.doel) return;
    geluid('tik');
    voegToe({ kid, type: 'ster', ref: taak.id, label: taak.naam, amount: 0, status: 'aangevraagd', bron: 'kind' });
  },
  meld(d) {
    const kid = s.tabletKid;
    if (!s.kindMelden[kid]) return;
    const k = klusVan(d.id);
    const t = laatsteMelding(kid, k);
    if (t) {
      // Oranje: melding intrekken. Groen of grijs: gezien, kaart weer neutraal.
      zet((st) => ({ tx: t.status === 'aangevraagd' ? st.tx.filter((x) => x.id !== t.id) : st.tx.map((x) => (x.id === t.id ? { ...x, gezien: true } : x)) }));
      return;
    }
    if (gebruikt(kid, 'klus', k) >= k.keer || stats(kid).week + openMeldingen(kid) + k.waarde > s.maxWeek) return;
    geluid('tik');
    voegToe({ kid, type: 'klus', ref: k.id, label: k.naam, amount: k.waarde, status: 'aangevraagd', bron: 'kind' });
  }
};

// Bestand om terug te zetten: eerst controleren en laten bevestigen.
let terugzet = null;
function leesTerugzet(tekst) {
  let j;
  try { j = JSON.parse(tekst); } catch (e) { return 'Dit is geen Muntjes-bestand.'; }
  const d = j && j.app === 'muntjes' && j.data;
  if (!d || !Array.isArray(d.kids) || !Array.isArray(d.klusjes) || !Array.isArray(d.beloningen) || !Array.isArray(d.tx)) return 'Dit is geen Muntjes-bestand.';
  const basis = startData();
  const data = Object.fromEntries(DATA_KEYS.map((k) => [k, d[k] === undefined ? basis[k] : d[k]]));
  // Namen schoonmaken zoals bij opslaan in Beheer (ze komen onge-escaped in de app).
  const schoon = (lijst) => (Array.isArray(lijst) ? lijst : []).filter((x) => x && typeof x === 'object')
    .map((x) => ({ ...x, naam: String(x.naam ?? '').replace(/[<>&"]/g, '').trim().slice(0, 30) || '?' }));
  ['kids', 'klusjes', 'beloningen', 'taken'].forEach((k) => { data[k] = schoon(data[k]); });
  data.tx = data.tx.filter((t) => t && typeof t === 'object');
  data.nextId = Math.max(Number(data.nextId) || 1, ...data.tx.map((t) => Number(t.id) + 1 || 1));
  terugzet = { data, gemaakt: j.gemaakt };
  return '';
}

function overigInfo() {
  const kind = kidVan(s.ovKid);
  const isMin = s.ovSign < 0;
  const max = isMin ? stats(s.ovKid).beschikbaar : 5;
  const aantal = Math.max(isMin && max === 0 ? 0 : 1, Math.min(s.ovAmt, max));
  const uit = !s.ovReden.trim() || aantal < 1;
  return { kind, isMin, max, aantal, uit };
}

// Regel in Beheer/Account: meldingen aan of uit op deze telefoon.
function pushBlok() {
  if (DEMO) {
    return `<h2 class="sec">Meldingen</h2>
    <div class="lijst"><div class="lrij"><span class="col"><span>Melding als een timer afloopt</span><small>Alleen in de echte app, op je eigen telefoon</small></span></div></div>`;
  }
  const uitleg = {
    aan: 'Aan: ook als de app dicht is',
    uit: 'Uit op deze telefoon',
    bezig: 'Even bezig…',
    geblokkeerd: 'Geblokkeerd: zet meldingen voor deze site aan in de instellingen van je browser',
    ios: 'iPhone: zet de app eerst op je beginscherm (deelknop › Zet op beginscherm) en open hem daar',
    geen: 'Deze browser kan geen meldingen ontvangen'
  }[pushStand || 'bezig'];
  const kan = ['aan', 'uit', 'bezig'].includes(pushStand);
  return `<h2 class="sec">Meldingen</h2>
    <div class="lijst">
      <button type="button" class="lrij" data-a="pushToggle" aria-pressed="${pushStand === 'aan'}" ${kan ? '' : 'disabled'}>
        <span class="col"><span>Melding als een timer afloopt</span><small>${uitleg}</small></span>
        ${kan ? `<span class="switch${pushStand === 'aan' ? ' on' : ''}"><span></span></span>` : ''}
      </button>
      ${pushStand === 'aan' ? '<button type="button" class="lrij" data-a="pushTest"><span class="grow">Testmelding sturen</span></button>' : ''}
    </div>`;
}

// ---------- ouder-app ----------
function renderOuder() {
  const titels = { melden: 'Klusje melden', aanvragen: 'Aanvragen', timers: 'Timers', beheer: magBeheren() ? 'Beheer' : 'Account' };
  const schermen = { melden: schermMelden, aanvragen: schermAanvragen, timers: schermTimers, beheer: schermBeheer };
  const aantalAanvragen = s.tx.filter((t) => t.status === 'aangevraagd').length;
  const navs = [
    ['melden', 'Melden', IC.melden, 0],
    ['aanvragen', 'Aanvragen', IC.inbox, aantalAanvragen],
    ['timers', 'Timers', IC.klok, s.timers.length],
    ['beheer', magBeheren() ? 'Beheer' : 'Account', magBeheren() ? IC.beheer : IC.persoon, 0]
  ];
  return `
    <div class="p-head">
      <div class="p-brand">${coin(28)}<span>Muntjes</span></div>
      <span class="p-rechts">
        <span class="p-title">${DEMO || !ik ? titels[s.scherm] : esc(ik.naam) + ' · ' + titels[s.scherm]}</span>
        ${DEMO ? '' : `<button type="button" class="p-slot" data-a="vergrendel" aria-label="Vergrendelen">${icon(IC.slot, 22, 1.8)}</button>`}
      </span>
    </div>
    <div class="p-body" data-scroll="ouder">${schermen[s.scherm]()}</div>
    <nav class="p-nav" aria-label="Ouder-app">
      ${navs.map(([id, label, ic, n]) => `
        <button type="button" class="navbtn${s.scherm === id ? ' on' : ''}" ${s.scherm === id ? 'aria-current="page"' : ''} data-a="nav" data-id="${id}">
          <span class="navico">${icon(ic, 24, 1.8)}${n ? `<span class="badge">${n}</span>` : ''}</span>
          <span>${label}</span>
        </button>`).join('')}
    </nav>
    ${s.toast ? `<div class="toast" role="status">${coin(22)}<span>${esc(s.toast)}</span></div>` : ''}
    ${sheetKlus()}${sheetTaak()}${sheetOverig()}${sheetBewerk()}${sheetPin()}${sheetGebruiker()}${sheetTerugzet()}`;
}

function schermMelden() {
  if (!s.kids.length) {
    return `<div class="empty">
      <p style="margin:0 0 12px">Welkom! Voeg eerst je kinderen toe. Klusjes en beloningen staan al klaar en kun je aanpassen in Beheer.</p>
      <button type="button" class="btn btn-primary" data-a="nieuw" data-x="kid">+ Kind toevoegen</button>
    </div>`;
  }
  const kaarten = s.kids.map((k) => {
    const st = stats(k.id);
    return `<div class="kcard">
      <div class="kname">${avatar(k)}<b>${k.naam}</b></div>
      <div class="kbal">${valuta(k).icoon(22)}<span class="num">${st.beschikbaar}</span><span>${valuta(k).woord(st.beschikbaar)}</span></div>
      <div class="muted">Deze week ${st.week}/${s.maxWeek} verdiend</div>
    </div>`;
  }).join('');
  const klusjes = s.klusjes.map((k) => `
    <button type="button" class="klus" data-a="klusOpen" data-id="${k.id}">
      <span class="icobox">${icon(k.icon, 26)}</span>
      <span class="kl-naam">${k.naam}</span>
      <span class="plus">+${k.waarde}</span>
      <span class="muted">${perTekst(k)}</span>
    </button>`).join('');
  return `
    <div class="grid2 mb">${kaarten}</div>
    <h2 class="sec">Klusje melden</h2>
    <div class="grid2">
      ${klusjes}
      <button type="button" class="klus overig" data-a="overigOpen">
        <span class="icobox geel">${icon(IC.star, 26)}</span>
        <span class="kl-naam">Overig</span>
        <span class="muted">Eigen reden, + of −</span>
      </button>
    </div>
    ${(s.taken || []).length ? `
    <h2 class="sec sp">Ster geven voor een taak</h2>
    <div class="grid2">${s.taken.map((t) => `
      <button type="button" class="klus" data-a="taakOpen" data-id="${t.id}">
        <span class="icobox geel">${icon(t.icon, 26)}</span>
        <span class="kl-naam">${t.naam}</span>
        <span class="plus">${t.doel} ⭐ = +${t.beloning}</span>
      </button>`).join('')}</div>` : ''}`;
}

function schermAanvragen() {
  const lijst = nieuwsteEerst(s.tx).filter((t) => t.status === 'aangevraagd').reverse();
  const items = lijst.map((t) => {
    const isKlus = t.type === 'klus';
    const isSter = t.type === 'ster';
    const act = isKlus ? klusVan(t.ref) : isSter ? taakVan(t.ref) : belVan(t.ref);
    const kid = kidVan(t.kid);
    const n = Math.abs(t.amount);
    const sub = kid.naam + (isKlus ? ' meldt een klusje' : isSter ? ' meldt een taak' : ' vraagt een beloning') + ' · ' + tijdLabel(t.ts) + (!isKlus && !isSter && act && act.duur ? ' · timer ' + act.duur + ' min' : '');
    return `<div class="req">
      <div class="req-top">
        <span class="icobox wit">${icon(act ? act.icon : IC.star, 26)}</span>
        <div class="grow"><b>${esc(t.label)}</b><div class="muted">${esc(sub)}</div></div>
        <span class="req-amt ${isKlus || isSter ? 'pos' : 'wachtc'}">${isSter ? '+1 ⭐' : (isKlus ? '+' : '−') + n + ' ' + valuta(kid).woord(n)}</span>
      </div>
      <div class="row2">
        <button type="button" class="btn btn-outline" data-a="beslis" data-id="${t.id}" data-x="nee">Afwijzen</button>
        <button type="button" class="btn btn-green" data-a="beslis" data-id="${t.id}" data-x="ja">Goedkeuren</button>
      </div>
    </div>`;
  }).join('');
  return `
    <h2 class="sec">Wacht op goedkeuring</h2>
    <p class="sec-sub">Aanvragen en gemelde klusjes van de kinderen.</p>
    ${lijst.length ? `<div class="stack">${items}</div>` : '<div class="empty">Geen openstaande aanvragen. Vraag op de tablet een beloning aan of meld een klusje om dit te testen.</div>'}`;
}

function schermTimers() {
  const label = (t) => kidVan(t.kid).naam + ' · ' + t.naam;
  const wacht = s.timers.filter((t) => t.status === 'wacht');
  const lopend = s.timers.filter((t) => t.status !== 'wacht');
  const wachtHtml = wacht.map((t) => `
    <div class="tcard">
      <div class="grow"><b>${esc(label(t))}</b><div class="tnum sm">${mmss(timerRest(t))}</div></div>
      <button type="button" class="btn btn-primary" data-a="timer" data-id="${t.id}" data-x="start">Start</button>
    </div>`).join('');
  const lopendHtml = lopend.map((t) => {
    const klaar = timerKlaar(t);
    const pct = t.totaal ? Math.round((timerRest(t) / t.totaal) * 100) : 0;
    const status = klaar ? 'Tijd is om!' : t.status === 'pauze' ? 'Gepauzeerd' : 'Loopt';
    const knoppen = klaar
      ? `<div class="row2">
          <button type="button" class="btn btn-outline" data-a="timer" data-id="${t.id}" data-x="plus">+5 min</button>
          <button type="button" class="btn btn-ink" data-a="timer" data-id="${t.id}" data-x="stop">Afronden</button>
        </div>`
      : `<div class="row3">
          <button type="button" class="btn btn-outline" data-a="timer" data-id="${t.id}" data-x="pauze">${t.status === 'pauze' ? 'Hervat' : 'Pauze'}</button>
          <button type="button" class="btn btn-outline" data-a="timer" data-id="${t.id}" data-x="plus">+5 min</button>
          <button type="button" class="btn btn-stop" data-a="timer" data-id="${t.id}" data-x="stop">Stop</button>
        </div>`;
    return `<div class="tcard col${klaar ? ' done' : ''}">
      <div class="tline"><b>${esc(label(t))}</b><span class="muted">${status}</span></div>
      <div class="tnum">${mmss(timerRest(t))}</div>
      <div class="tbar"><div style="width:${pct}%"></div></div>
      ${knoppen}
    </div>`;
  }).join('');
  return `
    <h2 class="sec">Klaar om te starten</h2>
    ${wacht.length ? `<div class="stack">${wachtHtml}</div>` : '<p class="muted">Na goedkeuring van tablet- of tv-tijd verschijnt hier een timer.</p>'}
    <h2 class="sec sp">Lopende timers</h2>
    ${lopend.length ? `<div class="stack">${lopendHtml}</div>` : '<p class="muted">Er loopt nu geen timer.</p>'}
    ${DEMO ? `<div class="lijst sp">
      <button type="button" class="lrij" data-a="snel" aria-pressed="${s.demoSnel}">
        <span class="col"><span>Demo-snelheid</span><small>1 seconde = 1 minuut</small></span>
        <span class="switch${s.demoSnel ? ' on' : ''}"><span></span></span>
      </button>
    </div>` : ''}`;
}

function schermAccount() {
  return `
    <p class="sec-sub" style="margin:0 0 14px">Je bent ingelogd als <b>${esc(ik ? ik.naam : '')}</b> (familie). Je kunt klusjes melden, muntjes geven en aanvragen goedkeuren. Kaarten en instellingen past papa of mama aan.</p>
    <div class="lijst">
      <button type="button" class="lrij" data-a="pinOpen"><span class="grow">Mijn pincode</span><span class="r">Wijzigen</span>${icon(IC.chev, 18, 2)}</button>
    </div>
    ${pushBlok()}
    <button type="button" class="btn btn-ink vol" data-a="vergrendel">${icon(IC.slot, 18, 2)} Uitloggen</button>`;
}

function schermBeheer() {
  if (!magBeheren()) return schermAccount();
  const rij = (soort, id, links, naam, rechts) => `<button type="button" class="lrij" data-a="bewerk" data-x="${soort}" data-id="${id}">
    ${links}<span class="grow">${naam}</span><span class="r">${rechts}</span>${icon(IC.chev, 18, 2)}
  </button>`;
  const toevoegen = (soort, tekst) => `<button type="button" class="lrij toevoegen" data-a="nieuw" data-x="${soort}">+ ${tekst}</button>`;
  return `
    <p class="sec-sub" style="margin:0 0 14px">Tik op een regel om hem aan te passen of te verwijderen.</p>
    <h2 class="sec">Kinderen</h2>
    <div class="lijst">
      ${s.kids.map((k) => rij('kid', k.id, avatar(k), k.naam, (THEMAS.find(([id]) => id === (k.thema || 'geen')) || THEMAS[0])[1])).join('')}
      ${toevoegen('kid', 'Kind toevoegen')}
    </div>
    <h2 class="sec">Zelf klusjes melden</h2>
    <div class="lijst">
      ${s.kids.map((k) => {
        const aan = !!s.kindMelden[k.id];
        return `<button type="button" class="lrij" data-a="meldToggle" data-id="${k.id}" aria-pressed="${aan}">
          ${avatar(k)}
          <span class="col"><span>${k.naam}</span><small>${aan ? 'Mag zelf klusjes melden' : 'Alleen ouder meldt klusjes'}</small></span>
          <span class="switch${aan ? ' on' : ''}"><span></span></span>
        </button>`;
      }).join('')}
    </div>
    <h2 class="sec">Klusjes</h2>
    <div class="lijst">
      ${s.klusjes.map((k) => rij('klus', k.id, icon(k.icon, 22), k.naam, '+' + k.waarde + ' · ' + k.keer + '×/' + k.per)).join('')}
      ${toevoegen('klus', 'Klusje toevoegen')}
    </div>
    <h2 class="sec">Taken</h2>
    <div class="lijst">
      ${(s.taken || []).map((t) => rij('taak', t.id, icon(t.icon, 22), t.naam, t.doel + ' ⭐ → +' + t.beloning)).join('')}
      ${toevoegen('taak', 'Taak toevoegen')}
    </div>
    <h2 class="sec">Beloningen</h2>
    <div class="lijst">
      ${s.beloningen.map((b) => rij('bel', b.id, icon(b.icon, 22), b.naam, b.kosten + ' ' + munt(b.kosten) + (b.duur ? ' · ' + b.duur + ' min' : '') + (b.spel ? ' · spel' : '') + ' · ' + b.keer + '×/' + b.per)).join('')}
      ${toevoegen('bel', 'Beloning toevoegen')}
    </div>
    <h2 class="sec">Instellingen</h2>
    <div class="lijst">
      <div class="lrij">
        <span class="grow">Max. verdienen per week</span>
        <button type="button" class="stepbtn sm" aria-label="Minder" data-a="maxWeek" data-x="-">−</button>
        <span class="stepnum sm" aria-live="polite">${s.maxWeek}</span>
        <button type="button" class="stepbtn sm" aria-label="Meer" data-a="maxWeek" data-x="+">+</button>
      </div>
      <div class="lrij">
        <span class="grow">Max. taken per week kiezen</span>
        <button type="button" class="stepbtn sm" aria-label="Minder" data-a="maxFocus" data-x="-">−</button>
        <span class="stepnum sm" aria-live="polite">${s.maxFocus || 3}</span>
        <button type="button" class="stepbtn sm" aria-label="Meer" data-a="maxFocus" data-x="+">+</button>
      </div>
      ${DEMO
        ? '<div class="lrij"><span class="grow">Pincode</span><span class="r">Alleen in de echte app</span></div>'
        : `<button type="button" class="lrij" data-a="pinOpen"><span class="grow">Mijn pincode</span><span class="r">Wijzigen</span>${icon(IC.chev, 18, 2)}</button>`}
    </div>
    ${pushBlok()}
    <h2 class="sec">Gegevens</h2>
    <div class="lijst">
      <button type="button" class="lrij" data-a="exporteer"><span class="col"><span>Exporteren</span><small>Alle kinderen, kaarten, taken en geschiedenis als bestand (zonder pincodes)</small></span>${icon(IC.chev, 18, 2)}</button>
      <label class="lrij" style="cursor:pointer"><span class="col"><span>Terugzetten uit een bestand</span><small>Vervangt alles wat nu in de app staat</small></span>${icon(IC.chev, 18, 2)}
        <input type="file" accept="application/json,.json" data-bestand="terugzet" hidden></label>
    </div>
    ${DEMO ? '' : `
    <h2 class="sec">Gebruikers</h2>
    <p class="sec-sub">Iedereen logt in met een eigen pincode. Ouders mogen alles; familie mag klusjes melden, muntjes geven en aanvragen goedkeuren.</p>
    <div class="lijst">
      ${(s.gebruikers || []).map((g) => `<button type="button" class="lrij" data-a="gebruikerOpen" data-id="${g.id}">
        ${icon(IC.persoon, 22)}<span class="grow">${esc(g.naam)}${ik && g.id === ik.id ? ' (jij)' : ''}</span><span class="r">${g.rol === 'ouder' ? 'Ouder' : 'Familie'}</span>${icon(IC.chev, 18, 2)}
      </button>`).join('')}
      <button type="button" class="lrij toevoegen" data-a="gebruikerOpen" data-id="0">+ Gebruiker toevoegen</button>
    </div>
    <h2 class="sec">Gekoppelde tablets en widgets</h2>
    <div class="lijst">
      ${(s.apparaten || []).length
        ? s.apparaten.map((a) => {
          const k = kidVan(a.kid);
          return `<div class="lrij">
            ${k ? avatar(k) : ''}
            <span class="col"><span>${a.soort === 'widget' ? 'Widget' : 'Tablet'} · ${k ? k.naam : 'verwijderd kind'}</span><small>Gekoppeld ${tijdLabel(a.aangemaakt * 1000)}${a.laatst ? ' · laatst gezien ' + tijdLabel(a.laatst * 1000) : ''}</small></span>
            <button type="button" class="btn btn-outline klein" data-a="ontkoppel" data-id="${a.id}" data-x="${a.soort || 'tablet'}">Ontkoppelen</button>
          </div>`;
        }).join('')
        : '<div class="lrij"><span class="r">Nog geen tablets. Open muntjes.darkesttimes.nl op de tablet en kies "Tablet van een kind".</span></div>'}
      <a class="lrij" href="https://github.com/Darker19/muntjes-app/releases/latest/download/muntjes-widget.apk" style="color:var(--accent);font-weight:800;text-decoration:none">${icon(IC.tablet, 22)}<span class="col"><span>Widget-app downloaden (Android)</span><small>Saldo op het beginscherm van de tablet. Koppelen met jouw pincode.</small></span></a>
    </div>
    <button type="button" class="btn btn-ink vol" data-a="vergrendel">${icon(IC.slot, 18, 2)} Vergrendelen</button>`}`;
}

function sheetBewerk() {
  const e = s.edit;
  if (!e) return '';
  const titels = { kid: ['Kind toevoegen', 'Kind aanpassen'], klus: ['Klusje toevoegen', 'Klusje aanpassen'], bel: ['Beloning toevoegen', 'Beloning aanpassen'], taak: ['Taak toevoegen', 'Taak aanpassen'] };
  let velden = '';
  if (e.soort === 'kid') {
    velden = `<div class="lbl">Kleur</div>
      <div class="kleuren">${KLEUREN.map(([c], i) => `<button type="button" class="kleur${e.kleur === c ? ' on' : ''}" style="background:${c}" aria-label="Kleur ${i + 1}" aria-pressed="${e.kleur === c}" data-a="editVeld" data-x="kleur" data-id="${c}"></button>`).join('')}</div>
      <div class="lbl">Thema in de kind-app</div>
      <div class="themas">${THEMAS.map(([id, label]) => `<button type="button" class="thema-knop${e.thema === id ? ' on' : ''}" aria-pressed="${e.thema === id}" data-a="editVeld" data-x="thema" data-id="${id}">
        ${MASCOTTE[id] ? MASCOTTE[id](48) : `<span class="thema-leeg">${coin(32)}</span>`}<span>${label}</span>
      </button>`).join('')}</div>
      <button type="button" class="lrij" data-a="editVeld" data-x="groot" aria-pressed="${!!e.groot}">
        <span class="col"><span>Grote plaatjes</span><small>Voor kinderen die nog niet lezen: grote symbolen op de kaarten</small></span>
        <span class="switch${e.groot ? ' on' : ''}"><span></span></span>
      </button>
      <button type="button" class="lrij" data-a="editVeld" data-x="stil" aria-pressed="${!e.stil}">
        <span class="col"><span>Geluidjes op de tablet</span><small>Bij muntjes, sterren, confetti en tikken</small></span>
        <span class="switch${e.stil ? '' : ' on'}"><span></span></span>
      </button>`;
  } else if (e.soort === 'taak') {
    const stap = (veld, label, eenheid) => `<div class="stepper">
        <span class="lbl grow">${label}</span>
        <button type="button" class="stepbtn" aria-label="Minder" data-a="editVeld" data-x="${veld}" data-id="-">−</button>
        <span class="stepnum" aria-live="polite">${e[veld]}</span>
        <button type="button" class="stepbtn" aria-label="Meer" data-a="editVeld" data-x="${veld}" data-id="+">+</button>
        <span class="muted">${eenheid}</span>
      </div>`;
    velden = `<div class="lbl">Plaatje</div>
      <div class="iconen">${ICOON_KEUZE.map((k) => `<button type="button" class="ikoon${e.icon === k ? ' on' : ''}" aria-label="Plaatje ${k}" aria-pressed="${e.icon === k}" data-a="editVeld" data-x="icon" data-id="${k}">${icon(k, 24)}</button>`).join('')}</div>
      ${stap('doel', 'Sterren nodig per week', e.doel === 1 ? 'ster' : 'sterren')}
      ${stap('beloning', 'Beloning bij voltooien', munt(e.beloning))}
      <p class="muted" style="margin:0">Elke keer dat het kind de taak doet, krijgt het een ster. Zijn alle sterren binnen in één week, dan krijgt het de beloning. Het kind kiest zelf welke taken het die week doet.</p>`;
  } else {
    const isKlus = e.soort === 'klus';
    const veld = isKlus ? 'waarde' : 'kosten';
    velden = `<div class="lbl">Plaatje</div>
      <div class="iconen">${ICOON_KEUZE.map((k) => `<button type="button" class="ikoon${e.icon === k ? ' on' : ''}" aria-label="Plaatje ${k}" aria-pressed="${e.icon === k}" data-a="editVeld" data-x="icon" data-id="${k}">${icon(k, 24)}</button>`).join('')}</div>
      <div class="stepper">
        <span class="lbl grow">${isKlus ? 'Levert op' : 'Kost'}</span>
        <button type="button" class="stepbtn" aria-label="Minder" data-a="editVeld" data-x="${veld}" data-id="-">−</button>
        <span class="stepnum" aria-live="polite">${e[veld]}</span>
        <button type="button" class="stepbtn" aria-label="Meer" data-a="editVeld" data-x="${veld}" data-id="+">+</button>
        <span class="muted">${munt(e[veld])}</span>
      </div>
      <div class="lbl">${isKlus ? 'Hoe vaak mag het' : 'Hoe vaak te gebruiken'}</div>
      <div class="pills wrap">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<button type="button" class="pill keer${e.keer === n ? ' on' : ''}" aria-pressed="${e.keer === n}" data-a="editVeld" data-x="keer" data-id="${n}">${n}×</button>`).join('')}</div>
      <div class="grid2" style="gap:8px">
        <button type="button" class="seg${e.per === 'dag' ? ' on' : ''}" aria-pressed="${e.per === 'dag'}" data-a="editVeld" data-x="per" data-id="dag">Per dag</button>
        <button type="button" class="seg${e.per === 'week' ? ' on' : ''}" aria-pressed="${e.per === 'week'}" data-a="editVeld" data-x="per" data-id="week">Per week</button>
      </div>
      ${isKlus ? '' : `<div class="lbl">Timer na goedkeuring</div>
        <div class="pills wrap">${DUREN.map((m) => `<button type="button" class="pill${(e.duur || 0) === m ? ' on' : ''}" aria-pressed="${(e.duur || 0) === m}" data-a="editVeld" data-x="duur" data-id="${m}">${m ? m + ' min' : 'Geen'}</button>`).join('')}</div>
        <div class="lbl">Opent spelletje</div>
        <div class="pills wrap">${SPELLEN.map(([url, label]) => `<button type="button" class="pill${(e.spel || '') === url ? ' on' : ''}" aria-pressed="${(e.spel || '') === url}" data-a="editVeld" data-x="spel" data-id="${url}">${label}</button>`).join('')}</div>
        ${e.spel ? `<p class="muted" style="margin:0">Na goedkeuring staat er "Speel nu" op de kaart. Tikt het kind erop, dan opent het spelletje${e.duur ? ' en start de timer van ' + e.duur + ' minuten' : ''}.</p>` : ''}`}`;
  }
  const kanWeg = e.id && !(DEMO && e.soort === 'kid' && s.kids.length <= 1);
  const waarschuwing = e.soort === 'kid'
    ? 'Hiermee verdwijnen ook alle muntjes en de geschiedenis van ' + esc(e.naam) + '. Tik nog een keer op Verwijderen.'
    : 'Weet je het zeker? Tik nog een keer op Verwijderen. De geschiedenis blijft bewaard.';
  return `<div class="sheet-wrap">
    <button type="button" class="sheet-bg" data-a="editSluit" aria-label="Sluiten"></button>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-ed">
      <div class="sh-title" id="sh-ed">${titels[e.soort][e.id ? 1 : 0]}</div>
      <label class="lbl" for="ed-naam">Naam</label>
      <input class="inp" id="ed-naam" data-input="edit.naam" value="${esc(e.naam)}" maxlength="30" autocomplete="off" placeholder="${e.soort === 'kid' ? 'Naam van het kind' : e.soort === 'klus' ? 'Bijv. Planten water geven' : 'Bijv. Samen een spelletje'}">
      ${velden}
      ${e.zeker ? `<div class="warn">${waarschuwing}</div>` : ''}
      <div class="flex">
        ${kanWeg ? '<button type="button" class="btn btn-stop" data-a="editVerwijder">Verwijderen</button>' : ''}
        <button type="button" class="btn btn-soft" data-a="editSluit">Annuleren</button>
        <button type="button" class="btn wide btn-primary" data-a="editOpslaan" ${(e.naam || '').trim() ? '' : 'disabled'}>Opslaan</button>
      </div>
    </div>
  </div>`;
}

function sheetGebruiker() {
  if (!s.sheet || s.sheet.type !== 'gebruiker') return '';
  const g = s.sheet;
  const nieuw = !g.id;
  return `<div class="sheet-wrap">
    <button type="button" class="sheet-bg" data-a="sluit" aria-label="Sluiten"></button>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-gb">
      <div class="sh-title" id="sh-gb">${nieuw ? 'Gebruiker toevoegen' : 'Gebruiker aanpassen'}</div>
      <label class="lbl" for="gb-naam">Naam</label>
      <input class="inp" id="gb-naam" data-input="gbNaam" value="${esc(s.gbNaam || '')}" maxlength="30" autocomplete="off" placeholder="Bijv. Oma">
      <div class="lbl">Wat mag deze persoon?</div>
      <div class="grid2" style="gap:8px">
        <button type="button" class="seg${s.gbRol === 'ouder' ? ' on' : ''}" aria-pressed="${s.gbRol === 'ouder'}" data-a="gbRol" data-id="ouder">Ouder</button>
        <button type="button" class="seg${s.gbRol === 'familie' ? ' on' : ''}" aria-pressed="${s.gbRol === 'familie'}" data-a="gbRol" data-id="familie">Familie</button>
      </div>
      <p class="muted" style="margin:0">${s.gbRol === 'ouder' ? 'Mag alles: ook kaarten, kinderen, instellingen, gebruikers en tablets.' : 'Mag klusjes melden, muntjes geven met een berichtje, aanvragen goedkeuren en timers bedienen. Geen muntjes afhalen of iets aanpassen in Beheer.'}</p>
      <label class="lbl" for="gb-pin">${nieuw ? 'Pincode (4 tot 8 cijfers)' : 'Nieuwe pincode (leeg laten = niet wijzigen)'}</label>
      <input class="inp" id="gb-pin" type="password" inputmode="numeric" autocomplete="new-password" data-input="gbPin" value="${esc(s.gbPin || '')}">
      ${g.zeker ? `<div class="warn">Weet je het zeker? ${esc(s.gbNaam || '')} kan daarna niet meer inloggen. Tik nog een keer op Verwijderen.</div>` : ''}
      ${s.gbFout ? `<div class="warn" role="alert">${esc(s.gbFout)}</div>` : ''}
      <div class="flex">
        ${nieuw ? '' : '<button type="button" class="btn btn-stop" data-a="gebruikerWeg">Verwijderen</button>'}
        <button type="button" class="btn btn-soft" data-a="sluit">Annuleren</button>
        <button type="button" class="btn wide btn-primary" data-a="gebruikerOpslaan">Opslaan</button>
      </div>
    </div>
  </div>`;
}

function sheetTerugzet() {
  if (!s.sheet || s.sheet.type !== 'terugzet' || !terugzet) return '';
  const d = terugzet.data;
  const w = terugzet.gemaakt ? new Date(terugzet.gemaakt) : null;
  const wanneer = w && !isNaN(w) ? w.getDate() + '-' + (w.getMonth() + 1) + '-' + w.getFullYear() + ' ' + pad(w.getHours()) + ':' + pad(w.getMinutes()) : 'onbekende datum';
  const tablets = !DEMO && s.kids.some((k) => !d.kids.some((n) => n.id === k.id)) ? '<p class="muted" style="margin:0">Een tablet van een kind dat niet in het bestand staat, moet je daarna opnieuw koppelen.</p>' : '';
  return `<div class="sheet-wrap">
    <button type="button" class="sheet-bg" data-a="terugzetWeg" aria-label="Sluiten"></button>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-tz">
      <div class="sh-title" id="sh-tz">Gegevens terugzetten?</div>
      <p style="margin:0">Bestand van ${wanneer}: <b>${d.kids.length} ${d.kids.length === 1 ? 'kind' : 'kinderen'}</b> (${esc(d.kids.map((k) => k.naam).join(', '))}),
        ${d.klusjes.length} klusjes, ${d.beloningen.length} beloningen en ${d.tx.length} regels geschiedenis.</p>
      <div class="warn">Dit vervangt <b>alles</b> wat nu in de app staat, ook op de tablets. Exporteer eerst de huidige gegevens als je die wilt bewaren.</div>
      ${tablets}
      <div class="flex">
        <button type="button" class="btn btn-soft" data-a="terugzetWeg">Annuleren</button>
        <button type="button" class="btn wide btn-red" data-a="terugzetOk">Ja, terugzetten</button>
      </div>
    </div>
  </div>`;
}

function sheetPin() {
  if (!s.sheet || s.sheet.type !== 'pin') return '';
  return `<div class="sheet-wrap">
    <button type="button" class="sheet-bg" data-a="sluit" aria-label="Sluiten"></button>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-pin">
      <div class="sh-title" id="sh-pin">Pincode wijzigen</div>
      <label class="lbl" for="pin-oud">Huidige pincode</label>
      <input class="inp" id="pin-oud" type="password" inputmode="numeric" autocomplete="current-password" data-input="pinOud" value="${esc(s.pinOud || '')}">
      <label class="lbl" for="pin-nieuw">Nieuwe pincode (4 tot 8 cijfers)</label>
      <input class="inp" id="pin-nieuw" type="password" inputmode="numeric" autocomplete="new-password" data-input="pinNieuw" value="${esc(s.pinNieuw || '')}">
      ${s.pinFout ? `<div class="warn" role="alert">${esc(s.pinFout)}</div>` : ''}
      <div class="flex">
        <button type="button" class="btn btn-soft" data-a="sluit">Annuleren</button>
        <button type="button" class="btn wide btn-primary" data-a="pinOpslaan">Opslaan</button>
      </div>
    </div>
  </div>`;
}

// Startscherm van de echte app: ouder inloggen of een tablet aan een kind koppelen.
function renderWelkom() {
  const l = s.login || { stap: 'kies', pin: '', fout: '' };
  let inhoud;
  if (!geladen) {
    inhoud = '<p class="w-sub">Even laden…</p>';
  } else if (l.stap === 'kies') {
    inhoud = `
      <p class="w-sub">Wie gebruikt dit apparaat?</p>
      <button type="button" class="w-keuze" data-a="welkom" data-id="ouder">
        <span class="icobox">${icon(IC.slot, 26, 1.8)}</span>
        <span class="col"><b>Inloggen</b><small>Papa, mama, opa, oma… met je eigen pincode</small></span>
      </button>
      <button type="button" class="w-keuze" data-a="welkom" data-id="koppel">
        <span class="icobox geel">${icon(IC.tablet, 26, 1.8)}</span>
        <span class="col"><b>Tablet van een kind</b><small>Eenmalig koppelen met de pincode</small></span>
      </button>`;
  } else if (l.stap === 'pin') {
    const stippen = Array.from({ length: Math.max(4, l.pin.length) }, (_, i) => `<i class="${i < l.pin.length ? 'vol' : ''}"></i>`).join('');
    const toetsen = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'wis', '0', 'ok'].map((k) => {
      if (k === 'ok') return `<button type="button" class="pk ok" data-a="pinOk" ${l.bezig ? 'disabled' : ''}>OK</button>`;
      if (k === 'wis') return '<button type="button" class="pk" data-a="toets" data-id="wis" aria-label="Wissen">⌫</button>';
      return `<button type="button" class="pk" data-a="toets" data-id="${k}">${k}</button>`;
    }).join('');
    inhoud = `
      <p class="w-sub">${l.doel === 'ouder' ? 'Vul je eigen pincode in' : 'Pincode van papa of mama'}</p>
      <div class="pin-stip" role="status" aria-label="${l.pin.length} cijfers ingevuld">${stippen}</div>
      <div class="pinpad">${toetsen}</div>
      <button type="button" class="btn btn-soft" data-a="terug">Terug</button>`;
  } else {
    inhoud = `
      <p class="w-sub">Van wie is deze tablet?</p>
      <div class="stack">${(l.kids || []).map((k) => `
        <button type="button" class="kidpick" style="border-color:${k.kleur};background:${k.zacht}" data-a="koppel" data-id="${esc(k.id)}">
          ${avatar(k, 40)}<span class="col"><b>${esc(k.naam)}</b></span>
        </button>`).join('')}</div>
      <button type="button" class="btn btn-soft" data-a="terug">Terug</button>`;
  }
  return `<div class="welkom">
    <div class="w-logo">${coin(56)}<h1>Muntjes</h1></div>
    ${inhoud}
    ${l.fout ? `<p class="warn" role="alert">${esc(l.fout)}</p>` : ''}
  </div>`;
}

function sheetKlus() {
  if (!s.sheet || s.sheet.type !== 'klus') return '';
  const k = klusVan(s.sheet.id);
  const kids = s.kids.map((kid) => {
    const st = stats(kid.id);
    const n = gebruikt(kid.id, 'klus', k);
    const klaar = n >= k.keer;
    const vol = klaar || st.week + k.waarde > s.maxWeek;
    const nu = periodeNu(k.per);
    const sub = klaar ? (k.keer === 1 ? 'Al gedaan ' + nu : nu[0].toUpperCase() + nu.slice(1) + ' al ' + n + '× gedaan') : vol ? 'Weeklimiet bereikt' : nu[0].toUpperCase() + nu.slice(1) + ' ' + n + ' van ' + k.keer + '×';
    return `<button type="button" class="kidpick" style="border-color:${vol ? 'var(--line)' : kid.kleur};background:${vol ? 'var(--soft)' : kid.zacht}" data-a="klusKies" data-id="${kid.id}" ${vol ? 'disabled' : ''}>
      ${avatar(kid, 36)}
      <span class="col"><b>${kid.naam}</b><small>${sub}</small></span>
    </button>`;
  }).join('');
  return `<div class="sheet-wrap">
    <button type="button" class="sheet-bg" data-a="sluit" aria-label="Sluiten"></button>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-klus">
      <div class="sh-head">
        <span class="icobox" style="width:48px;height:48px;border-radius:14px">${icon(k.icon, 28)}</span>
        <div><div class="sh-title" id="sh-klus">${k.naam}</div><div class="plus" style="font-size:13px">+${k.waarde} · ${perTekst(k)}</div></div>
      </div>
      <div class="lbl">Voor wie?</div>
      <div class="grid2">${kids}</div>
      <label class="lbl" for="bericht">Berichtje (optioneel)</label>
      <input class="inp" id="bericht" data-input="bericht" value="${esc(s.bericht)}" placeholder="Super geholpen!" autocomplete="off">
      <button type="button" class="btn btn-soft" data-a="sluit">Annuleren</button>
    </div>
  </div>`;
}

function sheetTaak() {
  if (!s.sheet || s.sheet.type !== 'taak') return '';
  const taak = taakVan(s.sheet.id);
  if (!taak) return '';
  const kids = s.kids.map((kid) => {
    const n = sterTx(kid.id, taak.id, 'goed').length;
    const klaar = taakKlaar(kid.id, taak.id) || n >= taak.doel;
    const gekozen = focusVan(kid.id).includes(taak.id);
    const sub = klaar ? 'Voltooid deze week' : n + ' van ' + taak.doel + ' sterren' + (gekozen ? '' : ' · niet gekozen');
    return `<button type="button" class="kidpick" style="border-color:${klaar ? 'var(--line)' : kid.kleur};background:${klaar ? 'var(--soft)' : kid.zacht}" data-a="taakKies" data-id="${kid.id}" ${klaar ? 'disabled' : ''}>
      ${avatar(kid, 36)}
      <span class="col"><b>${kid.naam}</b><small>${sub}</small></span>
    </button>`;
  }).join('');
  return `<div class="sheet-wrap">
    <button type="button" class="sheet-bg" data-a="sluit" aria-label="Sluiten"></button>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-taak">
      <div class="sh-head">
        <span class="icobox geel" style="width:48px;height:48px;border-radius:14px">${icon(taak.icon, 28)}</span>
        <div><div class="sh-title" id="sh-taak">${taak.naam}</div><div class="plus" style="font-size:13px">${taak.doel} sterren = +${taak.beloning}</div></div>
      </div>
      <div class="lbl">Wie krijgt een ster?</div>
      <div class="grid2">${kids}</div>
      <label class="lbl" for="bericht">Berichtje (optioneel)</label>
      <input class="inp" id="bericht" data-input="bericht" value="${esc(s.bericht)}" placeholder="Goed bezig!" autocomplete="off">
      <button type="button" class="btn btn-soft" data-a="sluit">Annuleren</button>
    </div>
  </div>`;
}

function sheetOverig() {
  if (!s.sheet || s.sheet.type !== 'overig') return '';
  const o = overigInfo();
  const cta = o.isMin ? (s.ovZeker ? 'Ja, afhalen' : '−' + o.aantal + ' van ' + o.kind.naam) : '+' + o.aantal + ' voor ' + o.kind.naam;
  const toonWaarschuwing = o.isMin && (s.ovZeker || o.max === 0);
  const waarschuwing = o.max === 0
    ? o.kind.naam + ' heeft geen vrije ' + valuta(o.kind).veel + '. Het saldo kan niet onder 0.'
    : 'Weet je het zeker? Dit haalt ' + o.aantal + ' ' + munt(o.aantal) + ' af bij ' + o.kind.naam + '.';
  return `<div class="sheet-wrap">
    <button type="button" class="sheet-bg" data-a="sluit" aria-label="Sluiten"></button>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-ov">
      <div class="sh-title" id="sh-ov">Overig</div>
      <div class="pills">
        ${s.kids.map((k) => {
          const aan = k.id === s.ovKid;
          return `<button type="button" class="pill" style="${aan ? `background:${k.kleur};border-color:${k.kleur};color:#fff` : ''}" aria-pressed="${aan}" data-a="ovKid" data-id="${k.id}">${k.naam}</button>`;
        }).join('')}
      </div>
      <div class="grid2" style="gap:8px">
        <button type="button" class="seg${o.isMin ? '' : ' plus-on'}" aria-pressed="${!o.isMin}" data-a="ovPlus">+ Bijschrijven</button>
        ${magBeheren() ? `<button type="button" class="seg${o.isMin ? ' min-on' : ''}" aria-pressed="${o.isMin}" data-a="ovMin">− Afhalen</button>` : ''}
      </div>
      <div class="stepper">
        <span class="lbl grow">Aantal muntjes</span>
        ${o.isMin ? `<span class="muted">max. ${o.max}</span>` : ''}
        <button type="button" class="stepbtn" aria-label="Minder" data-a="ovMinder">−</button>
        <span class="stepnum" aria-live="polite">${o.aantal}</span>
        <button type="button" class="stepbtn" aria-label="Meer" data-a="ovMeer">+</button>
      </div>
      <label class="lbl" for="reden">Reden</label>
      <input class="inp" id="reden" data-input="ovReden" value="${esc(s.ovReden)}" placeholder="${o.isMin ? 'Bijv. afspraak niet nagekomen' : 'Bijv. lief voor broertje geweest'}" autocomplete="off">
      ${toonWaarschuwing ? `<div class="warn">${esc(waarschuwing)}</div>` : ''}
      <div class="flex">
        <button type="button" class="btn btn-soft" data-a="sluit">Annuleren</button>
        <button type="button" class="btn wide ${o.isMin ? 'btn-red' : 'btn-green'}" data-a="ovBevestig" ${o.uit ? 'disabled' : ''}>${esc(cta)}</button>
      </div>
    </div>
  </div>`;
}

// ---------- kind-app ----------
const STATUS_BEL = {
  vrij: { chip: '', voet: 'Tik om aan te vragen' },
  aangevraagd: { chip: 'Wacht op goedkeuring', voet: 'Tik om te annuleren' },
  goed: { chip: 'Goedgekeurd', voet: 'Tik om nog een keer te vragen' },
  op: { chip: 'Goedgekeurd', voet: '' },
  afgewezen: { chip: 'Niet deze keer', voet: 'Tik om opnieuw te vragen' }
};
const STATUS_MELD = { aangevraagd: 'Gemeld', goed: 'Goedgekeurd!', afgewezen: 'Niet goedgekeurd' };
// Een symbool bij elke status, zodat ook een kind dat nog niet leest het snapt.
const CHIP_ICOON = { aangevraagd: IC.klok, goed: IC.vink, op: IC.vink, afgewezen: IC.kruis };

function renderKind() {
  const kind = kidVan(s.tabletKid);
  if (!kind) return '';
  const st = stats(kind.id);
  const v = valuta(kind);
  const thema = MASCOTTE[kind.thema] ? kind.thema : 'geen';
  $('#kind').className = 'tablet thema-' + thema + (kind.groot ? ' groot' : '');
  $('#kind').style.background = thema === 'geen' ? kind.zacht : '';

  const vakjes = Array.from({ length: s.maxWeek }, (_, i) => (i < st.week ? `<span class="wk-vol">${v.icoon(24)}</span>` : '<i></i>')).join('');

  const log = nieuwsteEerst(s.tx.filter((t) => t.kid === kind.id)).map((t) => {
    const act = t.type === 'klus' ? klusVan(t.ref) : t.type === 'beloning' ? belVan(t.ref) : t.type === 'ster' || t.type === 'taakklaar' ? taakVan(t.ref) : null;
    const ic = act ? act.icon : t.amount < 0 ? IC.minus : IC.star;
    const rood = t.type === 'overig' && t.amount < 0;
    const rij = rood ? ' rood' : t.status === 'aangevraagd' ? ' wacht' : t.status === 'afgewezen' ? ' af' : '';
    const kleur = t.status === 'aangevraagd' ? 'wachtc' : t.status === 'afgewezen' ? 'afc' : t.amount < 0 ? 'neg' : 'pos';
    const door = (t.bron === 'kind' ? (t.type === 'beloning' ? 'zelf aangevraagd' : 'zelf gemeld') : 'door ' + (t.door || 'papa'))
      + (t.beslistDoor && t.status !== 'aangevraagd' ? (t.status === 'goed' ? ', goedgekeurd door ' : ', afgewezen door ') + t.beslistDoor : '');
    const status = t.status === 'aangevraagd' ? (t.amount < 0 ? 'gereserveerd' : 'wacht op goedkeuring') : t.status === 'afgewezen' ? (t.amount < 0 ? 'afgewezen, terug' : 'niet goedgekeurd') : '';
    return `<div class="lrow${rij}">
      <span class="lico">${plaatje(ic, thema, 24)}</span>
      <div class="ltxt">
        <b>${esc(t.label)}</b>
        <span class="muted">${door} · ${tijdLabel(t.ts)}</span>
        ${t.msg ? `<q>${esc(t.msg)}</q>` : ''}
      </div>
      <div class="lamt"><span class="n ${kleur}">${t.type === 'ster' ? '+1' + ster(20, t.status !== 'afgewezen') : (t.amount > 0 ? '+' : '−') + Math.abs(t.amount)}</span><span class="muted">${status}</span></div>
    </div>`;
  }).join('');

  const beloningen = s.beloningen.map((b) => {
    const status = belStatus(kind.id, b);
    const info = STATUS_BEL[status];
    const spelT = spelTimer(kind.id, b);
    const speelbaar = b.spel && (status === 'goed' || status === 'op') && (!b.duur || spelT);
    if (speelbaar) {
      return `<button type="button" class="rcard s-goed speel" data-a="spelen" data-id="${b.id}">
        <span class="rtop">
          <span class="ricon">${plaatje(b.icon, thema, 38, 1.5)}</span>
          <span class="chip c-goed">${icon(IC.vink, 14, 3)}Goedgekeurd</span>
        </span>
        <span class="rnaam">${b.naam}</span>
        ${b.duur ? `<span class="badges"><span class="duur">${icon(IC.klok, 18, 2)}${b.duur} minuten</span></span>` : ''}
        <span class="speel-knop">${icon(IC.speel, 30, 0)}${spelT && spelT.status !== 'wacht' ? 'Verder spelen' : 'Speel nu'}</span>
      </button>`;
    }
    const tekort = status !== 'aangevraagd' && status !== 'op' && st.beschikbaar < b.kosten;
    const nodig = b.kosten - st.beschikbaar;
    const n = gebruikt(kind.id, 'beloning', b);
    const nog = b.keer - n;
    const keerTekst = n > 0 && nog > 0 ? 'nog ' + nog + '× ' + periodeNu(b.per) : perTekst(b);
    const voet = b.spel && b.duur && (status === 'goed' || status === 'op') ? 'Speeltijd is om' : status === 'op' ? (b.per === 'dag' ? 'Vandaag op, morgen weer' : 'Deze week op') : info.voet;
    return `<button type="button" class="rcard s-${status}${tekort ? ' dim' : ''}" data-a="beloning" data-id="${b.id}">
      <span class="rtop">
        <span class="ricon">${plaatje(b.icon, thema, 38, 1.5)}</span>
        ${info.chip ? `<span class="chip c-${status}">${icon(CHIP_ICOON[status], 14, 3)}${info.chip}</span>` : ''}
      </span>
      <span class="rnaam">${b.naam}</span>
      <span class="badges">
        ${b.spel ? `<span class="duur">${icon(IC.game, 18, 2)}Spelletje</span>` : ''}
        ${b.duur ? `<span class="duur">${icon(IC.klok, 18, 2)}${b.duur} minuten</span>` : ''}
        <span class="duur">${icon(IC.herhaal, 18, 2)}${keerTekst}</span>
      </span>
      <span class="coins" role="img" aria-label="${b.kosten} ${v.woord(b.kosten)}">${v.icoon(28).repeat(b.kosten)}</span>
      <span class="voet">${tekort ? 'Nog ' + nodig + ' ' + v.woord(nodig) + ' nodig' : voet}</span>
    </button>`;
  }).join('');

  const takenScherm = s.kindScherm === 'taken';
  const sterren = sterrenDezeWeek(kind.id);
  const focus = focusVan(kind.id);
  let rechts = '';
  if (takenScherm) {
    const maxF = s.maxFocus || 3;
    const mijn = focus.map((id) => {
      const taak = taakVan(id);
      const n = sterTx(kind.id, id, 'goed').length;
      const open = sterTx(kind.id, id, 'aangevraagd').length;
      const klaar = taakKlaar(kind.id, id) || n >= taak.doel;
      const rij = Array.from({ length: taak.doel }, (_, i) => (i < n ? ster(30) : i < n + open ? `<span class="ster-wacht">${ster(30, false)}</span>` : ster(30, false))).join('');
      const tekst = klaar ? 'Voltooid! +' + taak.beloning + ' ' + v.woord(taak.beloning)
        : open ? 'Gemeld, papa of mama kijkt ernaar'
        : s.kindMelden[kind.id] ? 'Gedaan? Tik hier!' : 'Papa of mama geeft je een ster';
      return `<button type="button" class="tkaart${klaar ? ' s-goed' : open ? ' s-aangevraagd' : ''}" data-a="taakMeld" data-id="${id}">
        <span class="rtop"><span class="ricon">${plaatje(taak.icon, thema, 34, 1.5)}</span>${klaar ? '<span class="chip c-goed">Voltooid</span>' : open ? '<span class="chip c-aangevraagd">Gemeld</span>' : ''}</span>
        <span class="rnaam">${taak.naam}</span>
        <span class="sterrij" role="img" aria-label="${n} van ${taak.doel} sterren">${rij}</span>
        <span class="voet">${tekst}</span>
      </button>`;
    }).join('');
    const kiezen = (s.taken || []).map((taak) => {
      const gekozen = focus.includes(taak.id);
      const vast = gekozen && sterTx(kind.id, taak.id).length > 0;
      const vol = !gekozen && focus.length >= maxF;
      return `<button type="button" class="mcard${gekozen ? ' gekozen' : ''}${vol ? ' dim' : ''}" data-a="focusKies" data-id="${taak.id}" aria-pressed="${gekozen}">
        <span class="ricon">${plaatje(taak.icon, thema, 30, 1.5)}</span>
        <span class="mnaam">${taak.naam}</span>
        <span class="chip ${gekozen ? 'c-goed' : 'c-vrij'}">${gekozen ? (vast ? 'Bezig' : 'Gekozen ✓') : taak.doel + ' ⭐ = +' + taak.beloning}</span>
      </button>`;
    }).join('');
    rechts = `
      <div class="rhead"><h2 class="big">Mijn taken deze week</h2><span class="leg">${ster(18)} ${sterren} ${sterren === 1 ? 'ster' : 'sterren'} deze week</span></div>
      ${focus.length ? `<div class="tgrid">${mijn}</div>` : '<div class="empty">Kies hieronder welke taken je deze week gaat doen!</div>'}
      <h2 class="big">Kies je taken voor deze week</h2>
      <p class="info" style="margin-top:-8px">Je mag er ${maxF} kiezen. ${focus.length ? 'Je hebt er ' + focus.length + ' gekozen.' : ''}</p>
      <div class="mgrid">${kiezen}</div>
      <p class="info">Elke keer dat je een taak doet, krijg je een ster. Heb je alle sterren van een taak, dan krijg je ${v.veel}!</p>`;
  }

  let melden = '';
  if (!takenScherm && s.kindMelden[kind.id]) {
    const ruimte = s.maxWeek - st.week - openMeldingen(kind.id);
    melden = `<h2 class="big">Klusje gedaan? Meld het!</h2>
      <div class="mgrid">${s.klusjes.map((k) => {
        const t = laatsteMelding(kind.id, k);
        const status = t ? t.status : 'vrij';
        const klaar = status === 'vrij' && gebruikt(kind.id, 'klus', k) >= k.keer;
        const vol = status === 'vrij' && !klaar && k.waarde > ruimte;
        const chip = status !== 'vrij'
          ? `<span class="chip c-${status}">${icon(CHIP_ICOON[status], 14, 3)}${STATUS_MELD[status]}</span>`
          : klaar
            ? `<span class="chip c-vol">${k.per === 'dag' ? 'Vandaag gedaan' : 'Deze week gedaan'}</span>`
            : `<span class="chip ${vol ? 'c-vol' : 'c-vrij'}">${vol ? 'Weeklimiet bereikt' : '+' + k.waarde + ' ' + v.woord(k.waarde)}</span>`;
        return `<button type="button" class="mcard s-${status}${vol || klaar ? ' dim' : ''}" data-a="meld" data-id="${k.id}">
          <span class="ricon">${plaatje(k.icon, thema, 30, 1.5)}</span>
          <span class="mnaam">${k.naam}</span>
          ${chip}
          <span class="muted">${perTekst(k)}</span>
        </button>`;
      }).join('')}</div>`;
  }

  return `
    <div class="t-head">
      ${avatar(kind, 52)}
      ${thema !== 'geen' ? `<span class="t-mascotte">${MASCOTTE[thema](64)}</span>` : ''}
      <span class="hoi">Hoi ${kind.naam}!</span>
      ${(s.taken || []).length ? `<button type="button" class="taken-knop${takenScherm ? ' on' : ''}" data-a="kindScherm" data-id="${takenScherm ? 'beloningen' : 'taken'}">${takenScherm ? '← Beloningen' : ster(24) + ' Taken'}</button>` : ''}
      <span class="grow"></span>
      <span class="wk-lbl">Deze week verdiend</span>
      <span class="wk" role="img" aria-label="${st.week} van ${s.maxWeek}">${vakjes}</span>
      <span class="wk-num">${st.week}/${s.maxWeek}</span>
    </div>
    <div class="t-grid">
      <div class="t-left">
        <div class="saldo">
          ${thema !== 'geen' ? `<span class="saldo-deco">${MASCOTTE[thema](130)}</span>` : ''}
          <span class="lbl">${v.titel}</span>
          <div class="saldo-row">${v.icoon(72)}<span class="saldo-num">${saldoTonen(kind.id, st.beschikbaar)}</span>
            ${(s.taken || []).length ? `<span class="sterren-tel" role="img" aria-label="${sterren} sterren deze week">${ster(44)}<b>${sterren}</b></span>` : ''}</div>
          ${st.gereserveerd > 0
            ? `<span class="res">${st.saldo} ${v.woord(st.saldo)}, waarvan ${st.gereserveerd} gereserveerd</span>`
            : '<span class="vrij">Allemaal vrij te besteden</span>'}
        </div>
        <div class="log">
          <h2>${v.vandaan}</h2>
          <div class="log-list" data-scroll="log">${log}</div>
        </div>
      </div>
      <div class="t-right" data-scroll="kind">
        ${takenScherm ? rechts : `
        <div class="rhead">
          <h2 class="big">Beloningen</h2>
          <span class="leg"><i style="background:#fff;border-color:#AEB6C1"></i>Beschikbaar</span>
          <span class="leg"><i style="background:#FFE2C2;border-color:var(--orange-bd)"></i>Wacht</span>
          <span class="leg"><i style="background:#D6EFDF;border-color:var(--green-bd)"></i>Goedgekeurd</span>
          <span class="leg"><i style="background:#E3E6EA;border-color:var(--grey-bd)"></i>Niet deze keer</span>
        </div>
        <div class="rgrid">${beloningen}</div>
        ${melden}
        <p class="info">Op elke kaart zie je hoe vaak je hem mag gebruiken. Je verdient maximaal ${s.maxWeek} ${v.veel} per week.</p>`}
      </div>
    </div>
    ${s.toast && weergave === 'kind' ? `<div class="toast kind-toast" role="status"><span>${esc(s.toast)}</span></div>` : ''}`;
}

// ---------- feestje: confetti als er iets verdiend is ----------
// Per tablet onthouden welke goedgekeurde klusjes, sterren en voltooide taken al gevierd zijn.
const GEVIERD = 'muntjes-gevierd';
let gevierd = null;
let feestRij = [];
let feestTimer = null;
let zoekTimer = null;

function zoekFeest() {
  const kind = kidVan(s.tabletKid);
  if (!kind) return;
  if (!gevierd) {
    try { gevierd = JSON.parse(localStorage.getItem(GEVIERD) || '{}') || {}; } catch (e) { gevierd = {}; }
  }
  const sleutel = (t) => t.id + ':' + t.ts;
  const verdiend = s.tx.filter((t) => t.kid === kind.id && t.status === 'goed' && ((t.type === 'klus' && t.amount > 0) || t.type === 'ster' || t.type === 'taakklaar'));
  const eerste = !gevierd[kind.id];
  const al = new Set(gevierd[kind.id] || []);
  let nieuw = eerste ? [] : verdiend.filter((t) => !al.has(sleutel(t)));
  if (!eerste && !nieuw.length) return;
  // Alleen bijhouden wat er nog is, zodat de lijst niet blijft groeien.
  gevierd[kind.id] = verdiend.map(sleutel);
  try { localStorage.setItem(GEVIERD, JSON.stringify(gevierd)); } catch (e) { /* negeren */ }
  // Maakt de laatste ster de taak af? Dan alleen het grote feest van de voltooide taak.
  const klaar = new Set(nieuw.filter((t) => t.type === 'taakklaar').map((t) => t.ref));
  nieuw = nieuw.filter((t) => !(t.type === 'ster' && klaar.has(t.ref)));
  if (!nieuw.length) return;
  feestRij.push(...nieuw.sort((a, b) => a.ts - b.ts).map((t) => ({ t, kind })));
  if (!feestTimer && $('#feest').hidden) volgendFeest();
}

function volgendFeest() {
  clearTimeout(feestTimer);
  feestTimer = null;
  const el = $('#feest');
  const volgende = feestRij.shift();
  if (!volgende) { el.hidden = true; el.innerHTML = ''; return; }
  const { t, kind } = volgende;
  const v = valuta(kind);
  const taak = t.type === 'taakklaar';
  const isSter = t.type === 'ster';
  const act = taak || isSter ? taakVan(t.ref) : klusVan(t.ref);
  const n = isSter && act ? Math.min(act.doel, sterTx(kind.id, act.id, 'goed').length) : 0;
  const beloond = isSter && act
    ? `<span class="sterrij">${Array.from({ length: act.doel }, (_, i) => ster(40, i < n)).join('')}</span><b class="feest-ster">${n}/${act.doel}</b>`
    : `${v.icoon(52).repeat(Math.min(5, Math.max(1, t.amount)))}<b>+${t.amount} ${v.woord(t.amount)}</b>`;
  const thema = MASCOTTE[kind.thema] ? kind.thema : 'geen';
  el.innerHTML = `<canvas class="confetti" aria-hidden="true"></canvas>
    <button type="button" class="feest-kaart" data-a="feestWeg" aria-label="Sluiten">
      <span class="feest-beeld">${isSter ? ster(110) : thema !== 'geen' ? MASCOTTE[thema](120) : coin(110)}</span>
      <span class="feest-titel" style="color:${{ eenhoorn: '#7C3AED', dino: '#3F6212' }[thema] || kind.kleur}">Hoera, ${esc(kind.naam)}!</span>
      <span class="feest-tekst">${taak ? 'Je hebt een taak voltooid!' : isSter ? 'Je hebt een ster verdiend!' : 'Je hebt een klusje geklaard!'}</span>
      <span class="feest-wat">${act ? `<span class="ricon">${plaatje(act.icon, thema, 34, 1.5)}</span>` : ''}${esc(taak ? (act ? act.naam : t.label) : t.label)}</span>
      <span class="feest-munt">${beloond}</span>
    </button>`;
  el.hidden = false;
  confetti(el.querySelector('canvas'), thema, isSter);
  geluid(isSter ? 'ster' : 'feest');
  feestTimer = setTimeout(volgendFeest, 5000);
}

// Gewone confetti, of (bij een ster) een regen van gouden sterretjes.
function confetti(canvas, thema, sterren) {
  const kleuren = sterren ? ['#FBBF24', '#FCD34D', '#F59E0B', '#FDE68A', '#FFF3B0'] : { eenhoorn: ['#F9A8D4', '#C4B5FD', '#93C5FD', '#FCD34D', '#F472B6'], dino: ['#84CC16', '#FB923C', '#FCD34D', '#65A30D', '#C2410C'], geen: ['#F2B705', '#2457C5', '#22784A', '#E8892B', '#B0306A'] }[thema];
  const rust = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const r = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = r.width * dpr;
  canvas.height = r.height * dpr;
  const c = canvas.getContext('2d');
  c.scale(dpr, dpr);
  const n = rust ? 40 : 180;
  // Twee kanonnen linksonder en rechtsonder die naar het midden schieten.
  const stukjes = Array.from({ length: n }, (_, i) => {
    const links = i % 2 === 0;
    const hoek = (links ? -60 : -120) + (Math.random() - 0.5) * 50;
    const snel = (rust ? 6 : 11) + Math.random() * 9;
    return {
      x: links ? 0 : r.width, y: r.height * 0.85,
      vx: Math.cos(hoek * Math.PI / 180) * snel, vy: Math.sin(hoek * Math.PI / 180) * snel,
      w: sterren ? 10 + Math.random() * 12 : 7 + Math.random() * 7, h: 4 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      kleur: kleuren[i % kleuren.length], rond: Math.random() < 0.3
    };
  });
  const begin = performance.now();
  (function stap(nu) {
    if (!canvas.isConnected) return;
    const tijd = nu - begin;
    c.clearRect(0, 0, r.width, r.height);
    c.globalAlpha = Math.max(0, Math.min(1, (4200 - tijd) / 800));
    stukjes.forEach((p) => {
      p.vy += 0.28;
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.kleur;
      if (sterren) {
        c.beginPath();
        for (let i = 0; i < 10; i++) {
          const straal = i % 2 ? p.w / 4.4 : p.w / 2;
          const hoek = (i * Math.PI) / 5 - Math.PI / 2;
          c.lineTo(Math.cos(hoek) * straal, Math.sin(hoek) * straal);
        }
        c.closePath();
        c.fill();
        c.strokeStyle = '#B45309';
        c.lineWidth = 1;
        c.stroke();
      } else if (p.rond) { c.beginPath(); c.arc(0, 0, p.h / 1.4, 0, 7); c.fill(); }
      else c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
      c.restore();
    });
    if (tijd < 4200) requestAnimationFrame(stap);
  })(begin);
}

// ---------- saldo: tellen en vliegende muntjes ----------
// Verandert het saldo op de tablet, dan telt het getal mee en vliegen er muntjes:
// erbij verdiend (van boven), aangevraagd (naar de kaart) of afgewezen ("terug", van de kaart).
let saldoBasis = null;
let saldoAnim = null;

function saldoTonen(kid, echt) {
  // Nog niet aan het tellen: het oude getal laten staan tot saldoCheck (vlak na het tekenen) begint.
  if (!saldoAnim || saldoAnim.kid !== kid) return saldoBasis && saldoBasis.kid === kid ? saldoBasis.waarde : echt;
  const t = Math.max(0, Math.min(1, (performance.now() - saldoAnim.t0) / saldoAnim.duur));
  if (t >= 1) { saldoAnim = null; return echt; }
  const e = 1 - Math.pow(1 - t, 3);
  return Math.round(saldoAnim.van + (saldoAnim.naar - saldoAnim.van) * e);
}

function tel(kid, van, naar, vertraging = 0) {
  saldoAnim = { kid, van, naar, t0: performance.now() + vertraging, duur: Math.min(1600, 500 + 150 * Math.abs(naar - van)) };
  (function stap() {
    if (!saldoAnim) return;
    const el = document.querySelector('#kind .saldo-num');
    if (el) el.textContent = saldoTonen(kid, naar);
    if (saldoAnim) requestAnimationFrame(stap);
  })();
}

function saldoCheck() {
  const kind = kidVan(s.tabletKid);
  if (!kind) return;
  const st = stats(kind.id);
  const bel = (status) => s.tx.filter((t) => t.kid === kind.id && t.type === 'beloning' && t.status === status);
  const oud = saldoBasis;
  saldoBasis = { kid: kind.id, waarde: st.beschikbaar, afgewezen: new Set(bel('afgewezen').map((t) => t.id)), open: new Map(bel('aangevraagd').map((t) => [t.id, t.ref])) };
  if (!oud || oud.kid !== kind.id || oud.waarde === st.beschikbaar) return;
  const verschil = st.beschikbaar - oud.waarde;
  const getoond = saldoAnim && saldoAnim.kid === kind.id ? saldoTonen(kind.id, oud.waarde) : oud.waarde;
  const terug = bel('afgewezen').filter((t) => !oud.afgewezen.has(t.id));
  const nieuwOpen = bel('aangevraagd').filter((t) => !oud.open.has(t.id));
  const geannuleerd = [...oud.open].filter(([id]) => !s.tx.some((t) => t.id === id));
  const n = Math.min(6, Math.abs(verschil));
  if (verschil > 0 && geannuleerd.length && !terug.length) {
    vlieg(kind, n, kaartVan(geannuleerd[0][1]), 'saldo', 'tik');
  } else if (verschil > 0 && terug.length) {
    vlieg(kind, n, kaartVan(terug[0].ref), 'saldo', 'terug');
    bubbel(kind, '+' + verschil + ' ' + valuta(kind).woord(verschil) + ' terug!');
  } else if (verschil > 0) {
    vlieg(kind, n, 'boven', 'saldo', 'munt');
  } else if (nieuwOpen.length) {
    vlieg(kind, n, 'saldo', kaartVan(nieuwOpen[0].ref), null);
  }
  tel(kind.id, getoond, st.beschikbaar, verschil > 0 ? 350 : 0);
}

const kaartVan = (ref) => document.querySelector(`#kind [data-a=beloning][data-id="${ref}"], #kind [data-a=spelen][data-id="${ref}"]`);

// Laag over de tablet voor vliegende muntjes (buiten #kind, zodat tekenen ze niet weghaalt).
function vliegLaag() {
  let laag = document.querySelector('.vlieg-laag');
  if (!laag) {
    laag = document.createElement('div');
    laag.className = 'vlieg-laag';
    $('.tablet-wrap').appendChild(laag);
  }
  return laag;
}

function punt(waar, laag) {
  const l = laag.getBoundingClientRect();
  if (waar === 'boven') return { x: l.width / 2, y: 40 };
  const el = waar === 'saldo' ? document.querySelector('#kind .saldo-row svg') : waar;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left - l.left + r.width / 2, y: r.top - l.top + r.height / 2 };
}

function vlieg(kind, n, van, naar, klank) {
  if (!n || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { if (klank) geluid(klank); return; }
  const laag = vliegLaag();
  const a = punt(van, laag);
  const b = punt(naar, laag);
  if (!a || !b) { if (klank) geluid(klank); return; }
  if (klank === 'terug') geluid('terug');
  for (let i = 0; i < n; i++) {
    const m = document.createElement('span');
    m.className = 'vlieg-munt';
    m.innerHTML = valuta(kind).icoon(40);
    laag.appendChild(m);
    const dx = (Math.random() - 0.5) * 60;
    const hoog = Math.min(a.y, b.y) - 90 - Math.random() * 60;
    const anim = m.animate([
      { transform: `translate(${a.x - 20}px, ${a.y - 20}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${a.x - 20 + dx}px, ${a.y - 20}px) scale(1)`, opacity: 1, offset: 0.12 },
      { transform: `translate(${(a.x + b.x) / 2 - 20 + dx}px, ${hoog}px) scale(1.15)`, offset: 0.55 },
      { transform: `translate(${b.x - 20}px, ${b.y - 20}px) scale(.7)`, opacity: 1 }
    ], { duration: 750, delay: i * 110, easing: 'ease-in-out', fill: 'both' });
    anim.onfinish = () => {
      m.remove();
      if (klank === 'munt' || (klank === 'terug' && i === n - 1)) geluid('munt');
      const doel = naar === 'saldo' ? document.querySelector('#kind .saldo-row svg') : null;
      if (doel) doel.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
    };
  }
}

function bubbel(kind, tekst) {
  const laag = vliegLaag();
  const p = punt('saldo', laag);
  if (!p) return;
  const b = document.createElement('span');
  b.className = 'saldo-bubbel';
  b.textContent = tekst;
  b.style.left = p.x + 'px';
  b.style.top = p.y - 70 + 'px';
  laag.appendChild(b);
  b.animate([{ transform: 'translate(-50%, 10px) scale(.7)', opacity: 0 }, { transform: 'translate(-50%, 0) scale(1)', opacity: 1, offset: 0.15 },
    { transform: 'translate(-50%, -6px)', opacity: 1, offset: 0.8 }, { transform: 'translate(-50%, -30px)', opacity: 0 }], { duration: 2600, easing: 'ease-out', fill: 'both' })
    .onfinish = () => b.remove();
}

// ---------- demo-balk ----------
function renderBar() {
  const opties = [['beide', 'Beide'], ['ouder', 'Ouder-app'], ['kind', 'Kind-app']];
  const tabletKeuze = weergave === 'ouder' ? '' : `
    <div class="bar-group" role="group" aria-label="Tablet van">
      <span class="bar-lbl">Tablet van</span>
      ${s.kids.map((k) => {
        const aan = s.tabletKid === k.id;
        return `<button type="button" class="seg-btn" style="${aan ? `background:${k.kleur};border-color:${k.kleur};color:#fff` : ''}" aria-pressed="${aan}" data-a="tablet" data-id="${k.id}">${k.naam}</button>`;
      }).join('')}
      ${kidVan(s.tabletKid) ? `<button type="button" class="seg-btn${kidVan(s.tabletKid).groot ? ' on' : ''}" aria-pressed="${!!kidVan(s.tabletKid).groot}" data-a="groot">Grote plaatjes</button>` : ''}
    </div>`;
  return `
    <div class="bar-title">${coin(26)}<span>Muntjes-app</span><span class="tag">preview</span></div>
    <div class="bar-group" role="group" aria-label="Weergave">
      ${opties.map(([id, label]) => `<button type="button" class="seg-btn${weergave === id ? ' on' : ''}" aria-pressed="${weergave === id}" data-a="view" data-id="${id}">${label}</button>`).join('')}
    </div>
    ${tabletKeuze}
    <button type="button" class="bar-reset" data-a="reset">Demo resetten</button>`;
}

// ---------- tekenen ----------
function focusSleutel() {
  const a = document.activeElement;
  if (!a || a === document.body) return null;
  if (a.id && a.tagName === 'INPUT') return { sel: '#' + a.id, st: a.selectionStart, en: a.selectionEnd };
  if (a.dataset && a.dataset.a) {
    const sel = ['a', 'id', 'x'].filter((k) => a.dataset[k]).map((k) => `[data-${k}="${a.dataset[k]}"]`).join('');
    return { sel };
  }
  return null;
}

function render() {
  const focus = focusSleutel();
  const scrolls = [...document.querySelectorAll('[data-scroll]')].map((el) => [el.dataset.scroll, el.scrollTop]);

  if (!DEMO) weergave = rol === 'kind' ? 'kind' : 'ouder';
  document.body.classList.toggle('bare', weergave !== 'beide');
  document.body.classList.toggle('echt', !DEMO);
  $('#bar').hidden = !DEMO;
  $('#bar').innerHTML = DEMO ? renderBar() : '';
  $('#col-ouder').hidden = weergave === 'kind';
  $('#col-kind').hidden = weergave === 'ouder';
  $('#ouder').innerHTML = weergave === 'kind' ? '' : !DEMO && !volwassene() ? renderWelkom() : renderOuder();
  $('#kind').innerHTML = weergave === 'ouder' ? '' : renderKind();
  // Even wachten: een ster en de voltooide taak komen vlak na elkaar binnen.
  if (weergave !== 'ouder' && (DEMO || rol === 'kind')) { clearTimeout(zoekTimer); zoekTimer = setTimeout(() => { zoekFeest(); saldoCheck(); }, 60); }
  document.documentElement.style.setProperty('--barh', $('#bar').offsetHeight + 'px');

  scrolls.forEach(([k, top]) => { const el = document.querySelector(`[data-scroll="${k}"]`); if (el) el.scrollTop = top; });
  if (focus) {
    const el = document.querySelector(focus.sel);
    if (el) {
      el.focus({ preventScroll: true });
      if (focus.st != null) { try { el.setSelectionRange(focus.st, focus.en); } catch (e) { /* negeren */ } }
    }
  }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const actie = acties[el.dataset.a];
  if (actie) actie(el.dataset);
});

document.addEventListener('input', (e) => {
  const veld = e.target.dataset && e.target.dataset.input;
  if (!veld) return;
  if (veld === 'edit.naam') {
    s = { ...s, edit: { ...s.edit, naam: e.target.value, zeker: false } };
    render();
    return;
  }
  s = { ...s, [veld]: e.target.value, ovZeker: veld === 'ovReden' ? false : s.ovZeker };
  bewaar();
  if (veld === 'ovReden') render();
});

document.addEventListener('change', async (e) => {
  if (!e.target.dataset || e.target.dataset.bestand !== 'terugzet' || !e.target.files[0]) return;
  const fout = leesTerugzet(await e.target.files[0].text());
  e.target.value = '';
  if (fout) { melding(fout); return; }
  zet({ sheet: { type: 'terugzet' } });
});

document.addEventListener('keydown', (e) => {
  if (!DEMO && !rol && s.login && s.login.stap === 'pin') {
    if (/^\d$/.test(e.key)) acties.toets({ id: e.key });
    else if (e.key === 'Backspace') acties.toets({ id: 'wis' });
    else if (e.key === 'Enter') acties.pinOk();
    return;
  }
  if (e.key !== 'Escape') return;
  if (s.edit) acties.editSluit();
  else if (s.sheet) acties.sluit();
});

// Andere tab met dezelfde preview open? Dan meelopen.
window.addEventListener('storage', (e) => {
  if (DEMO && e.key === OPSLAG) { s = laad(); render(); }
});
window.addEventListener('resize', () => {
  document.documentElement.style.setProperty('--barh', $('#bar').offsetHeight + 'px');
});

// Elke seconde: lopende timers bijwerken en piepen (alleen bij de ouder) als de tijd om is.
const gepiept = new Set();
setInterval(() => {
  const lopend = s.timers.filter((t) => t.status === 'loopt');
  if (!lopend.length || (!DEMO && !volwassene())) return;
  lopend.forEach((t) => {
    const sleutel = t.id + ':' + t.eind;
    if (timerKlaar(t) && !gepiept.has(sleutel)) {
      gepiept.add(sleutel);
      piep();
      melding('Tijd is om: ' + ((kidVan(t.kid) || {}).naam || '') + ' · ' + t.naam);
    }
  });
  render();
}, 1000);

if (!DEMO) {
  start();
  // Wijzigingen van het andere apparaat ophalen (alleen als de app in beeld is).
  setInterval(() => { if (document.visibilityState === 'visible') haal(); }, 4000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') haal(); });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.scherm && volwassene()) zet({ scherm: e.data.scherm, sheet: null });
    });
  }
}

render();
