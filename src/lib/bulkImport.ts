import { CONTENT_PILLARS, normalizeContentPillar } from '../types.ts';

export interface ParsedIdeaItem {
  id: string;
  title: string;
  category: string;
  research_text: string;
  selected: boolean;
}

/**
 * Intelligent parser for CSV, Markdown, and TXT bulk content ideas.
 * Supports:
 * - CSV with commas or semicolons, quote unescaping, optional headers
 * - Markdown lists (- [Pillar] Title | Notes, * Title — Notes, 1. Title)
 * - Plain text lists with label prefixes (Judul: ..., Topik: ...) or inline notes (Catatan: ...)
 */
export function parseBulkIdeasText(rawText: string, fileExtension = 'txt'): ParsedIdeaItem[] {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const results: ParsedIdeaItem[] = [];
  const ext = fileExtension.toLowerCase();

  const isCsv =
    ext === 'csv' ||
    (!['md', 'markdown'].includes(ext) &&
      (lines[0]?.includes(',') || lines[0]?.includes(';')));

  // 1. CSV parser
  if (isCsv) {
    let startIndex = 0;
    const headerLine = lines[0].toLowerCase();
    if (
      headerLine.includes('judul') ||
      headerLine.includes('title') ||
      headerLine.includes('topik') ||
      headerLine.includes('category') ||
      headerLine.includes('kategori')
    ) {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Handle simple CSV / quote-aware splitting with support for ',' and ';'
      const parts: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          // Check for escaped double quotes: ""
          if (inQuotes && line[c + 1] === '"') {
            current += '"';
            c++; // skip escaped quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if ((char === ',' || char === ';') && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());

      const cleanTitle = parts[0]?.replace(/^["']|["']$/g, '').trim();
      if (!cleanTitle || cleanTitle.length < 2) continue;

      const rawCategory = parts[1]?.replace(/^["']|["']$/g, '').trim();
      const rawNotes = parts.slice(2).join(', ').replace(/^["']|["']$/g, '').trim();

      results.push({
        id: `parsed-${Date.now()}-${i}`,
        title: cleanTitle,
        category: rawCategory ? normalizeContentPillar(rawCategory) : CONTENT_PILLARS[0],
        research_text: rawNotes || '',
        selected: true,
      });
    }

    if (results.length > 0) return results;
  }

  // 2. Markdown / Text list parser
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line) continue;

    // Remove markdown list tokens: '- ', '* ', '+ ', '1. ', '### ', '## ', '# '
    line = line.replace(/^(\s*[-*+]\s+|\s*\d+\.\s+|\s*#{1,6}\s+)/, '').trim();
    if (!line) continue;

    let category: string = CONTENT_PILLARS[0];
    let title = line;
    let notes = '';

    // Check pattern: [Category] Title: Notes or [Category] Title
    const bracketMatch = line.match(/^\[(.*?)\]\s*(.*)$/);
    if (bracketMatch) {
      category = normalizeContentPillar(bracketMatch[1]);
      title = bracketMatch[2].trim();
    }

    // Strip generic labels prefix: "Judul: ...", "Title: ...", "Topik: ..."
    const labelPrefixMatch = title.match(/^(?:judul|title|topik)\s*:\s*(.*)$/i);
    if (labelPrefixMatch && labelPrefixMatch[1]?.trim().length >= 3) {
      title = labelPrefixMatch[1].trim();
    }

    // Check delimiter for notes: "Title | Notes" or "Title — Notes" or "Title // Notes"
    if (title.includes(' | ')) {
      const split = title.split(' | ');
      title = split[0].trim();
      notes = split.slice(1).join(' | ').trim();
    } else if (title.includes(' — ')) {
      const split = title.split(' — ');
      title = split[0].trim();
      notes = split.slice(1).join(' — ').trim();
    } else if (title.includes(' // ')) {
      const split = title.split(' // ');
      title = split[0].trim();
      notes = split.slice(1).join(' // ').trim();
    } else if (title.includes(' - ') && title.split(' - ')[0].length > 10) {
      const split = title.split(' - ');
      title = split[0].trim();
      notes = split.slice(1).join(' - ').trim();
    } else if (title.includes(': ') && !title.startsWith('http')) {
      const split = title.split(': ');
      if (split[0].split(/\s+/).length <= 10) {
        title = split[0].trim();
        notes = split.slice(1).join(': ').trim();
      }
    }

    // Clean leading/trailing quotes
    title = title.replace(/^["']|["']$/g, '').trim();
    if (title.length >= 2) {
      results.push({
        id: `parsed-${Date.now()}-${i}`,
        title,
        category,
        research_text: notes,
        selected: true,
      });
    }
  }

  return results;
}
