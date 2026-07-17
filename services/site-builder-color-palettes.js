/**
 * SYNOPSIS: Exports getColorPalettes — services/site-builder-color-palettes.js.
 */
const colorPalettes = [
  {
    id: '1',
    label: 'Ocean Calm',
    description: 'Inspired by the serene blues and greens of the ocean.',
    primary: '#0077be',
    secondary: '#00aaff',
    accent: '#ffdd00',
    background: '#e0f7fa',
    text: '#003366'
  },
  {
    id: '2',
    label: 'Bold Contrast',
    description: 'A striking palette with bold, contrasting colors.',
    primary: '#ff0000',
    secondary: '#000000',
    accent: '#ffffff',
    background: '#eeeeee',
    text: '#333333'
  },
  {
    id: '3',
    label: 'Sunset Glow',
    description: 'Warm hues reminiscent of a sunset.',
    primary: '#ff4500',
    secondary: '#ff6347',
    accent: '#ffef00',
    background: '#fff5ee',
    text: '#8b0000'
  },
  {
    id: '4',
    label: 'Forest Whisper',
    description: 'Earthy tones inspired by the forest.',
    primary: '#228b22',
    secondary: '#556b2f',
    accent: '#8fbc8f',
    background: '#f5fff5',
    text: '#2e8b57'
  },
  {
    id: '5',
    label: 'Urban Night',
    description: 'Urban-inspired dark and sleek palette.',
    primary: '#2c3e50',
    secondary: '#34495e',
    accent: '#ecf0f1',
    background: '#1c1c1c',
    text: '#bdc3c7'
  },
  {
    id: '6',
    label: 'Vintage Rose',
    description: 'Soft and elegant with a vintage touch.',
    primary: '#d8bfd8',
    secondary: '#dda0dd',
    accent: '#ffe4e1',
    background: '#fff0f5',
    text: '#800080'
  },
  {
    id: '7',
    label: 'Sunny Meadow',
    description: 'Bright and cheerful, like a sunny day in a meadow.',
    primary: '#ffd700',
    secondary: '#f0e68c',
    accent: '#adff2f',
    background: '#fafad2',
    text: '#9acd32'
  },
  {
    id: '8',
    label: 'Cool Breeze',
    description: 'Refreshing and light, inspired by a cool breeze.',
    primary: '#00ced1',
    secondary: '#afeeee',
    accent: '#f0ffff',
    background: '#f0f8ff',
    text: '#4682b4'
  }
];

export function getColorPalettes() {
  return colorPalettes;
}

export function getPaletteById(id) {
  return colorPalettes.find(palette => palette.id === id);
}
