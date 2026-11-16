// Fill an application form from an answers file; submit only with --submit and only if
// every required field is answered and no human-verification challenge is visible.
// Usage: APPLY_EMAIL=... node autoapply/fill.js <applicationUrl> <answers.json> <outDir> [--submit]
// answers.json: [{selector, type, value}] where type is text|textarea|email|tel|url|select|combobox|radio|checkbox|file|yesno.
//   radio/select/combobox/yesno: value = the option's visible label. checkbox: value true/false.
//   file: value = local path. yesno: give "label" (question text) instead of selector.
//   The literal value "$APPLY_EMAIL" is replaced by the APPLY_EMAIL environment variable.
const { chromium } = require('playwright');
const fs = require('fs');
const { applyUrl } = require('./inspect');

const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

async function fillOne(page, a) {
  const v = a.value === '$APPLY_EMAIL' ? (process.env.APPLY_EMAIL || '') : a.value;
  if (v === '' || v == null) return 'empty';
  switch (a.type) {
    case 'file': await page.setInputFiles(a.selector, v); await page.waitForTimeout(2500); return 'ok';
    case 'select': { const el = page.locator(a.selector).first();
      const opts = await el.locator('option').evaluateAll(os => os.map(o => ({ v: o.value, t: o.textContent.trim() })));
      const m = opts.find(o => norm(o.t) === norm(v)) || opts.find(o => norm(o.t).startsWith(norm(v))) || opts.find(o => norm(o.t).includes(norm(v)));
      if (!m) return 'no-option'; await el.selectOption(m.v); return 'ok'; }
    case 'combobox': { const el = page.locator(a.selector).first();
      await el.click(); await el.fill(String(v)).catch(() => {}); await page.waitForTimeout(1500);
      const opts = page.locator('[role="option"]:visible');
      const texts = await opts.allInnerTexts();
      let i = texts.findIndex(t => norm(t) === norm(v)); if (i < 0) i = texts.findIndex(t => norm(t).startsWith(norm(v))); if (i < 0) i = texts.findIndex(t => norm(t).includes(norm(v)));
      if (i < 0) { await page.keyboard.press('Escape'); return 'no-option'; }
      await opts.nth(i).click(); await page.waitForTimeout(300); return 'ok'; }
    case 'radio': { let ms = page.locator(a.selector);
      if (!(await ms.count())) { // Ashby prefixes radio group names with a per-page-load id: match on the stable suffix
        const m = /name="[^"_]+_([^"]+)"/.exec(a.selector); if (m) ms = page.locator(`input[type="radio"][name$="_${m[1]}"]`); }
      for (let i = 0; i < await ms.count(); i++) { const m = ms.nth(i);
        const lab = await m.evaluate(e => ((e.id && document.querySelector(`label[for="${CSS.escape(e.id)}"]`)?.innerText) || e.closest('label')?.innerText || e.value || '').trim());
        if (norm(lab) === norm(v) || norm(lab).startsWith(norm(v))) { await m.check({ force: true }); return 'ok'; } }
      return 'no-option'; }
    case 'checkbox': { const m = page.locator(a.selector).first(); if (v === true || v === 'true' || v === 'Yes') await m.check({ force: true }); else await m.uncheck({ force: true }).catch(() => {}); return 'ok'; }
    case 'yesno': { const entry = page.locator('[class*="_fieldEntry"]', { hasText: a.label.slice(0, 60) }).first();
      const btn = entry.getByRole('button', { name: new RegExp('^' + v + '$', 'i') }).first(); if (!(await btn.count())) return 'no-option'; await btn.click(); return 'ok'; }
    default: { const el = page.locator(a.selector).first(); await el.fill(String(v)); return 'ok'; }
  }
}

(async () => {
  const [url, answersPath, outDir, flag] = process.argv.slice(2);
  const submit = flag === '--submit';
  const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(applyUrl(url), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  // uploads first: some sites parse the resume and prefill fields, which we then overwrite
  const ordered = [...answers.filter(a => a.type === 'file'), ...answers.filter(a => a.type !== 'file')];
  const report = [];
  for (const a of ordered) {
    let r; try { r = await fillOne(page, a); } catch (e) { r = 'error: ' + String(e.message).split('\n')[0].slice(0, 120); }
    report.push({ field: a.selector || a.label, result: r });
  }
  await page.waitForTimeout(1500);
  const check = await page.evaluate(() => {
    const vis = e => e.offsetParent !== null || e.type === 'file';
    const missing = [...document.querySelectorAll('input[required], textarea[required], select[required], [aria-required="true"]')]
      .filter(e => vis(e) && e.type !== 'hidden' && (e.type === 'file' ? !e.files.length : e.type === 'radio' || e.type === 'checkbox' ?
        !document.querySelector(`input[name="${CSS.escape(e.name)}"]:checked`) : e.getAttribute('role') === 'combobox' ?
        !(e.closest('.select__control, [class*="control"]')?.querySelector('[class*="single-value"], [class*="singleValue"]') || e.value) : !(e.value || e.textContent || "").trim()))
      .map(e => e.id || e.name);
    const challenge = [...document.querySelectorAll('iframe')].some(f => /hcaptcha|recaptcha|turnstile/.test(f.src) && f.offsetWidth > 120 && f.offsetHeight > 120 && getComputedStyle(f).visibility !== 'hidden');
    return { missing: [...new Set(missing)], challenge };
  });
  await page.screenshot({ path: `${outDir}/filled.png`, fullPage: true });
  const result = { url: page.url(), report, ...check, submitted: false };
  const problems = report.filter(r => r.result !== 'ok');
  if (submit && !check.missing.length && !check.challenge && !problems.length) {
    await page.getByRole('button', { name: /submit/i }).last().click();
    await page.waitForTimeout(15000);
    const after = await page.evaluate(() => ({
      url: location.href,
      confirmed: /confirmation|thanks|thank-you/i.test(location.href) || /thank you for (applying|your application)|application (has been )?(submitted|received)|we('|’)ve received your application/i.test(document.body.innerText),
      challenge: [...document.querySelectorAll('iframe')].some(f => /hcaptcha|recaptcha|turnstile/.test(f.src) && f.offsetWidth > 120 && f.offsetHeight > 120 && getComputedStyle(f).visibility !== 'hidden'),
      errors: [...document.querySelectorAll('[class*="error"], [role="alert"]')].map(e => e.innerText.trim()).filter(Boolean).slice(0, 5)
    }));
    await page.screenshot({ path: `${outDir}/after-submit.png`, fullPage: true });
    Object.assign(result, { submitted: after.confirmed, after });
  } else if (submit) result.notSubmittedBecause = { missing: check.missing, challenge: check.challenge, problems };
  fs.writeFileSync(`${outDir}/result.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  await browser.close();
})();
