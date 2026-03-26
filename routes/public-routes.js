export function registerPublicRoutes(app, {
  fs,
  path,
  __dirname,
  COMMAND_CENTER_KEY,
}) {
  // ==================== COMMAND CENTER ROUTES (FIRST - Before all middleware) ====================
  // These MUST be defined before static middleware to work correctly
  app.get("/activate", (req, res) => {
    console.log("🔐 [ROUTE] /activate accessed");
    const filePath = path.join(__dirname, "public", "overlay", "activate.html");
    console.log("🔐 [ROUTE] File path:", filePath);
    console.log("🔐 [ROUTE] File exists:", fs.existsSync(filePath));
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      console.error("❌ [ROUTE] Activation page not found at:", filePath);
      res.status(404).send("Activation page not found.");
    }
  });

  app.get("/command-center", (req, res) => {
    console.log("🎯 [ROUTE] /command-center accessed");
    const filePath = path.join(
      __dirname,
      "public",
      "overlay",
      "command-center.html"
    );
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    return res
      .status(404)
      .send("Command center not found. Please ensure command-center.html exists.");
  });

  app.get("/tc", (req, res) => {
    const filePath = path.join(__dirname, "public", "tc", "agent-portal.html");
    if (fs.existsSync(filePath)) return res.sendFile(filePath);
    return res.status(404).send("TC agent portal not found.");
  });

  app.get("/tc/client", (req, res) => {
    const filePath = path.join(__dirname, "public", "tc", "client-portal.html");
    if (fs.existsSync(filePath)) return res.sendFile(filePath);
    return res.status(404).send("TC client portal not found.");
  });

  app.get("/clientcare-billing", (req, res) => {
    const filePath = path.join(__dirname, "public", "clientcare-billing", "overlay.html");
    if (fs.existsSync(filePath)) return res.sendFile(filePath);
    return res.status(404).send("ClientCare billing overlay not found.");
  });

  app.get("/boldtrail", (req, res) => {
    console.log("🏠 [ROUTE] /boldtrail accessed");
    // Only accept header-based auth (no query params)
    const key = req.headers["x-command-key"];

    if (key && key === COMMAND_CENTER_KEY) {
      const filePath = path.join(__dirname, "public", "overlay", "boldtrail.html");
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      } else {
        return res.status(404).send("BoldTrail overlay not found.");
      }
    }

    // No key or invalid key, redirect to activation
    res.redirect("/activate");
  });

  app.get("/overlay/website-audit", (req, res) => {
    const filePath = path.join(
      __dirname,
      "public",
      "overlay",
      "website-audit.html"
    );
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    res.status(404).send("Website audit overlay not found.");
  });

  app.get("/overlay/website-audit.html", (req, res) => {
    const filePath = path.join(
      __dirname,
      "public",
      "overlay",
      "website-audit.html"
    );
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    res.status(404).send("Website audit overlay not found.");
  });

  // ==================== ROOT ROUTE - API COST SAVINGS LANDING PAGE ====================
  // Must be defined BEFORE static middleware to take precedence
  app.get("/", (req, res) => {
    const landingPagePath = path.join(
      __dirname,
      "products",
      "api-service",
      "index.html"
    );
    if (fs.existsSync(landingPagePath)) {
      res.sendFile(landingPagePath);
    } else {
      console.warn(
        "⚠️ [ROUTE] API Cost Savings landing page not found, serving default"
      );
      res.status(404).send("Landing page not found");
    }
  });

  // ==================== STRIPE CHECKOUT SUCCESS/CANCEL PAGES ====================
  app.get("/success", (req, res) => {
    const successPagePath = path.join(
      __dirname,
      "products",
      "api-service",
      "success.html"
    );
    if (fs.existsSync(successPagePath)) {
      res.sendFile(successPagePath);
    } else {
      res.status(404).send("Success page not found");
    }
  });

  app.get("/cancel", (req, res) => {
    const cancelPagePath = path.join(
      __dirname,
      "products",
      "api-service",
      "cancel.html"
    );
    if (fs.existsSync(cancelPagePath)) {
      res.sendFile(cancelPagePath);
    } else {
      res.status(404).send("Cancel page not found");
    }
  });
}
