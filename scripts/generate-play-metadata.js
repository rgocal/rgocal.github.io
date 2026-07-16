const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const projectsPath = path.join(repoRoot, 'projects.json');
const outputPath = path.join(repoRoot, 'play-metadata.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: controller.signal
  });
  clearTimeout(timeout);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.text();
}

function extractMetadata(html) {
  const metaValue = (property) => {
    const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'));
    return match ? match[1].replace(/\s+/g, ' ').trim() : '';
  };

  const description = metaValue('og:description') || metaValue('description') || '';
  const image = metaValue('og:image') || '';
  const title = metaValue('og:title') || '';
  const screenshots = [];
  const imageMatches = html.match(/https?:\/\/[^\s"'<>]+(?:=w\d+-h\d+-rw|=w\d+-h\d+|\/w\d+-h\d+-rw)/gi) || [];

  imageMatches.forEach((raw) => {
    const normalized = raw.replace(/&amp;/g, '&');
    if (!screenshots.includes(normalized)) screenshots.push(normalized);
  });

  return {
    description,
    image: image || screenshots[0] || '',
    screenshots,
    title,
    url: ''
  };
}

async function main() {
  const projects = readJson(projectsPath);
  const sections = Object.values(projects || {});
  const published = sections.find((section) => Array.isArray(section));

  const appEntries = (published || []).filter((item) => item && item.packageName);
  const metadata = {};

  for (const entry of appEntries) {
    const packageName = entry.packageName;
    const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}&hl=en&gl=US`;

    try {
      const html = await fetchText(url);
      const details = extractMetadata(html);
      metadata[packageName] = {
        ...details,
        url
      };
    } catch (error) {
      metadata[packageName] = {
        description: entry.description || '',
        image: entry.screenshot || entry.image || '',
        screenshots: entry.screenshots || [],
        title: entry.label || '',
        url
      };
    }
  }

  writeJson(outputPath, metadata);
  console.log(`Wrote ${Object.keys(metadata).length} Play metadata entries to ${path.relative(repoRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
