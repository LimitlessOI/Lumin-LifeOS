```vue
<template>
  <div>
    <h1>Energy Dashboard</h1>
    <canvas id="energyChart"></canvas>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { Chart } from 'chart.js';

export default {
  setup() {
    const chartRef = ref(null);

    onMounted(() => {
      const ctx = document.getElementById('energyChart').getContext('2d');
      chartRef.value = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
          datasets: [{
            label: 'Energy Usage',
            data: [65, 59, 80, 81, 56, 55, 40],
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        }
      });
    });

    return { chartRef };
  }
}
</script>

<style>
canvas {
  max-width: 600px;
  margin: auto;
}
</style>
```