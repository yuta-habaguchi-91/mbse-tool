# 業務関係整理ツール

業務とその関係をブロック図で整理・記録・可視化するツールです。

## 概要

Miro 風のキャンバス上でブロック（業務・要素）を作成し、コネクタ（矢印）でつないで業務フローや関係を整理します。データは JSON で保存され、複数のビューで同じデータを異なる切り口で表示できます。

## 主な機能

- **ブロック管理**: 業務・要素をブロックとして追加・編集・削除
- **プロパティ編集**: 資料番号・担当者・連絡先をブロックごとに記録
- **改訂履歴**: ブロックごとに改訂番号・改訂日付・変更内容を一覧管理
- **赤矢印アラート**: コネクタの元ブロックの最新改訂日が先ブロックより新しい場合、矢印を赤表示
- **複数ビュー**: 同じデータを複数のレイアウトで表示（ビューごとに配置・表示/非表示を独立管理）
- **オフライン動作**: インターネット不要で動作（`offline-package/` 参照）

## 技術スタック

| 領域 | 技術 |
|---|---|
| バックエンド | Python 3.13 + FastAPI |
| パッケージ管理 | uv |
| フロントエンド | React + TypeScript + Vite |
| グラフ描画 | React Flow (@xyflow/react) |
| データ保存 | JSON ファイル |

## セットアップ（開発環境）

### 前提条件

- Python **3.13** 以上
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

## オフライン環境へのデプロイ

`offline-package/` フォルダに必要なファイルが一式含まれています。  
詳細は [`offline-package/手順書.md`](offline-package/手順書.md) を参照してください。

## 操作方法

### キャンバス操作

| 操作 | 方法 |
|---|---|
| ブロック追加 | ツールバー「＋ ブロック追加」|
| ブロック名変更 | ブロックを**選択後に再クリック**（スローダブルクリック） |
| プロパティ編集 | ブロックを**ダブルクリック**（資料番号・担当者・連絡先・改訂履歴） |
| ブロック移動 | ドラッグ |
| コネクタ作成① | ブロックの端（青い点）をドラッグ → 別ブロックへ |
| コネクタ作成② | Ctrl+クリックで1つ目のブロックを選択 → 2つ目をCtrl+クリック |
| 矢印変更 | コネクタをクリック → サイドバーで「片矢印 / 両矢印」切替 |
| 接続整列 | ツールバー「接続整列」で全矢印を最近接ハンドルに再接続 |
| 削除 | 選択 → Delete キー または「✕ 削除」ボタン |
| 元に戻す | Ctrl+Z |
| ズーム・パン | ホイール / 右ドラッグ |

### 表示設定

| 操作 | 方法 |
|---|---|
| 線の種類 | サイドバー上部で「曲線 / 矩形線」を切替（図全体に適用） |
| 表示/非表示 | サイドバーのブロック一覧のチェックボックス（ビューごとに独立） |
| 関連フィルタ | ブロックを選択 → サイドバーで「選択ブロックの関連のみ」|

### ビュー機能

同じグラフデータに対して、ブロックの配置・表示設定が異なる複数のビューを作成できます。  
ブロックの属性・コネクタの接続関係は全ビューで共通です。

| 操作 | 方法 |
|---|---|
| ビュー追加 | タブバーの「＋」|
| ビュー切替 | タブをクリック |
| ビュー名変更 | タブをダブルクリック |
| ビュー削除 | タブの「×」（最後の1つは削除不可）|

### データ管理

| 操作 | 方法 |
|---|---|
| 保存 | ツールバー「保存」（`backend/data/graph.json` に保存）|
| 読込 | ツールバー「読込」または起動時に自動読込 |

## プロジェクト構成

```
mbse_test/
├── backend/
│   ├── main.py                    # FastAPI エントリーポイント・静的ファイル配信
│   ├── routers/graph.py           # /api/graph エンドポイント
│   ├── models/graph.py            # Pydantic モデル（型定義・camelCase変換）
│   ├── services/graph_service.py  # JSON 読み書きロジック
│   ├── data/graph.json            # データ永続化（自動生成）
│   ├── requirements.txt           # オフライン用パッケージリスト
│   └── pyproject.toml             # uv 依存定義
├── frontend/
│   ├── dist/                      # ビルド済み静的ファイル（本番用）
│   └── src/
│       ├── types/graph.ts         # TypeScript 型定義
│       ├── api/graphApi.ts        # FastAPI との通信
│       ├── hooks/useGraph.ts      # グラフ・ビュー状態管理（カスタムフック）
│       └── components/
│           ├── BlockNode.tsx      # カスタムブロックノード・プロパティモーダル
│           ├── Canvas.tsx         # React Flow キャンバス
│           ├── Toolbar.tsx        # ツールバー
│           ├── Sidebar.tsx        # サイドバー（プロパティ・フィルタ）
│           └── ViewTabs.tsx       # ビュー切替タブ
└── offline-package/
    ├── 手順書.md                  # オフラインインストール手順書
    ├── setup.bat                  # 初回セットアップ（仮想環境作成・依存インストール）
    ├── start.bat                  # ツール起動
    ├── 01_packages/               # Python wheel ファイル（インターネット不要）
    └── app/                       # デプロイ用アプリケーション一式
```

## データ形式

`backend/data/graph.json` に保存されます。  
**ブロック属性・接続関係・ビュー配置情報を分離した構造**になっています。

```json
{
  "blocks": [
    {
      "id": "uuid",
      "name": "受注業務",
      "docNumber": "DOC-001",
      "owner": "山田太郎",
      "contact": "yamada@example.com",
      "revisions": [
        { "revNumber": "Rev.1", "revDate": "2025-01-15", "note": "初版作成" },
        { "revNumber": "Rev.2", "revDate": "2025-06-01", "note": "担当変更" }
      ]
    }
  ],
  "connectors": [
    {
      "id": "uuid",
      "source": "block-id-1",
      "target": "block-id-2",
      "arrow": "single",
      "lineType": "bezier"
    }
  ],
  "views": [
    {
      "id": "uuid",
      "name": "メインビュー",
      "filterMode": "all",
      "blockLayouts": [
        { "blockId": "block-id-1", "position": { "x": 100, "y": 150 }, "visible": true }
      ],
      "edgeLayouts": [
        { "connectorId": "uuid", "sourceHandle": "right", "targetHandle": "left", "visible": true }
      ]
    }
  ]
}
```

## バージョン情報

| コンポーネント | バージョン |
|---|---|
| Python | 3.13 |
| FastAPI | 0.136.1 |
| uvicorn | 0.47.0 |
| React | 19.x |
| @xyflow/react | 12.x |
