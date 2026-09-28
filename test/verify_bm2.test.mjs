import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Milestone BM-2 Verification Suite', () => {
  it('Task 1: AI Prompt Framework enforces 5-stage strategic sequence', () => {
    const geminiPath = path.join(projectRoot, 'src', 'lib', 'gemini.ts');
    const content = fs.readFileSync(geminiPath, 'utf8');

    assert.ok(content.includes('Phenomenon'), 'Prompt must include Phenomenon');
    assert.ok(content.includes('Mechanism'), 'Prompt must include Mechanism');
    assert.ok(content.includes('Incentive'), 'Prompt must include Incentive');
    assert.ok(content.includes('Human Impact'), 'Prompt must include Human Impact');
    assert.ok(content.includes('Counter View'), 'Prompt must include Counter View');
    assert.ok(
      content.includes('Phenomenon -> Mechanism -> Incentive -> Human Impact -> Counter View'),
      'Prompt must strictly enforce the sequential framework order'
    );
  });

  it('Task 2: 5 Content Pillars are authoritative across AddIdeaModal and ContentTable', () => {
    const expectedPillars = [
      'Internet & Social Media Culture',
      'AI & Technology Impact',
      'Digital Economy & Creator Economy',
      'Gaming & Digital Entertainment',
      'Modern Life & Digital Psychology',
    ];

    const addIdeaPath = path.join(projectRoot, 'src', 'components', 'AddIdeaModal.tsx');
    const addIdeaContent = fs.readFileSync(addIdeaPath, 'utf8');
    for (const pillar of expectedPillars) {
      assert.ok(addIdeaContent.includes(pillar), `AddIdeaModal must include pillar "${pillar}"`);
    }

    const tablePath = path.join(projectRoot, 'src', 'views', 'ContentTable.tsx');
    const tableContent = fs.readFileSync(tablePath, 'utf8');
    for (const pillar of expectedPillars) {
      assert.ok(tableContent.includes(pillar), `ContentTable must include pillar "${pillar}"`);
    }
  });

  it('Task 3: Pipeline Flow Blocker is resolved for Researching items and Reset Filter is active', () => {
    const tablePath = path.join(projectRoot, 'src', 'views', 'ContentTable.tsx');
    const tableContent = fs.readFileSync(tablePath, 'utf8');

    assert.ok(
      tableContent.includes("case 'Researching':"),
      'ContentTable must have Researching status case'
    );
    assert.ok(
      tableContent.includes('Buka Workspace'),
      'ContentTable must render Buka Workspace button for Researching'
    );
    assert.ok(
      tableContent.includes('Reset Filter'),
      'Filter button must support Reset Filter functionality'
    );
    assert.ok(
      tableContent.includes("item.status === 'Researching'"),
      'validation tab must include Researching items'
    );
  });

  it('Task 4: Reactive Script Detail & Published Detail state in App.tsx', () => {
    const appPath = path.join(projectRoot, 'src', 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf8');

    assert.ok(
      appContent.includes('items.find((i) => i.id === scriptItem?.id) || scriptItem'),
      'App.tsx must derive activeScriptItem from live items state'
    );
    assert.ok(
      appContent.includes('items.find((i) => i.id === publishedItem?.id) || publishedItem'),
      'App.tsx must derive activePublishedItem from live items state'
    );
  });

  it('Task 5: Real Persistent Published Metrics & Editability', () => {
    const typesPath = path.join(projectRoot, 'src', 'types.ts');
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    assert.ok(typesContent.includes('views?: number | null;'), 'ContentItem must include views');
    assert.ok(typesContent.includes('likes?: number | null;'), 'ContentItem must include likes');
    assert.ok(typesContent.includes('comments?: number | null;'), 'ContentItem must include comments');
    assert.ok(typesContent.includes('published_at?: string | null;'), 'ContentItem must include published_at');

    const publishedPath = path.join(projectRoot, 'src', 'views', 'PublishedDetail.tsx');
    const publishedContent = fs.readFileSync(publishedPath, 'utf8');
    assert.ok(!publishedContent.includes('Math.random()'), 'Math.random() must be completely eliminated');
    assert.ok(publishedContent.includes('onUpdate'), 'PublishedDetail must accept and use onUpdate for persistence');
    assert.ok(publishedContent.includes('Simpan Metrik'), 'PublishedDetail must have Simpan Metrik capability');
  });

  it('Task 6: Real Dynamic Analytics replaces static values', () => {
    const analyticsPath = path.join(projectRoot, 'src', 'views', 'Analytics.tsx');
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');

    assert.ok(!analyticsContent.includes('48.2K'), 'Static 48.2K must be removed');
    assert.ok(!analyticsContent.includes('3.2h'), 'Static 3.2h must be removed');
    assert.ok(analyticsContent.includes('trailingMonths'), 'Monthly chart must use trailing calendar months');
    assert.ok(analyticsContent.includes('totalViews'), 'Total views must be dynamically computed');
    assert.ok(analyticsContent.includes('avgEngagement'), 'Avg engagement must be dynamically computed');
  });

  it('Task 7: Real Date-Windowed Overview Deltas replace multiplier formulas', () => {
    const overviewPath = path.join(projectRoot, 'src', 'views', 'Overview.tsx');
    const overviewContent = fs.readFileSync(overviewPath, 'utf8');

    assert.ok(!overviewContent.includes('total * 0.15'), 'Formula multiplier 0.15 must be removed');
    assert.ok(!overviewContent.includes('production * 0.3'), 'Formula multiplier 0.3 must be removed');
    assert.ok(!overviewContent.includes('published * 0.2'), 'Formula multiplier 0.2 must be removed');
    assert.ok(overviewContent.includes('ideasThisWeek'), 'Ideas this week must be date-calculated');
    assert.ok(overviewContent.includes('ideasToday'), 'Ideas today must be date-calculated');
    assert.ok(overviewContent.includes('publishedThisMonth'), 'Published this month must be date-calculated');
  });

  it('Task 8: Settings & Topbar fixes and Multi-Provider Model Customization', () => {
    const topbarPath = path.join(projectRoot, 'src', 'components', 'Topbar.tsx');
    const topbarContent = fs.readFileSync(topbarPath, 'utf8');
    assert.ok(topbarContent.includes('isGatewayOnline'), 'Topbar must have dynamic isGatewayOnline');

    const settingsPath = path.join(projectRoot, 'src', 'views', 'Settings.tsx');
    const settingsContent = fs.readFileSync(settingsPath, 'utf8');
    assert.ok(settingsContent.includes("isPassword = p.key !== 'ollama_endpoint'"), 'ollama_endpoint must not be masked as password');
    assert.ok(settingsContent.includes('Auto Import Models'), 'Settings must include Auto Import Models button');
    assert.ok(settingsContent.includes('gemini_model_version'), 'Settings must support gemini_model_version');
    assert.ok(settingsContent.includes('openrouter_model_version'), 'Settings must support openrouter_model_version');
    assert.ok(settingsContent.includes('ollama_model_version'), 'Settings must support ollama_model_version');
  });
});
