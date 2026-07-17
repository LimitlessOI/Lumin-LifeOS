-- SYNOPSIS: Database migration — 013_create_detailed_competency_standards.sql.
CREATE TABLE IF NOT EXISTS detailed_competency_standards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    domain_id INT NOT NULL,
    standard_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES competency_domains(id)
);
