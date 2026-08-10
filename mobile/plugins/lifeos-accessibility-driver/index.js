/**
 * SYNOPSIS: JS-side handle for the native LifeosAccessibility plugin.
 */
import { registerPlugin } from '@capacitor/core';

/**
 * JS-side handle for the native LifeosAccessibility plugin.
 * lifeos-app.html is loaded remotely (not bundled with this package), so it
 * talks to the native side directly via window.Capacitor.Plugins.LifeosAccessibility --
 * this export exists for any locally-bundled Capacitor consumer.
 */
const LifeosAccessibility = registerPlugin('LifeosAccessibility', {});

export default LifeosAccessibility;
