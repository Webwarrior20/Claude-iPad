# Auto-Apply — Design

## Intent
The Apply Kit (paste a job → resume + letter + copy panel) still takes too much of the
user's time. They want the system to find jobs and apply on its own, from a mix of
fully automatic submissions and one-tap approvals on the iPad. No Mac involved.

## Goals
- Every day, find new postings that fit one of the three standard resumes
  (Software Developer, Web Developer, Data Analyst).
- Location priority: (1) remote, open to Canada; (2) Edmonton / Calgary; (3) rest of
  Alberta; (4) rest of Canada (relocation).
- Score each posting; pick the resume; write a cover letter (facts from that resume only).
- **Strong match, tiers 1–3, no-account form** → submit automatically, max 5 per day.
- **Good match with a doubt** (2+ years asked, unclear location, tier 4, an unanswerable
  form question) → add to an **Approvals** list in the Apply Kit; user taps Send/Skip;
  the next run submits approved ones.
- **Weak** (senior, other field, clearance) → skipped, listed in the summary.
- Every submitted or queued job goes into the Apply Kit tracker.
- Phone notification when each run finishes; summary viewable in the Apply Kit.

## Non-goals
- LinkedIn Easy Apply, Indeed, Workday, or any site needing an account/password.
  These, and any form that shows a human-verification challenge, become
  "Apply yourself" items with a link and a ready letter.
- Editing the resumes.

## Anti-goals
- Submitting anything the profile doesn't support (invented answers, guessed
  experience, an unknown required question answered anyway).
- More than 5 automatic submissions in a day, or applying twice to the same posting.
- Personal data in the public GitHub repo.
- Bypassing CAPTCHAs or site bot protections.

## Profile (stored privately, never in git)
Work authorization, sponsorship, salary expectation, notice period, voluntary
self-identification answers, contact details, education and work history. The values
were given by the user in conversation and are stored only in the private Apply Kit
database (`data/users/<id>/profile`). Unknown required questions → the job goes to Approvals
with the question shown; the user's answer is saved to the profile for next time.

## Constraints
- Runs as a scheduled cloud session (fresh session per run) in this repo's environment.
- The environment currently blocks all job sites; the user will approve an allowlist
  of exact hosts (Greenhouse, Lever, Ashby boards/APIs and application pages).
- Public repo: code and the scoring rules only. Profile, resumes and run data live in
  the private Apply Kit artifact (its `data/users/<id>` database and published PDFs).
- Human-verification challenges on application forms are unknown in frequency until
  tried; the build starts with a spike that measures it on real postings without
  submitting.

## Approaches considered
- **A. Scheduled cloud task + Approvals in the Apply Kit (chosen)** — one place for
  everything, one-tap approval, tracker filled automatically.
- B. Same, approvals by chat reply — simpler, but approvals scattered, no tracker.
- C. Paid mass auto-apply service — LinkedIn coverage, but low quality, ban risk, cost.

## How (decided)
- **Discovery:** web search restricted to Greenhouse/Lever/Ashby job pages with the
  role and location keywords, then each board's public postings API for the full
  description, location and posting date. Postings older than 21 days are ignored.
  De-duplicated by URL against everything already in the tracker.
- **Scoring:** Claude reads posting + three resumes and returns resume choice, match
  level (strong/good/weak), location tier, and reasons; rules in a versioned prompt
  file in the repo.
- **Applying:** Playwright (pre-installed Chromium) fills the form: profile fields,
  resume PDF upload, cover letter (upload as PDF or paste), screening questions from
  the profile. Before clicking Submit it saves a screenshot; if any required field is
  unanswered or a verification challenge appears, it stops and queues to Approvals.
- **Approvals & tracker:** new collections in the Apply Kit's private database:
  `jobs` (every posting seen, with status: found / queued / approved / skipped /
  submitted / failed / apply-yourself, letter text, reasons, screenshot ref) and
  `profile`. The Apply Kit page gains an Approvals tab and a Daily summary; the
  tracker reads submitted jobs from the same data.
- **Schedule:** once a day at an off-peak morning time in Mountain Time; push
  notification on completion.

## Left to the builder
- Exact search queries, scoring prompt wording, the Approvals UI layout, retry rules
  for flaky forms, screenshot storage format.
