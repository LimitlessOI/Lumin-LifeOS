/**
 * SYNOPSIS: Registers CityOSHomeRoutes routes/handlers (routes/cityos-home-routes.js).
 */
export function registerCityOSHomeRoutes(app, deps) {
  app.get('/cityos-home', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>CityOS/Go Vegas Home</title>
        </head>
        <body>
          <h1>Welcome to CityOS/Go Vegas</h1>
          <p>Your gateway to smart city solutions.</p>
        </body>
      </html>
    `);
  });
}
