/**
 * SYNOPSIS: Compares vendors based on pricing and reviews, with explanations or exclusions based on criteria.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
export async function compareVendors(deps, payload) {
  const { pool, logger } = deps;
  const { vendorIds, criteria = {} } = payload || {};

  if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
    throw new Error('Invalid input: vendorIds must be a non-empty array.');
  }

  const { maxPrice, includeKeywords = [], excludeKeywords = [] } = criteria;

  try {
    const { rows: priceBookItems } = await pool.query(
      `
      SELECT
        pbv.vendor_id,
        pbv.product_id,
        pbv.price,
        pbv.review_score,
        pbv.review_count,
        pbi.item_name,
        pbi.item_description,
        pbp.partner_name
      FROM
        vendor_price_book pbv
      JOIN
        price_book_items pbi ON pbv.product_id = pbi.id
      JOIN
        price_book_catalogs pbc ON pbi.catalog_id = pbc.id
      JOIN
        price_book_partners pbp ON pbc.partner_id = pbp.id
      WHERE
        pbv.vendor_id = ANY($1::uuid[])
      `,
      [vendorIds]
    );

    const vendorComparisonResult = [];

    // Group items by vendor for easier processing
    const vendorsData = priceBookItems.reduce((acc, item) => {
      if (!acc[item.vendor_id]) {
        acc[item.vendor_id] = {
          id: item.vendor_id,
          partner_name: item.partner_name,
          totalPrice: 0,
          averageReviewScore: 0,
          totalReviewCount: 0,
          items: [],
        };
      }
      acc[item.vendor_id].items.push(item);
      acc[item.vendor_id].totalPrice += item.price;
      acc[item.vendor_id].averageReviewScore += item.review_score || 0; // Sum up for average later
      acc[item.vendor_id].totalReviewCount += item.review_count || 0;
      return acc;
    }, {});

    for (const vendorId of Object.keys(vendorsData)) {
      const vendor = vendorsData[vendorId];
      let explanation = [];
      let isIncluded = true;

      // Calculate average review score
      if (vendor.items.length > 0) {
        vendor.averageReviewScore = vendor.averageReviewScore / vendor.items.length;
      } else {
        vendor.averageReviewScore = 0;
      }

      // Logic to compare based on pricing
      if (maxPrice !== undefined && vendor.totalPrice > maxPrice) {
        explanation.push(`Excluded: total price (${vendor.totalPrice}) is expensive and exceeds maximum allowed (${maxPrice}).`);
        isIncluded = false;
      }

      // Logic to include based on review keywords (check item names and descriptions)
      if (includeKeywords.length > 0) {
        const hasRequiredReviewKeywords = vendor.items.some(item =>
          includeKeywords.some(keyword =>
            item.item_name.toLowerCase().includes(keyword.toLowerCase()) ||
            (item.item_description && item.item_description.toLowerCase().includes(keyword.toLowerCase()))
          )
        );
        if (!hasRequiredReviewKeywords) {
          explanation.push(`Excluded: missing required keywords in product names or descriptions.`);
          isIncluded = false;
        }
      }

      // Logic to exclude based on review keywords (check item names and descriptions)
      if (excludeKeywords.length > 0) {
        const hasExcludedReviewKeywords = vendor.items.some(item =>
          excludeKeywords.some(keyword =>
            item.item_name.toLowerCase().includes(keyword.toLowerCase()) ||
            (item.item_description && item.item_description.toLowerCase().includes(keyword.toLowerCase()))
          )
        );
        if (hasExcludedReviewKeywords) {
          explanation.push(`Excluded: contains prohibited keywords in product names or descriptions.`);
          isIncluded = false;
        }
      }

      vendorComparisonResult.push({
        vendor_id: vendor.id,
        partner_name: vendor.partner_name,
        total_price: vendor.totalPrice,
        average_review_score: vendor.averageReviewScore,
        total_review_count: vendor.totalReviewCount,
        is_included: isIncluded,
        exclusion_reason: explanation.join(' ') || null,
        items: vendor.items.map(item => ({
          product_id: item.product_id,
          item_name: item.item_name,
          price: item.price,
          review_score: item.review_score,
          review_count: item.review_count,
        })),
      });
    }

    return vendorComparisonResult;

  } catch (error) {
    logger.error({ error, vendorIds, criteria }, 'Error in compareVendors');
    throw new Error('Failed to compare vendors due to an internal error.');
  }
}