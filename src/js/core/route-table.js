// Every deep-linkable route and its layer kind. main.js attaches the handlers; validate-content.mjs
// checks that every route written in content (run sheets, CTAs, cards) matches one of these.
export const ROUTES = [
  ['/', 'section'], ['/why', 'section'], ['/future', 'section'], ['/accelerate', 'section'], ['/impact', 'section'], ['/proof', 'section'],
  ['/explorer', 'section'], ['/calculator', 'section'], ['/readiness', 'section'], ['/impact/readiness', 'section'], ['/accelerate/:motion', 'section'],
  ['/outcome/:id', 'drawer'], ['/domain/:id', 'drawer'], ['/area/:id', 'drawer'], ['/subarea/:id', 'drawer'], ['/family/:id', 'drawer'],
  ['/agent/:id', 'drawer'], ['/layer/:id', 'drawer'], ['/control-plane', 'drawer'], ['/dp/:id', 'drawer'],
  ['/agent/:id/full', 'full'], ['/agent/:id/run', 'full'], ['/dp/:id/full', 'full'],
  ['/offerings', 'page'], ['/offering/:id', 'page'], ['/offering/:id/:opt', 'page'], ['/offering/:id/:opt/box/:box', 'drawer'],
  ['/scenarios', 'page'], ['/scenario/:id', 'page'], ['/cases', 'page'], ['/briefing', 'page'],
];

export const routeRe = (pattern) => new RegExp(`^${pattern.replace(/:(\w+)/g, '([^/]+)')}$`);
