/**
 * SYNOPSIS: Exports getColorPalettes — services/site-builder-color-palettes.js.
 */
const colorPalettes = [
  {
    id: '1',
    label: 'Ocean Calm',
    description: 'A soothing palette inspired by the serene colors of the sea.',
    primary: '#005f73',
    secondary: '#0a9396',
    accent: '#94d2bd',
    background: '#e9d8a6',
    text: '#001219'
  },
  {
    id: '2',
    label: 'Bold Contrast',
    description: 'A dynamic palette with strong, contrasting colors.',
    primary: '#ee9b00',
    secondary: '#ca6702',
    accent: '#bb3e03',
    background: '#ffefef',
    text: '#370617'
  },
  {
    id: '3',
    label: 'Sunny Day',
    description: 'Bright and cheerful colors reminiscent of a summer day.',
    primary: '#f4a261',
    secondary: '#e76f51',
    accent: '#2a9d8f',
    background: '#e9c46a',
    text: '#264653'
  },
  {
    id: '4',
    label: 'Forest Walk',
    description: 'Earthy tones that evoke the tranquility of a forest.',
    primary: '#2b9348',
    secondary: '#55a630',
    accent: '#80b918',
    background: '#d9ed92',
    text: '#081c15'
  },
  {
    id: '5',
    label: 'Vintage Vibes',
    description: 'A classic palette with a touch of nostalgia.',
    primary: '#d4a373',
    secondary: '#bc6c25',
    accent: '#8d4f2d',
    background: '#fefae0',
    text: '#432818'
  },
  {
    id: '6',
    label: 'Modern Minimal',
    description: 'Simple and clean colors for a modern aesthetic.',
    primary: '#f8f9fa',
    secondary: '#adb5bd',
    accent: '#6c757d',
    background: '#343a40',
    text: '#212529'
  },
  {
    id: '7',
    label: 'Retro Pop',
    description: 'Vibrant colors with a retro twist.',
    primary: '#ff006e',
    secondary: '#8338ec',
    accent: '#3a86ff',
    background: '#ffbe0b',
    text: '#000000'
  },
  {
    id: '8',
    label: 'Earthy Elegance',
    description: 'Sophisticated tones with a natural feel.',
    primary: '#6b705c',
    secondary: '#a5a58d',
    accent: '#b7b7a4',
    background: '#edeec9',
    text: '#3a3a3a'
  }
];

export function getColorPalettes() {
  return colorPalettes;
}

export function getPaletteById(id) {
  return colorPalettes.find(palette => palette.id === id);
}