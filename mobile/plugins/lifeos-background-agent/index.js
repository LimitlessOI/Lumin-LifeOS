/**
 * SYNOPSIS: JS-side handle for the native LifeosBackgroundAgent plugin. lifeos-app.html
 */
import { registerPlugin } from '@capacitor/core';

/**
 * JS-side handle for the native LifeosBackgroundAgent plugin. lifeos-app.html
 * is loaded remotely, so it talks to the native side directly via
 * window.Capacitor.Plugins.LifeosBackgroundAgent -- this export exists for
 * any locally-bundled Capacitor consumer.
 */
const LifeosBackgroundAgent = registerPlugin('LifeosBackgroundAgent', {});

export default LifeosBackgroundAgent;
