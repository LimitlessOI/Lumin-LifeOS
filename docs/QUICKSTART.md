# Quickstart Guide

## Setup

1. Clone the repository.
2. Copy `.env.example` to `.env` and configure your environment variables.
3. Run `docker-compose up` to start the application.
4. Access the API at `http://localhost:3000`.

## Endpoints

- **GET /api/v1/templates**: Retrieve all templates.
- **POST /api/v1/templates/generate**: Generate a new template.
- **POST /api/v1/deploy**: Deploy a new application.
- **GET /api/v1/deployments/:id/status**: Check the status of a deployment.

For more information, refer to the API documentation.