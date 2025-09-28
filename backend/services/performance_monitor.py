import asyncio
import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import deque
import psutil
import threading

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """
    Monitor system performance and query metrics
    """
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.query_history = deque(maxlen=max_history)
        self.system_metrics = deque(maxlen=100)  # Last 100 system snapshots
        self.start_time = time.time()
        
        # Start monitoring task
        self.monitoring_task = asyncio.create_task(self._monitor_system())

    async def record_query(self, query_data: Dict[str, Any]):
        """
        Record query performance metrics
        """
        try:
            query_record = {
                'timestamp': time.time(),
                'query': query_data.get('query', ''),
                'query_type': query_data.get('query_type', 'unknown'),
                'response_time': query_data.get('response_time', 0),
                'cache_hit': query_data.get('cache_hit', False),
                'result_count': query_data.get('result_count', 0),
                'success': query_data.get('success', True),
                'error': query_data.get('error')
            }
            
            self.query_history.append(query_record)
            
        except Exception as e:
            logger.error(f"Failed to record query metrics: {str(e)}")

    def get_query_stats(self, time_window: int = 3600) -> Dict[str, Any]:
        """
        Get query statistics for the specified time window (seconds)
        """
        try:
            current_time = time.time()
            cutoff_time = current_time - time_window
            
            # Filter queries within time window
            recent_queries = [
                q for q in self.query_history 
                if q['timestamp'] >= cutoff_time
            ]
            
            if not recent_queries:
                return {
                    'total_queries': 0,
                    'avg_response_time': 0,
                    'cache_hit_rate': 0,
                    'success_rate': 0,
                    'queries_per_minute': 0,
                    'query_types': {}
                }
            
            # Calculate metrics
            total_queries = len(recent_queries)
            avg_response_time = sum(q['response_time'] for q in recent_queries) / total_queries
            cache_hits = sum(1 for q in recent_queries if q['cache_hit'])
            cache_hit_rate = cache_hits / total_queries
            successful_queries = sum(1 for q in recent_queries if q['success'])
            success_rate = successful_queries / total_queries
            queries_per_minute = total_queries / (time_window / 60)
            
            # Query type distribution
            query_types = {}
            for query in recent_queries:
                qtype = query['query_type']
                query_types[qtype] = query_types.get(qtype, 0) + 1
            
            return {
                'total_queries': total_queries,
                'avg_response_time': avg_response_time,
                'cache_hit_rate': cache_hit_rate,
                'success_rate': success_rate,
                'queries_per_minute': queries_per_minute,
                'query_types': query_types,
                'time_window': time_window
            }
            
        except Exception as e:
            logger.error(f"Failed to get query stats: {str(e)}")
            return {}

    def get_system_stats(self) -> Dict[str, Any]:
        """
        Get current system performance metrics
        """
        try:
            # CPU and Memory
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Network (if available)
            try:
                network = psutil.net_io_counters()
                network_stats = {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv,
                    'packets_sent': network.packets_sent,
                    'packets_recv': network.packets_recv
                }
            except:
                network_stats = {}
            
            return {
                'timestamp': time.time(),
                'uptime': time.time() - self.start_time,
                'cpu_percent': cpu_percent,
                'memory': {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent,
                    'used': memory.used
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': (disk.used / disk.total) * 100
                },
                'network': network_stats
            }
            
        except Exception as e:
            logger.error(f"Failed to get system stats: {str(e)}")
            return {}

    def get_performance_trends(self, hours: int = 24) -> Dict[str, Any]:
        """
        Get performance trends over time
        """
        try:
            current_time = time.time()
            cutoff_time = current_time - (hours * 3600)
            
            # Filter recent queries
            recent_queries = [
                q for q in self.query_history 
                if q['timestamp'] >= cutoff_time
            ]
            
            # Group by hour
            hourly_stats = {}
            for query in recent_queries:
                hour = int(query['timestamp'] // 3600) * 3600
                
                if hour not in hourly_stats:
                    hourly_stats[hour] = {
                        'queries': 0,
                        'total_response_time': 0,
                        'cache_hits': 0,
                        'errors': 0
                    }
                
                stats = hourly_stats[hour]
                stats['queries'] += 1
                stats['total_response_time'] += query['response_time']
                if query['cache_hit']:
                    stats['cache_hits'] += 1
                if not query['success']:
                    stats['errors'] += 1
            
            # Calculate trends
            trends = []
            for hour, stats in sorted(hourly_stats.items()):
                avg_response_time = stats['total_response_time'] / stats['queries'] if stats['queries'] > 0 else 0
                cache_hit_rate = stats['cache_hits'] / stats['queries'] if stats['queries'] > 0 else 0
                error_rate = stats['errors'] / stats['queries'] if stats['queries'] > 0 else 0
                
                trends.append({
                    'timestamp': hour,
                    'queries': stats['queries'],
                    'avg_response_time': avg_response_time,
                    'cache_hit_rate': cache_hit_rate,
                    'error_rate': error_rate
                })
            
            return {
                'trends': trends,
                'time_range': hours
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance trends: {str(e)}")
            return {'trends': [], 'time_range': hours}

    async def _monitor_system(self):
        """
        Background task to monitor system metrics
        """
        while True:
            try:
                system_stats = self.get_system_stats()
                if system_stats:
                    self.system_metrics.append(system_stats)
                
                # Check for performance issues
                if system_stats.get('cpu_percent', 0) > 80:
                    logger.warning(f"High CPU usage: {system_stats['cpu_percent']}%")
                
                if system_stats.get('memory', {}).get('percent', 0) > 85:
                    logger.warning(f"High memory usage: {system_stats['memory']['percent']}%")
                
                # Sleep for 30 seconds
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"System monitoring error: {str(e)}")
                await asyncio.sleep(30)

    def get_health_status(self) -> Dict[str, Any]:
        """
        Get overall system health status
        """
        try:
            system_stats = self.get_system_stats()
            query_stats = self.get_query_stats(3600)  # Last hour
            
            # Determine health status
            health_issues = []
            
            if system_stats.get('cpu_percent', 0) > 80:
                health_issues.append("High CPU usage")
            
            if system_stats.get('memory', {}).get('percent', 0) > 85:
                health_issues.append("High memory usage")
            
            if query_stats.get('avg_response_time', 0) > 5:
                health_issues.append("Slow query response times")
            
            if query_stats.get('success_rate', 1) < 0.95:
                health_issues.append("High query error rate")
            
            # Overall status
            if not health_issues:
                status = "healthy"
            elif len(health_issues) <= 2:
                status = "warning"
            else:
                status = "critical"
            
            return {
                'status': status,
                'issues': health_issues,
                'uptime': time.time() - self.start_time,
                'last_check': time.time()
            }
            
        except Exception as e:
            logger.error(f"Failed to get health status: {str(e)}")
            return {
                'status': 'unknown',
                'issues': ['Health check failed'],
                'uptime': 0,
                'last_check': time.time()
            }

# Global instance
performance_monitor = PerformanceMonitor()
