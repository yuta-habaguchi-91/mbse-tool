import { memo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { RevisionEntry } from '../types/graph';

type NodeData = {
  label:     string;
  visible:   boolean;
  ctrlPending?: boolean;
  docNumber?: string;
  owner?:    string;
  contact?:  string;
  revisions: RevisionEntry[];
};

interface PropsEdit {
  docNumber: string;
  owner:     string;
  contact:   string;
  revisions: RevisionEntry[];
}

function BlockNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const typedData = data as NodeData;

  // インライン編集
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // プロパティモーダル
  const [showProps, setShowProps] = useState(false);
  const [propsEdit, setPropsEdit] = useState<PropsEdit>(
    { docNumber: '', owner: '', contact: '', revisions: [] }
  );

  // 遅延クリックリネームのタイマー
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  // 選択解除されたらリネームタイマーをキャンセル
  useEffect(() => {
    if (!selected && clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
  }, [selected]);

  useEffect(() => {
    return () => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current); };
  }, []);

  const startEdit = () => {
    setEditValue(typedData.label);
    setIsEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    updateNodeData(id, { label: trimmed || '名称未設定' });
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // stopPropagation しないと Delete キーがノード削除イベントに伝播する
    e.stopPropagation();
    if (e.key === 'Enter')  commitEdit();
    if (e.key === 'Escape') setIsEditing(false);
  };

  // クリック: 既に選択済みなら 500ms 後にインライン編集開始
  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || isEditing) return;
    if (selected && !clickTimerRef.current) {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        startEdit();
      }, 500);
    }
  };

  // ダブルクリック: リネームタイマーをキャンセルしてプロパティモーダルを開く
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setPropsEdit({
      docNumber: typedData.docNumber ?? '',
      owner:     typedData.owner     ?? '',
      contact:   typedData.contact   ?? '',
      revisions: typedData.revisions.map(r => ({ ...r })),  // shallow copy
    });
    setShowProps(true);
  };

  const commitProps = () => {
    updateNodeData(id, {
      docNumber: propsEdit.docNumber || undefined,
      owner:     propsEdit.owner     || undefined,
      contact:   propsEdit.contact   || undefined,
      revisions: propsEdit.revisions,
    });
    setShowProps(false);
  };

  // 改訂履歴操作
  const addRevision = () => {
    setPropsEdit(p => ({
      ...p,
      revisions: [...p.revisions, { revNumber: '', revDate: '', note: '' }],
    }));
  };
  const removeRevision = (i: number) => {
    setPropsEdit(p => ({ ...p, revisions: p.revisions.filter((_, idx) => idx !== i) }));
  };
  const updateRevision = (i: number, field: keyof RevisionEntry, value: string) => {
    setPropsEdit(p => ({
      ...p,
      revisions: p.revisions.map((r, idx) => idx === i ? { ...r, [field]: value } : r),
    }));
  };

  const latestRev = typedData.revisions?.at(-1);

  return (
    <div
      className={[
        'block-node',
        selected            ? 'selected'     : '',
        typedData.ctrlPending ? 'ctrl-pending' : '',
      ].filter(Boolean).join(' ')}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="source" position={Position.Top}    id="top"    />
      <Handle type="source" position={Position.Left}   id="left"   />

      {isEditing ? (
        <input
          ref={inputRef}
          className="block-label-input nodrag"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleEditKeyDown}
        />
      ) : (
        <span className="block-label">{typedData.label || '名称未設定'}</span>
      )}

      {/* 資料番号 or 最新改訂をサブテキスト表示 */}
      {(typedData.docNumber || latestRev) && (
        <div className="block-props-info">
          {typedData.docNumber && <span>{typedData.docNumber}</span>}
          {latestRev && <span>{latestRev.revNumber}</span>}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Right}  id="right"  />

      {showProps && createPortal(
        <div className="modal-overlay" onClick={() => setShowProps(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{typedData.label || '名称未設定'}</h3>

            {/* 基本情報 */}
            <div className="modal-field">
              <label className="modal-label">資料番号</label>
              <input className="sidebar-input" value={propsEdit.docNumber}
                placeholder="例: DOC-001"
                onChange={e => setPropsEdit(p => ({ ...p, docNumber: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">担当者</label>
              <input className="sidebar-input" value={propsEdit.owner}
                placeholder="例: 山田 太郎"
                onChange={e => setPropsEdit(p => ({ ...p, owner: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">連絡先</label>
              <input className="sidebar-input" value={propsEdit.contact}
                placeholder="例: yamada@example.com"
                onChange={e => setPropsEdit(p => ({ ...p, contact: e.target.value }))}
              />
            </div>

            {/* 改訂履歴 */}
            <div className="modal-field">
              <label className="modal-label">改訂履歴</label>
              {propsEdit.revisions.length > 0 ? (
                <table className="revision-table">
                  <thead>
                    <tr>
                      <th>改訂番号</th>
                      <th>改訂日付</th>
                      <th>ノート</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {propsEdit.revisions.map((rev, i) => (
                      <tr key={i}>
                        <td>
                          <input className="rev-input" value={rev.revNumber}
                            placeholder="Rev.A"
                            onChange={e => updateRevision(i, 'revNumber', e.target.value)}
                          />
                        </td>
                        <td>
                          <input type="date" className="rev-input" value={rev.revDate}
                            onChange={e => updateRevision(i, 'revDate', e.target.value)}
                          />
                        </td>
                        <td>
                          <input className="rev-input rev-input-note" value={rev.note}
                            placeholder="変更内容"
                            onChange={e => updateRevision(i, 'note', e.target.value)}
                          />
                        </td>
                        <td>
                          <button className="rev-delete-btn" onClick={() => removeRevision(i)}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="revision-empty">改訂履歴がありません</p>
              )}
              <button className="btn btn-ghost rev-add-btn" onClick={addRevision}>
                ＋ 改訂追加
              </button>
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={commitProps}>保存</button>
              <button className="btn btn-ghost"   onClick={() => setShowProps(false)}>キャンセル</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default memo(BlockNode);
