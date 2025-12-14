```javascript
const { SupportedLanguage } = require('../models');

async function seedLanguages() {
  const languages = [
    { language: 'javascript', displayName: 'JavaScript', syntaxHighlighter: 'javascript' },
    { language: 'python', displayName: 'Python', syntaxHighlighter: 'python' },
    // Add more languages as needed
  ];

  for (const lang of languages) {
    await SupportedLanguage.findOrCreate({
      where: { language: lang.language },
      defaults: lang,
    });
  }

  console.log('Languages seeded successfully.');
}

seedLanguages().catch(console.error);
```