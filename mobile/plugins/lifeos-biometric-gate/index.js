/**
 * SYNOPSIS: JS-side handle for the native LifeosBiometricGate plugin. lifeos-app.html is
 */
import { registerPlugin } from '@capacitor/core';

/**
 * JS-side handle for the native LifeosBiometricGate plugin. lifeos-app.html is
 * loaded remotely, so it talks to the native side directly via
 * window.Capacitor.Plugins.LifeosBiometricGate -- this export exists for any
 * locally-bundled Capacitor consumer.
 */
const LifeosBiometricGate = registerPlugin('LifeosBiometricGate', {});

export default LifeosBiometricGate;
