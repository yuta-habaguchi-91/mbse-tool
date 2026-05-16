// FastAPI サーバーとの通信を担当する層
// UI コンポーネントから fetch を直接呼ばず、ここに集約することで変更に強くなる

import type { GraphData } from '../types/graph';

const BASE = 'http://localhost:8000/api/graph';

export async function fetchGraph(): Promise<GraphData> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
  return res.json() as Promise<GraphData>;
}

export async function saveGraph(data: GraphData): Promise<void> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`save failed: HTTP ${res.status}`);
}
