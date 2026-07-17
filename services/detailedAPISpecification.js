/**
 * SYNOPSIS: services/detailedAPISpecification.js
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */
// services/detailedAPISpecification.js

// ESM:EXPORTS
/**
 * @file This file defines the detailed API specification for music-talent-studio features.
 * It is designed to be exported as an ESM module.
 */

/**
 * Retrieves the detailed API specification for music-talent-studio features.
 *
 * @returns {object} The API specification object.
 * @MUST:EXPORT
 */
export function getAPISpecification() {
  return {
    "apiName": "Music Talent Studio API",
    "version": "1.0.0",
    "description": "API for managing music talent, studio bookings, and related features.",
    "basePath": "/api/v1",
    "endpoints": [
      {
        "path": "/artists",
        "method": "GET",
        "summary": "Get a list of all artists",
        "description": "Retrieves an array of artist profiles.",
        "request": {
          "queryParameters": {
            "genre": { "type": "string", "description": "Filter by music genre" },
            "location": { "type": "string", "description": "Filter by artist location" }
          }
        },
        "response": {
          "200": {
            "description": "A list of artists",
            "schema": {
              "type": "array",
              "items": { "$ref": "#/components/schemas/ArtistProfile" }
            }
          }
        }
      },
      {
        "path": "/artists/{artistId}",
        "method": "GET",
        "summary": "Get a single artist by ID",
        "description": "Retrieves the profile for a specific artist.",
        "request": {
          "pathParameters": {
            "artistId": { "type": "string", "description": "Unique identifier of the artist" }
          }
        },
        "response": {
          "200": {
            "description": "Artist profile found",
            "schema": { "$ref": "#/components/schemas/ArtistProfile" }
          },
          "404": { "description": "Artist not found" }
        }
      },
      {
        "path": "/artists",
        "method": "POST",
        "summary": "Create a new artist profile",
        "description": "Adds a new artist to the system.",
        "request": {
          "body": {
            "description": "Artist profile data",
            "schema": { "$ref": "#/components/schemas/ArtistProfileCreation" }
          }
        },
        "response": {
          "201": {
            "description": "Artist created successfully",
            "schema": { "$ref": "#/components/schemas/ArtistProfile" }
          },
          "400": { "description": "Invalid input" }
        }
      },
      {
        "path": "/studios",
        "method": "GET",
        "summary": "Get a list of all studios",
        "description": "Retrieves an array of studio profiles.",
        "request": {
          "queryParameters": {
            "location": { "type": "string", "description": "Filter by studio location" },
            "availability": { "type": "date", "description": "Filter by availability date" }
          }
        },
        "response": {
          "200": {
            "description": "A list of studios",
            "schema": {
              "type": "array",
              "items": { "$ref": "#/components/schemas/StudioProfile" }
            }
          }
        }
      },
      {
        "path": "/studios/{studioId}/bookings",
        "method": "POST",
        "summary": "Book a studio session",
        "description": "Creates a new booking for a specific studio.",
        "request": {
          "pathParameters": {
            "studioId": { "type": "string", "description": "Unique identifier of the studio" }
          },
          "body": {
            "description": "Booking details",
            "schema": { "$ref": "#/components/schemas/StudioBookingRequest" }
          }
        },
        "response": {
          "201": {
            "description": "Studio booked successfully",
            "schema": { "$ref": "#/components/schemas/StudioBooking" }
          },
          "400": { "description": "Invalid input or studio unavailable" }
        }
      }
    ],
    "components": {
      "schemas": {
        "ArtistProfile": {
          "type": "object",
          "properties": {
            "id": { "type": "string", "readOnly": true },
            "name": { "type": "string" },
            "genre": { "type": "array", "items": { "type": "string" } },
            "bio": { "type": "string" },
            "contactEmail": { "type": "string", "format": "email" },
            "portfolioUrl": { "type": "string", "format": "url" }
          },
          "required": ["id", "name", "genre", "contactEmail"]
        },
        "ArtistProfileCreation": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "genre": { "type": "array", "items": { "type": "string" } },
            "bio": { "type": "string" },
            "contactEmail": { "type": "string", "format": "email" },
            "portfolioUrl": { "type": "string", "format": "url" }
          },
          "required": ["name", "genre", "contactEmail"]
        },
        "StudioProfile": {
          "type": "object",
          "properties": {
            "id": { "type": "string", "readOnly": true },
            "name": { "type": "string" },
            "location": { "type": "string" },
            "equipment": { "type": "array", "items": { "type": "string" } },
            "hourlyRate": { "type": "number", "format": "float" },
            "contactEmail": { "type": "string", "format": "email" }
          },
          "required": ["id", "name", "location", "hourlyRate", "contactEmail"]
        },
        "StudioBookingRequest": {
          "type": "object",
          "properties": {
            "artistId": { "type": "string", "description": "ID of the artist making the booking" },
            "startTime": { "type": "string", "format": "date-time" },
            "endTime": { "type": "string", "format": "date-time" },
            "purpose": { "type": "string" }
          },
          "required": ["artistId", "startTime", "endTime", "purpose"]
        },
        "StudioBooking": {
          "type": "object",
          "properties": {
            "id": { "type": "string", "readOnly": true },
            "studioId": { "type": "string" },
            "artistId": { "type": "string" },
            "startTime": { "type": "string", "format": "date-time" },
            "endTime": { "type": "string", "format": "date-time" },
            "status": { "type": "string", "enum": ["pending", "confirmed", "cancelled"] },
            "createdAt": { "type": "string", "format": "date-time", "readOnly": true }
          },
          "required": ["id", "studioId", "artistId", "startTime", "endTime", "status"]
        }
      }
    }
  };
}
