import asyncio
import time
import hashlib
import json
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class CacheManager:
    """
    Production-ready caching system with TTL, LRU eviction, and performance monitoring
    """
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache = {}
        self.access_times = {}
        self.hit_count = 0
        self.miss_count = 0
        self.eviction_count = 0
        
        # Start cleanup task
        asyncio.create_task(self._cleanup_expired())

    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache with TTL check
        """
        try:
            if key in self.cache:
                entry = self.cache[key]
                
                # Check TTL
                if time.time() - entry['timestamp'] < entry['ttl']:
                    # Update access time for LRU
                    self.access_times[key] = time.time()
                    self.hit_count += 1
                    return entry['value']
                else:
                    # Expired, remove from cache
                    del self.cache[key]
                    if key in self.access_times:
                        del self.access_times[key]
            
            self.miss_count += 1
            return None
            
        except Exception as e:
            logger.error(f"Cache get error: {str(e)}")
            self.miss_count += 1
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in cache with optional TTL
        """
        try:
            if ttl is None:
                ttl = self.default_ttl
            
            # Check if we need to evict
            if len(self.cache) >= self.max_size and key not in self.cache:
                await self._evict_lru()
            
            self.cache[key] = {
                'value': value,
                'timestamp': time.time(),
                'ttl': ttl
            }
            self.access_times[key] = time.time()
            
            return True
            
        except Exception as e:
            logger.error(f"Cache set error: {str(e)}")
            return False

    async def delete(self, key: str) -> bool:
        """
        Delete key from cache
        """
        try:
            if key in self.cache:
                del self.cache[key]
            if key in self.access_times:
                del self.access_times[key]
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {str(e)}")
            return False

    async def clear(self) -> bool:
        """
        Clear all cache entries
        """
        try:
            self.cache.clear()
            self.access_times.clear()
            return True
        except Exception as e:
            logger.error(f"Cache clear error: {str(e)}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache performance statistics
        """
        total_requests = self.hit_count + self.miss_count
        hit_rate = self.hit_count / total_requests if total_requests > 0 else 0
        
        return {
            'hit_count': self.hit_count,
            'miss_count': self.miss_count,
            'hit_rate': hit_rate,
            'cache_size': len(self.cache),
            'max_size': self.max_size,
            'eviction_count': self.eviction_count
        }

    async def _evict_lru(self):
        """
        Evict least recently used item
        """
        if not self.access_times:
            return
        
        # Find LRU key
        lru_key = min(self.access_times.keys(), key=lambda k: self.access_times[k])
        
        # Remove from cache
        if lru_key in self.cache:
            del self.cache[lru_key]
        del self.access_times[lru_key]
        
        self.eviction_count += 1
        logger.debug(f"Evicted LRU key: {lru_key}")

    async def _cleanup_expired(self):
        """
        Background task to clean up expired entries
        """
        while True:
            try:
                current_time = time.time()
                expired_keys = []
                
                for key, entry in self.cache.items():
                    if current_time - entry['timestamp'] >= entry['ttl']:
                        expired_keys.append(key)
                
                for key in expired_keys:
                    await self.delete(key)
                
                if expired_keys:
                    logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
                
                # Sleep for 60 seconds before next cleanup
                await asyncio.sleep(60)
                
            except Exception as e:
                logger.error(f"Cache cleanup error: {str(e)}")
                await asyncio.sleep(60)

    @staticmethod
    def generate_key(*args, **kwargs) -> str:
        """
        Generate cache key from arguments
        """
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items())
        }
        key_string = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.md5(key_string.encode()).hexdigest()


class ConnectionPool:
    """
    Database connection pool for better performance
    """
    
    def __init__(self, max_connections: int = 10):
        self.max_connections = max_connections
        self.connections = {}
        self.connection_counts = {}
        self.last_used = {}

    async def get_connection(self, connection_string: str):
        """
        Get database connection from pool
        """
        try:
            if connection_string in self.connections:
                # Update last used time
                self.last_used[connection_string] = time.time()
                self.connection_counts[connection_string] = self.connection_counts.get(connection_string, 0) + 1
                return self.connections[connection_string]
            
            # Create new connection if pool not full
            if len(self.connections) < self.max_connections:
                import sqlalchemy as sa
                engine = sa.create_engine(connection_string, pool_size=5, max_overflow=10)
                
                # Test connection
                with engine.connect() as conn:
                    conn.execute(sa.text("SELECT 1"))
                
                self.connections[connection_string] = engine
                self.connection_counts[connection_string] = 1
                self.last_used[connection_string] = time.time()
                
                logger.info(f"Created new database connection: {connection_string[:50]}...")
                return engine
            
            # Pool is full, return least recently used
            lru_key = min(self.last_used.keys(), key=lambda k: self.last_used[k])
            self.last_used[lru_key] = time.time()
            self.connection_counts[lru_key] = self.connection_counts.get(lru_key, 0) + 1
            
            return self.connections[lru_key]
            
        except Exception as e:
            logger.error(f"Connection pool error: {str(e)}")
            raise

    def get_stats(self) -> Dict[str, Any]:
        """
        Get connection pool statistics
        """
        return {
            'active_connections': len(self.connections),
            'max_connections': self.max_connections,
            'connection_usage': dict(self.connection_counts),
            'total_requests': sum(self.connection_counts.values())
        }


# Global instances
cache_manager = CacheManager()
connection_pool = ConnectionPool()
