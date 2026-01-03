router.get('/api/v1/overlay-analytics', async (req, res) => {
  try {
    const analytics = await overlayController.getAnalytics(); // Assumes a function to calculate and return engagement metrics; see controller for details.
    return res.json(analytics);
  } catch (error) {
    return res.status(400).json({ error: 'Failed to retrieve analytics' });
  })
});