# iPad Apply Kit — Design

## Intent
Vedant wants to apply for jobs entirely from an iPad instead of the Mac. On the Mac,
Claude helps through Claude in Chrome, which doesn't exist on iPad. On the iPad the pain is
retyping personal details into every form and juggling permissions. The goal: open one
page in Safari, paste a job, and have everything needed to apply ready to tap/copy.

## Goals
- Pick the right one of the three standard resumes (Software Developer, Web Developer,
  Data Analyst) for a pasted job description, with a one-line reason.
- Draft a tailored cover letter, written by Claude, grounded only in facts from the
  chosen resume.
- One-tap copy of every common form field (name, email, phone, city, LinkedIn, GitHub,
  school, degree, majors, grad date, current employer/title, dates).
- Save the chosen resume and the cover letter as files (into iPad Files) for upload.
- Track applications: company, role, link, resume used, date, status.
- Touch-first, works at iPad and phone width, can be added to the Home Screen.

## Non-goals
- Auto-filling or submitting forms on job sites (user picked this option over the
  cloud-browser approach). The user taps Submit in Safari.
- Editing or rewriting the resumes.

## Anti-goals
- Changing resume content in any way: "use them only". Files are served unchanged.
- Cover letters that invent experience, skills, employers or numbers not in the resumes.
- Personal data leaking: the page stays a private claude.ai artifact; resumes and
  contact details are not committed to the git repo.

## Constraints
- Must work in iPad Safari (and the Claude iPad app where possible).
- Cloud session cannot reach job sites; the page doesn't need to.

## Approaches considered
1. Claude fills forms in a cloud browser — closest to the Mac flow, but fails on
   login sites (LinkedIn, Indeed, Workday) and job sites are blocked from the session.
2. **Apply Kit page on the iPad (chosen by Vedant)** — works on every site, user submits.
3. Both — deferred; option 1 may be added later.

## How (decided)
- A single private claude.ai Artifact page, opened in Safari / added to Home Screen.
- Capabilities:
  - `sample` — Claude picks the resume and drafts the cover letter from the pasted
    job description plus the resume text embedded in the page.
  - `downloads` — save cover letter (.docx) and resume files.
  - `db` + `user` — application tracker rows, stored per person under
    `data/users/<id>/applications` (private to the viewer).
- Resume files published alongside the page, byte-for-byte originals (.docx), plus a
  PDF of each converted with LibreOffice for sites that want PDF (builder call; drop the
  PDF if conversion changes layout noticeably).
- Copy panel reads its values from the resumes (contact line, education, experience).
  LinkedIn/GitHub URLs aren't in the resume text (they're link labels): builder reads
  the hyperlink targets from the .docx; if absent, the field is editable and remembered
  in browser storage.
- Common-answer snippets (work authorization, salary expectation, notice period,
  "why this company") are editable by the user and remembered in browser storage —
  the page never guesses these.

## Left to the builder
- Visual design, layout, wording, cover-letter prompt details, tracker statuses
  (default: Saved, Applied, Interview, Offer, Rejected).
