/**
 * SYNOPSIS: Exports getCurriculumModules — services/realEstateCurriculumStructure.js.
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
const curriculumModules = [
  {
    id: 1,
    title: 'Introduction to Real Estate',
    description: 'Overview of the real estate market and basic concepts.',
    lessons: [
      'What is Real Estate?',
      'History of Real Estate',
      'Key Terms and Definitions'
    ]
  },
  {
    id: 2,
    title: 'Real Estate Laws and Regulations',
    description: 'Understanding the legal aspects of real estate.',
    lessons: [
      'Property Rights',
      'Zoning Laws',
      'Real Estate Contracts'
    ]
  },
  {
    id: 3,
    title: 'Real Estate Finance',
    description: 'Financial principles and practices in real estate.',
    lessons: [
      'Mortgage Basics',
      'Investment Strategies',
      'Tax Implications'
    ]
  },
  {
    id: 4,
    title: 'Property Management',
    description: 'Managing properties effectively and efficiently.',
    lessons: [
      'Tenant Relations',
      'Maintenance and Repairs',
      'Budgeting and Financials'
    ]
  }
];

const studentSchema = {
  id: 'string',
  name: 'string',
  email: 'string',
  enrolledModules: [
    {
      moduleId: 'number',
      progress: 'number',  // percentage of completion
      completionDate: 'string' // ISO date format
    }
  ],
  startedAt: 'string', // ISO date format
  completedAt: 'string' // ISO date format
};

export function getCurriculumModules() {
  return curriculumModules;
}

export function getStudentSchema() {
  return studentSchema;
}
