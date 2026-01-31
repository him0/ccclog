import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

interface Entry {
  ja: string;
  en: string;
}

interface Version {
  version: string;
  releaseDate: string;
  releaseDateDisplay: string;
  entries: Entry[];
}

interface MonthGroup {
  key: string;
  label: string;
  versions: Version[];
}

interface ChangelogData {
  generatedAt: string;
  months: MonthGroup[];
}

export async function GET(context: APIContext) {
  // content/ から年を自動検出
  const contentDir = join(process.cwd(), 'content');
  const files = readdirSync(contentDir);
  const years = files
    .filter((f) => /^CHANGELOG_(\d{4})_JA\.md$/.test(f))
    .map((f) => f.match(/^CHANGELOG_(\d{4})_JA\.md$/)![1])
    .sort()
    .reverse();

  // 全バージョンを収集
  const allVersions: Array<Version & { year: string }> = [];

  for (const year of years) {
    try {
      const data: ChangelogData = await import(`../data/changelog-${year}.json`);
      for (const month of data.months) {
        for (const version of month.versions) {
          allVersions.push({ ...version, year });
        }
      }
    } catch {
      // データファイルが存在しない年はスキップ
      continue;
    }
  }

  // リリース日降順でソート
  allVersions.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

  // 最新50件に制限
  const recentVersions = allVersions.slice(0, 50);

  return rss({
    title: 'Claude Code CHANGELOG',
    description: 'Claude Code の変更履歴 / Changelog for Claude Code',
    site: context.site!,
    items: recentVersions.map((v) => ({
      title: `Claude Code v${v.version}`,
      pubDate: new Date(v.releaseDate + 'T00:00:00+09:00'),
      link: `${v.year}/#v${v.version}`,
      description: generateDescription(v),
    })),
    customData: '<language>ja</language>',
    trailingSlash: false,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateDescription(version: Version): string {
  const rows = version.entries
    .map(
      (e) =>
        `<tr><td style="padding:4px;border:1px solid #ddd">${escapeHtml(e.ja)}</td><td style="padding:4px;border:1px solid #ddd">${escapeHtml(e.en)}</td></tr>`
    )
    .join('');

  return `<p><strong>${escapeHtml(version.releaseDateDisplay)}</strong></p>
<table style="border-collapse:collapse;width:100%">
<thead><tr><th style="padding:4px;border:1px solid #ddd;background:#f5f5f5">日本語</th><th style="padding:4px;border:1px solid #ddd;background:#f5f5f5">English</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}
