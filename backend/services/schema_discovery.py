import asyncio
import re
from typing import Dict, List, Any, Optional, Tuple
import sqlalchemy as sa
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

class SchemaDiscovery:
    """
    Dynamically discover database schema without hard-coding table/column names
    """
    
    def __init__(self):
        self.engine = None
        self.inspector = None
        self.schema_cache = {}
        
        # Common naming patterns for employee-related tables and columns
        self.table_patterns = {
            'employees': ['employee', 'employees', 'emp', 'staff', 'personnel', 'worker', 'team_member'],
            'departments': ['department', 'departments', 'dept', 'division', 'divisions', 'unit'],
            'positions': ['position', 'positions', 'role', 'roles', 'job', 'jobs', 'title'],
            'salaries': ['salary', 'salaries', 'compensation', 'pay', 'wage', 'wages'],
            'documents': ['document', 'documents', 'file', 'files', 'attachment', 'attachments']
        }
        
        self.column_patterns = {
            'id': ['id', '_id', 'pk', 'key'],
            'name': ['name', 'full_name', 'employee_name', 'first_name', 'last_name'],
            'email': ['email', 'email_address', 'mail'],
            'salary': ['salary', 'compensation', 'pay', 'wage', 'annual_salary', 'pay_rate'],
            'department': ['department', 'dept', 'division', 'unit'],
            'position': ['position', 'role', 'title', 'job_title'],
            'hire_date': ['hire_date', 'hired_on', 'start_date', 'join_date', 'employment_date'],
            'manager': ['manager', 'supervisor', 'reports_to', 'manager_id']
        }

    async def analyze_database(self, connection_string: str) -> Dict[str, Any]:
        """
        Connect to database and automatically discover schema
        """
        try:
            # Create engine and test connection
            self.engine = create_engine(connection_string)
            
            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            self.inspector = inspect(self.engine)
            
            # Discover schema
            schema_info = {
                'tables': {},
                'relationships': [],
                'statistics': {},
                'inferred_purpose': {}
            }
            
            # Get all table names
            table_names = self.inspector.get_table_names()
            
            for table_name in table_names:
                table_info = await self._analyze_table(table_name)
                schema_info['tables'][table_name] = table_info
                
                # Infer table purpose
                purpose = self._infer_table_purpose(table_name, table_info['columns'])
                schema_info['inferred_purpose'][table_name] = purpose
            
            # Discover relationships
            schema_info['relationships'] = self._discover_relationships(schema_info['tables'])
            
            # Generate statistics
            schema_info['statistics'] = await self._generate_statistics(schema_info['tables'])
            
            # Create natural language mapping
            schema_info['nl_mapping'] = self._create_nl_mapping(schema_info)
            
            return schema_info
            
        except Exception as e:
            logger.error(f"Schema discovery failed: {str(e)}")
            raise Exception(f"Failed to analyze database: {str(e)}")

    async def _analyze_table(self, table_name: str) -> Dict[str, Any]:
        """
        Analyze individual table structure and sample data
        """
        try:
            # Get column information
            columns = self.inspector.get_columns(table_name)
            
            # Get foreign keys
            foreign_keys = self.inspector.get_foreign_keys(table_name)
            
            # Get indexes
            indexes = self.inspector.get_indexes(table_name)
            
            # Get sample data (first 5 rows)
            sample_data = await self._get_sample_data(table_name, limit=5)
            
            # Get row count
            row_count = await self._get_row_count(table_name)
            
            table_info = {
                'columns': [
                    {
                        'name': col['name'],
                        'type': str(col['type']),
                        'nullable': col['nullable'],
                        'primary_key': col.get('primary_key', False),
                        'inferred_semantic': self._infer_column_semantic(col['name'])
                    }
                    for col in columns
                ],
                'foreign_keys': foreign_keys,
                'indexes': indexes,
                'sample_data': sample_data,
                'row_count': row_count
            }
            
            return table_info
            
        except Exception as e:
            logger.error(f"Failed to analyze table {table_name}: {str(e)}")
            return {
                'columns': [],
                'foreign_keys': [],
                'indexes': [],
                'sample_data': [],
                'row_count': 0,
                'error': str(e)
            }

    async def _get_sample_data(self, table_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get sample data from table
        """
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(f"SELECT * FROM {table_name} LIMIT {limit}"))
                columns = result.keys()
                rows = result.fetchall()
                
                return [
                    {col: self._serialize_value(row[i]) for i, col in enumerate(columns)}
                    for row in rows
                ]
        except Exception as e:
            logger.error(f"Failed to get sample data from {table_name}: {str(e)}")
            return []

    async def _get_row_count(self, table_name: str) -> int:
        """
        Get total row count for table
        """
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                return result.scalar()
        except Exception as e:
            logger.error(f"Failed to get row count for {table_name}: {str(e)}")
            return 0

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

    def _infer_table_purpose(self, table_name: str, columns: List[Dict[str, Any]]) -> str:
        """
        Infer the purpose of a table based on name and columns
        """
        table_lower = table_name.lower()
        column_names = [col['name'].lower() for col in columns]
        
        # Check against known patterns
        for purpose, patterns in self.table_patterns.items():
            if any(pattern in table_lower for pattern in patterns):
                return purpose
        
        # Infer from column patterns
        if any('salary' in col or 'pay' in col or 'wage' in col for col in column_names):
            return 'compensation'
        elif any('document' in col or 'file' in col for col in column_names):
            return 'documents'
        elif any('review' in col or 'performance' in col for col in column_names):
            return 'reviews'
        
        return 'unknown'

    def _infer_column_semantic(self, column_name: str) -> str:
        """
        Infer semantic meaning of column based on name
        """
        col_lower = column_name.lower()
        
        for semantic, patterns in self.column_patterns.items():
            if any(pattern in col_lower for pattern in patterns):
                return semantic
        
        return 'unknown'

    def _discover_relationships(self, tables: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Discover relationships between tables
        """
        relationships = []
        
        for table_name, table_info in tables.items():
            for fk in table_info.get('foreign_keys', []):
                relationships.append({
                    'from_table': table_name,
                    'from_column': fk['constrained_columns'][0] if fk['constrained_columns'] else None,
                    'to_table': fk['referred_table'],
                    'to_column': fk['referred_columns'][0] if fk['referred_columns'] else None,
                    'type': 'foreign_key'
                })
        
        # Infer implicit relationships based on naming patterns
        implicit_relationships = self._infer_implicit_relationships(tables)
        relationships.extend(implicit_relationships)
        
        return relationships

    def _infer_implicit_relationships(self, tables: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Infer relationships that aren't explicitly defined as foreign keys
        """
        relationships = []
        table_names = list(tables.keys())
        
        for table_name in table_names:
            columns = tables[table_name]['columns']
            
            for column in columns:
                col_name = column['name'].lower()
                
                # Look for columns that might reference other tables
                for other_table in table_names:
                    if other_table != table_name:
                        other_table_lower = other_table.lower()
                        
                        # Check if column name suggests reference to other table
                        if (other_table_lower in col_name or 
                            any(pattern in col_name for pattern in ['_id', 'id']) and
                            other_table_lower.rstrip('s') in col_name):
                            
                            relationships.append({
                                'from_table': table_name,
                                'from_column': column['name'],
                                'to_table': other_table,
                                'to_column': 'id',  # Assume primary key is 'id'
                                'type': 'inferred',
                                'confidence': 0.7
                            })
        
        return relationships

    async def _generate_statistics(self, tables: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate database statistics
        """
        total_tables = len(tables)
        total_columns = sum(len(table['columns']) for table in tables.values())
        total_rows = sum(table.get('row_count', 0) for table in tables.values())
        
        return {
            'total_tables': total_tables,
            'total_columns': total_columns,
            'total_rows': total_rows,
            'largest_table': max(tables.items(), key=lambda x: x[1].get('row_count', 0))[0] if tables else None,
            'table_sizes': {name: info.get('row_count', 0) for name, info in tables.items()}
        }

    def _create_nl_mapping(self, schema_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create natural language to schema mapping
        """
        mapping = {
            'table_synonyms': {},
            'column_synonyms': {},
            'common_queries': []
        }
        
        # Create table synonyms
        for table_name, table_info in schema_info['tables'].items():
            purpose = schema_info['inferred_purpose'].get(table_name, 'unknown')
            synonyms = []
            
            if purpose in self.table_patterns:
                synonyms.extend(self.table_patterns[purpose])
            
            mapping['table_synonyms'][table_name] = {
                'purpose': purpose,
                'synonyms': synonyms,
                'natural_names': [table_name.replace('_', ' '), purpose]
            }
        
        # Create column synonyms
        for table_name, table_info in schema_info['tables'].items():
            for column in table_info['columns']:
                semantic = column['inferred_semantic']
                if semantic != 'unknown' and semantic in self.column_patterns:
                    key = f"{table_name}.{column['name']}"
                    mapping['column_synonyms'][key] = {
                        'semantic': semantic,
                        'synonyms': self.column_patterns[semantic],
                        'natural_names': [column['name'].replace('_', ' '), semantic]
                    }
        
        return mapping

    def map_natural_language_to_schema(self, query: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map user's natural language to actual database structure
        """
        query_lower = query.lower()
        mapping = {
            'tables': [],
            'columns': [],
            'operations': [],
            'filters': []
        }
        
        # Map tables
        nl_mapping = schema.get('nl_mapping', {})
        for table_name, table_info in nl_mapping.get('table_synonyms', {}).items():
            if any(synonym in query_lower for synonym in table_info['synonyms']):
                mapping['tables'].append({
                    'actual_name': table_name,
                    'purpose': table_info['purpose'],
                    'confidence': 0.8
                })
        
        # Map columns
        for column_key, column_info in nl_mapping.get('column_synonyms', {}).items():
            if any(synonym in query_lower for synonym in column_info['synonyms']):
                table_name, column_name = column_key.split('.', 1)
                mapping['columns'].append({
                    'table': table_name,
                    'column': column_name,
                    'semantic': column_info['semantic'],
                    'confidence': 0.8
                })
        
        # Detect operations
        if any(word in query_lower for word in ['count', 'how many', 'number of']):
            mapping['operations'].append('count')
        if any(word in query_lower for word in ['average', 'avg', 'mean']):
            mapping['operations'].append('average')
        if any(word in query_lower for word in ['sum', 'total']):
            mapping['operations'].append('sum')
        if any(word in query_lower for word in ['max', 'maximum', 'highest']):
            mapping['operations'].append('max')
        if any(word in query_lower for word in ['min', 'minimum', 'lowest']):
            mapping['operations'].append('min')
        
        return mapping
