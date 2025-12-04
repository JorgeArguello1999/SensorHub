FROM python:3.11-slim

WORKDIR /app

# Instalar uv
RUN pip install uv

# Copiar archivos de proyecto
COPY pyproject.toml .
COPY uv.lock .
COPY main.py .
COPY validate_config.py .
COPY validation.json .

# Instalar dependencias directamente del pyproject.toml
RUN uv pip install --system --no-build-isolation -r pyproject.toml

# Ejecutar validación antes de la app (con output sin buffer)# Ejecutar validación antes de la app (con output sin buffer)
CMD ["sh", "-c", "python -u validate_config.py && python -u main.py"]
