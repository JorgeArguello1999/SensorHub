FROM python:3.13-slim-bookworm

# Install Redis server (system-level) and cleanup apt lists to keep image small
RUN apt-get update && apt-get install -y --no-install-recommends redis-server \
    && rm -rf /var/lib/apt/lists/*

# Copy uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Configure environment
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

# Install dependencies
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# Copy code
COPY . .

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Redis config defaults (can be overridden at runtime)
ENV REDIS_HOST=localhost
ENV REDIS_PORT=6379
ENV REDIS_DB=0
ENV RUN_TESTS=0
ENV START_SIMULATOR=0

# Expose web + redis ports
EXPOSE 5000 6379

# Entrypoint starts Redis, optionally runs tests, then launches gunicorn
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "8", "wsgi:application"]