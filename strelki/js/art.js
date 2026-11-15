// Вся графика игры: векторные SVG-спрайты, растеризуемые под разрешение экрана.
// Освещение «из левого верхнего угла» сохраняется при повороте стрелок.

export const PAL = {
  red: { base: '#ec3442', light: '#ff9aa0', mid: '#c81e30', dark: '#7d0d1d' },
  green: { base: '#2fb84c', light: '#9af5a6', mid: '#1c923a', dark: '#0b5521' },
  blue: { base: '#2f8af0', light: '#a3d3ff', mid: '#1e66cc', dark: '#0e3a82' },
  gold: { base: '#fbc21a', light: '#fff0a0', mid: '#e09d00', dark: '#8f5d00' },
  purple: { base: '#9b4ae6', light: '#dcb0ff', mid: '#7a2fc8', dark: '#461382' },
  orange: { base: '#ff8222', light: '#ffcd95', mid: '#e5650c', dark: '#9c3f00' },
  pink: { base: '#ff52a8', light: '#ffbadd', mid: '#e3328a', dark: '#99125a' },
  cyan: { base: '#17c8d2', light: '#a6f8f8', mid: '#0ea5b0', dark: '#055f69' },
};
export const COLOR_KEYS = Object.keys(PAL);

const svg = (vb, w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${body}</svg>`;

// ---------- Стрелка-леденец ----------
const ARROW_PATH = 'M21 39 L54 39 L54 25 Q54 18 59.5 22.4 L88.5 45.6 Q94 50 88.5 54.4 L59.5 77.6 Q54 82 54 75 L54 61 L21 61 A11 11 0 0 1 21 39 Z';

function arrowSVG(color, dir, px) {
  const P = PAL[color];
  const A = dir * 90 - 90; // спрайт нарисован «вправо»; dir 0 = вверх
  const gt = `gradientUnits="userSpaceOnUse" gradientTransform="rotate(${-A} 50 50)"`;
  let stripes = '';
  for (let k = -2; k < 6; k++) {
    const x0 = 2 + k * 12;
    stripes += `<path d="M${x0} 63 L${x0 + 12} 37 L${x0 + 18} 37 L${x0 + 6} 63 Z"/>`;
  }
  return svg('-5 -5 110 110', px, px, `
  <defs>
    <linearGradient id="b" x1="0" y1="18" x2="0" y2="84" ${gt}>
      <stop offset="0" stop-color="${P.light}"/><stop offset=".38" stop-color="${P.base}"/>
      <stop offset=".8" stop-color="${P.mid}"/><stop offset="1" stop-color="${P.dark}"/>
    </linearGradient>
    <linearGradient id="s" x1="0" y1="20" x2="0" y2="80" ${gt}>
      <stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f3f1ff"/><stop offset="1" stop-color="#cfd3ea"/>
    </linearGradient>
    <linearGradient id="g" x1="0" y1="14" x2="0" y2="62" ${gt}>
      <stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".5" stop-color="#fff" stop-opacity=".18"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="sp" cx="34" cy="30" r="16" ${gt}>
      <stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="c"><path d="${ARROW_PATH}"/></clipPath>
    <clipPath id="cs"><rect x="0" y="30" width="54" height="40"/></clipPath>
  </defs>
  <g transform="rotate(${A} 50 50)">
    <path d="${ARROW_PATH}" fill="none" stroke="${P.dark}" stroke-width="7" stroke-linejoin="round"/>
    <path d="${ARROW_PATH}" fill="url(#b)"/>
    <g clip-path="url(#c)">
      <g clip-path="url(#cs)" fill="url(#s)" opacity=".92">${stripes}</g>
      <path d="${ARROW_PATH}" fill="none" stroke="${P.dark}" stroke-opacity=".35" stroke-width="5"/>
      <rect x="-10" y="-10" width="120" height="120" fill="url(#g)"/>
      <path d="${ARROW_PATH}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.2"/>
      <rect x="-10" y="-10" width="120" height="120" fill="url(#sp)"/>
    </g>
  </g>`);
}

function arrowShadowSVG(dir, px) {
  const A = dir * 90 - 90;
  return svg('-5 -5 110 110', px, px, `
  <defs><filter id="f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.6"/></filter></defs>
  <g transform="rotate(${A} 50 50)"><path d="${ARROW_PATH}" fill="#06122e" fill-opacity=".55" filter="url(#f)"/></g>`);
}

// ---------- Ячейка поля ----------
function socketSVG(px) {
  return svg('0 0 100 100', px, px, `
  <defs>
    <linearGradient id="a" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d2552" stop-opacity=".75"/><stop offset="1" stop-color="#2a5596" stop-opacity=".55"/>
    </linearGradient>
    <linearGradient id="r" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".4" stop-color="#000" stop-opacity="0"/>
      <stop offset=".85" stop-color="#bfe2ff" stop-opacity="0"/><stop offset="1" stop-color="#bfe2ff" stop-opacity=".45"/>
    </linearGradient>
  </defs>
  <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#a)"/>
  <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#r)"/>
  <rect x="6" y="6" width="88" height="88" rx="19" fill="none" stroke="#8fc6ff" stroke-opacity=".22" stroke-width="2"/>`);
}

// ---------- Подарочная коробка (задняя часть, передняя, крышка, бант) ----------
function ribbonOf(color) {
  return color === 'gold' ? PAL.red : PAL.gold;
}

function boxBackSVG(color, px) {
  const P = PAL[color];
  return svg('0 0 140 140', px, px, `
  <defs>
    <radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#05102a" stop-opacity=".55"/><stop offset="1" stop-color="#05102a" stop-opacity="0"/></radialGradient>
    <linearGradient id="in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.dark}"/><stop offset="1" stop-color="#1a0610"/></linearGradient>
  </defs>
  <ellipse cx="70" cy="130" rx="62" ry="9" fill="url(#sh)"/>
  <path d="M16 64 L30 48 L110 48 L124 64 Z" fill="url(#in)" stroke="${P.dark}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M30 48 L110 48" stroke="${P.light}" stroke-opacity=".5" stroke-width="2"/>
  <path d="M30 48 L22 57 M110 48 L118 57" stroke="#000" stroke-opacity=".25" stroke-width="2"/>`);
}

function boxFrontSVG(color, px) {
  const P = PAL[color];
  const R = ribbonOf(color);
  let dots = '';
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 8; x++) {
      const cx = 18 + x * 15 + (y % 2) * 7.5, cy = 66 + y * 14;
      dots += `<path d="M${cx} ${cy - 4} L${cx + 1.2} ${cy - 1.2} L${cx + 4} ${cy} L${cx + 1.2} ${cy + 1.2} L${cx} ${cy + 4} L${cx - 1.2} ${cy + 1.2} L${cx - 4} ${cy} L${cx - 1.2} ${cy - 1.2} Z"/>`;
    }
  }
  return svg('0 0 140 140', px, px, `
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.base}"/><stop offset=".7" stop-color="${P.mid}"/><stop offset="1" stop-color="${P.dark}"/></linearGradient>
    <linearGradient id="side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".12" stop-color="#fff" stop-opacity="0"/><stop offset=".88" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
    <linearGradient id="rb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${R.mid}"/><stop offset=".35" stop-color="${R.light}"/><stop offset=".6" stop-color="${R.base}"/><stop offset="1" stop-color="${R.mid}"/></linearGradient>
    <clipPath id="c"><rect x="16" y="60" width="108" height="68" rx="10"/></clipPath>
  </defs>
  <rect x="16" y="60" width="108" height="68" rx="10" fill="url(#f)" stroke="${P.dark}" stroke-width="4"/>
  <g clip-path="url(#c)">
    <g fill="${P.light}" fill-opacity=".38">${dots}</g>
    <rect x="16" y="60" width="108" height="68" fill="url(#side)"/>
    <rect x="61" y="58" width="18" height="72" fill="url(#rb)"/>
    <path d="M61 58 V130 M79 58 V130" stroke="${R.dark}" stroke-opacity=".5" stroke-width="1.5"/>
    <rect x="16" y="60" width="108" height="7" fill="#fff" fill-opacity=".35"/>
  </g>
  <rect x="16" y="60" width="108" height="68" rx="10" fill="none" stroke="${P.dark}" stroke-width="4"/>`);
}

function lidSVG(color, px) {
  const P = PAL[color];
  const R = ribbonOf(color);
  return svg('0 0 140 70', px, px / 2, `
  <defs>
    <linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.light}"/><stop offset="1" stop-color="${P.base}"/></linearGradient>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.base}"/><stop offset="1" stop-color="${P.mid}"/></linearGradient>
    <linearGradient id="rb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${R.mid}"/><stop offset=".35" stop-color="${R.light}"/><stop offset=".6" stop-color="${R.base}"/><stop offset="1" stop-color="${R.mid}"/></linearGradient>
  </defs>
  <path d="M9 42 L26 24 L114 24 L131 42 Z" fill="url(#t)" stroke="${P.dark}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M62 24 L78 24 L80 42 L60 42 Z" fill="url(#rb)"/>
  <rect x="9" y="41" width="122" height="22" rx="7" fill="url(#f)" stroke="${P.dark}" stroke-width="4"/>
  <rect x="61" y="43" width="18" height="18" fill="url(#rb)"/>
  <rect x="13" y="44" width="114" height="5" rx="2.5" fill="#fff" fill-opacity=".35"/>`);
}

function bowSVG(color, px) {
  const R = ribbonOf(color);
  return svg('0 0 100 70', px, px * 0.7, `
  <defs>
    <linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${R.light}"/><stop offset=".55" stop-color="${R.base}"/><stop offset="1" stop-color="${R.mid}"/></linearGradient>
    <radialGradient id="k" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="${R.light}"/><stop offset="1" stop-color="${R.mid}"/></radialGradient>
  </defs>
  <g stroke="${R.dark}" stroke-width="3.5" stroke-linejoin="round">
    <path d="M45 46 L32 66 L39 63 L43 69 L50 48 Z" fill="${R.mid}"/>
    <path d="M55 46 L68 66 L61 63 L57 69 L50 48 Z" fill="${R.mid}"/>
    <path d="M50 42 C34 14 6 12 8 32 C10 50 34 50 50 42 Z" fill="url(#l)"/>
    <path d="M50 42 C66 14 94 12 92 32 C90 50 66 50 50 42 Z" fill="url(#l)"/>
    <ellipse cx="50" cy="42" rx="10" ry="9" fill="url(#k)"/>
  </g>
  <path d="M20 26 C24 20 32 20 38 26" stroke="#fff" stroke-opacity=".6" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M62 26 C68 20 76 20 80 25" stroke="#fff" stroke-opacity=".6" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M30 34 C36 40 42 41 47 40" stroke="${R.dark}" stroke-opacity=".35" stroke-width="2" fill="none"/>
  <path d="M70 34 C64 40 58 41 53 40" stroke="${R.dark}" stroke-opacity=".35" stroke-width="2" fill="none"/>`);
}

// ---------- Полка ----------
export function shelfSVG(W, scale) {
  const H = 130;
  let grain = '';
  for (let i = 0; i < Math.floor(W / 70); i++) {
    const x = 30 + i * 70;
    grain += `<path d="M${x} 74 q 18 -4 36 0 t 30 2" />`;
  }
  let snow = `M8 66 `;
  const bumps = Math.max(4, Math.round(W / 46));
  const step = (W - 16) / bumps;
  for (let i = 0; i < bumps; i++) {
    const x = 8 + i * step;
    snow += `Q ${x + step * 0.25} ${48 + (i % 3) * 3} ${x + step * 0.5} ${52 + (i % 2) * 2} T ${x + step} ${56 + ((i + 1) % 3) * 2} `;
  }
  snow += `L ${W - 6} 66 `;
  // свисающие капли снега
  const drips = [0.14, 0.37, 0.61, 0.86].map((t) => 8 + (W - 16) * t);
  let dripPath = '';
  drips.forEach((x, i) => {
    const d = 8 + (i % 2) * 6;
    dripPath += `M${x - 14} 64 Q ${x - 10} ${70 + d} ${x} ${72 + d} Q ${x + 10} ${70 + d} ${x + 14} 64 Z `;
  });
  let icicles = '';
  const ic = Math.max(5, Math.round(W / 38));
  for (let i = 0; i < ic; i++) {
    const x = 22 + ((W - 44) * (i + 0.5)) / ic + (i % 2) * 4;
    const len = 12 + ((i * 7) % 5) * 4;
    icicles += `<path d="M${x - 5} 92 Q ${x - 1} ${92 + len * 0.6} ${x} ${92 + len} Q ${x + 1} ${92 + len * 0.6} ${x + 5} 92 Z"/>`;
  }
  return svg(`0 0 ${W} ${H}`, Math.ceil(W * scale), Math.ceil(H * scale), `
  <defs>
    <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4b"/><stop offset=".45" stop-color="#9b5e2b"/><stop offset="1" stop-color="#5e3112"/></linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d4e9fb"/></linearGradient>
    <linearGradient id="i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8f7ff"/><stop offset="1" stop-color="#8fd0ff" stop-opacity=".6"/></linearGradient>
    <radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#05102a" stop-opacity=".45"/><stop offset="1" stop-color="#05102a" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="${W / 2}" cy="112" rx="${W / 2 - 10}" ry="12" fill="url(#sh)"/>
  <g fill="url(#i)" stroke="#9fd4f5" stroke-width="1.2">${icicles}</g>
  <rect x="6" y="60" width="${W - 12}" height="32" rx="10" fill="url(#w)" stroke="#4a250c" stroke-width="3.5"/>
  <g stroke="#5a2e10" stroke-opacity=".35" stroke-width="1.6" fill="none">${grain}</g>
  <rect x="12" y="84" width="${W - 24}" height="4" rx="2" fill="#000" fill-opacity=".18"/>
  <path d="${snow} Z" fill="url(#s)" stroke="#a9cbe6" stroke-width="2"/>
  <path d="${dripPath}" fill="url(#s)"/>
  <path d="${snow.replace(/^M8 66/, 'M14 62')}" fill="none" stroke="#fff" stroke-width="2.5" stroke-opacity=".8" transform="translate(0 2)"/>`);
}

function nestSVG(px) {
  return svg('0 0 100 50', px, px / 2, `
  <defs><radialGradient id="n" cx=".5" cy=".45" r=".55"><stop offset="0" stop-color="#6e9fcc"/><stop offset=".6" stop-color="#a8cdec"/><stop offset="1" stop-color="#e9f5ff"/></radialGradient></defs>
  <ellipse cx="50" cy="25" rx="44" ry="17" fill="url(#n)"/>
  <ellipse cx="50" cy="25" rx="44" ry="17" fill="none" stroke="#fff" stroke-width="3" stroke-opacity=".8"/>`);
}

// ---------- Мелкие спрайты ----------
const HEART = 'M50 88 C20 66 6 48 6 32 C6 18 17 8 30 8 C39 8 46 13 50 20 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 48 80 66 50 88 Z';

function heartSVG(px, empty) {
  if (empty) {
    return svg('0 0 100 96', px, px * 0.96, `
    <path d="${HEART}" fill="#0b2148" fill-opacity=".55" stroke="#7fa7d8" stroke-opacity=".7" stroke-width="5" stroke-linejoin="round"/>`);
  }
  return svg('0 0 100 96', px, px * 0.96, `
  <defs>
    <linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a95"/><stop offset=".45" stop-color="#f02c45"/><stop offset="1" stop-color="#a50c25"/></linearGradient>
    <clipPath id="c"><path d="${HEART}"/></clipPath>
  </defs>
  <path d="${HEART}" fill="url(#h)" stroke="#6b0718" stroke-width="6" stroke-linejoin="round"/>
  <g clip-path="url(#c)"><path d="${HEART}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3"/></g>
  <ellipse cx="31" cy="27" rx="12" ry="8" transform="rotate(-30 31 27)" fill="#fff" fill-opacity=".85"/>
  <circle cx="44" cy="20" r="3.5" fill="#fff" fill-opacity=".8"/>`);
}

function coinSVG(px) {
  const star = 'M50 26 L56.5 41.5 L73 42.5 L60.5 53 L64.5 69 L50 60 L35.5 69 L39.5 53 L27 42.5 L43.5 41.5 Z';
  return svg('0 0 100 100', px, px, `
  <defs>
    <linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a0"/><stop offset=".5" stop-color="#fbbf16"/><stop offset="1" stop-color="#b87300"/></linearGradient>
    <linearGradient id="i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8a200"/><stop offset="1" stop-color="#ffd84a"/></linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c4"/><stop offset="1" stop-color="#ffc21c"/></linearGradient>
  </defs>
  <circle cx="50" cy="50" r="44" fill="url(#o)" stroke="#7a4a00" stroke-width="5"/>
  <circle cx="50" cy="50" r="32" fill="url(#i)" stroke="#b37800" stroke-width="2.5"/>
  <path d="${star}" fill="#9c6300" transform="translate(0 2.5)" stroke="#9c6300" stroke-width="3" stroke-linejoin="round"/>
  <path d="${star}" fill="url(#s)" stroke="#fff3b0" stroke-width="2" stroke-linejoin="round"/>
  <path d="M22 36 A32 32 0 0 1 48 16" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" stroke-opacity=".8"/>`);
}

function sparkleSVG(px) {
  return svg('0 0 100 100', px, px, `
  <defs>
    <radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff9d6" stop-opacity=".9"/><stop offset=".35" stop-color="#ffe27a" stop-opacity=".35"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="url(#g)"/>
  <path d="M50 4 Q54 46 96 50 Q54 54 50 96 Q46 54 4 50 Q46 46 50 4 Z" fill="#fff"/>
  <path d="M50 26 Q52 48 74 50 Q52 52 50 74 Q48 52 26 50 Q48 48 50 26 Z" fill="#fff6c0"/>`);
}

function snowflakeSVG(px, variant) {
  let arms = '';
  for (let i = 0; i < 6; i++) {
    const a = i * 60;
    const br = variant === 0
      ? `<path d="M50 50 V12 M50 30 L40 20 M50 30 L60 20 M50 20 L44 14 M50 20 L56 14"/>`
      : variant === 1
        ? `<path d="M50 50 V10 M50 34 L38 26 M50 34 L62 26"/><circle cx="50" cy="12" r="3"/>`
        : `<path d="M50 50 V14 M50 24 L42 16 M50 24 L58 16 M50 38 L40 30 M50 38 L60 30"/>`;
    arms += `<g transform="rotate(${a} 50 50)">${br}</g>`;
  }
  return svg('0 0 100 100', px, px, `
  <g stroke="#ffffff" stroke-width="6" stroke-linecap="round" fill="#fff">${arms}</g>
  <circle cx="50" cy="50" r="6" fill="#fff"/>`);
}

function snowDotSVG(px) {
  return svg('0 0 40 40', px, px, `
  <defs><radialGradient id="d" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <circle cx="20" cy="20" r="20" fill="url(#d)"/>`);
}

function hollySVG(px) {
  const leaf = 'M0 30 Q8 20 14 25 Q17 14 26 19 Q31 8 40 15 Q49 8 54 19 Q63 14 66 25 Q72 20 80 30 Q72 40 66 35 Q63 46 54 41 Q49 52 40 45 Q31 52 26 41 Q17 46 14 35 Q8 40 0 30 Z';
  return svg('0 0 140 90', px, px * 0.643, `
  <defs>
    <linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ed36f"/><stop offset="1" stop-color="#127a2e"/></linearGradient>
    <radialGradient id="b" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ff9a9a"/><stop offset=".5" stop-color="#e3192c"/><stop offset="1" stop-color="#8d0613"/></radialGradient>
  </defs>
  <g transform="translate(4 30) rotate(-18 40 30)"><path d="${leaf}" fill="url(#l)" stroke="#0b4a1c" stroke-width="3.5" stroke-linejoin="round"/><path d="M6 30 Q40 26 74 30" stroke="#0b4a1c" stroke-width="2.5" fill="none" stroke-opacity=".6"/></g>
  <g transform="translate(56 30) rotate(18 40 30)"><path d="${leaf}" fill="url(#l)" stroke="#0b4a1c" stroke-width="3.5" stroke-linejoin="round"/><path d="M6 30 Q40 26 74 30" stroke="#0b4a1c" stroke-width="2.5" fill="none" stroke-opacity=".6"/></g>
  <g stroke="#5a0410" stroke-width="3">
    <circle cx="60" cy="40" r="13" fill="url(#b)"/><circle cx="80" cy="42" r="13" fill="url(#b)"/><circle cx="70" cy="24" r="13" fill="url(#b)"/>
  </g>
  <g fill="#fff" fill-opacity=".85"><circle cx="56" cy="35" r="4"/><circle cx="76" cy="37" r="4"/><circle cx="66" cy="19" r="4"/></g>`);
}

function lockSVG(px) {
  return svg('0 0 100 110', px, px * 1.1, `
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset=".5" stop-color="#f4b000"/><stop offset="1" stop-color="#a86a00"/></linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a97ad"/><stop offset=".4" stop-color="#f1f5fb"/><stop offset="1" stop-color="#7b879c"/></linearGradient>
  </defs>
  <path d="M28 50 V34 A22 22 0 0 1 72 34 V50" fill="none" stroke="#3d4655" stroke-width="16" stroke-linecap="round"/>
  <path d="M28 50 V34 A22 22 0 0 1 72 34 V50" fill="none" stroke="url(#s)" stroke-width="10" stroke-linecap="round"/>
  <rect x="14" y="46" width="72" height="56" rx="14" fill="url(#b)" stroke="#6b4300" stroke-width="5"/>
  <circle cx="50" cy="68" r="8" fill="#6b4300"/><rect x="46" y="70" width="8" height="18" rx="4" fill="#6b4300"/>
  <rect x="20" y="51" width="60" height="9" rx="4.5" fill="#fff" fill-opacity=".5"/>`);
}

// Иконки (белые, для круглых кнопок)
function gearPath() {
  const pts = [];
  const rad = (d) => (d * Math.PI) / 180;
  for (let i = 0; i < 8; i++) {
    const a = i * 45;
    for (const [da, r] of [[-19, 30], [-11, 42], [11, 42], [19, 30]]) {
      pts.push([50 + Math.cos(rad(a + da)) * r, 50 + Math.sin(rad(a + da)) * r]);
    }
  }
  return 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z M63 50 A13 13 0 1 0 37 50 A13 13 0 1 0 63 50 Z';
}
const ICONS = {
  gear: `<path d="${gearPath()}" fill="#fff" fill-rule="evenodd" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`,
  sound: `<path d="M18 40 H34 L54 22 V78 L34 60 H18 Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M64 36 Q74 50 64 64 M72 26 Q90 50 72 74" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none"/>`,
  mute: `<path d="M18 40 H34 L54 22 V78 L34 60 H18 Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M64 38 L84 62 M84 38 L64 62" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`,
  music: `<path d="M40 70 V24 L80 16 V60" stroke="#fff" stroke-width="8" fill="none" stroke-linejoin="round"/><ellipse cx="32" cy="72" rx="12" ry="9" fill="#fff"/><ellipse cx="72" cy="62" rx="12" ry="9" fill="#fff"/>`,
  home: `<path d="M16 50 L50 20 L84 50" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M26 46 V80 H44 V62 H56 V80 H74 V46" fill="#fff"/>`,
  restart: `<path d="M74 50 A24 24 0 1 1 64 30" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M54 16 L76 26 L60 44 Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>`,
  close: `<path d="M28 28 L72 72 M72 28 L28 72" stroke="#fff" stroke-width="12" stroke-linecap="round"/>`,
  play: `<path d="M36 24 L76 50 L36 76 Z" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>`,
  trophy: `<path d="M30 18 H70 V40 A20 20 0 0 1 30 40 Z" fill="#fff"/><path d="M30 26 H16 Q16 46 34 48 M70 26 H84 Q84 46 66 48" stroke="#fff" stroke-width="6" fill="none"/><rect x="45" y="58" width="10" height="14" fill="#fff"/><rect x="32" y="72" width="36" height="10" rx="3" fill="#fff"/>`,
  plus: `<path d="M50 22 V78 M22 50 H78" stroke="#fff" stroke-width="13" stroke-linecap="round"/>`,
  star: `<path d="M50 14 L60 38 L86 40 L66 57 L72 83 L50 69 L28 83 L34 57 L14 40 L40 38 Z" fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>`,
  invite: `<circle cx="40" cy="36" r="14" fill="#fff"/><path d="M14 80 Q14 56 40 56 Q66 56 66 80 Z" fill="#fff"/><path d="M76 34 V58 M64 46 H88" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`,
};
function iconSVG(name, px) {
  return svg('0 0 100 100', px, px, ICONS[name]);
}

function videoBadgeSVG(px) {
  return svg('0 0 100 70', px, px * 0.7, `
  <defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd35a"/><stop offset="1" stop-color="#f08c00"/></linearGradient></defs>
  <rect x="6" y="8" width="64" height="54" rx="14" fill="url(#v)" stroke="#8a4a00" stroke-width="5"/>
  <path d="M70 30 L92 16 V54 L70 40 Z" fill="url(#v)" stroke="#8a4a00" stroke-width="5" stroke-linejoin="round"/>
  <path d="M30 22 L50 35 L30 48 Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>`);
}

// Иконки бонусов
function wandSVG(px) {
  return svg('0 0 100 100', px, px, `
  <defs>
    <linearGradient id="st" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b4bd6"/><stop offset="1" stop-color="#2a1673"/></linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6b0"/><stop offset=".5" stop-color="#ffcf1f"/><stop offset="1" stop-color="#e08a00"/></linearGradient>
  </defs>
  <path d="M22 84 L60 42" stroke="#1a0d4a" stroke-width="16" stroke-linecap="round"/>
  <path d="M22 84 L60 42" stroke="url(#st)" stroke-width="10" stroke-linecap="round"/>
  <path d="M27 79 L33 72" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
  <path d="M66 10 L72 26 L89 27 L76 38 L80 55 L66 46 L52 55 L56 38 L43 27 L60 26 Z" fill="url(#s)" stroke="#8a5200" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M60 22 L64 30" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-opacity=".9"/>
  <path d="M24 30 l3 7 7 3-7 3-3 7-3-7-7-3 7-3z M86 66 l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff"/>`);
}

function magnetSVG(px) {
  return svg('0 0 100 100', px, px, `
  <defs>
    <linearGradient id="m" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff7d86"/><stop offset=".5" stop-color="#e5202f"/><stop offset="1" stop-color="#9a0816"/></linearGradient>
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa6bb"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#7d889c"/></linearGradient>
  </defs>
  <g transform="rotate(-35 50 50)">
    <path d="M26 30 V56 A24 24 0 0 0 74 56 V30" fill="none" stroke="#5c0610" stroke-width="26"/>
    <path d="M26 30 V56 A24 24 0 0 0 74 56 V30" fill="none" stroke="url(#m)" stroke-width="18"/>
    <rect x="13" y="14" width="26" height="20" rx="4" fill="url(#t)" stroke="#3e4757" stroke-width="4"/>
    <rect x="61" y="14" width="26" height="20" rx="4" fill="url(#t)" stroke="#3e4757" stroke-width="4"/>
    <path d="M30 46 V58 A20 20 0 0 0 40 74" stroke="#fff" stroke-opacity=".6" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>
  <path d="M74 12 l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff"/>`);
}

function snowballSVG(px) {
  return svg('0 0 100 100', px, px, `
  <defs>
    <radialGradient id="b" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e3f1ff"/><stop offset="1" stop-color="#8fb8e0"/></radialGradient>
  </defs>
  <path d="M84 70 Q96 74 94 82 M88 58 Q98 58 98 66" stroke="#cfe6ff" stroke-width="5" stroke-linecap="round" fill="none"/>
  <circle cx="48" cy="52" r="34" fill="url(#b)" stroke="#5f86b3" stroke-width="4.5"/>
  <g fill="#a9c9ea"><circle cx="58" cy="66" r="4"/><circle cx="40" cy="70" r="3"/><circle cx="66" cy="48" r="3"/><circle cx="30" cy="54" r="2.5"/></g>
  <ellipse cx="36" cy="38" rx="10" ry="6" transform="rotate(-30 36 38)" fill="#fff"/>`);
}

// ---------- Ёлка, игрушки, снеговик, рука ----------
function tierPath(cx, top, bot, hw, sc, droop = 16) {
  const H = bot - top;
  let d = `M${cx} ${top} C ${cx + hw * 0.32} ${top + H * 0.12} ${cx + hw * 0.92} ${bot - H * 0.5} ${cx + hw} ${bot} `;
  const step = (hw * 2) / sc;
  for (let i = 0; i < sc; i++) {
    const x1 = cx + hw - step * i;
    const x2 = x1 - step;
    const dd = droop * (0.75 + 0.5 * Math.abs(Math.sin(i * 1.7)));
    d += `C ${x1 - step * 0.05} ${bot + dd} ${x2 + step * 0.05} ${bot + dd} ${x2} ${bot} `;
  }
  d += `C ${cx - hw * 0.92} ${bot - H * 0.5} ${cx - hw * 0.32} ${top + H * 0.12} ${cx} ${top} Z`;
  return d;
}

function snowBand(cx, bot, hw, sc, droop = 16) {
  const step = (hw * 2) / sc;
  let d = '';
  for (let i = 0; i < sc; i++) {
    const x1 = cx + hw - step * i;
    const x2 = x1 - step;
    const dd = droop * (0.75 + 0.5 * Math.abs(Math.sin(i * 1.7)));
    d += `M${x1 - 2} ${bot - 1} C ${x1 - step * 0.05} ${bot + dd} ${x2 + step * 0.05} ${bot + dd} ${x2 + 2} ${bot - 1} `;
    d += `C ${x2 + step * 0.2} ${bot + dd * 0.55 - 9} ${x1 - step * 0.2} ${bot + dd * 0.55 - 9} ${x1 - 2} ${bot - 1} Z `;
  }
  return d;
}

export const TREE_TIERS = [
  { top: 205, bot: 462, hw: 196, sc: 7 },
  { top: 138, bot: 362, hw: 158, sc: 6 },
  { top: 80, bot: 264, hw: 118, sc: 5 },
  { top: 32, bot: 166, hw: 78, sc: 4 },
];

function treeSVG(px) {
  const cx = 210;
  let tiers = '';
  let clips = '';
  TREE_TIERS.forEach((t, i) => {
    const d = tierPath(cx, t.top, t.bot, t.hw, t.sc);
    clips += `<clipPath id="ct${i}"><path d="${d}"/></clipPath>`;
    if (i > 0) clips += `<clipPath id="cl${i}">${TREE_TIERS.slice(0, i).map((q) => `<path d="${tierPath(cx, q.top, q.bot, q.hw, q.sc)}"/>`).join('')}</clipPath>`;
    let needles = '';
    for (let k = -4; k <= 4; k++) {
      const ex = cx + k * t.hw * 0.22, ey = t.bot + 4;
      needles += `<path d="M${cx + k * 2} ${t.top + 26} Q ${cx + k * t.hw * 0.1} ${(t.top + t.bot) / 2} ${ex} ${ey}"/>`;
    }
    let clumps = '';
    for (let k = 0; k < 3; k++) {
      const x = cx + (k - 1) * t.hw * 0.5 + ((i * 37 + k * 23) % 20) - 10;
      const y = t.top + (t.bot - t.top) * (0.55 + ((k + i) % 2) * 0.12);
      if (Math.abs(x - cx) < t.hw * 0.75) clumps += `<ellipse cx="${x}" cy="${y}" rx="${9 + (k % 2) * 4}" ry="5"/>`;
    }
    const shadow = i > 0 ? `<g clip-path="url(#cl${i})"><path d="${d}" transform="translate(0 14)" fill="#03230f" fill-opacity=".38"/></g>` : '';
    tiers += `
    ${shadow}
    <path d="${d}" fill="url(#t)" stroke="#0a3d1d" stroke-width="5" stroke-linejoin="round"/>
    <g clip-path="url(#ct${i})">
      <g stroke="#0b4520" stroke-opacity=".5" stroke-width="3.2" fill="none" stroke-linecap="round">${needles}</g>
      <g stroke="#7fe08f" stroke-opacity=".28" stroke-width="2" fill="none" stroke-linecap="round" transform="translate(-3 -2)">${needles}</g>
    </g>
    <path d="${d}" fill="url(#tl)"/>
    <g fill="url(#sn)" stroke="#b9d6ee" stroke-width="1.5">${clumps}</g>
    <path d="${snowBand(cx, t.bot, t.hw, t.sc)}" fill="url(#sn)" stroke="#b0cde6" stroke-width="1.5" stroke-linejoin="round"/>`;
  });
  return svg('0 0 420 580', px, px * (580 / 420), `
  <defs>
    ${clips}
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#44c463"/><stop offset=".45" stop-color="#22943f"/><stop offset="1" stop-color="#0f5a29"/></linearGradient>
    <radialGradient id="tl" cx=".3" cy=".25" r=".9"><stop offset="0" stop-color="#c9ffbf" stop-opacity=".3"/><stop offset=".55" stop-color="#c9ffbf" stop-opacity="0"/></radialGradient>
    <linearGradient id="sn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d2e7fa"/></linearGradient>
    <linearGradient id="tr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5228"/><stop offset=".5" stop-color="#6b3b18"/><stop offset="1" stop-color="#40210b"/></linearGradient>
    <linearGradient id="pot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff6b6b"/><stop offset=".4" stop-color="#d8192b"/><stop offset="1" stop-color="#7d0a16"/></linearGradient>
    <linearGradient id="gb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe680"/><stop offset=".5" stop-color="#f2b000"/><stop offset="1" stop-color="#a06800"/></linearGradient>
    <radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#05102a" stop-opacity=".5"/><stop offset="1" stop-color="#05102a" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="${cx}" cy="560" rx="170" ry="18" fill="url(#sh)"/>
  <rect x="${cx - 22}" y="455" width="44" height="60" fill="url(#tr)" stroke="#2c1606" stroke-width="4"/>
  ${tiers}
  <path d="M${cx - 74} 500 L${cx + 74} 500 L${cx + 60} 562 Q${cx} 570 ${cx - 60} 562 Z" fill="url(#pot)" stroke="#5a0610" stroke-width="5" stroke-linejoin="round"/>
  <rect x="${cx - 80}" y="492" width="160" height="22" rx="9" fill="url(#pot)" stroke="#5a0610" stroke-width="5"/>
  <path d="M${cx - 66} 532 L${cx + 66} 532 L${cx + 64} 544 L${cx - 64} 544 Z" fill="url(#gb)"/>
  <rect x="${cx - 74}" y="496" width="148" height="6" rx="3" fill="#fff" fill-opacity=".45"/>`);
}

function ornamentSVG(color, px) {
  const P = PAL[color];
  return svg('0 0 60 70', px, px * (70 / 60), `
  <defs>
    <radialGradient id="o" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="${P.light}"/><stop offset=".45" stop-color="${P.base}"/><stop offset="1" stop-color="${P.dark}"/></radialGradient>
    <linearGradient id="c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c7a2a"/><stop offset=".45" stop-color="#ffe9a0"/><stop offset="1" stop-color="#8a6a1c"/></linearGradient>
  </defs>
  <path d="M30 2 Q36 2 36 8" stroke="#c9a54a" stroke-width="2.5" fill="none"/>
  <rect x="22" y="8" width="16" height="10" rx="3" fill="url(#c)" stroke="#5c4510" stroke-width="2.5"/>
  <circle cx="30" cy="42" r="24" fill="url(#o)" stroke="${P.dark}" stroke-width="3.5"/>
  <path d="M8 40 Q30 50 52 40" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none"/>
  <path d="M10 48 Q30 58 50 48" stroke="${P.dark}" stroke-opacity=".35" stroke-width="2" fill="none"/>
  <ellipse cx="21" cy="32" rx="7" ry="4.5" transform="rotate(-35 21 32)" fill="#fff" fill-opacity=".9"/>`);
}

function candyCaneSVG(px) {
  return svg('0 0 50 90', px, px * 1.8, `
  <defs><clipPath id="c"><path d="M20 86 V30 A14 14 0 0 1 48 30 V36" fill="none" stroke="#000" stroke-width="12"/></clipPath></defs>
  <path d="M20 86 V30 A14 14 0 0 1 48 30 V38" fill="none" stroke="#7d0d1d" stroke-width="15" stroke-linecap="round"/>
  <path d="M20 86 V30 A14 14 0 0 1 48 30 V38" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
  <path d="M20 86 V30 A14 14 0 0 1 48 30 V38" fill="none" stroke="#e5202f" stroke-width="10" stroke-linecap="round" stroke-dasharray="7 7"/>
  <path d="M17 80 V32" stroke="#fff" stroke-opacity=".6" stroke-width="2.5" stroke-linecap="round"/>`);
}

function bellSVG(px) {
  return svg('0 0 70 70', px, px, `
  <defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe680"/><stop offset=".45" stop-color="#f4b400"/><stop offset="1" stop-color="#9a6200"/></linearGradient></defs>
  <path d="M35 6 C20 6 16 20 16 34 C16 44 10 48 8 54 H62 C60 48 54 44 54 34 C54 20 50 6 35 6 Z" fill="url(#b)" stroke="#6b4300" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="35" cy="58" r="7" fill="#c98a00" stroke="#6b4300" stroke-width="3.5"/>
  <path d="M8 54 H62" stroke="#6b4300" stroke-width="4"/>
  <path d="M25 16 Q22 26 22 38" stroke="#fff" stroke-opacity=".75" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M30 2 Q35 -2 40 2" stroke="#e5202f" stroke-width="5" fill="none" stroke-linecap="round"/>`);
}

function starTopSVG(px) {
  const st = 'M60 6 L74 42 L112 44 L82 68 L92 106 L60 85 L28 106 L38 68 L8 44 L46 42 Z';
  return svg('0 0 120 120', px, px, `
  <defs>
    <radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff3a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffd23a" stop-opacity="0"/></radialGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbd6"/><stop offset=".45" stop-color="#ffd21f"/><stop offset="1" stop-color="#e08a00"/></linearGradient>
  </defs>
  <circle cx="60" cy="60" r="60" fill="url(#g)"/>
  <path d="${st}" fill="url(#s)" stroke="#8a5200" stroke-width="5" stroke-linejoin="round"/>
  <path d="M60 22 L68 44 L60 60 L52 44 Z" fill="#fff" fill-opacity=".55"/>`);
}

function snowmanSVG(px, eyes = true) {
  return svg('0 0 220 290', px, px * (290 / 220), `
  <defs>
    <radialGradient id="s" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#eef6ff"/><stop offset="1" stop-color="#b5cfea"/></radialGradient>
    <linearGradient id="hat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset=".5" stop-color="#d8192b"/><stop offset="1" stop-color="#7d0a16"/></linearGradient>
    <linearGradient id="sc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ec95f"/><stop offset="1" stop-color="#14702f"/></linearGradient>
    <linearGradient id="nose" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb35c"/><stop offset="1" stop-color="#e05e00"/></linearGradient>
    <radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#05102a" stop-opacity=".5"/><stop offset="1" stop-color="#05102a" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="110" cy="276" rx="80" ry="12" fill="url(#sh)"/>
  <g stroke="#5a3214" stroke-width="6" stroke-linecap="round" fill="none">
    <path d="M66 150 L20 120 M36 131 L24 110 M36 131 L13 134"/>
    <path d="M154 150 L200 114 M186 125 L196 104 M186 125 L208 128"/>
  </g>
  <circle cx="110" cy="216" r="60" fill="url(#s)" stroke="#8fb0d4" stroke-width="4"/>
  <circle cx="110" cy="146" r="45" fill="url(#s)" stroke="#8fb0d4" stroke-width="4"/>
  <g fill="#1d2433"><circle cx="110" cy="138" r="5.5"/><circle cx="110" cy="158" r="5.5"/><circle cx="110" cy="178" r="5"/><circle cx="110" cy="206" r="5.5"/></g>
  <circle cx="110" cy="76" r="37" fill="url(#s)" stroke="#8fb0d4" stroke-width="4"/>
  <path d="M74 106 Q110 122 146 106 L147 118 Q110 136 73 118 Z" fill="url(#sc)" stroke="#0b4a1c" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M126 116 L138 160 L122 158 L116 120 Z" fill="url(#sc)" stroke="#0b4a1c" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M84 110 L87 121 M99 114 L101 125 M116 114 L114 125 M132 110 L128 121 M124 132 L134 130 M126 144 L136 142" stroke="#ffffff" stroke-opacity=".7" stroke-width="4"/>
  ${eyes ? '<g fill="#1d2433"><ellipse cx="98" cy="68" rx="5" ry="6"/><ellipse cx="124" cy="68" rx="5" ry="6"/></g><g fill="#fff"><circle cx="96.5" cy="66" r="1.8"/><circle cx="122.5" cy="66" r="1.8"/></g>' : ''}
  <path d="M111 78 L146 86 Q148 88 145 90 L111 92 Z" fill="url(#nose)" stroke="#9a3c00" stroke-width="3" stroke-linejoin="round"/>
  <path d="M122 82 L124 88 M134 84 L135 89" stroke="#9a3c00" stroke-width="2"/>
  <g fill="#1d2433"><circle cx="94" cy="94" r="2.8"/><circle cx="102" cy="98" r="2.8"/><circle cx="111" cy="99" r="2.8"/><circle cx="120" cy="97" r="2.8"/></g>
  <circle cx="88" cy="84" r="7" fill="#ff9aa9" fill-opacity=".45"/><circle cx="134" cy="94" r="5" fill="#ff9aa9" fill-opacity=".35"/>
  <path d="M78 46 Q82 4 128 8 Q160 14 172 40 L160 50 Q150 30 132 30 Q104 30 100 50 Z" fill="url(#hat)" stroke="#5a0610" stroke-width="4" stroke-linejoin="round"/>
  <path d="M70 48 Q110 34 152 46 L150 58 Q110 48 73 60 Z" fill="#ffffff" stroke="#a9c3dc" stroke-width="3.5" stroke-linejoin="round"/>
  <circle cx="172" cy="46" r="13" fill="#ffffff" stroke="#a9c3dc" stroke-width="3.5"/>
  <path d="M98 18 Q112 9 128 12" stroke="#fff" stroke-opacity=".5" stroke-width="5" fill="none" stroke-linecap="round"/>`);
}

function handSVG(px) {
  const shapes = `
    <rect x="38" y="4" width="20" height="62" rx="10"/>
    <rect x="28" y="46" width="54" height="52" rx="18"/>
    <circle cx="66" cy="50" r="10"/><circle cx="76" cy="58" r="9"/>
    <ellipse cx="30" cy="70" rx="9" ry="16" transform="rotate(-28 30 70)"/>`;
  return svg('0 0 100 124', px, px * 1.24, `
  <defs><linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d7e2f0"/></linearGradient></defs>
  <g fill="none" stroke="#1b2b4a" stroke-width="9" stroke-linejoin="round">${shapes}<rect x="34" y="94" width="46" height="22" rx="6"/></g>
  <g fill="url(#h)">${shapes}</g>
  <rect x="34" y="94" width="46" height="22" rx="6" fill="#4aa3ff" stroke="#1b2b4a" stroke-width="4"/>
  <path d="M58 52 Q60 62 58 70 M68 60 Q70 66 68 72" stroke="#1b2b4a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M43 12 V40" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`);
}

function giftIconSVG(px) {
  return svg('0 0 100 100', px, px, `
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b78"/><stop offset="1" stop-color="#b30f22"/></linearGradient>
    <linearGradient id="r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e09d00"/><stop offset=".4" stop-color="#fff0a0"/><stop offset="1" stop-color="#e09d00"/></linearGradient>
  </defs>
  <rect x="16" y="44" width="68" height="46" rx="6" fill="url(#f)" stroke="#5a0610" stroke-width="4"/>
  <rect x="10" y="32" width="80" height="18" rx="5" fill="url(#f)" stroke="#5a0610" stroke-width="4"/>
  <rect x="43" y="32" width="14" height="58" fill="url(#r)"/>
  <path d="M50 32 C38 10 18 16 26 28 C30 34 44 34 50 32 Z M50 32 C62 10 82 16 74 28 C70 34 56 34 50 32 Z" fill="url(#r)" stroke="#8a5600" stroke-width="3.5" stroke-linejoin="round"/>
  <rect x="14" y="35" width="72" height="4" rx="2" fill="#fff" fill-opacity=".45"/>`);
}

// ---------- Реестр и растеризация ----------
export const ART = { sprites: new Map(), scale: 1 };

function defs() {
  const d = [];
  for (const c of COLOR_KEYS) {
    for (let dir = 0; dir < 4; dir++) d.push([`arrow_${c}_${dir}`, 110, 110, (px) => arrowSVG(c, dir, px)]);
    d.push([`boxback_${c}`, 140, 140, (px) => boxBackSVG(c, px)]);
    d.push([`boxfront_${c}`, 140, 140, (px) => boxFrontSVG(c, px)]);
    d.push([`lid_${c}`, 140, 70, (px) => lidSVG(c, px)]);
    d.push([`orn_${c}`, 60, 70, (px) => ornamentSVG(c, px)]);
  }
  d.push(['bow_gold', 100, 70, (px) => bowSVG('red', px)]);
  d.push(['bow_red', 100, 70, (px) => bowSVG('gold', px)]);
  for (let dir = 0; dir < 4; dir++) d.push([`ashadow_${dir}`, 110, 110, (px) => arrowShadowSVG(dir, px)]);
  d.push(['socket', 100, 100, socketSVG]);
  d.push(['nest', 100, 50, nestSVG]);
  d.push(['heart', 100, 96, (px) => heartSVG(px, false)]);
  d.push(['heart_empty', 100, 96, (px) => heartSVG(px, true)]);
  d.push(['coin', 100, 100, coinSVG]);
  d.push(['sparkle', 100, 100, sparkleSVG]);
  d.push(['flake0', 100, 100, (px) => snowflakeSVG(px, 0)]);
  d.push(['flake1', 100, 100, (px) => snowflakeSVG(px, 1)]);
  d.push(['flake2', 100, 100, (px) => snowflakeSVG(px, 2)]);
  d.push(['snowdot', 40, 40, snowDotSVG]);
  d.push(['holly', 140, 90, hollySVG]);
  d.push(['lock', 100, 110, lockSVG]);
  d.push(['video', 100, 70, videoBadgeSVG]);
  d.push(['wand', 100, 100, wandSVG]);
  d.push(['magnet', 100, 100, magnetSVG]);
  d.push(['snowball', 100, 100, snowballSVG]);
  d.push(['tree', 420, 580, treeSVG]);
  d.push(['candy', 50, 90, candyCaneSVG]);
  d.push(['bell', 70, 70, bellSVG]);
  d.push(['startop', 120, 120, starTopSVG]);
  d.push(['snowman', 220, 290, (px) => snowmanSVG(px, true)]);
  d.push(['snowman_noeyes', 220, 290, (px) => snowmanSVG(px, false)]);
  d.push(['hand', 100, 124, handSVG]);
  d.push(['gift', 100, 100, giftIconSVG]);
  for (const k of Object.keys(ICONS)) d.push([`i_${k}`, 100, 100, (px) => iconSVG(k, px)]);
  return d;
}

// Желаемый размер спрайта на экране (в дизайн-единицах) — чтобы не растить лишние пиксели
const DISPLAY = {
  arrow: 120, ashadow: 120, boxback: 170, boxfront: 170, lid: 170, bow: 110, orn: 50,
  socket: 100, nest: 90, heart: 60, heart_empty: 60, coin: 70, sparkle: 70, flake0: 40, flake1: 40, flake2: 40,
  snowdot: 24, holly: 130, lock: 60, video: 60, wand: 90, magnet: 90, snowball: 90, tree: 520, candy: 40,
  bell: 50, startop: 110, snowman: 230, snowman_noeyes: 230, hand: 110, gift: 90,
};

async function rasterize(svgText, w, h) {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export async function buildArt(scale, onProgress) {
  ART.scale = scale;
  const list = defs();
  const out = new Map();
  let done = 0;
  const jobs = list.map(async ([name, w, h, fn]) => {
    const key = name.split('_')[0] === 'i' ? null : name.split('_')[0];
    const disp = name.startsWith('i_') ? 70 : DISPLAY[key] || DISPLAY[name] || Math.max(w, h);
    const k = (disp / Math.max(w, h)) * scale;
    const pxW = Math.max(8, w * k);
    const svgText = fn(Math.round(pxW));
    const canvas = await rasterize(svgText, pxW, h * k);
    out.set(name, { canvas, w, h });
    done++;
    if (onProgress) onProgress(done / list.length);
  });
  await Promise.all(jobs);
  ART.sprites = out;
}

export async function buildShelf(width, scale) {
  const c = await rasterize(shelfSVG(width, scale), width * scale, 130 * scale);
  ART.sprites.set('shelf', { canvas: c, w: width, h: 130 });
}

export function spr(name) {
  return ART.sprites.get(name);
}

// Рисует спрайт с центром в (x, y), шириной w (высота по пропорции)
export function drawSprite(ctx, name, x, y, w, opts) {
  const s = ART.sprites.get(name);
  if (!s) return;
  const h = (w * s.h) / s.w;
  const rot = opts && opts.rot;
  const alpha = opts && opts.alpha != null ? opts.alpha : 1;
  const sx = opts && opts.sx != null ? opts.sx : 1;
  const sy = opts && opts.sy != null ? opts.sy : 1;
  const ay = opts && opts.ay != null ? opts.ay : 0.5;
  if (alpha <= 0) return;
  ctx.save();
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  ctx.drawImage(s.canvas, -w / 2, -h * ay, w, h);
  ctx.restore();
}
