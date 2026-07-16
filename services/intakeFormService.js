/**
 * SYNOPSIS: Registers IntakeFormService routes/handlers (services/intakeFormService.js).
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
[
  {
    "old_string": "\n\nexport function registerIntakeFormService() {",
    "new_string": "\n\nexport function buildIntakeForm(config) {\n  if (config.mode === 'typeform') {\n    return 'Building Typeform intake form';\n  } else if (config.mode === 'custom') {\n    return 'Building custom intake form';\n  } else {\n    throw new Error('Unsupported intake form mode');\n  }\n}\n\nexport function registerIntakeFormService() {"
  }
]
