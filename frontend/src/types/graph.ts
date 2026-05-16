// バックエンドの Pydantic モデルと 1:1 対応させる型定義

export type ArrowType = 'single' | 'double';
export type FilterMode = 'all' | 'related';

export interface BlockData {
  id: string;
  name: string;
  position: { x: number; y: number };
  visible: boolean;
}

export interface ConnectorData {
  id: string;
  source: string;
  target: string;
  arrow: ArrowType;
  visible: boolean;
}

export interface GraphData {
  blocks: BlockData[];
  connectors: ConnectorData[];
}
