import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  MarkerType,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import { fetchGraph, saveGraph } from '../api/graphApi';
import type { ArrowType, FilterMode, GraphData } from '../types/graph';

// React Flow に渡すノード/エッジの型
// data フィールドに独自メタ情報を持たせる
export type AppNode = Node<{ label: string; visible: boolean }>;
export type AppEdge = Edge<{ arrow: ArrowType; visible: boolean }>;

// 矢印種別に応じた React Flow のエッジスタイルを返す
function arrowStyle(arrow: ArrowType) {
  return {
    markerEnd:   { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    markerStart: arrow === 'double'
      ? { type: MarkerType.ArrowClosed, color: '#3b82f6' }
      : undefined,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
  };
}

export function useGraph() {
  // useNodesState / useEdgesState は React Flow が提供するヘルパー
  // 内部で useState + applyXxxChanges をラップしている
  const [nodes, setNodes] = useNodesState<AppNode>([]);
  const [edges, setEdges] = useEdgesState<AppEdge>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // 選択中のノード/エッジを nodes/edges 配列から取得
  const selectedNode = useMemo(() => nodes.find(n => n.selected) ?? null, [nodes]);
  const selectedEdge = useMemo(() => edges.find(e => e.selected) ?? null, [edges]);

  // フィルタモードと可視フラグに基づいて表示するノードを絞り込む
  const visibleNodes = useMemo<AppNode[]>(() => {
    const base = nodes.filter(n => n.data.visible);
    if (filterMode === 'all' || !selectedNode) return base;

    // 関連表示: 選択ノードと直接つながるノードのみ
    const relatedIds = new Set([selectedNode.id]);
    edges.forEach(e => {
      if (e.source === selectedNode.id) relatedIds.add(e.target);
      if (e.target === selectedNode.id) relatedIds.add(e.source);
    });
    return base.filter(n => relatedIds.has(n.id));
  }, [nodes, edges, filterMode, selectedNode]);

  // 両端のノードが visibleNodes に含まれるエッジのみ表示
  const visibleEdges = useMemo<AppEdge[]>(() => {
    const visibleIds = new Set(visibleNodes.map(n => n.id));
    return edges.filter(
      e => (e.data?.visible ?? true) && visibleIds.has(e.source) && visibleIds.has(e.target)
    );
  }, [edges, visibleNodes]);

  // ノード変化ハンドラ: ノード削除時に接続エッジも一緒に消す
  const onNodesChange = useCallback((changes: NodeChange<AppNode>[]) => {
    const removedIds = new Set(
      changes.filter(c => c.type === 'remove').map(c => c.id)
    );
    if (removedIds.size > 0) {
      setEdges(eds => eds.filter(
        e => !removedIds.has(e.source) && !removedIds.has(e.target)
      ));
    }
    setNodes(nds => applyNodeChanges(changes, nds));
  }, [setNodes, setEdges]);

  const onEdgesChange = useCallback((changes: EdgeChange<AppEdge>[]) => {
    setEdges(eds => {
      let result = [...eds];
      for (const change of changes) {
        if (change.type === 'remove') {
          result = result.filter(e => e.id !== change.id);
        } else if (change.type === 'select') {
          result = result.map(e => e.id === change.id ? { ...e, selected: change.selected } : e);
        }
      }
      return result;
    });
  }, [setEdges]);

  // 新しいコネクタを作成 (React Flow のドラッグ接続イベント)
  const onConnect = useCallback((connection: Connection) => {
    const newEdge: AppEdge = {
      id: crypto.randomUUID(),
      source: connection.source ?? '',
      target: connection.target ?? '',
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      data: { arrow: 'single', visible: true },
      ...arrowStyle('single'),
    };
    setEdges(eds => [...eds, newEdge]);
  }, [setEdges]);

  // ブロックをキャンバス中央付近に追加
  const addBlock = useCallback(() => {
    const offset = Math.random() * 80;
    setNodes(nds => [...nds, {
      id: crypto.randomUUID(),
      position: { x: 200 + offset, y: 150 + offset },
      data: { label: '新しいブロック', visible: true },
      type: 'block',
    }]);
  }, [setNodes]);

  // 選択中のノード/エッジを削除 (接続エッジも含む)
  const deleteSelected = useCallback(() => {
    const removedNodeIds = new Set(nodes.filter(n => n.selected).map(n => n.id));
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(
      e => !e.selected && !removedNodeIds.has(e.source) && !removedNodeIds.has(e.target)
    ));
  }, [nodes, setNodes, setEdges]);

  // ノード名を更新
  const updateNodeLabel = useCallback((id: string, label: string) => {
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, data: { ...n.data, label } } : n
    ));
  }, [setNodes]);

  // コネクタの矢印種別を更新
  const updateEdgeArrow = useCallback((id: string, arrow: ArrowType) => {
    setEdges(eds => eds.map(e =>
      e.id === id ? { ...e, data: { ...e.data!, arrow }, ...arrowStyle(arrow) } : e
    ));
  }, [setEdges]);

  // 個別ブロックの表示/非表示を切り替え
  const toggleNodeVisibility = useCallback((id: string) => {
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, data: { ...n.data, visible: !n.data.visible } } : n
    ));
  }, [setNodes]);

  // API からグラフを読み込む
  const loadGraph = useCallback(async () => {
    try {
      const data = await fetchGraph();
      setNodes(data.blocks.map(b => ({
        id: b.id,
        position: b.position,
        data: { label: b.name, visible: b.visible },
        type: 'block',
      })));
      setEdges(data.connectors.map(c => ({
        id: c.id,
        source: c.source,
        target: c.target,
        data: { arrow: c.arrow, visible: c.visible },
        ...arrowStyle(c.arrow),
      })));
    } catch (e) {
      console.error('グラフの読み込みに失敗しました', e);
    }
  }, [setNodes, setEdges]);

  // グラフを API に保存する
  const handleSave = useCallback(async () => {
    try {
      const graphData: GraphData = {
        blocks: nodes.map(n => ({
          id: n.id,
          name: n.data.label,
          position: n.position,
          visible: n.data.visible,
        })),
        connectors: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          arrow: e.data?.arrow ?? 'single',
          visible: e.data?.visible ?? true,
        })),
      };
      await saveGraph(graphData);
    } catch (e) {
      console.error('グラフの保存に失敗しました', e);
      alert('保存に失敗しました');
    }
  }, [nodes, edges]);

  // マウント時に自動読み込み
  useEffect(() => { loadGraph(); }, [loadGraph]);

  return {
    nodes, edges,
    visibleNodes, visibleEdges,
    onNodesChange, onEdgesChange, onConnect,
    selectedNode, selectedEdge,
    addBlock, deleteSelected,
    updateNodeLabel, updateEdgeArrow, toggleNodeVisibility,
    filterMode, setFilterMode,
    handleSave, loadGraph,
  };
}
