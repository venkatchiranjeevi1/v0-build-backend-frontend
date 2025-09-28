#!/usr/bin/env python3
"""
System test script to verify NLP Query Engine functionality
"""

import requests
import json
import time
import sys
from pathlib import Path

BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test if the API is running"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Is it running?")
        return False

def test_database_connection():
    """Test database connection"""
    try:
        # Connect to SQLite database
        connection_data = {
            "database_type": "sqlite",
            "connection_string": "sqlite:///app/data/employee_database.db"
        }
        
        response = requests.post(f"{BASE_URL}/api/schema/connect", json=connection_data)
        
        if response.status_code == 200:
            result = response.json()
            connection_id = result.get("connection_id")
            print(f"✅ Database connection successful: {connection_id}")
            return connection_id
        else:
            print(f"❌ Database connection failed: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"❌ Database connection error: {str(e)}")
        return None

def test_schema_discovery(connection_id):
    """Test schema discovery"""
    try:
        response = requests.get(f"{BASE_URL}/api/schema/{connection_id}")
        
        if response.status_code == 200:
            schema = response.json()
            tables = schema.get("tables", {})
            print(f"✅ Schema discovery successful: {len(tables)} tables found")
            print(f"   Tables: {list(tables.keys())}")
            return True
        else:
            print(f"❌ Schema discovery failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Schema discovery error: {str(e)}")
        return False

def test_natural_language_queries(connection_id):
    """Test natural language query processing"""
    test_queries = [
        "How many employees do we have?",
        "What is the average salary?",
        "Show me all employees in Engineering",
        "Who are the managers?",
        "Find employees hired in 2022"
    ]
    
    successful_queries = 0
    
    for query in test_queries:
        try:
            query_data = {
                "query": query,
                "connection_id": connection_id
            }
            
            response = requests.post(f"{BASE_URL}/api/query/natural", json=query_data)
            
            if response.status_code == 200:
                result = response.json()
                rows = len(result.get("data", []))
                print(f"✅ Query successful: '{query}' -> {rows} results")
                successful_queries += 1
            else:
                print(f"❌ Query failed: '{query}' -> {response.status_code}")
                
        except Exception as e:
            print(f"❌ Query error: '{query}' -> {str(e)}")
    
    print(f"📊 Query success rate: {successful_queries}/{len(test_queries)}")
    return successful_queries > 0

def test_metrics_endpoint():
    """Test metrics endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/metrics")
        
        if response.status_code == 200:
            metrics = response.json()
            print("✅ Metrics endpoint working")
            print(f"   System health: {metrics.get('health', {}).get('status', 'unknown')}")
            return True
        else:
            print(f"❌ Metrics endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Metrics endpoint error: {str(e)}")
        return False

def main():
    """Run all system tests"""
    print("🧪 Running NLP Query Engine System Tests")
    print("=" * 50)
    
    # Test 1: Health Check
    if not test_health_check():
        print("❌ System tests failed - API not responding")
        sys.exit(1)
    
    # Test 2: Database Connection
    connection_id = test_database_connection()
    if not connection_id:
        print("❌ System tests failed - Database connection failed")
        sys.exit(1)
    
    # Test 3: Schema Discovery
    if not test_schema_discovery(connection_id):
        print("❌ System tests failed - Schema discovery failed")
        sys.exit(1)
    
    # Test 4: Natural Language Queries
    if not test_natural_language_queries(connection_id):
        print("❌ System tests failed - Query processing failed")
        sys.exit(1)
    
    # Test 5: Metrics
    if not test_metrics_endpoint():
        print("❌ System tests failed - Metrics endpoint failed")
        sys.exit(1)
    
    print("=" * 50)
    print("🎉 All system tests passed!")
    print("✅ NLP Query Engine is working correctly")

if __name__ == "__main__":
    main()
