-- Alternative Schema Variation 2: Different naming patterns
-- This tests the schema discovery's ability to handle various naming conventions

CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email_address VARCHAR(100) UNIQUE,
    department VARCHAR(50),
    role VARCHAR(50),
    compensation DECIMAL(10,2),
    hired_on DATE,
    city VARCHAR(50),
    reports_to INTEGER,
    FOREIGN KEY (reports_to) REFERENCES staff(id)
);

CREATE TABLE IF NOT EXISTS files (
    file_id SERIAL PRIMARY KEY,
    staff_id INTEGER,
    type VARCHAR(50),
    content TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Sample data with different structure
INSERT INTO staff (name, email_address, department, role, compensation, hired_on, city, reports_to) VALUES
('Alex Thompson', 'alex.thompson@company.com', 'Engineering', 'Lead Developer', 120000.00, '2020-02-01', 'Seattle', NULL),
('Maria Garcia', 'maria.garcia@company.com', 'Engineering', 'Frontend Developer', 85000.00, '2022-04-15', 'Seattle', 1),
('James Wilson', 'james.wilson@company.com', 'Design', 'UX Designer', 78000.00, '2021-08-20', 'Portland', NULL),
('Rachel Kim', 'rachel.kim@company.com', 'Product', 'Product Manager', 105000.00, '2019-12-10', 'San Francisco', NULL),
('Tom Anderson', 'tom.anderson@company.com', 'Engineering', 'Python Developer', 92000.00, '2023-01-05', 'Seattle', 1);

INSERT INTO files (staff_id, type, content) VALUES
(1, 'resume', 'Lead Developer with 8 years experience in full-stack development, Python, React, Node.js, AWS...'),
(2, 'resume', 'Frontend Developer specializing in React, Vue.js, TypeScript, responsive design, accessibility...'),
(3, 'portfolio', 'UX Designer portfolio showcasing user research, wireframing, prototyping, Figma, Sketch...'),
(4, 'resume', 'Product Manager with experience in agile methodologies, user stories, roadmap planning...'),
(5, 'resume', 'Python Developer with machine learning background, TensorFlow, PyTorch, data science...');

-- Create indexes
CREATE INDEX idx_staff_department ON staff(department);
CREATE INDEX idx_staff_compensation ON staff(compensation);
CREATE INDEX idx_files_staff_id ON files(staff_id);
