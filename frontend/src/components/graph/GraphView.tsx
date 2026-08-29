import { useCallback, useMemo, useState, useEffect } from 'react';
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
  height = 'h-[640px]',
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
    const searched = q ? filtered.filter((n) => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q) || n.location.toLowerCase().includes(q)) : filtered;
    const visibleNodes = hideUnaffected && hasAffected ? searched.filter((n) => affectedSet.has(n.id)) : searched;
    const visibleIds = new Set(visibleNodes.map((n) => n.id));

    const rf: Node<GraphNodeData>[] = visibleNodes.map((n) => {
      const isOrigin = n.id === originId;
      const isAffected = affectedSet.has(n.id);
      const dimmed = hasAffected && !isAffected;
      return {
        id: n.id,
        type: 'custom',
        position: { x: n.x * 1.4, y: n.y * 1.1 },
        data: {
          label: n.id,
          type: n.type,
          riskScore: n.riskScore,
          status: n.status,
          affected: isAffected,
          origin: isOrigin,
          dimmed,
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
          style: {
            stroke: isProp ? scoreHex(80) : 'rgba(100,116,139,0.35)',
            strokeWidth: isProp ? 2 : 1,
          },
        };
      });
    setRfEdges(rfE);
  }, [nodes, edges, filterTypes, searchQuery, affectedSet, originId, hasAffected, hideUnaffected, setRfNodes, setRfEdges]);

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
    <div className={classNames('relative w-full', height)}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        nodesDraggable
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(100,116,139,0.18)" />
        <Controls showInteractive={false} position="bottom-right" />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const d = n.data as GraphNodeData;
            if (d.origin) return '#ef4444';
            if (d.affected) return scoreHex(d.riskScore);
            return 'rgba(100,116,139,0.4)';
          }}
          maskColor="rgba(7,11,20,0.7)"
          className="hidden md:block"
        />
      </ReactFlow>

      {!showLabels && (
        <div className="absolute top-3 left-3 chip glass-strong text-slate-400 text-[11px]">Labels hidden</div>
      )}

      {selectedNode && (
        <div className="absolute top-0 right-0 h-full w-full sm:w-[300px] glass-strong border-l border-white/5 shadow-panel z-10 animate-fadeIn">
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
