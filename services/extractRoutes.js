/**
 * SYNOPSIS: Existing code in services/extractRoutes.js
 */
// Existing code in services/extractRoutes.js
// This file handles the extraction of sub-features from server.js

export function extractSubRoutes(server) {
    const subRoutes = [];
    
    server.routes.forEach(route => {
        if (route.isSubFeature) {
            subRoutes.push(route);
        }
    });

    return subRoutes;
}

// Additional code can be added below if needed, preserving existing functionality