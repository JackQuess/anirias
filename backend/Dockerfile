FROM node:18-bullseye

# Python 3.11 + tools
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp
RUN pip3 install --no-cache-dir -U yt-dlp

# Ensure python points to 3.11
RUN ln -sf /usr/bin/python3.11 /usr/bin/python

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend .

RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start"]