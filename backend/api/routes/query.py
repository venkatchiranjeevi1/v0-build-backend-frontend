from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
import time
import hashlib
import json

from services.query_engine import QueryEngine
from models.schemas import QueryRequest, QueryResponse, QueryHistoryResponse
from services.cache_manager import cache_manager
from services.performance_monitor import performance_monitor

router = APIRouter()

# In-memory cache for demo (use Redis in production)
query_cache = {}
query_history = []

@router.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """
    Process natural language query and return results
    """
    start_time = time.time()
    
    try:
        # Generate cache key
        cache_key = cache_manager.generate_key(
            request.query,
            request.connection_id,
            request.limit
        )
        
        # Check cache first
        cache_hit = False
        cached_result = await cache_manager.get(cache_key)
        
        if cached_result:
            cache_hit = True
            result = cached_result
        else:
            # Process query
            query_engine = QueryEngine()
            result = await query_engine.process_query(
                request.query,
                request.connection_id,
                request.limit
            )
            
            # Cache result for 5 minutes
            await cache_manager.set(cache_key, result, ttl=300)
        
        # Calculate response time
        response_time = time.time() - start_time
        
        await performance_monitor.record_query({
            'query': request.query,
            'query_type': result.get("query_type", "unknown"),
            'response_time': response_time,
            'cache_hit': cache_hit,
            'result_count': len(result.get("results", [])),
            'success': True
        })
        
        # Add to history
        query_history.append({
            "query": request.query,
            "timestamp": time.time(),
            "response_time": response_time,
            "cache_hit": cache_hit,
            "result_count": len(result.get("results", []))
        })
        
        return QueryResponse(
            success=True,
            query=request.query,
            query_type=result.get("query_type", "unknown"),
            results=result.get("results", []),
            sources=result.get("sources", []),
            sql_query=result.get("sql_query"),
            response_time=response_time,
            cache_hit=cache_hit,
            total_results=result.get("total_results", 0)
        )
        
    except Exception as e:
        response_time = time.time() - start_time
        
        await performance_monitor.record_query({
            'query': request.query,
            'query_type': 'unknown',
            'response_time': response_time,
            'cache_hit': False,
            'result_count': 0,
            'success': False,
            'error': str(e)
        })
        
        raise HTTPException(
            status_code=400,
            detail={
                "error": str(e),
                "response_time": response_time
            }
        )

@router.get("/query/history", response_model=QueryHistoryResponse)
async def get_query_history(limit: int = Query(10, ge=1, le=100)):
    """
    Get recent query history for caching demonstration
    """
    recent_queries = query_history[-limit:] if query_history else []
    
    cache_stats = cache_manager.get_stats()
    
    return QueryHistoryResponse(
        queries=recent_queries,
        total_queries=len(query_history),
        cache_stats=cache_stats
    )
