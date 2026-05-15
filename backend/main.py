import os
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from typing import List
import uuid

from services.pdf_extractor import extract_text_from_pdf
from services.llm_engineer import process_text_with_llm, chat_with_llm

app = FastAPI(title="MarkDownMaster API")

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

# Global store for task progress
progress_store = {}

class MergeRequest(BaseModel):
    file_ids: List[str]
    merged_filename: str = "merged_output.md"

class SaveRequest(BaseModel):
    content: str

class ChatRequest(BaseModel):
    question: str
    context: str = ""

@app.get("/api/")
def read_root():
    return {"message": "MarkDownMaster API is running"}

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...), task_id: str = Form(None)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    file_id = str(uuid.uuid4())
    pdf_path = os.path.join(DATA_DIR, f"{file_id}.pdf")
    
    if task_id:
        progress_store[task_id] = {"message": "Saving uploaded file...", "percent": 5}
        
    with open(pdf_path, "wb") as buffer:
        buffer.write(await file.read())
        
    try:
        if task_id:
            progress_store[task_id] = {"message": "Extracting raw text from PDF...", "percent": 15}
            
        # Extract raw text
        raw_text = extract_text_from_pdf(pdf_path)
        
        def update_progress(msg, pct):
            if task_id:
                progress_store[task_id] = {"message": msg, "percent": pct}
        
        # Process with LLM
        markdown_content = process_text_with_llm(raw_text, progress_callback=update_progress)
        
        md_path = os.path.join(DATA_DIR, f"{file_id}.md")
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(markdown_content)
            
        if task_id:
            progress_store[task_id] = {"message": "Finished! Saving document...", "percent": 100}
            
        return {
            "message": "File processed successfully",
            "file_id": file_id,
            "original_filename": file.filename,
            "status": "completed"
        }
    except Exception as e:
        if task_id:
            progress_store[task_id] = {"message": f"Error: {str(e)}", "percent": 0, "error": True}
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/progress/{task_id}")
def get_progress(task_id: str):
    return progress_store.get(task_id, {"message": "Initializing...", "percent": 0})

@app.get("/api/documents")
def list_documents():
    files = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".md"):
            files.append({
                "id": filename.replace(".md", ""),
                "filename": filename
            })
    return {"documents": files}

@app.get("/api/documents/{file_id}")
def get_document(file_id: str):
    md_path = os.path.join(DATA_DIR, f"{file_id}.md")
    if not os.path.exists(md_path):
        raise HTTPException(status_code=404, detail="Document not found")
        
    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()
    return {"id": file_id, "content": content}

@app.put("/api/documents/{file_id}")
def update_document(file_id: str, request: SaveRequest):
    md_path = os.path.join(DATA_DIR, f"{file_id}.md")
    if not os.path.exists(md_path):
        raise HTTPException(status_code=404, detail="Document not found")
        
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(request.content)
    return {"message": "Document saved successfully"}

@app.post("/api/documents/{file_id}/chat")
def document_chat(file_id: str, request: ChatRequest):
    md_path = os.path.join(DATA_DIR, f"{file_id}.md")
    if not os.path.exists(md_path):
        raise HTTPException(status_code=404, detail="Document not found")
        
    answer = chat_with_llm(request.question, request.context)
    return {"answer": answer}

@app.post("/api/merge")
def merge_documents(request: MergeRequest):
    if len(request.file_ids) < 2:
        raise HTTPException(status_code=400, detail="At least two files are required for merging")
        
    merged_content = ""
    for file_id in request.file_ids:
        md_path = os.path.join(DATA_DIR, f"{file_id}.md")
        if not os.path.exists(md_path):
            raise HTTPException(status_code=404, detail=f"File {file_id} not found")
            
        with open(md_path, "r", encoding="utf-8") as f:
            merged_content += f.read() + "\n\n---\n\n"
            
    # Optionally, we could pass the merged_content through the LLM again 
    # to generate a unified ToC and ensure flow.
    # For now, we do a simple concatenation with LLM structuring instructions
    # merged_content = generate_unified_markdown_with_llm(merged_content)
            
    merged_id = str(uuid.uuid4())
    merged_path = os.path.join(DATA_DIR, f"{merged_id}.md")
    with open(merged_path, "w", encoding="utf-8") as f:
        f.write(merged_content)
        
    return {
        "message": "Files merged successfully",
        "file_id": merged_id,
        "filename": request.merged_filename
    }
