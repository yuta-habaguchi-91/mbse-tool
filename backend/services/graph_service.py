import json
from pathlib import Path
from models.graph import Graph

DATA_FILE = Path(__file__).parent.parent / "data" / "graph.json"


def load_graph() -> Graph:
    if not DATA_FILE.exists():
        return Graph()
    with open(DATA_FILE, encoding="utf-8") as f:
        return Graph.model_validate(json.load(f))


def save_graph(graph: Graph) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(graph.model_dump(), f, ensure_ascii=False, indent=2)
