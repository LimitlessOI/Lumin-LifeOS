/**
 * SYNOPSIS: Exports inferFormSchema — services/formFieldInference.js.
 */
export function inferFormSchema(formElement) {
  const fields = formElement.querySelectorAll('input, select, textarea');
  const schema = {};

  fields.forEach(field => {
    const name = field.name || field.id;
    if (!name) {
      return;
    }

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

    schema[name] = {
      type: field.type || 'text',
      label: label || 'Unnamed Field',
      required: field.required || false,
    };
  });

  return schema;
}
