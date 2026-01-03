"migrations/001_create_games_table.sql": {
    "===FILE:migrations/001_create_table.sql===",
    "CREATE TABLE IF NOT EXISTS games (\\n  id SERIAL PRIMARY KEY, \\n  title VARCHAR(255), \\n  developer VARCHAR(255), \\n  platform VARCHAR(50), \\n  price DECIMAL);"
}