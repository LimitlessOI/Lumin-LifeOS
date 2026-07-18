/**
 * SYNOPSIS: Exports hardenFieldTargeting — services/hardenFieldTargeting.js.
 */
export function hardenFieldTargeting(fieldTargets, payerOrderChanges) {
  return fieldTargets.map(target => {
    const finalizedTarget = { ...target };
    payerOrderChanges.forEach(change => {
      if (change.layout === finalizedTarget.layout) {
        finalizedTarget.fields = finalizedTarget.fields.map(field => {
          if (change.fields.includes(field.name)) {
            return { ...field, hardened: true };
          }
          return field;
        });
      }
    });
    return finalizedTarget;
  });
}