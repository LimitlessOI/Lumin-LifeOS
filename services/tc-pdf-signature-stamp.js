/**
 * @ssot docs/projects/AMENDMENT_17_TC_SERVICE.md
 * Appends a standard letter-size acknowledgment page to a PDF for TC review flows.
 * Not a substitute for lawfully required e-sign platforms where mandates apply.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs/promises';

/**
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {object} [options]
 * @param {string} [options.displayName]
 * @param {string} [options.signedAtIso]
 * @param {Buffer} [options.signaturePngBytes]
 * @param {string} [options.note]
 */
export async function stampListingAgentAcknowledgment(inputPath, outputPath, options = {}) {
  const {
    displayName = 'Listing agent',
    signedAtIso = new Date().toISOString(),
    signaturePngBytes = null,
    note = 'Operator approved this package in LifeOS before delivery to the client. This page records acknowledgment only, not platform e-sign.',
  } = options;

  const pdfBytes = await fs.readFile(inputPath);
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const margin = 48;
  let y = 720;

  page.drawText('Listing agent — review & release', {
    x: margin,
    y,
    size: 14,
    font,
    color: rgb(0.05, 0.05, 0.08),
  });
  y -= 28;
  page.drawText(`Acknowledged by: ${displayName}`, { x: margin, y, size: 12, font });
  y -= 22;
  page.drawText(`Date/time (UTC): ${signedAtIso}`, { x: margin, y, size: 10, font, color: rgb(0.2, 0.2, 0.25) });
  y -= 36;
  page.drawText(note, {
    x: margin,
    y,
    size: 9,
    font,
    color: rgb(0.25, 0.25, 0.3),
    maxWidth: 512,
    lineHeight: 12,
  });
  y -= 48;

  if (signaturePngBytes?.length) {
    try {
      const img = await doc.embedPng(signaturePngBytes);
      const targetW = 200;
      const scale = targetW / img.width;
      const h = img.height * scale;
      page.drawImage(img, { x: margin, y: y - h, width: targetW, height: h });
      y -= h + 24;
    } catch {
      page.drawText('(Signature image could not be embedded.)', { x: margin, y, size: 9, font });
    }
  }

  const outBytes = await doc.save();
  await fs.writeFile(outputPath, outBytes);
}

export default stampListingAgentAcknowledgment;
