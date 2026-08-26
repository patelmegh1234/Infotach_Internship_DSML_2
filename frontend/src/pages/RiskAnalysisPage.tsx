import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { ChartCard } from '@/components/ChartCard';
import { DataTable, type Column } from '@/components/DataTable';
import { RiskBadge } from '@/components/RiskBadge';
import { LoadingState } from '@/components/LoadingState';
import { api } from '@/services/api';
import { formatNumber, scoreHex, riskLevelFromScore } from '@/utils/helpers';
import type { SupplyChainNode, RiskDistribution, RegionRisk, NodeTypeRisk } from '@/types';

const distColors = { Low: '#10b981', Moderate: '#f59e0b', High: '#fb7185', Critical: '#ef4444' };

const tooltipStyle = {
  backgroundColor: 'rgba(12,19,34,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#e2e8f0',
};

export function RiskAnalysisPage() {
  const [nodes, setNodes] = useState<SupplyChainNode[]>([]);
  const [dist, setDist] = useState<RiskDistribution | null>(null);
  const [regions, setRegions] = useState<RegionRisk[]>([]);
  const [types, setTypes] = useState<NodeTypeRisk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [n, d, r, t] = await Promise.all([api.getNodes(), api.getRiskDistribution(), api.getRegionRisk(), api.getNodeTypeRisk()]);
      if (!alive) return;
      setNodes(n);
      setDist(d);
      setRegions(r);
      setTypes(t);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <LoadingState label="Loading risk analytics…" />;

  const distData = dist ? (['Low', 'Moderate', 'High', 'Critical'] as const).map((k) => ({ name: k, value: dist[k], color: distColors[k] })) : [];

  const columns: Column<SupplyChainNode>[] = [
    { key: 'id', header: 'Node', render: (n) => <span className="font-mono text-accent-400">{n.id}</span>, sortValue: (n) => n.id },
    { key: 'type', header: 'Type', sortValue: (n) => n.type },
    { key: 'region', header: 'Region', sortValue: (n) => n.region },
    { key: 'riskScore', header: 'Risk Score', render: (n) => <span style={{ color: scoreHex(n.riskScore) }}>{n.riskScore}</span>, sortValue: (n) => n.riskScore, className: 'text-right' },
    { key: 'probability', header: 'Probability', render: (n) => `${Math.round(n.probability * 100)}%`, sortValue: (n) => n.probability, className: 'text-right' },
    { key: 'impact', header: 'Impact', render: (n) => <RiskBadge score={n.impact} />, sortValue: (n) => n.impact },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <header>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Network Risk Analysis</h1>
        <p className="mt-1 text-sm text-slate-400">Distribution and concentration of risk across regions, node types and entities.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Risk Distribution" subtitle="Nodes by risk tier" className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={distData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3} stroke="none">
                {distData.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {distData.map((d) => (
              <div key={d.name} className="text-center">
                <p className="text-xs text-slate-500">{d.name}</p>
                <p className="text-sm font-semibold text-white">{formatNumber(d.value)}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Risk by Region" subtitle="Average risk score per region" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regions} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="region" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="risk" name="Risk Score" radius={[4, 4, 0, 0]}>
                {regions.map((r) => <Cell key={r.region} fill={scoreHex(r.risk)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Risk by Node Type" subtitle="Average risk score per node category">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={types} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
            <YAxis dataKey="type" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} width={90} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="risk" name="Risk Score" radius={[0, 4, 4, 0]}>
              {types.map((t) => <Cell key={t.type} fill={scoreHex(t.risk)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top Vulnerable Nodes" subtitle="Sorted by risk score — click headers to sort">
        <DataTable columns={columns} rows={nodes} initialSort={{ key: 'riskScore', dir: 'desc' }} />
      </ChartCard>
    </div>
  );
}
