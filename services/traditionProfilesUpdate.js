/**
 * SYNOPSIS: Updates tradition profiles in the given content to include detailed
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Updates tradition profiles in the given content to include detailed
 * explanations and visual framings while preserving the source text.
 *
 * @param {string} content - The source text content to enhance.
 * @param {object} [options] - Optional configuration.
 * @param {boolean} [options.preserveSource=true] - Whether to keep the original source text.
 * @returns {Promise<object>} - The enhanced profiles and metadata.
 */
export async function updateTraditionProfiles(content, options = {}) {
  const preserveSource = options.preserveSource !== false;

  if (!content || typeof content !== 'string') {
    throw new Error('Content must be a non-empty string.');
  }

  // Split content into paragraphs or sections for profile enhancement.
  const sections = content
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter((section) => section.length > 0);

  if (sections.length === 0) {
    return {
      profiles: [],
      enhancedContent: content,
      preservedSource: content,
      summary: 'No sections found in content.',
    };
  }

  const profiles = sections.map((section, index) => {
    // Basic heuristic: use first sentence as title, rest as detail.
    const firstSentenceMatch = section.match(/^([^.!?]+[.!?])/);
    const title = firstSentenceMatch ? firstSentenceMatch[1].trim() : `Tradition ${index + 1}`;
    const detail = firstSentenceMatch ? section.slice(firstSentenceMatch[0].length).trim() : section;

    // Create a visual framing — a structured summary.
    const visualFraming = {
      title,
      keyPoints: extractKeyPoints(detail),
      wordCount: section.split(/\s+/).filter(Boolean).length,
      sourcePreserved: preserveSource,
    };

    return {
      id: `tradition-${index + 1}`,
      title,
      detail,
      sourceText: section,
      visualFraming,
    };
  });

  // Build enhanced content: original sections plus visual framing summaries.
  const enhancedContent = sections
    .map((section, index) => {
      const profile = profiles[index];
      const framingBlock = [
        '',
        `[Visual Framing: ${profile.visualFraming.title}]`,
        `Key points: ${profile.visualFraming.keyPoints.join('; ')}`,
        `Word count: ${profile.visualFraming.wordCount}`,
        preserveSource ? 'Source text preserved below.' : '(Source text omitted per options)',
        '',
      ].join('\n');
      return `${section}\n${framingBlock}`;
    })
    .join('\n\n');

  return {
    profiles,
    enhancedContent,
    preservedSource: preserveSource ? content : null,
    summary: `Enhanced ${profiles.length} tradition profile(s).`,
  };
}

/**
 * Extracts key points from a detail text — a simple heuristic.
 * @param {string} text
 * @returns {string[]}
 */
function extractKeyPoints(text) {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Take up to 3 sentences as key points.
  return sentences.slice(0, 3).map((s) => s.length > 80 ? `${s.slice(0, 80)}…` : s);
}

/**
 * Reads a source file, enhances its tradition profiles, and writes the result.
 * @param {string} inputPath - Path to the source file.
 * @param {string} [outputPath] - Optional output path; defaults to enhanced-<basename>.
 * @returns {Promise<object>} - Result of the enhancement.
 */
export async function enhanceTraditionProfileFile(inputPath, outputPath = null) {
  const content = await readFile(inputPath, 'utf-8');
  const result = await updateTraditionProfiles(content);

  const targetPath = outputPath || join(dirname(inputPath), `enhanced-${inputPath.split(/[\\/]/).pop()}`);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, result.enhancedContent, 'utf-8');

  return {
    ...result,
    outputPath: targetPath,
  };
}
