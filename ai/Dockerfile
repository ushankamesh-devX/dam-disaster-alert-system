FROM ghcr.io/astral-sh/uv:0.13.0 AS uv
FROM python:3.12-slim

COPY --from=uv /uv /bin/uv
WORKDIR /service
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_LINK_MODE=copy

COPY pyproject.toml uv.lock README.md ./
RUN uv sync --locked --no-dev --no-install-project
COPY app ./app

RUN useradd --create-home --uid 10001 ddas
USER ddas
EXPOSE 8000
CMD ["/service/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
