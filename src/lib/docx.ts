import mammoth from 'mammoth';

/**
 * Result structure returned by document extraction utilities.
 */
export interface ExtractedDocument {
  text: string;
  charCount: number;
  wordCount: number;
  messages: string[];
}

/**
 * Checks whether a browser File is a .docx file based on extension and MIME type.
 */
export function isDocxFile(file: File): boolean {
  const filename = file.name.toLowerCase();
  const isDocxExt = filename.endsWith('.docx');
  const isDocxMime = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return isDocxExt || (isDocxMime && !filename.endsWith('.doc'));
}

/**
 * Extracts raw text from a .docx File object in the browser using Mammoth.js.
 * 
 * @param file - The uploaded browser File object (.docx)
 * @returns Promise<string> - The trimmed extracted raw text
 * @throws Error with user-friendly explanation if file is corrupted, empty, or invalid
 */
export async function extractDocxText(file: File): Promise<string> {
  if (file.size === 0) {
    throw new Error('File dokumen kosong (0 bytes). Silakan unggah dokumen yang valid.');
  }

  if (file.name.toLowerCase().endsWith('.doc')) {
    throw new Error(
      'Format .doc lama (Word 97-2003) tidak didukung. Harap simpan dokumen sebagai format .docx modern sebelum mengunggah.'
    );
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (err) {
    throw new Error(`Gagal membaca file dari disk: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    // mammoth export handles both synthetic default and standard module export
    const extractor = (mammoth as unknown as { default?: typeof mammoth }).default || mammoth;
    const result = await extractor.extractRawText({ arrayBuffer });
    return (result.value || '').trim();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (errorMsg.includes("Can't find end of central directory") || errorMsg.includes('Corrupted zip')) {
      throw new Error('Format file bukan dokumen .docx yang valid atau file telah rusak (corrupted).');
    }
    if (errorMsg.includes('Could not find main document part')) {
      throw new Error('Struktur dokumen .docx tidak lengkap atau file bukan dokumen Word standar.');
    }
    if (errorMsg.includes('Could not find file in options')) {
      throw new Error('Parameter ArrayBuffer tidak ditemukan saat memproses dokumen.');
    }

    throw new Error(`Gagal mengekstrak teks dari DOCX: ${errorMsg}`);
  }
}

/**
 * Polymorphic file extractor supporting .docx, .txt, .md, and .csv files.
 * Returns text and metadata (charCount, wordCount).
 */
export async function extractTextFromFile(file: File): Promise<ExtractedDocument> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'docx' || isDocxFile(file)) {
    const text = await extractDocxText(file);
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    return {
      text,
      charCount: text.length,
      wordCount: words,
      messages: [],
    };
  }

  if (['txt', 'md', 'csv', 'json'].includes(ext)) {
    const raw = await file.text();
    const text = raw.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    return {
      text,
      charCount: text.length,
      wordCount: words,
      messages: [],
    };
  }

  if (ext === 'doc') {
    throw new Error('Format .doc lama tidak didukung. Mohon gunakan format .docx.');
  }

  // Fallback: attempt text read
  const rawFallback = await file.text();
  const text = rawFallback.trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return {
    text,
    charCount: text.length,
    wordCount: words,
    messages: [],
  };
}
