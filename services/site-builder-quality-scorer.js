// services/site-builder-quality-scorer.js
import { JSDOM } from 'jsdom';

/**
 * @ssot docs/projects/AMENDMENT_05_SITE_BUILDER.md
 */
export function scoreGeneratedSite(html, businessInfo = {}) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  let score = 0;
  const maxScore = 100;
  const criteria = {
    hasDoctype: 10,
    hasMobileViewport: 10,
    hasH1: 5,
    hasH2: 5,
    hasCTA: 10,
    hasTestimonials: 10,
    hasPricing: 5,
    hasContactInfo: 10,
    hasSchemaMarkup: 10,
    hasImages: 5,
    minLength: 10,
    hasTailwind: 5,
    hasFooter: 5,
  };

  const issues = [];

  if (doc.doctype && doc.doctype.name === 'html') {
    score += criteria.hasDoctype;
  } else {
    issues.push('Missing doctype declaration');
  }

  if (doc.querySelector('meta[name="viewport"]')) {
    score += criteria.hasMobileViewport;
  } else {
    issues.push('Missing mobile viewport meta tag');
  }

  const headings = doc.querySelectorAll('h1, h2');
  if (headings.length >= 2) {
    score += criteria.hasH1 + criteria.hasH2;
  } else {
    issues.push('Missing at least two headings (H1 and H2)');
  }

  if (doc.querySelector('button[type="submit"]')) {
    score += criteria.hasCTA;
  } else {
    issues.push('Missing call-to-action button');
  }

  if (doc.querySelector('section.testimonials')) {
    score += criteria.hasTestimonials;
  } else {
    issues.push('Missing testimonials section');
  }

  if (doc.querySelector('section.pricing')) {
    score += criteria.hasPricing;
  } else {
    issues.push('Missing pricing section');
  }

  if (doc.querySelector('section.contact')) {
    score += criteria.hasContactInfo;
  } else {
    issues.push('Missing contact information section');
  }

  if (doc.querySelector('script[type="application/ld+json"]')) {
    score += criteria.hasSchemaMarkup;
  } else {
    issues.push('Missing schema markup');
  }

  if (doc.querySelectorAll('img').length >= 2) {
    score += criteria.hasImages;
  } else {
    issues.push('Missing at least two images');
  }

  if (doc.documentElement.textContent.length >= 5000) {
    score += criteria.minLength;
  } else {
    issues.push('Content is too short');
  }

  if (doc.querySelector('link[rel="stylesheet"]') && doc.querySelector('link[rel="stylesheet"]').href.includes('tailwind')) {
    score += criteria.hasTailwind;
  } else {
    issues.push('Missing Tailwind CSS');
  }

  if (doc.querySelector('footer')) {
    score += criteria.hasFooter;
  } else {
    issues.push('Missing footer');
  }

  const grade = Math.floor((score / maxScore) * 100);
  const gradeMap = {
    A: 90,
    B: 75,
    C: 60,
    D: 45,
    F: 0,
  };

  const gradeKey = Object.keys(gradeMap).find((key) => gradeMap[key] >= grade);
  const gradeValue = gradeMap[gradeKey];

  return {
    score,
    maxScore,
    grade: gradeKey,
    gradeValue,
    criteria,
    issues,
    readyToSend: gradeValue >= 60,
  };
}

export function scoreSummary(result) {
  return `The generated site has a quality score of ${result.score} (${result.grade})`;
}