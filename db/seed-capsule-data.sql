CREATE TABLE IF NOT EXISTS capsules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO capsules (title, content, category) VALUES
('Orchestrator Design', 'Detailed design of orchestrator architecture...', 'Architecture'),
('Product Strategy', 'Outline of product strategy and goals...', 'Business Model'),
('Technical Decisions', 'Summary of key technical decisions...', 'Integrations'),
('Lessons Learned', 'Compilation of lessons learned from past projects...', 'Roadmap');