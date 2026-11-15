// Сохранение прогресса: localStorage + облако ВК (берём более продвинутое).
import { VK } from './vk.js';

const KEY = 'strelki_ny_save';

export function defaultSave() {
  return {
    v: 1,
    level: 1,
    coins: 100,
    boosters: { hint: 2, magnet: 1, snowball: 2 },
    sound: true,
    music: true,
    daily: { last: '', streak: 0 },
    decor: 0, // сколько игрушек уже показано на ёлке
    favAsked: false,
    lastAd: 0,
    ts: 0,
  };
}

export const SAVE = { data: defaultSave() };

function merge(base, extra) {
  const out = { ...base, ...extra };
  out.boosters = { ...base.boosters, ...(extra.boosters || {}) };
  out.daily = { ...base.daily, ...(extra.daily || {}) };
  return out;
}

function parse(str) {
  try {
    const d = JSON.parse(str);
    return d && typeof d === 'object' ? d : null;
  } catch (e) {
    return null;
  }
}

export async function loadSave() {
  let local = null;
  try { local = parse(localStorage.getItem(KEY)); } catch (e) { /* приватный режим */ }
  const cloud = parse(await VK.storageGet(KEY));
  let best = local;
  if (cloud && (!best || (cloud.level || 0) > (best.level || 0) || ((cloud.level || 0) === (best.level || 0) && (cloud.ts || 0) > (best.ts || 0)))) best = cloud;
  SAVE.data = merge(defaultSave(), best || {});
  return SAVE.data;
}

let timer = null;
export function persist(now = false) {
  SAVE.data.ts = Date.now();
  const write = () => {
    timer = null;
    const str = JSON.stringify(SAVE.data);
    try { localStorage.setItem(KEY, str); } catch (e) { /* ignore */ }
    VK.storageSet(KEY, str);
  };
  if (now) { if (timer) clearTimeout(timer); write(); return; }
  if (!timer) timer = setTimeout(write, 600);
}
