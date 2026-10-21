// Header, hero, 01 Why now, the closing panel and the footer.
import { D, IDX, esc, rich, attr, sectionHead } from '../core/util.js';
import { icon } from '../core/icons.js';
import { heroArt, whyArt } from './art.js';

export function renderTopbar() {
  const b = D.brand;
  return `<div class="topbar-inner">
    <a class="practice" href="#/" aria-label="${attr(b.practice)} — home"><span class="pmark" aria-hidden="true"><i></i><i></i></span><span>${esc(b.practice)}</span></a>
    <nav class="nav" aria-label="Sections">${D.site.nav.map((n) => `<a href="#/${n.id}" data-nav="${n.id}"><span>${n.num}</span> ${esc(n.label)}</a>`).join('')}</nav>
    <button class="menu-btn" id="menu-btn" aria-haspopup="true" aria-expanded="false" aria-label="Presenter menu">${icon('dots')}</button>
    <span class="logo">${b.logo ? `<img src="${b.logo}" alt="${attr(b.name)}">` : `<span class="wordmark">${esc(b.name)}</span>`}</span>
  </div>`;
}

export function renderHero() {
  const h = D.site.hero;
  return `<section id="top" class="hero">
    ${heroArt()}
    <div class="wrap hero-inner">
      <p class="kicker" data-edit="site.hero.kicker">${esc(h.kicker)}</p>
      <h1 data-edit="site.hero.title">${esc(h.title)}</h1>
      <p class="hero-lede" data-edit="site.hero.lede">${esc(h.lede)}</p>
      <div class="hero-ctas">${h.ctas.map((c, i) => `<a class="btn ${i ? 'ghost-dark' : 'primary'}" href="${c.route}">${esc(c.label)}</a>`).join('')}</div>
      <p class="hero-meta">${rich(h.meta)}</p>
    </div>
  </section>`;
}

function signal(s) {
  const src = IDX.sources[s.source];
  const src2 = s.source2 ? IDX.sources[s.source2] : null;
  const cite = (x) => `<span class="cite" data-tip="${attr(`${x.label}. Checked ${x.checked}. ${x.url}`)}" tabindex="0">${esc(x.label)}</span>`;
  return `<div class="signal"><b class="stat">${esc(s.stat)}</b><p>${rich(s.text)}</p><p class="src">Source: ${cite(src)}${src2 ? ` · ${cite(src2)}` : ''} <span class="pill">published</span></p></div>`;
}

export function renderWhy() {
  const w = D.site.why;
  return `<section id="why" class="section dark why-section">
    <div class="wrap">
      ${sectionHead(w.kicker, w.headline, '', { dark: true, edit: 'site.why.headline' })}
      <div class="why-rows">${w.rows.map((r) => `<div class="why-row">${whyArt(r.art)}<div><b>${esc(r.title)}</b><p>${esc(r.text)}</p></div></div>`).join('')}</div>
      <div class="why-cards">${w.cards.map((c) => `<article class="why-card"><header><span class="why-num">${c.num}</span><h3>${esc(c.title)}</h3></header>${c.signals.map(signal).join('')}</article>`).join('')}</div>
      <p class="why-closing" data-edit="site.why.closing">${esc(w.closing)}</p>
      <p class="muted-dark small">${esc(D.sources.note)}</p>
    </div>
  </section>`;
}

export function renderClosing() {
  const c = D.site.closing;
  return `<section class="section dark closing"><div class="wrap"><h2 data-edit="site.closing.title">${esc(c.title)}</h2><p>${esc(c.text)}</p><a class="btn primary" href="${c.cta.route}">${esc(c.cta.label)}</a></div></section>`;
}

export function renderFooter() {
  const f = D.site.footer;
  return `<div class="wrap footer-inner"><span>${esc(D.site.meta.title)} · v${esc(D.build.version)} · ${esc(f.version)}</span><span>${esc(D.industry.synthetic.disclosure)}</span><span>${esc(f.owner)}</span><span>${esc(f.privacy)}</span></div>`;
}

