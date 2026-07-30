// flags.js — turns a post's flag fields into a flag image URL.
//
// 4chan's API gives us up to three different flag fields depending on the
// board:
//   - `country` / `country_name`   real countries (e.g. /pol/, /sp/), plus
//                                   a couple of quasi-countries (EU, UN)
//   - `troll_country`               joke flags (/pol/, /bant/): pirate,
//                                   kekistan, commie, lgbt, etc — not real
//                                   ISO codes, 4chan has no high-res source
//   - `board_flag` / `flag_name`    board-specific flag sets (e.g. /vt/)
//
// For real ISO country codes we use flagcdn.com, a free flag CDN with much
// crisper artwork than 4chan's tiny native icons. Anything that isn't a
// plain ISO code (troll flags, board flags, EU/UN) falls back to 4chan's
// own flag image, still routed through the proxy — there's no equivalent
// high-res source for those, so this is the practical stopping point.

import { proxied } from './config.js';

// ISO 3166-1 alpha-2 codes flagcdn.com actually serves. 4chan reuses this
// codespace for real countries, so anything in this set gets the nicer CDN.
const ISO_CODES = new Set(
  ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW ' +
    'BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI ' +
    'FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN ' +
    'IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME ' +
    'MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF ' +
    'PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV ' +
    'SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE ' +
    'YT ZA ZM ZW').split(' '),
);

/** Given a raw 4chan post, return `{ url, alt }` for its flag, or null if it has none. */
export function resolveFlag(post, board) {
  if (post.board_flag) {
    return {
      url: proxied(`https://s.4cdn.org/image/flags/${board}/${post.board_flag}.gif`),
      alt: post.flag_name || post.board_flag,
    };
  }

  if (post.troll_country) {
    return {
      url: proxied(`https://s.4cdn.org/image/country/troll/${post.troll_country.toLowerCase()}.gif`),
      alt: post.country_name || post.troll_country,
    };
  }

  if (post.country) {
    const code = post.country.toUpperCase();
    if (code !== 'XX' && ISO_CODES.has(code)) {
      return { url: `https://flagcdn.com/w40/${code.toLowerCase()}.png`, alt: post.country_name || code };
    }
    // Non-ISO 4chan codes (EU, UN, A1, ...): no flagcdn equivalent.
    return {
      url: proxied(`https://s.4cdn.org/image/country/${post.country.toLowerCase()}.gif`),
      alt: post.country_name || post.country,
    };
  }

  return null;
}
