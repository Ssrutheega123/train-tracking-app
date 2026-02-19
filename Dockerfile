FROM python:3.11-slim

RUN pip install uv

WORKDIR /app

# Copy entire TrainTrack folder first
COPY TrainTrack/ .

# Now pyproject.toml and uv.lock are in /app
RUN uv sync --frozen --no-dev

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
