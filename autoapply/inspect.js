// List every question on an application form (no submission).
// Usage: node autoapply/inspect.js <applicationUrl> <out fields.json>
// Output: [{key, selector, label, type, required, options[]}] — selectors are what fill.js expects.
const { chromium } = require('playwright');
const fs = require('fs');

function applyUrl(u) {
  if (/jobs\.lever\.co/.test(u) && !/\/apply$/.test(u)) return u.replace(/\/$/, '') + '/apply';
  if (/jobs\.ashbyhq\.com/.test(u) && !/\/application$/.test(u)) return u.replace(/\/$/, '') + '/application';
  return u;
}
module.exports = { applyUrl };
if (require.main !== module) return;

(async () => {
  const [url, outPath] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(applyUrl(url), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const fields = await page.evaluate(() => {
    const clean = t => (t || '').replace(/\s+/g, ' ').replace(/\s*[*✱]\s*$/, '').trim().slice(0, 300);
    const box = el => el.closest('.field, .application-question, li, fieldset, [class*="_fieldEntry"], [class*="question"], .select__container, div');
    const labelOf = el => {
      if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return clean(l.innerText); }
      const by = el.getAttribute('aria-labelledby'); if (by) { const l = by.split(' ').map(i => document.getElementById(i)?.innerText).filter(Boolean).join(' '); if (l) return clean(l); }
      if (el.getAttribute('aria-label')) return clean(el.getAttribute('aria-label'));
      let b = el.parentElement; for (let i = 0; i < 5 && b; i++, b = b.parentElement) { const l = b.querySelector('label, legend, .application-label, .text'); if (l && l.innerText.trim()) return clean(l.innerText); }
      return el.name || el.id || '';
    };
    const isReq = (el, label) => el.required || el.getAttribute('aria-required') === 'true' || /[*✱]/.test(((el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.innerText) || '') + (box(el)?.querySelector('label, legend, .application-label')?.innerText || ''));
    const sel = el => el.id ? `#${CSS.escape(el.id)}` : el.name ? `${el.tagName.toLowerCase()}[name="${el.name}"]` : null;
    const out = []; const seenGroups = new Set();
    for (const el of document.querySelectorAll('input, select, textarea')) {
      const t = (el.type || '').toLowerCase();
      if (['hidden', 'submit', 'button', 'search'].includes(t) || el.name === 'g-recaptcha-response' || /recaptcha/.test(el.id)) continue;
      if (el.closest('[aria-hidden="true"]') && t !== 'file') continue;
      if (t === 'radio' || t === 'checkbox') {
        const g = el.name || el.closest('fieldset')?.id || ''; if (g && seenGroups.has(g + t)) continue; if (g) seenGroups.add(g + t);
        const members = g ? [...document.querySelectorAll(`input[type="${t}"][name="${CSS.escape(g)}"]`)] : [el];
        const fs = el.closest('fieldset, .application-question, li, [class*="_fieldEntry"]');
        const label = clean(fs?.querySelector('legend, label, .application-label, .text')?.innerText) || labelOf(el);
        out.push({ key: g || sel(el), selector: g ? `input[type="${t}"][name="${g}"]` : sel(el), label, type: t, required: isReq(el, label),
          options: members.map(m => ({ value: m.value, label: clean((m.id && document.querySelector(`label[for="${CSS.escape(m.id)}"]`)?.innerText) || m.closest('label')?.innerText || m.value) })) });
        continue;
      }
      const label = labelOf(el);
      const type = el.getAttribute('role') === 'combobox' ? 'combobox' : el.tagName === 'SELECT' ? 'select' : el.tagName === 'TEXTAREA' ? 'textarea' : t || 'text';
      out.push({ key: el.name || el.id, selector: sel(el), label, type, required: isReq(el, label),
        options: el.tagName === 'SELECT' ? [...el.options].filter(o => o.value).map(o => ({ value: o.value, label: clean(o.text) })) : [] });
    }
    // Ashby yes/no button questions
    for (const b of document.querySelectorAll('[class*="_yesno"], [class*="yesNo"]')) {
      const entry = b.closest('[class*="_fieldEntry"]'); const label = clean(entry?.querySelector('label')?.innerText);
      out.push({ key: 'yesno:' + label, selector: null, label, type: 'yesno', required: /[*✱]/.test(entry?.innerText || ''), options: [{ label: 'Yes' }, { label: 'No' }] });
    }
    return out.filter(f => f.selector || f.type === 'yesno');
  });
  // open comboboxes to read their options
  for (const f of fields.filter(f => f.type === 'combobox')) {
    try {
      await page.click(f.selector, { timeout: 3000 });
      await page.waitForTimeout(500);
      f.options = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        const lb = (el.getAttribute('aria-controls') && document.getElementById(el.getAttribute('aria-controls')))
          || el.closest('.select, .select__container, [class*="container"]')?.querySelector('[role="listbox"], .select__menu');
        return lb ? [...lb.querySelectorAll('[role="option"]')].map(o => ({ label: o.innerText.trim() })).slice(0, 80) : [];
      }, f.selector);
      await page.keyboard.press('Escape');
      await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
      await page.waitForTimeout(200);
    } catch {}
  }
  const html = await page.content();
  const result = { url: page.url(), captcha: { recaptcha: /recaptcha/i.test(html), hcaptcha: /hcaptcha/i.test(html), turnstile: /turnstile/i.test(html) }, fields };
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  for (const f of fields) console.log(`${f.required ? '*' : ' '} ${f.type.padEnd(9)} ${f.selector || f.key} | ${f.label}${f.options?.length ? ' [' + f.options.slice(0, 6).map(o => o.label).join(' / ') + (f.options.length > 6 ? ' …' : '') + ']' : ''}`);
  await browser.close();
})();
