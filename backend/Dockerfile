FROM python:3.12-slim

WORKDIR /app

# Install Node.js if you need it (remove if not needed)
# RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Run the app with gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:10000", "run:app"]