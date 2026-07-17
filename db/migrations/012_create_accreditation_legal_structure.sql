-- SYNOPSIS: Database migration — 012_create_accreditation_legal_structure.sql.
CREATE TABLE IF NOT EXISTS accreditation_legal_structure (
    id INT PRIMARY KEY AUTO_INCREMENT,
    institution_id INT NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    legal_entity_type VARCHAR(100) NOT NULL,
    registration_number VARCHAR(100),
    registration_date DATE,
    issuing_authority VARCHAR(255),
    country_of_registration VARCHAR(100) NOT NULL,
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
);
