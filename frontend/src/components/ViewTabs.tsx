import { useState, useRef, useEffect } from 'react';
import type { ViewData } from '../types/graph';

interface ViewTabsProps {
  views: ViewData[];
  activeViewId: string;
  onSwitch:  (id: string) => void;
  onAdd:     () => void;
  onRename:  (id: string, name: string) => void;
  onDelete:  (id: string) => void;
}

export default function ViewTabs({ views, activeViewId, onSwitch, onAdd, onRename, onDelete }: ViewTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 編集開始時に input にフォーカス
  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  const startRename = (view: ViewData) => {
    setEditName(view.name);
    setEditingId(view.id);
  };

  const commitRename = () => {
    if (editingId) {
      onRename(editingId, editName.trim() || 'ビュー');
      setEditingId(null);
    }
  };

  return (
    <div className="view-tabs">
      {views.map(v => (
        <div
          key={v.id}
          className={`view-tab${v.id === activeViewId ? ' active' : ''}`}
          onClick={() => onSwitch(v.id)}
          onDoubleClick={() => startRename(v)}
          title="ダブルクリックでビュー名を変更"
        >
          {editingId === v.id ? (
            <input
              ref={inputRef}
              className="view-tab-input"
              value={editName}
              autoFocus
              onChange={e => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Enter')  commitRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="view-tab-name">{v.name}</span>
          )}
          {views.length > 1 && (
            <button
              className="view-tab-close"
              title="このビューを削除"
              onClick={e => { e.stopPropagation(); onDelete(v.id); }}
            >×</button>
          )}
        </div>
      ))}
      <button className="view-tab-add" title="ビューを追加" onClick={onAdd}>＋</button>
    </div>
  );
}
