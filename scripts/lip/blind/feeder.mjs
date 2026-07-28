/**
 * SYNOPSIS: PARTITION: Feeder only — streams real historical ticks/posts in time order.
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * PARTITION: Feeder only — streams real historical ticks/posts in time order.
 * Reader must NEVER import candle futures from this module's buffers.
 */
export function createFeeder(timeline) {
  const sorted = [...timeline].sort((a, b) => a.ts - b.ts);
  let i = 0;
  return {
    peek() {
      return i < sorted.length ? sorted[i] : null;
    },
    next() {
      if (i >= sorted.length) return null;
      return sorted[i++];
    },
    remaining() {
      return sorted.length - i;
    },
    total() {
      return sorted.length;
    },
  };
}
