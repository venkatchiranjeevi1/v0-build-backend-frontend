-- Schema Variation 3: Personnel-focused naming
CREATE TABLE IF NOT EXISTS personnel (
    person_id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    mail VARCHAR(100) UNIQUE,
    division VARCHAR(50),
    title VARCHAR(50),
    pay_rate DECIMAL(10,2),
    start_date DATE,
    location VARCHAR(50),
    supervisor_id INTEGER,
    FOREIGN KEY (supervisor_id) REFERENCES personnel(person_id)
);

CREATE TABLE IF NOT EXISTS divisions (
    division_code SERIAL PRIMARY KEY,
    division_name VARCHAR(50) NOT NULL,
    head_id INTEGER,
    annual_budget DECIMAL(12,2),
    FOREIGN KEY (head_id) REFERENCES personnel(person_id)
);

-- Sample data
INSERT INTO personnel (employee_name, mail, division, title, pay_rate, start_date, location, supervisor_id) VALUES
('Christopher Lee', 'chris.lee@company.com', 'Technology', 'Systems Architect', 130000.00, '2018-03-01', 'Austin', NULL),
('Michelle Rodriguez', 'michelle.rodriguez@company.com', 'Technology', 'Software Developer', 88000.00, '2021-07-15', 'Austin', 1),
('Brian Johnson', 'brian.johnson@company.com', 'Operations', 'Operations Manager', 98000.00, '2019-11-20', 'Denver', NULL),
('Jessica Chen', 'jessica.chen@company.com', 'Finance', 'Financial Analyst', 72000.00, '2022-02-28', 'Boston', NULL),
('Daniel Kim', 'daniel.kim@company.com', 'Technology', 'Python Engineer', 95000.00, '2020-09-10', 'Austin', 1);

INSERT INTO divisions (division_name, head_id, annual_budget) VALUES
('Technology', 1, 3000000.00),
('Operations', 3, 1500000.00),
('Finance', 4, 800000.00);

-- Create indexes
CREATE INDEX idx_personnel_division ON personnel(division);
CREATE INDEX idx_personnel_pay_rate ON personnel(pay_rate);
CREATE INDEX idx_personnel_start_date ON personnel(start_date);
