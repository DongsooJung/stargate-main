import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const HOME_URL = 'https://sites.google.com/view/jungdongsoo';
const EDUCATION_URL = `${HOME_URL}/education`;
const OUTPUT_PATH = new URL('../data/google-sites-profile.json', import.meta.url);
const MAX_HTML_BYTES = 2_000_000;

function decodeEntities(value) {
  const named = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"'
  };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] ?? entity);
}

function visibleLines(html) {
  const text = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(?:p|div|h[1-6]|li|section|article|header|footer|nav)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  const lines = decodeEntities(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return lines.filter((line, index) => index === 0 || line !== lines[index - 1]);
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'STARGATE profile sync/1.0' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) throw new Error(`${url} did not return HTML`);
  const html = await response.text();
  if (!html || Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    throw new Error(`${url} returned an empty or oversized document`);
  }
  return html;
}

function between(lines, startLabel, endLabel) {
  const start = lines.indexOf(startLabel);
  const end = lines.indexOf(endLabel, start + 1);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Required section not found: ${startLabel} → ${endLabel}`);
  }
  return lines.slice(start + 1, end);
}

function parseHome(html) {
  const lines = visibleLines(html);
  const affiliations = between(lines, 'Affiliation', 'Education');
  const education = between(lines.slice(lines.indexOf('Affiliation')), 'Education', 'Contact');
  if (affiliations.length < 2 || education.length < 3) {
    throw new Error('Google Sites home profile contained too little data');
  }
  return { affiliations, education };
}

function parseCourseGroups(html) {
  const lines = visibleLines(html);
  const start = lines.indexOf('주요 수업 수강 내역');
  const end = lines.findIndex((line, index) => index > start && /^={10,}$/.test(line));
  if (start < 0 || end < 0) throw new Error('Korean course section was not found');

  const section = lines.slice(start + 1, end);
  const headings = [
    '서울대 지구환경시스템공학 학부 수강 내역',
    '북한대학원대학교 북한경제/IT 석사',
    '서울대 행정대학원 행정학 석사',
    '서울대학교 박사과정 건설환경공학부 스마트도시공학 전공'
  ];

  const groups = headings.map((title, index) => {
    const groupStart = section.indexOf(title);
    const nextStart = index + 1 < headings.length ? section.indexOf(headings[index + 1]) : section.length;
    if (groupStart < 0 || nextStart <= groupStart) throw new Error(`Course group not found: ${title}`);
    const courses = section
      .slice(groupStart + 1, nextStart)
      .filter((line) => !/^\d+(?:-[12S])?$/.test(line));
    return { title, courses };
  });

  if (groups.some((group) => group.courses.length === 0)) {
    throw new Error('One or more course groups were empty');
  }
  return groups;
}

async function readExisting() {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

const [homeHtml, educationHtml] = await Promise.all([
  fetchHtml(HOME_URL),
  fetchHtml(EDUCATION_URL)
]);
const home = parseHome(homeHtml);
const courseGroups = parseCourseGroups(educationHtml);
const core = {
  source: {
    name: 'Dongsoo Jung · Google Sites',
    url: HOME_URL,
    educationUrl: EDUCATION_URL
  },
  affiliations: home.affiliations,
  education: home.education,
  courseGroups
};
const contentHash = createHash('sha256').update(JSON.stringify(core)).digest('hex');
const existing = await readExisting();

if (existing?.contentHash === contentHash) {
  console.log('Google Sites profile is unchanged.');
} else {
  const output = {
    ...core,
    syncedAt: new Date().toISOString(),
    contentHash
  };
  await mkdir(dirname(OUTPUT_PATH.pathname), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Synced ${home.affiliations.length} affiliations, ${home.education.length} education entries and ${courseGroups.reduce((sum, group) => sum + group.courses.length, 0)} courses.`);
}
