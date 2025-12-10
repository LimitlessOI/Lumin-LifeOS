```vue
<template>
  <div>
    <h1>Energy Dashboard</h1>
    <chart-js :data="chartData"></chart-js>
  </div>
</template>

<script>
import { Chart } from 'chart.js';

export default {
  data() {
    return {
      chartData: {
        labels: [],
        datasets: [
          {
            label: 'Energy Usage',
            data: [],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }
        ]
      }
    };
  },
  mounted() {
    this.loadData();
  },
  methods: {
    loadData() {
      // Fetch data and update chartData
    }
  }
};
</script>

<style scoped>
h1 {
  font-size: 24px;
  margin-bottom: 20px;
}
</style>
```