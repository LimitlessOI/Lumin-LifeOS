/**
 * SYNOPSIS: Exports classifyPracticeCategories — services/site-builder-competitor-categories.js.
 */
const PRACTICE_CATEGORIES = Object.freeze([
  Object.freeze({
    id: "midwifery",
    label: "Midwifery",
    keywords: Object.freeze([
      "home birth",
      "homebirth",
      "midwife",
      "midwives",
      "midwifery",
      "doula",
      "birth support",
      "birth worker",
      "birthworker",
      "birth doula",
      "labor doula",
      "postpartum doula",
      "prenatal",
      "postpartum",
      "birthing",
      "birth center",
      "birth centre"
    ]),
    searchQueries: Object.freeze([
      "home birth midwife",
      "midwife",
      "doula",
      "birth support"
    ])
  }),
  Object.freeze({
    id: "wellness",
    label: "Wellness",
    keywords: Object.freeze([
      "holistic wellness",
      "wellness practitioner",
      "wellness",
      "holistic",
      "holistic health",
      "well-being",
      "wellbeing",
      "wellness coach",
      "health coach",
      "integrative wellness",
      "natural wellness",
      "general wellness"
    ]),
    searchQueries: Object.freeze([
      "holistic wellness",
      "wellness practitioner"
    ])
  })
]);

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function stringifyValue(value) {
  if (value == null) return "";

  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value.map(stringifyValue).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value).map(stringifyValue).filter(Boolean).join(" ");
  }

  return "";
}

function normalizeText(value) {
  return stringifyValue(value)
    .toLowerCase()
    .replace(/[_/|,;:()[\]{}]+/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBusinessSearchText(businessInfo = {}) {
  const sourceParts = [
    ...asArray(businessInfo?.industry),
    ...asArray(businessInfo?.services),
    ...asArray(businessInfo?.keywords)
  ];

  return normalizeText(sourceParts);
}

function containsKeyword(searchText, keyword) {
  const normalizedKeyword = normalizeText(keyword);
  if (!searchText || !normalizedKeyword) return false;

  return searchText.includes(normalizedKeyword);
}

function categoryToResult(category) {
  return {
    id: category.id,
    label: category.label,
    searchQueries: [...category.searchQueries]
  };
}

function getCategoryById(categoryId) {
  return PRACTICE_CATEGORIES.find((category) => category.id === categoryId) || null;
}

export function classifyPracticeCategories(businessInfo = {}) {
  const searchText = getBusinessSearchText(businessInfo);

  const categories = PRACTICE_CATEGORIES
    .filter((category) => category.keywords.some((keyword) => containsKeyword(searchText, keyword)))
    .map(categoryToResult);

  return { categories };
}

export function buildDualCategoryQueries(businessInfo = {}) {
  const detectedCategoryIds = new Set(
    classifyPracticeCategories(businessInfo).categories.map((category) => category.id)
  );

  const hasMidwiferyOrWellness =
    detectedCategoryIds.has("midwifery") || detectedCategoryIds.has("wellness");

  if (!hasMidwiferyOrWellness) {
    return { categories: [] };
  }

  return {
    categories: ["midwifery", "wellness"]
      .map(getCategoryById)
      .filter(Boolean)
      .map(categoryToResult)
  };
}

/**
 * No additive implementation needed: this module already exports the requested
 * classifyPracticeCategories and buildDualCategoryQueries helpers.
 */

export default {
  classifyPracticeCategories,
  buildDualCategoryQueries
};
