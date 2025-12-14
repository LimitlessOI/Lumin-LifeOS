```javascript
class EcommercePlatformAdapter {
  constructor(platform) {
    this.platform = platform;
  }

  async fetchProducts() {
    switch (this.platform) {
      case 'shopify':
        return this.fetchShopifyProducts();
      case 'magento':
        return this.fetchMagentoProducts();
      default:
        throw new Error('Unsupported platform');
    }
  }

  async fetchShopifyProducts() {
    // Implement Shopify API interaction
  }

  async fetchMagentoProducts() {
    // Implement Magento API interaction
  }
}

export default EcommercePlatformAdapter;
```