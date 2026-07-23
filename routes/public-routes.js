/**
 * SYNOPSIS: Public HTML entry routes for operator-facing overlays and portals.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * Public HTML entry routes for operator-facing overlays and portals.
 */
import { verifyToken, signToken } from '../services/lifeos-auth.js';

export function registerPublicRoutes(app, {
  fs,
  path,
  __dirname,
  COMMAND_CENTER_KEY,
}) {
  function resolveOverlayFile(file, allowedExtensions = []) {
    const safeFile = String(file || "").trim();
    if (!/^[a-z0-9._-]+\.[a-z0-9]+$/i.test(safeFile)) return null;
    const ext = safeFile.split(".").pop().toLowerCase();
    if (allowedExtensions.length && !allowedExtensions.includes(ext)) return null;
    const filePath = path.join(__dirname, "public", "overlay", safeFile);
    return fs.existsSync(filePath) ? filePath : null;
  }

  function resolveOverlayIcon(file) {
    const safeFile = String(file || "").trim();
    if (!/^[a-z0-9._-]+\.(png|svg)$/i.test(safeFile)) return null;
    const filePath = path.join(__dirname, "public", "overlay", "icons", safeFile);
    return fs.existsSync(filePath) ? filePath : null;
  }

  function sendPublicFileNoCache(res, filePath) {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });
    const ext = path.extname(filePath).toLowerCase();
    const type =
      ext === '.html' ? 'text/html; charset=UTF-8'
      : ext === '.css' ? 'text/css; charset=UTF-8'
      : ext === '.js' ? 'application/javascript; charset=UTF-8'
      : ext === '.webmanifest' ? 'application/manifest+json; charset=UTF-8'
      : ext === '.svg' ? 'image/svg+xml'
      : ext === '.png' ? 'image/png'
      : undefined;
    if (type) {
      res.set("Content-Type", type);
    }
    const body = fs.readFileSync(filePath);
    return res.send(body);
  }

  function readCookie(req, name) {
    const raw = String(req.headers.cookie || '');
    if (!raw) return '';
    const pairs = raw.split(';');
    for (const pair of pairs) {
      const [k, ...rest] = pair.trim().split('=');
      if (k === name) return decodeURIComponent(rest.join('=') || '');
    }
    return '';
  }

  function isFounderInterfaceAuthenticated(req) {
    const authHeader = String(req.headers.authorization || '');
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const token = bearer || String(req.headers['x-lifeos-token'] || '').trim() || readCookie(req, 'lifeos_access_token');
    if (token) {
      try {
        verifyToken(token);
        return true;
      } catch {
        return false;
      }
    }
    const key = String(req.headers['x-command-key'] || '').trim();
    // x-command-key (COMMAND_CENTER_KEY) is the master founder key — always sufficient
    const expected = String(COMMAND_CENTER_KEY || '').trim();
    return Boolean(key && expected && key === expected);
  }

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

  // Legacy command surfaces are deactivated at entrypoint level.
  app.get("/command-center", (_req, res) => res.redirect(301, "/lifeos?direct_system=1"));
  app.get("/lifeos-command-center", (_req, res) => res.redirect(301, "/lifeos?direct_system=1"));
  app.get("/mission-dashboard", (_req, res) => res.redirect(301, "/lifeos?direct_system=1"));

  // LifeOS Communication surface is now consolidated into the canonical /lifeos shell.
  app.get("/lifeos-communication", (_req, res) =>
    res.redirect(301, "/lifeos?direct_system=1")
  );

  app.get("/communicate", (_req, res) => res.redirect(301, "/lifeos?direct_system=1"));
  app.get("/overlay/lifeos-communication.html", (_req, res) =>
    res.redirect(301, "/lifeos?direct_system=1")
  );

  // Founder Interface is consolidated into canonical /lifeos direct-system mode.
  app.get("/lifeos-founder-interface", (_req, res) => res.redirect(301, "/lifeos?direct_system=1"));
  app.get("/c2-terminal-bridge", (_req, res) => res.redirect(301, "/lifeos?direct_system=1"));

  // Voice Rail public surface is retired at entrypoint layer.
  app.get("/voice-rail", (_req, res) => res.redirect(301, "/lifeos?direct_system=1"));
  app.get("/overlay/lifeos-voice-rail-v1.html", (_req, res) => res.redirect(301, "/lifeos?direct_system=1"));
  app.get("/overlay/lifeos-command-center.html", (_req, res) => res.redirect(301, "/lifeos?direct_system=1"));
  app.get("/overlay/lifeos-founder-interface.html", (_req, res) => res.redirect(301, "/lifeos?direct_system=1"));
  app.get("/overlay/c2-mission-dashboard.html", (_req, res) => res.redirect(301, "/lifeos?direct_system=1"));

  // Retired legacy overlay prototypes (archived to docs/history/legacy-overlays/).
  // Their files no longer exist; redirect any old bookmark to the one canonical interface.
  for (const legacyOverlay of [
    "lifeos-alpha.html",
    "lifeos-alpha-rail.html",
    "command-center.html",
    "control.html",
    "lifeos-backtest.html",
    "lifeos-builder-test.html",
    "lifere-os-v1.html",
    "portal.html",
  ]) {
    app.get(`/overlay/${legacyOverlay}`, (_req, res) =>
      res.redirect(301, "/lifeos?direct_system=1")
    );
  }

  // Household Mission Board — BPB-0001 §Section 7 (AMENDMENT_47)
  app.get("/lifeos-household", (req, res) => {
    const filePath = path.join(__dirname, "public", "overlay", "lifeos-household.html");
    if (fs.existsSync(filePath)) return sendPublicFileNoCache(res, filePath);
    return res.status(404).send("Household mission board not found.");
  });

  app.get("/tc", (req, res) => {
    const filePath = path.join(__dirname, "public", "tc", "agent-portal.html");
    if (fs.existsSync(filePath)) return sendPublicFileNoCache(res, filePath);
    return res.status(404).send("TC agent portal not found.");
  });

  app.get(["/tc/for-you", "/transaction-care"], (_req, res) => {
    res.redirect(302, "/overlay/tc-for-you.html");
  });

  app.get(["/marketing/for-you", "/socialmediaos"], (_req, res) => {
    res.redirect(302, "/overlay/marketing-for-you.html");
  });

  app.get("/tc/client", (req, res) => {
    const filePath = path.join(__dirname, "public", "tc", "client-portal.html");
    if (fs.existsSync(filePath)) return sendPublicFileNoCache(res, filePath);
    return res.status(404).send("TC client portal not found.");
  });

  app.get("/tc/assistant", (req, res) => {
    const filePath = path.join(__dirname, "public", "tc", "tc-assistant.html");
    if (fs.existsSync(filePath)) return sendPublicFileNoCache(res, filePath);
    return res.status(404).send("TC assistant not found.");
  });

  app.get("/clientcare-billing", (req, res) => {
    const filePath = path.join(__dirname, "public", "clientcare-billing", "overlay.html");
    if (fs.existsSync(filePath)) return sendPublicFileNoCache(res, filePath);
    return res.status(404).send("ClientCare billing overlay not found.");
  });

  app.get("/go-vegas", (_req, res) => {
    const filePath = path.join(__dirname, "public", "overlay", "go-vegas.html");
    if (fs.existsSync(filePath)) return sendPublicFileNoCache(res, filePath);
    return res.status(404).send("Go Vegas site not found.");
  });
  app.get("/govegas", (_req, res) => res.redirect(301, "/go-vegas"));

  app.get("/boldtrail", (req, res) => {
    console.log("🏠 [ROUTE] /boldtrail accessed");
    // Only accept header-based auth (no query params)
    const key = String(req.headers["x-command-key"] || "").trim();
    const configuredKeys = [
      COMMAND_CENTER_KEY,
      process.env.LIFEOS_KEY,
      process.env.API_KEY,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (key && configuredKeys.includes(key)) {
      const filePath = path.join(__dirname, "public", "overlay", "boldtrail.html");
      if (fs.existsSync(filePath)) {
        return sendPublicFileNoCache(res, filePath);
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
      return sendPublicFileNoCache(res, filePath);
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
      return sendPublicFileNoCache(res, filePath);
    }
    res.status(404).send("Website audit overlay not found.");
  });

  // Generic overlay HTML route for tracked shell pages such as LifeOS.
  // This avoids depending on static middleware ordering for operator overlays.
  app.get("/overlay/:file", (req, res, next) => {
    const filePath = resolveOverlayFile(req.params.file, ["html", "css", "js", "webmanifest"]);
    if (filePath) return sendPublicFileNoCache(res, filePath);
    return next();
  });

  app.get("/overlay/icons/:file", (req, res, next) => {
    const filePath = resolveOverlayIcon(req.params.file);
    if (filePath) return sendPublicFileNoCache(res, filePath);
    return next();
  });

  // Direct install (no App Store / Play Store) — AMENDMENT_37
  app.get("/install", (_req, res) => {
    const filePath = path.join(__dirname, "public", "overlay", "lifeos-install.html");
    if (fs.existsSync(filePath)) return sendPublicFileNoCache(res, filePath);
    return res.status(404).send("Install page not found.");
  });
  app.get("/download", (_req, res) => res.redirect(302, "/install"));

  app.get("/download/release.json", (_req, res) => {
    const filePath = path.join(__dirname, "public", "downloads", "release.json");
    if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: "release.json missing" });
    res.set("Content-Type", "application/json");
    return sendPublicFileNoCache(res, filePath);
  });

  app.get("/download/lifeos.apk", (req, res) => {
    const ua = String(req.headers["user-agent"] || "");
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return res.redirect(302, "/install?from=apk-on-ios");
    }
    const filePath = path.join(__dirname, "public", "downloads", "lifeos.apk");
    if (!fs.existsSync(filePath)) {
      return res.redirect(302, "/install?reason=apk-not-built");
    }
    res.set({
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": 'attachment; filename="LifeOS.apk"',
    });
    return res.sendFile(filePath);
  });

  app.get("/download/lifeos-ios.plist", (_req, res) => {
    const filePath = path.join(__dirname, "public", "downloads", "lifeos-ios.plist");
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("iOS install manifest not ready — register device UDID first.");
    }
    res.set("Content-Type", "application/xml");
    return sendPublicFileNoCache(res, filePath);
  });

  app.get("/download/lifeos.ipa", (req, res) => {
    const filePath = path.join(__dirname, "public", "downloads", "lifeos.ipa");
    if (!fs.existsSync(filePath)) {
      return res.redirect(302, "/install?reason=ipa-not-built");
    }
    res.set("Content-Type", "application/octet-stream");
    return res.sendFile(filePath);
  });

  // Convenience aliases so LifeOS shell subpages also work when loaded from /lifeos.
  app.get("/lifeos-:slug.html", (req, res, next) => {
    const slug = String(req.params.slug || "").trim();
    if (!/^[a-z0-9-]+$/i.test(slug)) return next();
    const filePath = resolveOverlayFile(`lifeos-${slug}.html`, ["html"]);
    if (filePath) return sendPublicFileNoCache(res, filePath);
    return next();
  });

  app.get("/lifeos", (req, res) => {
    const directSystem = String(req.query?.direct_system || '').trim();
    if (directSystem !== '1') {
      return res.redirect(302, '/lifeos?direct_system=1');
    }

    // E2E / browser-session bootstrap: commandKey in URL → set auth cookie → redirect clean
    const queryKey = String(req.query?.commandKey || req.query?.command_key || '').trim();
    const expectedKey = String(COMMAND_CENTER_KEY || '').trim();
    if (queryKey && expectedKey && queryKey === expectedKey) {
      try {
        const token = signToken({ handle: 'adam', role: 'admin', tier: 'founder', iat: Date.now(), exp: Date.now() + 86400000 });
        res.cookie('lifeos_access_token', token, {
          httpOnly: true, sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 86400 * 1000, path: '/',
        });
        const qs = new URLSearchParams(req.query || {});
        qs.delete('commandKey');
        qs.delete('command_key');
        return res.redirect(302, `/lifeos?${qs.toString()}`);
      } catch { /* fall through to normal auth check */ }
    }

    if (!isFounderInterfaceAuthenticated(req)) {
      const qs = new URLSearchParams(req.query || {});
      qs.set('direct_system', '1');
      if (String(req.query?.lumin_voice || '').trim() === '1') qs.set('lumin_voice', '1');
      const next = encodeURIComponent(`/lifeos?${qs.toString()}`);
      return res.redirect(302, `/overlay/lifeos-login.html?next=${next}`);
    }
    const filePath = resolveOverlayFile("lifeos-app.html", ["html"]);
    if (filePath) return sendPublicFileNoCache(res, filePath);
    return res.status(404).send("LifeOS shell not found.");
  });

  // ==================== ROOT ROUTE - PUBLIC FRONT DOOR ====================
  // Must be defined BEFORE static middleware to take precedence.
  // If a real landing file exists it wins; otherwise send visitors to the
  // live, sellable product instead of a dead 404 (revenue front-door fix
  // 2026-07-21 — bare domain previously served "Landing page not found").
  // INTERIM: destination pending founder's chosen primary landing.
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
      res.redirect(302, "/marketing");
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