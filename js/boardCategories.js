// boardCategories.js — 4chan's public API doesn't expose board categories,
// so this is a small static map (mirroring the grouping shown on 4chan's
// own front page) used purely to organize the board-picker autocomplete.

export const CATEGORIES = {
  '3': 'Creative', a: 'Japanese Culture', aco: 'Adult', adv: 'Interests', an: 'Interests', bant: 'Misc',
  biz: 'Interests', c: 'Japanese Culture', cgl: 'Japanese Culture', ck: 'Interests', cm: 'Japanese Culture',
  co: 'Interests', d: 'Adult', diy: 'Creative', e: 'Adult', f: 'Misc', fa: 'Interests', fit: 'Interests',
  g: 'Interests', gd: 'Creative', gif: 'Adult', h: 'Adult', hc: 'Adult', his: 'Interests', hm: 'Adult',
  hr: 'Adult', i: 'Creative', ic: 'Creative', int: 'Interests', jp: 'Japanese Culture', k: 'Interests',
  lgbt: 'Interests', lit: 'Interests', m: 'Japanese Culture', mlp: 'Japanese Culture', mu: 'Interests',
  n: 'Interests', news: 'Misc', o: 'Interests', out: 'Interests', p: 'Creative', po: 'Creative',
  pol: 'Misc', pw: 'Interests', qst: 'Japanese Culture', r: 'Adult', r9k: 'Misc', s: 'Adult', s4s: 'Misc',
  sci: 'Interests', soc: 'Adult', sp: 'Interests', t: 'Adult', tg: 'Interests', toy: 'Interests',
  trash: 'Misc', trv: 'Interests', tv: 'Interests', u: 'Adult', v: 'Video Games', vg: 'Video Games',
  vip: 'Misc', vm: 'Video Games', vmg: 'Video Games', vp: 'Video Games', vr: 'Video Games',
  vrpg: 'Video Games', vst: 'Video Games', vt: 'Japanese Culture', w: 'Japanese Culture', wg: 'Creative',
  wsg: 'Creative', wsr: 'Adult', x: 'Interests', xs: 'Interests', y: 'Adult',
};

export const CATEGORY_ORDER = [
  'Japanese Culture',
  'Video Games',
  'Interests',
  'Creative',
  'Adult',
  'Misc',
  'Other',
];

export function categoryFor(boardCode) {
  return CATEGORIES[boardCode] || 'Other';
}
