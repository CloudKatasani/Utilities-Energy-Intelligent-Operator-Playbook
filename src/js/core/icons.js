// Mini line icons (single colour, currentColor), in the board's 31 px style.
const P = {
  turbine: '<path d="M12 12v10M9 22h6"/><circle cx="12" cy="10" r="1.6"/><path d="M12 8.4V2.5M13.4 10.8l5 2.9M10.6 10.8l-5 2.9"/>',
  tower: '<path d="M8 22 12 2l4 20M9.3 15h5.4M10.2 9.5h3.6M5 6h14M6 6l6 4 6-4"/>',
  meter: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 9h8M12 13l3-2"/><circle cx="12" cy="14" r="3.2"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9.2c-.6-1-1.7-1.5-3-1.5-1.8 0-3 .9-3 2.2 0 3 6 1.6 6 4.4 0 1.3-1.3 2.2-3 2.2-1.4 0-2.5-.6-3.1-1.6M12 6v1.7M12 16.6v1.6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"/><path d="M5 19 13 11"/>',
  plug: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  scale: '<path d="M12 3v18M5 21h14M4 7h16M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  prev: '<path d="m15 5-7 7 7 7"/>',
  dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-1.5 2-2 4-2 6 0 5 3 9 7 9z"/>',
  gas: '<path d="M4 20h16M7 20V9l5-5 5 5v11M10 14h4"/>',
};

export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${P[name] || P.dots}</svg>`;
}
