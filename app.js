// ============================================================
// Document Summary Assistant - Frontend Logic
// ============================================================

// API endpoint - uses relative path so it works on Vercel and locally
const API_URL = "/api/summarize";

// State
let selectedFile = null;
let selectedLength = "medium";
let currentResult = null;

// DOM Elements
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const filePickerBtn = document.getElementById("filePickerBtn");
const uploadSection = document.getElementById("uploadSection");
const loadingSection = document.getElementById("loadingSection");
const resultsSection = document.getElementById("resultsSection");
const errorSection = document.getElementById("errorSection");
const loadingText = document.getElementById("loadingText");
const loadingSub = document.getElementById("loadingSub");
const progressFill = document.getElementById("progressFill");
const fileBadge = document.getElementById("fileBadge");
const summaryText = document.getElementById("summaryText");
const keyPointsList = document.getElementById("keyPointsList");
const statsGrid = document.getElementById("statsGrid");
const wordCloud = document.getElementById("wordCloud");
const errorMessage = document.getElementById("errorMessage");
const retryBtn = document.getElementById("retryBtn");
const newUploadBtn = document.getElementById("newUploadBtn");

// ============================================================
// File Upload Handling
// ============================================================

// Click handlers
filePickerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
});

dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Drag and drop
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// ============================================================
// Summary Length Selection
// ============================================================

document.querySelectorAll(".length-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".length-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selectedLength = btn.dataset.length;
    });
});

// ============================================================
// File Processing
// ============================================================

async function handleFile(file) {
    // Validate file type
    const ext = file.name.split(".").pop().toLowerCase();
    const allowed = ["pdf", "png", "jpg", "jpeg", "bmp", "tiff", "tif"];
    if (!allowed.includes(ext)) {
        showError(`Unsupported file type: .${ext}. Please upload a PDF or image file.`);
        return;
    }

    selectedFile = file;
    showLoading("Processing your document...", "Extracting text and generating summary");

    try {
        let extractedText = null;

        // If it's an image, run OCR in the browser
        if (ext !== "pdf") {
            updateLoading("Running OCR on image...", "This may take a few seconds");
            extractedText = await runOCR(file);
            if (!extractedText || !extractedText.trim()) {
                throw new Error("No text could be extracted from the image. Please try a clearer image.");
            }
        }

        // Send to backend
        updateLoading("Generating summary...", "Analyzing document content");
        const result = await sendToBackend(file, extractedText);
        currentResult = result;
        displayResults(result);
    } catch (err) {
        showError(err.message || "An unexpected error occurred. Please try again.");
    }
}

// ============================================================
// OCR (Client-side with Tesseract.js)
// ============================================================

async function runOCR(file) {
    try {
        const { data } = await Tesseract.recognize(
            file,
            "eng",
            {
                logger: (m) => {
                    if (m.status === "recognizing text") {
                        const pct = Math.round(m.progress * 100);
                        progressFill.style.width = `${pct}%`;
                    }
                },
            }
        );
        return data.text;
    } catch (err) {
        throw new Error("OCR failed. Please try a different image or check your connection.");
    }
}

// ============================================================
// Backend API Call
// ============================================================

async function sendToBackend(file, extractedText) {
    const formData = new FormData();

    if (file.name.toLowerCase().endsWith(".pdf")) {
        formData.append("file", file);
    } else {
        formData.append("text", extractedText);
    }

    formData.append("summary_length", selectedLength);

    const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        let errorDetail = "Request failed";
        try {
            const errData = await response.json();
            errorDetail = errData.detail || errorDetail;
        } catch (e) {
            // ignore parse error
        }
        throw new Error(errorDetail);
    }

    return await response.json();
}

// ============================================================
// Display Results
// ============================================================

function displayResults(result) {
    // Hide loading, show results
    loadingSection.hidden = true;
    errorSection.hidden = true;
    uploadSection.hidden = true;
    resultsSection.hidden = false;

    // File badge
    fileBadge.textContent = `📄 ${result.filename}`;

    // Summary
    summaryText.textContent = result.summary;

    // Key points
    keyPointsList.innerHTML = "";
    result.key_points.forEach((point) => {
        const li = document.createElement("li");
        li.textContent = point;
        keyPointsList.appendChild(li);
    });

    // Stats
    renderStats(result.stats);

    // Word cloud
    renderWordCloud(result.stats.top_words);

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: "smooth" });
}

function renderStats(stats) {
    const statConfigs = [
        { label: "Words", value: stats.word_count },
        { label: "Sentences", value: stats.sentence_count },
        { label: "Characters", value: stats.character_count },
        { label: "Reading Time", value: stats.reading_time },
        { label: "Readability", value: stats.reading_ease },
    ];

    statsGrid.innerHTML = "";
    statConfigs.forEach((stat) => {
        const card = document.createElement("div");
        card.className = "stat-card";
        card.innerHTML = `
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
        `;
        statsGrid.appendChild(card);
    });
}

function renderWordCloud(topWords) {
    wordCloud.innerHTML = "";
    if (!topWords || topWords.length === 0) {
        wordCloud.innerHTML = "<p style='color: var(--text-muted)'>No keywords found</p>";
        return;
    }

    // Font sizes based on position (most frequent = largest)
    const maxSize = 28;
    const minSize = 14;
    const step = (maxSize - minSize) / Math.max(topWords.length - 1, 1);

    topWords.forEach((word, index) => {
        const span = document.createElement("span");
        span.textContent = word;
        span.style.fontSize = `${maxSize - index * step}px`;
        wordCloud.appendChild(span);
    });
}

// ============================================================
// Export Functionality
// ============================================================

document.getElementById("exportTxt").addEventListener("click", () => {
    if (!currentResult) return;
    const content = buildExportText();
    downloadFile(`${currentResult.filename.replace(/\.[^.]+$/, "")}-summary.txt`, content, "text/plain");
});

document.getElementById("exportMd").addEventListener("click", () => {
    if (!currentResult) return;
    const content = buildExportMarkdown();
    downloadFile(`${currentResult.filename.replace(/\.[^.]+$/, "")}-summary.md`, content, "text/markdown");
});

document.getElementById("exportPdf").addEventListener("click", () => {
    if (!currentResult) return;
    exportToPDF();
});

function buildExportText() {
    const r = currentResult;
    return [
        `DOCUMENT SUMMARY ASSISTANT`,
        `==========================`,
        ``,
        `File: ${r.filename}`,
        `Summary Length: ${r.summary_length}`,
        ``,
        `SUMMARY`,
        `-------`,
        r.summary,
        ``,
        `KEY POINTS`,
        `----------`,
        ...r.key_points.map((p, i) => `${i + 1}. ${p}`),
        ``,
        `STATISTICS`,
        `----------`,
        `Words: ${r.stats.word_count}`,
        `Sentences: ${r.stats.sentence_count}`,
        `Characters: ${r.stats.character_count}`,
        `Reading Time: ${r.stats.reading_time}`,
        `Readability Score: ${r.stats.reading_ease}`,
    ].join("\n");
}

function buildExportMarkdown() {
    const r = currentResult;
    return [
        `# Document Summary Assistant`,
        ``,
        `**File:** ${r.filename}  `,
        `**Summary Length:** ${r.summary_length}  `,
        ``,
        `## Summary`,
        ``,
        r.summary,
        ``,
        `## Key Points`,
        ``,
        ...r.key_points.map((p) => `- ${p}`),
        ``,
        `## Statistics`,
        ``,
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Words | ${r.stats.word_count} |`,
        `| Sentences | ${r.stats.sentence_count} |`,
        `| Characters | ${r.stats.character_count} |`,
        `| Reading Time | ${r.stats.reading_time} |`,
        `| Readability | ${r.stats.reading_ease} |`,
    ].join("\n");
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const r = currentResult;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(99, 102, 241);
    doc.text("Document Summary Assistant", 20, 20);

    // File info
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`File: ${r.filename}`, 20, 32);
    doc.text(`Summary Length: ${r.summary_length}`, 20, 38);

    // Summary
    doc.setFontSize(14);
    doc.setTextColor(99, 102, 241);
    doc.text("Summary", 20, 50);
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    const summaryLines = doc.splitTextToSize(r.summary, 170);
    doc.text(summaryLines, 20, 58);

    // Key Points
    let y = 58 + summaryLines.length * 6 + 10;
    doc.setFontSize(14);
    doc.setTextColor(99, 102, 241);
    doc.text("Key Points", 20, y);
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    y += 8;
    r.key_points.forEach((point, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${point}`, 170);
        doc.text(lines, 20, y);
        y += lines.length * 6 + 2;
    });

    // Stats
    y += 10;
    doc.setFontSize(14);
    doc.setTextColor(99, 102, 241);
    doc.text("Statistics", 20, y);
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    y += 8;
    doc.text(`Words: ${r.stats.word_count}`, 20, y);
    doc.text(`Sentences: ${r.stats.sentence_count}`, 20, y + 6);
    doc.text(`Characters: ${r.stats.character_count}`, 20, y + 12);
    doc.text(`Reading Time: ${r.stats.reading_time}`, 20, y + 18);
    doc.text(`Readability Score: ${r.stats.reading_ease}`, 20, y + 24);

    doc.save(`${r.filename.replace(/\.[^.]+$/, "")}-summary.pdf`);
}

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================
// UI State Management
// ============================================================

function showLoading(text, sub) {
    uploadSection.hidden = true;
    errorSection.hidden = true;
    resultsSection.hidden = true;
    loadingSection.hidden = false;
    loadingText.textContent = text;
    loadingSub.textContent = sub;
    progressFill.style.width = "0%";
}

function updateLoading(text, sub) {
    loadingText.textContent = text;
    loadingSub.textContent = sub;
}

function showError(message) {
    loadingSection.hidden = true;
    resultsSection.hidden = true;
    uploadSection.hidden = true;
    errorSection.hidden = false;
    errorMessage.textContent = message;
}

function resetToUpload() {
    selectedFile = null;
    currentResult = null;
    fileInput.value = "";
    uploadSection.hidden = false;
    loadingSection.hidden = true;
    resultsSection.hidden = true;
    errorSection.hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Retry and new upload buttons
retryBtn.addEventListener("click", resetToUpload);
newUploadBtn.addEventListener("click", resetToUpload);