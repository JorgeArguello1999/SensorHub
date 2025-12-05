FROM python:3.12-slim-bookworm

# 1. Copiar uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# 2. Configurar entorno
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy
ENV PATH="/app/.venv/bin:$PATH"

# 3. Instalar dependencias
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# 4. Copiar código
COPY . .

# 5. Exponer puerto
EXPOSE 5000

# 6. COMANDO DE ARRANQUE (GUNICORN)
# --bind 0.0.0.0:5000  -> Hace que el sitio sea visible desde fuera del Docker
# --workers 1          -> OBLIGATORIO: Solo 1 proceso para compartir memoria (colas)
# --threads 8          -> Usamos hilos para manejar concurrencia (usuarios)
# wsgi:application     -> Archivo wsgi.py, variable application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "8", "wsgi:application"]