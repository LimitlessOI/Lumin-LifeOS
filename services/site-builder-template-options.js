/**
 * SYNOPSIS: Exports getTemplateOptions — services/site-builder-template-options.js.
 */
const templates = [
  {
    id: '1',
    name: 'Minimalist Elegance',
    description: 'A clean and simple design with a focus on typography and white space.',
    thumbnailUrl: 'https://example.com/thumbnails/minimalist-elegance.png',
    tags: ['minimal', 'clean', 'typography']
  },
  {
    id: '2',
    name: 'Bold Statements',
    description: 'A vibrant and colorful design that makes a strong visual impact.',
    thumbnailUrl: 'https://example.com/thumbnails/bold-statements.png',
    tags: ['bold', 'vibrant', 'colorful']
  },
  {
    id: '3',
    name: 'Classic Touch',
    description: 'Timeless design with a classic layout and elegant details.',
    thumbnailUrl: 'https://example.com/thumbnails/classic-touch.png',
    tags: ['classic', 'elegant', 'timeless']
  },
  {
    id: '4',
    name: 'Modern Simplicity',
    description: 'A sleek and contemporary design with modern features.',
    thumbnailUrl: 'https://example.com/thumbnails/modern-simplicity.png',
    tags: ['modern', 'sleek', 'contemporary']
  },
  {
    id: '5',
    name: 'Playful Vibes',
    description: 'A fun and engaging design with playful elements and animations.',
    thumbnailUrl: 'https://example.com/thumbnails/playful-vibes.png',
    tags: ['playful', 'fun', 'engaging']
  }
];

export function getTemplateOptions() {
  return templates;
}

export function getTemplateById(id) {
  return templates.find(template => template.id === id);
}