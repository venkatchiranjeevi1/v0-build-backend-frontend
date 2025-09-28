# NLP Query Engine for Employee Data

A production-ready natural language query system that dynamically adapts to database schemas and handles both structured employee data and unstructured documents.

## Features

### Core Functionality
- **Dynamic Schema Discovery**: Automatically discovers database structure without hard-coding
- **Natural Language Processing**: Converts natural language queries to SQL and document searches
- **Multi-format Document Processing**: Supports PDF, DOCX, TXT, CSV, Excel files
- **Hybrid Query Support**: Combines database and document search results
- **Performance Optimization**: Caching, connection pooling, and async operations

### User Interface
- **Database Connection Panel**: Connect to PostgreSQL, MySQL, SQLite databases
- **Document Upload Interface**: Drag-and-drop file upload with progress tracking
- **Query Interface**: Natural language query input with suggestions and history
- **Results Visualization**: Table view for SQL results, card view for documents
- **Schema Visualization**: Interactive database schema explorer
- **Metrics Dashboard**: Real-time performance monitoring

### Production Features
- **Concurrent Users**: Handles 10+ simultaneous users
- **Response Time**: 95% of queries under 2 seconds
- **Caching System**: Intelligent query result caching with TTL
- **Connection Pooling**: Efficient database connection management
- **Error Recovery**: Graceful handling of failures
- **Security**: SQL injection prevention and input validation
- **Monitoring**: Comprehensive logging and performance metrics

## Quick Start with Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- 4GB+ available RAM

### 1. Clone and Start
\`\`\`bash
# Clone the repository
git clone <repository-url>
cd nlp-query-engine

# Start all services
docker-compose up --build
\`\`\`

### 2. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 3. Test the System
\`\`\`bash
# Run system tests
python scripts/test_system.py
\`\`\`

## Sample Database

The system comes with a pre-populated SQLite database containing:
- **10 employees** across 4 departments
- **Sample documents** (resumes, performance reviews, contracts)
- **Realistic salary and hiring data**

### Sample Queries to Try
- "How many employees do we have?"
- "What is the average salary by department?"
- "Show me all employees in Engineering"
- "Who are the highest paid employees?"
- "Find employees hired in 2022"
- "Show me performance reviews"

## Architecture

\`\`\`
project/
├── backend/                    # FastAPI backend
│   ├── api/
│   │   ├── routes/
│   │   │   ├── ingestion.py   # Database connection & document upload
│   │   │   ├── query.py       # Natural language query processing
│   │   │   └── schema.py      # Schema visualization endpoints
│   │   └── models/
│   │       └── schemas.py     # Pydantic models
│   ├── services/
│   │   ├── schema_discovery.py    # Dynamic schema analysis
│   │   ├── document_processor.py  # Multi-format document processing
│   │   ├── query_engine.py        # NLP to SQL conversion
│   │   ├── cache_manager.py       # Performance caching
│   │   └── performance_monitor.py # System monitoring
│   ├── scripts/
│   │   ├── create_sqlite_database.py  # SQLite database setup
│   │   └── test_system.py            # System testing
│   └── main.py                # FastAPI application
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── DatabaseConnector.js   # Database connection UI
│   │   │   ├── DocumentUploader.js    # File upload interface
│   │   │   ├── QueryPanel.js          # Query input and suggestions
│   │   │   ├── ResultsView.js         # Results display
│   │   │   ├── SchemaVisualization.js # Database schema viewer
│   │   │   └── MetricsDashboard.js    # Performance metrics
│   │   └── App.js             # Main application
│   └── package.json
├── data/                      # SQLite database storage
│   └── employee_database.db   # Sample employee database
├── docker-compose.yml         # Multi-service deployment
├── requirements.txt           # Python dependencies
└── README.md
\`\`\`

## Manual Setup (Alternative)

### Backend Setup

1. **Install Dependencies**
\`\`\`bash
cd backend
pip install -r requirements.txt
\`\`\`

2. **Create Sample Database**
\`\`\`bash
python scripts/create_sqlite_database.py
\`\`\`

3. **Start the API Server**
\`\`\`bash
python main.py
\`\`\`

The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Install Dependencies**
\`\`\`bash
cd frontend
npm install
\`\`\`

2. **Start the Development Server**
\`\`\`bash
npm start
\`\`\`

The frontend will be available at `http://localhost:3000`

## Usage Guide

### 1. Connect to Database

The system automatically connects to the SQLite database with sample data. You can also:

**Connect to Custom Database:**
- PostgreSQL: `postgresql://user:password@localhost:5432/employee_db`
- MySQL: `mysql://user:password@localhost:3306/employee_db`
- SQLite: `sqlite:///path/to/database.db`

### 2. Upload Documents

Drag and drop files or click to select:
- **Supported formats**: PDF, DOCX, TXT, CSV, XLS, XLSX
- **File size limit**: 10MB per file
- **Batch upload**: Multiple files processed simultaneously

### 3. Query Your Data

**Example Queries:**
- "How many employees do we have?"
- "Average salary by department"
- "List employees hired this year"
- "Top 5 highest paid employees in each department"
- "Employees with Python skills earning over 100k"
- "Show me performance reviews for engineers"

### 4. View Results

- **SQL Results**: Table format with sortable columns
- **Document Results**: Card format with similarity scores
- **Hybrid Results**: Combined database and document results
- **Export**: Download results as JSON/CSV

## Schema Adaptability

The system works with various database naming conventions:

**Schema Variation 1 (Standard)**
\`\`\`sql
employees (emp_id, full_name, dept_id, position, annual_salary, join_date)
departments (dept_id, dept_name, manager_id)
\`\`\`

**Schema Variation 2 (Alternative)**
\`\`\`sql
staff (id, name, department, role, compensation, hired_on)
files (file_id, staff_id, type, content)
\`\`\`

**Schema Variation 3 (Personnel)**
\`\`\`sql
personnel (person_id, employee_name, division, title, pay_rate, start_date)
divisions (division_code, division_name, head_id)
\`\`\`

The system automatically:
- Detects table purposes (employees, departments, documents)
- Maps column semantics (name, salary, department, etc.)
- Infers relationships between tables
- Adapts queries to actual schema structure

## API Endpoints

### Database Connection
- `POST /api/schema/connect` - Connect and analyze database
- `GET /api/schema/{connection_id}` - Get discovered schema information

### Document Processing
- `POST /api/ingestion/upload` - Upload and process documents
- `GET /api/ingestion/status/{job_id}` - Check processing status

### Query Processing
- `POST /api/query/natural` - Process natural language query
- `GET /api/query/history` - Get query history and cache stats

### System Monitoring
- `GET /health` - System health check
- `GET /api/metrics` - Comprehensive performance metrics

## Testing

### System Tests
\`\`\`bash
# Test all functionality
python scripts/test_system.py
\`\`\`

### Manual Testing
1. Start the system with `docker-compose up --build`
2. Open http://localhost:3000
3. Try the sample queries listed above
4. Upload test documents
5. Check metrics dashboard

## Configuration

### Environment Variables
\`\`\`bash
# Database (automatically set for SQLite)
DATABASE_URL=sqlite:///app/data/employee_database.db

# Performance
MAX_CONCURRENT_QUERIES=10
QUERY_TIMEOUT=30
CACHE_TTL=300
\`\`\`

## Switching to Groq API

To use Groq instead of local sentence-transformers:

1. **Get Groq API Key** from https://console.groq.com
2. **Set Environment Variable**:
   \`\`\`bash
   export GROQ_API_KEY=your_api_key_here
   \`\`\`
3. **Update Backend Configuration** in `backend/services/query_engine.py`

## Troubleshooting

### Common Issues

**Docker Issues**
\`\`\`bash
# Clean rebuild
docker-compose down
docker-compose up --build --force-recreate
\`\`\`

**Database Connection Failed**
- Check if SQLite database exists in `data/employee_database.db`
- Run `python scripts/create_sqlite_database.py` to recreate

**Frontend Not Loading**
- Check if backend is running on port 8000
- Verify CORS settings in backend

**Query Processing Slow**
- Check available memory (sentence-transformers needs ~2GB)
- Monitor CPU usage during processing

### Debugging
- Check Docker logs: `docker-compose logs -f`
- Backend logs: `docker-compose logs backend`
- Frontend logs: `docker-compose logs frontend`

## Performance Features

### Caching System
- **Query Result Caching**: 5-minute TTL with LRU eviction
- **Schema Caching**: Reduces repeated database introspection
- **Connection Pooling**: Reuses database connections efficiently

### Monitoring
- **Response Time Tracking**: Per-query performance metrics
- **Cache Hit Rate**: Optimization effectiveness measurement
- **System Health**: CPU, memory, and disk usage monitoring
- **Error Tracking**: Failed query analysis and debugging

## Security

### Input Validation
- SQL injection prevention through parameterized queries
- File type validation and size limits
- Query complexity analysis and timeouts

### Access Control
- Connection string encryption in production
- API rate limiting
- Request logging and monitoring

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Create GitHub issue for bugs
- Check documentation for common solutions
- Review Docker logs for error details
