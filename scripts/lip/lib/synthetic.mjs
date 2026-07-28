/**
 * SYNOPSIS: Exports mulberry32 — scripts/lip/lib/synthetic.mjs.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 */
export function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate hourly bars with injected pump-and-dumps. */
export function generateSyntheticPumps(opts = {}) {
  const days = opts.days ?? 180;
  const hours = days * 24;
  const rng = mulberry32(opts.seed ?? 42);
  const bars = [];
  let price = 1;
  const pumpStarts = [];
  const pumpCount = opts.pumpCount ?? Math.floor(days / 3.5);
  for (let p = 0; p < pumpCount; p++) {
    pumpStarts.push(48 + Math.floor(rng() * (hours - 96)));
  }
  pumpStarts.sort((a, b) => a - b);

  for (let i = 0; i < hours; i++) {
    let ret = (rng() - 0.5) * 0.008;
    let vol = 800 + rng() * 400;
    for (const start of pumpStarts) {
      const dt = i - start;
      if (dt === 0) {
        ret = 0.1 + rng() * 0.08;
        vol = 12000 + rng() * 8000;
      } else if (dt >= 1 && dt <= 5) {
        ret = 0.06 + rng() * 0.1;
        vol = 9000 + rng() * 6000;
      } else if (dt >= 6 && dt <= 16) {
        ret = -0.05 - rng() * 0.07;
        vol = 5000 + rng() * 3000;
      }
    }
    price = Math.max(0.01, price * (1 + ret));
    bars.push({ t: i, close: price, volume: vol });
  }
  return bars;
}
