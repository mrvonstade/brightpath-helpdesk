// BrightPath help desk — answers ONLY from DOCS (docs.js) using Gemini.
// No build step, no server. The API key is entered at runtime and never committed.

const MODEL_DEFAULT = "gemini-3.6-flash";
const TIMEOUT_MS = 15000;
const NOT_FOUND =
  "I can't find that in the BrightPath help documents. Please contact support@brightpath.example (Monday to Friday, 09:00–17:00 UTC).";

// ---------- Prompt ----------
function buildPrompt(question) {
  const library = DOCS.map((d) => `[${d.id}] ${d.title}\n${d.text}`).join("\n\n");
  return `You are the help desk for BrightPath Learn, a fictional learning platform.
Answer the member's question using ONLY the documents below.

Rules:
- If the documents answer the question, answer briefly and list the ids of the documents you used.
- If they do not answer it (including pricing, refunds or job placement), set "found" to false. Do not guess or use outside knowledge.
- Never ask the member for their password.
- Reply with JSON only: {"found": true|false, "answer": "...", "sources": ["doc1", ...]}

DOCUMENTS:
${library}

QUESTION: ${question}`;
}

// ---------- Model call ----------
async function askModel(question, { apiKey, model, simulateFailure }) {
  // Failure test: point at an endpoint that does not exist, so the real
  // error-handling path runs (not a fake shortcut).
  const base = simulateFailure
    ? "https://generativelanguage.googleapis.com/v1beta/models/does-not-exist"
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${base}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(question) }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw new HelpDeskError("The AI service took too long to respond.");
    throw new HelpDeskError("Couldn't reach the AI service. Check your internet connection.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const reason = {
      400: "The request was rejected (check the API key and model name).",
      401: "The API key was not accepted.",
      403: "The API key was not accepted.",
      404: "The AI model could not be found.",
      429: "The AI service is busy or the free quota is used up.",
    }[res.status] || "The AI service returned an error.";
    throw new HelpDeskError(`${reason} (HTTP ${res.status})`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new HelpDeskError("The AI service returned an empty answer.");
  return validate(raw);
}

// Don't trust the model blindly: parse, and only accept sources that really exist.
function validate(raw) {
  let out;
  try {
    out = JSON.parse(raw);
  } catch {
    throw new HelpDeskError("The AI reply was not in the expected format.");
  }
  const validIds = DOCS.map((d) => d.id);
  const sources = (out.sources || []).filter((s) => validIds.includes(s));
  if (!out.found || sources.length === 0) {
    return { found: false, answer: NOT_FOUND, sources: [] };
  }
  return { found: true, answer: String(out.answer), sources };
}

class HelpDeskError extends Error {}

// ---------- Mock mode (clearly labelled; no AI) ----------
// Lets a reviewer without an API key try the app. Simple keyword overlap.
function askMock(question) {
  const words = question.toLowerCase().match(/[a-z]{4,}/g) || [];
  let best = null, bestScore = 0;
  for (const d of DOCS) {
    const text = d.text.toLowerCase();
    const score = words.filter((w) => text.includes(w)).length;
    if (score > bestScore) { best = d; bestScore = score; }
  }
  if (!best || bestScore < 2) return { found: false, answer: NOT_FOUND, sources: [] };
  return {
    found: true,
    answer: "[MOCK — no AI used] Most relevant document text:\n" + best.text,
    sources: [best.id],
  };
}

// ---------- UI ----------
const $ = (id) => document.getElementById(id);

function store(key, val) {
  try { sessionStorage.setItem(key, val); } catch {}
}
function load(key) {
  try { return sessionStorage.getItem(key) || ""; } catch { return ""; }
}

function render({ type, text, sources = [] }) {
  const box = $("result");
  box.className = "result " + type;
  box.textContent = text;
  if (sources.length) {
    const p = document.createElement("p");
    p.className = "sources";
    p.textContent = "Source: " + sources.map((s) => DOCS.find((d) => d.id === s).title).join("; ");
    box.appendChild(p);
  }
}

async function onAsk(e) {
  e.preventDefault();
  const question = $("question").value.trim();
  if (!question) return;

  const mock = $("mock").checked;
  const apiKey = $("apiKey").value.trim();
  store("apiKey", apiKey);

  if (!mock && !apiKey) {
    render({ type: "error", text: "Enter a Gemini API key, or tick Mock mode." });
    return;
  }

  $("ask").disabled = true;
  render({ type: "loading", text: "Thinking…" });
  try {
    const r = mock
      ? askMock(question)
      : await askModel(question, {
          apiKey,
          model: $("model").value.trim() || MODEL_DEFAULT,
          simulateFailure: $("fail").checked,
        });
    render({ type: r.found ? "ok" : "missing", text: r.answer, sources: r.sources });
  } catch (err) {
    const msg = err instanceof HelpDeskError ? err.message : "Something unexpected went wrong.";
    render({ type: "error", text: "Sorry, I can't answer right now. " + msg });
    console.error(err);
  } finally {
    $("ask").disabled = false;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  $("apiKey").value = load("apiKey");
  $("model").value = MODEL_DEFAULT;
  if (new URLSearchParams(location.search).has("fail")) $("fail").checked = true;
  $("form").addEventListener("submit", onAsk);
});
