# Auto-Apply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A daily scheduled cloud run that finds jobs, scores them, auto-submits strong matches (cap 5/day), and queues the rest to an Approvals list in the Apply Kit.

**Architecture:** Node scripts in `autoapply/` (public repo, no personal data). Each run: discover (WebSearch + ATS public APIs) → score (Claude in the run session) → fill forms with Playwright → record to the Apply Kit's private DB via ArtifactData. Apply Kit page gains Approvals + Summary views.

**Tech Stack:** Node 20+, Playwright (pre-installed Chromium), the Apply Kit artifact DB.

**Spec:** `docs/superpowers/specs/2026-11-16-auto-apply-design.md`

## Global Constraints
- No personal values in git: profile, resumes, letters and run data live only in the artifact DB / published files.
- Never click a final Submit unless every required field is answered from the profile and no verification challenge is present.
- Max 5 automatic submissions per calendar day (America/Edmonton); never apply twice to one posting URL.
- Ignore postings older than 21 days.

## Review Focus
- Form with a required question the profile can't answer → queued, not submitted.
- CAPTCHA / bot challenge appears mid-form → stop, mark "apply-yourself".
- Same job found via two URLs (board page vs API) → de-duplicated by ATS + job id.
- Upload control rejects PDF / needs drag-drop → mark failed with screenshot, don't submit.
- Daily cap reached mid-run → remaining strong matches go to Approvals.

---

### Task 1: Feasibility spike (no submissions)
- [ ] Get network access to the ATS hosts approved.
- [ ] Find ~10 real postings (Greenhouse/Lever/Ashby, Canada) via WebSearch.
- [ ] `autoapply/spike.js <url>`: load the form, list fields (label, type, required), detect CAPTCHA (recaptcha/hcaptcha/turnstile iframes or scripts), screenshot. Never submit.
- [ ] Report: per ATS, how many forms are fillable vs blocked. Go / adjust decision with the user.

### Task 2: Field filler — `autoapply/fill.js`
- `fillForm(page, profile, files) -> {filled: string[], unanswered: {label, required}[], captcha: boolean}`; maps label text to profile keys (name, email, phone, location, LinkedIn, GitHub, work auth, sponsorship, salary, notice, EEO answers); uploads resume and cover-letter PDFs.
- Tests against saved HTML fixtures of the spike's forms: required-unanswered detection, EEO select mapping, no submit click.

### Task 3: Discovery + scoring — `autoapply/discover.js`, `autoapply/prompts/score.md`
- `discover() -> Posting[] {ats, company, jobId, url, title, location, postedAt, description}` from ATS APIs; filter age ≤21 days; dedupe by `ats:company:jobId` against DB `jobs`.
- Score prompt returns `{resume, match: strong|good|weak, tier: 1-4, reasons, doubts[]}`.

### Task 4: Run orchestration + DB records
- Run order: submit approved jobs → discover → score → auto-submit strong tiers 1–3 within cap → queue the rest.
- DB `data/users/<id>` docs with `kind:"job"`: status found/queued/approved/skipped/submitted/failed/apply-yourself, letter, reasons, doubts, resume, timestamps; tracker rows created for submitted jobs.

### Task 5: Apply Kit — Approvals & Summary
- Approvals list (Send / Skip, unanswered question inputs saved to profile), Apply-yourself list, last-run summary. Tracker ignores non-application docs.

### Task 6: Schedule
- Fresh-session daily scheduled task, ~5:40 AM America/Edmonton, push notification on completion.
