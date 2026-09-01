import { useState, useEffect } from 'react';
import { FileText, Download, FileDown, Sparkles, CheckCircle2, Loader2, Network, AlertTriangle, DollarSign, MapPin, TrendingUp } from 'lucide-react';
import { ChartCard } from '@/components/ChartCard';
import { AIInsightPanel } from '@/components/AIInsightPanel';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { classNames, formatCurrency, formatNumber, formatTimestamp } from '@/utils/helpers';
import type { AIInsight, KpiSnapshot, SupplyChainNode } from '@/types';

export function ReportsPage() {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [liveKpi, setLiveKpi] = useState<KpiSnapshot | null>(null);
  const [liveInsight, setLiveInsight] = useState<AIInsight | null>(null);
  const [liveNodes, setLiveNodes] = useState<SupplyChainNode[]>([]);
  const [report, setReport] = useState<{
    id: string;
    createdAt: string;
    sections: { title: string; body: string }[];
  } | null>(null);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const [k, ins, net] = await Promise.all([api.getKpi(), api.getInsight(), api.getNetwork()]);
      setLiveKpi(k);
      setLiveInsight(ins);
      setLiveNodes(net.nodes);
    })();
  }, []);

  const generate = async () => {
    setGenerating(true);
    setGenerated(false);
    const [k, ins, net, dis] = await Promise.all([api.getKpi(), api.getInsight(), api.getNetwork(), api.getDisruptions()]);
    setLiveKpi(k);
    setLiveInsight(ins);
    setLiveNodes(net.nodes);

    const totalNodes = net.nodes.length;
    const highRisk = net.nodes.filter((n) => n.riskScore >= 65);

    const r = {
      id: `RPT-${Math.floor(Math.random() * 9000 + 1000)}`,
      createdAt: new Date().toISOString(),
      sections: [
        {
          title: 'Executive Summary',
          body: `Live network risk score is ${k.networkRiskScore.toFixed(1)}/100 across ${formatNumber(totalNodes)} active nodes with ${k.activeDisruptions} active disruptions. Total estimated exposure is ${formatCurrency(k.estimatedExposure)}.`,
        },
        {
          title: 'Network Composition',
          body: `The graph contains ${totalNodes} nodes and ${net.edges.length} transportation & supply routes. Critical nodes with elevated risk: ${highRisk.length}.`,
        },
        {
          title: 'Disruption Overview',
          body: dis.length > 0
            ? `${dis.length} active disruptions currently tracked. Most severe at ${dis[0].originNodeId} (${dis[0].type}) with estimated duration of ${dis[0].durationDays} days.`
            : 'No active critical disruptions currently flagged in the supply chain graph.',
        },
        {
          title: 'AI Insight & Action Plan',
          body: ins.body,
        },
      ],
    };
    setReport(r);
    setGenerating(false);
    setGenerated(true);
    toast.push({ kind: 'success', title: 'Report generated', message: `Report ${r.id} is ready to view and export.` });
  };

  const download = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ['Section', 'Content'],
      ...report.sections.map((s) => [s.title, s.body]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    download(`${report.id}.csv`, csv, 'text/csv');
    toast.push({ kind: 'success', title: 'CSV exported', message: `${report.id}.csv downloaded.` });
  };

  const exportPdf = () => {
    if (!report) return;
    const content = `AtmoGraph Supply Chain Risk Report\n${report.id}\nGenerated ${formatTimestamp(report.createdAt)}\n\n${report.sections.map((s) => `## ${s.title}\n${s.body}`).join('\n\n')}`;
    download(`${report.id}.txt`, content, 'text/plain');
    toast.push({ kind: 'success', title: 'Report exported', message: `${report.id} report downloaded as text.` });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Executive Intelligence Reports</h1>
          <p className="mt-1 text-sm text-slate-400">Generate executive risk summaries and network audits from live data.</p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? 'Generating live report…' : 'Generate Full Report'}
        </button>
      </header>

      {generated && report && (
        <div className="card p-6 border-accent-500/30 shadow-glow space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <div>
                <h2 className="text-base font-semibold text-white font-mono">{report.id}</h2>
                <p className="text-xs text-slate-400">Generated {formatTimestamp(report.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCsv} className="btn-outline text-xs flex items-center gap-1.5">
                <FileDown className="h-3.5 w-3.5" /> Export CSV
              </button>
              <button onClick={exportPdf} className="btn-outline text-xs flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export Text
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.sections.map((s, idx) => (
              <div key={idx} className="rounded-xl bg-ink-900/60 border border-white/5 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-accent-300 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent-400" />
                  {s.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {liveInsight && (
        <AIInsightPanel insight={liveInsight} />
      )}
    </div>
  );
}
