/**
 * SYNOPSIS: Safe JS sanitize for builder execute-batch (Q-002).
 * Judgment lives here (scripts/lib — SO-001 allowed). Routes only call these.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

/**
 * Strip groq_llama "const " + asterisk + "rk = …" hallucinations without touching
 * regex/string star-identifiers. Old global star-before-any-ident rewrite destroyed
 * meaning (e.g. /foo star bar/ became /foobar/).
 */
export function fixAsteriskShorthandParams(s) {
  let out = String(s ?? '');
  out = out.replace(/\b(const|let|var)(\s+)\*([A-Za-z_$][\w$]*)/g, '$1$2$3');
  out = out.replace(/([(,]\s*)\*([A-Za-z_$][\w$]*)(\s*[,)=])/g, '$1$2$3');
  return out;
}

/**
 * True when a line looks like the start of real JS/ESM (includes shebang).
 */
export function isJavaScriptCodeStartLine(line = '') {
  const t = String(line).trim();
  if (!t) return false;
  if (/^#!/.test(t)) return true;
  if (/^(import|export)\s/.test(t)) return true;
  if (/^(const|let|var)\s+[$A-Z_a-z]/.test(t)) return true;
  if (/^(async\s+)?function\s+[$A-Z_a-z]/.test(t)) return true;
  if (/^function\s*\*/.test(t)) return true;
  if (/^(class)\s+[$A-Z_a-z]/.test(t)) return true;
  if (/^(if|for|while|switch|try)\s*\(/.test(t)) return true;
  if (/^(\/\/|\/\*|\{|\(|\[)/.test(t)) return true;
  if (/^[$A-Z_a-z][\w$]*\s*=/.test(t)) return true;
  return false;
}

/**
 * Preserve leading shebang + trailing newline while trimming other edge whitespace.
 */
export function finalizeExtractedJavaScript(text, { hadTrailingNewline = false } = {}) {
  let s = String(text ?? '');
  const shebang = s.match(/^#![^\n]*\n/);
  let body = shebang ? s.slice(shebang[0].length) : s;
  body = body.replace(/^\s+/, '').replace(/\s+$/, '');
  s = (shebang ? shebang[0] : '') + body;
  if (hadTrailingNewline && s.length && !s.endsWith('\n')) s += '\n';
  return s;
}
