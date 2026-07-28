// main.js — application entry point. Keep this file tiny: it only wires
// together modules that each own a single responsibility.

import { initRouter } from './router.js';
import { initLegend } from './legend.js';

initLegend(document.getElementById('legend'));
initRouter();
