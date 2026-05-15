import requests
import json
import os
import textwrap

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
DEFAULT_MODEL = "llama3"
CHUNK_SIZE = 10000  # Characters (~2500 tokens), safe for default 4096 context

def process_text_with_llm(raw_text: str, model: str = DEFAULT_MODEL) -> str:
    """
    Sends raw text to the local Ollama LLM in chunks to avoid context limit errors.
    Structures the text into optimized Markdown and discards noise.
    """
    
    # Split text into chunks
    chunks = textwrap.wrap(raw_text, CHUNK_SIZE, break_long_words=False, replace_whitespace=False)
    
    full_markdown = ""
    
    for i, chunk in enumerate(chunks):
        print(f"Processing chunk {i+1}/{len(chunks)}...")
        
        prompt = f"""You are an expert knowledge engineer. Your task is to take the following raw text extracted from a PDF and convert it into a highly structured, readable, and AI-optimized Markdown format.

Instructions:
1. Identify the main topics, headings, and subheadings.
2. Structure the content logically using Markdown headers (#, ##, ###).
3. Convert lists of items into proper Markdown bullet points or numbered lists.
4. If there is tabular data, try to format it as a Markdown table.
5. Fix any disjointed sentences caused by PDF line breaks.
6. Emphasize key terms in **bold**.
7. CRITICAL: Discard and completely delete all unnecessary data such as page numbers, headers, footers, trademarks, copyright information, feedback links, and publication formality sections. Only keep the actual informational content.
8. Output ONLY the markdown text. Do not add introductory conversational text like "Here is the markdown...".

Raw Text Chunk {i+1}/{len(chunks)}:
{chunk}

Structured Markdown Output:"""

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_ctx": 4096 # Ensure context is at least 4096
            }
        }

        try:
            response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=600)
            response.raise_for_status()
            data = response.json()
            full_markdown += data.get("response", "") + "\n\n"
        except Exception as e:
            print(f"LLM Processing Error on chunk {i+1}: {e}")
            full_markdown += f"\n\n*Note: LLM structuring failed for this section, falling back to raw text.*\n\n{chunk}\n\n"

    return full_markdown.strip()

def chat_with_llm(question: str, context: str, model: str = DEFAULT_MODEL) -> str:
    """
    Asks the LLM a question based on a provided text context.
    """
    
    if context:
        prompt = f"""You are an expert AI assistant. Answer the user's question based strictly on the provided context. If the context does not contain the answer, say "I don't have enough information in the selected text to answer that."

Context:
{context}

Question: {question}

Answer:"""
    else:
        prompt = f"""You are an expert AI assistant. Answer the user's question.

Question: {question}

Answer:"""

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_ctx": 4096
        }
    }

    try:
        response = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=300)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "Error: No response generated.")
    except Exception as e:
        print(f"LLM Chat Error: {e}")
        return "I'm sorry, I encountered an error while trying to process your request."
