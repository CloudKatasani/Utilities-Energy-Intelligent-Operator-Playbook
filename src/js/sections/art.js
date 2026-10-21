// Inline line-art illustrations (industry hero art, chosen by industry.json → heroArt). Colours come
// from CSS classes (.art-*), never from script.

function tower(x, base, h) {
  const w = h * 0.22;
  const top = base - h;
  return `<g class="art-line">
    <path d="M${x - w} ${base} L${x - w * 0.18} ${top} L${x + w * 0.18} ${top} L${x + w} ${base}"/>
    <path d="M${x - w * 0.72} ${base - h * 0.3} L${x + w * 0.72} ${base - h * 0.3} M${x - w * 0.45} ${base - h * 0.62} L${x + w * 0.45} ${base - h * 0.62}"/>
    <path d="M${x - w * 0.72} ${base - h * 0.3} L${x + w * 0.45} ${base - h * 0.62} M${x + w * 0.72} ${base - h * 0.3} L${x - w * 0.45} ${base - h * 0.62}"/>
    <path d="M${x - w * 1.5} ${top + h * 0.12} L${x + w * 1.5} ${top + h * 0.12} M${x - w * 1.1} ${top + h * 0.26} L${x + w * 1.1} ${top + h * 0.26}"/>
  </g>`;
}

function catenary(x1, x2, y, sag) {
  const mx = (x1 + x2) / 2;
  return `<path class="art-wire" d="M${x1} ${y} Q${mx} ${y + sag} ${x2} ${y}"/>`;
}

function turbine(x, base, h, rot) {
  const hub = base - h;
  const blade = h * 0.42;
  const blades = [0, 120, 240].map((a) => {
    const r = ((a + rot) * Math.PI) / 180;
    return `M${x} ${hub} L${(x + blade * Math.sin(r)).toFixed(1)} ${(hub - blade * Math.cos(r)).toFixed(1)}`;
  }).join(' ');
  return `<g class="art-line"><path d="M${x - 3} ${base} L${x - 1.2} ${hub} L${x + 1.2} ${hub} L${x + 3} ${base}"/><path class="art-accent" d="${blades}"/><circle cx="${x}" cy="${hub}" r="2.6"/></g>`;
}

function solar(x, base, n) {
  let s = '';
  for (let i = 0; i < n; i += 1) {
    const px = x + i * 44;
    s += `<path d="M${px} ${base - 6} L${px + 36} ${base - 6} L${px + 30} ${base - 26} L${px - 6} ${base - 26} Z M${px + 15} ${base - 6} L${px + 15} ${base}"/><path d="M${px + 12} ${base - 26} L${px + 18} ${base - 6} M${px} ${base - 16} L${px + 33} ${base - 16}"/>`;
  }
  return `<g class="art-line">${s}</g>`;
}

function substation(x, base) {
  return `<g class="art-line">
    <rect x="${x}" y="${base - 70}" width="150" height="70" rx="2" class="art-dash"/>
    <path d="M${x + 20} ${base} L${x + 20} ${base - 52} M${x + 50} ${base} L${x + 50} ${base - 52} M${x + 10} ${base - 52} L${x + 60} ${base - 52}"/>
    <rect x="${x + 78}" y="${base - 40}" width="34" height="40"/><path d="M${x + 84} ${base - 40} v-10 M${x + 95} ${base - 40} v-14 M${x + 106} ${base - 40} v-10"/>
    <path d="M${x + 122} ${base} L${x + 122} ${base - 46} M${x + 138} ${base} L${x + 138} ${base - 46} M${x + 116} ${base - 46} L${x + 144} ${base - 46}"/>
  </g>`;
}

export function heroArt() {
  const base = 470;
  const towers = [[120, 230], [380, 260], [660, 250], [940, 240]];
  const wires = towers.slice(0, -1).map(([x, h], i) => {
    const [x2, h2] = towers[i + 1];
    return [0.12, 0.26].map((f) => catenary(x + h * 0.22 * 1.4, x2 - h2 * 0.22 * 1.4, base - Math.min(h, h2) * (1 - f), 26)).join('');
  }).join('');
  const nodes = [[260, 150], [520, 110], [800, 160], [1080, 120], [1300, 190], [1180, 300], [600, 280]];
  const links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2], [6, 1], [6, 5]];
  const flow = links.map(([a, b]) => `<path class="art-flow" d="M${nodes[a][0]} ${nodes[a][1]} L${nodes[b][0]} ${nodes[b][1]}"/>`).join('')
    + nodes.map(([x, y]) => `<circle class="art-node" cx="${x}" cy="${y}" r="4"/>`).join('');
  return `<svg class="hero-art" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <g class="art-grid-dots">${Array.from({ length: 18 }, (_, i) => `<path d="M0 ${i * 30} H1440"/>`).join('')}</g>
    ${flow}
    ${towers.map(([x, h]) => tower(x, base, h)).join('')}${wires}
    ${substation(1010, base)}
    ${turbine(1220, base, 210, 10)}${turbine(1300, base, 170, 50)}${turbine(1375, base, 190, 85)}
    ${solar(430, base, 4)}
    <path class="art-horizon" d="M0 ${base} H1440"/>
    <path class="art-gas" d="M0 ${base + 26} H1440"/>
    <g class="art-line"><path d="M300 ${base} v26 M820 ${base} v26 M1180 ${base} v26"/><circle cx="300" cy="${base + 26}" r="3"/><circle cx="820" cy="${base + 26}" r="3"/><circle cx="1180" cy="${base + 26}" r="3"/></g>
  </svg>`;
}

// Small illustrations for the three Why-now rows.
export function whyArt(kind) {
  if (kind === 'world') {
    return `<svg class="why-art" viewBox="0 0 240 140" aria-hidden="true" focusable="false">
      <g class="art-line"><rect x="20" y="40" width="70" height="80" rx="3"/><path d="M30 56h50M30 72h50M30 88h50M30 104h50"/><circle cx="74" cy="56" r="2"/><circle cx="74" cy="72" r="2"/>
      <path d="M120 120V70l25-18 25 18v50M135 120V95h20v25"/><rect x="180" y="96" width="44" height="18" rx="6"/><circle cx="190" cy="118" r="5"/><circle cx="214" cy="118" r="5"/></g>
      <path class="art-flow" d="M90 60 C110 30 150 30 170 52"/><path class="art-accent" d="M196 70l-6 10h8l-6 10"/></svg>`;
  }
  if (kind === 'system') {
    return `<svg class="why-art" viewBox="0 0 240 140" aria-hidden="true" focusable="false">
      <g class="art-line"><path d="M40 120 52 40h8l12 80M44 92h24M48 64h16"/><path d="M60 42 Q120 70 180 46"/><path d="M172 120 182 46h8l10 74"/></g>
      <path class="art-accent" d="M120 20c10 12-6 18 2 30 4-6 10-8 10-16 6 8 6 22-8 28-14-4-14-24-4-42z"/>
      <path class="art-flow" d="M20 30c20-10 30 10 50 0s30 10 50 0"/></svg>`;
  }
  return `<svg class="why-art" viewBox="0 0 240 140" aria-hidden="true" focusable="false">
    <g class="art-line"><rect x="20" y="30" width="56" height="36" rx="4"/><rect x="92" y="30" width="56" height="36" rx="4"/><rect x="164" y="30" width="56" height="36" rx="4"/>
    <rect x="56" y="90" width="56" height="36" rx="4"/><rect x="128" y="90" width="56" height="36" rx="4"/></g>
    <g class="art-small"><text x="48" y="53" text-anchor="middle">CIS</text><text x="120" y="53" text-anchor="middle">OMS</text><text x="192" y="53" text-anchor="middle">GIS</text><text x="84" y="113" text-anchor="middle">EAM</text><text x="156" y="113" text-anchor="middle">OT</text></g>
    <path class="art-flow" d="M48 66 84 90M120 66 84 90M120 66 156 90M192 66 156 90"/></svg>`;
}
