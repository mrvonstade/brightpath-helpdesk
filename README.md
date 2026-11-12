# BrightPath Help Desk

A small AI help desk that answers questions using **only** the three supplied BrightPath Learn documents (fictional), shows which document supports each answer, and says so when the answer isn't there.

**Live demo:** https://mrvonstade.github.io/brightpath-helpdesk/

## Run it

There is nothing to install and no build step. It is plain HTML and JavaScript.

1. Get a free Gemini API key at https://aistudio.google.com/apikey
2. Open the live demo, or download this repo and open `index.html` in a browser.
3. Paste the key, type a question, press **Ask**.

The key is typed in at runtime and kept only in that browser tab (`sessionStorage`). It is never in the code or the repo.

## How it works

- `docs.js`: the three documents, each with an id (`doc1`–`doc3`).
- `app.js`: sends the question plus all three documents to Gemini (`gemini-3.6-flash`, temperature 0) with strict rules: answer only from the documents, otherwise return `found: false`, never ask for a password, and reply in JSON `{found, answer, sources}`.
- **The model's output is checked, not trusted.** The JSON is parsed, and any source id that isn't a real document is dropped. If nothing valid remains, the app shows a fixed "not in the documents, contact support" message instead of the model's text.
- The documents are tiny, so they all go in the prompt. With hundreds of documents I'd switch to retrieval (embeddings + top-k search).

## Error handling

Every failure shows a clear message instead of crashing or showing a blank screen:

| Situation | Message shown |
|---|---|
| No internet / service unreachable | "Couldn't reach the AI service…" |
| No response within 15 s | "The AI service took too long to respond." |
| Bad API key (400/401/403) | "The API key was not accepted." |
| Model not found (404) | "The AI model could not be found." |
| Rate limit or free quota used up (429) | "The AI service is busy or the free quota is used up." |
| Malformed / empty reply | "The AI reply was not in the expected format." |

### Test the failure

Tick **Settings & tests → Simulate API failure** (or open the page with `?fail` on the end of the URL). The app then calls a model that doesn't exist, so the **real** error-handling code runs rather than a faked message.

## Mock mode

**Mock mode (no AI)** is for anyone without a key. It is clearly labelled and uses simple keyword matching to return the most relevant document. It shows the plumbing works, but it says nothing about AI answer quality.

## Test results

See [TESTS.md](TESTS.md).

## Tools used

- Claude (Anthropic) as a pair programmer for the code and README. I directed the design, deployed it and ran and checked every test.
- Google Gemini API (`gemini-3.6-flash`, free tier) as the language model.
- GitHub Pages for hosting. Plain HTML, CSS and JavaScript with no libraries or frameworks.
