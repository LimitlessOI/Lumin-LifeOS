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
          } else if (!['parameters', 'description', 'summary'].includes(method.toLowerCase())) { // Allow path-level parameters/description
            return { isValid: false, message: `Path "${path}" contains an invalid HTTP method or field: "${method}".` };
          }
        }
      }
      if (!hasValidMethod) {
        return { isValid: false, message: `Path "${path}" does not define any valid HTTP operations.` };
      }
    }
  }

  // Add more specific validation rules here as needed
  // For instance, checking for valid HTTP methods, response schemas, etc.

  return { isValid: true, message: 'API specification is valid.' };
}