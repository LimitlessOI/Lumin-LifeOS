/**
 * SYNOPSIS: Registers BundleSocialAutomationRoutes routes/handlers (routes/bundle_social_automation_routes.js).
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
export function registerBundleSocialAutomationRoutes(app) {
  app.use('/api/bundles', router);
  router.get('/', getBundles);
  router.get('/skus', getBundleSKUs);
  router.post('/', createBundle);
  router.post('/skus', createBundleSKU);
  router.put('/:id', updateBundle);
  router.put('/skus/:id', updateBundleSKU);
  router.delete('/:id', deleteBundle);
  router.delete('/skus/:id', deleteBundleSKU);

  // New routes for website SKUs
  router.get('/website/skus', getWebsiteSKUs);
  router.post('/website/skus', createWebsiteSKU);
  router.put('/website/skus/:id', updateWebsiteSKU);
  router.delete('/website/skus/:id', deleteWebsiteSKU);

  // New routes for automation SKUs
  router.get('/automation/skus', getAutomationSKUs);
  router.post('/automation/skus', createAutomationSKU);
  router.put('/automation/skus/:id', updateAutomationSKU);
  router.delete('/automation/skus/:id', deleteAutomationSKU);

  // New routes for social SKUs
  router.get('/social/skus', getSocialSKUs);
  router.post('/social/skus', createSocialSKU);
  router.put('/social/skus/:id', updateSocialSKU);
  router.delete('/social/skus/:id', deleteSocialSKU);
}
