```vue
<template>
  <div>
    <h2>Submit SQL for Review</h2>
    <textarea v-model="sqlContent" placeholder="Enter your SQL here"></textarea>
    <button @click="submitSQL">Submit</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      sqlContent: ''
    };
  },
  methods: {
    async submitSQL() {
      try {
        const response = await fetch('/api/v1/sql/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sqlContent: this.sqlContent })
        });
        const result = await response.json();
        console.log('Review Results:', result);
      } catch (error) {
        console.error('Error submitting SQL:', error);
      }
    }
  }
};
</script>