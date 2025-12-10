```sql
CREATE TABLE ai_model_funnel_data (
    id SERIAL PRIMARY KEY,
    ai_model_id INT NOT NULL,
    funnel_id INT NOT NULL,
    performance_metrics JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ai_model_id) REFERENCES ai_models(id),
    FOREIGN KEY (funnel_id) REFERENCES funnels(id)
);

CREATE INDEX idx_ai_model_funnel_data_ai_model_id ON ai_model_funnel_data(ai_model_id);
CREATE INDEX idx_ai_model_funnel_data_funnel_id ON ai_model_funnel_data(funnel_id);
```