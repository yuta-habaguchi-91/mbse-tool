import type { AppNode, AppEdge } from '../hooks/useGraph';
import type { ArrowType, LineType, FilterMode } from '../types/graph';

interface SidebarProps {
  nodes: AppNode[];
  selectedNode: AppNode | null;
  selectedEdge: AppEdge | null;
  filterMode: FilterMode;
  diagramLineType: LineType;
  onFilterModeChange:    (mode: FilterMode)  => void;
  onLabelChange:         (id: string, label: string)   => void;
  onArrowChange:         (id: string, arrow: ArrowType) => void;
  onDiagramLineTypeChange: (lt: LineType) => void;
  onToggleVisibility:    (id: string) => void;
}

export default function Sidebar({
  nodes, selectedNode, selectedEdge,
  filterMode, diagramLineType,
  onFilterModeChange, onLabelChange, onArrowChange,
  onDiagramLineTypeChange, onToggleVisibility,
}: SidebarProps) {
  return (
    <aside className="sidebar">

      {/* 図の設定: 線種（全エッジに一括適用） */}
      <section className="sidebar-section">
        <p className="sidebar-label">線の種類（図全体）</p>
        <div className="toggle-group">
          <button
            className={`btn ${diagramLineType === 'bezier' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onDiagramLineTypeChange('bezier')}
          >〜 曲線</button>
          <button
            className={`btn ${diagramLineType === 'smoothstep' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => onDiagramLineTypeChange('smoothstep')}
          >┐ 矩形線</button>
        </div>
      </section>

      {/* ノード選択時: 名前編集 */}
      {selectedNode && (
        <section className="sidebar-section">
          <p className="sidebar-label">ブロック名</p>
          <input
            className="sidebar-input"
            value={selectedNode.data.label}
            onChange={e => onLabelChange(selectedNode.id, e.target.value)}
          />
          <p className="sidebar-hint">ダブルクリックでキャンバス上でも編集できます</p>
        </section>
      )}

      {/* エッジ選択時: 矢印種別 */}
      {selectedEdge && (
        <section className="sidebar-section">
          <p className="sidebar-label">矢印の種類</p>
          <div className="toggle-group">
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

      {/* 表示フィルタ */}
      <section className="sidebar-section">
        <p className="sidebar-label">表示フィルタ</p>
        <label className="sidebar-radio">
          <input type="radio" name="filter"
            checked={filterMode === 'all'}
            onChange={() => onFilterModeChange('all')}
          />
          全表示
        </label>
        <label className="sidebar-radio">
          <input type="radio" name="filter"
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
