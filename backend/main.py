from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from routers.graph import router as graph_router

# ビルド済みフロントエンドのパス（本番時はここに dist/ を配置する）
DIST_DIR = Path(__file__).parent.parent / "frontend" / "dist"

app = FastAPI(title="業務関係整理ツール API")

# 開発時（Vite dev server）からのアクセスを許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API ルートを最優先で登録
app.include_router(graph_router)

# ビルド済みフロントエンドを配信（dist/ が存在する場合のみ有効）
if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        # JS/CSS ファイルを効率的に配信
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/", include_in_schema=False)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str = "") -> FileResponse:
        """React SPA のすべてのルートに index.html を返す"""
        return FileResponse(str(DIST_DIR / "index.html"))
