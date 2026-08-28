import asyncio
import functools
import inspect
import traceback

import decky


async def run_sync(func, *args, executor=None, **kwargs):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        executor,
        functools.partial(func, *args, **kwargs),
    )


def log_exceptions(func):
    """Decorator to log all exceptions from plugin methods"""
    async def async_wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception:
            error_trace = traceback.format_exc()
            decky.logger.error(f"Error in {func.__name__}:\n{error_trace}")
            raise

    def sync_wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception:
            error_trace = traceback.format_exc()
            decky.logger.error(f"Error in {func.__name__}:\n{error_trace}")
            raise

    if inspect.iscoroutinefunction(func):
        return async_wrapper
    return sync_wrapper
