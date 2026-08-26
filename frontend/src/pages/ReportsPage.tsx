import { useState } from 'react';
import { FileText, Download, FileDown, Sparkles, CheckCircle2, Loader2, Network, AlertTriangle, DollarSign, MapPin, TrendingUp } from 'lucide-react';
import { ChartCard } from '@/components/ChartCard';
import { AIInsightPanel } from '@/components/AIInsightPanel';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { classNames, formatCurrency, formatNumber, formatTimestamp } from '@/utils/helpers';
import { aiInsight, disruptions, nodes, kpi } from '@/data/mockData';

export function ReportsPage() {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [report, setReport] = useState<{
    id: string;
    createdAt: string;
    sections: { title: string; body: string }[];
  } | null>(null);
  const toast = useToast();

  const generate = async () => {
    setGenerating(true);
    setGenerated(false);
    await api.generateReport();
    const r = {
      id: `RPT-${Math.floor(Math.random() * 9000 + 1000)}`,
      createdAt: new Date().toISOString(),
      sections: [
        { title: 'Executive Summary', body: `Network risk score is ${kpi.networkRiskScore.toFixed(1)}/100 with ${kpi.activeDisruptions} active disruptions across ${formatNumber(kpi.networkNodes)} nodes. Estimated exposure stands at ${formatCurrency(kpi.estimatedExposure)}. Southeast Asia remains the highest-risk corridor driven by supplier concentration and port congestion.` },
        { title: 'Disruption Details', body: `${disruptions.length} tracked disruption events. Primary event: Supplier SUP-204 failure (severity 85, 21-day duration) propagating through 3 dependency layers. Secondary event: Port P-102 closure impacting transshipment across APAC.` },
        { title: 'Affected Nodes', body: `${disruptions[0].affectedNodes.length} directly affected nodes identified in the primary disruption, spanning suppliers, factories, warehouses, ports, distributors and markets. ${kpi.atRiskNodes} additional nodes flagged at-risk network-wide.` },
        { title: 'Risk Analysis', body: `Risk distribution: 842 Low, 256 Moderate, 143 High, 43 Critical. Asia region leads with 74 avg risk score. Ports (64) and Suppliers (58) are the most vulnerable node categories.` },
        { title: 'Ripple Propagation', body: `Propagation modeling indicates 3-layer cascade from SUP-204 through FACT-201/202 → WH-301/302 → PORT-401/402/102 → DIST-501/502 → MKT-601/602. Peak affected count reaches 42 nodes within 7 days.` },
        { title: 'Geographic Impact', body: `Primary impact concentrated in Asia (18 nodes, risk 74). Secondary exposure in North America (6 nodes, risk 62) via Detroit battery corridor. Europe (6 nodes, risk 41) offers rerouting capacity via Rotterdam.` },
        { title: 'Estimated Financial Impact', body: `Direct estimated loss from primary disruption: ${formatCurrency(disruptions[0].estimatedLoss)}. Total network exposure: ${formatCurrency(kpi.estimatedExposure)}. Recovery time estimate: ${disruptions[0].recoveryTimeDays} days for primary event.` },
      ],
    };
    setReport(r);
    setGenerating(false);
    setGenerated(true);
    toast.push({ kind: 'success', title: 'Report generated', message: `Report ${r.id} is ready to view and export.` });
  };

  const exportCsv = () => {
    const rows = [
      ['Section', 'Content'],
      ...report!.sections.map((s) => [s.title, s.body]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    download(`${report!.id}.csv`, csv, 'text/csv');
    toast.push({ kind: 'success', title: 'CSV exported', message: `${report!.id}.csv downloaded.` });
  };

  const exportPdf = () => {
    const content = `AtmoGraph Supply Chain Risk Report\n${report!.id}\nGenerated ${formatTimestamp(report!.createdAt)}\n\n${report!.sections.map((s) => `## ${s.title}\n${s.body}`).join('\n\n')}`;
    download(`${report!.id}.txt`, content, 'text/plain');
    toast.push({ kind: 'success', title: 'Report exported', message: `${report!.id} report downloaded as text.` });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-slate-400">Generate comprehensive supply chain risk reports with AI recommendations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generate} disabled={generating} className="btn-primary">
            {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate Report</>}
          </button>
          <button onClick={exportPdf} disabled={!report} className="btn-outline">
            <FileDown className="h-4 w-4" /> Export PDF
          </button>
          <button onClick={exportCsv} disabled={!report} className="btn-outline">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Network} label="Network Nodes" value={formatNumber(kpi.networkNodes)} accent="cyan" />
        <SummaryCard icon={AlertTriangle} label="Active Disruptions" value={String(kpi.activeDisruptions)} accent="rose" />
        <SummaryCard icon={DollarSign} label="Total Exposure" value={formatCurrency(kpi.estimatedExposure)} accent="amber" />
        <SummaryCard icon={TrendingUp} label="Risk Score" value={`${kpi.networkRiskScore.toFixed(1)}/100`} accent="violet" />
      </div>

      {!report && !generating && (
        <div className="card p-12">
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mb-4">
              <FileText className="h-7 w-7 text-accent-400" />
            </div>
            <h3 className="text-base font-medium text-white">No report generated yet</h3>
            <p className="text-sm text-slate-500 mt-1.5 max-w-md">Click "Generate Report" to compile a full supply chain risk report including executive summary, disruption details, affected nodes, risk analysis, ripple propagation, geographic impact, financial estimates and AI recommendations.</p>
            <button onClick={generate} className="btn-primary mt-5"><Sparkles className="h-4 w-4" /> Generate Report</button>
          </div>
        </div>
      )}

      {generating && (
        <div className="card p-12">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm text-white font-medium">Compiling report…</p>
              <p className="text-xs text-slate-500 mt-1">Aggregating network data, risk analysis and AI insights</p>
            </div>
          </div>
        </div>
      )}

      {report && !generating && (
        <div className="space-y-5">
          <div className="card p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Report {report.id} ready</p>
              <p className="text-xs text-slate-500">Generated {formatTimestamp(report.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {report.sections.map((s, i) => (
              <ChartCard key={i} title={s.title} subtitle={`Section ${i + 1} of ${report.sections.length}`}>
                <p className="text-sm text-slate-300 leading-relaxed">{s.body}</p>
              </ChartCard>
            ))}
          </div>

          <AIInsightPanel insight={aiInsight} />

          <ChartCard title="Affected Nodes Summary" subtitle="Nodes in the primary disruption path">
            <div className="flex flex-wrap gap-2">
              {disruptions[0].affectedNodes.map((id) => {
                const n = nodes.find((x) => x.id === id);
                return (
                  <span key={id} className="chip bg-white/5 text-slate-300 border border-white/10">
                    <span className="font-mono text-accent-400">{id}</span>
                    {n && <span className="text-slate-500">· {n.type}</span>}
                  </span>
                );
              })}
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, accent }: { icon: typeof Network; label: string; value: string; accent: 'cyan' | 'amber' | 'rose' | 'violet' }) {
  const map = { cyan: 'text-accent-400 bg-accent-500/10', amber: 'text-amber-400 bg-amber-500/10', rose: 'text-rose-400 bg-rose-500/10', violet: 'text-violet-400 bg-violet-500/10' };
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={classNames('h-10 w-10 rounded-lg flex items-center justify-center', map[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
