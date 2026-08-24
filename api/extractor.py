import io

from pypdf import PdfReader


def extract_text_from_pdf(content: bytes) -> str:
    """
    Extract text from a PDF file using pypdf.
    Works for text-based PDFs (digital documents).
    """
    try:
        reader = PdfReader(io.BytesIO(content))
        pages_text = []

        for page in reader.pages:
            page_text = page.extract_text() or ""
            pages_text.append(page_text)

        full_text = "\n".join(pages_text).strip()

        if not full_text:
            raise RuntimeError(
                "No text could be extracted from this PDF. "
                "It may be a scanned document. Please upload the image version "
                "or use the OCR feature in the frontend."
            )

        return full_text
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Failed to parse PDF: {str(e)}")