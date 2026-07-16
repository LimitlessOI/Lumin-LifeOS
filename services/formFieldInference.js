/**
 * SYNOPSIS: Exports inferFormSchema — services/formFieldInference.js.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
/**
 * Exports inferFormSchema, inferFormFieldSchema, and inferFieldSchema — services/formFieldInference.js.
 */
export function inferFormSchema(formElement) {
  const fields = formElement.querySelectorAll('input, select, textarea');
  const schema = {};

  fields.forEach(field => {
    const name = field.name || field.id;
    if (!name) {
      return;
    }

    const label = getLabelForField(field, formElement);
    const type = field.type || 'text';
    const required = field.required || false;

    schema[name] = {
      type,
      label,
      required,
    };
  });

  return schema;
}

function getLabelForField(field, formElement) {
  let label = '';
  const labelElement = formElement.querySelector(`label[for="${field.id}"]`);
  
  if (labelElement) {
    label = labelElement.textContent.trim();
  }
  
  const ariaLabel = field.getAttribute('aria-label');
  
  if (!label && ariaLabel) {
    label = ariaLabel.trim();
  }
  
  const placeholder = field.placeholder;
  
  if (!label && placeholder) {
    label = placeholder.trim();
  }
  
  return label || 'Unnamed Field';
}

export function inferFormFieldSchema(formElement) {
  return inferFormSchema(formElement);
}

export function inferFieldSchema(formElement) {
  return inferFormSchema(formElement);
}
