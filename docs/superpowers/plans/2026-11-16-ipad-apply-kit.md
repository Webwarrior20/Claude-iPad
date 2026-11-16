# iPad Apply Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A private claude.ai Artifact page that picks a resume, drafts a cover letter, offers one-tap copy of form details, serves resume files, and tracks applications — usable from iPad Safari.

**Architecture:** One self-contained HTML page (inline CSS/JS) published as an Artifact. Resume files published alongside via `files`. Capabilities: `sample` (Claude), `downloads` (save files), `db` + `user` (tracker under `data/users/<id>/applications`). Common answers in localStorage.

**Tech Stack:** Vanilla HTML/CSS/JS; `docx@8.5.0` (jsdelivr) for the cover-letter .docx; LibreOffice for PDF conversion at build time.

**Spec:** `docs/superpowers/specs/2026-11-16-ipad-apply-kit-design.md`

## Global Constraints
- Resume files served byte-for-byte unchanged (.docx); PDFs only if layout matches.
- Cover letter may only use facts present in the chosen resume.
- No resumes or personal contact data committed to git; page source lives in the scratchpad.
- Works at 375px+ width, 16px gutters, touch targets ≥44px, light + dark.

## Review Focus
- Empty or very short job description → button disabled / prompt to paste more.
- `sample` unavailable (signed out, not granted) → resume picker falls back to keyword scoring; letter section shows a clear message.
- `db` unavailable → tracker hidden with a message; rest of page works.
- localStorage throws (private mode) → answers still editable, just not remembered.
- Clipboard API rejected → fallback select-and-copy via hidden textarea.

---

### Task 1: Resume assets
- [ ] Copy the three .docx files into `scratchpad/kit/resumes/` with clean names (`software-developer.docx`, `web-developer.docx`, `data-analyst.docx`).
- [ ] Convert each to PDF with `soffice --headless --convert-to pdf`; render page 1 of PDF and the docx side by side to PNG and compare; keep PDFs only if they match.

### Task 2: Page
**Files:** Create `scratchpad/kit/index.html`
- [ ] Sections: Job (paste box + "Find my best resume & write letter"), Result (resume pick + reason, downloads, letter with Copy / Save .docx / Regenerate), Copy panel (field chips from resume data), My answers (editable, localStorage key `applykit.answers`), Tracker (add/edit status rows).
- [ ] `sample.json` call returns `{resume: "software"|"web"|"data", reason: string, company: string, role: string}`; second streamed `sample` call writes the letter with an instruction block forbidding facts not in the resume text.
- [ ] Tracker row shape: `{company, role, link, resume, date, status, updatedAt}`; statuses Saved, Applied, Interview, Offer, Rejected.

### Task 3: Verify and publish
- [ ] Playwright: load page at iPad (820×1180) and phone (390×844) sizes, light and dark, screenshot, check no horizontal scroll, keyword fallback picks `data` for a data-analyst JD.
- [ ] Publish with capabilities `{sample:{}, downloads:true, db:{}, user:{}}` and the resume files; `ArtifactData list` on `data/users` once after a test write if possible.
