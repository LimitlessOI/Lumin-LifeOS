```vue
<template>
  <div>
    <h1>Farm Monitor</h1>
    <div v-for="farm in farms" :key="farm.id">
      <h3>{{ farm.name }}</h3>
      <p>Location: {{ farm.location }}</p>
      <button @click="fetchAnalytics(farm.id)">View Analytics</button>
      <div v-if="analytics[farm.id]">
        <h4>Analytics</h4>
        <p>{{ analytics[farm.id] }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      farms: [],
      analytics: {}
    };
  },
  methods: {
    fetchFarms() {
      fetch('/api/v1/farms')
        .then(response => response.json())
        .then(data => {
          this.farms = data;
        });
    },
    fetchAnalytics(farmId) {
      fetch(`/api/v1/farms/${farmId}/analytics`)
        .then(response => response.json())
        .then(data => {
          this.$set(this.analytics, farmId, data);
        });
    }
  },
  created() {
    this.fetchFarms();
  }
};
</script>

<style scoped>
h1, h3 {
  color: #333;
}
</style>
```