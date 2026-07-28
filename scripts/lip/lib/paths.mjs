/**
 * SYNOPSIS: Limitless Protocol paths under data/lip/
 * @ssot docs/products/lip/PRODUCT_HOME.md
 * Limitless Protocol paths under data/lip/
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../../..');
export const LIP_DATA = path.join(REPO_ROOT, 'data', 'lip');
export const ACCOUNTS_PATH = path.join(LIP_DATA, 'accounts.json');
export const SCANS_PATH = path.join(LIP_DATA, 'scans.jsonl');
export const TRADES_PATH = path.join(LIP_DATA, 'paper-trades.jsonl');
export const BACKTEST_PATH = path.join(LIP_DATA, 'backtest-last.json');
export const EVENTS_PATH = path.join(LIP_DATA, 'meta-events.jsonl');
