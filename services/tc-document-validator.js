import fs from 'fs/promises';
import path from 'path';
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp', '.gif', '.webp', '.heic']);
const STREET_SUFFIX_RE = /(street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|way|place|pl|terrace|ter|boulevard|blvd|circle|cir)\b/i;
const PRICE_RE = /\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\b\d{2,3},\d{3}(?:\.\d{2})?\b/g;
const DATE_RE = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\