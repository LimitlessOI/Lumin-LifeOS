/**
 * SYNOPSIS: Registers UI and API routes for site builder customization.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import { getCustomizationOptions, saveCustomizationOptions } from '../services/siteBuilderCustomizationService.js';
import { getColourPalettes } from '../services/siteBuilderPaletteService.js';
import { getTemplates } from '../services/siteBuilderTemplateService.js';

export function registerSiteBuilderCustomizationUiRoutes(app, deps) {
  app.get('/site-builder/customization', deps.requireKey, async (req, res, next) => {
    try {
      if (!deps.isFounder) { // Assuming deps.isFounder is the correct flag for founder-gating
        return res.status(403).send('Forbidden: Founder access required.');
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Site Builder Customization</title>
          <style>
            body { font-family: sans-serif; margin: 20px; }
            .container { max-width: 800px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            h1 { color: #333; }
            label { display: block; margin-top: 10px; margin-bottom: 5px; font-weight: bold; }
            select, button { padding: 10px; margin-top: 5px; border-radius: 4px; border: 1px solid #ccc; }
            button { background-color: #007bff; color: white; cursor: pointer; border: none; }
            button:hover { background-color: #0056b3; }
            #status { margin-top: 20px; padding: 10px; border-radius: 4px; }
            .success { background-color: #d4edda; color: #155724; border-color: #c3e6cb; }
            .error { background-color: #f8d7da; color: #721c24; border-color: #f5c6cb; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Customize Your Site</h1>
            <form id="customizationForm">
              <label for="templateSelector">Select Template:</label>
              <select id="templateSelector" name="templateId">
                <option value="">Loading templates...</option>
              </select>

              <label for="paletteSelector">Select Colour Palette:</label>
              <select id="paletteSelector" name="paletteId">
                <option value="">Loading palettes...</option>
              </select>
              
              <button type="submit">Save Customization</button>
            </form>
            <div id="status"></div>
          </div>

          <script>
            document.addEventListener('DOMContentLoaded', async () => {
              const templateSelector = document.getElementById('templateSelector');
              const paletteSelector = document.getElementById('paletteSelector');
              const statusDiv = document.getElementById('status');
              const form = document.getElementById('customizationForm');

              async function fetchAndPopulate(url, selector, placeholderText) {
                try {
                  const response = await fetch(url);
                  if (!response.ok) throw new Error('Network response was not ok.');
                  const data = await response.json();
                  selector.innerHTML = ''; // Clear loading text
                  data.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = item.name;
                    selector.appendChild(option);
                  });
                } catch (error) {
                  console.error('Failed to fetch:', url, error);
                  selector.innerHTML = \`<option value="">Failed to load \${placeholderText}</option>\`;
                  statusDiv.className = 'status error';
                  statusDiv.textContent = \`Error loading \${placeholderText}: \${error.message}\`;
                }
              }

              // Fetch and populate templates
              await fetchAndPopulate('/api/site-builder/templates', templateSelector, 'templates');

              // Fetch and populate colour palettes
              await fetchAndPopulate('/api/site-builder/colour-palettes', paletteSelector, 'colour palettes');

              // Fetch initial customization options to pre-select
              try {
                const initialResponse = await fetch('/api/site-builder/customization');
                if (!initialResponse.ok) throw new Error('Network response for initial customization was not ok.');
                const initialData = await initialResponse.json();
                if (initialData.templateId) {
                  templateSelector.value = initialData.templateId;
                }
                if (initialData.paletteId) {
                  paletteSelector.value = initialData.paletteId;
                }
              } catch (error) {
                console.warn('Could not fetch initial customization options:', error);
                // Not critical, continue without pre-selection
              }

              form.addEventListener('submit', async (event) => {
                event.preventDefault();
                statusDiv.className = '';
                statusDiv.textContent = 'Saving...';

                const selectedTemplateId = templateSelector.value;
                const selectedPaletteId = paletteSelector.value;

                try {
                  const response = await fetch('/api/site-builder/customization', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ templateId: selectedTemplateId, paletteId: selectedPaletteId }),
                  });

                  if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(\`Server error: \${response.status} \${errorText}\`);
                  }

                  statusDiv.className = 'status success';
                  statusDiv.textContent = 'Customization saved successfully!';
                } catch (error) {
                  console.error('Failed to save customization:', error);
                  statusDiv.className = 'status error';
                  statusDiv.textContent = \`Error saving customization: \${error.message}\`;
                }
              });
            });
          </script>
        </body>
        </html>
      `;
      res.send(htmlContent);
    } catch (error) {
      deps.logger.error({ error }, 'Error in GET /site-builder/customization route');
      next(error);
    }
  });

  app.get('/api/site-builder/customization', deps.requireKey, async (req, res, next) => {
    try {
      if (!deps.isFounder) {
        return res.status(403).send('Forbidden: Founder access required.');
      }

      const result = await getCustomizationOptions(deps); // No params needed for fetching general options
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in GET /api/site-builder/customization route');
      next(error);
    }
  });

  app.post('/api/site-builder/customization', deps.requireKey, async (req, res, next) => {
    try {
      if (!deps.isFounder) {
        return res.status(403).send('Forbidden: Founder access required.');
      }

      const { templateId, paletteId } = req.body;
      // Assuming saveCustomizationOptions expects these as a payload object
      await saveCustomizationOptions(deps, { templateId, paletteId });
      res.status(200).json({ message: 'Customization saved successfully.' });
    } catch (error) {
      deps.logger.error({ error }, 'Error in POST /api/site-builder/customization route');
      next(error);
    }
  });

  app.get('/api/site-builder/colour-palettes', deps.requireKey, async (req, res, next) => {
    try {
      if (!deps.isFounder) {
        return res.status(403).send('Forbidden: Founder access required.');
      }

      const palettes = await getColourPalettes(deps);
      res.json(palettes);
    } catch (error) {
      deps.logger.error({ error }, 'Error in GET /api/site-builder/colour-palettes route');
      next(error);
    }
  });

  app.get('/api/site-builder/templates', deps.requireKey, async (req, res, next) => {
    try {
      if (!deps.isFounder) {
        return res.status(403).send('Forbidden: Founder access required.');
      }

      const templates = await getTemplates(deps);
      res.json(templates);
    } catch (error) {
      deps.logger.error({ error }, 'Error in GET /api/site-builder/templates route');
      next(error);
    }
  });
}

// Named export for consistency with the pattern used for registerSiteBuilderCustomizationUiRoutes
export const UiRoutes = registerSiteBuilderCustomizationUiRoutes;