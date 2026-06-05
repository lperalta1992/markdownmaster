import os
from markitdown import MarkItDown

def extract_text_from_document(file_path: str) -> str:
    """
    Extracts text/markdown from a given document file using Microsoft's MarkItDown.
    Supports PDF, DOCX, PPTX, XLSX, HTML, CSV, etc.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found at {file_path}")
        
    try:
        md = MarkItDown()
        result = md.convert(file_path)
        return result.text_content
    except Exception as e:
        raise Exception(f"Failed to extract markdown from document: {str(e)}")
