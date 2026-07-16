/**
 * SYNOPSIS: services/formalize-businessos-ui.js
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
// services/formalize-businessos-ui.js

/**
 * Ensures consistent naming throughout the UI for BusinessOS versus LimitlessOS.
 * @param {string} name - The original name to be formalized.
 * @param {string} osType - The type of OS ('BusinessOS' or 'LimitlessOS').
 * @returns {string} - The formalized name.
 */
function formalizeBusinessOSUI(name, osType) {
    if (osType === 'BusinessOS') {
        return `${name} - BusinessOS`;
    } else if (osType === 'LimitlessOS') {
        return `${name} - LimitlessOS`;
    }
    return name; // Return the original name if osType is not recognized
}

// Exporting the function to ensure it can be used throughout the application
export { formalizeBusinessOSUI };
