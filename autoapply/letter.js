// Render a cover letter to PDF. Header details come from a private profile file.
// Usage: APPLY_EMAIL=... node autoapply/letter.js <letter.txt> <profile.json> <company> <out.pdf>
const { chromium } = require('playwright');
const fs = require('fs');
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
(async () => {
  const [txt, profilePath, company, out] = process.argv.slice(2);
  const P = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  const body = fs.readFileSync(txt, 'utf8').trim().split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const contact = [P.city, process.env.APPLY_EMAIL, P.phone].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ');
  const date = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Edmonton' });
  const html = `<html><head><style>
    body{font:11pt/1.5 Calibri,Carlito,"Liberation Sans",Arial,sans-serif;color:#111;margin:0}
    h1{font-size:18pt;letter-spacing:.04em;text-align:center;margin:0 0 2pt}
    .c{text-align:center;font-size:9.5pt;color:#444;margin:0}
    hr{border:0;border-top:1.2pt solid #2348c8;margin:10pt 0 16pt}
    p{margin:0 0 9pt}</style></head><body>
    <h1>${esc(P.fullName).toUpperCase()}</h1><p class="c">${contact}</p>
    <p class="c">${esc(P.linkedin)} &nbsp;|&nbsp; ${esc(P.github)}</p><hr>
    <p>${esc(date)}</p>${company ? `<p>${esc(company)}</p>` : ''}${body}</body></html>`;
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.setContent(html); await pg.pdf({ path: out, format: 'Letter', margin: { top: '0.75in', bottom: '0.75in', left: '0.85in', right: '0.85in' } });
  await b.close(); console.log(out);
})();
