# MarkDownMaster

**MarkDownMaster** is an AI-powered Knowledge Engineer designed to ingest massive PDF documents and convert them into structured, highly readable, and perfectly formatted Markdown files. 

Powered entirely by local LLMs via Ollama, it ensures absolute data privacy. It also features a high-performance editing interface and a context-aware chat assistant, making it the perfect tool for processing technical manuals, books, or dense documentation.

---

## 🌟 Key Features

- **Intelligent PDF Processing**: Automatically extracts text from PDFs and structures it into Markdown.
- **Smart Chunking for Large Files**: Bypasses the strict token limits of LLMs by breaking massive PDFs into 10,000-character chunks. The LLM processes each chunk sequentially with zero data loss.
- **Real-Time Progress Tracking**: A sleek, animated progress bar powered by a robust backend polling mechanism visually tracks the AI's step-by-step thinking and chunking process.
- **Automated Noise Filtering**: The AI is strictly prompted to identify and delete PDF artifacts such as page numbers, headers, footers, trademarks, copyright text, and formality sections.
- **High-Performance Editor**: Built-in **Monaco Editor** (the engine behind VS Code) provides virtualized rendering, syntax highlighting, and lightning-fast search (`Ctrl+F`) for Markdown files exceeding 5MB+.
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
│   │   └── pdf_extractor.py  # Utility for extracting raw text via pdfplumber
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
└── docker-compose.yml        # Orchestrates frontend, backend, and ollama services
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

### 2. Download the LLM Model
Because the `ollama` container starts empty, you must download the `llama3` model before uploading your first PDF. Run this command on your host machine:
```bash
docker compose exec ollama ollama pull llama3
```
*(This will download approximately ~4.7GB of model weights).*

### 3. Access the Application
The application runs locally on **port 8080**.
```text
http://localhost:8080
```
If you are running this behind a **Cloudflare Tunnel**, simply map your Public Hostname to `HTTP` and `markdownmaster-frontend-1:8080`.

---

## 🧩 Core Functions & Architecture

### Backend Endpoints (`backend/main.py`)
- `POST /api/upload`: Handles PDF uploads, extracts text, calls the LLM engineer for chunking/structuring, and saves the final `.md` file.
- `GET /api/documents/{file_id}`: Retrieves the content of a structured Markdown file for the frontend editor.
- `PUT /api/documents/{file_id}`: Overwrites the existing document with manual edits made in the Monaco editor.
- `POST /api/documents/{file_id}/chat`: Accepts a user question and highlighted context, passing it to the LLM for an answer.

### LLM Engineer (`backend/services/llm_engineer.py`)
- `process_text_with_llm(raw_text)`: Slices text into 10,000-character chunks. Prompts `llama3` to discard noise, format as Markdown, and stitches the responses together.
- `chat_with_llm(question, context)`: Sends a focused prompt to the LLM to answer the user's question strictly based on the provided highlighted text.

### Frontend (`frontend/src/App.jsx`)
- **Two-Pane Layout**: Conditionally renders an upload drag-and-drop zone or the advanced editor layout.
- **Monaco Editor Integration**: Manages the state of the active document, handling high-performance rendering for massive files.
- **Chat State Management**: Captures the highlighted selection from the Monaco Editor reference and appends it as context to the API request for the Document Assistant.

---

## 📦 Dependencies

**Backend:**
- `fastapi` & `uvicorn` (High-performance API framework)
- `pdfplumber` (Robust PDF text extraction)
- `requests` (Communication with the Ollama container)
- `python-multipart` (Handling file uploads)

**Frontend:**
- `react` & `vite` (Core framework and bundler)
- `@monaco-editor/react` (High-performance text editor engine)
- `lucide-react` (Modern SVG icon library)

**Infrastructure:**
- `nginx:alpine` (Reverse proxy, rate limiting, and static file serving)
- `ollama/ollama` (Local LLM runner for absolute privacy)
