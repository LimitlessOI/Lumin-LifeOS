/**
 * SYNOPSIS: Exports logFoodWithPhoto — services/lifeos-ai-photo-food-logger.js.
 */
export async function logFoodWithPhoto(db, userId, { imageUrl, imageBase64, description, loggedAt, callCouncilMember }) {
  if (![imageUrl, imageBase64, description].filter(Boolean).length === 1) {
    throw new Error('Exactly one of imageUrl, imageBase64, or description must be provided');
  }

  let foodLog = {
    user_id: userId,
    logged_at: loggedAt || new Date(),
    image_url: imageUrl || null,
    description: description || null,
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    confidence: null,
  };

  if ((imageUrl || imageBase64) && callCouncilMember) {
    try {
      const prompt = `Describe the food in the image: ${imageUrl || 'base64 image'}`;
      const aiResponse = await callCouncilMember('vision', prompt);
      const { food, calories, protein_g, carbs_g, fat_g, confidence } = JSON.parse(aiResponse);

      Object.assign(foodLog, {
        description: food,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        confidence,
      });
    } catch {
      foodLog.confidence = 'parse_failed';
    }
  } else if (description) {
    foodLog.confidence = 'user_provided';
  } else {
    foodLog.confidence = 'parse_failed';
  }

  const query = `INSERT INTO food_logs (user_id, logged_at, image_url, description, calories, protein_g, carbs_g, fat_g, confidence) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                 RETURNING *`;
  const values = [foodLog.user_id, foodLog.logged_at, foodLog.image_url, foodLog.description, foodLog.calories, foodLog.protein_g, foodLog.carbs_g, foodLog.fat_g, foodLog.confidence];

  const { rows } = await db.query(query, values);
  return rows[0];
}

export async function getFoodLogs(db, userId, { limit = 50, since }) {
  const query = `SELECT * FROM food_logs 
                 WHERE user_id = $1 AND (logged_at >= $2 OR $2 IS NULL) 
                 ORDER BY logged_at DESC 
                 LIMIT $3`;
  const values = [userId, since, limit];

  const { rows } = await db.query(query, values);
  return rows;
}

export async function getNutritionSummary(db, userId, days) {
  const query = `SELECT SUM(calories) AS total_calories, SUM(protein_g) AS total_protein, 
                        SUM(carbs_g) AS total_carbs, SUM(fat_g) AS total_fat, COUNT(*) AS log_count 
                 FROM food_logs 
                 WHERE user_id = $1 AND logged_at >= (CURRENT_DATE - $2::interval)`;
  const values = [userId, `${days} days`];

  const { rows } = await db.query(query, values);
  return rows[0];
}