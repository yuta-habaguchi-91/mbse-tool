from __future__ import annotations
from typing import List
from pydantic import BaseModel, Field
import uuid


def new_id() -> str:
    return str(uuid.uuid4())


class Position(BaseModel):
    x: float
    y: float


class Block(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    position: Position
    visible: bool = True


class Connector(BaseModel):
    id: str = Field(default_factory=new_id)
    source: str          # Block.id
    target: str          # Block.id
    arrow: str = "single"  # "single" | "double"
    visible: bool = True


class Graph(BaseModel):
    blocks: List[Block] = []
    connectors: List[Connector] = []
