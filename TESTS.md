# Test results

Run on the live demo (https://mrvonstade.github.io/brightpath-helpdesk/) with the real Gemini model `gemini-3.6-flash`, 12 Nov 2026.

## 1. Supported question ✅
**Q:** When is the group coaching session, and when does the link appear?
**Answer:** "The group coaching session takes place every Tuesday at 16:00 UTC. The link appears on the Coaching page 30 minutes before the session."
**Source shown:** Document 2 — Coaching and feedback
**Verdict:** Correct, cites the right document, adds nothing that isn't in it.

## 2. Unknown question ✅
**Q:** How much does BrightPath cost, and can I get a refund?
**Answer:** "I can't find that in the BrightPath help documents. Please contact support@brightpath.example (Monday to Friday, 09:00–17:00 UTC)."
**Verdict:** No invented price or refund policy, no fake source, and the member is referred to support as Document 3 requires.

## 3. API failure ✅
**Steps:** Ticked "Simulate API failure" (calls a model that does not exist) and asked a question.
**Result:** "Sorry, I can't answer right now. The AI model could not be found. (HTTP 404)"
**Verdict:** Clear message, no crash, no blank screen. The page stays usable.

### Bonus: a real failure caught in testing
My first run used `gemini-2.5-flash`, which Google has since retired. The app showed the same clear 404 message instead of breaking. I switched the default to `gemini-3.6-flash` (the model can also be changed under Settings & tests, without editing code).

## One thing I'd improve
Retry once with a fallback model before showing an error. The real 404 above shows why: one retired model shouldn't take the help desk offline. A short model list (`gemini-3.6-flash` → `gemini-3.5-flash-lite`) with one automatic retry would fix it. After that I'd add a small automated test set (around 20 questions with expected sources) so prompt changes can be checked for regressions.
