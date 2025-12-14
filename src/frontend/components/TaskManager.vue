```html
<template>
  <div>
    <h1>Task Manager</h1>
    <task-board :tasks="tasks" />
  </div>
</template>

<script>
import TaskBoard from './TaskBoard.vue';
import axios from 'axios';

export default {
  components: {
    TaskBoard
  },
  data() {
    return {
      tasks: []
    };
  },
  created() {
    this.fetchTasks();
  },
  methods: {
    async fetchTasks() {
      try {
        const response = await axios.get('/api/tasks');
        this.tasks = response.data;
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    }
  }
};
</script>