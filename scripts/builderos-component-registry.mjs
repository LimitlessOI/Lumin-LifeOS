/**
 * SYNOPSIS: Define the canonical BuilderOS alpha components.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

// Define the canonical BuilderOS alpha components.
// These components are fundamental building blocks for the BuilderOS platform,
// providing a core set of UI and logic elements.
const BUILDEROS_ALPHA_COMPONENTS = Object.freeze([
  {
    component_id: 'container',
    label: 'Container',
    category: 'Layout',
  },
  {
    component_id: 'text_display',
    label: 'Text Display',
    category: 'Display',
  },
  {
    component_id: 'button',
    label: 'Button',
    category: 'Input',
  },
  {
    component_id: 'image_display',
    label: 'Image Display',
    category: 'Display',
  },
  {
    component_id: 'text_input',
    label: 'Text Input',
    category: 'Input',
  },
  {
    component_id: 'dropdown_select',
    label: 'Dropdown Select',
    category: 'Input',
  },
  {
    component_id: 'data_table',
    label: 'Data Table',
    category: 'Display',
  },
  {
    component_id: 'chart_display',
    label: 'Chart Display',
    category: 'Display',
  },
  {
    component_id: 'form_layout',
    label: 'Form Layout',
    category: 'Layout',
  },
  {
    component_id: 'repeater_list',
    label: 'Repeater List',
    category: 'Logic',
  },
  {
    component_id: 'conditional_logic',
    label: 'Conditional Logic',
    category: 'Logic',
  },
  {
    component_id: 'timer_utility',
    label: 'Timer Utility',
    category: 'Utility',
  },
]);

/**
 * Retrieves an array of the 12 canonical BuilderOS alpha components.
 * Each component object includes a unique `component_id` (string),
 * a human-readable `label` (string), and a `category` (string) for organization.
 *
 * This function returns a shallow copy of the internal component registry
 * to ensure immutability of the canonical list.
 *
 * @returns {Array<Object>} An array of BuilderOS alpha component objects.
 */
export function getBuilderOSComponents() {
  // Return a shallow copy to prevent external modification of the original constant array.
  return [...BUILDEROS_ALPHA_COMPONENTS];
}

// This file intentionally does not include a CLI entry point as per BuilderOS requirements.
// All functionality is exposed via ESM exports.