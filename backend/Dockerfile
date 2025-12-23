FROM node:20-slim

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

# If the build context is the backend folder, these paths work; if context is repo root, adjust build command to set context to backend/.
COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start"]
