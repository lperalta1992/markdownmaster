import fitz  # PyMuPDF
import os

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extracts text from a given PDF file using PyMuPDF.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found at {pdf_path}")
        
    text_content = ""
    try:
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text_content += page.get_text() + "\n"
        doc.close()
    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")
        
    return text_content
