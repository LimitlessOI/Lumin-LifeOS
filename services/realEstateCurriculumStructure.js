/**
 * SYNOPSIS: Exports getCurriculumModules — services/realEstateCurriculumStructure.js.
 */
export function getCurriculumModules() {
  return [
    {
      id: 'module1',
      title: 'Introduction to Real Estate',
      lessons: [
        { id: 'lesson1.1', title: 'What is Real Estate?' },
        { id: 'lesson1.2', title: 'Types of Real Estate' },
        { id: 'lesson1.3', title: 'Key Real Estate Terminology' },
      ],
    },
    {
      id: 'module2',
      title: 'Real Estate Market Analysis',
      lessons: [
        { id: 'lesson2.1', title: 'Supply and Demand Principles' },
        { id: 'lesson2.2', title: 'Market Cycles and Trends' },
        { id: 'lesson2.3', title: 'Data Sources for Market Analysis' },
      ],
    },
    {
      id: 'module3',
      title: 'Real Estate Finance and Investment',
      lessons: [
        { id: 'lesson3.1', title: 'Understanding Mortgages' },
        { id: 'lesson3.2', title: 'Investment Strategies' },
        { id: 'lesson3.3', title: 'Valuation Methods' },
      ],
    },
    {
      id: 'module4',
      title: 'Legal Aspects of Real Estate',
      lessons: [
        { id: 'lesson4.1', title: 'Contracts and Agreements' },
        { id: 'lesson4.2', title: 'Property Rights and Ownership' },
        { id: 'lesson4.3', title: 'Zoning and Land Use' },
      ],
    },
    {
      id: 'module5',
      title: 'Real Estate Sales and Marketing',
      lessons: [
        { id: 'lesson5.1', title: 'Listing Properties' },
        { id: 'lesson5.2', title: 'Marketing Strategies' },
        { id: 'lesson5.3', title: 'Negotiation Skills' },
      ],
    },
  ];
}

export function getStudentSchema() {
  return {
    studentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    progress: [
      {
        moduleId: { type: String, required: true },
        lessonsCompleted: [{ type: String }], // Array of lesson IDs
        isModuleCompleted: { type: Boolean, default: false },
        score: { type: Number, default: 0 }, // For module quizzes/assessments
      },
    ],
    enrollmentDate: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    certificates: [
      {
        certificateId: { type: String },
        issueDate: { type: Date },
        courseName: { type: String },
      },
    ],
    notes: [
      {
        lessonId: { type: String },
        content: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  };
}