# @minproducer/n8n-nodes-ytube-transcript-wlang

**YouTube Transcript Node for n8n** – Fetch subtitles/transcripts from YouTube videos using `yt-dlp`, now with **language selection support**.

## Features

- Extract subtitles from YouTube videos
- Supports both **video URL** and **video ID**
- Option to choose **subtitle language**
- Built for **n8n** using **yt-dlp** (no API key required)

---

## 🔧 Installation

### Docker-based n8n

To use this node in Docker, you need to extend the default `n8n` image to include `Python` and `yt-dlp`.

#### 1. Create a custom Dockerfile:

```Dockerfile
FROM n8nio/n8n

USER root

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Install the community node
RUN cd /usr/local/lib/node_modules/n8n && \
    npm install @minproducer/n8n-nodes-ytube-transcript-wlang

USER node
```

#### 2. Build and run your container:

```bash
docker build -t n8n-with-yt-transcript .
docker-compose up -d  # If using docker-compose
```

---

### Local Installation

1. Install Python and yt-dlp:

```bash
# Ubuntu/Debian
sudo apt-get install python3 python3-pip

# macOS (using Homebrew)
brew install python3

# Then install yt-dlp
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

2. Install the node in your n8n instance:
   - Go to **Settings > Community Nodes**
   - Click **Install a community node**
   - Enter: `@minproducer/n8n-nodes-ytube-transcript-wlang`
   - Click **Install**
   - Restart n8n

---

## 🚀 Usage

1. Add the **YouTube Transcript** node to your workflow
2. Enter the **YouTube video ID or URL**
3. Select desired **subtitle language** (e.g., `en`, `vi`, `ja`, etc.)
4. Set path to `yt-dlp` binary if needed (default is `yt-dlp`)
5. Execute the workflow

---

## 🛠️ Troubleshooting

If you see errors like:
```
Failed to set up yt-dlp: Command failed: ... can't execute 'python3': No such file or directory
```
Ensure `python3` is installed and accessible in your environment. For Docker users, follow the Docker instructions above.

---

## 📄 License

[MIT](LICENSE)

---

## 🔗 Repository

https://github.com/minproducer/n8n-nodes-ytube-transcript-wlang
