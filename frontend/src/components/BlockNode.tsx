import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';

type NodeData = { label: string; visible: boolean };

function BlockNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const [isEditing, setIsEditing]   = useState(false);
  const [editValue, setEditValue]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const typedData = data as NodeData;

  // 編集モードに入ったら input に即フォーカス・全選択
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEdit = () => {
    setEditValue(typedData.label);
    setIsEditing(true);
  };

  const commit = () => {
    const trimmed = editValue.trim();
    // useReactFlow().updateNodeData でノードデータを部分更新できる
    updateNodeData(id, { label: trimmed || '名称未設定' });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // stopPropagation しないと Delete キーがノード削除イベントに伝播する
    e.stopPropagation();
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') setIsEditing(false);
  };

  return (
    <div
      className={`block-node${selected ? ' selected' : ''}`}
      onDoubleClick={startEdit}
    >
      <Handle type="source" position={Position.Top}    id="top"    />
      <Handle type="source" position={Position.Left}   id="left"   />
      {isEditing ? (
        <input
          ref={inputRef}
          // nodrag: この要素上のドラッグを React Flow が無視する規約クラス
          className="block-label-input nodrag"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span className="block-label">{typedData.label || '名称未設定'}</span>
      )}
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Right}  id="right"  />
    </div>
  );
}

export default memo(BlockNode);
