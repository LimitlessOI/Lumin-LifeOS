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

export function renderStrategyPanel({ strategy } = {}) {
  const competitors = Array.isArray(strategy?.competitors)
    ? strategy.competitors.filter((competitor) => competitor && typeof competitor === 'object')
    : [];

  if (!strategy || competitors.length === 0) {
    return renderPlaceholder();
  }

  const synopsis = normalizeText(strategy.synopsis);
  const lanes = groupCompetitorsByCategory(competitors);
  const renderedLanes = Array.from(lanes.entries())
    .map(([category, laneCompetitors]) => renderLane(category, laneCompetitors))
    .join('');

  return [
    '<section class="strategy-panel">',
    synopsis ? `<p class="strategy-panel__synopsis">${htmlEscape(synopsis)}</p>` : '',
    '<div class="strategy-panel__competitor-lanes">',
    renderedLanes,
    '</div>',
    '</section>',
  ].join('');
}

export default renderStrategyPanel;