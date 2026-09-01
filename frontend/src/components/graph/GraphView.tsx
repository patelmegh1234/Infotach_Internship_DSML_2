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
  onDeleteNode?: (id: string) => void;
  onDeleteEdge?: (source: string, target: string) => void;
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
  onDeleteNode,
  onDeleteEdge,
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
            (n.country && n.country.toLowerCase().includes(q)),
        )
      : filtered;

    const visibleNodeIds = new Set(searched.map((n) => n.id));

    const flowNodes: Node<GraphNodeData>[] = searched
      .filter((n) => (!hideUnaffected || !hasAffected ? true : affectedSet.has(n.id) || n.id === originId))
      .map((n) => ({
        id: n.id,
        type: 'custom',
        position: { x: n.x ?? 100, y: n.y ?? 100 },
        data: {
          label: n.name || n.id,
          name: n.name,
          type: n.type,
          status: n.status,
          country: n.country,
          node: n,
          selected: n.id === selectedId,
          affected: affectedSet.has(n.id),
          origin: n.id === originId,
          riskScore: n.riskScore,
        },
      }));

    const flowEdges: Edge[] = edges
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .filter((e) => {
        if (!hideUnaffected || !hasAffected) return true;
        return (affectedSet.has(e.source) || e.source === originId) && (affectedSet.has(e.target) || e.target === originId);
      })
      .map((e) => {
        const isAffectedRoute = (affectedSet.has(e.source) || e.source === originId) && affectedSet.has(e.target);
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'default',
          animated: isAffectedRoute,
          label: showLabels ? e.relationship || undefined : undefined,
          style: {
            stroke: isAffectedRoute ? '#fb7185' : 'rgba(148, 163, 184, 0.35)',
            strokeWidth: isAffectedRoute ? 2.5 : 1.2,
          },
          labelStyle: { fill: '#94a3b8', fontSize: 9, fontWeight: 500 },
          labelBgStyle: { fill: '#0a0e17', fillOpacity: 0.85, rx: 4, ry: 4 },
          labelBgPadding: [4, 2] as [number, number],
        };
      });

    setRfNodes(flowNodes);
    setRfEdges(flowEdges);
  }, [nodes, edges, selectedId, affectedSet, originId, hideUnaffected, showLabels, filterTypes, searchQuery, hasAffected, setRfNodes, setRfEdges]);

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
            onDeleteNode={onDeleteNode}
            onDeleteEdge={onDeleteEdge}
          />
        </div>
      )}
    </div>
  );
}
