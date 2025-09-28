#!/usr/bin/env python3
"""
Script to seed test data for different database schema variations
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from services.schema_discovery import SchemaDiscovery
import sqlalchemy as sa
from sqlalchemy import create_engine, text

async def create_test_databases():
    """
    Create test databases with different schema patterns
    """
    
    # Database connection strings for different test scenarios
    test_databases = {
        'standard': 'postgresql://user:password@localhost:5432/employee_db_standard',
        'alternative': 'postgresql://user:password@localhost:5432/employee_db_alt',
        'variation3': 'postgresql://user:password@localhost:5432/employee_db_var3'
    }
    
    # SQL files for each variation
    sql_files = {
        'standard': 'create_sample_database.sql',
        'alternative': 'create_alternative_schema.sql',
        'variation3': 'create_variation3_schema.sql'
    }
    
    for db_name, connection_string in test_databases.items():
        try:
            print(f"Setting up {db_name} database...")
            
            # Create engine
            engine = create_engine(connection_string)
            
            # Read and execute SQL file
            sql_file = Path(__file__).parent / sql_files.get(db_name, 'create_sample_database.sql')
            
            if sql_file.exists():
                with open(sql_file, 'r') as f:
                    sql_content = f.read()
                
                # Split by semicolon and execute each statement
                statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
                
                with engine.connect() as conn:
                    for statement in statements:
                        if statement:
                            conn.execute(text(statement))
                    conn.commit()
                
                print(f"✓ {db_name} database setup complete")
                
                # Test schema discovery
                schema_discovery = SchemaDiscovery()
                schema_info = await schema_discovery.analyze_database(connection_string)
                
                print(f"  - Discovered {len(schema_info['tables'])} tables")
                print(f"  - Found {len(schema_info['relationships'])} relationships")
                print(f"  - Total rows: {schema_info['statistics']['total_rows']}")
                
            else:
                print(f"⚠ SQL file not found: {sql_file}")
                
        except Exception as e:
            print(f"✗ Failed to setup {db_name} database: {str(e)}")

async def test_query_variations():
    """
    Test various query patterns against different schemas
    """
    from services.query_engine import QueryEngine
    
    test_queries = [
        "How many employees do we have?",
        "Average salary by department",
        "List employees hired this year",
        "Top 5 highest paid employees",
        "Employees with Python skills",
        "Show me performance reviews",
        "Which departments have the most staff?"
    ]
    
    query_engine = QueryEngine()
    
    print("\n" + "="*50)
    print("TESTING QUERY VARIATIONS")
    print("="*50)
    
    for query in test_queries:
        print(f"\nQuery: {query}")
        print("-" * 40)
        
        try:
            # Test query classification
            query_type = query_engine._classify_query(query)
            print(f"Classified as: {query_type}")
            
            # Test natural language mapping (using first test database)
            connection_string = 'postgresql://user:password@localhost:5432/employee_db_standard'
            schema_discovery = SchemaDiscovery()
            schema = await schema_discovery.analyze_database(connection_string)
            
            mapping = schema_discovery.map_natural_language_to_schema(query, schema)
            print(f"Mapped tables: {[t['actual_name'] for t in mapping.get('tables', [])]}")
            print(f"Operations: {mapping.get('operations', [])}")
            
        except Exception as e:
            print(f"Error testing query: {str(e)}")

if __name__ == "__main__":
    print("Setting up test databases and data...")
    asyncio.run(create_test_databases())
    asyncio.run(test_query_variations())
