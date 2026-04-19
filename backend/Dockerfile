# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
# gcc, g++, and libpq-dev are needed for building Python packages like psycopg2, etc.
# libsndfile1 and ffmpeg are critical for AI audio libraries (soundfile, vieneu, torchaudio)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# Using --extra-index-url for PyTorch CPU to avoid downloading massive 2.5GB+ CUDA binaries into the Docker image
RUN pip install --no-cache-dir torch==2.11.0 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application code
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run the application
# We use the array form of CMD to ensure signal handling works correctly
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
