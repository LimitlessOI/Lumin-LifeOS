/**
 * SYNOPSIS: Service module — RealEstateCurriculum.
 */
export const defineCurriculum = () => {
  return {
    courseTitle: "Virtual Real Estate Class",
    modules: [
      {
        title: "Introduction to Real Estate",
        description: "Overview of the real estate industry and its virtual landscape.",
        lessons: [
          "History of Real Estate",
          "Real Estate Principles",
          "Virtual Real Estate Platforms"
        ]
      },
      {
        title: "Property Analysis",
        description: "Methods and tools for analyzing virtual properties.",
        lessons: [
          "Market Analysis",
          "Property Valuation",
          "Virtual Property Tours"
        ]
      },
      {
        title: "Real Estate Marketing",
        description: "Strategies for marketing properties in a virtual environment.",
        lessons: [
          "Digital Marketing Strategies",
          "Social Media in Real Estate",
          "Virtual Open Houses"
        ]
      },
      {
        title: "Legal and Ethical Considerations",
        description: "Understanding the legal and ethical issues in virtual real estate.",
        lessons: [
          "Real Estate Law Basics",
          "Ethical Practices",
          "Virtual Transactions"
        ]
      },
      {
        title: "Advanced Virtual Tools",
        description: "Exploring advanced tools and technologies in virtual real estate.",
        lessons: [
          "Augmented Reality in Real Estate",
          "Blockchain and Property Registries",
          "AI in Market Predictions"
        ]
      }
    ]
  };
};

export const studentSchema = {
  name: String,
  email: String,
  enrolledModules: Array,
  progress: {
    type: Map,
    of: String
  },
  completionStatus: Boolean
};
