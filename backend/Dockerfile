FROM python:3.11-slim

WORKDIR /app

# Tizim paketlarini o'rnatish (PDF va kutubxonalar uchun)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Talab qilingan Python paketlarini o'rnatish
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kodlarni nusxalash
COPY . /app/backend/

# Saqlash kataloglarini tayyorlash
RUN mkdir -p /app/storage/uploads /app/storage/evidence /app/storage/reports

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
