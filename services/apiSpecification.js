/**
 * SYNOPSIS: Exports validateApiSpecification — services/apiSpecification.js.
 */
export function validateApiSpecification(apiSpec) {
  // Placeholder for detailed API specification validation logic
  // In a real scenario, this would involve schema validation,
  // checking for required fields, correct types, etc.
  // For now, a basic check for non-empty spec.
  if (!apiSpec || typeof apiSpec !== 'object' || Object.keys(apiSpec).length === 0) {
    return { isValid: false, message: 'API specification is empty, null, or not an object.' };
  }

  // Check for required top-level fields
  const requiredTopLevelFields = ['openapi', 'info', 'paths'];
  for (const field of requiredTopLevelFields) {
    if (!(field in apiSpec)) {
      return { isValid: false, message: `API specification is missing required top-level field: ${field}.` };
    }
  }

  // Validate 'openapi' version format
  if (typeof apiSpec.openapi !== 'string' || !/^\d+\.\d+\.\d+$/.test(apiSpec.openapi)) {
    return { isValid: false, message: 'API specification "openapi" field must be a valid version string (e.g., "3.0.0").' };
  }

  // Validate 'info' object
  if (typeof apiSpec.info !== 'object' || Object.keys(apiSpec.info).length === 0) {
    return { isValid: false, message: 'API specification "info" field is missing or empty.' };
  }
  const requiredInfoFields = ['title', 'version'];
  for (const field of requiredInfoFields) {
    if (!(field in apiSpec.info) || typeof apiSpec.info[field] !== 'string' || apiSpec.info[field].trim() === '') {
      return { isValid: false, message: `API specification "info" field is missing or has invalid "${field}".` };
    }
  }

  // Validate 'paths' object
  if (typeof apiSpec.paths !== 'object' || Object.keys(apiSpec.paths).length === 0) {
    return { isValid: false, message: 'API specification is missing or has empty "paths" object.' };
  }

  // Iterate through paths and validate each path item
  for (const path in apiSpec.paths) {
    if (Object.prototype.hasOwnProperty.call(apiSpec.paths, path)) {
      const pathItem = apiSpec.paths[path];
      if (typeof pathItem !== 'object' || Object.keys(pathItem).length === 0) {
        return { isValid: false, message: `Path "${path}" in API specification is malformed or empty.` };
      }

      const allowedHttpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
      let hasValidMethod = false;

      for (const method in pathItem) {
        if (Object.prototype.hasOwnProperty.call(pathItem, method)) {
          if (allowedHttpMethods.includes(method.toLowerCase())) {
            hasValidMethod = true;
            const operation = pathItem[method];
            if (typeof operation !== 'object' || Object.keys(operation).length === 0) {
              return { isValid: false, message: `Operation for method "${method}" on path "${path}" is malformed or empty.` };
            }
            // Further validation for operations could go here (e.g., responses, parameters)
            if (!('responses' in operation) || typeof operation.responses !== 'object' || Object.keys(operation.responses).length === 0) {
              return { isValid: false, message: `Operation for method "${method}" on path "${path}" is missing "responses".` };
            }

            // Validate responses object content
            for (const statusCode in operation.responses) {
              if (Object.prototype.hasOwnProperty.call(operation.responses, statusCode)) {
                if (!/^\d{3}$/.test(statusCode) && statusCode !== 'default') {
                  return { isValid: false, message: `Invalid HTTP status code "${statusCode}" in responses for method "${method}" on path "${path}".` };
                }
                const response = operation.responses[statusCode];
                if (typeof response !== 'object' || !('description' in response) || typeof response.description !== 'string' || response.description.trim() === '') {
                  return { isValid: false, message: `Response for status code "${statusCode}" in method "${method}" on path "${path}" is missing or has invalid "description".` };
                }
                // Validate content if present
                if ('content' in response) {
                  if (typeof response.content !== 'object' || Object.keys(response.content).length === 0) {
                    return { isValid: false, message: `Response content for status code "${statusCode}" in method "${method}" on path "${path}" is malformed or empty.` };
                  }
                  for (const mediaType in response.content) {
                    if (Object.prototype.hasOwnProperty.call(response.content, mediaType)) {
                      const mediaTypeObject = response.content[mediaType];
                      if (typeof mediaTypeObject !== 'object' || !('schema' in mediaTypeObject) || typeof mediaTypeObject.schema !== 'object') {
                        return { isValid: false, message: `Media type "${mediaType}" for status code "${statusCode}" in method "${method}" on path "${path}" is missing or has invalid "schema".` };
                      }
                    }
                  }
                }
              }
            }

            // Validate parameters if present
            if ('parameters' in operation) {
              if (!Array.isArray(operation.parameters)) {
                return { isValid: false, message: `Parameters for method "${method}" on path "${path}" must be an array.` };
              }
              for (const param of operation.parameters) {
                if (typeof param !== 'object' || !('name' in param) || !('in' in param)) {
                  return { isValid: false, message: `Malformed parameter in method "${method}" on path "${path}". Missing "name" or "in".` };
                }
                const allowedParamLocations = ['query', 'header', 'path', 'cookie'];
                if (!allowedParamLocations.includes(param.in)) {
                  return { isValid: false, message: `Invalid parameter location "${param.in}" for parameter "${param.name}" in method "${method}" on path "${path}".` };
                }
                if (param.in === 'path' && (!('required' in param) || param.required !== true)) {
                  return { isValid: false, message: `Path parameter "${param.name}" in method "${method}" on path "${path}" must be required.` };
                }
                if (!('schema' in param) || typeof param.schema !== 'object') {
                  return { isValid: false, message: `Parameter "${param.name}" in method "${method}" on path "${path}" is missing or has invalid "schema".` };
                }
              }
            }

            // Validate requestBody if present
            if ('requestBody' in operation) {
              const requestBody = operation.requestBody;
              if (typeof requestBody !== 'object' || !('content' in requestBody) || typeof requestBody.content !== 'object' || Object.keys(requestBody.content).length === 0) {
                return { isValid: false, message: `Request body for method "${method}" on path "${path}" is malformed or missing "content".` };
              }
              for (const mediaType in requestBody.content) {
                if (Object.prototype.hasOwnProperty.call(requestBody.content, mediaType)) {
                  const mediaTypeObject = requestBody.content[mediaType];
                  if (typeof mediaTypeObject !== 'object' || !('schema' in mediaTypeObject) || typeof mediaTypeObject.schema !== 'object') {
                    return { isValid: false, message: `Media type "${mediaType}" in request body for method "${method}" on path "${path}" is missing or has invalid "schema".` };
                  }
                }
              }
            }

          } else if (!['parameters', 'description', 'summary', 'servers', 'security', 'tags', 'externalDocs', 'callbacks'].includes(method.toLowerCase())) { // Allow path-level parameters/description/other OpenAPI fields
            return { isValid: false, message: `Path "${path}" contains an invalid HTTP method or field: "${method}".` };
          }
        }
      }
      if (!hasValidMethod) {
        return { isValid: false, message: `Path "${path}" does not define any valid HTTP operations.` };
      }
    }
  }

  // Validate components if present
  if ('components' in apiSpec) {
    const components = apiSpec.components;
    if (typeof components !== 'object') {
      return { isValid: false, message: 'API specification "components" field must be an object.' };
    }

    // Validate schemas
    if ('schemas' in components) {
      const schemas = components.schemas;
      if (typeof schemas !== 'object') {
        return { isValid: false, message: 'API specification "components.schemas" field must be an object.' };
      }
      for (const schemaName in schemas) {
        if (Object.prototype.hasOwnProperty.call(schemas, schemaName)) {
          const schema = schemas[schemaName];
          if (typeof schema !== 'object' || Object.keys(schema).length === 0) {
            return { isValid: false, message: `Component schema "${schemaName}" is malformed or empty.` };
          }
          // Basic check for schema type, more detailed validation would use a schema validator
          if (!('type' in schema) && !('$ref' in schema)) { // Allow $ref for referencing other schemas
            return { isValid: false, message: `Component schema "${schemaName}" is missing "type" or "$ref".` };
          }
        }
      }
    }

    // Validate securitySchemes
    if ('securitySchemes' in components) {
      const securitySchemes = components.securitySchemes;
      if (typeof securitySchemes !== 'object') {
        return { isValid: false, message: 'API specification "components.securitySchemes" field must be an object.' };
      }
      for (const schemeName in securitySchemes) {
        if (Object.prototype.hasOwnProperty.call(securitySchemes, schemeName)) {
          const scheme = securitySchemes[schemeName];
          if (typeof scheme !== 'object' || !('type' in scheme) || typeof scheme.type !== 'string') {
            return { isValid: false, message: `Security scheme "${schemeName}" is malformed or missing "type".` };
          }
          const allowedSchemeTypes = ['apiKey', 'http', 'oauth2', 'openIdConnect'];
          if (!allowedSchemeTypes.includes(scheme.type)) {
            return { isValid: false, message: `Invalid security scheme type "${scheme.type}" for scheme "${schemeName}".` };
          }
        }
      }
    }
  }

  // Validate security if present at top level
  if ('security' in apiSpec) {
    if (!Array.isArray(apiSpec.security)) {
      return { isValid: false, message: 'API specification "security" field must be an array.' };
    }
    for (const securityRequirement of apiSpec.security) {
      if (typeof securityRequirement !== 'object' || Object.keys(securityRequirement).length === 0) {
        return { isValid: false, message: 'Malformed security requirement in top-level "security" array.' };
      }
      for (const schemeName in securityRequirement) {
        if (Object.prototype.hasOwnProperty.call(securityRequirement, schemeName)) {
          if (!Array.isArray(securityRequirement[schemeName])) {
            return { isValid: false, message: `Scopes for security scheme "${schemeName}" in top-level "security" must be an array.` };
          }
        }
      }
    }
  }

  return { isValid: true, message: 'API specification is valid.' };
}