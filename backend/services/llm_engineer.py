import requests
import json
import os

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_MODEL = "llama3"

def process_text_with_llm(raw_text: str, model: str = DEFAULT_MODEL) -> str:
    """
    Sends raw text to the local Ollama LLM to act as a knowledge engineer
    and structure the text into optimized Markdown.
    """
    
    prompt = f"""You are an expert knowledge engineer. Your task is to take the following raw text extracted from a PDF and convert it into a highly structured, readable, and AI-optimized Markdown format.

Instructions:
1. Identify the main topics, headings, and subheadings.
2. Structure the content logically using Markdown headers (#, ##, ###).
3. Convert lists of items into proper Markdown bullet points or numbered lists.
4. If there is tabular data, try to format it as a Markdown table.
5. Fix any disjointed sentences caused by PDF line breaks.
6. Emphasize key terms in **bold**.
7. Ensure the final output is clean and ready to be ingested into a RAG system or read by a human.

Raw Text:
{raw_text}

Structured Markdown Output:"""

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }

    try:
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "Error: No response generated.")
    except Exception as e:
        # Fallback if LLM fails, return raw text as basic markdown
        print(f"LLM Processing Error: {e}")
        return f"# Extracted Document\n\n*Note: LLM structuring failed, falling back to raw text.*\n\n{raw_text}"
