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
import type {
  ArrowType, LineType, FilterMode,
  ViewData, GraphData, RevisionEntry,
} from '../types/graph';

export type AppNode = Node<{
  label:     string;
  visible:   boolean;
  ctrlPending?: boolean;  // Ctrl+クリック接続の1回目選択中フラグ
  docNumber?: string;
  owner?:    string;
  contact?:  string;
  revisions: RevisionEntry[];
}>;
export type AppEdge = Edge<{ arrow: ArrowType; lineType: LineType; visible: boolean }>;

function edgeProps(arrow: ArrowType, lineType: LineType) {
  return {
    type:      lineType === 'bezier' ? 'default' : 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    markerStart: arrow === 'double'
      ? { type: MarkerType.ArrowClosed, color: '#3b82f6' }
      : undefined,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
  };
}

// --- ハンドル最近接計算 ---
const HANDLE_KEYS = ['top', 'bottom', 'left', 'right'] as const;
type HandleKey = typeof HANDLE_KEYS[number];

function getHandlePositions(node: AppNode): Record<HandleKey, { x: number; y: number }> {
  const { x, y } = node.position;
  const w = node.measured?.width  ?? 140;
  const h = node.measured?.height ?? 44;
  return {
    top:    { x: x + w / 2, y },
    bottom: { x: x + w / 2, y: y + h },
    left:   { x,             y: y + h / 2 },
    right:  { x: x + w,      y: y + h / 2 },
  };
}

function euclidean(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestHandlePair(src: AppNode, tgt: AppNode): { sourceHandle: string; targetHandle: string } {
  const sp = getHandlePositions(src);
  const tp = getHandlePositions(tgt);
  let best = { sourceHandle: 'right', targetHandle: 'left', dist: Infinity };
  for (const sk of HANDLE_KEYS) {
    for (const tk of HANDLE_KEYS) {
      const d = euclidean(sp[sk], tp[tk]);
      if (d < best.dist) best = { sourceHandle: sk, targetHandle: tk, dist: d };
    }
  }
  return { sourceHandle: best.sourceHandle, targetHandle: best.targetHandle };
}

// 改訂履歴から最新の revDate を返す（日付文字列比較）
function latestRevDate(revisions: RevisionEntry[] | undefined): string | null {
  if (!revisions || revisions.length === 0) return null;
  return revisions.reduce((latest, r) => (r.revDate > latest ? r.revDate : latest), '');
}

// ビューのブロックレイアウトをノード配列に適用（位置・表示フラグ）
function applyViewLayout(nodes: AppNode[], view: ViewData): AppNode[] {
  const map = new Map(view.blockLayouts.map(bl => [bl.blockId, bl]));
  return nodes.map(n => {
    const layout = map.get(n.id);
    return {
      ...n,
      selected: false,
      position: layout?.position ?? n.position,
      data: { ...n.data, visible: layout?.visible ?? true },
    };
  });
}

// ビューのエッジレイアウトをエッジ配列に適用（ハンドル・表示フラグ）
function applyEdgeLayout(edges: AppEdge[], view: ViewData): AppEdge[] {
  const map = new Map(view.edgeLayouts.map(el => [el.connectorId, el]));
  return edges.map(e => {
    const layout = map.get(e.id);
    return {
      ...e,
      sourceHandle: layout?.sourceHandle ?? e.sourceHandle ?? null,
      targetHandle: layout?.targetHandle ?? e.targetHandle ?? null,
      data: { ...e.data!, visible: layout?.visible ?? true },
    };
  });
}

function makeDefaultView(): ViewData {
  return {
    id: crypto.randomUUID(), name: 'メインビュー',
    filterMode: 'all', blockLayouts: [], edgeLayouts: [],
  };
}

export function useGraph() {
  const [nodes, setNodes] = useNodesState<AppNode>([]);
  const [edges, setEdges] = useEdgesState<AppEdge>([]);
  const [diagramLineType, setDiagramLineTypeState] = useState<LineType>('bezier');

  const initialView = useRef(makeDefaultView()).current;
  const [views, setViews]               = useState<ViewData[]>([initialView]);
  const [activeViewId, setActiveViewId] = useState<string>(initialView.id);

  const activeView = useMemo(
    () => views.find(v => v.id === activeViewId) ?? views[0],
    [views, activeViewId]
  );

  const filterMode = activeView.filterMode;
  const setFilterMode = useCallback((mode: FilterMode) => {
    setViews(vs => vs.map(v => v.id === activeViewId ? { ...v, filterMode: mode } : v));
  }, [activeViewId]);

  // --- Undo 履歴 ---
  type Snapshot = { nodes: AppNode[]; edges: AppEdge[]; views: ViewData[] };
  const historyRef = useRef<Snapshot[]>([]);
  const latestRef  = useRef<Snapshot>({ nodes, edges, views });
  latestRef.current = { nodes, edges, views };

  // Ctrl+クリック接続のソースID（ref なので変更で再レンダリングしない）
  const ctrlSrcRef = useRef<string | null>(null);

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
      // Escape で Ctrl+クリック接続をキャンセル（ref は常に最新値を保持）
      if (e.key === 'Escape' && ctrlSrcRef.current) {
        ctrlSrcRef.current = null;
        setNodes(nds => nds.map(n =>
          n.data.ctrlPending ? { ...n, data: { ...n.data, ctrlPending: false } } : n
        ));
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'z') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      undo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, setNodes]);

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

  // source の最新 revDate が target より新しければエッジを赤く表示
  const visibleEdges = useMemo<AppEdge[]>(() => {
    const visibleIds = new Set(visibleNodes.map(n => n.id));
    const nodeMap    = new Map(nodes.map(n => [n.id, n]));
    return edges
      .filter(e => (e.data?.visible ?? true) && visibleIds.has(e.source) && visibleIds.has(e.target))
      .map(e => {
        const srcDate = latestRevDate(nodeMap.get(e.source)?.data.revisions);
        const tgtDate = latestRevDate(nodeMap.get(e.target)?.data.revisions);
        const alert   = !!(srcDate && tgtDate && srcDate > tgtDate);
        const color   = alert ? '#ef4444' : '#3b82f6';
        return {
          ...e,
          style:     { stroke: color, strokeWidth: alert ? 2.5 : 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color },
          markerStart: e.data?.arrow === 'double'
            ? { type: MarkerType.ArrowClosed, color }
            : undefined,
        };
      });
  }, [edges, visibleNodes, nodes]);

  // --- React Flow イベントハンドラ ---
  const onNodesChange = useCallback((changes: NodeChange<AppNode>[]) => {
    const removedNodeIds = new Set(changes.filter(c => c.type === 'remove').map(c => c.id));
    if (removedNodeIds.size > 0) {
      const curEdges     = latestRef.current.edges;
      const removedEdgeIds = new Set(
        curEdges.filter(e => removedNodeIds.has(e.source) || removedNodeIds.has(e.target)).map(e => e.id)
      );
      setEdges(eds => eds.filter(e => !removedNodeIds.has(e.source) && !removedNodeIds.has(e.target)));
      setViews(vs => vs.map(v => ({
        ...v,
        blockLayouts: v.blockLayouts.filter(bl => !removedNodeIds.has(bl.blockId)),
        edgeLayouts:  v.edgeLayouts.filter(el => !removedEdgeIds.has(el.connectorId)),
      })));
    }
    setNodes(nds => applyNodeChanges(changes, nds));
  }, [setNodes, setEdges]);

  const onEdgesChange = useCallback((changes: EdgeChange<AppEdge>[]) => {
    const removedIds = new Set(changes.filter(c => c.type === 'remove').map(c => c.id));
    if (removedIds.size > 0) {
      setViews(vs => vs.map(v => ({
        ...v,
        edgeLayouts: v.edgeLayouts.filter(el => !removedIds.has(el.connectorId)),
      })));
    }
    setEdges(eds => applyEdgeChanges(changes, eds));
  }, [setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    saveSnapshot();
    const lt        = latestRef.current.edges[0]?.data?.lineType ?? diagramLineType;
    const newEdgeId = crypto.randomUUID();
    setEdges(eds => [...eds, {
      id:           newEdgeId,
      source:       connection.source ?? '',
      target:       connection.target ?? '',
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      data: { arrow: 'single', lineType: lt, visible: true },
      ...edgeProps('single', lt),
    }]);
    // 全ビューにエッジレイアウトを追加
    setViews(vs => vs.map(v => ({
      ...v,
      edgeLayouts: [...v.edgeLayouts, {
        connectorId:  newEdgeId,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
        visible:      true,
      }],
    })));
  }, [saveSnapshot, diagramLineType, setEdges]);

  // --- ビュー操作 ---
  const switchView = useCallback((newViewId: string) => {
    const { nodes: cur, edges: curEdges, views: curViews } = latestRef.current;
    const newView = curViews.find(v => v.id === newViewId);
    if (!newView) return;

    // 現在の配置をアクティブビューに保存してからスイッチ
    setViews(vs => vs.map(v => v.id !== activeViewId ? v : {
      ...v,
      blockLayouts: cur.map(n => ({ blockId: n.id, position: n.position, visible: n.data.visible })),
      edgeLayouts:  curEdges.map(e => ({
        connectorId:  e.id,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
        visible:      e.data?.visible ?? true,
      })),
    }));
    setActiveViewId(newViewId);
    setNodes(applyViewLayout(cur, newView));
    setEdges(applyEdgeLayout(curEdges, newView));
  }, [activeViewId, setNodes, setEdges]);

  const addView = useCallback(() => {
    const { nodes: cur, edges: curEdges, views: curViews } = latestRef.current;
    const newView: ViewData = {
      id:   crypto.randomUUID(),
      name: `ビュー ${curViews.length + 1}`,
      filterMode:   'all',
      blockLayouts: cur.map(n => ({ blockId: n.id, position: n.position, visible: n.data.visible })),
      edgeLayouts:  curEdges.map(e => ({
        connectorId:  e.id,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
        visible:      e.data?.visible ?? true,
      })),
    };
    setViews(vs => [...vs, newView]);
    setActiveViewId(newView.id);
  }, []);

  const renameView = useCallback((viewId: string, name: string) => {
    setViews(vs => vs.map(v => v.id === viewId ? { ...v, name } : v));
  }, []);

  const deleteView = useCallback((viewId: string) => {
    const curViews = latestRef.current.views;
    if (curViews.length <= 1) return;
    const remaining = curViews.filter(v => v.id !== viewId);
    setViews(remaining);
    if (viewId === activeViewId) {
      const next = remaining[0];
      const { nodes: cur, edges: curEdges } = latestRef.current;
      setActiveViewId(next.id);
      setNodes(applyViewLayout(cur, next));
      setEdges(applyEdgeLayout(curEdges, next));
    }
  }, [activeViewId, setNodes, setEdges]);

  // --- 要素操作 ---
  const addBlock = useCallback(() => {
    saveSnapshot();
    const offset   = Math.random() * 80;
    const position = { x: 200 + offset, y: 150 + offset };
    const newId    = crypto.randomUUID();
    setNodes(nds => [...nds, {
      id: newId, position,
      data: { label: '新しいブロック', visible: true, revisions: [] },
      type: 'block',
    }]);
    // 全ビューにブロックレイアウトを追加
    setViews(vs => vs.map(v => ({
      ...v,
      blockLayouts: [...v.blockLayouts, { blockId: newId, position, visible: true }],
    })));
  }, [saveSnapshot, setNodes]);

  const deleteSelected = useCallback(() => {
    saveSnapshot();
    const { nodes: cur, edges: curEdges } = latestRef.current;
    const removedNodeIds = new Set(cur.filter(n => n.selected).map(n => n.id));
    const removedEdgeIds = new Set(
      curEdges.filter(e =>
        e.selected || removedNodeIds.has(e.source) || removedNodeIds.has(e.target)
      ).map(e => e.id)
    );
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(e =>
      !e.selected && !removedNodeIds.has(e.source) && !removedNodeIds.has(e.target)
    ));
    setViews(vs => vs.map(v => ({
      ...v,
      blockLayouts: v.blockLayouts.filter(bl => !removedNodeIds.has(bl.blockId)),
      edgeLayouts:  v.edgeLayouts.filter(el => !removedEdgeIds.has(el.connectorId)),
    })));
  }, [saveSnapshot, setNodes, setEdges]);

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

  const toggleNodeVisibility = useCallback((id: string) => {
    saveSnapshot();
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, data: { ...n.data, visible: !n.data.visible } } : n
    ));
    // アクティブビューのブロックレイアウトを更新
    setViews(vs => vs.map(v => {
      if (v.id !== activeViewId) return v;
      return {
        ...v,
        blockLayouts: v.blockLayouts.map(bl =>
          bl.blockId === id ? { ...bl, visible: !bl.visible } : bl
        ),
      };
    }));
  }, [saveSnapshot, activeViewId, setNodes]);

  // --- Ctrl+クリック接続 ---
  const cancelCtrlClick = useCallback(() => {
    if (!ctrlSrcRef.current) return;
    ctrlSrcRef.current = null;
    setNodes(nds => nds.map(n =>
      n.data.ctrlPending ? { ...n, data: { ...n.data, ctrlPending: false } } : n
    ));
  }, [setNodes]);

  const handleCtrlClickNode = useCallback((id: string) => {
    const prev = ctrlSrcRef.current;

    if (!prev) {
      ctrlSrcRef.current = id;
      setNodes(nds => nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, ctrlPending: true } } : n
      ));
      return;
    }

    if (prev === id) {
      ctrlSrcRef.current = null;
      setNodes(nds => nds.map(n =>
        n.data.ctrlPending ? { ...n, data: { ...n.data, ctrlPending: false } } : n
      ));
      return;
    }

    // 2回目: 最近接ハンドルでエッジを作成
    saveSnapshot();
    const { nodes: cur, edges: curEdges } = latestRef.current;
    const srcNode   = cur.find(n => n.id === prev);
    const tgtNode   = cur.find(n => n.id === id);
    const newEdgeId = crypto.randomUUID();

    if (srcNode && tgtNode) {
      const { sourceHandle, targetHandle } = nearestHandlePair(srcNode, tgtNode);
      const lt = curEdges[0]?.data?.lineType ?? diagramLineType;
      setEdges(eds => [...eds, {
        id: newEdgeId, source: prev, target: id,
        sourceHandle, targetHandle,
        data: { arrow: 'single', lineType: lt, visible: true },
        ...edgeProps('single', lt),
      }]);
      setViews(vs => vs.map(v => ({
        ...v,
        edgeLayouts: [...v.edgeLayouts, { connectorId: newEdgeId, sourceHandle, targetHandle, visible: true }],
      })));
    }
    ctrlSrcRef.current = null;
    setNodes(nds => nds.map(n =>
      n.data.ctrlPending ? { ...n, data: { ...n.data, ctrlPending: false } } : n
    ));
  }, [saveSnapshot, diagramLineType, setNodes, setEdges]);

  // --- API ---
  const loadGraph = useCallback(async () => {
    try {
      const raw = await fetchGraph() as any;
      const isOldFormat = !Array.isArray(raw.views?.[0]?.blockLayouts);

      let blocks:     any[] = raw.blocks     ?? [];
      let connectors: any[] = raw.connectors ?? [];
      let loadedViews: ViewData[];

      if (isOldFormat) {
        // 旧フォーマット移行: blocks から position/visible を抜き出してレイアウト化
        const blockLayouts = blocks.map((b: any) => ({
          blockId:  b.id,
          position: b.position ?? { x: 200, y: 150 },
          visible:  b.visible !== false,
        }));
        const edgeLayouts = connectors.map((c: any) => ({
          connectorId:  c.id,
          sourceHandle: c.sourceHandle ?? null,
          targetHandle: c.targetHandle ?? null,
          visible:      c.visible !== false,
        }));
        const rawViews: any[] = raw.views ?? [];
        if (rawViews.length === 0) {
          loadedViews = [{ ...makeDefaultView(), blockLayouts, edgeLayouts }];
        } else {
          loadedViews = rawViews.map((v: any) => {
            const hidden = new Set<string>(v.hiddenBlockIds ?? []);
            return {
              id: v.id, name: v.name ?? 'ビュー', filterMode: v.filterMode ?? 'all',
              blockLayouts: blockLayouts.map((bl: any) => ({ ...bl, visible: !hidden.has(bl.blockId) })),
              edgeLayouts,
            };
          });
        }
        // blocks・connectors を新フォーマットに変換
        blocks = blocks.map((b: any) => ({
          id: b.id, name: b.name, docNumber: b.docNumber, owner: b.owner, contact: b.contact,
          revisions: b.revNumber
            ? [{ revNumber: b.revNumber, revDate: b.revDate ?? '', note: '' }]
            : (b.revisions ?? []),
        }));
        connectors = connectors.map((c: any) => ({
          id: c.id, source: c.source, target: c.target,
          arrow: c.arrow ?? 'single', lineType: c.lineType ?? 'bezier',
        }));
      } else {
        loadedViews = raw.views as ViewData[];
      }

      setViews(loadedViews);
      setActiveViewId(loadedViews[0].id);

      const firstView = loadedViews[0];
      const posMap    = new Map(firstView.blockLayouts.map((bl: any) => [bl.blockId, bl]));
      const edgeMap   = new Map(firstView.edgeLayouts.map((el: any)  => [el.connectorId, el]));
      const lt: LineType = (connectors[0]?.lineType as LineType) ?? 'bezier';
      setDiagramLineTypeState(lt);

      setNodes(blocks.map((b: any) => {
        const layout = posMap.get(b.id) as any;
        return {
          id: b.id,
          position: layout?.position ?? { x: 200, y: 150 },
          data: {
            label:    b.name,
            visible:  layout?.visible ?? true,
            docNumber: b.docNumber,
            owner:    b.owner,
            contact:  b.contact,
            revisions: b.revisions ?? [],
          },
          type: 'block',
        };
      }));

      setEdges(connectors.map((c: any) => {
        const layout = edgeMap.get(c.id) as any;
        return {
          id: c.id, source: c.source, target: c.target,
          sourceHandle: layout?.sourceHandle ?? null,
          targetHandle: layout?.targetHandle ?? null,
          data: { arrow: c.arrow, lineType: lt, visible: layout?.visible ?? true },
          ...edgeProps(c.arrow, lt),
        };
      }));
    } catch (e) {
      console.error('グラフの読み込みに失敗しました', e);
    }
  }, [setNodes, setEdges]);

  const handleSave = useCallback(async () => {
    try {
      const { nodes: cur, edges: curEdges, views: curViews } = latestRef.current;

      // 保存前に現在の配置をアクティブビューに反映
      const updatedViews = curViews.map(v => v.id !== activeViewId ? v : {
        ...v,
        blockLayouts: cur.map(n => ({ blockId: n.id, position: n.position, visible: n.data.visible })),
        edgeLayouts:  curEdges.map(e => ({
          connectorId:  e.id,
          sourceHandle: e.sourceHandle ?? null,
          targetHandle: e.targetHandle ?? null,
          visible:      e.data?.visible ?? true,
        })),
      });

      const graphData: GraphData = {
        blocks: cur.map(n => ({
          id:        n.id,
          name:      n.data.label,
          docNumber: n.data.docNumber,
          owner:     n.data.owner,
          contact:   n.data.contact,
          revisions: n.data.revisions ?? [],
        })),
        connectors: curEdges.map(e => ({
          id:       e.id,
          source:   e.source,
          target:   e.target,
          arrow:    e.data?.arrow    ?? 'single',
          lineType: e.data?.lineType ?? diagramLineType,
        })),
        views: updatedViews,
      };
      await saveGraph(graphData);
    } catch (e) {
      console.error('グラフの保存に失敗しました', e);
      alert('保存に失敗しました');
    }
  }, [activeViewId, diagramLineType]);

  // 全エッジを最近接ハンドルで繋ぎ直す（アクティブビューのエッジレイアウトを更新）
  const reconnectAllEdges = useCallback(() => {
    saveSnapshot();
    const { nodes: cur, edges: curEdges } = latestRef.current;

    const newHandles: Record<string, { sourceHandle: string; targetHandle: string }> = {};
    curEdges.forEach(e => {
      const srcNode = cur.find(n => n.id === e.source);
      const tgtNode = cur.find(n => n.id === e.target);
      if (srcNode && tgtNode) newHandles[e.id] = nearestHandlePair(srcNode, tgtNode);
    });

    setEdges(eds => eds.map(e => {
      const h = newHandles[e.id];
      return h ? { ...e, ...h } : e;
    }));

    setViews(vs => vs.map(v => {
      if (v.id !== activeViewId) return v;
      return {
        ...v,
        edgeLayouts: v.edgeLayouts.map(el => {
          const h = newHandles[el.connectorId];
          return h ? { ...el, ...h } : el;
        }),
      };
    }));
  }, [saveSnapshot, activeViewId, setEdges]);

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
    reconnectAllEdges,
    handleCtrlClickNode, cancelCtrlClick,
    handleSave, loadGraph,
  };
}
