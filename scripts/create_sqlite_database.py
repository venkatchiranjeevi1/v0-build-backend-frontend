import sqlite3
import os
from datetime import datetime, date

def create_sample_database():
    """Create SQLite database with sample employee data"""
    
    # Create database directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    # Connect to SQLite database (creates if doesn't exist)
    conn = sqlite3.connect('data/employee_database.db')
    cursor = conn.cursor()
    
    # Create employees table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS employees (
            emp_id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE,
            dept_id INTEGER,
            position TEXT,
            annual_salary REAL,
            join_date DATE,
            office_location TEXT,
            manager_id INTEGER,
            FOREIGN KEY (manager_id) REFERENCES employees(emp_id),
            FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
        )
    ''')
    
    # Create departments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS departments (
            dept_id INTEGER PRIMARY KEY AUTOINCREMENT,
            dept_name TEXT NOT NULL,
            manager_id INTEGER,
            budget REAL,
            FOREIGN KEY (manager_id) REFERENCES employees(emp_id)
        )
    ''')
    
    # Create documents table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            doc_id INTEGER PRIMARY KEY AUTOINCREMENT,
            emp_id INTEGER,
            document_type TEXT,
            filename TEXT,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            file_size INTEGER,
            content_preview TEXT,
            FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
        )
    ''')
    
    # Insert sample departments first
    departments_data = [
        ('Engineering', None, 2500000.00),
        ('Marketing', None, 800000.00),
        ('Human Resources', None, 600000.00),
        ('Sales', None, 1200000.00)
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO departments (dept_name, manager_id, budget) 
        VALUES (?, ?, ?)
    ''', departments_data)
    
    # Insert sample employees
    employees_data = [
        ('John Smith', 'john.smith@company.com', 1, 'Software Engineer', 85000.00, '2022-01-15', 'New York', None),
        ('Sarah Johnson', 'sarah.johnson@company.com', 1, 'Senior Software Engineer', 105000.00, '2021-03-10', 'New York', 1),
        ('Mike Chen', 'mike.chen@company.com', 1, 'Python Developer', 90000.00, '2022-06-01', 'San Francisco', 2),
        ('Emily Davis', 'emily.davis@company.com', 2, 'Marketing Manager', 95000.00, '2020-09-15', 'Chicago', None),
        ('Robert Wilson', 'robert.wilson@company.com', 2, 'Marketing Specialist', 65000.00, '2023-01-20', 'Chicago', 4),
        ('Lisa Anderson', 'lisa.anderson@company.com', 3, 'HR Director', 110000.00, '2019-05-01', 'New York', None),
        ('David Brown', 'david.brown@company.com', 3, 'HR Specialist', 55000.00, '2023-03-15', 'New York', 6),
        ('Jennifer Taylor', 'jennifer.taylor@company.com', 1, 'DevOps Engineer', 95000.00, '2021-11-30', 'San Francisco', 2),
        ('Kevin Martinez', 'kevin.martinez@company.com', 4, 'Sales Manager', 100000.00, '2020-07-10', 'Los Angeles', None),
        ('Amanda White', 'amanda.white@company.com', 4, 'Sales Representative', 70000.00, '2022-12-05', 'Los Angeles', 9)
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO employees (full_name, email, dept_id, position, annual_salary, join_date, office_location, manager_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', employees_data)
    
    # Update department managers
    cursor.execute('UPDATE departments SET manager_id = 2 WHERE dept_name = "Engineering"')
    cursor.execute('UPDATE departments SET manager_id = 4 WHERE dept_name = "Marketing"')
    cursor.execute('UPDATE departments SET manager_id = 6 WHERE dept_name = "Human Resources"')
    cursor.execute('UPDATE departments SET manager_id = 9 WHERE dept_name = "Sales"')
    
    # Insert sample documents
    documents_data = [
        (1, 'resume', 'john_smith_resume.pdf', 245760, 'Software Engineer with 5 years experience in Python, JavaScript, and React. Strong background in full-stack development and agile methodologies.'),
        (2, 'resume', 'sarah_johnson_resume.pdf', 198432, 'Senior Software Engineer specializing in backend systems, Python, Django, PostgreSQL. Led multiple high-impact projects and mentored junior developers.'),
        (3, 'resume', 'mike_chen_resume.pdf', 167890, 'Python Developer with expertise in machine learning, data analysis, pandas, scikit-learn. Experience with AI/ML model deployment and optimization.'),
        (4, 'performance_review', 'emily_davis_2023_review.pdf', 89456, 'Performance Review 2023: Excellent leadership in marketing campaigns, exceeded targets by 15%. Strong strategic thinking and team collaboration.'),
        (5, 'resume', 'robert_wilson_resume.pdf', 156789, 'Marketing professional with digital marketing experience, Google Ads, SEO, content creation. Proven track record in lead generation and conversion optimization.'),
        (6, 'performance_review', 'lisa_anderson_2023_review.pdf', 134567, 'HR Director Performance Review: Outstanding leadership in talent acquisition and employee engagement initiatives. Implemented new onboarding process.'),
        (7, 'contract', 'david_brown_contract.pdf', 98765, 'Employment Contract: HR Specialist position, salary $55,000, benefits package included. Start date March 15, 2023.'),
        (8, 'resume', 'jennifer_taylor_resume.pdf', 187654, 'DevOps Engineer with expertise in AWS, Docker, Kubernetes, CI/CD pipelines. Strong automation and infrastructure management skills.'),
        (9, 'performance_review', 'kevin_martinez_2023_review.pdf', 112345, 'Sales Manager Review: Exceeded annual sales targets by 22%. Excellent client relationship management and team leadership skills.'),
        (10, 'resume', 'amanda_white_resume.pdf', 145678, 'Sales Representative with B2B sales experience, CRM management, client acquisition. Strong communication and negotiation skills.')
    ]
    
    cursor.executemany('''
        INSERT OR IGNORE INTO documents (emp_id, document_type, filename, file_size, content_preview) 
        VALUES (?, ?, ?, ?, ?)
    ''', documents_data)
    
    # Create indexes for better performance
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_employees_dept_id ON employees(dept_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_employees_salary ON employees(annual_salary)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_employees_join_date ON employees(join_date)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_documents_emp_id ON documents(emp_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type)')
    
    # Commit changes and close connection
    conn.commit()
    conn.close()
    
    print("✅ SQLite database created successfully!")
    print("📊 Database location: data/employee_database.db")
    print("👥 Sample data: 10 employees, 4 departments, 10 documents")

if __name__ == "__main__":
    create_sample_database()
