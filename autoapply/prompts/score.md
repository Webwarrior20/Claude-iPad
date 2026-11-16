# Scoring a posting

Inputs: the posting (title, company, location, description) and the three resumes
(software = Software Developer, web = Web Developer, data = Data Analyst).

The candidate's background is in the three resumes: read them. Treat him as having
0–1 years of professional software or analyst experience (his paid work so far is
customer-facing), with a completed CS degree and solid project work.

## Resume choice
- data: analyst, BI, reporting, analytics, data science-light, dashboards, SQL-heavy roles.
- web: front-end, web developer, UI, React/JS/TS/HTML/CSS, website roles.
- software: back-end, full-stack, general software/application/QA/automation engineer.

## Match
- **strong**: entry-level, junior, new-grad, associate, "0–2 years", or no years stated
  for a role whose core skills appear in the chosen resume; and nothing in the posting
  rules him out.
- **good**: a real fit but one doubt: asks 2–3 years; one core skill he lacks;
  a specialist domain; "intermediate" in the title; contract under 12 months;
  posting in French or requiring French.
- **weak**: 4+ years required; senior/lead in the description; a different field
  (sales, finance, legal, HR, marketing-only, annotation/translation, hardware,
  ML research, infrastructure/SRE/GPU); needs a security clearance, a professional
  designation (P.Eng, CPA) or a degree he doesn't have.

## Location tier (use the description, not just the location field)
1 remote and open to people in Canada · 2 Edmonton or Calgary · 3 elsewhere in Alberta
· 4 elsewhere in Canada (relocation). If remote but US-only or another country only →
weak. If remote "North America"/"global" but Canada isn't confirmed → doubt
"Confirm remote from Canada".

## Doubts
List each reason a human should look first (years asked, missing skill, French,
relocation, contract length, unclear location). Strong with any doubt → queued.

Output per job: `{resume, match, tier, reason (1–2 sentences, plain), doubts: []}`.
