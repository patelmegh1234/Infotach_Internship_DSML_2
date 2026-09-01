import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { SupplyChainNode, SupplyChainEdge, NodeType } from '@/types';
import { GraphNode, type GraphNodeData } from './GraphNode';
import { NodeDetailsPanel } from './NodeDetailsPanel';
import { classNames, scoreHex } from '@/utils/helpers';

const nodeTypes = { custom: GraphNode };

export interface GraphViewProps {
  nodes: SupplyChainNode[];
  edges: SupplyChainEdge[];
  selectedId?: string | null;
  onSelectNode?: (id: string | null) => void;
  affectedIds?: string[];
  originId?: string | null;
  hideUnaffected?: boolean;
  showLabels?: boolean;
  height?: string;
  filterTypes?: NodeType[];
  searchQuery?: string;
}

export function GraphView({
  nodes,
  edges,
  selectedId,
  onSelectNode,
  affectedIds = [],
  originId = null,
  hideUnaffected = false,
  showLabels = true,
  height = 'h-[680px]',
  filterTypes,
  searchQuery = '',
}: GraphViewProps) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  const affectedSet = useMemo(() => new Set(affectedIds), [affectedIds]);
  const hasAffected = affectedSet.size > 0;

  useEffect(() => {
    const filtered = filterTypes && filterTypes.length > 0 ? nodes.filter((n) => filterTypes.includes(n.type)) : nodes;
    const q = searchQuery.trim().toLowerCase();
    const searched = q
      ? filtered.filter(
          (n) =>
            n.name.toLowerCase().includes(q) ||
            n.id.toLowerCase().includes(q) ||
            n.location.toLowerCase().includes(q) ||
            (n.country && n.country.toLowerCase().includes(q)) ||
            (n.city && n.city.toLowerCase().includes(q))
        )
      : filtered;
    const visibleNodes = hideUnaffected && hasAffected ? searched.filter((n) => affectedSet.has(n.id)) : searched;
    const visibleIds = new Set(visibleNodes.map((n) => n.id));

    const rf: Node<GraphNodeData>[] = visibleNodes.map((n) => {
      const isOrigin = n.id === originId;
      const isAffected = affectedSet.has(n.id);
      const dimmed = hasAffected && !isAffected;
      return {
        id: n.id,
        type: 'custom',
        position: { x: n.x, y: n.y },
        data: {
          label: n.id,
          name: n.name,
          type: n.type,
          riskScore: n.riskScore,
          status: n.status,
          affected: isAffected,
          origin: isOrigin,
          dimmed,
          country: n.country,
          capacity: n.capacity_utilization,
        },
        draggable: true,
      };
    });
    setRfNodes(rf);

    const rfE: Edge[] = edges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => {
        const sourceAffected = affectedSet.has(e.source);
        const targetAffected = affectedSet.has(e.target);
        const isProp = sourceAffected && targetAffected;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'default',
          animated: isProp,
          label: showLabels && e.relationship ? e.relationship : undefined,
          labelStyle: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
          labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
          style: {
            stroke: isProp ? scoreHex(85) : 'rgba(148, 163, 184, 0.35)',
            strokeWidth: isProp ? 2.5 : 1.2,
          },
        };
      });
    setRfEdges(rfE);
  }, [nodes, edges, filterTypes, searchQuery, affectedSet, originId, hasAffected, hideUnaffected, showLabels, setRfNodes, setRfEdges]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_e, node) => {
      onSelectNode?.(node.id);
    },
    [onSelectNode],
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode?.(null);
  }, [onSelectNode]);

  const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId) : null;

  return (
    <div className={classNames('relative w-full overflow-hidden rounded-xl border border-white/5 bg-ink-950/80', height)}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2.5}
        onlyRenderVisibleElements={true}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        nodesDraggable
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="rgba(100,116,139,0.2)" />
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="!bg-ink-900/90 !border !border-white/10 !rounded-lg !shadow-panel overflow-hidden"
        />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const d = n.data as GraphNodeData;
            if (d.origin) return '#ef4444';
            if (d.affected) return scoreHex(d.riskScore);
            return 'rgba(100,116,139,0.5)';
          }}
          maskColor="rgba(7,11,20,0.75)"
          className="hidden md:block !bg-ink-900/90 !border !border-white/10 !rounded-lg"
        />
      </ReactFlow>

      {!showLabels && (
        <div className="absolute top-3 left-3 chip glass-strong text-slate-400 text-[11px]">Relationship labels hidden</div>
      )}

      {selectedNode && (
        <div className="absolute top-0 right-0 h-full w-full sm:w-[340px] glass-strong border-l border-white/10 shadow-2xl z-20 animate-fadeIn">
          <NodeDetailsPanel
            node={selectedNode}
            onClose={() => onSelectNode?.(null)}
            allNodes={nodes}
            onSelectNode={onSelectNode}
          />
        </div>
      )}
    </div>
  );
}
