class TemplateEngine {
  constructor() {
    this.templates = {};
  }

  addTemplate(name, content) {
    this.templates[name] = content;
  }

  generateDocument(templateName, data) {
    if (!this.templates[templateName]) {
      throw new Error(`Template ${templateName} not found`);
    }
    let document = this.templates[templateName];
    for (const [key, value] of Object.entries(data)) {
      document = document.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return document;
  }
}

module.exports = TemplateEngine;