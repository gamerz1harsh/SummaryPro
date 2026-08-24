# Error History & How We Solved Them

This document is a honest record of the problems we faced while building and deploying this project, and how we worked through each one. It's written in plain language so anyone (including future us) can understand what happened.

---

## 1. The First 404: Frontend Not Being Served

**What happened:** When we first deployed to Vercel, visiting the root URL gave us a `404: NOT_FOUND` error. The page wouldn't load at all.

**Why it happened:** Our `vercel.json` had a complex routing setup that tried to map the root URL to a `frontend/` subdirectory. Vercel couldn't figure out how to serve the static files, so it just returned 404.

**How we solved it:** We moved the frontend files (`index.html`, `style.css`, `app.js`) to the project root and simplified `vercel.json` to just `{ "version": 2 }`. This lets Vercel auto-detect the static files and serve them at `/` automatically. No manual routing needed.

---

## 2. The Second 404: API Route Mismatch

**What happened:** The frontend loaded fine, but when we tried to upload a document, we got `HTTP 404: {"detail":"Not Found"}`.

**Why it happened:** This was a FastAPI 404, not a Vercel 404. The Python function was being reached, but FastAPI couldn't find a matching route. The issue was a mismatch between what the frontend was calling and what FastAPI was exposing:

- The frontend was calling `POST /api/summarize`
- FastAPI had `POST /api/summarize` defined
- But Vercel mounts `api/index.py` at `/api`, so the actual path FastAPI received was `/api/api/summarize` — which didn't match anything

**How we solved it:** We went through a few iterations:
1. First, we removed the `/api` prefix from FastAPI routes (so `POST /summarize`), but then the frontend's `/api/summarize` didn't match.
2. Then we changed the frontend to call `/api` and made FastAPI handle `POST /` — but Vercel passes the full path `/api` to the function, so FastAPI still didn't match.
3. Finally, we added both routes: `@app.post("/")` and `@app.post("/api")`. This way, FastAPI matches whether Vercel passes `/` or `/api`.

---

## 3. Python Import Errors on Vercel

**What happened:** Even after fixing the routes, the API was still failing. We suspected the Python function wasn't starting properly.

**Why it happened:** Our `api/index.py` was importing sibling modules like `from extractor import ...`. Vercel's Python runtime doesn't always guarantee that sibling modules are importable this way — the working directory and import path can be different from what you expect locally.

**How we solved it:**
1. Added an empty `api/__init__.py` file to mark the directory as a proper Python package.
2. Changed the imports in `api/index.py` to use package imports: `from api.extractor import ...` and `from api.summarizer import ...`.

---

## 4. Hidden Error Messages

**What happened:** When the API failed, the frontend just showed "Request failed" — which told us nothing about what was actually wrong.

**Why it happened:** The original error handling in `app.js` was too generic. It caught any non-2xx response and replaced it with a generic message, hiding the real error.

**How we solved it:** We improved the error reporting to show the actual HTTP status and response body:

```javascript
if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
}
```

This is what finally revealed the `HTTP 404: {"detail":"Not Found"}` error that led us to the route fix.

---

## 5. OCR on Vercel: A Design Constraint

**What happened:** The original plan was to run OCR (for scanned images) on the backend using Tesseract. But Vercel's serverless environment doesn't support system binaries like Tesseract.

**Why it happened:** Vercel serverless functions run in a sandboxed environment without access to system-level OCR tools.

**How we solved it:** We moved OCR to the **frontend** using Tesseract.js. It runs entirely in the browser, so:
- The backend stays lightweight (no system dependencies)
- The user's image never leaves their browser for OCR
- The extracted text is then sent to the backend for summarization

---

## 6. Keeping the Backend "Native"

**What happened:** The assignment asked us to keep dependencies minimal and native.

**Why it mattered:** Most candidates would use an AI API (like OpenAI) for summarization. We wanted to stand out.

**How we solved it:** We implemented the **TextRank + TF-IDF summarization algorithm from scratch** in pure Python. No ML API, no external services — just math and string processing. This is:
- Free (no API costs)
- Fast (runs in milliseconds)
- Transparent (fully explainable)
- A genuine differentiator

---

## Lessons Learned

1. **Vercel's routing is different from local development.** What works with `uvicorn` locally doesn't always translate directly to Vercel's serverless model. Always test the deployed URL, not just locally.

2. **Error messages are your friend.** Don't hide them. The `HTTP 404: {"detail":"Not Found"}` message was the key to diagnosing the route issue.

3. **Vercel passes the full path to serverless functions.** If your function is at `api/index.py` and the user hits `/api`, FastAPI receives `/api` — not `/`. Plan your routes accordingly.

4. **Serverless environments have constraints.** System binaries (like Tesseract) don't work on Vercel. Design around these constraints early.

5. **Package imports matter.** When deploying Python to Vercel, use package imports (`from api.extractor import ...`) and add `__init__.py` files to be safe.