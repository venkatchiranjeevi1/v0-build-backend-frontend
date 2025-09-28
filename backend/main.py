from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
import uvicorn
import logging
import time
from contextlib import asynccontextmanager

from api.routes import ingestion, query, schema
from services.schema_discovery import SchemaDiscovery
from services.document_processor import DocumentProcessor
from services.query_engine import QueryEngine
from services.cache_manager import cache_manager, connection_pool
from services.performance_monitor import performance_monitor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global instances
schema_discovery = None
document_processor = None
query_engine = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global schema_discovery, document_processor, query_engine
    schema_discovery = SchemaDiscovery()
    document_processor = DocumentProcessor()
    query_engine = QueryEngine()
    logger.info("Application startup complete")
    yield
    # Shutdown
    logger.info("Application shutdown")

app = FastAPI(
    title="NLP Query Engine for Employee Data",
    description="Dynamic natural language query system for employee databases",
    version="1.0.0",
    lifespan=lifespan
)

@app.middleware("http")
async def performance_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Record API performance
    if request.url.path.startswith("/api/"):
        await performance_monitor.record_query({
            'query': f"{request.method} {request.url.path}",
            'query_type': 'api',
            'response_time': process_time,
            'success': response.status_code < 400,
            'cache_hit': False
        })
    
    response.headers["X-Process-Time"] = str(process_time)
    return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ingestion.router, prefix="/api", tags=["ingestion"])
app.include_router(query.router, prefix="/api", tags=["query"])
app.include_router(schema.router, prefix="/api", tags=["schema"])

@app.get("/")
async def root():
    return {"message": "NLP Query Engine API", "status": "running"}

@app.get("/health")
async def health_check():
    health_status = performance_monitor.get_health_status()
    cache_stats = cache_manager.get_stats()
    connection_stats = connection_pool.get_stats()
    
    return {
        "status": health_status["status"],
        "uptime": health_status["uptime"],
        "cache": cache_stats,
        "connections": connection_stats,
        "issues": health_status.get("issues", []),
        "timestamp": time.time()
    }

@app.get("/api/metrics")
async def get_metrics():
    """
    Get comprehensive system metrics
    """
    try:
        query_stats = performance_monitor.get_query_stats(3600)  # Last hour
        system_stats = performance_monitor.get_system_stats()
        cache_stats = cache_manager.get_stats()
        connection_stats = connection_pool.get_stats()
        health_status = performance_monitor.get_health_status()
        
        return {
            "query_performance": query_stats,
            "system_performance": system_stats,
            "cache_performance": cache_stats,
            "connection_pool": connection_stats,
            "health": health_status
        }
    except Exception as e:
        logger.error(f"Metrics endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve metrics")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
