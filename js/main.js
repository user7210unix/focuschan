// main.js — application entry point. Keep this file tiny: it only wires
// together modules that each own a single responsibility.

import { initRouter } from './router.js';
import { initLegend } from './legend.js';
import { initTheme } from './theme.js';
import { initLightbox } from './lightbox.js';
import { initEmbedViewer } from './embedViewer.js';
import { initFavicon } from './pageMeta.js';

initTheme();
initFavicon();
initLightbox();
initEmbedViewer();
initLegend(document.getElementById('legend'));
initRouter();
