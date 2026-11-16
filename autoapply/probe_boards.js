// Probe candidate company slugs on Greenhouse, Lever and Ashby; print the ones that exist.
// Usage: node autoapply/probe_boards.js slug1 slug2 ...
const get = async u => { try { const r = await fetch(u, { signal: AbortSignal.timeout(12000) }); return r.ok ? r.json() : null; } catch { return null; } };
(async () => {
  const out = [];
  await Promise.all(process.argv.slice(2).map(async s => {
    const [gh, lv, ab] = await Promise.all([
      get(`https://boards-api.greenhouse.io/v1/boards/${s}/jobs`),
      get(`https://api.lever.co/v0/postings/${s}?mode=json&limit=200`),
      get(`https://api.ashbyhq.com/posting-api/job-board/${s}`)]);
    if (gh && gh.jobs) out.push({ ats: 'greenhouse', slug: s, jobs: gh.jobs.length });
    if (Array.isArray(lv) && lv.length) out.push({ ats: 'lever', slug: s, jobs: lv.length });
    if (ab && ab.jobs) out.push({ ats: 'ashby', slug: s, jobs: ab.jobs.length });
  }));
  console.log(JSON.stringify(out.sort((a, b) => a.slug.localeCompare(b.slug))));
})();
