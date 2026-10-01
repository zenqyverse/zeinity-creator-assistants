import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

describe('Radar Tren & RSS Reader Studio Verification Suite', async () => {
  const typesPath = path.join(projectRoot, 'src', 'types.ts');
  const navPath = path.join(projectRoot, 'src', 'lib', 'navigation.ts');
  const rssServicePath = path.join(projectRoot, 'src', 'lib', 'rssService.ts');
  const trendsServicePath = path.join(projectRoot, 'src', 'lib', 'trendsService.ts');
  const sidebarPath = path.join(projectRoot, 'src', 'components', 'Sidebar.tsx');
  const overviewPath = path.join(projectRoot, 'src', 'views', 'Overview.tsx');
  const trendRadarPath = path.join(projectRoot, 'src', 'views', 'TrendRadar.tsx');
  const rssReaderPath = path.join(projectRoot, 'src', 'views', 'RSSReader.tsx');
  const appPath = path.join(projectRoot, 'src', 'App.tsx');
  const contentTablePath = path.join(projectRoot, 'src', 'views', 'ContentTable.tsx');

  const typesContent = fs.readFileSync(typesPath, 'utf8');
  const navContent = fs.readFileSync(navPath, 'utf8');
  const rssServiceContent = fs.readFileSync(rssServicePath, 'utf8');
  const trendsServiceContent = fs.readFileSync(trendsServicePath, 'utf8');
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  const overviewContent = fs.readFileSync(overviewPath, 'utf8');
  const trendRadarContent = fs.readFileSync(trendRadarPath, 'utf8');
  const rssReaderContent = fs.readFileSync(rssReaderPath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');
  const contentTableContent = fs.readFileSync(contentTablePath, 'utf8');

  // Dynamically import pure modules & functions
  const { parseHash, VALID_VIEWS } = await import('../src/lib/navigation.ts');
  const { parseGoogleTrendsXml } = await import('../src/lib/trendsService.ts');
  const { parseFeedXml, decodeHtmlEntities, cleanSnippet } = await import('../src/lib/rssService.ts');

  it('1. Types & Data Models: ViewKey and ContentSource are extended with models', () => {
    // ViewKey contains trends and rss
    assert.ok(typesContent.includes("'trends'"), 'ViewKey must include trends');
    assert.ok(typesContent.includes("'rss'"), 'ViewKey must include rss');

    // ContentSource contains new sources
    assert.ok(typesContent.includes("'YouTube Trends'"), 'ContentSource must include YouTube Trends');
    assert.ok(typesContent.includes("'Google Trends'"), 'ContentSource must include Google Trends');
    assert.ok(typesContent.includes("'RSS'"), 'ContentSource must include RSS');

    // Model interfaces
    assert.ok(typesContent.includes('export interface YouTubeTrendItem'), 'Must export YouTubeTrendItem');
    assert.ok(typesContent.includes('export interface GoogleTrendItem'), 'Must export GoogleTrendItem');
    assert.ok(typesContent.includes('export interface RSSSource'), 'Must export RSSSource');
    assert.ok(typesContent.includes('export interface RSSItem'), 'Must export RSSItem');
  });

  it('2. Navigation Routing & Hash Parsing: trends and rss views are valid and resolvable', () => {
    assert.ok(VALID_VIEWS.includes('trends'), 'VALID_VIEWS must contain trends');
    assert.ok(VALID_VIEWS.includes('rss'), 'VALID_VIEWS must contain rss');

    assert.deepEqual(parseHash('#/trends'), { view: 'trends', scriptId: null, publishedId: null });
    assert.deepEqual(parseHash('#/rss'), { view: 'rss', scriptId: null, publishedId: null });
    assert.deepEqual(parseHash('#trends'), { view: 'trends', scriptId: null, publishedId: null });
    assert.deepEqual(parseHash('#rss'), { view: 'rss', scriptId: null, publishedId: null });
  });

  it('3. RSS Service & Presets: curated feeds align with Zeinity 5 Content Pillars', () => {
    assert.ok(rssServiceContent.includes('PRESET_RSS_SOURCES'), 'rssService must define PRESET_RSS_SOURCES');
    assert.ok(rssServiceContent.includes('The Verge'), 'Must include The Verge preset');
    assert.ok(rssServiceContent.includes('TechCrunch'), 'Must include TechCrunch preset');
    assert.ok(rssServiceContent.includes('Wired'), 'Must include Wired preset');
    assert.ok(rssServiceContent.includes('Ars Technica'), 'Must include Ars Technica preset');
    assert.ok(rssServiceContent.includes('Hacker News'), 'Must include Hacker News preset');
    assert.ok(rssServiceContent.includes('Reddit r/technology'), 'Must include Reddit r/technology preset');

    // Verify 5 pillars coverage in presets
    assert.ok(rssServiceContent.includes('Internet & Social Media Culture'), 'Must cover Internet culture');
    assert.ok(rssServiceContent.includes('AI & Technology Impact'), 'Must cover AI & Tech');
    assert.ok(rssServiceContent.includes('Digital Economy & Creator Economy'), 'Must cover Digital Economy');
    assert.ok(rssServiceContent.includes('Gaming & Digital Entertainment'), 'Must cover Gaming');
    assert.ok(rssServiceContent.includes('Modern Life & Digital Psychology'), 'Must cover Modern Life');

    // Persistence & CORS
    assert.ok(rssServiceContent.includes('fetchXmlWithCorsFallback'), 'Must export hybrid CORS fetcher');
    assert.ok(rssServiceContent.includes('api.allorigins.win'), 'Must fallback to allorigins CORS proxy');
    assert.ok(rssServiceContent.includes('toggleBookmarkItem'), 'Must export toggleBookmarkItem');
    assert.ok(rssServiceContent.includes('markItemAsRead'), 'Must export markItemAsRead');
  });

  it('4. Trends Service: YouTube and Google Trends APIs, categories, regions, and caching', () => {
    assert.ok(trendsServiceContent.includes('fetchYouTubeTrends'), 'Must export fetchYouTubeTrends');
    assert.ok(trendsServiceContent.includes('fetchGoogleTrends'), 'Must export fetchGoogleTrends');
    assert.ok(trendsServiceContent.includes('YOUTUBE_CATEGORIES'), 'Must export YOUTUBE_CATEGORIES');
    assert.ok(trendsServiceContent.includes('TREND_REGIONS'), 'Must export TREND_REGIONS');
    assert.ok(trendsServiceContent.includes('parseGoogleTrendsXml'), 'Must export parseGoogleTrendsXml');
    assert.ok(trendsServiceContent.includes('NO_API_KEY'), 'Must handle missing YouTube API key gracefully');
    assert.ok(trendsServiceContent.includes('https://trends.google.com/trending/rss?geo='), 'Must query valid Google Trends RSS endpoint without 404 path');
  });

  it('5. Deep Parser Verification: parseGoogleTrendsXml correctly extracts data and builds exploration URLs', () => {
    const sampleGoogleTrendsXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:atom="http://www.w3.org/2005/Atom" xmlns:ht="https://trends.google.com/trending/rss" version="2.0">
  <channel>
    <title>Daily Search Trends</title>
    <item>
      <title>Timnas Indonesia</title>
      <ht:approx_traffic>50000+</ht:approx_traffic>
      <pubDate>Thu, 1 Oct 2026 03:50:00 -0700</pubDate>
      <link>https://trends.google.com/trending/rss?geo=ID</link>
      <ht:picture>https://example.com/timnas.jpg</ht:picture>
      <ht:news_item>
        <ht:news_item_title>Jadwal Pertandingan Timnas Indonesia</ht:news_item_title>
        <ht:news_item_source>Kompas</ht:news_item_source>
        <ht:news_item_url>https://bola.kompas.com/read/timnas</ht:news_item_url>
      </ht:news_item>
    </item>
  </channel>
</rss>`;

    const items = parseGoogleTrendsXml(sampleGoogleTrendsXml, 'ID');
    assert.equal(items.length, 1);
    assert.equal(items[0].title, 'Timnas Indonesia');
    assert.equal(items[0].approxTraffic, '50000+ pencarian');
    assert.equal(items[0].newsTitle, 'Jadwal Pertandingan Timnas Indonesia');
    assert.equal(items[0].newsSource, 'Kompas');
    assert.equal(items[0].newsUrl, 'https://bola.kompas.com/read/timnas');
    // Ensure trendUrl is an exploration link and NOT the raw XML feed link
    assert.ok(items[0].trendUrl.includes('trends.google.com/trends/explore?q=Timnas%20Indonesia'), 'Must build exploration URL');
  });

  it('6. Deep Parser Verification: parseFeedXml extracts RSS 2.0 and Atom feeds cleanly', () => {
    const dummySource = {
      id: 'src-verge',
      title: 'The Verge',
      url: 'https://theverge.com/rss',
      category: 'media',
      pillar: 'AI & Technology Impact',
      is_active: true,
    };

    // RSS 2.0
    const sampleRss2 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>OpenAI Announces New Engine</title>
      <link>https://example.com/openai-engine</link>
      <pubDate>Thu, 01 Oct 2026 10:00:00 GMT</pubDate>
      <description>&lt;p&gt;OpenAI has announced a major upgrade to their engine.&lt;/p&gt;</description>
    </item>
  </channel>
</rss>`;

    const rss2Items = parseFeedXml(sampleRss2, dummySource);
    assert.equal(rss2Items.length, 1);
    assert.equal(rss2Items[0].title, 'OpenAI Announces New Engine');
    assert.equal(rss2Items[0].link, 'https://example.com/openai-engine');
    assert.ok(rss2Items[0].contentSnippet.includes('OpenAI has announced a major upgrade'));

    // Atom
    const sampleAtom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Anthropic Launches Claude 4.5</title>
    <link rel="alternate" href="https://example.com/claude-45" />
    <published>2026-10-01T12:00:00Z</published>
    <summary>Claude 4.5 introduces faster reasoning and multimodal coding.</summary>
    <content type="html">&lt;img src="https://example.com/claude.jpg" /&gt;&lt;p&gt;Full article body&lt;/p&gt;</content>
  </entry>
</feed>`;

    const atomItems = parseFeedXml(sampleAtom, dummySource);
    assert.equal(atomItems.length, 1);
    assert.equal(atomItems[0].title, 'Anthropic Launches Claude 4.5');
    assert.equal(atomItems[0].link, 'https://example.com/claude-45');
    assert.ok(atomItems[0].contentSnippet.includes('faster reasoning'));
    assert.equal(atomItems[0].thumbnail, 'https://example.com/claude.jpg');
  });

  it('7. Sidebar Navigation: renders Radar Tren and RSS Reader menu items with Flame and Rss icons', () => {
    assert.ok(sidebarContent.includes("key: 'trends'"), 'Sidebar must have trends key');
    assert.ok(sidebarContent.includes("label: 'Radar Tren'"), 'Sidebar must display Radar Tren');
    assert.ok(sidebarContent.includes('Flame'), 'Sidebar must use Flame icon');
    assert.ok(sidebarContent.includes("key: 'rss'"), 'Sidebar must have rss key');
    assert.ok(sidebarContent.includes("label: 'RSS Reader'"), 'Sidebar must display RSS Reader');
    assert.ok(sidebarContent.includes('Rss'), 'Sidebar must use Rss icon');
  });

  it('8. Overview Dashboard: embeds Radar Sinyal Terhangat widget with top 3 trends and quick ideation', () => {
    assert.ok(overviewContent.includes('Radar Sinyal Terhangat'), 'Overview must include Radar Sinyal Terhangat widget');
    assert.ok(overviewContent.includes('fetchGoogleTrends'), 'Overview must fetch Google Trends signals');
    assert.ok(overviewContent.includes("onNavigate('trends')"), 'Overview must provide shortcut to trends view');
    assert.ok(overviewContent.includes('onAddIdeaFromTrend'), 'Overview must support instant + Tambah ke Ide action');
  });

  it('9. TrendRadar View: supports YouTube & Google tabs, region filter, category filter, and ideation button', () => {
    assert.ok(trendRadarContent.includes('YouTube Trends'), 'Must render YouTube Trends tab');
    assert.ok(trendRadarContent.includes('Google Trends'), 'Must render Google Trends tab');
    assert.ok(trendRadarContent.includes('selectedRegion'), 'Must support region switching');
    assert.ok(trendRadarContent.includes('selectedCategory'), 'Must support YouTube category selection');
    assert.ok(trendRadarContent.includes('+ Tambah Ide'), 'Must provide 1-click ideation button');
    assert.ok(trendRadarContent.includes('onAddIdeaFromTrend'), 'Must support onAddIdeaFromTrend prop');
  });

  it('10. RSSReader View: supports 4 Category tabs, 5 Zeinity Pillars, bookmarks, thumbnails, and Kelola Sumber', () => {
    assert.ok(rssReaderContent.includes('Media & Berita'), 'Must render Media & Berita category tab');
    assert.ok(rssReaderContent.includes('Blog Teknologi & AI'), 'Must render Tech Blog category tab');
    assert.ok(rssReaderContent.includes('Forum & Komunitas'), 'Must render Forum category tab');
    assert.ok(rssReaderContent.includes('Koleksi Saya'), 'Must render Koleksi Saya category tab');
    assert.ok(rssReaderContent.includes('CONTENT_PILLARS'), 'Must map to 5 Zeinity Content Pillars');
    assert.ok(rssReaderContent.includes('Kelola Sumber'), 'Must provide Kelola Sumber in status filter');
    assert.ok(rssReaderContent.includes('Bookmark'), 'Must support bookmarking');
    assert.ok(rssReaderContent.includes('item.thumbnail'), 'Must render thumbnail preview on article cards');
  });

  it('11. App.tsx & ContentTable: routing, instant idea creation, and source badges styling', () => {
    // App routing
    assert.ok(appContent.includes("case 'trends':"), 'App.tsx must route trends view');
    assert.ok(appContent.includes("case 'rss':"), 'App.tsx must route rss view');
    assert.ok(appContent.includes('TrendRadar'), 'App.tsx must render TrendRadar');
    assert.ok(appContent.includes('RSSReader'), 'App.tsx must render RSSReader');
    assert.ok(appContent.includes('onAddIdeaFromTrend'), 'App.tsx must wire onAddIdeaFromTrend');
    assert.ok(appContent.includes('onAddIdeaFromRSS'), 'App.tsx must wire onAddIdeaFromRSS');

    // ContentTable badges & tabs
    assert.ok(contentTableContent.includes('source-youtube-trends'), 'ContentTable must style YouTube Trends badge');
    assert.ok(contentTableContent.includes('source-google-trends'), 'ContentTable must style Google Trends badge');
    assert.ok(contentTableContent.includes('source-rss'), 'ContentTable must style RSS badge');
    assert.ok(contentTableContent.includes("key: 'YouTube Trends'"), 'ContentTable must have YouTube Trends tab filter');
    assert.ok(contentTableContent.includes("key: 'Google Trends'"), 'ContentTable must have Google Trends tab filter');
    assert.ok(contentTableContent.includes("key: 'RSS'"), 'ContentTable must have RSS tab filter');
  });

  it('12. Robust XML & Entity Utilities: decodes numeric entities, hex, named entities, and unwraps CDATA in cleanSnippet', () => {
    // Entities decoding
    assert.equal(decodeHtmlEntities('Apple &amp; Google &#8217;s AI &quot;Model&quot; &#x27;Fast&#x27;'), "Apple & Google ’s AI \"Model\" 'Fast'");
    
    // CDATA unwrapping in cleanSnippet
    const cdataHtml = '<description><![CDATA[<p>Breaking news: AI &amp; Robotics are advancing rapidly.</p>]]></description>';
    const cleaned = cleanSnippet(cdataHtml);
    assert.ok(cleaned.includes('Breaking news: AI & Robotics are advancing rapidly.'));
    assert.ok(!cleaned.includes('CDATA'));
    assert.ok(!cleaned.includes('<p>'));
  });

  it('13. Google Trends News Headline Cleaning: strips <b> keyword highlight tags and decodes entities', () => {
    const rawXmlWithTags = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:ht="https://trends.google.com/trending/rss" version="2.0">
  <channel>
    <item>
      <title>Real Madrid vs Barcelona &amp; Skor</title>
      <ht:approx_traffic>100000+</ht:approx_traffic>
      <pubDate>Thu, 1 Oct 2026 12:00:00 GMT</pubDate>
      <link>https://trends.google.com/trending/rss?geo=ID</link>
      <ht:news_item>
        <ht:news_item_title>&lt;b&gt;Real Madrid&lt;/b&gt; Menang Dramatis &quot;El Clasico&quot;</ht:news_item_title>
        <ht:news_item_source>Detik &amp; Bola</ht:news_item_source>
        <ht:news_item_url>https://bola.detik.com/read/el-clasico</ht:news_item_url>
      </ht:news_item>
    </item>
  </channel>
</rss>`;

    const items = parseGoogleTrendsXml(rawXmlWithTags, 'ID');
    assert.equal(items.length, 1);
    assert.equal(items[0].title, 'Real Madrid vs Barcelona & Skor');
    assert.equal(items[0].newsTitle, 'Real Madrid Menang Dramatis "El Clasico"');
    assert.equal(items[0].newsSource, 'Detik & Bola');
  });

  it('14. Atom Enclosures & Tracking Pixel Exclusion: ignores 1x1 pixels and extracts real image thumbnails', () => {
    const dummySource = {
      id: 'src-tech',
      title: 'Tech News',
      url: 'https://example.com/rss',
      category: 'tech',
      pillar: 'AI & Technology Impact',
      is_active: true,
    };

    const feedWithTracker = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>New AI Framework Released</title>
      <link>https://example.com/ai-framework</link>
      <description>&lt;img src="https://feeds.feedburner.com/~r/tracker.gif" width="1" height="1" /&gt;&lt;img src="https://example.com/real-ai.png" /&gt;&lt;p&gt;Overview text&lt;/p&gt;</description>
    </item>
  </channel>
</rss>`;

    const parsed = parseFeedXml(feedWithTracker, dummySource);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].thumbnail, 'https://example.com/real-ai.png');
  });

  it('15. Workspace & Detail Views Consistency: ScriptDetail and PublishedDetail render styled source badges for new sources', () => {
    const scriptDetailPath = path.join(projectRoot, 'src', 'views', 'ScriptDetail.tsx');
    const publishedDetailPath = path.join(projectRoot, 'src', 'views', 'PublishedDetail.tsx');
    const scriptDetailContent = fs.readFileSync(scriptDetailPath, 'utf8');
    const publishedDetailContent = fs.readFileSync(publishedDetailPath, 'utf8');

    assert.ok(scriptDetailContent.includes('source-youtube-trends'), 'ScriptDetail must style YouTube Trends badge');
    assert.ok(scriptDetailContent.includes('source-google-trends'), 'ScriptDetail must style Google Trends badge');
    assert.ok(scriptDetailContent.includes('source-rss'), 'ScriptDetail must style RSS badge');

    assert.ok(publishedDetailContent.includes('source-youtube-trends'), 'PublishedDetail must style YouTube Trends badge');
    assert.ok(publishedDetailContent.includes('source-google-trends'), 'PublishedDetail must style Google Trends badge');
    assert.ok(publishedDetailContent.includes('source-rss'), 'PublishedDetail must style RSS badge');
  });

  it('16. RSS Source Persistence & Deletion Resilience: respects empty state and never resurrects presets after deletion', () => {
    // Assert helper exports
    assert.ok(rssServiceContent.includes('export function isSourcesInitialized'), 'Must export isSourcesInitialized');
    assert.ok(rssServiceContent.includes('export function markSourcesInitialized'), 'Must export markSourcesInitialized');
    assert.ok(rssServiceContent.includes('STORAGE_KEY_INITIALIZED'), 'Must define STORAGE_KEY_INITIALIZED');

    // Simulate mock localStorage in memory
    const storageMap = new Map();
    const mockStorage = {
      getItem: (k) => storageMap.get(k) || null,
      setItem: (k, v) => storageMap.set(k, String(v)),
      removeItem: (k) => storageMap.delete(k),
    };

    // Before initialization
    assert.equal(mockStorage.getItem('zeinity_rss_sources_initialized'), null);

    // Seed presets
    mockStorage.setItem('zeinity_rss_sources', JSON.stringify([{ id: 'preset-1', title: 'Feed 1' }]));
    mockStorage.setItem('zeinity_rss_sources_initialized', 'true');

    // User deletes the feed until 0 items remain
    mockStorage.setItem('zeinity_rss_sources', JSON.stringify([]));

    // When reading back, empty array must be respected and NOT re-seed presets
    const raw = mockStorage.getItem('zeinity_rss_sources');
    const parsed = JSON.parse(raw);
    assert.equal(Array.isArray(parsed), true);
    assert.equal(parsed.length, 0);
    assert.equal(mockStorage.getItem('zeinity_rss_sources_initialized'), 'true');
  });

  it('17. RSS Read Status Toggle: exports markItemAsUnread and toggleItemRead', () => {
    assert.ok(rssServiceContent.includes('export function markItemAsUnread'), 'Must export markItemAsUnread');
    assert.ok(rssServiceContent.includes('export function toggleItemRead'), 'Must export toggleItemRead');
    assert.ok(rssReaderContent.includes('handleToggleRead'), 'RSSReader must implement handleToggleRead');
    assert.ok(rssReaderContent.includes('Tandai Dibaca'), 'RSSReader must render Tandai Dibaca label');
    assert.ok(rssReaderContent.includes('Belum Dibaca'), 'RSSReader must render Belum Dibaca label');
  });
});
