// SYNOPSIS: Smart video edit helpers — Gemini audio transcription + filler/repetition/silence cut planning
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

import { readFile } from 'node:fs/promises';

const FILLER_WORDS = new Set([
  'um', 'uh', 'er', 'ah', 'hmm', 'like', 'so', 'well', 'right', 'okay', 'yeah', 'yep',
  'basically', 'literally', 'actually', 'totally', 'seriously', 'honestly', 'obviously',
]);

const FILLER_PHRASES = ['you know', 'i mean', 'sort of', 'kind of', 'you see', 'i guess'];

function normalizeWord(w) {
  return String(w || '')
    .toLowerCase()
    .replace(/[^\w'\u2019]/g, '')
    .replace(/[\u2019]/g, "'");
}

function isFillerWord(words, i) {
  const w = normalizeWord(words[i]?.word);
  if (FILLER_WORDS.has(w)) return true;
  const next1 = normalizeWord(words[i + 1]?.word || '');
  const next2 = normalizeWord(words[i + 2]?.word || '');
  if (FILLER_PHRASES.includes(`${w} ${next1}`)) return true;
  if (FILLER_PHRASES.includes(`${w} ${next1} ${next2}`)) return true;
  return false;
}

function markFillerWords(words) {
  const used = new Array(words.length).fill(false);
  for (let i = 0; i < words.length; i += 1) {
    if (!isFillerWord(words, i)) continue;
    const next1 = normalizeWord(words[i + 1]?.word || '');
    const next2 = normalizeWord(words[i + 2]?.word || '');
    const phrase2 = `${normalizeWord(words[i].word)} ${next1}`;
    const phrase3 = `${phrase2} ${next2}`;
    if (FILLER_PHRASES.includes(phrase3)) {
      used[i] = used[i + 1] = used[i + 2] = true;
      i += 2;
    } else if (FILLER_PHRASES.includes(phrase2)) {
      used[i] = used[i + 1] = true;
      i += 1;
    } else {
      used[i] = true;
    }
  }
  return used;
}

function markRepetitions(words, maxGapMs = 600) {
  const flags = new Array(words.length).fill(false);
  let last = '';
  let lastEnd = -1;
  for (let i = 0; i < words.length; i += 1) {
    const w = normalizeWord(words[i].word);
    if (!w) continue;
    if (w === last && (words[i].start - lastEnd) * 1000 <= maxGapMs) {
      flags[i] = true;
    } else {
      last = w;
      lastEnd = words[i].end;
    }
  }
  return flags;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function buildKeepSegments(words, keepFlags, duration, opts) {
  const maxGap = Number(opts.maxGapSec ?? (opts.removeSilences ? opts.silenceThresholdSec ?? 0.8 : 0.45));
  const pad = Number(opts.paddingSec ?? 0.05);
  const minKeep = Number(opts.minKeepSec ?? 0.3);
  const segments = [];
  let current = null;
  for (let i = 0; i < words.length; i += 1) {
    if (!keepFlags[i]) {
      if (current) segments.push(current);
      current = null;
      continue;
    }
    if (!current || words[i].start - current[current.length - 1].end > maxGap) {
      if (current) segments.push(current);
      current = [];
    }
    current.push(words[i]);
  }
  if (current) segments.push(current);

  const ranges = [];
  for (const seg of segments) {
    const s = clamp(seg[0].start - pad, 0, duration);
    const e = clamp(seg[seg.length - 1].end + pad, 0, duration);
    if (e - s >= minKeep) ranges.push([s, e]);
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}

function mergeRanges(ranges) {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const last = out[out.length - 1];
    if (sorted[i][0] <= last[1]) {
      last[1] = Math.max(last[1], sorted[i][1]);
    } else {
      out.push(sorted[i]);
    }
  }
  return out;
}

function invertRanges(ranges, start, end) {
  const merged = mergeRanges(ranges);
  const out = [];
  let cursor = start;
  for (const [s, e] of merged) {
    if (s > cursor) out.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < end) out.push([cursor, end]);
  return out;
}

async function callContentAwareAnalyzer(words, duration, callAI, opts) {
  if (!callAI) return { removeRanges: [], summary: '' };
  const maxWords = 600;
  const sample = words.length > maxWords ? words.slice(0, maxWords) : words;
  const transcriptLines = sample.map((w) => `[${w.start.toFixed(2)}-${w.end.toFixed(2)}] ${w.word}`).join(' ');
  const prompt = `You are a senior video editor. Review the transcript below and decide which time ranges should be removed so the final video is tighter and more compelling. Remove: filler words, false starts, repeated phrases, dead air, off-topic tangents, hedges, and weak setup. Keep: the hook, key points, proof, emotional beats, and a clear call-to-action. Goal: ${opts.goal || 'make a brilliant, tight video'}. Audience: ${opts.audience || 'general'}.

Return STRICT JSON only: {"removeRanges":[{"start":number,"end":number,"reason":"string"}],"summary":"string"}.

Transcript:
${transcriptLines}`;
  try {
    const raw = await callAI('creative_engine.smart_edit', prompt, { maxOutputTokens: 4000 });
    const json = raw.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(json);
    const ranges = (parsed.removeRanges || [])
      .map((r) => [Number(r.start), Number(r.end)])
      .filter((r) => Number.isFinite(r[0]) && Number.isFinite(r[1]) && r[1] > r[0]);
    return { removeRanges: ranges, summary: String(parsed.summary || '').slice(0, 500) };
  } catch (err) {
    return { removeRanges: [], summary: `content_aware_unavailable: ${err.message}` };
  }
}

export function buildSmartCutPlan(words, options = {}) {
  const duration = Number(options.duration) || 0;
  if (!Array.isArray(words) || !words.length || duration <= 0) {
    return { keepRanges: [], removeRanges: [], removedWords: 0, keptWords: 0, summary: 'no_words' };
  }
  const removeFillers = options.removeFillers !== false;
  const removeRepetitions = options.removeRepetitions !== false;

  const fillerFlags = removeFillers ? markFillerWords(words) : new Array(words.length).fill(false);
  const repeatFlags = removeRepetitions ? markRepetitions(words) : new Array(words.length).fill(false);
  const keepFlags = new Array(words.length).fill(true);
  for (let i = 0; i < words.length; i += 1) {
    if (fillerFlags[i] || repeatFlags[i]) keepFlags[i] = false;
  }

  let removeRanges = [];
  if (options.contentAware && Array.isArray(options.contentAwareRemoveRanges) && options.contentAwareRemoveRanges.length) {
    removeRanges = mergeRanges(options.contentAwareRemoveRanges);
  }

  for (const [s, e] of removeRanges) {
    for (const w of words) {
      if (w.end > s && w.start < e) {
        const idx = words.indexOf(w);
        if (idx !== -1) keepFlags[idx] = false;
      }
    }
  }

  const keepRanges = buildKeepSegments(words, keepFlags, duration, options);
  const allRemove = mergeRanges([
    ...removeRanges,
    ...invertRanges(keepRanges, 0, duration),
  ]);
  const removedWords = words.filter((_, i) => !keepFlags[i]).length;
  const summary = `kept ${words.length - removedWords}/${words.length} words, ${keepRanges.length} segments, ${allRemove.length} removals`;
  return {
    keepRanges,
    removeRanges: allRemove,
    removedWords,
    keptWords: words.length - removedWords,
    summary,
  };
}

export async function contentAwareCutPlan(words, duration, callAI, options = {}) {
  const result = await callContentAwareAnalyzer(words, duration, callAI, options);
  return buildSmartCutPlan(words, { ...options, duration, contentAwareRemoveRanges: result.removeRanges });
}

export async function transcribeAudioForEdit(opts = {}) {
  const audioBuffer = opts.audioBuffer || (opts.audioPath ? await readFile(opts.audioPath) : null);
  if (!audioBuffer || !audioBuffer.length) return { ok: false, error: 'audio_required' };
  const mimeType = opts.mimeType || 'audio/mpeg';
  const apiKey = opts.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: 'gemini_key_missing' };
  const model = opts.model || process.env.GEMINI_TRANSCRIBE_MODEL || 'gemini-2.5-flash';

  const promptText = `You are a precise video transcript engine. Transcribe the audio exactly. Return JSON with "text" (full cleaned transcript as one string) and "words" (array of objects with "word", "start" in seconds, "end" in seconds). If no speech, return {"text":"","words":[]}.`;
  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: audioBuffer.toString('base64') } },
        { text: promptText },
      ],
    }],
    generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' },
  };

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `gemini_http_${res.status}`, detail: text.slice(0, 300) };
    const data = JSON.parse(text);
    const raw = (data.candidates || []).flatMap((c) => (c?.content?.parts || []).map((p) => p.text || '')).join('').trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    const words = (parsed.words || [])
      .map((w) => ({ word: String(w.word || ''), start: Number(w.start) || 0, end: Number(w.end) || 0 }))
      .filter((w) => w.word && w.end > w.start)
      .sort((a, b) => a.start - b.start);
    return { ok: true, text: String(parsed.text || '').trim(), words, provider: 'gemini', model };
  } catch (err) {
    return { ok: false, error: `transcription_failed:${err.message}` };
  }
}