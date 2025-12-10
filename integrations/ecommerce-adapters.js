```javascript
const ShopifyAPI = require('shopify-api-node');
const WooCommerceAPI = require('woocommerce-api');
const Stripe = require('stripe');

class EcommerceAdapters {
  constructor() {
    this.shopify = new ShopifyAPI({ shopName: 'example', apiKey: 'key', password: 'password' });
    this.woocommerce = new WooCommerceAPI({ url: 'https://example.com', consumerKey: 'key', consumerSecret: 'secret' });
    this.stripe = new Stripe('sk_test_key');
  }

  async fetchShopifyOrders() {
    try {
      return await this.shopify.order.list();
    } catch (error) {
      console.error('Error fetching Shopify orders:', error);
      return [];
    }
  }

  async fetchWooCommerceOrders() {
    try {
      return await this.woocommerce.get('orders');
    } catch (error) {
      console.error('Error fetching WooCommerce orders:', error);
      return [];
    }
  }

  async fetchStripePayments() {
    try {
      return await this.stripe.paymentIntents.list();
    } catch (error) {
      console.error('Error fetching Stripe payments:', error);
      return [];
    }
  }
}

module.exports = EcommerceAdapters;
```