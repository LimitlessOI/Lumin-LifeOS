```javascript
const express = require('express');
const productService = require('../services/product-service');

const router = express.Router();

router.get('/products', async (req, res) => {
  try {
    const products = await productService.listProducts(req.query);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await productService.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```