-- ╔══════════════════════════════════════════════════════════════════════════════════╗
-- ║              SELF-HEALING CODE TABLES                                           ║
-- ║              Track automatic error fixes and learning patterns                  ║
-- ╚══════════════════════════════════════════════════════════════════════════════════╝

-- Table: Self-Healing Fix History
CREATE TABLE IF NOT EXISTS self_healing_fixes (
  id SERIAL PRIMARY KEY,
  error_message TEXT NOT NULL,
  error_type VARCHAR(100),
  error_stack TEXT,
  file_path VARCHAR(500),
  line_number INTEGER,
  fix_code TEXT,
  analysis TEXT,
  status VARCHAR(50) DEFAULT 'proposed', -- 'proposed', 'successful', 'failed', 'rolled_back'
  reused_from INTEGER REFERENCES self_healing_fixes(id),
  backup_path VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_self_healing_error ON self_healing_fixes(error_message);
CREATE INDEX IF NOT EXISTS idx_self_healing_status ON self_healing_fixes(status);
CREATE INDEX IF NOT EXISTS idx_self_healing_created ON self_healing_fixes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_self_healing_file ON self_healing_fixes(file_path);

-- Table: Error Patterns (for learning)
CREATE TABLE IF NOT EXISTS error_patterns (
  id SERIAL PRIMARY KEY,
  pattern_name VARCHAR(100) UNIQUE NOT NULL,
  pattern_type VARCHAR(50), -- 'undefined_property', 'null_reference', etc.
  frequency INTEGER DEFAULT 1,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  common_fix TEXT, -- Most successful fix for this pattern
  success_rate DECIMAL(5,2), -- Percentage of successful fixes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_error_patterns_type ON error_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_error_patterns_freq ON error_patterns(frequency DESC);

-- Table: Refactoring Analysis (for predictive refactoring)
CREATE TABLE IF NOT EXISTS refactoring_analysis (
  id SERIAL PRIMARY KEY,
  file_path VARCHAR(500) NOT NULL,
  line_count INTEGER,
  score DECIMAL(3,1), -- 0.0 - 10.0 maintainability score
  urgency VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
  code_smells JSONB,
  complexity_score INTEGER,
  recommendations JSONB,
  refactored BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  refactored_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refactor_file ON refactoring_analysis(file_path);
CREATE INDEX IF NOT EXISTS idx_refactor_score ON refactoring_analysis(score);
CREATE INDEX IF NOT EXISTS idx_refactor_urgency ON refactoring_analysis(urgency);
CREATE INDEX IF NOT EXISTS idx_refactor_created ON refactoring_analysis(created_at DESC);

-- Table: Security Scans
CREATE TABLE IF NOT EXISTS security_scans (
  id SERIAL PRIMARY KEY,
  file_path VARCHAR(500) NOT NULL,
  vulnerabilities JSONB,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  risk_score DECIMAL(3,1), -- 0.0 - 10.0
  blocked_deployment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_security_file ON security_scans(file_path);
CREATE INDEX IF NOT EXISTS idx_security_critical ON security_scans(critical_count DESC);
CREATE INDEX IF NOT EXISTS idx_security_risk ON security_scans(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_security_created ON security_scans(created_at DESC);

-- Table: Bug Learning Database
CREATE TABLE IF NOT EXISTS bug_learning (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  error_message TEXT,
  stack_trace TEXT,
  code_snippet TEXT,
  root_cause TEXT,
  category VARCHAR(100), -- 'null-reference', 'logic-error', 'race-condition', etc.
  prevention_strategies JSONB,
  similar_patterns JSONB,
  file_path VARCHAR(500),
  severity VARCHAR(20) DEFAULT 'medium',
  fixed BOOLEAN DEFAULT FALSE,
  fixed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bug_learning_category ON bug_learning(category);
CREATE INDEX IF NOT EXISTS idx_bug_learning_severity ON bug_learning(severity);
CREATE INDEX IF NOT EXISTS idx_bug_learning_created ON bug_learning(created_at DESC);

-- Table: Prevention Rules (generated from bug analysis)
CREATE TABLE IF NOT EXISTS prevention_rules (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  rule_text TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  created_from_bug VARCHAR(500), -- Bug title that generated this rule
  usage_count INTEGER DEFAULT 0, -- How many times this rule caught a potential bug
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, rule_text)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_prevention_category ON prevention_rules(category);
CREATE INDEX IF NOT EXISTS idx_prevention_usage ON prevention_rules(usage_count DESC);

-- Table: Deployments (zero-downtime deployment tracking)
CREATE TABLE IF NOT EXISTS deployments (
  id SERIAL PRIMARY KEY,
  deployment_id VARCHAR(100) UNIQUE NOT NULL,
  version VARCHAR(50) NOT NULL,
  strategy VARCHAR(50) DEFAULT 'blue-green', -- 'blue-green' or 'rolling'
  status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'success', 'failed'
  steps JSONB,
  error TEXT,
  rolled_back BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deployments_version ON deployments(version);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_started ON deployments(started_at DESC);

-- Table: Query Optimizations
CREATE TABLE IF NOT EXISTS query_optimizations (
  id SERIAL PRIMARY KEY,
  sql_query TEXT NOT NULL,
  execution_time INTEGER, -- in milliseconds
  score DECIMAL(3,1), -- 0.0 - 10.0 optimization score
  issues JSONB,
  suggestions JSONB,
  execution_plan JSONB,
  optimized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_query_opt_score ON query_optimizations(score);
CREATE INDEX IF NOT EXISTS idx_query_opt_exec_time ON query_optimizations(execution_time DESC);
CREATE INDEX IF NOT EXISTS idx_query_opt_created ON query_optimizations(created_at DESC);

-- Table: Parallel Features (parallel development tracking)
CREATE TABLE IF NOT EXISTS parallel_features (
  id SERIAL PRIMARY KEY,
  feature_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'developing', 'testing', 'ready', 'merged', 'failed'
  branch VARCHAR(200),
  plan JSONB,
  estimated_files JSONB,
  files JSONB,
  dependencies JSONB,
  conflicts JSONB,
  progress INTEGER DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  merged_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parallel_features_status ON parallel_features(status);
CREATE INDEX IF NOT EXISTS idx_parallel_features_started ON parallel_features(started_at DESC);

-- Table: Prototypes (instant prototyping tracking)
CREATE TABLE IF NOT EXISTS prototypes (
  id SERIAL PRIMARY KEY,
  prototype_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  framework VARCHAR(100) DEFAULT 'react-express',
  status VARCHAR(50) DEFAULT 'generating',
  requirements JSONB,
  output_dir VARCHAR(500),
  files_created INTEGER DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prototypes_status ON prototypes(status);
CREATE INDEX IF NOT EXISTS idx_prototypes_started ON prototypes(started_at DESC);

-- Table: Code Optimizations (speed optimization tracking)
CREATE TABLE IF NOT EXISTS code_optimizations (
  id SERIAL PRIMARY KEY,
  function_name VARCHAR(500),
  file_path VARCHAR(500),
  original_code TEXT,
  optimized_code TEXT,
  techniques JSONB,
  speedup DECIMAL(10,2), -- How many times faster
  memory_reduction INTEGER, -- Percentage
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_code_opt_speedup ON code_optimizations(speedup DESC);
CREATE INDEX IF NOT EXISTS idx_code_opt_created ON code_optimizations(created_at DESC);

-- Table: Pair Programming Suggestions
CREATE TABLE IF NOT EXISTS pair_programming_suggestions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100), -- 'code_completion', 'improvement', 'bug_fix', etc.
  original_code TEXT,
  suggestion TEXT,
  reason TEXT,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pair_prog_type ON pair_programming_suggestions(type);
CREATE INDEX IF NOT EXISTS idx_pair_prog_accepted ON pair_programming_suggestions(accepted);
CREATE INDEX IF NOT EXISTS idx_pair_prog_created ON pair_programming_suggestions(created_at DESC);

-- Table: Code Explanations
CREATE TABLE IF NOT EXISTS code_explanations (
  id SERIAL PRIMARY KEY,
  code TEXT,
  level VARCHAR(50), -- 'beginner', 'intermediate', 'expert'
  format VARCHAR(50), -- 'narrative', 'tutorial', 'documentation', 'diagram'
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_code_explain_level ON code_explanations(level);
CREATE INDEX IF NOT EXISTS idx_code_explain_format ON code_explanations(format);
CREATE INDEX IF NOT EXISTS idx_code_explain_created ON code_explanations(created_at DESC);

-- Table: Pattern Analysis (codebase pattern recognition)
CREATE TABLE IF NOT EXISTS pattern_analysis (
  id SERIAL PRIMARY KEY,
  directory VARCHAR(500),
  files_analyzed INTEGER,
  patterns_found JSONB,
  anti_patterns_found JSONB,
  duplicates_found JSONB,
  inconsistencies JSONB,
  recommendations JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pattern_analysis_completed ON pattern_analysis(completed_at DESC);

-- Table: Fuzz Testing Results
CREATE TABLE IF NOT EXISTS fuzz_testing_results (
  id SERIAL PRIMARY KEY,
  function_code TEXT,
  iterations INTEGER,
  crashes JSONB,
  errors JSONB,
  success_rate DECIMAL(5,2),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fuzz_testing_created ON fuzz_testing_results(created_at DESC);

-- Table: Visual Regression Tests
CREATE TABLE IF NOT EXISTS visual_regression_tests (
  id SERIAL PRIMARY KEY,
  test_name VARCHAR(500) NOT NULL,
  url TEXT,
  results JSONB,
  has_differences BOOLEAN DEFAULT FALSE,
  total_diff_pixels INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visual_tests_name ON visual_regression_tests(test_name);
CREATE INDEX IF NOT EXISTS idx_visual_tests_diffs ON visual_regression_tests(has_differences);
CREATE INDEX IF NOT EXISTS idx_visual_tests_created ON visual_regression_tests(created_at DESC);

-- Table: Competitors
CREATE TABLE IF NOT EXISTS competitors (
  id SERIAL PRIMARY KEY,
  competitor_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  website TEXT,
  category VARCHAR(200),
  features JSONB,
  tech_stack JSONB,
  pricing JSONB,
  added_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitors_category ON competitors(category);
CREATE INDEX IF NOT EXISTS idx_competitors_updated ON competitors(last_updated DESC);

-- Table: Competitive Comparisons
CREATE TABLE IF NOT EXISTS competitive_comparisons (
  id SERIAL PRIMARY KEY,
  competitor_name VARCHAR(500),
  our_features INTEGER,
  their_features INTEGER,
  unique_to_us JSONB,
  unique_to_them JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comparisons_created ON competitive_comparisons(created_at DESC);

-- Table: Scaling Events
CREATE TABLE IF NOT EXISTS scaling_events (
  id SERIAL PRIMARY KEY,
  metrics JSONB,
  prediction JSONB,
  decision JSONB,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scaling_events_created ON scaling_events(created_at DESC);

-- Table: Scaling Metrics (for historical analysis)
CREATE TABLE IF NOT EXISTS scaling_metrics (
  id SERIAL PRIMARY KEY,
  metrics JSONB,
  timestamp TIMESTAMPTZ NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scaling_metrics_timestamp ON scaling_metrics(timestamp DESC);
