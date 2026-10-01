import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Collapsible Cards in Pipeline Naskah & Draft Studio Verification Suite', () => {
  const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
  const cssPath = path.join(projectRoot, 'src', 'index.css');

  const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf-8');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('Pipeline Naskah: defines collapsible states and auto-collapse logic', () => {
    assert.ok(
      scriptDetailContent.includes('const [isResearchCollapsed, setIsResearchCollapsed] = useState'),
      'ScriptDetail must define isResearchCollapsed state'
    );
    assert.ok(
      scriptDetailContent.includes('const [isHandoffCollapsed, setIsHandoffCollapsed] = useState'),
      'ScriptDetail must define isHandoffCollapsed state'
    );
    assert.ok(
      scriptDetailContent.includes('prevHandoffVisibleRef'),
      'ScriptDetail must track previous handoff visibility'
    );
    assert.ok(
      scriptDetailContent.includes('!prevHandoffVisibleRef.current && isHandoffVisible'),
      'ScriptDetail must auto-collapse Research Brief when Handoff newly appears'
    );
  });

  it('Pipeline Naskah: supports dynamic double-click toggle and collapse button on cards', () => {
    assert.ok(
      scriptDetailContent.includes('onDoubleClick={() => setIsResearchCollapsed'),
      'Research Brief card must support double click to toggle collapse'
    );
    assert.ok(
      scriptDetailContent.includes("isResearchCollapsed ? 'collapsed' : ''"),
      'Research Brief card must apply collapsed class when collapsed'
    );
    assert.ok(
      scriptDetailContent.includes("isResearchCollapsed ? 'Buka' : 'Susut'"),
      'Must provide Buka / Susut button for Research Brief'
    );
    assert.ok(
      scriptDetailContent.includes('onDoubleClick={() => setIsHandoffCollapsed'),
      'Scriptwriter Handoff card must support double click to toggle collapse'
    );
    assert.ok(
      scriptDetailContent.includes("isHandoffCollapsed ? 'collapsed' : ''"),
      'Scriptwriter Handoff card must apply collapsed class when collapsed'
    );
    assert.ok(
      scriptDetailContent.includes("isHandoffCollapsed ? 'Buka' : 'Susut'"),
      'Must provide Buka / Susut button for Scriptwriter Handoff'
    );
  });

  it('Draft Studio: defines collapsible states for input area and result panels', () => {
    assert.ok(
      scriptDetailContent.includes('const [isScriptInputCollapsed, setIsScriptInputCollapsed] = useState'),
      'ScriptDetail must define isScriptInputCollapsed state'
    );
    assert.ok(
      scriptDetailContent.includes('const [isAuditResultsCollapsed, setIsAuditResultsCollapsed] = useState'),
      'ScriptDetail must define isAuditResultsCollapsed state'
    );
    assert.ok(
      scriptDetailContent.includes('const [isTitlesCollapsed, setIsTitlesCollapsed] = useState'),
      'ScriptDetail must define isTitlesCollapsed state'
    );
  });

  it('Draft Studio: supports collapsible input area with preview snippet and double-click', () => {
    assert.ok(
      scriptDetailContent.includes('onDoubleClick={() => setIsScriptInputCollapsed(false)}'),
      'Collapsed input card must expand on double click'
    );
    assert.ok(
      scriptDetailContent.includes('Draf Naskah Video'),
      'Must render Draf Naskah Video header in collapsed card'
    );
    assert.ok(
      scriptDetailContent.includes('setIsScriptInputCollapsed(true)'),
      'Must provide button to collapse input area'
    );
  });

  it('Draft Studio: smart priority and coordination on audit and apply to draft', () => {
    // When audit completes: input collapses, audit opens
    assert.ok(
      scriptDetailContent.includes('setIsScriptInputCollapsed(true);\n      setIsAuditResultsCollapsed(false);'),
      'Running audit must open audit and collapse input'
    );

    // When applying to draft: input opens, source result collapses
    assert.ok(
      scriptDetailContent.includes('setIsScriptInputCollapsed(false);'),
      'handleApplyToDraft must un-collapse script input editor'
    );
    assert.ok(
      scriptDetailContent.includes("if (key === 'audit') {\n      setIsAuditResultsCollapsed(true);"),
      'handleApplyToDraft must collapse audit results when applied'
    );
    assert.ok(
      !scriptDetailContent.includes('setIsVisualCueResultsCollapsed'),
      'Visual cue results collapsed state must be removed per user request'
    );
  });

  it('Draft Studio: result panels have integrated headers, double-click, and toggle buttons', () => {
    assert.ok(
      scriptDetailContent.includes('onDoubleClick={() => setIsAuditResultsCollapsed'),
      'Audit results card must support double click to toggle collapse'
    );
    assert.ok(
      scriptDetailContent.includes("isAuditResultsCollapsed ? 'Buka' : 'Susut'"),
      'Audit results card must have Buka / Susut button'
    );
    assert.ok(
      scriptDetailContent.includes('onDoubleClick={() => setIsTitlesCollapsed'),
      'Titles recommendation card must support double click to toggle collapse'
    );
    assert.ok(
      scriptDetailContent.includes("isTitlesCollapsed ? 'Buka' : 'Susut'"),
      'Titles recommendation card must have Buka / Susut button'
    );
  });

  it('index.css contains styles for collapsible sections, audit panels, and compact pill', () => {
    assert.ok(
      cssContent.includes('.collapsible-section'),
      'CSS must define .collapsible-section transition'
    );
    assert.ok(
      cssContent.includes('.collapsible-section.collapsed'),
      'CSS must define .collapsible-section.collapsed compact rectangular styling'
    );
    assert.ok(
      cssContent.includes('.collapsed-pill'),
      'CSS must define .collapsed-pill styling'
    );
    assert.ok(
      cssContent.includes('.audit-results-panel.collapsible-section.collapsed'),
      'CSS must define .audit-results-panel.collapsible-section.collapsed styling'
    );
    assert.ok(
      cssContent.includes('.audit-results-panel.visual-results-panel.collapsible-section.collapsed'),
      'CSS must define .audit-results-panel.visual-results-panel.collapsible-section.collapsed styling'
    );
  });
});
