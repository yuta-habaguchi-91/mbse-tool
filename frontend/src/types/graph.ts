// バックエンドの Pydantic モデルと 1:1 対応させる型定義（camelCase で統一）

export type ArrowType  = 'single' | 'double';
export type LineType   = 'bezier' | 'smoothstep';  // 曲線 | 矩形線
export type FilterMode = 'all' | 'related';

export interface BlockData {
  id: string;
  name: string;
  position: { x: number; y: number };
  visible?: boolean;  // 後方互換。ビュー機能移行後は使わない
}

export interface ConnectorData {
  id: string;
  source: string;
  target: string;
  arrow: ArrowType;
  lineType: LineType;
  visible: boolean;
}

// ビュー: 同一グラフデータに対する「表示設定の組み合わせ」
export interface ViewData {
  id: string;
  name: string;
  hiddenBlockIds: string[];  // このビューで非表示にするブロック ID 一覧
  filterMode: FilterMode;
}

export interface GraphData {
  blocks: BlockData[];
  connectors: ConnectorData[];
  views: ViewData[];
}
