```html
<template>
  <div>
    <h2>Task Report</h2>
    <chart-js :data="chartData" />
  </div>
</template>

<script>
import { Bar } from 'vue-chartjs';
import axios from 'axios';

export default {
  components: {
    Bar
  },
  data() {
    return {
      chartData: null
    };
  },
  async created() {
    await this.generateReport();
  },
  methods: {
    async generateReport() {
      try {
        const response = await axios.get('/api/tasks/report');
        this.chartData = {
          labels: response.data.labels,
          datasets: [
            {
              label: 'Tasks',
              data: response.data.data
            }
          ]
        };
      } catch (error) {
        console.error('Error generating report:', error);
      }
    }
  }
};
</script>