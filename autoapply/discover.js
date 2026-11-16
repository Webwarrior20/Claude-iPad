// Find new, relevant postings on the boards in companies.json.
// Usage: NODE_USE_ENV_PROXY=1 node autoapply/discover.js <seen.json> <out candidates.json> [maxAgeDays=21]
// seen.json: array of job keys "ats:slug:id" and/or posting URLs already handled (from the Apply Kit database).
const fs = require('fs');
const path = require('path');
const [seenPath, outPath, maxAgeArg] = process.argv.slice(2);
const MAX_AGE = Number(maxAgeArg || 21) * 864e5;
const seen = new Set(fs.existsSync(seenPath) ? JSON.parse(fs.readFileSync(seenPath, 'utf8')) : []);
const boards = JSON.parse(fs.readFileSync(path.join(__dirname, 'companies.json'), 'utf8'));

const TITLE_IN = /(software|developer|engineer|web|front[ -]?end|back[ -]?end|full[ -]?stack|data|analyst|analytics|business intelligence|\bbi\b|reporting|insights)/i;
const TITLE_OUT = /(senior|\bsr\b|staff|principal|\blead\b|manager|director|head of|\bvp\b|architect|intern|co-?op|student|\bii\b|\biii\b|\biv\b|\b[2-5]\b|sales|solutions|field|hardware|mechanical|electrical|firmware|embedded|security|site reliability|\bsre\b|machine learning|research scientist|account|recruit|designer|counsel|legal)/i;
const CANADA = /(canada|edmonton|calgary|alberta|\bab\b|toronto|vancouver|montr[eé]al|ottawa|waterloo|kitchener|winnipeg|halifax|victoria|saskatoon|regina|ontario|british columbia|quebec|\bon\b|\bbc\b|\bqc\b)/i;

function tierOf(loc, remote) {
  const l = loc.toLowerCase();
  const canada = CANADA.test(l);
  const openWorld = /^(remote|anywhere|remote[,\s-]*(global|worldwide|anywhere|north america)|north america)$/i.test(l.replace(/[()]/g, '').trim());
  if (remote && canada) return { tier: 1 };
  if (remote && openWorld) return { tier: 1, doubt: 'Remote, Canada not named' };
  if (remote) return null; // remote, but only in other countries
  if (/edmonton|calgary/.test(l)) return { tier: 2 };
  if (/alberta|\bab\b|red deer|lethbridge|banff|canmore|grande prairie|fort mcmurray|medicine hat/.test(l)) return { tier: 3 };
  if (canada) return { tier: 4, doubt: 'Outside Alberta (relocation)' };
  return null;
}
const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const strip = h => String(h || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/<\/(p|li|h\d|div|br)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
const get = async u => { try { const r = await fetch(u, { signal: AbortSignal.timeout(20000) }); return r.ok ? r.json() : null; } catch { return null; } };

async function greenhouse(s) {
  const d = await get(`https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`);
  return (d?.jobs || []).map(j => ({ ats: 'greenhouse', slug: s, id: String(j.id), company: j.company_name || s, title: j.title,
    location: j.location?.name || '', remote: /remote/i.test(j.location?.name || ''), postedAt: j.first_published || j.updated_at,
    url: j.absolute_url, description: strip(j.content) }));
}
async function lever(s) {
  const d = await get(`https://api.lever.co/v0/postings/${s}?mode=json`);
  return (Array.isArray(d) ? d : []).map(j => ({ ats: 'lever', slug: s, id: j.id, company: s, title: j.text,
    location: (j.categories?.allLocations || [j.categories?.location]).filter(Boolean).join('; '), remote: j.workplaceType === 'remote' || /remote/i.test(j.categories?.location || ''),
    postedAt: new Date(j.createdAt).toISOString(), url: j.hostedUrl,
    description: [j.descriptionPlain, ...(j.lists || []).map(l => l.text + '\n' + strip(l.content)), j.additionalPlain].filter(Boolean).join('\n') }));
}
async function ashby(s) {
  const d = await get(`https://api.ashbyhq.com/posting-api/job-board/${s}?includeCompensation=true`);
  return (d?.jobs || []).filter(j => j.isListed !== false).map(j => ({ ats: 'ashby', slug: s, id: j.id, company: s, title: j.title,
    location: [j.location, ...(j.secondaryLocations || []).map(x => x.location), j.address?.postalAddress?.addressCountry].filter(Boolean).join('; '),
    remote: j.isRemote || j.workplaceType === 'Remote', postedAt: j.publishedAt, url: j.jobUrl, applyUrl: j.applyUrl,
    compensation: j.compensation?.compensationTierSummary || '', description: strip(j.descriptionHtml || j.descriptionPlain) }));
}

(async () => {
  const lists = await Promise.all([
    ...boards.greenhouse.map(greenhouse), ...boards.lever.map(lever), ...boards.ashby.map(ashby)]);
  const all = lists.flat();
  const now = Date.now();
  const stats = { boards: lists.length, postings: all.length, relevantTitle: 0, inLocation: 0, fresh: 0, alreadySeen: 0 };
  const out = [];
  for (const j of all) {
    if (!TITLE_IN.test(j.title) || TITLE_OUT.test(j.title)) continue; stats.relevantTitle++;
    const t = tierOf(j.location, j.remote); if (!t) continue; stats.inLocation++;
    if (j.postedAt && now - new Date(j.postedAt).getTime() > MAX_AGE) continue; stats.fresh++;
    j.key = `${j.ats}:${j.slug}:${j.id}`;
    if (seen.has(j.key) || seen.has(j.url) || seen.has(norm(j.company) + '|' + norm(j.title) + '|' + norm(j.location))) { stats.alreadySeen++; continue; }
    seen.add(norm(j.company) + '|' + norm(j.title) + '|' + norm(j.location)); // same job posted twice
    out.push({ ...j, tier: t.tier, locationDoubt: t.doubt || null, description: j.description.slice(0, 7000) });
  }
  out.sort((a, b) => a.tier - b.tier || new Date(b.postedAt) - new Date(a.postedAt));
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(stats));
  for (const j of out) console.log(`T${j.tier} ${j.postedAt?.slice(0, 10)} ${j.company} | ${j.title} | ${j.location} | ${j.url}`);
})();
