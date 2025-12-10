```html
<template>
  <div id="app">
    <h1>Welcome to the VR Tour</h1>
    <button @click="startVRSession">Start VR Session</button>
  </div>
</template>

<script>
import WebXRSessionManager from '../services/WebXRSessionManager.js';

export default {
  name: 'VRTourApp',
  methods: {
    startVRSession() {
      const xrManager = new WebXRSessionManager();
      xrManager.startSession();
    }
  }
}
</script>

<style scoped>
#app {
  text-align: center;
}
</style>
```