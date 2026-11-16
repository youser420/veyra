FROM python:3.11-slim

WORKDIR /app

# System deps kept minimal; slim image already has what we need.
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Install Python deps first for better layer caching.
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application source.
COPY . .

# Render injects a dynamic $PORT; default to 8000 for local `docker run`.
# APP_MODULE lets the same image run the test agent (scripts.mock_agent:app).
# Shell form is required so the variables are expanded at runtime.
EXPOSE 8000
CMD uvicorn ${APP_MODULE:-main:app} --host 0.0.0.0 --port ${PORT:-8000}
