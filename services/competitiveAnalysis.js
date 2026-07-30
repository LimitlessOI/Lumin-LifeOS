/**
 * SYNOPSIS: Service module — CompetitiveAnalysis.
 */
export const analyzeCompetitors = () => {
  return {
    planboard: {
      strengths: [
        "Lesson planning focus",
        "Curriculum mapping",
        "Standards alignment",
        "Intuitive interface for planning"
      ],
      weaknesses: [
        "Limited student engagement features",
        "Not a full learning management system (LMS)",
        "Less robust assessment tools"
      ],
      focus: "Teacher workflow for planning and organization."
    },
    teachermade: {
      strengths: [
        "Transforms existing worksheets into digital activities",
        "Interactive elements (drag and drop, matching)",
        "Auto-grading for objective questions",
        "Supports various file types (PDF, Doc, Images)"
      ],
      weaknesses: [
        "Interface can be clunky for complex activities",
        "Steeper learning curve for creating advanced interactives",
        "Less emphasis on direct instruction delivery"
      ],
      focus: "Digitizing and making existing paper-based assignments interactive and gradable."
    },
    nearpod: {
      strengths: [
        "Interactive lesson delivery (live and student-paced)",
        "Wide range of interactive activities (quizzes, polls, drawing, virtual field trips)",
        "Strong student engagement features",
        "Integrates with many LMS platforms"
      ],
      weaknesses: [
        "Can be overwhelming with too many features",
        "Requires teachers to build lessons within Nearpod or convert existing ones",
        "Pricing can be a barrier for some schools/districts"
      ],
      focus: "Interactive lesson delivery and real-time student engagement."
    },
    googleClassroom: {
      strengths: [
        "Ubiquitous in education, high adoption rate",
        "Seamless integration with Google Workspace",
        "Simple assignment distribution and collection",
        "Effective communication hub"
      ],
      weaknesses: [
        "Lacks advanced interactive features for lessons",
        "Limited robust assessment tools beyond basic quizzes",
        "Not designed for deep curriculum mapping or lesson planning"
      ],
      focus: "Streamlined assignment management, communication, and basic LMS functionalities within the Google ecosystem."
    },
    formative: {
      strengths: [
        "Real-time feedback and grading",
        "Supports various question types (including show-your-work)",
        "Tracks student progress over time",
        "Integrates with many LMS platforms"
      ],
      weaknesses: [
        "Can be slow or buggy at times",
        "Interface might feel less intuitive for some users",
        "Focus primarily on assessment, less on lesson delivery"
      ],
      focus: "Real-time formative assessment and data-driven instruction."
    }
  };
};