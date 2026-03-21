#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer";
import tesseract from "tesseract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = process.cwd();
const OUTPUT_ROOT = path.join(ROOT, "docs", "THREAD_REALITY", "outputs");
const LATEST_RUN_PATH = path.join(ROOT, "docs", "THREAD_REALITY", "latest-run.json");

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function parseArgs() {
  const args = process.argv.slice(2);
  const urls = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--urls" && args[i + 1]) {
      urls.push(
        ...args[i + 1]
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean)
      );
      i++;
    } else if (arg === "--file" && args[i + 1]) {
      const filePath = path.resolve(args[i + 1]);
      try {
        const fileData = await fs.readFile(filePath, "utf8");
        urls.push(
          ...fileData
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
        );
      } catch (error) {
        throw new Error(`Unable to read URL file: ${error.message}`);
      }
      i++;
    }
  }

  if (urls.length === 0) {
    throw new Error("No URLs provided. Use --urls <comma-separated> or --file <path>.");
  }

  return urls;
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore
  }
}

async function sanitizePage(page) {
  const title = await page.title();
  const text = await page.evaluate(() => document.body?.innerText || "");
  const description = await page.$eval(
    'meta[name="description"]',
    (el) => el.getAttribute("content"),
    ""
  ).catch(() => "");
  return {
    title,
    description,
    text: (text || "").trim(),
  };
}

async function writeLatestRun(record) {
  await fs.writeFile(LATEST_RUN_PATH, JSON.stringify(record, null, 2) + "\n", "utf8");
}

async function runTruthGuard() {
  const guard = spawnSync(
    "node",
    ["scripts/truth-guard-preflight.js", LATEST_RUN_PATH],
    {
      cwd: ROOT,
      stdio: "inherit",
    }
  );
  if (guard.status !== 0) {
    throw new Error("Truth guard preflight failed");
  }
}

async function main() {
  const urls = await parseArgs();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destDir = path.join(OUTPUT_ROOT, timestamp, "web");
  await ensureDir(destDir);

  const browser = await puppeteer.launch({ headless: true });
  const proofPaths = [];
  const { createWorker } = tesseract;
  const worker = await createWorker({
    logger: () => {},
  });

  await worker.load();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");

  try {
    const page = await browser.newPage();
    for (const target of urls) {
      await page.goto(target, { waitUntil: "networkidle2", timeout: 60000 });
      const metadata = await sanitizePage(page);
      const parsed = new URL(target);
      const slug = slugify(`${parsed.hostname}-${parsed.pathname}-${Date.now()}`);
      const fileName = `${slug}.json`;
      const screenshotName = `${slug}.png`;
      const screenshotPath = path.join(destDir, screenshotName);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: "png",
      });
      const ocrResult = await worker.recognize(screenshotPath);
      const ocrText = (ocrResult?.data?.text || "").trim();
      const relativePath = path.relative(ROOT, path.join(destDir, fileName));
      await fs.writeFile(
        path.join(destDir, fileName),
        JSON.stringify(
          {
            url: target,
            fetchedAt: new Date().toISOString(),
            metadata,
            screenshot: path.relative(ROOT, screenshotPath),
            ocrText,
          },
          null,
          2
        ),
        "utf8"
      );
      proofPaths.push(relativePath);
      proofPaths.push(path.relative(ROOT, screenshotPath));
      console.log(`Saved web intake for ${target} → ${relativePath}`);
    }
  } finally {
    await browser.close();
    await worker.terminate();
  }

  const runRecord = {
    runId: timestamp,
    whatWasAttempted: `Web intake of ${urls.length} URL(s)`,
    result: "UNVERIFIED",
    proofPaths,
    runDir: "",
    blocker: "",
  };
  await writeLatestRun(runRecord);
  await runTruthGuard();
}

main().catch((error) => {
  console.error("Web intake failed:", error.message);
  process.exit(1);
});
