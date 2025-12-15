import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function ensureReportsDir() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

async function loadJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

/**
 * Stub for model output. Replace with real council/model call when wired.
 */
async function runModelStub(prompt) {
  // Simple deterministic stub to keep interface intact.
  return `Stub response for: ${prompt}`;
}

function scoreWithRubric(output, rubric) {
  if (!rubric || !Array.isArray(rubric.keywords)) return { score: 0, hits: [] };
  const lower = output.toLowerCase();
  const hits = rubric.keywords.filter((kw) => lower.includes(String(kw).toLowerCase()));
  const score = hits.length / Math.max(1, rubric.keywords.length);
  return { score, hits };
}

function formatMarkdown(report) {
  const lines = [];
  lines.push('# Quality Regression Report');
  lines.push(`- id: ${report.id}`);
  lines.push(`- timestamp: ${report.timestamp}`);
  lines.push(`- pass: ${report.summary.pass}`);
  lines.push(`- passed: ${report.summary.passed}/${report.summary.total}`);
  lines.push(`- avg_score: ${report.summary.average_score.toFixed(3)}`);
  lines.push('');
  lines.push('## Tasks');
  for (const t of report.tasks) {
    lines.push(`### ${t.id} - ${t.title}`);
    lines.push(`- score: ${t.score.toFixed(3)}`);
    lines.push(`- baseline: ${t.baseline_score.toFixed(3)}`);
    lines.push(`- delta: ${(t.delta).toFixed(3)}`);
    lines.push(`- pass: ${t.pass}`);
    lines.push(`- hits: ${t.hits.join(', ') || 'none'}`);
    lines.push('');
  }
  return lines.join('\n');
}

export async function runQualityRegression() {
  await ensureReportsDir();
  const tasks = await loadJson(path.join(__dirname, 'gold_tasks.json'));
  const rubrics = await loadJson(path.join(__dirname, 'rubrics.json'));

  const results = [];

  for (const task of tasks) {
    const rubric = rubrics[task.id] || { keywords: [], min_score: 0, baseline_score: 0 };
    const output = await runModelStub(task.prompt);
    const { score, hits } = scoreWithRubric(output, rubric);
    const delta = score - (rubric.baseline_score ?? 0);
    const pass = score >= (rubric.min_score ?? 0);
    results.push({
      id: task.id,
      title: task.title,
      prompt: task.prompt,
      expected_keywords: rubric.keywords || [],
      output,
      hits,
      score,
      baseline_score: rubric.baseline_score ?? 0,
      min_score: rubric.min_score ?? 0,
      delta,
      pass,
    });
  }

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const average_score = results.reduce((a, b) => a + b.score, 0) / Math.max(1, total);
  const pass = passed === total;

  const report = {
    id: `quality_regression_${ts()}`,
    timestamp: dayjs().toISOString(),
    summary: {
      total,
      passed,
      average_score,
      pass,
    },
    tasks: results,
  };

  const base = `${report.id}`;
  const jsonPath = path.join(REPORTS_DIR, `${base}.json`);
  const mdPath = path.join(REPORTS_DIR, `${base}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  await fs.writeFile(mdPath, formatMarkdown(report), 'utf8');

  return { jsonPath, mdPath, report };
}

export default runQualityRegression;
