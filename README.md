# MarkDownMaster

**MarkDownMaster** is an AI-powered Knowledge Engineer designed to ingest massive documents (PDF, Word, Excel, PowerPoint, HTML, CSV) and convert them into structured, highly readable, and perfectly formatted Markdown files. 

Powered entirely by local LLMs via Ollama, it ensures absolute data privacy. It also features a high-performance editing interface and a context-aware chat assistant, making it the perfect tool for processing technical manuals, books, or dense documentation.

---

## 🌟 Key Features

- **Intelligent Document Processing**: Automatically extracts text from various documents (PDF, DOCX, PPTX, XLSX, HTML) using Microsoft's MarkItDown and structures it into Markdown.
- **Smart Chunking for Large Files**: Bypasses the strict token limits of LLMs by breaking massive documents into 10,000-character chunks. The LLM processes each chunk sequentially with zero data loss.
- **Real-Time Progress Tracking**: A sleek, animated progress bar powered by a robust backend polling mechanism visually tracks the AI's step-by-step thinking and chunking process.
- **Ollama Health Monitoring**: Dynamically checks the local Ollama node connection. If the AI goes offline, the UI provides immediate visual feedback and failsafes disable AI execution to prevent errors.
- **Automated Noise Filtering**: The AI is strictly prompted to identify and delete document artifacts such as page numbers, headers, footers, trademarks, copyright text, and formality sections.
- **High-Performance Editor**: Built-in **Monaco Editor** (the engine behind VS Code) provides virtualized rendering, syntax highlighting, and lightning-fast search (`Ctrl+F`) for Markdown files exceeding 5MB+.
- **Split-View Preview & Full Screen**: Work completely distraction-free with a full-screen toggle, and render your Markdown in real-time in an elegant, split-pane HTML preview powered by `react-markdown`.
- **Robust File Management**: Instantly rename, download, and delete processed Markdown files directly from the user interface.
- **Context-Aware LLM Chat**: A built-in Document Assistant. Simply highlight any text in the editor and ask a question; the LLM will answer using exclusively your selected text as context.
- **Secure Architecture**: Pre-configured with Nginx to run flawlessly behind Cloudflare Zero Trust tunnels, completely isolating the backend from the public internet.

---

## 🏗️ Project Structure

The project is divided into two heavily containerized components via Docker Compose.

```text
MarkDownMaster/
├── backend/
│   ├── data/                 # Persistent storage for PDFs and Markdown files
│   ├── services/
│   │   ├── llm_engineer.py   # Core logic for chunking, formatting, and chatting with Ollama
│   │   └── document_extractor.py  # Utility for extracting text via MarkItDown
│   ├── Dockerfile            # Python 3.11 build
│   ├── main.py               # FastAPI routing and endpoints
│   └── requirements.txt      # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React component (Two-Pane Layout, Editor, Chat)
│   │   ├── index.css         # Custom premium dark-mode styling
│   │   └── main.jsx          
│   ├── Dockerfile            # Multi-stage Vite build serving static files via Nginx
│   ├── nginx.conf            # Custom Nginx proxy configuration
│   └── package.json          # Frontend dependencies
└── docker-compose.yml        # Orchestrates frontend and backend services (connects to external Ollama node)
```

---

## 🚀 Setup & Installation

### Prerequisites & Hardware Requirements
Docker and Docker Compose (V2) are required to orchestrate the environment.

Running the `llama3` 8B model locally is resource-intensive. Below are the hardware requirements:

**Recommended (GPU - Fastest & Best Experience):**
- **Hardware:** Dedicated Nvidia GPU with 16GB+ VRAM (e.g., Nvidia T4, L4, or A10G) + 16GB RAM.
- **AWS Equivalent:** `g4dn.xlarge` (~$0.52/hr). 
- **Notes:** Processing is virtually instantaneous. You must install the `nvidia-container-toolkit` on the host and uncomment the `deploy: resources:` block in `docker-compose.yml`.

**Minimum (CPU-Only - Slow but Functional):**
- **Hardware:** 8+ modern CPU Cores and 16GB to 32GB RAM.
- **AWS Equivalent:** `c6i.2xlarge` or `m6i.2xlarge` (~$0.34/hr).
- **Notes:** The model will fit into RAM, but processing a chunk might take 30-60 seconds depending on CPU single-thread performance. 

*(Warning: Running this on VMs with 2 CPUs and <8GB of RAM will cause Linux to hit Out-Of-Memory boundaries and crash or freeze indefinitely during inference).*

### 1. Start the Environment
Clone the repository and spin up the containers.
```bash
git clone https://github.com/lperalta1992/markdownmaster.git
cd markdownmaster
docker compose up -d --build
```

### 2. Configure the LLM Model
Ensure that your external Ollama instance at `http://100.100.183.43:11434` is running and has the `llama3` model installed.
You can install it on your external node by running:
```bash
ollama pull llama3
```

### 3. Access the Application
The application runs locally on **port 8080**.
```text
http://localhost:8080
```
If you are running this behind a **Cloudflare Tunnel**, simply map your Public Hostname to `HTTP` and `markdownmaster-frontend-1:8080`.

---

## 🧩 Core Functions & Architecture

### Backend Endpoints (`backend/main.py`)
- `GET /api/health/ollama`: Actively probes the configured Ollama host to determine its operational status.
- `POST /api/upload`: Handles document uploads, extracts text, calls the LLM engineer for chunking/structuring (if AI tuning is enabled), and saves the final `.md` file.
- `GET /api/documents/{file_id}`: Retrieves the content of a structured Markdown file for the frontend editor.
- `PUT /api/documents/{file_id}`: Overwrites the existing document with manual edits made in the Monaco editor.
- `PUT /api/documents/{file_id}/rename`: Renames a document safely in the filesystem.
- `DELETE /api/documents/{file_id}`: Deletes a document.
- `POST /api/documents/{file_id}/chat`: Accepts a user question and highlighted context, passing it to the LLM for an answer.

### LLM Engineer (`backend/services/llm_engineer.py`)
- `check_ollama_health()`: Performs a quick connection check to ensure the LLM node is reachable.
- `process_text_with_llm(raw_text)`: Slices text into 10,000-character chunks. Prompts `llama3` to discard noise, format as Markdown, and stitches the responses together.
- `chat_with_llm(question, context)`: Sends a focused prompt to the LLM to answer the user's question strictly based on the provided highlighted text.

### Frontend (`frontend/src/App.jsx`)
- **Interactive File List**: Inline utilities to manage your generated documents (download, rename, delete).
- **Advanced Editor Workspace**: Features a flexible layout supporting Full-Screen mode, Split-View live rendering of Markdown to HTML, and a sliding glassmorphism Chat Drawer.
- **Chat Context Extraction**: Captures the highlighted selection from the Monaco Editor reference and appends it as context to the API request for the Document Assistant.

---

## 📦 Dependencies

**Backend:**
- `fastapi` & `uvicorn` (High-performance API framework)
- `markitdown` (Microsoft's robust document extraction library)
- `requests` (Communication with the Ollama container)
- `python-multipart` (Handling file uploads)

**Frontend:**
- `react` & `vite` (Core framework and bundler)
- `@monaco-editor/react` (High-performance text editor engine)
- `react-markdown` & `remark-gfm` (Live Markdown to HTML rendering)
- `lucide-react` (Modern SVG icon library)

**Infrastructure:**
- `nginx:alpine` (Reverse proxy, rate limiting, and static file serving)
- `ollama/ollama` (Local LLM runner for absolute privacy)
