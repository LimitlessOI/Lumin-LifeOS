/**
 * SYNOPSIS: services/wellness-studio-recipes.js
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
// services/wellness-studio-recipes.js

// Function to recommend recipes based on available ingredients
export async function recommendRecipes(db, ingredients) {
  try {
    const query = `
      SELECT recipe_id, recipe_name FROM wellness_recipes
      WHERE ingredients && $1::text[];
    `;
    const { rows } = await db.query(query, [ingredients]);
    return rows;
  } catch (error) {
    console.error('Error recommending recipes:', error);
    throw error;
  }
}

// Function to create a new recipe in the database
export async function createRecipe(db, recipe) {
  try {
    const query = `
      INSERT INTO wellness_recipes (recipe_name, ingredients, instructions)
      VALUES ($1, $2, $3)
      RETURNING recipe_id;
    `;
    const { recipeName, ingredients, instructions } = recipe;
    const { rows } = await db.query(query, [recipeName, ingredients, instructions]);
    return rows[0].recipe_id;
  } catch (error) {
    console.error('Error creating recipe:', error);
    throw error;
  }
}

// Function to share a recipe with the community
export async function shareRecipe(db, recipeId, userId) {
  try {
    const query = `
      INSERT INTO wellness_recipe_recommendations (recipe_id, user_id)
      VALUES ($1, $2);
    `;
    await db.query(query, [recipeId, userId]);
    return { success: true };
  } catch (error) {
    console.error('Error sharing recipe:', error);
    throw error;
  }
}
