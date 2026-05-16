import type { AppNode, AppEdge } from '../hooks/useGraph';
import type { ArrowType, FilterMode } from '../types/graph';

interface SidebarProps {
  nodes: AppNode[];                          // 全ブロック（表示切り替えリスト用）
  selectedNode: AppNode | null;
  selectedEdge: AppEdge | null;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  onLabelChange: (id: string, label: string) => void;
  onArrowChange: (id: string, arrow: ArrowType) => void;
  onToggleVisibility: (id: string) => void;
}

export default function Sidebar({
  nodes, selectedNode, selectedEdge,
  filterMode, onFilterModeChange,
  onLabelChange, onArrowChange, onToggleVisibility,
}: SidebarProps) {
  return (
    <aside className="sidebar">

      {/* プロパティパネル: ノード選択時 */}
      {selectedNode && (
        <section className="sidebar-section">
          <p className="sidebar-label">ブロック名</p>
          <input
            className="sidebar-input"
            value={selectedNode.data.label}
            onChange={e => onLabelChange(selectedNode.id, e.target.value)}
          />
        </section>
      )}

      {/* プロパティパネル: エッジ選択時 */}
      {selectedEdge && (
        <section className="sidebar-section">
          <p className="sidebar-label">矢印の種類</p>
          <div className="arrow-toggle">
            <button
              className={`btn ${selectedEdge.data?.arrow === 'single' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onArrowChange(selectedEdge.id, 'single')}
            >→ 片矢印</button>
            <button
              className={`btn ${selectedEdge.data?.arrow === 'double' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onArrowChange(selectedEdge.id, 'double')}
            >↔ 両矢印</button>
          </div>
        </section>
      )}

      {/* フィルタ */}
      <section className="sidebar-section">
        <p className="sidebar-label">表示フィルタ</p>
        <label className="sidebar-radio">
          <input
            type="radio" name="filter"
            checked={filterMode === 'all'}
            onChange={() => onFilterModeChange('all')}
          />
          全表示
        </label>
        <label className="sidebar-radio">
          <input
            type="radio" name="filter"
            checked={filterMode === 'related'}
            onChange={() => onFilterModeChange('related')}
          />
          選択ブロックの関連のみ
        </label>
      </section>

      {/* ブロック一覧（表示/非表示トグル） */}
      <section className="sidebar-section">
        <p className="sidebar-label">ブロック一覧</p>
        {nodes.length === 0 && <p className="sidebar-empty">ブロックがありません</p>}
        <ul className="block-list">
          {nodes.map(n => (
            <li key={n.id} className="block-list-item">
              <label className="block-list-label">
                <input
                  type="checkbox"
                  checked={n.data.visible}
                  onChange={() => onToggleVisibility(n.id)}
                />
                <span className={n.data.visible ? '' : 'hidden-text'}>{n.data.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

    </aside>
  );
}
