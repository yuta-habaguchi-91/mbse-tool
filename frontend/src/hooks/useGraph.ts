import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import { fetchGraph, saveGraph } from '../api/graphApi';
import type { ArrowType, LineType, FilterMode, ViewData, GraphData } from '../types/graph';

export type AppNode = Node<{ label: string; visible: boolean }>;
export type AppEdge = Edge<{ arrow: ArrowType; lineType: LineType; visible: boolean }>;

function edgeProps(arrow: ArrowType, lineType: LineType) {
  return {
    type: lineType === 'bezier' ? 'default' : 'smoothstep',
    markerEnd:   { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    markerStart: arrow === 'double'
      ? { type: MarkerType.ArrowClosed, color: '#3b82f6' }
      : undefined,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
  };
}

// ビューの hiddenBlockIds をノード配列に適用して visible フラグを更新する
function applyViewVisibility(nodes: AppNode[], hiddenBlockIds: string[]): AppNode[] {
  const hiddenSet = new Set(hiddenBlockIds);
  return nodes.map(n => ({ ...n, selected: false, data: { ...n.data, visible: !hiddenSet.has(n.id) } }));
}

function makeDefaultView(): ViewData {
  return { id: crypto.randomUUID(), name: 'メインビュー', hiddenBlockIds: [], filterMode: 'all' };
}

export function useGraph() {
  const [nodes, setNodes] = useNodesState<AppNode>([]);
  const [edges, setEdges] = useEdgesState<AppEdge>([]);
  const [diagramLineType, setDiagramLineTypeState] = useState<LineType>('bezier');

  // ビュー状態: 各ビューは独立した表示設定を持つ
  const initialView = useRef(makeDefaultView()).current;
  const [views, setViews]               = useState<ViewData[]>([initialView]);
  const [activeViewId, setActiveViewId] = useState<string>(initialView.id);

  const activeView = useMemo(
    () => views.find(v => v.id === activeViewId) ?? views[0],
    [views, activeViewId]
  );

  // filterMode はアクティブビューから導出する（ビュー固有の設定）
  const filterMode = activeView.filterMode;
  const setFilterMode = useCallback((mode: FilterMode) => {
    setViews(vs => vs.map(v => v.id === activeViewId ? { ...v, filterMode: mode } : v));
  }, [activeViewId]);

  // --- Undo 履歴 ---
  type Snapshot = { nodes: AppNode[]; edges: AppEdge[]; views: ViewData[] };
  const historyRef = useRef<Snapshot[]>([]);
  const latestRef  = useRef<Snapshot>({ nodes, edges, views });
  latestRef.current = { nodes, edges, views };

  const saveSnapshot = useCallback(() => {
    const { nodes: n, edges: e, views: v } = latestRef.current;
    historyRef.current = [...historyRef.current.slice(-49), { nodes: [...n], edges: [...e], views: [...v] }];
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setViews(prev.views);
  }, [setNodes, setEdges]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'z') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      undo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);

  // --- 表示フィルタ ---
  const selectedNode = useMemo(() => nodes.find(n => n.selected) ?? null, [nodes]);
  const selectedEdge = useMemo(() => edges.find(e => e.selected) ?? null, [edges]);

  const visibleNodes = useMemo<AppNode[]>(() => {
    const base = nodes.filter(n => n.data.visible);
    if (filterMode === 'all' || !selectedNode) return base;
    const relatedIds = new Set([selectedNode.id]);
    edges.forEach(e => {
      if (e.source === selectedNode.id) relatedIds.add(e.target);
      if (e.target === selectedNode.id) relatedIds.add(e.source);
    });
    return base.filter(n => relatedIds.has(n.id));
  }, [nodes, edges, filterMode, selectedNode]);

  const visibleEdges = useMemo<AppEdge[]>(() => {
    const visibleIds = new Set(visibleNodes.map(n => n.id));
    return edges.filter(
      e => (e.data?.visible ?? true) && visibleIds.has(e.source) && visibleIds.has(e.target)
    );
  }, [edges, visibleNodes]);

  // --- React Flow イベントハンドラ ---
  const onNodesChange = useCallback((changes: NodeChange<AppNode>[]) => {
    const removedIds = new Set(changes.filter(c => c.type === 'remove').map(c => c.id));
    if (removedIds.size > 0) {
      setEdges(eds => eds.filter(e => !removedIds.has(e.source) && !removedIds.has(e.target)));
    }
    setNodes(nds => applyNodeChanges(changes, nds));
  }, [setNodes, setEdges]);

  const onEdgesChange = useCallback((changes: EdgeChange<AppEdge>[]) => {
    setEdges(eds => applyEdgeChanges(changes, eds));
  }, [setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    saveSnapshot();
    const lt = latestRef.current.edges[0]?.data?.lineType ?? diagramLineType;
    setEdges(eds => [...eds, {
      id: crypto.randomUUID(),
      source: connection.source ?? '',
      target: connection.target ?? '',
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      data: { arrow: 'single', lineType: lt, visible: true },
      ...edgeProps('single', lt),
    }]);
  }, [saveSnapshot, diagramLineType, setEdges]);

  // --- ビュー操作 ---
  const switchView = useCallback((viewId: string) => {
    const view = views.find(v => v.id === viewId);
    if (!view) return;
    setActiveViewId(viewId);
    setNodes(nds => applyViewVisibility(nds, view.hiddenBlockIds));
  }, [views, setNodes]);

  const addView = useCallback(() => {
    // 現在のビューの表示設定を引き継いで新しいビューを作る
    const current = latestRef.current.views.find(v => v.id === activeViewId);
    const newView: ViewData = {
      id: crypto.randomUUID(),
      name: `ビュー ${latestRef.current.views.length + 1}`,
      hiddenBlockIds: [...(current?.hiddenBlockIds ?? [])],
      filterMode: 'all',
    };
    setViews(vs => [...vs, newView]);
    setActiveViewId(newView.id);
    setNodes(nds => applyViewVisibility(nds, newView.hiddenBlockIds));
  }, [activeViewId, setNodes]);

  const renameView = useCallback((viewId: string, name: string) => {
    setViews(vs => vs.map(v => v.id === viewId ? { ...v, name } : v));
  }, []);

  const deleteView = useCallback((viewId: string) => {
    const current = latestRef.current.views;
    if (current.length <= 1) return;
    const remaining = current.filter(v => v.id !== viewId);
    setViews(remaining);
    if (viewId === activeViewId) {
      const next = remaining[0];
      setActiveViewId(next.id);
      setNodes(nds => applyViewVisibility(nds, next.hiddenBlockIds));
    }
  }, [activeViewId, setNodes]);

  // --- 要素操作 ---
  const addBlock = useCallback(() => {
    saveSnapshot();
    const offset = Math.random() * 80;
    setNodes(nds => [...nds, {
      id: crypto.randomUUID(),
      position: { x: 200 + offset, y: 150 + offset },
      data: { label: '新しいブロック', visible: true },
      type: 'block',
    }]);
  }, [saveSnapshot, setNodes]);

  const deleteSelected = useCallback(() => {
    saveSnapshot();
    const removedNodeIds = new Set(nodes.filter(n => n.selected).map(n => n.id));
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(
      e => !e.selected && !removedNodeIds.has(e.source) && !removedNodeIds.has(e.target)
    ));
    // 削除されたブロックをすべてのビューの hiddenBlockIds からも除去
    if (removedNodeIds.size > 0) {
      setViews(vs => vs.map(v => ({
        ...v,
        hiddenBlockIds: v.hiddenBlockIds.filter(id => !removedNodeIds.has(id)),
      })));
    }
  }, [saveSnapshot, nodes, setNodes, setEdges]);

  const updateNodeLabel = useCallback((id: string, label: string) => {
    saveSnapshot();
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, data: { ...n.data, label } } : n
    ));
  }, [saveSnapshot, setNodes]);

  const updateEdgeArrow = useCallback((id: string, arrow: ArrowType) => {
    saveSnapshot();
    setEdges(eds => eds.map(e =>
      e.id === id
        ? { ...e, data: { ...e.data!, arrow }, ...edgeProps(arrow, e.data?.lineType ?? 'bezier') }
        : e
    ));
  }, [saveSnapshot, setEdges]);

  const setDiagramLineType = useCallback((lt: LineType) => {
    saveSnapshot();
    setDiagramLineTypeState(lt);
    setEdges(eds => eds.map(e => ({
      ...e,
      data: { ...e.data!, lineType: lt },
      ...edgeProps(e.data?.arrow ?? 'single', lt),
    })));
  }, [saveSnapshot, setEdges]);

  // 表示/非表示切替: ノードの visible を更新 + アクティブビューの hiddenBlockIds を更新
  const toggleNodeVisibility = useCallback((id: string) => {
    saveSnapshot();
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, data: { ...n.data, visible: !n.data.visible } } : n
    ));
    setViews(vs => vs.map(v => {
      if (v.id !== activeViewId) return v;
      const isHidden = v.hiddenBlockIds.includes(id);
      return {
        ...v,
        hiddenBlockIds: isHidden
          ? v.hiddenBlockIds.filter(bid => bid !== id)
          : [...v.hiddenBlockIds, id],
      };
    }));
  }, [saveSnapshot, activeViewId, setNodes]);

  // --- API ---
  const loadGraph = useCallback(async () => {
    try {
      const data = await fetchGraph();
      let loadedViews: ViewData[] = data.views ?? [];

      // 旧データ移行: views がなければ block.visible からデフォルトビューを生成
      if (loadedViews.length === 0) {
        const hiddenBlockIds = data.blocks
          .filter(b => b.visible === false)
          .map(b => b.id);
        loadedViews = [{ ...makeDefaultView(), hiddenBlockIds }];
      }

      setViews(loadedViews);
      setActiveViewId(loadedViews[0].id);

      const hiddenSet = new Set(loadedViews[0].hiddenBlockIds);
      const lt: LineType = (data.connectors[0]?.lineType as LineType) ?? 'bezier';
      setDiagramLineTypeState(lt);

      setNodes(data.blocks.map(b => ({
        id: b.id,
        position: b.position,
        data: { label: b.name, visible: !hiddenSet.has(b.id) },
        type: 'block',
      })));
      setEdges(data.connectors.map(c => ({
        id: c.id,
        source: c.source,
        target: c.target,
        sourceHandle: c.sourceHandle ?? null,
        targetHandle: c.targetHandle ?? null,
        data: { arrow: c.arrow, lineType: lt, visible: c.visible },
        ...edgeProps(c.arrow, lt),
      })));
    } catch (e) {
      console.error('グラフの読み込みに失敗しました', e);
    }
  }, [setNodes, setEdges]);

  const handleSave = useCallback(async () => {
    try {
      const graphData: GraphData = {
        blocks: nodes.map(n => ({
          id: n.id,
          name: n.data.label,
          position: n.position,
          // visible はビューで管理するため常に true
          visible: true,
        })),
        connectors: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? null,
          targetHandle: e.targetHandle ?? null,
          arrow:    e.data?.arrow    ?? 'single',
          lineType: e.data?.lineType ?? diagramLineType,
          visible:  true,
        })),
        views,
      };
      await saveGraph(graphData);
    } catch (e) {
      console.error('グラフの保存に失敗しました', e);
      alert('保存に失敗しました');
    }
  }, [nodes, edges, views, diagramLineType]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  return {
    nodes, edges,
    visibleNodes, visibleEdges,
    onNodesChange, onEdgesChange, onConnect,
    selectedNode, selectedEdge,
    addBlock, deleteSelected,
    updateNodeLabel, updateEdgeArrow, toggleNodeVisibility,
    diagramLineType, setDiagramLineType,
    filterMode, setFilterMode,
    views, activeViewId, activeView,
    switchView, addView, renameView, deleteView,
    handleSave, loadGraph,
  };
}
