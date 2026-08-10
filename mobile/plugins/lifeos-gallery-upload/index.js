/**
 * SYNOPSIS: JS-side handle for the native LifeosGalleryUpload plugin. lifeos-app.html
 */
import { registerPlugin } from '@capacitor/core';

/**
 * JS-side handle for the native LifeosGalleryUpload plugin. lifeos-app.html
 * is loaded remotely, so it talks to the native side directly via
 * window.Capacitor.Plugins.LifeosGalleryUpload -- this export exists for any
 * locally-bundled Capacitor consumer.
 */
const LifeosGalleryUpload = registerPlugin('LifeosGalleryUpload', {});

export default LifeosGalleryUpload;
