```vue
<template>
  <div>
    <h1>SQL Review Dashboard</h1>
    <SqlReviewer />
    <!-- More components for displaying history -->
  </div>
</template>

<script>
import SqlReviewer from '../components/SqlReviewer.vue';

export default {
  components: {
    SqlReviewer
  }
};
</script>