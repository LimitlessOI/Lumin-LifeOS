/**
 * SYNOPSIS: Exports greet — public/factory-demo-widget.mjs.
 */
export function greet(name = 'world') {
  return { message: `Hello ${name}`, ok: true };
}
