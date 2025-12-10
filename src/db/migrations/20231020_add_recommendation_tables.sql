ALTER TABLE user_preferences ADD COLUMN last_recommendation_viewed TIMESTAMP;
ALTER TABLE product_embeddings ADD COLUMN embedding VECTOR;
CREATE TABLE recommendation_analytics (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  product_id INT REFERENCES products(id),
  interaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);