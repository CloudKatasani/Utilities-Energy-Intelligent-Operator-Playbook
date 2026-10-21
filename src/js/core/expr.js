// A small, safe arithmetic expression language for calculator formulas (spec C2).
// Formulas live in calculator.json as strings, e.g. "stormOm * lever * 1e-6".
// Grammar:  expr  := term (('+' | '-') term)*
//           term  := power (('*' | '/') power)*
//           power := unary ('^' unary)?
//           unary := '-' unary | primary
//           primary := number | identifier | identifier '(' args ')' | '(' expr ')'
// No property access, no strings, no assignment: nothing in a formula can reach the page.
// Unknown identifiers and functions fail when compiled against a scope (validate) and when evaluated.

const FUNCS = {
  min: Math.min,
  max: Math.max,
  round: (x, d = 0) => { const p = 10 ** d; return Math.round(x * p) / p; },
  clamp: (x, lo, hi) => Math.min(hi, Math.max(lo, x)),
};

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    const num = src.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i);
    if (num) { out.push({ t: 'num', v: parseFloat(num[0]) }); i += num[0].length; continue; }
    const id = src.slice(i).match(/^[A-Za-z_]\w*/);
    if (id) { out.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
    if ('+-*/^(),'.includes(ch)) { out.push({ t: ch }); i += 1; continue; }
    throw new Error(`Unexpected "${ch}" at ${i} in "${src}"`);
  }
  return out;
}

export function parse(src) {
  const toks = tokenize(String(src));
  let p = 0;
  const peek = () => toks[p]?.t;
  const eat = (t) => { if (peek() !== t) throw new Error(`Expected "${t}" in "${src}"`); p += 1; };
  const expr = () => {
    let n = term();
    while (peek() === '+' || peek() === '-') { const op = toks[p++].t; n = { op, a: n, b: term() }; }
    return n;
  };
  const term = () => {
    let n = power();
    while (peek() === '*' || peek() === '/') { const op = toks[p++].t; n = { op, a: n, b: power() }; }
    return n;
  };
  const power = () => {
    const n = unary();
    if (peek() === '^') { p += 1; return { op: '^', a: n, b: unary() }; }
    return n;
  };
  const unary = () => {
    if (peek() === '-') { p += 1; return { op: 'neg', a: unary() }; }
    return primary();
  };
  const primary = () => {
    const tk = toks[p];
    if (!tk) throw new Error(`Unexpected end of "${src}"`);
    if (tk.t === 'num') { p += 1; return { num: tk.v }; }
    if (tk.t === '(') { p += 1; const n = expr(); eat(')'); return n; }
    if (tk.t === 'id') {
      p += 1;
      if (peek() === '(') {
        p += 1;
        const args = [];
        if (peek() !== ')') { args.push(expr()); while (peek() === ',') { p += 1; args.push(expr()); } }
        eat(')');
        if (!FUNCS[tk.v]) throw new Error(`Unknown function "${tk.v}" in "${src}"`);
        return { fn: tk.v, args };
      }
      return { id: tk.v };
    }
    throw new Error(`Unexpected "${tk.t}" in "${src}"`);
  };
  const ast = expr();
  if (p !== toks.length) throw new Error(`Unexpected "${toks[p].t}" in "${src}"`);
  return ast;
}

export function identifiers(ast, acc = new Set()) {
  if (ast.id) acc.add(ast.id);
  if (ast.a) identifiers(ast.a, acc);
  if (ast.b) identifiers(ast.b, acc);
  if (ast.args) ast.args.forEach((x) => identifiers(x, acc));
  return acc;
}

export function evaluate(ast, scope) {
  if ('num' in ast) return ast.num;
  if (ast.id) {
    if (!Object.prototype.hasOwnProperty.call(scope, ast.id)) throw new Error(`Unknown identifier "${ast.id}"`);
    return Number(scope[ast.id]);
  }
  if (ast.fn) return FUNCS[ast.fn](...ast.args.map((x) => evaluate(x, scope)));
  const a = evaluate(ast.a, scope);
  if (ast.op === 'neg') return -a;
  const b = evaluate(ast.b, scope);
  switch (ast.op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b === 0 ? 0 : a / b;
    case '^': return a ** b;
    default: throw new Error(`Bad operator ${ast.op}`);
  }
}

const cache = new Map();
// Compile once; `allowed` (optional) is the list of identifiers the formula may use.
export function compile(src, allowed) {
  if (!cache.has(src)) cache.set(src, parse(src));
  const ast = cache.get(src);
  if (allowed) {
    const unknown = [...identifiers(ast)].filter((x) => !allowed.includes(x));
    if (unknown.length) throw new Error(`Unknown identifier(s) ${unknown.join(', ')} in "${src}"`);
  }
  return (scope) => evaluate(ast, scope);
}
