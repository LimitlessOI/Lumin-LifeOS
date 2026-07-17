/**
 * SYNOPSIS: Service module — ComptencyStandards.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */

/**
 * Detailed competency standards organized by domain.
 * This structure is designed to provide granular, actionable criteria for various skill areas.
 *
 * @type {Object.<string, Object.<string, string[]>>}
 */
const detailedCompetencyStandards = {
  "Software Development": {
    "Front-End Development": [
      "Implement responsive user interfaces using HTML5, CSS3, and JavaScript (ES6+).",
      "Utilize modern JavaScript frameworks (e.g., React, Angular, Vue) for component-based architecture.",
      "Integrate RESTful APIs and handle asynchronous data flows.",
      "Apply state management patterns (e.g., Redux, Vuex, Context API) effectively.",
      "Write unit and integration tests for front-end components (e.g., Jest, React Testing Library).",
      "Optimize web performance for fast load times and smooth user experience.",
      "Ensure accessibility (WCAG 2.1+) compliance in UI implementations."
    ],
    "Back-End Development": [
      "Design and implement RESTful and GraphQL APIs using Node.js/Express, Python/Django, or similar frameworks.",
      "Manage relational (e.g., PostgreSQL, MySQL) and NoSQL (e.g., MongoDB, DynamoDB) databases.",
      "Implement authentication and authorization mechanisms (e.g., JWT, OAuth2).",
      "Develop secure and scalable microservices architectures.",
      "Write comprehensive unit, integration, and end-to-end tests for server-side logic.",
      "Configure and deploy applications to cloud platforms (e.g., AWS, Azure, GCP).",
      "Monitor application performance and troubleshoot server-side issues."
    ],
    "DevOps & Infrastructure": [
      "Automate build, test, and deployment pipelines using CI/CD tools (e.g., Jenkins, GitLab CI, GitHub Actions).",
      "Manage infrastructure as code (IaC) with tools like Terraform or CloudFormation.",
      "Containerize applications using Docker and orchestrate with Kubernetes.",
      "Implement logging, monitoring, and alerting solutions (e.g., ELK Stack, Prometheus, Grafana).",
      "Manage cloud resources and services (e.g., EC2, S3, RDS, Lambda, VPC).",
      "Ensure security best practices for infrastructure and deployments.",
      "Perform disaster recovery planning and implementation."
    ]
  },
  "Data Science & Analytics": {
    "Data Engineering": [
      "Design and build scalable data pipelines (ETL/ELT) using tools like Apache Airflow, Spark, or Kafka.",
      "Manage and optimize data warehouses and data lakes (e.g., Snowflake, Redshift, S3).",
      "Implement data governance, quality, and security standards.",
      "Work with various data storage technologies (e.g., SQL, NoSQL, object storage).",
      "Automate data ingestion, transformation, and loading processes.",
      "Monitor and troubleshoot data pipeline performance and reliability."
    ],
    "Machine Learning Engineering": [
      "Develop, train, and deploy machine learning models using frameworks like TensorFlow or PyTorch.",
      "Implement MLOps practices for model versioning, monitoring, and retraining.",
      "Perform feature engineering and selection for optimal model performance.",
      "Evaluate model performance using appropriate metrics and techniques.",
      "Optimize models for inference speed and resource efficiency.",
      "Integrate ML models into production systems and APIs.",
      "Understand and mitigate bias and fairness issues in ML models."
    ],
    "Data Analysis & Visualization": [
      "Perform exploratory data analysis (EDA) to identify patterns and insights.",
      "Utilize statistical methods for hypothesis testing and inference.",
      "Create compelling data visualizations and dashboards using tools like Tableau, Power BI, or Matplotlib/Seaborn.",
      "Communicate complex analytical findings clearly and concisely to diverse audiences.",
      "Develop predictive models and forecasts using statistical and machine learning techniques.",
      "Extract and transform data from various sources using SQL and scripting languages (e.g., Python, R).",
      "Design and execute A/B tests and interpret results."
    ]
  },
  "Product Management": {
    "Product Strategy & Vision": [
      "Define and articulate a clear product vision, strategy, and roadmap aligned with business objectives.",
      "Conduct market research, competitive analysis, and customer segmentation.",
      "Identify unmet customer needs and market opportunities.",
      "Develop business cases and assess product market fit.",
      "Communicate product strategy effectively to stakeholders and development teams."
    ],
    "Product Discovery & Definition": [
      "Lead user research (interviews, surveys, usability testing) to gather insights.",
      "Translate user needs and business requirements into detailed product specifications and user stories.",
      "Prioritize features and initiatives based on impact, effort, and strategic alignment.",
      "Create wireframes, mockups, and prototypes to visualize product concepts.",
      "Define key performance indicators (KPIs) and success metrics for product features."
    ],
    "Product Execution & Delivery": [
      "Collaborate closely with engineering, design, and other cross-functional teams throughout the product lifecycle.",
      "Manage product backlogs and facilitate agile ceremonies (e.g., sprint planning, stand-ups, reviews).",
      "Monitor product performance post-launch and iterate based on data and feedback.",
      "Manage stakeholder expectations and communicate progress and challenges.",
      "Lead go-to-market planning and product launch activities.",
      "Identify and mitigate risks associated with product development and launch."
    ]
  }
  // Add more domains and their detailed competencies as needed
};

/**
 * Retrieves detailed competency standards, optionally filtered by specific domains.
 *
 * @param {string[]} [domains] - An optional array of domain names to filter the standards.
 *                                If not provided, all detailed standards will be returned.
 * @returns {Object.<string, Object.<string, string[]>>} An object containing detailed competency standards,
 *                                                       filtered by domain if specified.
 */
const getDetailedCompetencyStandards = (domains) => {
  if (!domains || domains.length === 0) {
    return detailedCompetencyStandards;
  }

  const filteredStandards = {};
  for (const domain of domains) {
    if (detailedCompetencyStandards[domain]) {
      filteredStandards[domain] = detailedCompetencyStandards[domain];
    }
  }
  return filteredStandards;
};

export {
  getDetailedCompetencyStandards
};
