/**
 * SYNOPSIS: Provides a summary of page content using AI.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
export function registerPageSummarization(app, deps) {
  app.post('/api/v1/lifeos/page-summarization', deps.requireKey, async (req, res, next) => {
    try {
      const { pageContent } = req.body; // Assuming the page content is sent in the request body as 'pageContent'

      if (!pageContent) {
        return res.status(400).json({ error: 'Missing pageContent in request body.' });
      }

      // Call the AI Council member to summarize the page content
      const prompt = `Summarize the following page content concisely:\n\n${pageContent}`;
      const summary = await deps.callCouncilMember('summarizer', prompt);

      res.json({ summary });
    } catch (error) {
      deps.logger.error({ error }, 'Error in pageSummarization route');
      next(error);
    }
  });
}