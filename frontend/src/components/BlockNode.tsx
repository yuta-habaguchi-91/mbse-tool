import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

// 全 4 辺にハンドルを配置し、任意の方向に接続できるようにする
function BlockNode({ data, selected }: NodeProps) {
  const label = (data as { label: string }).label || '名称未設定';
  return (
    <div className={`block-node${selected ? ' selected' : ''}`}>
      <Handle type="source" position={Position.Top}    id="top"    />
      <Handle type="source" position={Position.Left}   id="left"   />
      <span className="block-label">{label}</span>
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Right}  id="right"  />
    </div>
  );
}

export default memo(BlockNode);
