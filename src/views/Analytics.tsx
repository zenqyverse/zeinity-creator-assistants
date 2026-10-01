import { TrendingUp, Eye, ThumbsUp, Clock } from 'lucide-react';
import type { ContentItem, ContentStatus } from '@/types';
import { CONTENT_PILLARS, normalizeContentPillar } from '@/types';

interface AnalyticsProps {
  items: ContentItem[];
}

export default function Analytics({ items }: AnalyticsProps) {
  const byStatus: Record<ContentStatus, number> = {
    Idea: items.filter((i) => i.status === 'Idea').length,
    Validating: items.filter((i) => i.status === 'Validating').length,
    Researching: items.filter((i) => i.status === 'Researching').length,
    Scripting: items.filter((i) => i.status === 'Scripting').length,
    Thumbnailing: items.filter((i) => i.status === 'Thumbnailing').length,
    Published: items.filter((i) => i.status === 'Published').length,
  };

  const byCategory: Record<string, number> = {};
  CONTENT_PILLARS.forEach((p) => {
    byCategory[p] = 0;
  });
  items.forEach((item) => {
    const cat = normalizeContentPillar(item.category);
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  const bySource: Record<string, number> = {
    Web: items.filter((i) => i.source === 'Web').length,
    Telegram: items.filter((i) => i.source === 'Telegram').length,
    'YouTube Trends': items.filter((i) => i.source === 'YouTube Trends').length,
    'Google Trends': items.filter((i) => i.source === 'Google Trends').length,
    RSS: items.filter((i) => i.source === 'RSS').length,
  };

  const maxCat = Math.max(...Object.values(byCategory), 1);
  const catColors = ['#4fe8ff', '#9985ff', '#53f2ad', '#f9c74f', '#ff7694'];

  const totalViews = items.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalLikes = items.reduce((sum, item) => sum + (item.likes || 0), 0);
  const totalComments = items.reduce((sum, item) => sum + (item.comments || 0), 0);

  const formattedViews = totalViews >= 1000000 
    ? `${(totalViews / 1000000).toFixed(1)}M` 
    : totalViews >= 1000 
    ? `${(totalViews / 1000).toFixed(1)}K` 
    : `${totalViews}`;

  const avgEngagement = totalViews > 0 
    ? `${(((totalLikes + totalComments) / totalViews) * 100).toFixed(1)}%` 
    : '0.0%';

  const publishedItems = items.filter(
    (i) => i.status === 'Published' && i.created_at && i.published_at
  );
  let avgProdHours = 0;
  if (publishedItems.length > 0) {
    let validCount = 0;
    const totalHours = publishedItems.reduce((acc, cur) => {
      if (!cur.published_at || !cur.created_at) return acc;
      const end = new Date(cur.published_at).getTime();
      const start = new Date(cur.created_at).getTime();
      if (isNaN(end) || isNaN(start)) return acc;
      const diffMs = Math.max(0, end - start);
      validCount++;
      return acc + diffMs / 3600000;
    }, 0);
    avgProdHours = validCount > 0 ? totalHours / validCount : 0;
  }
  const formattedProdTime = avgProdHours > 0
    ? avgProdHours >= 24
      ? `${(avgProdHours / 24).toFixed(1)}d`
      : `${avgProdHours.toFixed(1)}h`
    : '0h';

  const inProduction = byStatus.Researching + byStatus.Scripting + byStatus.Thumbnailing;
  const publishedCount = byStatus.Published;
  const activeRate = items.length > 0 ? Math.round(((inProduction + publishedCount) / items.length) * 100) : 0;

  // Real trailing 6 months dynamic production data from items
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const trailingMonths: { key: string; month: string; value: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mIndex = d.getMonth();
    const year = d.getFullYear();
    const monthKey = `${year}-${String(mIndex + 1).padStart(2, '0')}`;
    trailingMonths.push({
      key: monthKey,
      month: monthNames[mIndex],
      value: 0,
    });
  }

  const producedStatuses: ContentStatus[] = ['Scripting', 'Thumbnailing', 'Published'];
  const producedItems = items.filter((item) => producedStatuses.includes(item.status));

  producedItems.forEach((item) => {
    const timestamp = (item.status === 'Published' && item.published_at) ? item.published_at : item.created_at;
    if (!timestamp) return;
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const found = trailingMonths.find((m) => m.key === monthKey);
    if (found) {
      found.value += 1;
    }
  });

  const monthlyData = trailingMonths.map((d) => ({ month: d.month, value: d.value }));
  const maxMonthly = Math.max(...monthlyData.map((d) => d.value), 1);

  // Donut chart for status distribution
  const total = items.length || 1;
  const statusColors: Record<string, string> = {
    Idea: '#b8ccdf',
    Validating: '#f9c74f',
    Researching: '#4fe8ff',
    Scripting: '#53f2ad',
    Thumbnailing: '#ff9f43',
    Published: '#9985ff',
  };

  let cumulativePct = 0;
  const donutSegments = Object.entries(byStatus).map(([status, count]) => {
    const pct = (count / total) * 100;
    const segment = {
      status,
      count,
      pct,
      start: cumulativePct,
      color: statusColors[status],
    };
    cumulativePct += pct;
    return segment;
  });

  return (
    <main className="main-content">
      <section className="hero">
        <div>
          <p className="eyebrow">Performa Konten</p>
          <h1>Analytics</h1>
          <p className="subtitle">
            Pantau performa pipeline konten dan tren produksi dari waktu ke waktu.
          </p>
        </div>
      </section>

      {/* Top metrics */}
      <section className="metrics" aria-label="Metrik analitik">
        <article className="metric-card glass" style={{ ['--metric' as string]: '#4fe8ff' }}>
          <div className="metric-top">
            <span>Total Views</span>
            <span className="metric-icon"><Eye size={16} /></span>
          </div>
          <div className="metric-value">{formattedViews}</div>
          <div className="metric-change">
            {totalViews > 0 ? `Dari ${publishedCount} konten published` : 'Belum ada data views'}
          </div>
        </article>
        <article className="metric-card glass" style={{ ['--metric' as string]: '#53f2ad' }}>
          <div className="metric-top">
            <span>Avg Engagement</span>
            <span className="metric-icon"><ThumbsUp size={16} /></span>
          </div>
          <div className="metric-value">{avgEngagement}</div>
          <div className="metric-change">{totalLikes.toLocaleString()} likes · {totalComments.toLocaleString()} comments</div>
        </article>
        <article className="metric-card glass" style={{ ['--metric' as string]: '#f9c74f' }}>
          <div className="metric-top">
            <span>Avg Production Time</span>
            <span className="metric-icon"><Clock size={16} /></span>
          </div>
          <div className="metric-value">{formattedProdTime}</div>
          <div className="metric-change">{publishedItems.length} video published diukur</div>
        </article>
        <article className="metric-card glass" style={{ ['--metric' as string]: '#9985ff' }}>
          <div className="metric-top">
            <span>Production Velocity</span>
            <span className="metric-icon"><TrendingUp size={16} /></span>
          </div>
          <div className="metric-value">{inProduction} aktif</div>
          <div className="metric-change">{publishedCount} published · {activeRate}% pipeline</div>
        </article>
      </section>

      {/* Charts */}
      <section className="analytics-grid" style={{ marginTop: 18 }}>
        {/* Monthly production chart */}
        <article className="chart-card glass">
          <h3>Konten Diproduksi per Bulan</h3>
          <div className="bar-chart" style={{ marginBottom: 28 }}>
            {monthlyData.map((d) => (
              <div
                key={d.month}
                className="bar"
                style={{
                  height: `${(d.value / maxMonthly) * 100}%`,
                  background: 'linear-gradient(180deg, #4fe8ff, #7776ff)',
                  boxShadow: '0 0 12px rgba(79, 232, 255, .3)',
                }}
                title={`${d.month}: ${d.value} konten`}
              >
                <span className="bar-label">{d.month}</span>
              </div>
            ))}
          </div>
        </article>

        {/* Status distribution donut */}
        <article className="chart-card glass">
          <h3>Distribusi Status Pipeline</h3>
          <div className="donut-chart">
            <svg width={160} height={160} viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
              {donutSegments.map((seg) => {
                if (seg.pct === 0) return null;
                const radius = 60;
                const circumference = 2 * Math.PI * radius;
                const dashLength = (seg.pct / 100) * circumference;
                const dashOffset = -(seg.start / 100) * circumference;
                return (
                  <circle
                    key={seg.status}
                    cx={80}
                    cy={80}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={20}
                    strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dasharray .8s ease' }}
                  />
                );
              })}
            </svg>
            <div className="donut-legend">
              {donutSegments.map((seg) => (
                <div key={seg.status} className="legend-item">
                  <span className="legend-dot" style={{ background: seg.color }} />
                  <span>{seg.status}</span>
                  <span style={{ color: 'var(--muted)', marginLeft: 'auto', fontWeight: 700 }}>{seg.count}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* Category breakdown */}
        <article className="chart-card glass">
          <h3>Konten per Kategori</h3>
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {Object.entries(byCategory).map(([cat, count], i) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', marginBottom: 5 }}>
                  <span>{cat}</span>
                  <span style={{ color: 'var(--muted)' }}>{count}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(count / maxCat) * 100}%`,
                      background: catColors[i % catColors.length],
                      borderRadius: 4,
                      transition: 'width .8s ease',
                      boxShadow: `0 0 8px ${catColors[i % catColors.length]}`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Source breakdown */}
        <article className="chart-card glass">
          <h3>Sumber Ide</h3>
          <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
            {Object.entries(bySource).map(([source, count]) => {
              const pct = total > 0 ? (count / total) * 100 : 0;
              const sourceColors: Record<string, string> = {
                Web: '#4fe8ff',
                Telegram: '#baa8ff',
                'YouTube Trends': '#ff6b6b',
                'Google Trends': '#38bdf8',
                RSS: '#fb923c',
              };
              const color = sourceColors[source] || '#4fe8ff';
              return (
                <div key={source}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', marginBottom: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`source ${source.toLowerCase()}`}>{source}</span>
                    </span>
                    <span style={{ fontWeight: 700 }}>{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: color,
                        borderRadius: 5,
                        transition: 'width .8s ease',
                        boxShadow: `0 0 10px ${color}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}
