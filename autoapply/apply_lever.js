// Fill a Lever application form from a private profile file; optionally submit.
// Usage: APPLY_EMAIL=... node autoapply/apply_lever.js <postingUrl> <profile.json> <resume.pdf> <outDir> [--submit]
// The email comes only from the APPLY_EMAIL environment variable set by the user.
// Never submits if a required field is empty. Personal data lives only outside git.
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const [url, profilePath, resume, outDir, flag] = process.argv.slice(2);
  const submit = flag === '--submit';
  const P = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  P.email = process.env.APPLY_EMAIL || '';
  fs.mkdirSync(outDir, { recursive: true });
  const applyUrl = url.replace(/\/$/, '').replace(/\/apply$/, '') + '/apply';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(applyUrl, { waitUntil: 'networkidle', timeout: 60000 });

  const fillIf = async (sel, val) => { const el = page.locator(sel).first(); if (val && await el.count()) await el.fill(val); };
  await page.setInputFiles('input[name="resume"]', resume);
  await page.waitForTimeout(4000);
  await fillIf('input[name="name"]', P.fullName);
  await fillIf('input[name="email"]', P.email);
  await fillIf('input[name="phone"]', P.phone);
  await fillIf('input[name="location"]', P.location);
  await fillIf('input[name="org"]', P.currentCompany);
  await fillIf('input[name="urls[LinkedIn]"]', P.linkedin);
  await fillIf('input[name="urls[GitHub]"]', P.github);
  if (P.pronouns) { const c = page.locator(`input[name="pronouns"][value="${P.pronouns}"]`); if (await c.count()) await c.check(); }
  if (P.futureContact) { const c = page.locator('input[type="checkbox"][name="consent[marketing]"]'); if (await c.count()) await c.check(); }
  await page.keyboard.press('Escape').catch(() => {});

  const missing = await page.evaluate(() => [...document.querySelectorAll('input[required], textarea[required], select[required]')]
    .filter(e => e.type !== 'hidden' && (e.type === 'file' ? !e.files.length : !e.value.trim())).map(e => e.name));
  await page.screenshot({ path: `${outDir}/filled.png`, fullPage: true });
  console.log(JSON.stringify({ missing }));
  if (!submit) { await browser.close(); return; }
  if (missing.length) { console.log('NOT SUBMITTED: required fields missing'); await browser.close(); process.exit(2); }

  await page.locator('button#btn-submit, button[type="submit"], .template-btn-submit').first().click();
  await page.waitForTimeout(12000);
  const state = await page.evaluate(() => ({
    url: location.href,
    thanks: /thanks|application (has been )?(submitted|received)|thank you/i.test(document.body.innerText),
    challengeVisible: [...document.querySelectorAll('iframe')].some(f => /hcaptcha|recaptcha/.test(f.src) && f.offsetWidth > 100 && f.offsetHeight > 100 && getComputedStyle(f).visibility !== 'hidden'),
    errors: [...document.querySelectorAll('.error-message, .application-error')].map(e => e.innerText.trim()).filter(Boolean).slice(0, 5)
  }));
  await page.screenshot({ path: `${outDir}/after-submit.png`, fullPage: true });
  console.log(JSON.stringify(state));
  await browser.close();
})();
