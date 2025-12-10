```vue
<template>
  <div>
    <h1>Supply Chain Dashboard</h1>
    <div v-for="asset in assets" :key="asset.id">
      <h2>{{ asset.name }}</h2>
      <p>{{ asset.description }}</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      assets: []
    };
  },
  created() {
    this.fetchAssets();
  },
  methods: {
    async fetchAssets() {
      try {
        const response = await axios.get('/api/supplychain/assets');
        this.assets = response.data;
      } catch (error) {
        console.error('Error fetching assets:', error);
      }
    }
  }
};
</script>

<style scoped>
h1 {
  color: #333;
}
</style>
```