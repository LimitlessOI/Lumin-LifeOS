/**
 * SYNOPSIS: services/detailedApiSpecService.js
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */
// services/detailedApiSpecService.js

// This module is intended for ESM export only.
// NO:CJS indicates CommonJS syntax is not to be used.
// DUPEXPORT and PRESERVE criticalities suggest careful management of exports
// to avoid duplication and ensure existing exports are maintained if this were an update.
// As this is a creation task, the focus is on a clean initial export.

/**
 * @file This service provides functionality to construct and retrieve a detailed API specification.
 * @module detailedApiSpecService
 */

/**
 * Generates and returns a detailed API specification.
 * This function is designed to be the primary export and fulfill the getApiSpecification requirement.
 *
 * @function getApiSpecification
 * @returns {object} A comprehensive API specification object.
 *                   The structure and content should be detailed enough to
 *                   describe all available endpoints, data models,
 *                   authentication methods, and other relevant API aspects.
 */
export const getApiSpecification = () => {
  // Placeholder for the actual API specification logic.
  // In a real application, this would dynamically generate or retrieve
  // the specification from various sources (e.g., JSDoc, route definitions, OpenAPI/Swagger files).
  return {
    openapi: '3.0.0',
    info: {
      title: 'Detailed API Specification Service',
      version: '1.0.0',
      description: 'Comprehensive documentation for all API endpoints and data models.',
    },
    servers: [
      {
        url: 'https://api.example.com/v1',
        description: 'Main production server',
      },
      {
        url: 'https://dev.example.com/v1',
        description: 'Development server',
      },
    ],
    paths: {
      '/users': {
        get: {
          summary: 'Retrieve a list of users',
          operationId: 'getUsers',
          tags: ['Users'],
          responses: {
            '200': {
              description: 'A list of users.',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Create a new user',
          operationId: 'createUser',
          tags: ['Users'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/NewUser',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'User created successfully.',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User',
                  },
                },
              },
            },
          },
        },
      },
      '/users/{id}': {
        get: {
          summary: 'Retrieve a single user by ID',
          operationId: 'getUserById',
          tags: ['Users'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID of the user to retrieve',
              schema: {
                type: 'string',
                format: 'uuid',
              },
            },
          ],
          responses: {
            '200': {
              description: 'A single user object.',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User',
                  },
                },
              },
            },
            '404': {
              description: 'User not found.',
            },
          },
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the user',
            },
            username: {
              type: 'string',
              description: 'User\'s chosen username',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User\'s email address',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the user was created',
            },
          },
          required: ['id', 'username', 'email', 'createdAt'],
        },
        NewUser: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'User\'s chosen username',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User\'s email address',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User\'s password',
            },
          },
          required: ['username', 'email', 'password'],
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  };
};
