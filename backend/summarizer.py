import math
import re
from collections import Counter
from typing import Dict, List

# ---------------------------------------------------------------------------
# Text preprocessing utilities
# ---------------------------------------------------------------------------

STOPWORDS = set(
    """
    a about above after again against all am an and any are aren't as at be because
    been before being below between both but by can't cannot could couldn't did didn't
    do does doesn't doing don't down during each few for from further had hadn't has
    hasn't have haven't having he he'd he'll he's her here here's hers herself him
    himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself
    let's me more most mustn't my myself no nor not of off on once only or other ought
    our ours ourselves out over own same shan't she she'd she'll she's should shouldn't
    so some such than that that's the their theirs them themselves then there there's
    these they they'd they'll they're they've this those through to too under until up
    very was wasn't we we'd we'll we're we've were weren't what what's when when's
    where where's which while who who's whom why why's with won't would wouldn't you
    you'd you'll you're you've your yours yourself yourselves
    """.split()
)


def _tokenize(text: str) -> List[str]:
    """Split text into lowercase word tokens, removing punctuation and stopwords."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return [w for w in text.split() if w and w not in STOPWORDS]


def _split_sentences(text: str) -> List[str]:
    """Split text into sentences using regex."""
    text = re.sub(r"\s+", " ", text).strip()
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if s.strip()]


# ---------------------------------------------------------------------------
# TF-IDF implementation (pure Python)
# ---------------------------------------------------------------------------


def _compute_tf(sentence_tokens: List[str]) -> Dict[str, float]:
    """Term frequency for a single sentence."""
    total = len(sentence_tokens)
    if total == 0:
        return {}
    counts = Counter(sentence_tokens)
    return {word: count / total for word, count in counts.items()}


def _compute_idf(all_sentences_tokens: List[List[str]]) -> Dict[str, float]:
    """Inverse document frequency across all sentences."""
    num_docs = len(all_sentences_tokens)
    doc_freq: Dict[str, int] = {}
    for tokens in all_sentences_tokens:
        for word in set(tokens):
            doc_freq[word] = doc_freq.get(word, 0) + 1

    idf: Dict[str, float] = {}
    for word, freq in doc_freq.items():
        idf[word] = math.log((1 + num_docs) / (1 + freq)) + 1.0
    return idf


def _tfidf_scores(all_sentences_tokens: List[List[str]]) -> List[Dict[str, float]]:
    """Compute TF-IDF vector for each sentence."""
    idf = _compute_idf(all_sentences_tokens)
    return [_compute_tf(tokens) for tokens in all_sentences_tokens]


# ---------------------------------------------------------------------------
# TextRank implementation (pure Python, graph-based)
# ---------------------------------------------------------------------------


def _cosine_similarity(vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
    """Cosine similarity between two TF-IDF vectors."""
    common = set(vec_a.keys()) & set(vec_b.keys())
    if not common:
        return 0.0

    dot = sum(vec_a[w] * vec_b[w] for w in common)
    norm_a = math.sqrt(sum(v * v for v in vec_a.values()))
    norm_b = math.sqrt(sum(v * v for v in vec_b.values()))

    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _textrank(
    similarity_matrix: List[List[float]],
    damping: float = 0.85,
    max_iter: int = 100,
    tol: float = 1e-4,
) -> List[float]:
    """
    PageRank-style algorithm on the sentence similarity graph.
    Returns a list of importance scores, one per sentence.
    """
    n = len(similarity_matrix)
    if n == 0:
        return []

    # Normalize rows to make it a stochastic matrix
    row_sums = [sum(row) for row in similarity_matrix]
    normalized = []
    for i, row in enumerate(similarity_matrix):
        if row_sums[i] > 0:
            normalized.append([val / row_sums[i] for val in row])
        else:
            normalized.append([0.0] * n)

    # Initialize scores uniformly
    scores = [1.0 / n] * n

    for _ in range(max_iter):
        new_scores = []
        for i in range(n):
            rank = (1 - damping) / n
            for j in range(n):
                rank += damping * normalized[j][i] * scores[j]
            new_scores.append(rank)

        # Check convergence
        diff = sum(abs(a - b) for a, b in zip(scores, new_scores))
        scores = new_scores
        if diff < tol:
            break

    return scores


# ---------------------------------------------------------------------------
# Summary generation
# ---------------------------------------------------------------------------


def generate_summary(text: str, length: str = "medium") -> str:
    """
    Generate an extractive summary using TextRank + TF-IDF.

    - length: 'short' (2-3 sentences), 'medium' (4-6), 'long' (7-10)
    """
    sentences = _split_sentences(text)
    if len(sentences) <= 3:
        return " ".join(sentences)

    # Tokenize each sentence
    all_tokens = [_tokenize(s) for s in sentences]

    # Compute TF-IDF vectors
    tfidf_vectors = _tfidf_scores(all_tokens)

    # Build similarity matrix
    n = len(sentences)
    similarity_matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            sim = _cosine_similarity(tfidf_vectors[i], tfidf_vectors[j])
            similarity_matrix[i][j] = sim
            similarity_matrix[j][i] = sim

    # Run TextRank
    scores = _textrank(similarity_matrix)

    # Determine how many sentences to include
    length_map = {"short": 3, "medium": 5, "long": 8}
    num_sentences = min(length_map.get(length, 5), len(sentences))

    # Pick top-scoring sentences, preserving original order
    ranked_indices = sorted(range(n), key=lambda i: scores[i], reverse=True)[:num_sentences]
    ranked_indices.sort()

    summary_sentences = [sentences[i] for i in ranked_indices]
    return " ".join(summary_sentences)


# ---------------------------------------------------------------------------
# Key point extraction
# ---------------------------------------------------------------------------


def extract_key_points(text: str, top_n: int = 5) -> List[str]:
    """
    Extract the most important sentences as key points using TF-IDF scoring.
    """
    sentences = _split_sentences(text)
    if not sentences:
        return []

    all_tokens = [_tokenize(s) for s in sentences]
    tfidf_vectors = _tfidf_scores(all_tokens)

    # Score each sentence by the sum of its TF-IDF weights
    sentence_scores = []
    for i, vec in enumerate(tfidf_vectors):
        score = sum(vec.values())
        sentence_scores.append((i, score))

    # Sort by score descending, take top_n
    sentence_scores.sort(key=lambda x: x[1], reverse=True)
    top_indices = [idx for idx, _ in sentence_scores[:top_n]]
    top_indices.sort()

    return [sentences[i] for i in top_indices]


# ---------------------------------------------------------------------------
# Document statistics
# ---------------------------------------------------------------------------


def _count_syllables(text: str) -> int:
    """Rough syllable counter for English text."""
    words = re.findall(r"[a-zA-Z]+", text.lower())
    count = 0
    for word in words:
        # Count vowel groups
        vowel_groups = re.findall(r"[aeiouy]+", word)
        count += len(vowel_groups)
        # Subtract silent 'e' at end
        if word.endswith("e") and len(word) > 2 and word[-2] not in "aeiou":
            count -= 1
        # Ensure at least 1 syllable per word
        if count < 1:
            count = 1
    return count


def get_document_stats(text: str) -> Dict[str, object]:
    """
    Compute basic statistics about the document.
    """
    words = _tokenize(text)
    sentences = _split_sentences(text)
    total_chars = len(text)

    # Reading time (approx 200 words per minute)
    reading_time_min = len(words) / 200.0
    minutes = int(reading_time_min)
    seconds = int((reading_time_min % 1) * 60)
    reading_time = f"{minutes} min {seconds} sec"

    # Flesch Reading Ease (rough approximation)
    syllables = _count_syllables(text)
    if len(sentences) > 0 and len(words) > 0:
        flesch = 206.835 - 1.015 * (len(words) / len(sentences)) - 84.6 * (syllables / len(words))
        reading_ease = max(0, min(100, round(flesch, 1)))
    else:
        reading_ease = 0.0

    # Most common words (excluding stopwords)
    word_counts = Counter(words)
    top_words = [word for word, _ in word_counts.most_common(10)]

    return {
        "word_count": len(words),
        "sentence_count": len(sentences),
        "character_count": total_chars,
        "reading_time": reading_time,
        "reading_ease": reading_ease,
        "top_words": top_words,
    }