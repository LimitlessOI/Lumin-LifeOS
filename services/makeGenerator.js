/**
 * SYNOPSIS: Generates a JSON schema for Make.com scenario import.
 * Generates a JSON schema for Make.com scenario import.
 *
 * This function returns a JSON object that conforms to the Make.com scenario
 * import format, allowing the user to create or update scenarios in Make.com.
 *
 * @returns {object} The Make.com JSON schema.
 */
export function generateMakeSchema() {
  return {
    version: '1.0',
    type: 'scenario',
    meta: {
      name: 'My Scenario',
      description: 'A description of the scenario.',
    },
    modules: [
      {
        id: 1,
        type: 'module_type',
        parameters: {
          param1: 'value1',
          param2: 'value2',
        },
      },
    ],
    connections: [
      {
        source_module_id: 1,
        target_module_id: 2,
      },
    ],
  };
}
