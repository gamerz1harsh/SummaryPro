# Document Summary Assistant

A web application that takes any document (PDF/Image) and generates smart summaries with key points, statistics, and export options.

## What This Project Does

Upload a PDF or an image (like a scanned document), and this app will:

1. **Extract the text** — For PDFs, it parses the text server-side. For images, it runs OCR right in your browser.
2. **Generate a smart summary** — Using a hand-written TextRank + TF-IDF algorithm (no AI API needed, it's all pure Python).
3. **Show you key points** — The most important sentences from your document.
4. **Give you stats** — Word count, sentence count, reading time, and a readability score.
5. **Let you export** — Download the summary as Text, Markdown, or PDF.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | FastAPI (Python) |
| PDF Parsing | pypdf |
| OCR | Tesseract.js (client-side) |
| Summarization | TextRank + TF-IDF (pure Python) |
| Hosting | Vercel |

## Project Structure

```
├── api/                    # Vercel serverless backend
│   ├── __init__.py        # Marks api as a Python package
│   ├── index.py           # FastAPI app (entry point)
│   ├── extractor.py       # PDF text extraction
│   ├── summarizer.py      # TextRank + TF-IDF summarizer
│   └── requirements.txt   # Python dependencies
├── index.html             # Frontend main page (served at root)
├── style.css              # Frontend styles
├── app.js                 # Frontend logic + OCR
├── backend/                # Local development backend
│   ├── main.py            # FastAPI app (local)
│   ├── extractor.py       # PDF text extraction
│   ├── summarizer.py      # TextRank + TF-IDF summarizer
│   └── requirements.txt   # Python dependencies
├── vercel.json            # Vercel deployment config
└── README.md
```

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

Serve the project root with any static server:

```bash
# Using Python
python -m http.server 3000
```

Then open `http://localhost:3000`.

> **Note**: For local development, the frontend calls `/api`. If your backend runs on a different port, update `API_URL` in `app.js`.

## Deployment to Vercel

### Prerequisites

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Create a GitHub repository and push your code.

### Deploy

```bash
# From the project root
vercel
```

Or connect your GitHub repository to Vercel via the dashboard:

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New → Project**
3. Import your GitHub repository
4. Vercel will auto-detect the `vercel.json` config
5. Click **Deploy**

### Environment Variables

No environment variables are required.

## How It Works

1. **User uploads a document** (PDF or image)
2. **If image**: Tesseract.js runs OCR in the browser to extract text
3. **If PDF**: The file is sent to the FastAPI backend which extracts text using `pypdf`
4. **Summarization**: The backend runs a TextRank algorithm (graph-based, similar to PageRank) combined with TF-IDF scoring to:
   - Rank sentences by importance
   - Select the top sentences based on the chosen summary length
   - Extract key points
   - Compute document statistics
5. **Results displayed**: Summary, key points, stats, and word cloud are shown
6. **Export**: User can download the summary as Text, Markdown, or PDF

## Why TextRank + TF-IDF?

Most candidates use an AI API (like OpenAI) for summarization. This project implements **extractive summarization from scratch** using:

- **TextRank**: A graph-based ranking algorithm that treats sentences as nodes and similarity as edges, iteratively computing importance scores
- **TF-IDF**: Term frequency-inverse document frequency to weight words by their importance in the document

This approach is:
- **Free** (no API costs)
- **Fast** (runs in milliseconds)
- **Transparent** (fully explainable algorithm)
- **Dependency-light** (pure Python standard library)

## API Endpoints

### `POST /api`

Upload a PDF file or send extracted text.

**Form Data:**
- `file` (optional): PDF file
- `text` (optional): Extracted text (for images processed via OCR)
- `summary_length` (optional): `short`, `medium`, or `long` (default: `medium`)

**Response:**
```json
{
  "filename": "document.pdf",
  "file_type": "pdf",
  "summary_length": "medium",
  "summary": "The summary text...",
  "key_points": ["Key point 1", "Key point 2"],
  "stats": {
    "word_count": 500,
    "sentence_count": 30,
    "character_count": 3000,
    "reading_time": "2 min 30 sec",
    "reading_ease": 65.2,
    "top_words": ["document", "summary", "text"]
  }
}
```

### `GET /health`

Health check endpoint.

---

## The Journey: What We Faced and How We Solved It

Building and deploying this app wasn't a straight line. We hit several issues — from Vercel routing problems to Python import errors. We documented everything in plain language in our **[ERROR_HISTORY.md](ERROR_HISTORY.md)** file.

Here's a quick summary of what we went through:

1. **First 404** — Frontend files weren't being served because of complex Vercel routing. Fixed by moving files to root and simplifying `vercel.json`.
2. **Second 404** — API route mismatch between frontend and FastAPI. Fixed by adding both `POST /` and `POST /api` routes.
3. **Python import errors** — Sibling module imports failed on Vercel. Fixed by adding `__init__.py` and using package imports.
4. **Hidden error messages** — Frontend was hiding the real error. Fixed by showing the actual HTTP status and body.
5. **OCR constraint** — Vercel doesn't support system binaries. Fixed by moving OCR to the browser with Tesseract.js.
6. **Native backend** — Implemented TextRank + TF-IDF from scratch instead of using an AI API.

Read the full story in **[ERROR_HISTORY.md](ERROR_HISTORY.md)**.

## License

MIT