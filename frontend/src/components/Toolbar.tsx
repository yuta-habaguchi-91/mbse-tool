interface ToolbarProps {
  onAddBlock: () => void;
  onDelete: () => void;
  onSave: () => void;
  onLoad: () => void;
}

export default function Toolbar({ onAddBlock, onDelete, onSave, onLoad }: ToolbarProps) {
  return (
    <header className="toolbar">
      <span className="toolbar-title">業務関係整理ツール</span>
      <div className="toolbar-actions">
        <button className="btn btn-primary" onClick={onAddBlock}>＋ ブロック追加</button>
        <button className="btn btn-danger"  onClick={onDelete}>✕ 削除</button>
        <div className="toolbar-sep" />
        <button className="btn btn-ghost"   onClick={onLoad}>読込</button>
        <button className="btn btn-ghost"   onClick={onSave}>保存</button>
      </div>
    </header>
  );
}
