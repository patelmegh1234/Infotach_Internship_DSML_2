import { useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type NodeDragHandler,
  type ReactFlowInstance,
  BackgroundVariant,
  addEdge,
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
  onAddEdge?: (source: string, target: string) => void;
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
  onAddEdge,
  affectedIds = [],
  originId = null,
  hideUnaffected = false,
  showLabels = true,
  height = 'h-[720px]',
  filterTypes,
  searchQuery = '',
}: GraphViewProps) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const rfInstance = useRef<ReactFlowInstance | null>(null);

  // Maintain dragged positions across re-renders permanently
  const draggedPositions = useRef<Record<string, { x: number; y: number }>>({});
  const prevNodeCount = useRef<number>(0);

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
      .map((n) => {
        const savedPos = draggedPositions.current[n.id];
        const defaultX = n.x ?? 150;
        const defaultY = n.y ?? 150;

        return {
          id: n.id,
          type: 'custom',
          position: savedPos || { x: defaultX, y: defaultY },
          width: 140,
          height: 85,
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
        };
      });

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
            stroke: isAffectedRoute ? '#fb7185' : 'rgba(56, 189, 248, 0.55)',
            strokeWidth: isAffectedRoute ? 2.5 : 1.5,
          },
          labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 500 },
          labelBgStyle: { fill: '#0a0e17', fillOpacity: 0.9, rx: 4, ry: 4 },
          labelBgPadding: [6, 3] as [number, number],
        };
      });

    setRfNodes(flowNodes);
    setRfEdges(flowEdges);

    // Auto fit view smoothly when nodes are added or first loaded
    if (nodes.length > 0 && (prevNodeCount.current === 0 || nodes.length !== prevNodeCount.current)) {
      setTimeout(() => {
        rfInstance.current?.fitView({ padding: 0.25, duration: 400 });
      }, 60);
    }
    prevNodeCount.current = nodes.length;
  }, [nodes, edges, selectedId, affectedSet, originId, hideUnaffected, showLabels, filterTypes, searchQuery, hasAffected, setRfNodes, setRfEdges]);

  // Save node positions on drag so they remain permanently where the user dropped them
  const handleNodeDrag: NodeDragHandler = useCallback((_event, node) => {
    draggedPositions.current[node.id] = { x: node.position.x, y: node.position.y };
  }, []);

  const handleNodeDragStop: NodeDragHandler = useCallback((_event, node) => {
    draggedPositions.current[node.id] = { x: node.position.x, y: node.position.y };
  }, []);

  // Connect drag handle handler (create edge by dragging from handle to handle)
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.source !== connection.target) {
        if (onAddEdge) {
          onAddEdge(connection.source, connection.target);
        } else {
          setRfEdges((eds) => addEdge({ ...connection, animated: true }, eds));
        }
      }
    },
    [onAddEdge, setRfEdges],
  );

  // Click on an edge to prompt deletion
  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      if (onDeleteEdge) {
        if (window.confirm(`Delete route from "${edge.source}" to "${edge.target}"?`)) {
          onDeleteEdge(edge.source, edge.target);
        }
      }
    },
    [onDeleteEdge],
  );

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
    <div className={classNames('relative w-full overflow-hidden rounded-xl border border-white/10 bg-ink-950/90 shadow-2xl', height)}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onInit={(instance) => {
          rfInstance.current = instance;
          instance.fitView({ padding: 0.25 });
        }}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.1}
        maxZoom={2.5}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="rgba(100,116,139,0.3)" />
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
            return 'rgba(100,116,139,0.6)';
          }}
          maskColor="rgba(7,11,20,0.75)"
          className="hidden md:block !bg-ink-900/90 !border !border-white/10 !rounded-lg"
        />
      </ReactFlow>

      {/* Hints Toolbar */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="chip glass-strong text-slate-300 text-[11px] flex items-center gap-1.5 shadow-md">
          <span>💡 <strong>Drag</strong> nodes to move · <strong>Drag dots</strong> to connect routes · <strong>Click route</strong> to delete</span>
        </div>
        {!showLabels && (
          <div className="chip glass-strong text-slate-400 text-[11px]">Labels hidden</div>
        )}
      </div>

      {selectedNode && (
        <div className="absolute top-0 right-0 h-full w-full sm:w-[350px] glass-strong border-l border-white/10 shadow-2xl z-20 animate-fadeIn">
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
