FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

CMD ["sh", "-c", "python scripts/create_sqlite_database.py && uvicorn main:app --host 0.0.0.0 --port 8000"]
