const Shopify = require('shopify-api-node');
const WooCommerceAPI = require('woocommerce-api');
const config = require('../../config/ecommerceConfig');
const logger = require('../../utils/logger');

class PlatformAdapters {
    constructor() {
        this.shopify = new Shopify({
            shopName: config.shopify.shopName,
            apiKey: config.shopify.apiKey,
            password: config.shopify.password,
        });
        
        this.woocommerce = new WooCommerceAPI({
            url: config.woocommerce.url,
            consumerKey: config.woocommerce.consumerKey,
            consumerSecret: config.woocommerce.consumerSecret,
            wpAPI: true,
            version: 'wc/v3'
        });
    }

    async fetchShopifyOrders() {
        logger.info('Fetching Shopify orders...');
        return await this.shopify.order.list();
    }

    async fetchWooCommerceOrders() {
        logger.info('Fetching WooCommerce orders...');
        return await this.woocommerce.getAsync('orders');
    }
}

module.exports = new PlatformAdapters();