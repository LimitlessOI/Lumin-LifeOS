/**
 * SYNOPSIS: Service module — QuoteService.
 */
export default async function confirmQuotePassedValidation(req, res) {
  const quote = req.body?.quote ?? req.body?.quoteText ?? req.body?.text ?? "";
  const trimmed = String(quote).trim();

  const passed =
    trimmed.length > 0 &&
    trimmed.split(/\s+/).length >= 3 &&
    /[.!?]$/.test(trimmed);

  res.status(200).json({
    status: passed ? "PASS" : "FAIL",
    quote: trimmed,
    confirmed: passed,
  });
}