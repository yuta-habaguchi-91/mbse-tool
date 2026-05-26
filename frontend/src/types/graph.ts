// バックエンドの Pydantic モデルと 1:1 対応させる型定義（camelCase で統一）

export type ArrowType  = 'single' | 'double';
export type LineType   = 'bezier' | 'smoothstep';
export type FilterMode = 'all' | 'related';

// ===== ブロック（業務・作業のマスターデータ） =====

export interface RevisionEntry {
  revNumber: string;  // 改訂番号 例: Rev.A
  revDate:   string;  // 改訂日付 YYYY-MM-DD
  note:      string;  // 変更内容ノート
}

export interface BlockData {
  id:        string;
  name:      string;
  docNumber?: string;
  owner?:    string;
  contact?:  string;
  revisions: RevisionEntry[];
}

// ===== コネクタ（接続関係のみ） =====

export interface ConnectorData {
  id:       string;
  source:   string;
  target:   string;
  arrow:    ArrowType;
  lineType: LineType;
}

// ===== ビュー（配置情報 = 図上の見え方） =====

export interface BlockLayout {
  blockId:  string;
  position: { x: number; y: number };
  visible:  boolean;
}

export interface EdgeLayout {
  connectorId:  string;
  sourceHandle: string | null;
  targetHandle: string | null;
  visible:      boolean;
}

export interface ViewData {
  id:           string;
  name:         string;
  filterMode:   FilterMode;
  blockLayouts: BlockLayout[];
  edgeLayouts:  EdgeLayout[];
}

export interface GraphData {
  blocks:     BlockData[];
  connectors: ConnectorData[];
  views:      ViewData[];
}
