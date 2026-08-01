/**
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 * SYNOPSIS: Exports getCurriculumModules, getStudentSchema — services/realEstateCurriculumStructure.js.
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
        { id: 'lesson1.4', title: 'Real Estate Professionals and Their Roles' },
        { id: 'lesson1.5', title: 'Ethical Considerations in Real Estate' },
      ],
      assessments: [
        { id: 'assessment1.1', title: 'Module 1 Quiz', type: 'quiz' }
      ]
    },
    {
      id: 'module2',
      title: 'Real Estate Market Analysis',
      lessons: [
        { id: 'lesson2.1', title: 'Supply and Demand Principles' },
        { id: 'lesson2.2', title: 'Market Cycles and Trends' },
        { id: 'lesson2.3', title: 'Data Sources for Market Analysis' },
        { id: 'lesson2.4', title: 'Performing a Comparative Market Analysis (CMA)' },
        { id: 'lesson2.5', title: 'Economic Indicators Affecting Real Estate' },
      ],
      assessments: [
        { id: 'assessment2.1', title: 'Module 2 Quiz', type: 'quiz' },
        { id: 'assessment2.2', title: 'Market Analysis Case Study', type: 'project' }
      ]
    },
    {
      id: 'module3',
      title: 'Real Estate Finance and Investment',
      lessons: [
        { id: 'lesson3.1', title: 'Understanding Mortgages' },
        { id: 'lesson3.2', title: 'Investment Strategies' },
        { id: 'lesson3.3', title: 'Valuation Methods' },
        { id: 'lesson3.4', title: 'Sources of Real Estate Funding' },
        { id: 'lesson3.5', title: 'Calculating ROI and Cap Rates' },
        { id: 'lesson3.6', title: 'Real Estate Investment Trusts (REITs)' },
      ],
      assessments: [
        { id: 'assessment3.1', title: 'Module 3 Quiz', type: 'quiz' },
        { id: 'assessment3.2', title: 'Investment Proposal Project', type: 'project' }
      ]
    },
    {
      id: 'module4',
      title: 'Legal Aspects of Real Estate',
      lessons: [
        { id: 'lesson4.1', title: 'Contracts and Agreements' },
        { id: 'lesson4.2', title: 'Property Rights and Ownership' },
        { id: 'lesson4.3', title: 'Zoning and Land Use' },
        { id: 'lesson4.4', title: 'Easements, Encumbrances, and Liens' },
        { id: 'lesson4.5', title: 'Environmental Regulations' },
        { id: 'lesson4.6', title: 'Fair Housing Laws' },
      ],
      assessments: [
        { id: 'assessment4.1', title: 'Module 4 Quiz', type: 'quiz' },
        { id: 'assessment4.2', title: 'Legal Case Study Analysis', type: 'project' }
      ]
    },
    {
      id: 'module5',
      title: 'Real Estate Sales and Marketing',
      lessons: [
        { id: 'lesson5.1', title: 'Listing Properties' },
        { id: 'lesson5.2', title: 'Marketing Strategies' },
        { id: 'lesson5.3', title: 'Negotiation Skills' },
        { id: 'lesson5.4', title: 'Open Houses and Showings' },
        { id: 'lesson5.5', title: 'Client Relationship Management' },
        { id: 'lesson5.6', title: 'Digital Marketing for Real Estate' },
      ],
      assessments: [
        { id: 'assessment5.1', title: 'Module 5 Quiz', type: 'quiz' },
        { id: 'assessment5.2', title: 'Mock Listing Presentation', type: 'project' }
      ]
    },
    {
      id: 'module6',
      title: 'Real Estate Development and Property Management',
      lessons: [
        { id: 'lesson6.1', title: 'Introduction to Real Estate Development' },
        { id: 'lesson6.2', title: 'Site Selection and Feasibility Studies' },
        { id: 'lesson6.3', title: 'Construction and Project Management Basics' },
        { id: 'lesson6.4', title: 'Property Management Fundamentals' },
        { id: 'lesson6.5', title: 'Tenant Relations and Lease Agreements' },
        { id: 'lesson6.6', title: 'Maintenance and Operations' },
      ],
      assessments: [
        { id: 'assessment6.1', title: 'Module 6 Quiz', type: 'quiz' },
        { id: 'assessment6.2', title: 'Development Project Proposal', type: 'project' }
      ]
    },
    {
      id: 'module7',
      title: 'Advanced Topics and Emerging Trends',
      lessons: [
        { id: 'lesson7.1', title: 'Sustainable Real Estate and Green Buildings' },
        { id: 'lesson7.2', title: 'Real Estate Technology (PropTech)' },
        { id: 'lesson7.3', title: 'Global Real Estate Markets' },
        { id: 'lesson7.4', title: 'Distressed Properties and Foreclosures' },
        { id: 'lesson7.5', title: 'Real Estate Syndication' },
      ],
      assessments: [
        { id: 'assessment7.1', title: 'Module 7 Quiz', type: 'quiz' },
        { id: 'assessment7.2', title: 'Emerging Trends Research Paper', type: 'project' }
      ]
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
        assessmentsCompleted: [{ 
          assessmentId: { type: String },
          score: { type: Number },
          dateCompleted: { type: Date, default: Date.now }
        }],
        isModuleCompleted: { type: Boolean, default: false },
        moduleOverallScore: { type: Number, default: 0 }, // Aggregate score for the module
        moduleCompletionDate: { type: Date },
      },
    ],
    enrollmentDate: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    certificates: [
      {
        certificateId: { type: String },
        issueDate: { type: Date },
        courseName: { type: String },
        grade: { type: String }, // e.g., 'Pass', 'Distinction'
      },
    ],
    notes: [
      {
        lessonId: { type: String },
        content: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    quizzes: [ // Store individual quiz attempts and scores
      {
        quizId: { type: String },
        moduleId: { type: String },
        attemptDate: { type: Date, default: Date.now },
        score: { type: Number },
        maxScore: { type: Number },
        passed: { type: Boolean, default: false },
        answers: [{ // Optional: store user's answers
          questionId: { type: String },
          selectedAnswer: { type: String },
          isCorrect: { type: Boolean }
        }]
      }
    ],
    projects: [ // Store project submissions and grades
      {
        projectId: { type: String },
        moduleId: { type: String },
        submissionDate: { type: Date, default: Date.now },
        grade: { type: String }, // e.g., 'A', 'B', 'Pass', 'Fail'
        feedback: { type: String },
        fileUrls: [{ type: String }] // URLs to submitted project files
      }
    ],
    courseStatus: { type: String, enum: ['Enrolled', 'Completed', 'Dropped'], default: 'Enrolled' },
    completionDate: { type: Date },
  };
}
// modules
// DB schema
