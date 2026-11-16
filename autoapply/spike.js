// Feasibility spike: inspect application forms WITHOUT submitting.
// Usage: node autoapply/spike.js <outDir> <url> [url...]
const { chromium } = require('playwright');
const fs = require('fs');

function formUrl(u) {
  if (u.includes('jobs.lever.co') && !u.endsWith('/apply')) return u.replace(/\/$/, '') + '/apply';
  if (u.includes('jobs.ashbyhq.com') && !u.endsWith('/application')) return u.replace(/\/$/, '') + '/application';
  return u;
}

(async () => {
  const [outDir, ...urls] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  for (const raw of urls) {
    const url = formUrl(raw);
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const blocked = new Set();
    page.on('requestfailed', r => { try { blocked.add(new URL(r.url()).host); } catch {} });
    const r = { url, ok: false };
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      r.status = resp && resp.status();
      await page.waitForTimeout(2500);
      r.title = await page.title();
      Object.assign(r, await page.evaluate(() => {
        const html = document.documentElement.outerHTML;
        const captcha = {
          recaptcha: /recaptcha/i.test(html), hcaptcha: /hcaptcha/i.test(html),
          turnstile: /turnstile|challenges\.cloudflare/i.test(html),
        };
        const labelFor = el => {
          if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return l.innerText.trim(); }
          const l = el.closest('label, .field, .application-question, [class*="question"], [class*="Field"]');
          return (el.getAttribute('aria-label') || (l && l.innerText) || el.name || '').trim().split('\n')[0].slice(0, 90);
        };
        const fields = [...document.querySelectorAll('input, select, textarea')]
          .filter(el => !['hidden', 'submit', 'button'].includes(el.type))
          .map(el => ({ label: labelFor(el), type: el.type || el.tagName.toLowerCase(),
            required: el.required || el.getAttribute('aria-required') === 'true' || /\*/.test(labelFor(el)) }));
        return { captcha, fieldCount: fields.length, fields };
      }));
      r.ok = true;
    } catch (e) { r.error = String(e.message || e).slice(0, 200); }
    r.blockedHosts = [...blocked];
    const name = url.replace(/https?:\/\//, '').replace(/[^\w]+/g, '_').slice(0, 80);
    try { await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true }); } catch {}
    results.push(r);
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(`${outDir}/results.json`, JSON.stringify(results, null, 2));
  for (const r of results) {
    const req = (r.fields || []).filter(f => f.required).length;
    console.log(`${r.ok ? 'OK ' : 'ERR'} ${r.status || ''} fields=${r.fieldCount ?? '-'} required=${req} captcha=${JSON.stringify(r.captcha || {})} blocked=${r.blockedHosts.join(',')} ${r.url}${r.error ? ' ' + r.error : ''}`);
  }
})();
