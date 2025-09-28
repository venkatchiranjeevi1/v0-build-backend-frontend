from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Form
from typing import List, Dict, Any, Optional
import uuid
import asyncio
from datetime import datetime

from services.schema_discovery import SchemaDiscovery
from services.document_processor import DocumentProcessor
from models.schemas import (
    DatabaseConnectionRequest,
    DatabaseConnectionResponse,
    DocumentUploadResponse,
    IngestionStatusResponse
)
from services.cache_manager import connection_pool
from services.performance_monitor import performance_monitor

router = APIRouter()

# In-memory storage for demo (use Redis/database in production)
ingestion_jobs = {}
connected_databases = {}

@router.post("/connect-database", response_model=DatabaseConnectionResponse)
async def connect_database(request: DatabaseConnectionRequest):
    """
    Connect to database and auto-discover schema
    """
    start_time = datetime.utcnow()
    
    try:
        schema_discovery = SchemaDiscovery()
        
        engine = await connection_pool.get_connection(request.connection_string)
        
        # Test connection and discover schema
        schema_info = await schema_discovery.analyze_database(request.connection_string)
        
        # Store connection info
        connection_id = str(uuid.uuid4())
        connected_databases[connection_id] = {
            "connection_string": request.connection_string,
            "schema": schema_info,
            "connected_at": datetime.utcnow(),
            "engine": engine
        }
        
        response_time = (datetime.utcnow() - start_time).total_seconds()
        await performance_monitor.record_query({
            'query': 'database_connection',
            'query_type': 'connection',
            'response_time': response_time,
            'success': True,
            'cache_hit': False
        })
        
        return DatabaseConnectionResponse(
            success=True,
            connection_id=connection_id,
            schema=schema_info,
            message="Database connected successfully"
        )
        
    except Exception as e:
        response_time = (datetime.utcnow() - start_time).total_seconds()
        await performance_monitor.record_query({
            'query': 'database_connection',
            'query_type': 'connection',
            'response_time': response_time,
            'success': False,
            'error': str(e),
            'cache_hit': False
        })
        
        raise HTTPException(status_code=400, detail=f"Database connection failed: {str(e)}")

@router.post("/upload-documents", response_model=DocumentUploadResponse)
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    connection_id: Optional[str] = Form(None)
):
    """
    Accept multiple document uploads and process them
    """
    try:
        job_id = str(uuid.uuid4())
        
        # Initialize job status
        ingestion_jobs[job_id] = {
            "status": "processing",
            "total_files": len(files),
            "processed_files": 0,
            "failed_files": 0,
            "started_at": datetime.utcnow(),
            "files": []
        }
        
        # Process documents in background
        document_processor = DocumentProcessor()
        background_tasks.add_task(
            process_documents_background,
            job_id,
            files,
            document_processor,
            connection_id
        )
        
        return DocumentUploadResponse(
            success=True,
            job_id=job_id,
            total_files=len(files),
            message="Document processing started"
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Document upload failed: {str(e)}")

@router.get("/ingestion-status/{job_id}", response_model=IngestionStatusResponse)
async def get_ingestion_status(job_id: str):
    """
    Get status of document processing job
    """
    if job_id not in ingestion_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = ingestion_jobs[job_id]
    
    return IngestionStatusResponse(
        job_id=job_id,
        status=job["status"],
        total_files=job["total_files"],
        processed_files=job["processed_files"],
        failed_files=job["failed_files"],
        progress_percentage=int((job["processed_files"] / job["total_files"]) * 100) if job["total_files"] > 0 else 0,
        started_at=job["started_at"],
        files=job["files"]
    )

async def process_documents_background(
    job_id: str,
    files: List[UploadFile],
    document_processor: DocumentProcessor,
    connection_id: Optional[str]
):
    """
    Background task to process uploaded documents
    """
    start_time = datetime.utcnow()
    
    try:
        for file in files:
            try:
                # Read file content
                content = await file.read()
                
                # Process document
                result = await document_processor.process_document(
                    file.filename,
                    content,
                    file.content_type
                )
                
                # Update job status
                ingestion_jobs[job_id]["processed_files"] += 1
                ingestion_jobs[job_id]["files"].append({
                    "filename": file.filename,
                    "status": "success",
                    "document_id": result.get("document_id"),
                    "chunks": result.get("chunks", 0)
                })
                
            except Exception as e:
                ingestion_jobs[job_id]["failed_files"] += 1
                ingestion_jobs[job_id]["files"].append({
                    "filename": file.filename,
                    "status": "failed",
                    "error": str(e)
                })
        
        # Mark job as complete
        ingestion_jobs[job_id]["status"] = "completed"
        ingestion_jobs[job_id]["completed_at"] = datetime.utcnow()
        
        response_time = (datetime.utcnow() - start_time).total_seconds()
        await performance_monitor.record_query({
            'query': 'document_processing',
            'query_type': 'ingestion',
            'response_time': response_time,
            'success': True,
            'result_count': len(files),
            'cache_hit': False
        })
        
    except Exception as e:
        ingestion_jobs[job_id]["status"] = "failed"
        ingestion_jobs[job_id]["error"] = str(e)
        
        response_time = (datetime.utcnow() - start_time).total_seconds()
        await performance_monitor.record_query({
            'query': 'document_processing',
            'query_type': 'ingestion',
            'response_time': response_time,
            'success': False,
            'error': str(e),
            'cache_hit': False
        })
