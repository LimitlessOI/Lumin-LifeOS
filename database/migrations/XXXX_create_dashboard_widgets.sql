CREATE TABLE dashboard_widgets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    widget_type VARCHAR(255) NOT NULL,
    position JSONB NOT NULL,
    settings JSONB,
    FOREIGN KEY (user_id) REFERENCES users(id)
);