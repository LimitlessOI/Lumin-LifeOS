-- PostgreSQL Database Schema for AI Vault

CREATE TABLE ai_vault_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL
);

CREATE TABLE ai_vault_sources (
    id SERIAL PRIMARY KEY,
    file_path VARCHAR(255) NOT NULL,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_vault_conversations (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    content TEXT NOT NULL,
    context TEXT
);