import {
  ReactFlow,
  Background,
  Controls,
  ConnectionMode,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import BlockNode from './BlockNode';
import type { AppNode, AppEdge } from '../hooks/useGraph';

// nodeTypes はコンポーネント外で定義する
// → レンダリングごとに新しいオブジェクトにならないため React Flow が再マウントしない
const nodeTypes = { block: BlockNode };

interface CanvasProps {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;
}

export default function Canvas({ nodes, edges, onNodesChange, onEdgesChange, onConnect }: CanvasProps) {
  return (
    // ReactFlow は親要素の幅/高さをそのまま使うので、親に flex:1 を設定する
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      // Loose モード: source/target の種別に関係なく任意ハンドル間で接続可能
      connectionMode={ConnectionMode.Loose}
      multiSelectionKeyCode="Shift"
      deleteKeyCode="Delete"
      fitView
      fitViewOptions={{ padding: 0.3 }}
    >
      <Background gap={20} color="#e2e8f0" />
      <Controls />
    </ReactFlow>
  );
}
