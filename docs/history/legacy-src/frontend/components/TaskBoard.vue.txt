```html
<template>
  <div>
    <h2>Task Board</h2>
    <ul>
      <li v-for="task in tasks" :key="task.id">{{ task.title }}</li>
    </ul>
  </div>
</template>

<script>
export default {
  props: {
    tasks: Array
  }
};
</script>