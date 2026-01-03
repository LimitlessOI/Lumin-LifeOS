<template> <!-- Template definition here --> </template>
<script>
import axios from 'axios';
export default {
  data() {
    return {
      contentId: '', // Placeholder for educational material ID received in props or through navigation, assuming prop-based setup...
      lessonName: '',
      educationContent: ''
    };
  },
  created() {
    this.fetchEducationContent();
  },
  methods: {
    fetchEducationContent() {
      axios.get(`/education-content/${this.contentId}`)
        .then(response => {
          // Handle the response which contains lessonName and content in JSON format...
          this.lessonName = response.data.lesson_name;
          const fileContentBuffer = Buffer.from(response.data.content);
          this.educationContent = new Blob([fileContentBuffer], { type: 'text/plain' }); // Assuming content is plain text, convert it to a blob for download functionality... 
        })
        .catch(error => console.error('Error fetching educational material', error));
    }
  }
};
</script>