/**
 * SYNOPSIS: Exports generateMakecomSchema — services/makecomGenerator.js.
 * @module makecomGenerator
 * @description This module provides functionality to generate a Make.com JSON schema.
 */

/**
 * Generates a JSON schema for Make.com integration scenarios.
 * @returns {object} The JSON schema for Make.com.
 */
export function generateMakecomSchema() {
  return {
    type: "object",
    properties: {
      scenarioName: {
        type: "string",
        description: "The name of the Make.com scenario."
      },
      modules: {
        type: "array",
        items: {
          type: "object",
          properties: {
            moduleId: {
              type: "string",
              description: "The unique identifier of the module."
            },
            moduleName: {
              type: "string",
              description: "The name of the module."
            },
            parameters: {
              type: "object",
              additionalProperties: {
                type: "string",
                description: "The parameters for the module."
              }
            }
          },
          required: ["moduleId", "moduleName"]
        },
        description: "An array of modules included in the scenario."
      }
    },
    required: ["scenarioName", "modules"]
  };
}
