/**
 * SYNOPSIS: Exports renderStrategyPanel — services/site-builder-editor-strategy.js.
 */
const SCORE_MIN = 0;
const SCORE_MAX = 10;

function htmlEscape(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function normalizeTextList(value) {
  const values = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];

  return values
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0);
}

function getScore(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return null;
  }

  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, score));
}

function formatScore(score) {
  if (score === null) {
    return '';
  }

  return Number.isInteger(score) ? String(score) : String(Number(score.toFixed(1)));
}

function renderPlaceholder() {
  return [
    '<section class="strategy-panel strategy-panel--empty">',
    '<p>Competitor analysis will appear here once your benchmark runs</p>',
    '</section>',
  ].join('');
}

function renderList(title, items, className) {
  const renderedItems = items
    .map((item) => `<li>${htmlEscape(item)}</li>`)
    .join('');

  return [
    `<div class="${className}">`,
    `<h5>${title}</h5>`,
    `<ul>${renderedItems}</ul>`,
    '</div>',
  ].join('');
}

function renderScore(score) {
  if (score === null) {
    return [
      '<div class="strategy-competitor-card__score strategy-competitor-card__score--empty">',
      '<div class="strategy-competitor-card__score-label">',
      '<span>Score</span>',
      '<strong>Not scored</strong>',
      '</div>',
      '<div class="strategy-competitor-card__score-bar" aria-label="Score unavailable">',
      '<span style="width: 0%"></span>',
      '</div>',
      '</div>',
    ].join('');
  }

  const formattedScore = formatScore(score);
  const width = score * 10;

  return [
    '<div class="strategy-competitor-card__score">',
    '<div class="strategy-competitor-card__score-label">',
    '<span>Score</span>',
    `<strong>${formattedScore}/10</strong>`,
    '</div>',
    `<div class="strategy-competitor-card__score-bar" role="meter" aria-label="Score ${formattedScore} out of 10" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${formattedScore}">`,
    `<span style="width: ${width}%"></span>`,
    '</div>',
    '</div>',
  ].join('');
}

function renderCompetitorCard(competitor) {
  const name = normalizeText(competitor?.name);
  const category = normalizeText(competitor?.category);
  const score = getScore(competitor?.score);
  const strengths = normalizeTextList(competitor?.strengths);
  const weaknesses = normalizeTextList(competitor?.weaknesses);

  return [
    '<article class="strategy-competitor-card">',
    '<header class="strategy-competitor-card__header">',
    name ? `<h4>${htmlEscape(name)}</h4>` : '',
    category ? `<span class="strategy-competitor-card__category">${htmlEscape(category)}</span>` : '',
    '</header>',
    renderScore(score),
    '<div class="strategy-competitor-card__details">',
    renderList('Strengths', strengths, 'strategy-competitor-card__strengths'),
    renderList('Weaknesses', weaknesses, 'strategy-competitor-card__weaknesses'),
    '</div>',
    '</article>',
  ].join('');
}

function groupCompetitorsByCategory(competitors) {
  const lanes = new Map();

  competitors.forEach((competitor) => {
    const category = normalizeText(competitor?.category);
    const key = category || '';

    if (!lanes.has(key)) {
      lanes.set(key, []);
    }

    lanes.get(key).push(competitor);
  });

  return lanes;
}

function renderLane(category, competitors) {
  const escapedCategory = htmlEscape(category || 'Uncategorized');
  const cards = competitors.map((competitor) => renderCompetitorCard(competitor)).join('');

  return [
    `<section class="strategy-panel__lane" aria-label="${escapedCategory} competitors">`,
    `<h3>${escapedCategory}</h3>`,
    '<div class="strategy-panel__scorecards">',
    cards,
    '</div>',
    '</section>',
  ].join('');
}

function renderCompareCard({ label, url, isPrimary }) {
  const safeUrl = normalizeText(url);
  if (!safeUrl) {
    return [
      `<div class="strategy-compare-card${isPrimary ? ' strategy-compare-card--primary' : ''}">`,
      `<div class="strategy-compare-card__label">${htmlEscape(label)}</div>`,
      '<div class="strategy-compare-card__empty">No URL available</div>',
      '</div>',
    ].join('');
  }

  const frameId = `sb-compare-${Math.random().toString(36).slice(2, 9)}`;
  return [
    `<div class="strategy-compare-card${isPrimary ? ' strategy-compare-card--primary' : ''}">`,
    `<div class="strategy-compare-card__label">${htmlEscape(label)}</div>`,
    `<div class="strategy-compare-card__frame-wrap" data-sb-compare-wrap>`,
    `<iframe class="strategy-compare-card__frame" id="${frameId}" src="${htmlEscape(safeUrl)}" loading="lazy" referrerpolicy="no-referrer" title="${htmlEscape(label)}"></iframe>`,
    `<a class="strategy-compare-card__fallback" href="${htmlEscape(safeUrl)}" target="_blank" rel="noopener">Open ${htmlEscape(label)} directly ↗</a>`,
    '</div>',
    '</div>',
  ].join('');
}

function renderCompareCarousel(strategy) {
  const cards = [];
  if (strategy.oldSiteUrl) cards.push(renderCompareCard({ label: 'Your Old Site', url: strategy.oldSiteUrl }));
  if (strategy.newSiteUrl) cards.push(renderCompareCard({ label: 'Your New Site', url: strategy.newSiteUrl, isPrimary: true }));
  for (const c of strategy.competitors || []) {
    if (c.url) cards.push(renderCompareCard({ label: normalizeText(c.name) || 'Competitor', url: c.url }));
  }
  if (!cards.length) return '';

  return [
    '<section class="strategy-compare" aria-label="Side-by-side site comparison">',
    '<h3 class="strategy-compare__title">Compare — scroll to see more</h3>',
    '<div class="strategy-compare__row" data-sb-compare-row>',
    cards.join(''),
    '</div>',
    '</section>',
  ].join('');
}

const COMPARE_STYLES = `
<style>
  .strategy-compare { margin-bottom: 16px; }
  .strategy-compare__title { font-size: 13px; font-weight: 700; margin: 0 0 8px; color: inherit; }
  .strategy-compare__row { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px; scroll-snap-type: x proximity; }
  .strategy-compare-card { flex: 0 0 220px; scroll-snap-align: start; border: 1px solid rgba(148,163,184,0.35); border-radius: 10px; overflow: hidden; background: #0b1220; }
  .strategy-compare-card--primary { border-color: #16a34a; box-shadow: 0 0 0 1px #16a34a; }
  .strategy-compare-card__label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 6px 8px; background: rgba(148,163,184,0.12); }
  .strategy-compare-card__frame-wrap { position: relative; height: 260px; overflow: hidden; }
  .strategy-compare-card__frame { width: 400%; height: 400%; border: 0; transform: scale(0.25); transform-origin: 0 0; pointer-events: none; background: #fff; }
  .strategy-compare-card__fallback { position: absolute; bottom: 6px; left: 6px; right: 6px; font-size: 10px; text-align: center; background: rgba(15,23,42,0.85); color: #93c5fd; padding: 4px 6px; border-radius: 6px; text-decoration: none; }
  .strategy-compare-card__empty { padding: 16px 8px; font-size: 12px; color: #94a3b8; text-align: center; }
</style>`;

export function renderStrategyPanel({ strategy } = {}) {
  const competitors = Array.isArray(strategy?.competitors)
    ? strategy.competitors.filter((competitor) => competitor && typeof competitor === 'object')
    : [];

  const compareCarousel = strategy ? renderCompareCarousel(strategy) : '';

  if (!strategy || competitors.length === 0) {
    return compareCarousel ? COMPARE_STYLES + compareCarousel + renderPlaceholder() : renderPlaceholder();
  }

  const synopsis = normalizeText(strategy.synopsis);
  const lanes = groupCompetitorsByCategory(competitors);
  const renderedLanes = Array.from(lanes.entries())
    .map(([category, laneCompetitors]) => renderLane(category, laneCompetitors))
    .join('');

  return [
    COMPARE_STYLES,
    compareCarousel,
    '<section class="strategy-panel">',
    synopsis ? `<p class="strategy-panel__synopsis">${htmlEscape(synopsis)}</p>` : '',
    '<div class="strategy-panel__competitor-lanes">',
    renderedLanes,
    '</div>',
    '</section>',
  ].join('');
}

export default renderStrategyPanel;