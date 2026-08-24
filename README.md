# Document Summary Assistant

A web application that takes any document (PDF/Image) and generates smart summaries with key points, statistics, and export options.

## Features

- **Document Upload**: Drag-and-drop or file picker for PDF and image files
- **Text Extraction**:
  - PDF parsing (server-side with `pypdf`)
  - OCR for images (client-side with Tesseract.js)
- **Smart Summary Generation**:
  - TextRank + TF-IDF algorithm (pure Python, no ML API)
  - Summary length options: short, medium, long
  - Key point extraction
- **Document Statistics**: Word count, sentence count, reading time, readability score
- **Word Cloud**: Visual representation of top keywords
- **Export Options**: Text, Markdown, and PDF formats
- **Mobile-responsive UI**

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

> **Note**: For local development, the frontend calls `/api/summarize`. If your backend runs on a different port, update `API_URL` in `app.js`.

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

### `POST /api/summarize`

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

## License

MIT