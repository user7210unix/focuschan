// navIndicator.js — the slim right-edge indicator showing roughly where
// the reader is in the thread: a few dots, with the focused reply's
// number labeled beside its dot.

const WINDOW = 3; // how many replies to show on either side of focus

export function createNavIndicator(root) {
  root.innerHTML = '<div class="nav-indicator__track"></div>';
  const track = root.querySelector('.nav-indicator__track');

  function update(focusIndex, items) {
    track.innerHTML = '';
    const start = Math.max(0, focusIndex - WINDOW);
    const end = Math.min(items.length - 1, focusIndex + WINDOW);

    for (let i = start; i <= end; i++) {
      const dist = Math.abs(i - focusIndex);
      const isActive = i === focusIndex;

      const dot = document.createElement('div');
      dot.className = `nav-dot${isActive ? ' nav-dot--active' : ''}`;
      dot.style.opacity = String(Math.max(0.2, 1 - dist * 0.28));

      if (isActive) {
        const label = document.createElement('span');
        label.className = 'nav-dot__label';
        label.textContent = String(items[i].postNo);
        dot.appendChild(label);
      }

      track.appendChild(dot);
    }
  }

  return { update };
}
