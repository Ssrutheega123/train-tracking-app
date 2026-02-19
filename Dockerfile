FROM python:3.11-slim

# Install uv
RUN pip install uv

WORKDIR /app

COPY pyproject.toml uv.lock ./

# Install dependencies using uv
RUN uv sync --frozen --no-dev

# Copy app code
COPY TrainTrack/ .

EXPOSE 8000
CMD ["uv","run","uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
