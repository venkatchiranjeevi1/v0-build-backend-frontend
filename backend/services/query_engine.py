import asyncio
import re
import logging
from typing import Dict, List, Any, Optional, Tuple
import sqlalchemy as sa
from sqlalchemy import create_engine, text
import json
from datetime import datetime

from services.schema_discovery import SchemaDiscovery
from services.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)

class QueryEngine:
    """
    Production-ready pipeline for processing natural language queries
    """
    
    def __init__(self):
        self.schema_discovery = SchemaDiscovery()
        self.document_processor = DocumentProcessor()
        self.query_cache = {}
        
        # Query classification patterns
        self.sql_patterns = [
            r'\b(count|sum|average|avg|max|min|total)\b',
            r'\b(employees?|staff|personnel)\b',
            r'\b(department|salary|pay|wage)\b',
            r'\b(hired|joined|started)\b',
            r'\bhow many\b',
            r'\bshow me\b.*\b(from|in|with)\b'
        ]
        
        self.document_patterns = [
            r'\b(resume|cv|document|file)\b',
            r'\b(skills?|experience|education)\b',
            r'\b(review|evaluation|performance)\b',
            r'\bfind.*\b(mention|contain|about)\b'
        ]

    async def process_query(self, user_query: str, connection_id: Optional[str] = None, limit: int = 100) -> Dict[str, Any]:
        """
        Process natural language query with classification and optimization
        """
        try:
            # Classify query type
            query_type = self._classify_query(user_query)
            
            result = {
                'query_type': query_type,
                'results': [],
                'sources': [],
                'sql_query': None,
                'total_results': 0
            }
            
            if query_type == 'sql':
                result = await self._process_sql_query(user_query, connection_id, limit)
            elif query_type == 'document':
                result = await self._process_document_query(user_query, limit)
            elif query_type == 'hybrid':
                sql_result = await self._process_sql_query(user_query, connection_id, limit // 2)
                doc_result = await self._process_document_query(user_query, limit // 2)
                
                result = {
                    'query_type': 'hybrid',
                    'results': sql_result['results'] + doc_result['results'],
                    'sources': sql_result['sources'] + doc_result['sources'],
                    'sql_query': sql_result.get('sql_query'),
                    'total_results': sql_result['total_results'] + doc_result['total_results']
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Query processing failed: {str(e)}")
            raise Exception(f"Query processing failed: {str(e)}")

    def _classify_query(self, query: str) -> str:
        """
        Classify query as SQL, document search, or hybrid
        """
        query_lower = query.lower()
        
        sql_score = sum(1 for pattern in self.sql_patterns if re.search(pattern, query_lower))
        doc_score = sum(1 for pattern in self.document_patterns if re.search(pattern, query_lower))
        
        if sql_score > 0 and doc_score > 0:
            return 'hybrid'
        elif sql_score > doc_score:
            return 'sql'
        elif doc_score > 0:
            return 'document'
        else:
            # Default to SQL for structured queries
            return 'sql'

    async def _process_sql_query(self, query: str, connection_id: Optional[str], limit: int) -> Dict[str, Any]:
        """
        Process queries that require database access
        """
        try:
            # Get schema information
            from api.routes.ingestion import connected_databases
            
            if not connection_id or connection_id not in connected_databases:
                if not connected_databases:
                    raise Exception("No database connection available")
                # Use the most recent connection
                connection_id = max(connected_databases.keys(), 
                                  key=lambda k: connected_databases[k]['connected_at'])
            
            db_info = connected_databases[connection_id]
            schema = db_info['schema']
            
            # Map natural language to schema
            mapping = self.schema_discovery.map_natural_language_to_schema(query, schema)
            
            # Generate SQL query
            sql_query = self._generate_sql_query(query, mapping, schema, limit)
            
            if not sql_query:
                return {
                    'query_type': 'sql',
                    'results': [],
                    'sources': [{'type': 'error', 'message': 'Could not generate SQL query'}],
                    'sql_query': None,
                    'total_results': 0
                }
            
            # Execute query
            engine = sa.create_engine(db_info['connection_string'])
            with engine.connect() as conn:
                result = conn.execute(text(sql_query))
                columns = result.keys()
                rows = result.fetchall()
                
                results = [
                    {col: self._serialize_value(row[i]) for i, col in enumerate(columns)}
                    for row in rows
                ]
            
            return {
                'query_type': 'sql',
                'results': results,
                'sources': [{'type': 'database', 'tables': mapping.get('tables', [])}],
                'sql_query': sql_query,
                'total_results': len(results)
            }
            
        except Exception as e:
            logger.error(f"SQL query processing failed: {str(e)}")
            return {
                'query_type': 'sql',
                'results': [],
                'sources': [{'type': 'error', 'message': str(e)}],
                'sql_query': None,
                'total_results': 0
            }

    async def _process_document_query(self, query: str, limit: int) -> Dict[str, Any]:
        """
        Process queries that require document search
        """
        try:
            # Search documents using semantic similarity
            results = await self.document_processor.search_documents(query, limit)
            
            return {
                'query_type': 'document',
                'results': results,
                'sources': [{'type': 'documents', 'count': len(results)}],
                'sql_query': None,
                'total_results': len(results)
            }
            
        except Exception as e:
            logger.error(f"Document query processing failed: {str(e)}")
            return {
                'query_type': 'document',
                'results': [],
                'sources': [{'type': 'error', 'message': str(e)}],
                'sql_query': None,
                'total_results': 0
            }

    def _generate_sql_query(self, query: str, mapping: Dict[str, Any], schema: Dict[str, Any], limit: int) -> Optional[str]:
        """
        Generate SQL query from natural language mapping
        """
        try:
            query_lower = query.lower()
            
            # Determine primary table
            tables = mapping.get('tables', [])
            if not tables:
                # Try to infer table from query
                for table_name, table_info in schema['tables'].items():
                    purpose = schema['inferred_purpose'].get(table_name, '')
                    if purpose in query_lower or table_name.lower() in query_lower:
                        tables.append({'actual_name': table_name, 'purpose': purpose})
                        break
            
            if not tables:
                return None
            
            primary_table = tables[0]['actual_name']
            
            # Build SELECT clause
            operations = mapping.get('operations', [])
            columns = mapping.get('columns', [])
            
            if 'count' in operations:
                select_clause = "SELECT COUNT(*)"
            elif 'average' in operations or 'avg' in operations:
                # Find numeric columns for average
                numeric_cols = self._find_numeric_columns(primary_table, schema)
                if numeric_cols and any('salary' in col.lower() or 'pay' in col.lower() for col in numeric_cols):
                    salary_col = next(col for col in numeric_cols if 'salary' in col.lower() or 'pay' in col.lower())
                    select_clause = f"SELECT AVG({salary_col})"
                else:
                    select_clause = "SELECT COUNT(*)"
            elif 'sum' in operations:
                numeric_cols = self._find_numeric_columns(primary_table, schema)
                if numeric_cols:
                    select_clause = f"SELECT SUM({numeric_cols[0]})"
                else:
                    select_clause = "SELECT COUNT(*)"
            elif 'max' in operations:
                numeric_cols = self._find_numeric_columns(primary_table, schema)
                if numeric_cols and any('salary' in col.lower() for col in numeric_cols):
                    salary_col = next(col for col in numeric_cols if 'salary' in col.lower())
                    select_clause = f"SELECT MAX({salary_col}), *"
                else:
                    select_clause = "SELECT *"
            elif 'min' in operations:
                numeric_cols = self._find_numeric_columns(primary_table, schema)
                if numeric_cols and any('salary' in col.lower() for col in numeric_cols):
                    salary_col = next(col for col in numeric_cols if 'salary' in col.lower())
                    select_clause = f"SELECT MIN({salary_col}), *"
                else:
                    select_clause = "SELECT *"
            else:
                select_clause = "SELECT *"
            
            # Build FROM clause
            from_clause = f"FROM {primary_table}"
            
            # Build WHERE clause
            where_conditions = []
            
            # Extract filters from query
            if 'python' in query_lower:
                # Look for text columns that might contain skills
                text_cols = self._find_text_columns(primary_table, schema)
                if text_cols:
                    where_conditions.append(f"{text_cols[0]} ILIKE '%python%'")
            
            # Extract numeric filters
            salary_match = re.search(r'(\d+)k?', query_lower)
            if salary_match and any('salary' in col.lower() for col in self._find_numeric_columns(primary_table, schema)):
                salary_value = int(salary_match.group(1))
                if 'k' in query_lower or salary_value < 1000:
                    salary_value *= 1000
                
                salary_col = next(col for col in self._find_numeric_columns(primary_table, schema) if 'salary' in col.lower())
                
                if 'over' in query_lower or 'above' in query_lower or '>' in query_lower:
                    where_conditions.append(f"{salary_col} > {salary_value}")
                elif 'under' in query_lower or 'below' in query_lower or '<' in query_lower:
                    where_conditions.append(f"{salary_col} < {salary_value}")
            
            # Extract department filters
            dept_match = re.search(r'\b(engineering|sales|marketing|hr|finance|it)\b', query_lower)
            if dept_match:
                dept_cols = [col for col in self._get_table_columns(primary_table, schema) 
                           if 'dept' in col.lower() or 'department' in col.lower()]
                if dept_cols:
                    where_conditions.append(f"{dept_cols[0]} ILIKE '%{dept_match.group(1)}%'")
            
            # Build complete query
            sql_parts = [select_clause, from_clause]
            
            if where_conditions:
                sql_parts.append(f"WHERE {' AND '.join(where_conditions)}")
            
            # Add GROUP BY for aggregations with departments
            if any(op in operations for op in ['average', 'sum', 'count']) and 'department' in query_lower:
                dept_cols = [col for col in self._get_table_columns(primary_table, schema) 
                           if 'dept' in col.lower() or 'department' in col.lower()]
                if dept_cols:
                    sql_parts.append(f"GROUP BY {dept_cols[0]}")
            
            # Add ORDER BY for top/highest queries
            if 'top' in query_lower or 'highest' in query_lower:
                numeric_cols = self._find_numeric_columns(primary_table, schema)
                if numeric_cols and any('salary' in col.lower() for col in numeric_cols):
                    salary_col = next(col for col in numeric_cols if 'salary' in col.lower())
                    sql_parts.append(f"ORDER BY {salary_col} DESC")
            
            # Add LIMIT
            if 'count' not in operations:
                sql_parts.append(f"LIMIT {limit}")
            
            return " ".join(sql_parts)
            
        except Exception as e:
            logger.error(f"SQL generation failed: {str(e)}")
            return None

    def _find_numeric_columns(self, table_name: str, schema: Dict[str, Any]) -> List[str]:
        """
        Find numeric columns in a table
        """
        table_info = schema['tables'].get(table_name, {})
        numeric_types = ['integer', 'bigint', 'decimal', 'numeric', 'float', 'double', 'money']
        
        return [
            col['name'] for col in table_info.get('columns', [])
            if any(num_type in col['type'].lower() for num_type in numeric_types)
        ]

    def _find_text_columns(self, table_name: str, schema: Dict[str, Any]) -> List[str]:
        """
        Find text columns in a table
        """
        table_info = schema['tables'].get(table_name, {})
        text_types = ['varchar', 'text', 'char', 'string']
        
        return [
            col['name'] for col in table_info.get('columns', [])
            if any(text_type in col['type'].lower() for text_type in text_types)
        ]

    def _get_table_columns(self, table_name: str, schema: Dict[str, Any]) -> List[str]:
        """
        Get all column names for a table
        """
        table_info = schema['tables'].get(table_name, {})
        return [col['name'] for col in table_info.get('columns', [])]

    def _serialize_value(self, value: Any) -> Any:
        """
        Serialize database values for JSON response
        """
        if value is None:
            return None
        elif hasattr(value, 'isoformat'):  # datetime objects
            return value.isoformat()
        elif isinstance(value, (int, float, str, bool)):
            return value
        else:
            return str(value)

    def optimize_sql_query(self, sql: str) -> str:
        """
        Optimize generated SQL query for performance
        """
        # Add basic optimizations
        optimized = sql
        
        # Ensure LIMIT is present for large result sets
        if 'LIMIT' not in optimized.upper() and 'COUNT(' not in optimized.upper():
            optimized += ' LIMIT 1000'
        
        # Add hints for common patterns (database-specific)
        if 'ORDER BY' in optimized.upper():
            # Suggest index usage (commented for visibility)
            optimized = f"/* Consider index on ORDER BY column */ {optimized}"
        
        return optimized
