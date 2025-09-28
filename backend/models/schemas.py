from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# Request Models
class DatabaseConnectionRequest(BaseModel):
    connection_string: str = Field(..., description="Database connection string")
    test_connection: bool = Field(True, description="Test connection before saving")

class QueryRequest(BaseModel):
    query: str = Field(..., description="Natural language query")
    connection_id: Optional[str] = Field(None, description="Database connection ID")
    limit: int = Field(100, ge=1, le=1000, description="Maximum results to return")

# Response Models
class DatabaseConnectionResponse(BaseModel):
    success: bool
    connection_id: Optional[str] = None
    schema: Optional[Dict[str, Any]] = None
    message: str
    error: Optional[str] = None

class DocumentUploadResponse(BaseModel):
    success: bool
    job_id: str
    total_files: int
    message: str
    error: Optional[str] = None

class IngestionStatusResponse(BaseModel):
    job_id: str
    status: str  # processing, completed, failed
    total_files: int
    processed_files: int
    failed_files: int
    progress_percentage: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    files: List[Dict[str, Any]]
    error: Optional[str] = None

class QueryResponse(BaseModel):
    success: bool
    query: str
    query_type: str  # sql, document, hybrid
    results: List[Dict[str, Any]]
    sources: List[Dict[str, Any]]
    sql_query: Optional[str] = None
    response_time: float
    cache_hit: bool
    total_results: int
    error: Optional[str] = None

class QueryHistoryResponse(BaseModel):
    queries: List[Dict[str, Any]]
    total_queries: int
    cache_stats: Dict[str, Any]

class SchemaResponse(BaseModel):
    success: bool
    schema: Dict[str, Any]
    connection_id: Optional[str] = None
    error: Optional[str] = None

# Internal Models
class TableInfo(BaseModel):
    name: str
    columns: List[Dict[str, str]]
    relationships: List[Dict[str, Any]]
    sample_data: List[Dict[str, Any]]
    purpose: Optional[str] = None

class DocumentChunk(BaseModel):
    chunk_id: str
    document_id: str
    content: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None
