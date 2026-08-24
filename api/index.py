import os
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from extractor import extract_text_from_pdf
from summarizer import generate_summary, extract_key_points, get_document_stats

app = FastAPI(
    title="Document Summary Assistant",
    description="Upload a PDF or send extracted text to get a smart summary with key points.",
    version="1.0.0",
)

# Allow CORS for local development and hosted frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Document Summary Assistant API", "status": "running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/summarize")
async def summarize_document(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    summary_length: str = Form("medium"),
):
    """
    Generate a smart summary from either:
    - A PDF file upload, OR
    - Raw text (e.g., from frontend OCR of an image)

    - summary_length: 'short', 'medium', or 'long'
    """
    # Validate summary length
    if summary_length not in ("short", "medium", "long"):
        raise HTTPException(
            status_code=400,
            detail="summary_length must be 'short', 'medium', or 'long'.",
        )

    # Extract text from either file or raw text
    if file is not None:
        filename = file.filename or ""
        ext = os.path.splitext(filename)[1].lower()
        if ext != ".pdf":
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'. For images, use the OCR feature in the frontend and send the extracted text.",
            )

        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        try:
            extracted_text = extract_text_from_pdf(content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")
    elif text and text.strip():
        extracted_text = text.strip()
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either a PDF file or extracted text.",
        )

    if not extracted_text:
        raise HTTPException(
            status_code=422,
            detail="No text could be extracted from the document. It may be empty or unreadable.",
        )

    # Generate summary and key points
    summary = generate_summary(extracted_text, summary_length)
    key_points = extract_key_points(extracted_text, top_n=5)
    stats = get_document_stats(extracted_text)

    return JSONResponse(
        content={
            "filename": file.filename if file else "text-input",
            "file_type": "pdf" if file else "text",
            "summary_length": summary_length,
            "summary": summary,
            "key_points": key_points,
            "stats": stats,
        }
    )