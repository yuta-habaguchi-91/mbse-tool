# 業務関係整理ツール

業務とその関係をブロック図で整理・記録・可視化するツールです。

## 概要

Miro 風のキャンバス上でブロック（業務・要素）を作成し、コネクタ（矢印）でつないで業務フローや関係を整理します。データは JSON で保存され、絞り込みや表示/非表示の切り替えが可能です。

## 技術スタック

| 領域 | 技術 |
|---|---|
| バックエンド | Python + FastAPI |
| パッケージ管理 | uv |
| フロントエンド | React + TypeScript + Vite |
| グラフ描画 | React Flow (@xyflow/react) |
| データ保存 | JSON ファイル |

## セットアップ

### 前提条件

- Python 3.10 以上
- [uv](https://docs.astral.sh/uv/) インストール済み
- Node.js 18 以上 / npm

### バックエンド起動

```bash
cd backend
uv sync          # 初回: 仮想環境と依存パッケージを作成
uv run uvicorn main:app --reload
```

`http://localhost:8000/docs` で API ドキュメント（Swagger UI）を確認できます。

### フロントエンド起動

```bash
cd frontend
npm install      # 初回のみ
npm run dev
```

`http://localhost:5173` をブラウザで開きます。

## 操作方法

| 操作 | 方法 |
|---|---|
| ブロック追加 | ツールバー「＋ ブロック追加」|
| ブロック名変更 | ブロックをクリック → サイドバーの入力欄で編集 |
| コネクタ作成 | ブロックの端（青い点）をドラッグ → 別ブロックへ |
| 矢印変更 | コネクタをクリック → サイドバーで「片矢印 / 両矢印」切替 |
| 削除 | 選択 → Delete キー または「✕ 削除」ボタン |
| 表示/非表示 | サイドバーのブロック一覧のチェックボックス |
| 関連フィルタ | ブロックを選択 → サイドバーで「選択ブロックの関連のみ」|
| 保存 | ツールバー「保存」（`data/graph.json` に保存）|
| 読込 | ツールバー「読込」または起動時に自動読込 |

## プロジェクト構成

```
mbse_test/
├── backend/
│   ├── main.py                    # FastAPI エントリーポイント
│   ├── routers/graph.py           # /api/graph エンドポイント
│   ├── models/graph.py            # Pydantic モデル（型定義）
│   ├── services/graph_service.py  # JSON 読み書きロジック
│   ├── data/graph.json            # データ永続化（自動生成）
│   └── pyproject.toml             # uv 依存定義
└── frontend/
    └── src/
        ├── types/graph.ts         # TypeScript 型定義
        ├── api/graphApi.ts        # FastAPI との通信
        ├── hooks/useGraph.ts      # グラフ状態管理（カスタムフック）
        └── components/
            ├── BlockNode.tsx      # カスタムブロックノード
            ├── Canvas.tsx         # React Flow キャンバス
            ├── Toolbar.tsx        # ツールバー
            └── Sidebar.tsx        # サイドバー
```

## データ形式

`backend/data/graph.json` に保存されます。

```json
{
  "blocks": [
    {
      "id": "uuid",
      "name": "受注業務",
      "position": { "x": 100, "y": 150 },
      "visible": true
    }
  ],
  "connectors": [
    {
      "id": "uuid",
      "source": "block-id-1",
      "target": "block-id-2",
      "arrow": "single",
      "visible": true
    }
  ]
}
```

## 今後の予定

- ブロックの親子関係（階層構造）
- コネクタへのラベル・関係種別の詳細化
- 検索・クエリ機能
