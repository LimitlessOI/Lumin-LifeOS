#!/bin/bash

# Initialize the database if not already done
psql -U $POSTGRES_USER -d $POSTGRES_DB -f /usr/src/app/database/migrations/initial_schema.sql

# Start the application
npm start