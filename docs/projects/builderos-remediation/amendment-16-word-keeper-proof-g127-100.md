<!-- SYNOPSIS: Amendment 16: Word Keeper - Proof Gap G127-100 -->

# Amendment 16: Word Keeper - Proof Gap G127-100

This document outlines the next smallest blueprint-backed build slice for Amendment 16, focusing on closing a critical proof gap related to the core Word Keeper functionality.

## 1. Exact Missing Implementation or Proof Gap

The foundational data model and persistence layer for the `Word` entity are not yet fully defined or implemented. Specifically, the database schema for storing `Word` objects and the corresponding ORM model definition are missing, preventing any further development or proof of concept for word management.

## 2. Smallest Safe Build Slice to Close It

Define the `Word` entity schema and implement the necessary database migration to create the `words` table. Concurrently, create the ORM model definition to interact with this table. This slice establishes the core data persistence for the Word Keeper.

## 3. Exact Safe-Scope Files to Touch First

*   `src/models/Word.js`: Define the ORM model for the `Word` entity (e.g., Mongoose schema or Sequelize model).
*   `src/db/migrations/YYYYMMDDHHMMSS-create-word-table.js`: Create a new database migration file to define the `words` table schema.
*   `src/schemas/wordSchema.js`: (Optional, but good practice) Define a Joi/Yup schema for `Word` validation.

## 4. Verifier/Runtime Checks

*   **Database Schema Inspection:** After applying the migration, verify that a `words` table exists in the database with the expected columns (e.g., `id`, `wordText`, `language`,