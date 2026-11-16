# Morning run playbook

You are running the daily job-application run for the owner of the Apply Kit.
Follow these steps in order. Work without asking questions: nobody is watching.
Your final message is the run summary the owner reads on their phone.

**Apply Kit:** `https://claude.ai/artifact/DQDJ5VheUEvCtn4XqNmRUF`
All personal data lives in its private database collection `data/users/me`
(read and write it with the `ArtifactData` tool). Never write personal data
into the git repository, and never commit or push anything during a run.

## Hard rules
- Submit only when: the job scores **strong**, location tier is 1–3, there are no doubts,
  every required field has an answer from the profile or the resume, the
  `APPLY_EMAIL` environment variable is set, and `fill.js` reports no missing fields and
  no visible challenge. Otherwise queue the job or list it as apply-yourself.
- At most **5 automatic submissions per day** (America/Edmonton date). Approved jobs
  (the owner tapped Send) do not count toward the cap.
- Never apply twice to the same posting. Never solve, bypass or retry a CAPTCHA.
- Written answers and cover letters use only facts in the chosen resume
  (see `prompts/letter.md`). Never invent experience, numbers or tools.
- If a step fails, record the failure on that job and continue with the next job.

## Setup
```bash
cd "$(git rev-parse --show-toplevel)"
git fetch -q origin claude/inspiring-bell-9vblex && git checkout -q claude/inspiring-bell-9vblex
export NODE_USE_ENV_PROXY=1 NODE_NO_WARNINGS=1
W=$(mktemp -d)   # all run files go here
[ -n "$APPLY_EMAIL" ] && echo "email: set" || echo "email: NOT SET"
```
If the email is not set: do not submit anything this run; queue strong matches
instead and say so first in the summary ("Add APPLY_EMAIL to the claude-ipad
environment to turn on automatic sending").

## 1. Load state
- `ArtifactData list` collection `data/users/me` (limit 1000; follow `next_cursor`).
- `profile` doc → write `$W/profile.json` (all fields; `extraAnswers` holds answers the
  owner gave to past questions, keyed by question text).
- Docs with `kind:"job"` → known jobs. Docs without `kind` and with `company` → tracker rows.
- Write `$W/seen.json`: every job doc's `key` and `url`, plus every tracker row's `link`.
- Count today's automatic submissions: job docs with `status:"submitted"`,
  `auto:true` and `submittedAt` on today's date (America/Edmonton).
- Resumes: `Artifact read` the Apply Kit with `paths`
  `["resumes/Vedant_Prajapati_Resume_SoftwareDeveloper.pdf","resumes/Vedant_Prajapati_Resume_WebDeveloper.pdf","resumes/Vedant_Prajapati_Resume_DataAnalyst.pdf"]`
  and note where each was saved. Resume keys: software, web, data.
- Resume text for scoring and letters: the Apply Kit page embeds it as `RESUME_TEXT`;
  `Artifact read` the page once and take it from there.

## 2. Send what the owner approved
For each job doc with `status:"approved"`: go to step 5 with that job, using its stored
letter, and its `questions[].answer` values for the questions it asked about. Save each
newly answered question into `profile.extraAnswers` (question text → answer) so it is
never asked again.

## 3. Find new jobs
```bash
node autoapply/discover.js $W/seen.json $W/candidates.json 21
```
If the output shows fewer than 47 boards answering, mention it in the summary.

## 4. Score each candidate
Read `prompts/score.md` and apply it to every candidate in `$W/candidates.json`.
Result per job: resume, match (strong/good/weak), tier (1–4), reason, doubts.
- **weak** → job doc with `status:"skipped"` (keep it short: no letter).
- **good**, or **strong** with doubts or tier 4 → prepare (step 5 without `--submit`)
  and save with `status:"queued"`.
- **strong**, tier 1–3, no doubts → step 5 with `--submit`, while today's automatic
  count is under 5. Past the cap → queue it, with doubt "Daily limit reached".

## 5. Prepare and (maybe) submit one job
1. `node autoapply/inspect.js <url> $W/<id>-fields.json` lists every field.
   If the page has no form fields, or it needs a login/account → `apply-yourself`.
2. Write the cover letter following `prompts/letter.md` → `$W/<id>-letter.txt`, then
   `node autoapply/letter.js $W/<id>-letter.txt $W/profile.json "<Company>" $W/<id>-letter.pdf`.
3. Write `$W/<id>-answers.json` for **every** field (format in `fill.js`):
   - identity/contact/links/location/education/current job → from `profile.json`;
     email → the literal `"$APPLY_EMAIL"`.
   - resume upload → the chosen resume PDF; cover letter upload → the letter PDF;
     a cover-letter text box → the letter text.
   - work authorization, sponsorship, salary, notice, relocation, demographic and
     voluntary self-identification questions → from `profile.json`. Pick the option
     whose label matches; for "legally authorized to work in Canada" → Yes; for
     sponsorship → No. Salary → `profile.salaryExpectation` (a number field → `profile.salaryMin`).
   - consent / privacy acknowledgements → the "I acknowledge / I agree" option;
     future-opportunity opt-ins → Yes.
   - "How did you hear" → company website / careers page option.
   - short written questions ("why us", "what sets you apart", "anything else") →
     2–4 sentences from the resume and the posting, same rules as the letter.
   - anything you can't answer truthfully from the profile or resume (e.g. "Do you
     have a driver's licence?", "Are you willing to work weekends?", security
     clearance, a specific certification) → look in `profile.extraAnswers`; if absent,
     add it to the job's `questions` list and **do not submit**.
4. Run `node autoapply/fill.js <url> $W/<id>-answers.json $W/<id> [--submit]`.
   Read `result.json`. If a field reports `no-option` or `error`, fix the answer once
   and re-run; then give up on that job (queue it with the problem noted).
5. Outcome:
   - `submitted:true` → job `status:"submitted"`, `submittedAt`, `auto` (true unless it
     came from an approval), and add a tracker row (doc id `app-<ats>-<id>`, fields
     `company, role, link, resume, status:"Applied", date` like "Nov 16, 2026", `updatedAt`).
   - challenge visible, or submit clicked but no confirmation → `status:"apply-yourself"`
     with `error` explaining; never retry.
   - not submitted because of open questions/doubts → `status:"queued"`.

## 6. Save
One `ArtifactData batch` (≤50 writes per call; repeat as needed) of job docs:
doc id `job:<key>`, fields: `kind:"job"`, `key, ats, company, title, location, url,
tier, resume, match, reason, doubts[], questions[{label, answer?}], letter, status,
error?, submittedAt?, auto?, foundAt, updatedAt` (ms since epoch). Skipped jobs need
only `kind, key, company, title, url, status, reason, updatedAt`.
Then set doc `run-latest`: `kind:"run"`, `finishedAt`, `summary` (the text below, ≤600 chars).
Use `if_version` for docs that already exist.

## 7. Final message (becomes the phone notification)
Plain text, short:
- "Sent automatically: N" — company, title each.
- "Sent (you approved): N".
- "Waiting for your OK: N — open your Apply Kit".
- "Apply yourself: N" (with why: account needed / robot check).
- "Skipped: N weak matches".
- Any problem (email not set, boards down, a site that kept failing).
