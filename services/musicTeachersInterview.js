/**
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: services/musicTeachersInterview.js
 */
// services/musicTeachersInterview.js

export const teachersInterviews = [
  {
    name: "John Doe",
    instrument: "Piano",
    insights: "Emphasizes the importance of daily practice and understanding music theory."
  },
  {
    name: "Jane Smith",
    instrument: "Violin",
    insights: "Highlights the value of ear training and playing in ensembles."
  },
  {
    name: "Emily Johnson",
    instrument: "Guitar",
    insights: "Focuses on the integration of modern technology in teaching."
  },
  {
    name: "Michael Brown",
    instrument: "Drums",
    insights: "Discusses the benefits of rhythm exercises and playing with a metronome."
  },
  {
    name: "Sarah Davis",
    instrument: "Flute",
    insights: "Stresses the importance of breathing techniques and posture."
  }
];

export function getMusicTeachersInterviews() {
  return teachersInterviews.map(teacher => ({
    name: teacher.name,
    instrument: teacher.instrument,
    insights: teacher.insights
  }));
}
