/**
 * SYNOPSIS: Provides services that compare vendor offerings based on price book data, explaining/including only those with strong reviews.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
export async function compareVendors(deps, payload) {
  const { pool, logger } = deps;
  try {
    const { rows } = await pool.query(
      `SELECT
        vpb.vendor_id,
        pb.partner_name AS vendor_name,
        vpb.price,
        vpb.review_score,
        vpb.review_count,
        pbi.item_name,
        pbi.item_description,
        pbi.unit_price,
        pbi.setup_fee,
        pbi.min_quantity,
        pbi.max_quantity,
        pbi.lead_time_days
      FROM vendor_price_book vpb
      JOIN price_book_partners pb ON vpb.vendor_id = pb.id
      JOIN price_book_items pbi ON vpb.product_id = pbi.id
      WHERE vpb.review_score >= 4.0
      ORDER BY vpb.price ASC;`
    );
    return rows;
  } catch (error) {
    logger.error({ error }, 'Error in compareVendors');
    throw new Error('Failed to compare vendors');
  }
}

export async function getVendorInfo(deps, payload) {
  const { pool, logger } = deps;
  const { vendorId } = payload || {};
  try {
    const { rows } = await pool.query(
      `SELECT
        vpb.vendor_id,
        pb.partner_name AS vendor_name,
        vpb.price,
        vpb.review_score,
        vpb.review_count,
        pbi.item_name,
        pbi.item_description,
        pbi.unit_price,
        pbi.setup_fee,
        pbi.min_quantity,
        pbi.max_quantity,
        pbi.lead_time_days
      FROM vendor_price_book vpb
      JOIN price_book_partners pb ON vpb.vendor_id = pb.id
      JOIN price_book_items pbi ON vpb.product_id = pbi.id
      WHERE vpb.vendor_id = $1 AND vpb.review_score >= 4.0;`,
      [vendorId]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error({ error, vendorId }, 'Error in getVendorInfo');
    throw new Error('Failed to retrieve vendor information');
  }
}