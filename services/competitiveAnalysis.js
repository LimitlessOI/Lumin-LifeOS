/**
 * SYNOPSIS: Service module — CompetitiveAnalysis.
 */
export const analyzeCompetitors = () => {
  return {
    planboard: {
      strengths: [
        "Lesson planning focus",
        "Curriculum mapping",
        "Integration with calendars"
      ],
      weaknesses: [
        "Less emphasis on interactive student activities",
        "May lack robust assessment features",
        "Primarily teacher-facing"
      ]
    },
    teachermade: {
      strengths: [
        "Transforms existing worksheets into digital activities",
        "Customizable interactive elements",
        "Automated grading for certain question types"
      ],
      weaknesses: [
        "Interface can be less intuitive for complex activities",
        "Reliance on existing materials may limit new content creation",
        "Less robust native content library"
      ]
    },
    nearpod: {
      strengths: [
        "Interactive lesson delivery (live and student-paced)",
        "Wide range of activity types (quizzes, polls, collaborate boards)",
        "Extensive content library and pre-made lessons"
      ],
      weaknesses: [
        "Can be overwhelming for new users",
        "Requires student devices for full interaction",
        "Pricing can be a factor for advanced features"
      ]
    },
    googleClassroom: {
      strengths: [
        "Widespread adoption and familiarity",
        "Seamless integration with other Google Workspace tools",
        "Assignment distribution, collection, and basic grading"
      ],
      weaknesses: [
        "Limited built-in interactive lesson features",
        "Relies on external tools for rich interactivity and advanced assessment",
        "Not primarily designed for content creation beyond basic documents"
      ]
    },
    formative: {
      strengths: [
        "Real-time feedback and progress monitoring",
        "Diverse question types and media integration",
        "Ability to transform existing PDFs/docs into interactives"
      ],
      weaknesses: [
        "Can have a steeper learning curve for advanced features",
        "Interface can feel busy with many options",
        "Some advanced analytics are behind a paywall"
      ]
    }
  };
};