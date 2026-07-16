/**
 * SYNOPSIS: LifeOS overlay UI — UiExtensions.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
[
  {
    "old_string": "export const extensionIcons = {\n  '16px': 'path/to/lifeos-icon-16.png',\n  '32px': 'path/to/lifeos-icon-32.png',\n  '48px': 'path/to/lifeos-icon-48.png',\n  '128px': 'path/to/lifeos-icon-128.png'\n};",
    "new_string": "export const extensionIcons = {\n  '16px': 'https://s3.amazonaws.com/lifeos/extension-icon-16.png',\n  '32px': 'https://s3.amazonaws.com/lifeos/extension-icon-32.png',\n  '48px': 'https://s3.amazonaws.com/lifeos/extension-icon-48.png',\n  '128px': 'https://s3.amazonaws.com/lifeos/extension-icon-128.png'\n};"
  }
]
