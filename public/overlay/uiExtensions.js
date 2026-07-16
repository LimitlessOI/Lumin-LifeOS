/**
 * SYNOPSIS: Exports new — public/overlay/uiExtensions.js.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
[
  {
    "old_string": "   export const extensionIcons = {\n     '16px': 'https://s3.amazonaws.com/lifeos/extension-icon-16.png',\n     '32px': 'https://s3.amazonaws.com/lifeos/extension-icon-32.png',\n     '48px': 'https://s3.amazonaws.com/lifeos/extension-icon-48.png',\n     '128px': 'https://s3.amazonaws.com/lifeos/extension-icon-128.png'\n   };",
    "new_string": "   export const extensionIcons = {\n     '16px': 'https://s3.amazonaws.com/lifeos/extension-icon-16.png',\n     '32px': 'https://s3.amazonaws.com/lifeos/extension-icon-32.png',\n     '48px': 'https://s3.amazonaws.com/lifeos/extension-icon-48.png',\n     '128px': 'https://s3.amazonaws.com/lifeos/extension-icon-128.png'\n   };\n\n   export function new IconComponent(size) {\n     return `<img src=\"${extensionIcons[size]}\" alt=\"LifeOS Icon\" />`;\n   }"
  }
]
