/**
 * Adversarial Stress Test Suite for Milestone 2: Docx Extraction & File Ingestion
 * 
 * Tests:
 * 1. Extraction of actual 36.7 KB docx file (character count, word count, 8 pillars, tone of voice, audience persona)
 * 2. File type validation (isDocxFile)
 * 3. Adversarial resilience (empty file, corrupted zip, non-docx zip, plain text, legacy .doc)
 * 4. Polymorphic extraction (txt, md, csv, json, unknown)
 * 5. Identity persistence and 4-tier fallback retrieval (useSettings)
 * 6. File manager integration and deduplication (useFiles)
 */

import { register } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import JSZip from 'jszip';

// Register loader to route 'mammoth' to 'mammoth/mammoth.browser.js' (mirroring Vite browser bundler)
register('./mammoth-loader.mjs', import.meta.url);

// Mock Browser Environment for useSettings and useFiles
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

const mockLocalStorage = new MockLocalStorage();

class MockWindow extends EventTarget {
  constructor() {
    super();
    this.localStorage = mockLocalStorage;
  }
}

const mockWin = new MockWindow();
globalThis.window = mockWin;
globalThis.localStorage = mockLocalStorage;

// Dynamic import of project modules after loader registration
const docxModule = await import('../src/lib/docx.ts');
const { extractDocxText, extractTextFromFile, isDocxFile } = docxModule;

const settingsModule = await import('../src/hooks/useSettings.ts');
const {
  getChannelIdentity,
  setChannelIdentity,
  DEFAULT_CHANNEL_IDENTITY,
  CHANNEL_IDENTITY_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  CHANNEL_IDENTITY_SYNC_EVENT,
  SETTINGS_SYNC_EVENT,
} = settingsModule;

const filesModule = await import('../src/hooks/useFiles.ts');
const { isChannelIdentityFile, FILES_STORAGE_KEY, SEED_FILES } = filesModule;

// Test Results Collector
let passedCount = 0;
let failedCount = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedCount++;
    const errMsg = `  ✗ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`;
    console.error(errMsg);
    failures.push(errMsg);
  }
}

async function assertRejects(promiseFn, expectedSubstring, testName) {
  try {
    await promiseFn();
    failedCount++;
    const errMsg = `  ✗ FAIL: ${testName} (Expected promise to reject, but it resolved)`;
    console.error(errMsg);
    failures.push(errMsg);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!expectedSubstring || msg.includes(expectedSubstring)) {
      passedCount++;
      console.log(`  ✓ PASS: ${testName} [Caught expected: "${msg}"]`);
    } else {
      failedCount++;
      const errMsg = `  ✗ FAIL: ${testName} (Error message "${msg}" did not include "${expectedSubstring}")`;
      console.error(errMsg);
      failures.push(errMsg);
    }
  }
}

console.log('================================================================');
console.log('  MILESTONE 2: ADVERSARIAL STRESS TEST SUITE');
console.log('================================================================\n');

// ----------------------------------------------------------------
// SUITE 1: Authoritative Docx Extraction & Semantic Verification
// ----------------------------------------------------------------
console.log('[SUITE 1: Authoritative 36.7 KB Docx Extraction & Semantic Verification]');

const authoritativeDocxPath = path.resolve(
  import.meta.dirname,
  '../../IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity\'s_Channel.docx'
);

assert(fs.existsSync(authoritativeDocxPath), 'Authoritative docx file exists on disk');

const docxBuffer = fs.readFileSync(authoritativeDocxPath);
const fileSize = fs.statSync(authoritativeDocxPath).size;
console.log(`  • Docx file size on disk: ${fileSize} bytes (~${(fileSize / 1024).toFixed(1)} KB)`);
assert(fileSize > 35000 && fileSize < 40000, 'Docx file size is ~36.7 KB (between 35KB and 40KB)');

const docxFile = new File([docxBuffer], "IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity's_Channel.docx", {
  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
});

const extractedRawText = await extractDocxText(docxFile);
const charCount = extractedRawText.length;
console.log(`  • Extracted characters count: ${charCount}`);
assert(charCount === 36700, 'Exact character count matches expected authoritative docx output (36,700 chars)');

const docxResult = await extractTextFromFile(docxFile);
assert(docxResult.charCount === 36700, 'extractTextFromFile returns accurate charCount (36,700)');
assert(docxResult.wordCount >= 4900 && docxResult.wordCount <= 5100, `extractTextFromFile returns accurate wordCount (${docxResult.wordCount} words)`);
assert(Array.isArray(docxResult.messages), 'extractTextFromFile messages is an array');

// Semantic Content Verification: Positioning & Channel Identity
assert(extractedRawText.includes('DOKUMEN STRATEGI CHANNEL YOUTUBE'), 'Contains header: DOKUMEN STRATEGI CHANNEL YOUTUBE');
assert(extractedRawText.includes('01. IDENTITAS CHANNEL'), 'Contains section: 01. IDENTITAS CHANNEL');
assert(extractedRawText.includes('POSITIONING UTAMA'), 'Contains: POSITIONING UTAMA');
assert(
  extractedRawText.includes('Membahas fenomena dunia digital dan kehidupan modern dengan cara analitis.'),
  'Contains exact positioning statement: "Membahas fenomena dunia digital dan kehidupan modern dengan cara analitis."'
);
assert(extractedRawText.includes('Topik boleh berubah.\nSudut pandang jangan berubah.') || extractedRawText.includes('Sudut pandang jangan berubah'), 'Contains core principle: "Sudut pandang jangan berubah"');
assert(
  extractedRawText.includes('Di sini, hal-hal yang kita alami setiap hari di dunia digital dan kehidupan modern dibongkar untuk melihat apa yang sebenarnya terjadi di baliknya.'),
  'Contains audience promise: "Di sini, hal-hal yang kita alami setiap hari..."'
);

// Semantic Content Verification: Target Audience & Character
assert(extractedRawText.includes('TARGET AUDIENS'), 'Contains: TARGET AUDIENS');
assert(extractedRawText.includes('Remaja akhir sampai dewasa muda'), 'Contains audience demographic: Remaja akhir sampai dewasa muda');
assert(extractedRawText.includes('Pengguna aktif internet, media sosial, game, AI'), 'Contains audience lifestyle: Pengguna aktif internet, media sosial, game, AI');
assert(extractedRawText.includes('KARAKTER CHANNEL'), 'Contains: KARAKTER CHANNEL');
assert(extractedRawText.includes('Analitis') && extractedRawText.includes('Kritis tetapi tidak sok tahu') && extractedRawText.includes('Kontekstual'), 'Contains channel personality traits: Analitis, Kritis, Kontekstual');

// Semantic Content Verification: 5 Core Content Pillars
assert(extractedRawText.includes('02. CONTENT PILLARS'), 'Contains section: 02. CONTENT PILLARS');
assert(extractedRawText.includes('PILAR 1 — INTERNET & SOCIAL MEDIA'), 'Contains Pillar 1: INTERNET & SOCIAL MEDIA');
assert(extractedRawText.includes('PILAR 2 — AI & TECHNOLOGY'), 'Contains Pillar 2: AI & TECHNOLOGY');
assert(extractedRawText.includes('PILAR 3 — DIGITAL ECONOMY & CONSUMER CULTURE'), 'Contains Pillar 3: DIGITAL ECONOMY & CONSUMER CULTURE');
assert(extractedRawText.includes('PILAR 4 — GAMING & DIGITAL ENTERTAINMENT'), 'Contains Pillar 4: GAMING & DIGITAL ENTERTAINMENT');
assert(extractedRawText.includes('PILAR 5 — MODERN LIFE & HUMAN BEHAVIOR'), 'Contains Pillar 5: MODERN LIFE & HUMAN BEHAVIOR');
assert(extractedRawText.includes('ATURAN PILLAR'), 'Contains: ATURAN PILLAR rule section');

// Semantic Content Verification: 8 Playlist Framework
assert(extractedRawText.includes('05. STRUKTUR PLAYLIST'), 'Contains section: 05. STRUKTUR PLAYLIST');
assert(extractedRawText.includes('01. Internet & Social Media'), 'Contains Playlist 1: 01. Internet & Social Media');
assert(extractedRawText.includes('02. AI & Technology'), 'Contains Playlist 2: AI & Technology');
assert(extractedRawText.includes('03. Digital Economy'), 'Contains Playlist 3: Digital Economy');
assert(extractedRawText.includes('04. Gaming & Digital Entertainment'), 'Contains Playlist 4: Gaming & Digital Entertainment');
assert(extractedRawText.includes('05. Modern Life'), 'Contains Playlist 5: Modern Life');
assert(extractedRawText.includes('06. Internet Explained'), 'Contains Playlist 6: Internet Explained');
assert(extractedRawText.includes('07. Why Does This Happen?'), 'Contains Playlist 7: Why Does This Happen?');
assert(extractedRawText.includes('08. Case Studies'), 'Contains Playlist 8: Case Studies');

// Semantic Content Verification: Human Editorial Checkpoints & AI Governance
assert(extractedRawText.includes('25B. HUMAN EDITORIAL CHECKPOINTS'), 'Contains section: 25B. HUMAN EDITORIAL CHECKPOINTS');
assert(extractedRawText.includes('1. TOPIC CHECK') && extractedRawText.includes('2. ANGLE CHECK') && extractedRawText.includes('5. AUTHENTICITY CHECK'), 'Contains 5 human editorial checkpoints');
assert(extractedRawText.includes('AI mempercepat produksi. Manusia menentukan perspektif.'), 'Contains AI philosophy: "AI mempercepat produksi. Manusia menentukan perspektif."');

console.log('');

// ----------------------------------------------------------------
// SUITE 2: File Extension & MIME Validation (isDocxFile)
// ----------------------------------------------------------------
console.log('[SUITE 2: File Extension & MIME Validation (isDocxFile)]');

assert(
  isDocxFile(new File([''], 'strategy.docx')),
  'isDocxFile accepts lowercase .docx'
);
assert(
  isDocxFile(new File([''], 'STRATEGY.DOCX')),
  'isDocxFile accepts uppercase .DOCX'
);
assert(
  isDocxFile(new File([''], 'Strategy.DocX')),
  'isDocxFile accepts mixed case .DocX'
);
assert(
  isDocxFile(new File([''], 'document', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })),
  'isDocxFile accepts docx MIME type even without extension'
);
assert(
  !isDocxFile(new File([''], 'legacy.doc')),
  'isDocxFile rejects legacy .doc file'
);
assert(
  !isDocxFile(new File([''], 'legacy.doc', { type: 'application/msword' })),
  'isDocxFile rejects legacy .doc with application/msword MIME'
);
assert(
  !isDocxFile(new File([''], 'notes.txt', { type: 'text/plain' })),
  'isDocxFile rejects .txt file'
);
assert(
  !isDocxFile(new File([''], 'document.pdf', { type: 'application/pdf' })),
  'isDocxFile rejects .pdf file'
);

console.log('');

// ----------------------------------------------------------------
// SUITE 3: Adversarial Input & Error Resilience
// ----------------------------------------------------------------
console.log('[SUITE 3: Adversarial Input & Robustness Testing]');

// 3.1 Empty 0-byte file
await assertRejects(
  () => extractDocxText(new File([], 'empty.docx')),
  'File dokumen kosong (0 bytes)',
  'Empty 0-byte docx file is rejected with clear Indonesian message'
);

// 3.2 Legacy .doc file
await assertRejects(
  () => extractDocxText(new File([Buffer.from('D0CF11E0A1B11AE1', 'hex')], 'legacy.doc')),
  'Format .doc lama (Word 97-2003) tidak didukung',
  'Legacy .doc file is rejected with clear conversion advice'
);

// 3.3 Corrupted zip archive (Random bytes)
const garbageBytes = crypto.randomBytes(4096);
await assertRejects(
  () => extractDocxText(new File([garbageBytes], 'corrupted.docx')),
  'Format file bukan dokumen .docx yang valid atau file telah rusak (corrupted).',
  'Corrupted random bytes file is rejected gracefully without unhandled rejection'
);

// 3.4 Valid Zip archive but NOT a Word document (Missing word/document.xml)
const nonWordZip = new JSZip();
nonWordZip.file('readme.txt', 'This is a valid zip, but not a docx!');
nonWordZip.file('data.json', JSON.stringify({ validZip: true }));
const nonWordZipBuffer = await nonWordZip.generateAsync({ type: 'nodebuffer' });

await assertRejects(
  () => extractDocxText(new File([nonWordZipBuffer], 'non_word.docx')),
  'Struktur dokumen .docx tidak lengkap atau file bukan dokumen Word standar.',
  'Valid zip lacking word/document.xml is caught and mapped to standard error'
);

// 3.5 Plain text disguised as .docx
const disguisedText = 'This is simple plain text file that someone renamed to have .docx extension';
await assertRejects(
  () => extractDocxText(new File([disguisedText], 'disguised.docx')),
  'Format file bukan dokumen .docx yang valid atau file telah rusak (corrupted).',
  'Plain text file disguised as .docx is rejected cleanly'
);

// 3.6 Single byte file
await assertRejects(
  () => extractDocxText(new File([new Uint8Array([0x50])], 'onebyte.docx')),
  'Format file bukan dokumen .docx yang valid atau file telah rusak (corrupted).',
  'Single byte file is caught and handled gracefully'
);

console.log('');

// ----------------------------------------------------------------
// SUITE 4: Polymorphic File Extractor (extractTextFromFile)
// ----------------------------------------------------------------
console.log('[SUITE 4: Polymorphic File Extractor (extractTextFromFile)]');

// 4.1 Plain text file
const txtFile = new File(['Hello Zeinity YouTube creator!\nLine 2 of script.'], 'notes.txt', { type: 'text/plain' });
const txtRes = await extractTextFromFile(txtFile);
assert(txtRes.text.includes('Hello Zeinity'), 'extractTextFromFile extracts .txt text');
assert(txtRes.charCount > 0, 'extractTextFromFile calculates .txt charCount');
assert(txtRes.wordCount === 8, `extractTextFromFile calculates accurate word count (got ${txtRes.wordCount}, expected 8)`);

// 4.2 Markdown file
const mdContent = '# Video Title\n\n- Point 1\n- Point 2\n\nConclusion.';
const mdFile = new File([mdContent], 'outline.md');
const mdRes = await extractTextFromFile(mdFile);
assert(mdRes.text === mdContent.trim(), 'extractTextFromFile extracts .md content');
assert(mdRes.wordCount === 10, `extractTextFromFile calculates .md word count (got ${mdRes.wordCount}, expected 10)`);

// 4.3 CSV file
const csvContent = 'id,title,views\n1,AI Video,15000\n2,Game Culture,28000';
const csvFile = new File([csvContent], 'analytics.csv');
const csvRes = await extractTextFromFile(csvFile);
assert(csvRes.text === csvContent, 'extractTextFromFile extracts .csv content');

// 4.4 JSON file
const jsonContent = JSON.stringify({ channel: 'Zeinity', niche: 'Modern Life & Tech' });
const jsonFile = new File([jsonContent], 'metadata.json');
const jsonRes = await extractTextFromFile(jsonFile);
assert(jsonRes.text === jsonContent, 'extractTextFromFile extracts .json content');

// 4.5 Legacy .doc in extractTextFromFile
await assertRejects(
  () => extractTextFromFile(new File(['dummy'], 'legacy.doc')),
  'Format .doc lama tidak didukung. Mohon gunakan format .docx.',
  'extractTextFromFile rejects legacy .doc file with clear error'
);

// 4.6 Fallback file type
const logFile = new File(['[INFO] Server started\n[INFO] Request handled'], 'server.log');
const logRes = await extractTextFromFile(logFile);
assert(logRes.text.includes('Server started'), 'extractTextFromFile falls back to text read for unknown text extension');

// 4.7 Empty text file
const emptyTxt = new File([''], 'empty.txt');
const emptyTxtRes = await extractTextFromFile(emptyTxt);
assert(emptyTxtRes.text === '' && emptyTxtRes.charCount === 0 && emptyTxtRes.wordCount === 0, 'Empty text file returns 0 chars and 0 words without throwing');

console.log('');

// ----------------------------------------------------------------
// SUITE 5: Identity Persistence & 4-Tier Fallback Retrieval (useSettings)
// ----------------------------------------------------------------
console.log('[SUITE 5: Identity Persistence & 4-Tier Fallback Retrieval]');

// 5.1 Clean slate: Tier 4 fallback
mockLocalStorage.clear();
const tier4 = getChannelIdentity();
assert(tier4 === DEFAULT_CHANNEL_IDENTITY, 'Tier 4: Returns DEFAULT_CHANNEL_IDENTITY when storage is empty');
assert(tier4.includes('DOKUMEN STRATEGI & IDENTITAS CHANNEL YOUTUBE ZEINITY'), 'DEFAULT_CHANNEL_IDENTITY contains master header');
assert(tier4.includes('8 Content Pillars:'), 'DEFAULT_CHANNEL_IDENTITY contains 8 Content Pillars');
assert(tier4.includes('Positioning Utama:'), 'DEFAULT_CHANNEL_IDENTITY contains Positioning Utama');
assert(tier4.includes('Tone of Voice:'), 'DEFAULT_CHANNEL_IDENTITY contains Tone of Voice');

// 5.2 Tier 3 fallback: Retrieved from zeinity_uploaded_files
mockLocalStorage.clear();
const mockUploadedFiles = [
  {
    id: 'f1',
    filename: 'video_script.txt',
    extracted_text: 'Some video script',
  },
  {
    id: 'file-zeinity-identity',
    filename: "IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity's_Channel.docx",
    extracted_text: 'TIER_3_EXTRACTED_DOCX_IDENTITY_TEXT',
  },
];
mockLocalStorage.setItem('zeinity_uploaded_files', JSON.stringify(mockUploadedFiles));
const tier3 = getChannelIdentity();
assert(tier3 === 'TIER_3_EXTRACTED_DOCX_IDENTITY_TEXT', 'Tier 3: Falls back to extracted_text from zeinity_uploaded_files when no settings key exists');

// 5.3 Tier 2 fallback: Retrieved from zeinity_settings map
mockLocalStorage.setItem(
  SETTINGS_STORAGE_KEY,
  JSON.stringify({
    active_provider: 'gemini',
    channel_identity: 'TIER_2_SETTINGS_MAP_IDENTITY_TEXT',
  })
);
const tier2 = getChannelIdentity();
assert(tier2 === 'TIER_2_SETTINGS_MAP_IDENTITY_TEXT', 'Tier 2: Settings map takes precedence over uploaded files');

// 5.4 Tier 1: Dedicated key zeinity_channel_identity takes top precedence
mockLocalStorage.setItem(CHANNEL_IDENTITY_STORAGE_KEY, 'TIER_1_DEDICATED_KEY_IDENTITY_TEXT');
const tier1 = getChannelIdentity();
assert(tier1 === 'TIER_1_DEDICATED_KEY_IDENTITY_TEXT', 'Tier 1: Dedicated key takes highest precedence over all tiers');

// 5.5 Whitespace / empty string resilience
mockLocalStorage.setItem(CHANNEL_IDENTITY_STORAGE_KEY, '   \n\t   ');
const whitespaceFallback = getChannelIdentity();
assert(whitespaceFallback === 'TIER_2_SETTINGS_MAP_IDENTITY_TEXT', 'Empty/whitespace dedicated key properly falls through to Tier 2');

mockLocalStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ channel_identity: '   ' }));
const whitespaceFallbackTier3 = getChannelIdentity();
assert(whitespaceFallbackTier3 === 'TIER_3_EXTRACTED_DOCX_IDENTITY_TEXT', 'Empty/whitespace settings map properly falls through to Tier 3');

// 5.6 Adversarial Corrupted Storage Payloads
mockLocalStorage.setItem(CHANNEL_IDENTITY_STORAGE_KEY, '');
mockLocalStorage.setItem(SETTINGS_STORAGE_KEY, 'CORRUPTED_{{{NOT_JSON');
mockLocalStorage.setItem('zeinity_uploaded_files', 'CORRUPTED_{{{NOT_JSON');
const corruptFallback = getChannelIdentity();
assert(corruptFallback === DEFAULT_CHANNEL_IDENTITY, 'Corrupted JSON in all keys cleanly falls back to DEFAULT_CHANNEL_IDENTITY without crashing');

mockLocalStorage.setItem(SETTINGS_STORAGE_KEY, 'null');
mockLocalStorage.setItem('zeinity_uploaded_files', 'null');
const nullStringFallback = getChannelIdentity();
assert(nullStringFallback === DEFAULT_CHANNEL_IDENTITY, 'String "null" in storage cleanly falls back to DEFAULT_CHANNEL_IDENTITY without crashing');

mockLocalStorage.setItem('zeinity_uploaded_files', JSON.stringify([null, undefined, 123, 'string', {}, { filename: 999 }]));
const malformedArrayFallback = getChannelIdentity();
assert(malformedArrayFallback === DEFAULT_CHANNEL_IDENTITY, 'Array with malformed/null objects cleanly falls back without crashing');

// 5.7 setChannelIdentity Mutation & Event Synchronization
mockLocalStorage.clear();
let identitySyncEventDispatched = false;
let settingsSyncEventDispatched = false;
let lastIdentityDetail = '';
let lastSettingsDetail = null;

const identityListener = (e) => {
  identitySyncEventDispatched = true;
  lastIdentityDetail = e.detail;
};
const settingsListener = (e) => {
  settingsSyncEventDispatched = true;
  lastSettingsDetail = e.detail;
};

mockWin.addEventListener(CHANNEL_IDENTITY_SYNC_EVENT, identityListener);
mockWin.addEventListener(SETTINGS_SYNC_EVENT, settingsListener);

setChannelIdentity('   Updated Strategy from 36.7 KB Docx   ');

assert(mockLocalStorage.getItem(CHANNEL_IDENTITY_STORAGE_KEY) === 'Updated Strategy from 36.7 KB Docx', 'setChannelIdentity saves trimmed text to dedicated storage key');

const savedSettings = JSON.parse(mockLocalStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
assert(savedSettings.channel_identity === 'Updated Strategy from 36.7 KB Docx', 'setChannelIdentity mirrors updated text into zeinity_settings map');

assert(identitySyncEventDispatched && lastIdentityDetail === 'Updated Strategy from 36.7 KB Docx', 'setChannelIdentity dispatches zeinity_identity_sync CustomEvent with updated text');
assert(settingsSyncEventDispatched && lastSettingsDetail?.channel_identity === 'Updated Strategy from 36.7 KB Docx', 'setChannelIdentity dispatches zeinity_settings_sync CustomEvent with updated settings object');

mockWin.removeEventListener(CHANNEL_IDENTITY_SYNC_EVENT, identityListener);
mockWin.removeEventListener(SETTINGS_SYNC_EVENT, settingsListener);

console.log('');

// ----------------------------------------------------------------
// SUITE 6: File Management & Identity Deduplication (useFiles)
// ----------------------------------------------------------------
console.log('[SUITE 6: File Management & Identity Deduplication]');

// 6.1 isChannelIdentityFile matching
assert(
  isChannelIdentityFile("IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity's_Channel.docx"),
  'isChannelIdentityFile matches full authoritative filename'
);
assert(
  isChannelIdentityFile("identitas_channel.docx"),
  'isChannelIdentityFile matches lowercase identitas'
);
assert(
  isChannelIdentityFile("zeinity's_channel_rules.docx"),
  'isChannelIdentityFile matches zeinity\'s_channel'
);
assert(
  isChannelIdentityFile("zeinity_channel_v2.docx"),
  'isChannelIdentityFile matches zeinity_channel'
);
assert(
  isChannelIdentityFile("zeinity-identity.docx"),
  'isChannelIdentityFile matches zeinity-identity'
);
assert(
  !isChannelIdentityFile("financial_forecast.xlsx"),
  'isChannelIdentityFile rejects non-identity file (financial_forecast.xlsx)'
);
assert(
  !isChannelIdentityFile("episode_1_script.docx"),
  'isChannelIdentityFile rejects episode_1_script.docx'
);

// 6.2 Deduplication & Ingestion of Authoritative Docx
// Setup initial storage with seed files
mockLocalStorage.clear();
mockLocalStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(SEED_FILES));

// Ingest the 36.7 KB extracted text using the same logic as useFiles.addFile
const initialFiles = JSON.parse(mockLocalStorage.getItem(FILES_STORAGE_KEY) || '[]');
assert(initialFiles.length === 1 && initialFiles[0].id === 'file-zeinity-identity', 'Initial state contains 1 seed identity file');

const uploadedMasterFile = {
  filename: "IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity's_Channel.docx",
  file_path: "/uploads/IDENTITAS_&_STRATEGI_CHANNEL_YOUTUBE_Zeinity's_Channel.docx",
  file_type: 'docx',
  extracted_text: extractedRawText, // The 36,700 char text
};

const isIdentity = isChannelIdentityFile(uploadedMasterFile.filename);
assert(isIdentity, 'Uploaded file recognized as channel identity file');

// Run simulated addFile logic
const existingIdx = initialFiles.findIndex(
  (f) =>
    f.filename.toLowerCase() === uploadedMasterFile.filename.toLowerCase() ||
    (isIdentity && (f.id === 'file-zeinity-identity' || isChannelIdentityFile(f.filename)))
);

assert(existingIdx === 0, 'Existing seed identity file located for in-place update (index 0)');

const updatedFiles = [...initialFiles];
updatedFiles[existingIdx] = {
  ...updatedFiles[existingIdx],
  filename: uploadedMasterFile.filename,
  file_type: uploadedMasterFile.file_type || updatedFiles[existingIdx].file_type,
  extracted_text: uploadedMasterFile.extracted_text,
  created_at: new Date().toISOString(),
};

mockLocalStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(updatedFiles));
if (isIdentity && uploadedMasterFile.extracted_text) {
  setChannelIdentity(uploadedMasterFile.extracted_text);
}

// Verify deduplication
const persistedFiles = JSON.parse(mockLocalStorage.getItem(FILES_STORAGE_KEY) || '[]');
assert(persistedFiles.length === 1, 'File list length remains exactly 1 (in-place replacement, NO duplicate seed)');
assert(persistedFiles[0].extracted_text.length === 36700, 'Persisted file contains full 36,700-character extracted text');

// Verify getChannelIdentity now returns the full 36,700 character extracted text
const activeIdentity = getChannelIdentity();
assert(activeIdentity.length === 36700, 'getChannelIdentity immediately returns the full 36,700-char master strategy');
assert(activeIdentity.includes('PILAR 1 — INTERNET & SOCIAL MEDIA'), 'Active identity contains extracted Pillar 1');
assert(activeIdentity.includes('AI mempercepat produksi. Manusia menentukan perspektif.'), 'Active identity contains AI philosophy rule');

console.log('');
console.log('================================================================');
console.log(`  TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log('================================================================');

if (failedCount > 0) {
  console.error('\nSummary of Failures:');
  failures.forEach((f) => console.error(f));
  process.exit(1);
} else {
  console.log('\nAll adversarial stress tests PASSED successfully!');
  process.exit(0);
}
