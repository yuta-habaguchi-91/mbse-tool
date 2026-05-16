from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.graph import router as graph_router

app = FastAPI(title="業務関係整理ツール API")

# React 開発サーバー (port 5173) からのリクエストを許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graph_router)
