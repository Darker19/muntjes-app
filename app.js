'use strict';

// Muntjes-app preview: ouder-app + kind-app met gedeelde gegevens.
// Alles draait in de browser; de demo-stand wordt in localStorage bewaard.

const IC = {
  plate: 'M4 3v18M2 3v5a2 2 0 0 0 4 0V3M10 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
  table: 'M3 9h18M5 9v11M19 9v11M3 13h18M9 5h6',
  bed: 'M3 19V6M3 14h18v5M21 14v-1a3 3 0 0 0-3-3h-7v4M5.5 11.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
  tooth: 'M7.5 3C5 3 4 5 4 7c0 3 1.5 4 2 7s1 7 2.5 7 1.5-5 3.5-5 2 5 3.5 5 2-4 2.5-7 2-4 2-7c0-2-1-4-3.5-4-1.5 0-2.5 1-4.5 1S9 3 7.5 3z',
  shirt: 'M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z',
  blocks: 'M4 13h7v7H4zM13 13h7v7h-7zM8.5 4h7v7h-7z',
  bag: 'M5 8h14l-1 13H6L5 8zM9 8V6a3 3 0 0 1 6 0v2',
  paw: 'M12 13c-3 0-5 3-5 5.5 0 1.5 1.5 2 2.5 1.5s1.5-1 2.5-1 1.5.5 2.5 1 2.5 0 2.5-1.5c0-2.5-2-5.5-5-5.5zM3.5 10a1.5 2 0 1 0 3 0a1.5 2 0 1 0-3 0M7.5 5.5a1.5 2 0 1 0 3 0a1.5 2 0 1 0-3 0M13.5 5.5a1.5 2 0 1 0 3 0a1.5 2 0 1 0-3 0M17.5 10a1.5 2 0 1 0 3 0a1.5 2 0 1 0-3 0',
  tablet: 'M6 2h12a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
  tv: 'M3 7h18v12H3zM8 3l4 4 4-4',
  book: 'M12 6C10 4.5 7 4 3 4v15c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2zM12 6v15',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  ice: 'M8 10a4 4 0 1 1 8 0M7 10h10l-5 11z',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  minus: 'M5 12h14M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0',
  melden: 'M12 8v8M8 12h8M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0',
  inbox: 'M3 13h5l1.5 3h5l1.5-3h5M5 5h14l2 8v6H3v-6z',
  klok: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v5l3 2',
  beheer: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4'
};

const KIDS = [
  { id: 'noor', naam: 'Noor', kleur: '#7A4FD0', zacht: '#F1ECFB' },
  { id: 'daan', naam: 'Daan', kleur: '#0F7C74', zacht: '#E4F3F1' }
];
const KLUSJES = [
  { id: 'k1', naam: 'Tafel dekken', icon: IC.plate, waarde: 1 },
  { id: 'k2', naam: 'Tafel afruimen', icon: IC.table, waarde: 1 },
  { id: 'k3', naam: 'Kamer opruimen', icon: IC.bed, waarde: 1 },
  { id: 'k4', naam: 'Tanden poetsen zonder zeuren', icon: IC.tooth, waarde: 1 },
  { id: 'k5', naam: 'Aankleden', icon: IC.shirt, waarde: 1 },
  { id: 'k6', naam: 'Speelgoed opruimen', icon: IC.blocks, waarde: 1 },
  { id: 'k7', naam: 'Helpen met boodschappen', icon: IC.bag, waarde: 1 },
  { id: 'k8', naam: 'Huisdier voeren', icon: IC.paw, waarde: 1 }
];
const BELONINGEN = [
  { id: 'b1', naam: '15 min tablet', icon: IC.tablet, kosten: 2, duur: 15 },
  { id: 'b2', naam: '15 min tv', icon: IC.tv, kosten: 2, duur: 15 },
  { id: 'b3', naam: 'Extra voorleesverhaal', icon: IC.book, kosten: 1 },
  { id: 'b4', naam: 'Later naar bed', icon: IC.moon, kosten: 3 },
  { id: 'b5', naam: 'Toetje kiezen', icon: IC.ice, kosten: 1 }
];
const MAX_WEEK = 7;
const OPSLAG = 'muntjes-preview-v1';
const UUR = 3600e3;
const DAG = 24 * UUR;
const DAGEN = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

// ---------- hulpjes ----------
const $ = (sel) => document.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const munt = (n) => (n === 1 ? 'muntje' : 'muntjes');
const pad = (n) => String(n).padStart(2, '0');
const mmss = (sec) => { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + pad(sec % 60); };
const kidVan = (id) => KIDS.find((k) => k.id === id);
const klusVan = (id) => KLUSJES.find((k) => k.id === id);
const belVan = (id) => BELONINGEN.find((b) => b.id === id);
const icon = (d, size = 24, sw = 1.6) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const coin = (size = 24) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#F2B705" stroke="#B07F00" stroke-width="1.5"/><circle cx="12" cy="12" r="6" fill="none" stroke="#B07F00" stroke-width="1.5"/></svg>`;
const avatar = (k, size = 28) => `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px;background:${k.kleur}" aria-hidden="true">${k.naam[0]}</span>`;

function weekStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
}
const dezeWeek = (t) => t.ts >= weekStart();

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
    v: 1,
    tx: [
      t(14, 'daan', 'klus', 'k3', 'Kamer opruimen', 1, 'aangevraagd', 'kind', 0.2 * UUR),
      t(1, 'noor', 'klus', 'k1', 'Tafel dekken', 1, 'goed', 'ouder', 0.5 * UUR),
      t(8, 'daan', 'beloning', 'b2', '15 min tv', -2, 'aangevraagd', 'kind', 1 * UUR),
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
      t(13, 'daan', 'klus', 'k1', 'Tafel dekken', 1, 'goed', 'ouder', 9 * DAG)
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

function laad() {
  try {
    const raw = localStorage.getItem(OPSLAG);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.v === 1) return { ...beginState(), ...d, toast: null, sheet: null };
    }
  } catch (e) { /* geen opslag beschikbaar: begin opnieuw */ }
  return beginState();
}

function bewaar() {
  try { localStorage.setItem(OPSLAG, JSON.stringify({ ...s, toast: null, sheet: null })); } catch (e) { /* negeren */ }
}

let s = laad();
let weergave = ['ouder', 'kind'].includes(new URLSearchParams(location.search).get('view')) ? new URLSearchParams(location.search).get('view') : 'beide';
let toastTimer = null;

function zet(patch) {
  s = { ...s, ...(typeof patch === 'function' ? patch(s) : patch) };
  bewaar();
  render();
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

function belStatus(kid, b) {
  const mijn = nieuwsteEerst(s.tx.filter((t) => t.kid === kid && t.type === 'beloning' && t.ref === b.id && dezeWeek(t)));
  if (mijn.some((t) => t.status === 'aangevraagd')) return 'aangevraagd';
  if (mijn.some((t) => t.status === 'goed')) return 'goed';
  if (mijn[0] && mijn[0].status === 'afgewezen') return 'afgewezen';
  return 'vrij';
}

const laatsteMelding = (kid, k) => nieuwsteEerst(s.tx).find((t) => t.kid === kid && t.type === 'klus' && t.ref === k.id && t.bron === 'kind' && !t.gezien);

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
    s = beginState();
    bewaar();
    melding('Demo is teruggezet');
  },
  tablet(d) { zet({ tabletKid: d.id }); },
  nav(d) { zet({ scherm: d.id, sheet: null }); },
  sluit() { zet({ sheet: null, bericht: '', ovZeker: false }); },

  klusOpen(d) { zet({ sheet: { type: 'klus', id: d.id }, bericht: '' }); },
  klusKies(d) {
    const klus = s.sheet && klusVan(s.sheet.id);
    const kid = kidVan(d.id);
    if (!klus || stats(kid.id).week + klus.waarde > MAX_WEEK) return;
    voegToe({ kid: kid.id, type: 'klus', ref: klus.id, label: klus.naam, amount: klus.waarde, status: 'goed', bron: 'ouder', msg: s.bericht.trim() });
    zet({ sheet: null, bericht: '' });
    melding('+' + klus.waarde + ' voor ' + kid.naam + ' · ' + klus.naam);
  },

  overigOpen() { zet({ sheet: { type: 'overig' }, ovSign: 1, ovAmt: 1, ovReden: '', ovZeker: false }); },
  ovKid(d) { zet({ ovKid: d.id, ovAmt: 1, ovZeker: false }); },
  ovPlus() { zet({ ovSign: 1, ovZeker: false }); },
  ovMin() { zet({ ovSign: -1, ovAmt: 1, ovZeker: false }); },
  ovMinder() { const o = overigInfo(); zet({ ovAmt: Math.max(1, o.aantal - 1), ovZeker: false }); },
  ovMeer() { const o = overigInfo(); zet({ ovAmt: Math.min(o.max, o.aantal + 1), ovZeker: false }); },
  ovBevestig() {
    const o = overigInfo();
    if (o.uit) return;
    if (o.isMin && !s.ovZeker) { zet({ ovZeker: true }); return; }
    const reden = s.ovReden.trim();
    voegToe({ kid: s.ovKid, type: 'overig', ref: null, label: reden, amount: s.ovSign * o.aantal, status: 'goed', bron: 'ouder' });
    zet({ sheet: null, ovReden: '', ovAmt: 1, ovZeker: false });
    melding((o.isMin ? '−' + o.aantal + ' van ' : '+' + o.aantal + ' voor ') + o.kind.naam + ' · ' + reden);
  },

  beslis(d) {
    const ok = d.x === 'ja';
    const t = s.tx.find((x) => String(x.id) === d.id);
    if (!t) return;
    const kid = kidVan(t.kid);
    const isKlus = t.type === 'klus';
    if (ok && isKlus && stats(t.kid).week + t.amount > MAX_WEEK) {
      melding(kid.naam + ' heeft deze week al ' + MAX_WEEK + ' muntjes verdiend');
      return;
    }
    const b = isKlus ? null : belVan(t.ref);
    zet((st) => ({
      tx: st.tx.map((x) => (x.id === t.id ? { ...x, status: ok ? 'goed' : 'afgewezen' } : x)),
      timers: ok && b && b.duur ? [...st.timers, { id: 't' + t.id, kid: t.kid, ref: b.id, naam: b.naam, totaal: b.duur * 60, rest: b.duur * 60, status: 'wacht' }] : st.timers
    }));
    if (isKlus) melding(ok ? '+' + t.amount + ' voor ' + kid.naam + ' · ' + t.label : kid.naam + ': melding afgewezen');
    else melding(ok ? kid.naam + ': ' + t.label + ' goedgekeurd' + (b && b.duur ? ' · timer klaar' : '') : kid.naam + ': afgewezen, muntjes terug');
  },

  timer(d) {
    zet((st) => ({
      timers: st.timers
        .filter((t) => !(t.id === d.id && d.x === 'stop'))
        .map((t) => {
          if (t.id !== d.id) return t;
          if (d.x === 'start') return { ...t, status: 'loopt' };
          if (d.x === 'pauze') return { ...t, status: t.status === 'loopt' ? 'pauze' : 'loopt' };
          if (d.x === 'plus') return { ...t, rest: t.rest + 300, totaal: t.totaal + 300, status: t.status === 'klaar' ? 'loopt' : t.status };
          return t;
        })
    }));
  },
  snel() { zet({ demoSnel: !s.demoSnel }); },
  meldToggle(d) { zet((st) => ({ kindMelden: { ...st.kindMelden, [d.id]: !st.kindMelden[d.id] } })); },

  beloning(d) {
    const b = belVan(d.id);
    const kid = s.tabletKid;
    const status = belStatus(kid, b);
    if (status === 'aangevraagd') {
      zet((st) => ({ tx: st.tx.filter((t) => !(t.kid === kid && t.type === 'beloning' && t.ref === b.id && t.status === 'aangevraagd')) }));
      return;
    }
    if (status === 'goed' || stats(kid).beschikbaar < b.kosten) return;
    voegToe({ kid, type: 'beloning', ref: b.id, label: b.naam, amount: -b.kosten, status: 'aangevraagd', bron: 'kind' });
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
    if (stats(kid).week + openMeldingen(kid) + k.waarde > MAX_WEEK) return;
    voegToe({ kid, type: 'klus', ref: k.id, label: k.naam, amount: k.waarde, status: 'aangevraagd', bron: 'kind' });
  }
};

function overigInfo() {
  const kind = kidVan(s.ovKid);
  const isMin = s.ovSign < 0;
  const max = isMin ? stats(s.ovKid).beschikbaar : 5;
  const aantal = Math.max(isMin && max === 0 ? 0 : 1, Math.min(s.ovAmt, max));
  const uit = !s.ovReden.trim() || aantal < 1;
  return { kind, isMin, max, aantal, uit };
}

// ---------- ouder-app ----------
function renderOuder() {
  const titels = { melden: 'Klusje melden', aanvragen: 'Aanvragen', timers: 'Timers', beheer: 'Beheer' };
  const schermen = { melden: schermMelden, aanvragen: schermAanvragen, timers: schermTimers, beheer: schermBeheer };
  const aantalAanvragen = s.tx.filter((t) => t.status === 'aangevraagd').length;
  const navs = [
    ['melden', 'Melden', IC.melden, 0],
    ['aanvragen', 'Aanvragen', IC.inbox, aantalAanvragen],
    ['timers', 'Timers', IC.klok, s.timers.length],
    ['beheer', 'Beheer', IC.beheer, 0]
  ];
  return `
    <div class="p-head">
      <div class="p-brand">${coin(28)}<span>Muntjes</span></div>
      <span class="p-title">${titels[s.scherm]}</span>
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
    ${sheetKlus()}${sheetOverig()}`;
}

function schermMelden() {
  const kaarten = KIDS.map((k) => {
    const st = stats(k.id);
    return `<div class="kcard">
      <div class="kname">${avatar(k)}<b>${k.naam}</b></div>
      <div class="kbal"><span class="num">${st.beschikbaar}</span><span>muntjes</span></div>
      <div class="muted">Deze week ${st.week}/${MAX_WEEK} verdiend</div>
    </div>`;
  }).join('');
  const klusjes = KLUSJES.map((k) => `
    <button type="button" class="klus" data-a="klusOpen" data-id="${k.id}">
      <span class="icobox">${icon(k.icon, 26)}</span>
      <span class="kl-naam">${k.naam}</span>
      <span class="plus">+${k.waarde} ${munt(k.waarde)}</span>
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
    </div>`;
}

function schermAanvragen() {
  const lijst = nieuwsteEerst(s.tx).filter((t) => t.status === 'aangevraagd').reverse();
  const items = lijst.map((t) => {
    const isKlus = t.type === 'klus';
    const act = isKlus ? klusVan(t.ref) : belVan(t.ref);
    const kid = kidVan(t.kid);
    const n = Math.abs(t.amount);
    const sub = kid.naam + (isKlus ? ' meldt een klusje' : ' vraagt een beloning') + ' · ' + tijdLabel(t.ts) + (!isKlus && act && act.duur ? ' · met timer' : '');
    return `<div class="req">
      <div class="req-top">
        <span class="icobox wit">${icon(act ? act.icon : IC.star, 26)}</span>
        <div class="grow"><b>${esc(t.label)}</b><div class="muted">${esc(sub)}</div></div>
        <span class="req-amt ${isKlus ? 'pos' : 'wachtc'}">${isKlus ? '+' : '−'}${n} ${munt(n)}</span>
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
      <div class="grow"><b>${esc(label(t))}</b><div class="tnum sm">${mmss(t.rest)}</div></div>
      <button type="button" class="btn btn-primary" data-a="timer" data-id="${t.id}" data-x="start">Start</button>
    </div>`).join('');
  const lopendHtml = lopend.map((t) => {
    const klaar = t.status === 'klaar';
    const pct = t.totaal ? Math.round((t.rest / t.totaal) * 100) : 0;
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
      <div class="tnum">${mmss(t.rest)}</div>
      <div class="tbar"><div style="width:${pct}%"></div></div>
      ${knoppen}
    </div>`;
  }).join('');
  return `
    <h2 class="sec">Klaar om te starten</h2>
    ${wacht.length ? `<div class="stack">${wachtHtml}</div>` : '<p class="muted">Na goedkeuring van tablet- of tv-tijd verschijnt hier een timer.</p>'}
    <h2 class="sec sp">Lopende timers</h2>
    ${lopend.length ? `<div class="stack">${lopendHtml}</div>` : '<p class="muted">Er loopt nu geen timer.</p>'}
    <div class="lijst sp">
      <button type="button" class="lrij" data-a="snel" aria-pressed="${s.demoSnel}">
        <span class="col"><span>Demo-snelheid</span><small>1 seconde = 1 minuut</small></span>
        <span class="switch${s.demoSnel ? ' on' : ''}"><span></span></span>
      </button>
    </div>`;
}

function schermBeheer() {
  return `
    <h2 class="sec">Kinderen</h2>
    <div class="lijst">
      ${KIDS.map((k) => `<div class="lrij">${avatar(k)}<span class="grow">${k.naam}</span><span class="r">Aanpassen</span></div>`).join('')}
      <div class="lrij" style="color:var(--accent);font-weight:800">+ Kind toevoegen</div>
    </div>
    <h2 class="sec">Zelf klusjes melden</h2>
    <div class="lijst">
      ${KIDS.map((k) => {
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
      ${KLUSJES.map((k) => `<div class="lrij">${icon(k.icon, 22)}<span class="grow">${k.naam}</span><span class="r">+${k.waarde}</span></div>`).join('')}
    </div>
    <h2 class="sec">Beloningen</h2>
    <div class="lijst">
      ${BELONINGEN.map((b) => `<div class="lrij">${icon(b.icon, 22)}<span class="grow">${b.naam}</span><span class="r">${b.kosten} ${munt(b.kosten)}${b.duur ? ' · timer ' + b.duur + ' min' : ''}</span></div>`).join('')}
    </div>
    <h2 class="sec">Instellingen</h2>
    <div class="lijst">
      <div class="lrij"><span class="grow">Max. verdienen per week</span><span class="r">${MAX_WEEK} muntjes</span></div>
      <div class="lrij"><span class="grow">Elke beloning</span><span class="r">1× per week</span></div>
      <div class="lrij"><span class="grow">Pincode</span><span class="r">Wijzigen</span></div>
    </div>`;
}

function sheetKlus() {
  if (!s.sheet || s.sheet.type !== 'klus') return '';
  const k = klusVan(s.sheet.id);
  const kids = KIDS.map((kid) => {
    const st = stats(kid.id);
    const vol = st.week + k.waarde > MAX_WEEK;
    return `<button type="button" class="kidpick" style="border-color:${vol ? 'var(--line)' : kid.kleur};background:${vol ? 'var(--soft)' : kid.zacht}" data-a="klusKies" data-id="${kid.id}" ${vol ? 'disabled' : ''}>
      ${avatar(kid, 36)}
      <span class="col"><b>${kid.naam}</b><small>${vol ? 'Weeklimiet bereikt' : st.week + '/' + MAX_WEEK + ' deze week'}</small></span>
    </button>`;
  }).join('');
  return `<div class="sheet-wrap">
    <button type="button" class="sheet-bg" data-a="sluit" aria-label="Sluiten"></button>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-klus">
      <div class="sh-head">
        <span class="icobox" style="width:48px;height:48px;border-radius:14px">${icon(k.icon, 28)}</span>
        <div><div class="sh-title" id="sh-klus">${k.naam}</div><div class="plus" style="font-size:13px">+${k.waarde} ${munt(k.waarde)}</div></div>
      </div>
      <div class="lbl">Voor wie?</div>
      <div class="grid2">${kids}</div>
      <label class="lbl" for="bericht">Berichtje (optioneel)</label>
      <input class="inp" id="bericht" data-input="bericht" value="${esc(s.bericht)}" placeholder="Super geholpen!" autocomplete="off">
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
    ? o.kind.naam + ' heeft geen vrije muntjes. Het saldo kan niet onder 0.'
    : 'Weet je het zeker? Dit haalt ' + o.aantal + ' ' + munt(o.aantal) + ' af bij ' + o.kind.naam + '.';
  return `<div class="sheet-wrap">
    <button type="button" class="sheet-bg" data-a="sluit" aria-label="Sluiten"></button>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-ov">
      <div class="sh-title" id="sh-ov">Overig</div>
      <div class="pills">
        ${KIDS.map((k) => {
          const aan = k.id === s.ovKid;
          return `<button type="button" class="pill" style="${aan ? `background:${k.kleur};border-color:${k.kleur};color:#fff` : ''}" aria-pressed="${aan}" data-a="ovKid" data-id="${k.id}">${k.naam}</button>`;
        }).join('')}
      </div>
      <div class="grid2" style="gap:8px">
        <button type="button" class="seg${o.isMin ? '' : ' plus-on'}" aria-pressed="${!o.isMin}" data-a="ovPlus">+ Bijschrijven</button>
        <button type="button" class="seg${o.isMin ? ' min-on' : ''}" aria-pressed="${o.isMin}" data-a="ovMin">− Afhalen</button>
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
  goed: { chip: 'Goedgekeurd', voet: 'Deze week gebruikt' },
  afgewezen: { chip: 'Niet deze keer', voet: 'Tik om opnieuw te vragen' }
};
const STATUS_MELD = { aangevraagd: 'Gemeld', goed: 'Goedgekeurd!', afgewezen: 'Niet goedgekeurd' };

function renderKind() {
  const kind = kidVan(s.tabletKid);
  const st = stats(kind.id);
  $('#kind').style.background = kind.zacht;

  const vakjes = Array.from({ length: MAX_WEEK }, (_, i) => `<i class="${i < st.week ? 'vol' : ''}"></i>`).join('');

  const log = nieuwsteEerst(s.tx.filter((t) => t.kid === kind.id)).map((t) => {
    const act = t.type === 'klus' ? klusVan(t.ref) : t.type === 'beloning' ? belVan(t.ref) : null;
    const ic = act ? act.icon : t.amount < 0 ? IC.minus : IC.star;
    const rood = t.type === 'overig' && t.amount < 0;
    const rij = rood ? ' rood' : t.status === 'aangevraagd' ? ' wacht' : t.status === 'afgewezen' ? ' af' : '';
    const kleur = t.status === 'aangevraagd' ? 'wachtc' : t.status === 'afgewezen' ? 'afc' : t.amount < 0 ? 'neg' : 'pos';
    const door = t.bron === 'kind' ? (t.type === 'klus' ? 'zelf gemeld' : 'zelf aangevraagd') : 'door papa';
    const status = t.status === 'aangevraagd' ? (t.amount < 0 ? 'gereserveerd' : 'wacht op goedkeuring') : t.status === 'afgewezen' ? (t.amount < 0 ? 'afgewezen, terug' : 'niet goedgekeurd') : '';
    return `<div class="lrow${rij}">
      <span class="lico">${icon(ic, 24)}</span>
      <div class="ltxt">
        <b>${esc(t.label)}</b>
        <span class="muted">${door} · ${tijdLabel(t.ts)}</span>
        ${t.msg ? `<q>${esc(t.msg)}</q>` : ''}
      </div>
      <div class="lamt"><span class="n ${kleur}">${t.amount > 0 ? '+' : '−'}${Math.abs(t.amount)}</span><span class="muted">${status}</span></div>
    </div>`;
  }).join('');

  const beloningen = BELONINGEN.map((b) => {
    const status = belStatus(kind.id, b);
    const info = STATUS_BEL[status];
    const tekort = (status === 'vrij' || status === 'afgewezen') && st.beschikbaar < b.kosten;
    const nodig = b.kosten - st.beschikbaar;
    return `<button type="button" class="rcard s-${status}${tekort ? ' dim' : ''}" data-a="beloning" data-id="${b.id}">
      <span class="rtop">
        <span class="ricon">${icon(b.icon, 38, 1.5)}</span>
        ${info.chip ? `<span class="chip c-${status}">${info.chip}</span>` : ''}
      </span>
      <span class="rnaam">${b.naam}</span>
      <span class="coins" role="img" aria-label="${b.kosten} ${munt(b.kosten)}">${coin(28).repeat(b.kosten)}</span>
      <span class="voet">${tekort ? 'Nog ' + nodig + ' ' + munt(nodig) + ' nodig' : info.voet}</span>
    </button>`;
  }).join('');

  let melden = '';
  if (s.kindMelden[kind.id]) {
    const ruimte = MAX_WEEK - st.week - openMeldingen(kind.id);
    melden = `<h2 class="big">Klusje gedaan? Meld het!</h2>
      <div class="mgrid">${KLUSJES.map((k) => {
        const t = laatsteMelding(kind.id, k);
        const status = t ? t.status : 'vrij';
        const vol = status === 'vrij' && k.waarde > ruimte;
        const chip = status !== 'vrij'
          ? `<span class="chip c-${status}">${STATUS_MELD[status]}</span>`
          : `<span class="chip ${vol ? 'c-vol' : 'c-vrij'}">${vol ? 'Weeklimiet bereikt' : '+' + k.waarde + ' ' + munt(k.waarde)}</span>`;
        return `<button type="button" class="mcard s-${status}${vol ? ' dim' : ''}" data-a="meld" data-id="${k.id}">
          <span class="ricon">${icon(k.icon, 30, 1.5)}</span>
          <span class="mnaam">${k.naam}</span>
          ${chip}
        </button>`;
      }).join('')}</div>`;
  }

  return `
    <div class="t-head">
      ${avatar(kind, 52)}
      <span class="hoi">Hoi ${kind.naam}!</span>
      <span class="grow"></span>
      <span class="wk-lbl">Deze week verdiend</span>
      <span class="wk" role="img" aria-label="${st.week} van ${MAX_WEEK}">${vakjes}</span>
      <span class="wk-num">${st.week}/${MAX_WEEK}</span>
    </div>
    <div class="t-grid">
      <div class="t-left">
        <div class="saldo">
          <span class="lbl">Jouw muntjes</span>
          <div class="saldo-row">${coin(72)}<span class="saldo-num">${st.beschikbaar}</span></div>
          ${st.gereserveerd > 0
            ? `<span class="res">${st.saldo} ${munt(st.saldo)}, waarvan ${st.gereserveerd} gereserveerd</span>`
            : '<span class="vrij">Allemaal vrij te besteden</span>'}
        </div>
        <div class="log">
          <h2>Waar komen je muntjes vandaan?</h2>
          <div class="log-list" data-scroll="log">${log}</div>
        </div>
      </div>
      <div class="t-right" data-scroll="kind">
        <div class="rhead">
          <h2 class="big">Beloningen</h2>
          <span class="leg"><i style="background:#fff;border-color:#AEB6C1"></i>Beschikbaar</span>
          <span class="leg"><i style="background:#FFE2C2;border-color:var(--orange-bd)"></i>Wacht</span>
          <span class="leg"><i style="background:#D6EFDF;border-color:var(--green-bd)"></i>Goedgekeurd</span>
          <span class="leg"><i style="background:#E3E6EA;border-color:var(--grey-bd)"></i>Niet deze keer</span>
        </div>
        <div class="rgrid">${beloningen}</div>
        ${melden}
        <p class="info">Elke beloning kun je 1× per week gebruiken. Je verdient maximaal ${MAX_WEEK} muntjes per week.</p>
      </div>
    </div>`;
}

// ---------- demo-balk ----------
function renderBar() {
  const opties = [['beide', 'Beide'], ['ouder', 'Ouder-app'], ['kind', 'Kind-app']];
  const tabletKeuze = weergave === 'ouder' ? '' : `
    <div class="bar-group" role="group" aria-label="Tablet van">
      <span class="bar-lbl">Tablet van</span>
      ${KIDS.map((k) => {
        const aan = s.tabletKid === k.id;
        return `<button type="button" class="seg-btn" style="${aan ? `background:${k.kleur};border-color:${k.kleur};color:#fff` : ''}" aria-pressed="${aan}" data-a="tablet" data-id="${k.id}">${k.naam}</button>`;
      }).join('')}
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

  document.body.classList.toggle('bare', weergave !== 'beide');
  $('#bar').innerHTML = renderBar();
  $('#col-ouder').hidden = weergave === 'kind';
  $('#col-kind').hidden = weergave === 'ouder';
  $('#ouder').innerHTML = renderOuder();
  $('#kind').innerHTML = renderKind();
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
  s = { ...s, [veld]: e.target.value, ovZeker: veld === 'ovReden' ? false : s.ovZeker };
  bewaar();
  if (veld === 'ovReden') render();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && s.sheet) acties.sluit();
});

// Andere tab met dezelfde preview open? Dan meelopen.
window.addEventListener('storage', (e) => {
  if (e.key === OPSLAG) { s = laad(); render(); }
});
window.addEventListener('resize', () => {
  document.documentElement.style.setProperty('--barh', $('#bar').offsetHeight + 'px');
});

setInterval(() => {
  if (!s.timers.some((t) => t.status === 'loopt')) return;
  const stap = s.demoSnel ? 60 : 1;
  let klaar = null;
  const timers = s.timers.map((t) => {
    if (t.status !== 'loopt') return t;
    const rest = t.rest - stap;
    if (rest <= 0) { klaar = t; return { ...t, rest: 0, status: 'klaar' }; }
    return { ...t, rest };
  });
  zet({ timers });
  if (klaar) {
    piep();
    melding('Tijd is om: ' + kidVan(klaar.kid).naam + ' · ' + klaar.naam);
  }
}, 1000);

render();
