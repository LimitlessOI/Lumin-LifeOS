/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    MODULE ROUTER - Modular Architecture Core                     ║
 * ║                    Routes requests to appropriate modules                        ║
 * ║                    Provides isolation, health checks, and graceful failures      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class ModuleRouter {
  constructor() {
    this.modules = new Map();
    this.routes = new Map();
    this.moduleHealth = new Map();
    this.moduleStats = new Map();
  }

  /**
   * Register a module with the router
   */
  register(name, module, options = {}) {
    try {
      this.modules.set(name, module);
      
      // Auto-discover routes from module
      if (module.routes && Array.isArray(module.routes)) {
        for (const route of module.routes) {
          const key = `${route.method || 'GET'}:${route.path}`;
          this.routes.set(key, {
            module: name,
            handler: route.handler,
            middleware: route.middleware || [],
            options: route.options || {}
          });
        }
      }

      // Initialize module if it has init method
      if (typeof module.init === 'function') {
        module.init(options.dependencies || {});
      }

      // Track module health
      this.moduleHealth.set(name, { status: 'healthy', lastCheck: Date.now() });
      this.moduleStats.set(name, { requests: 0, errors: 0, lastRequest: null });

      console.log(`✅ [MODULE ROUTER] Registered module: ${name} (${module.routes?.length || 0} routes)`);
      return true;
    } catch (error) {
      console.error(`❌ [MODULE ROUTER] Failed to register module ${name}:`, error.message);
      return false;
    }
  }

  /**
   * Route a request to the appropriate module
   */
  async route(req, res, next) {
    const method = req.method || 'GET';
    const path = req.path || req.url.split('?')[0];
    const key = `${method}:${path}`;

    // Find exact match first
    let route = this.routes.get(key);

    // Try pattern matching if no exact match
    if (!route) {
      for (const [routeKey, routeData] of this.routes.entries()) {
        const [routeMethod, routePath] = routeKey.split(':');
        if (routeMethod === method && this.matchPath(path, routePath)) {
          route = routeData;
          break;
        }
      }
    }

    if (!route) {
      return next ? next() : res.status(404).json({ error: 'Route not found', path });
    }

    // Update stats
    const stats = this.moduleStats.get(route.module) || { requests: 0, errors: 0 };
    stats.requests++;
    stats.lastRequest = Date.now();
    this.moduleStats.set(route.module, stats);

    // Check module health
    const health = this.moduleHealth.get(route.module);
    if (health && health.status === 'error') {
      stats.errors++;
      return res.status(503).json({ 
        error: 'Module unavailable', 
        module: route.module,
        status: health.status 
      });
    }

    try {
      // Run middleware
      for (const middleware of route.middleware) {
        await middleware(req, res);
        if (res.headersSent) return; // Middleware already sent response
      }

      // Call route handler
      await route.handler(req, res, this.modules.get(route.module));
    } catch (error) {
      // Module failed, but system continues
      stats.errors++;
      console.error(`❌ [MODULE ROUTER] Module ${route.module} failed:`, error.message);
      
      // Mark module as error (temporary)
      this.moduleHealth.set(route.module, { 
        status: 'error', 
        error: error.message,
        lastCheck: Date.now() 
      });

      // Auto-recover after 30 seconds
      setTimeout(() => {
        this.moduleHealth.set(route.module, { status: 'healthy', lastCheck: Date.now() });
      }, 30000);

      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Module error', 
          module: route.module,
          message: error.message 
        });
      }
    }
  }

  /**
   * Simple path matching (supports :param and * wildcards)
   */
  matchPath(path, pattern) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        continue; // Parameter match
      }
      if (patternParts[i] !== pathParts[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get health of all modules
   */
  async getHealth() {
    const health = {
      router: { status: 'healthy', modules: this.modules.size },
      modules: {}
    };

    for (const [name, module] of this.modules) {
      try {
        if (typeof module.health === 'function') {
          health.modules[name] = await module.health();
        } else {
          health.modules[name] = this.moduleHealth.get(name) || { status: 'unknown' };
        }
        
        // Add stats
        const stats = this.moduleStats.get(name);
        if (stats) {
          health.modules[name].stats = stats;
        }
      } catch (error) {
        health.modules[name] = { 
          status: 'error', 
          error: error.message 
        };
      }
    }

    return health;
  }

  /**
   * Get all registered modules
   */
  getModules() {
    return Array.from(this.modules.keys());
  }

  /**
   * Get module by name
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * Unregister a module
   */
  unregister(name) {
    // Remove routes
    for (const [key, route] of this.routes.entries()) {
      if (route.module === name) {
        this.routes.delete(key);
      }
    }

    // Remove module
    this.modules.delete(name);
    this.moduleHealth.delete(name);
    this.moduleStats.delete(name);

    console.log(`🗑️ [MODULE ROUTER] Unregistered module: ${name}`);
  }
}
