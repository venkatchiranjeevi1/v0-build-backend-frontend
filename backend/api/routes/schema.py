from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from models.schemas import SchemaResponse

router = APIRouter()

# External reference to connected databases (from ingestion.py)
from api.routes.ingestion import connected_databases

@router.get("/schema", response_model=SchemaResponse)
async def get_schema(connection_id: str = None):
    """
    Get current discovered schema for visualization
    """
    try:
        if connection_id and connection_id in connected_databases:
            schema_info = connected_databases[connection_id]["schema"]
        elif connected_databases:
            # Return the most recent connection if no specific ID provided
            latest_connection = max(
                connected_databases.values(),
                key=lambda x: x["connected_at"]
            )
            schema_info = latest_connection["schema"]
        else:
            raise HTTPException(status_code=404, detail="No database connections found")
        
        return SchemaResponse(
            success=True,
            schema=schema_info,
            connection_id=connection_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Schema retrieval failed: {str(e)}")
