/**
 * SYNOPSIS: Registers UI and API routes for site builder customization.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */

const templates = [{ id: 'default', name: 'Default Template' }];
const colourPalettes = [{ id: 'default', name: 'Default Palette' }];
let customizationOptions = { templateId: 'default', paletteId: 'default' };

function getTemplates() {
  return templates;
}

function getColourPalettes() {
  return colourPalettes;
}

function getCustomizationOptions() {
  return { ...customizationOptions };
}

function saveCustomizationOptions({ templateId, paletteId }) {
  if (templateId) customizationOptions.templateId = templateId;
  if (paletteId) customizationOptions.paletteId = paletteId;
  return { saved: true };
}

export function registerSiteBuilderCustomizationUiRoutes(app, deps) {
  const requireKey = deps?.requireKey || ((req, res, next) => next());
  const logger = deps?.logger || console;

  app.get('/site-builder/customization', requireKey, async (req, res, next) => {
    try {
      if (!(deps && deps.isFounder === true)) {
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
                  selector.innerHTML = '';
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

              await fetchAndPopulate('/api/site-builder/templates', templateSelector, 'templates');
              await fetchAndPopulate('/api/site-builder/colour-palettes', paletteSelector, 'colour palettes');

              try {
                const initialResponse = await fetch('/api/site-builder/customization');
                if (!initialResponse.ok) throw new Error('Network response for initial customization was not ok.');
                const initialData = await initialResponse.json();
                if (initialData.templateId) templateSelector.value = initialData.templateId;
                if (initialData.paletteId) paletteSelector.value = initialData.paletteId;
              } catch (error) {
                console.warn('Could not fetch initial customization options:', error);
              }

              form.addEventListener('submit', async (event) => {
                event.preventDefault();
                statusDiv.className = '';
                statusDiv.textContent = 'Saving...';

                try {
                  const response = await fetch('/api/site-builder/customization', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      templateId: templateSelector.value,
                      paletteId: paletteSelector.value,
                    }),
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
      logger.error('Error in GET /site-builder/customization route', error);
      next(error);
    }
  });

  app.get('/api/site-builder/customization', requireKey, async (req, res, next) => {
    try {
      if (!(deps && deps.isFounder === true)) {
        return res.status(403).send('Forbidden: Founder access required.');
      }
      res.json(getCustomizationOptions());
    } catch (error) {
      logger.error('Error in GET /api/site-builder/customization route', error);
      next(error);
    }
  });

  app.post('/api/site-builder/customization', requireKey, async (req, res, next) => {
    try {
      if (!(deps && deps.isFounder === true)) {
        return res.status(403).send('Forbidden: Founder access required.');
      }
      const { templateId, paletteId } = req.body || {};
      saveCustomizationOptions({ templateId, paletteId });
      res.status(200).json({ message: 'Customization saved successfully.' });
    } catch (error) {
      logger.error('Error in POST /api/site-builder/customization route', error);
      next(error);
    }
  });

  app.get('/api/site-builder/colour-palettes', requireKey, async (req, res, next) => {
    try {
      if (!(deps && deps.isFounder === true)) {
        return res.status(403).send('Forbidden: Founder access required.');
      }
      res.json(getColourPalettes());
    } catch (error) {
      logger.error('Error in GET /api/site-builder/colour-palettes route', error);
      next(error);
    }
  });

  app.get('/api/site-builder/templates', requireKey, async (req, res, next) => {
    try {
      if (!(deps && deps.isFounder === true)) {
        return res.status(403).send('Forbidden: Founder access required.');
      }
      res.json(getTemplates());
    } catch (error) {
      logger.error('Error in GET /api/site-builder/templates route', error);
      next(error);
    }
  });
}

export const registerCustomizationUiRoutes = registerSiteBuilderCustomizationUiRoutes;
export const UiRoutes = registerSiteBuilderCustomizationUiRoutes;
