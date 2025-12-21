import decky
import traceback
import inspect

def log_exceptions(func):
    """Decorator to log all exceptions from plugin methods"""
    async def async_wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            error_trace = traceback.format_exc()
            decky.logger.error(f"Error in {func.__name__}:\n{error_trace}")
            raise
    
    def sync_wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            error_trace = traceback.format_exc()
            decky.logger.error(f"Error in {func.__name__}:\n{error_trace}")
            raise
    
    if inspect.iscoroutinefunction(func):
        return async_wrapper
    return sync_wrapper
