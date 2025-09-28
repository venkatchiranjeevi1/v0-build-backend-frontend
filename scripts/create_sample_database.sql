-- Sample Employee Database Schema
-- This script creates tables with different naming patterns to test schema discovery

-- Schema Variation 1: Standard naming
CREATE TABLE IF NOT EXISTS employees (
    emp_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    dept_id INTEGER,
    position VARCHAR(50),
    annual_salary DECIMAL(10,2),
    join_date DATE,
    office_location VARCHAR(50),
    manager_id INTEGER,
    FOREIGN KEY (manager_id) REFERENCES employees(emp_id)
);

CREATE TABLE IF NOT EXISTS departments (
    dept_id SERIAL PRIMARY KEY,
    dept_name VARCHAR(50) NOT NULL,
    manager_id INTEGER,
    budget DECIMAL(12,2),
    FOREIGN KEY (manager_id) REFERENCES employees(emp_id)
);

-- Add foreign key constraint
ALTER TABLE employees ADD CONSTRAINT fk_emp_dept 
FOREIGN KEY (dept_id) REFERENCES departments(dept_id);

-- Sample data for employees
INSERT INTO employees (full_name, email, dept_id, position, annual_salary, join_date, office_location, manager_id) VALUES
('John Smith', 'john.smith@company.com', 1, 'Software Engineer', 85000.00, '2022-01-15', 'New York', NULL),
('Sarah Johnson', 'sarah.johnson@company.com', 1, 'Senior Software Engineer', 105000.00, '2021-03-10', 'New York', 1),
('Mike Chen', 'mike.chen@company.com', 1, 'Python Developer', 90000.00, '2022-06-01', 'San Francisco', 2),
('Emily Davis', 'emily.davis@company.com', 2, 'Marketing Manager', 95000.00, '2020-09-15', 'Chicago', NULL),
('Robert Wilson', 'robert.wilson@company.com', 2, 'Marketing Specialist', 65000.00, '2023-01-20', 'Chicago', 4),
('Lisa Anderson', 'lisa.anderson@company.com', 3, 'HR Director', 110000.00, '2019-05-01', 'New York', NULL),
('David Brown', 'david.brown@company.com', 3, 'HR Specialist', 55000.00, '2023-03-15', 'New York', 6),
('Jennifer Taylor', 'jennifer.taylor@company.com', 1, 'DevOps Engineer', 95000.00, '2021-11-30', 'San Francisco', 2),
('Kevin Martinez', 'kevin.martinez@company.com', 4, 'Sales Manager', 100000.00, '2020-07-10', 'Los Angeles', NULL),
('Amanda White', 'amanda.white@company.com', 4, 'Sales Representative', 70000.00, '2022-12-05', 'Los Angeles', 9);

-- Sample data for departments
INSERT INTO departments (dept_name, manager_id, budget) VALUES
('Engineering', 2, 2500000.00),
('Marketing', 4, 800000.00),
('Human Resources', 6, 600000.00),
('Sales', 9, 1200000.00);

-- Create documents table for file storage
CREATE TABLE IF NOT EXISTS documents (
    doc_id SERIAL PRIMARY KEY,
    emp_id INTEGER,
    document_type VARCHAR(50),
    filename VARCHAR(255),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_size INTEGER,
    content_preview TEXT,
    FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
);

-- Sample document records
INSERT INTO documents (emp_id, document_type, filename, file_size, content_preview) VALUES
(1, 'resume', 'john_smith_resume.pdf', 245760, 'Software Engineer with 5 years experience in Python, JavaScript, and React...'),
(2, 'resume', 'sarah_johnson_resume.pdf', 198432, 'Senior Software Engineer specializing in backend systems, Python, Django, PostgreSQL...'),
(3, 'resume', 'mike_chen_resume.pdf', 167890, 'Python Developer with expertise in machine learning, data analysis, pandas, scikit-learn...'),
(4, 'performance_review', 'emily_davis_2023_review.pdf', 89456, 'Performance Review 2023: Excellent leadership in marketing campaigns, exceeded targets by 15%...'),
(5, 'resume', 'robert_wilson_resume.pdf', 156789, 'Marketing professional with digital marketing experience, Google Ads, SEO, content creation...');

-- Create indexes for better performance
CREATE INDEX idx_employees_dept_id ON employees(dept_id);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);
CREATE INDEX idx_employees_salary ON employees(annual_salary);
CREATE INDEX idx_employees_join_date ON employees(join_date);
CREATE INDEX idx_documents_emp_id ON documents(emp_id);
CREATE INDEX idx_documents_type ON documents(document_type);
