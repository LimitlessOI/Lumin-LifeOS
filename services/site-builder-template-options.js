/**
 * SYNOPSIS: Exports getTemplateOptions — services/site-builder-template-options.js.
 */
const templates = [
  {
    id: '1',
    name: 'Minimalist Chic',
    description: 'A clean and modern template with a minimalist design.',
    thumbnailUrl: 'https://example.com/thumbnails/minimalist-chic.png',
    tags: ['minimal', 'modern', 'clean']
  },
  {
    id: '2',
    name: 'Bold Statement',
    description: 'A bold and vibrant template for impactful presentations.',
    thumbnailUrl: 'https://example.com/thumbnails/bold-statement.png',
    tags: ['bold', 'vibrant', 'impactful']
  },
  {
    id: '3',
    name: 'Classic Elegance',
    description: 'A timeless template with classic design elements.',
    thumbnailUrl: 'https://example.com/thumbnails/classic-elegance.png',
    tags: ['classic', 'timeless', 'elegant']
  },
  {
    id: '4',
    name: 'Modern Edge',
    description: 'A sleek template with sharp lines and modern aesthetics.',
    thumbnailUrl: 'https://example.com/thumbnails/modern-edge.png',
    tags: ['modern', 'sleek', 'sharp']
  },
  {
    id: '5',
    name: 'Playful Vibes',
    description: 'A fun and playful template with vibrant colors.',
    thumbnailUrl: 'https://example.com/thumbnails/playful-vibes.png',
    tags: ['playful', 'fun', 'vibrant']
  }
];

export function getTemplateOptions() {
  return templates;
}

export function getTemplateById(id) {
  return templates.find(template => template.id === id);
}
