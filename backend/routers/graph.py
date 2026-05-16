from fastapi import APIRouter
from models.graph import Graph
from services.graph_service import load_graph, save_graph

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("", response_model=Graph)
def get_graph():
    """保存済みグラフデータを返す"""
    return load_graph()


@router.post("")
def post_graph(graph: Graph):
    """グラフデータを上書き保存する"""
    save_graph(graph)
    return {"status": "ok"}
