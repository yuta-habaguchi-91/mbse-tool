from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
import uuid, re


def new_id() -> str:
    return str(uuid.uuid4())


def to_camel(s: str) -> str:
    """snake_case → camelCase（JSON キー変換用）"""
    return re.sub(r'_([a-z])', lambda m: m.group(1).upper(), s)


class CamelModel(BaseModel):
    """JSON は camelCase、Python フィールドは snake_case で扱う共通基底クラス"""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Position(CamelModel):
    x: float
    y: float


class Block(CamelModel):
    id: str = Field(default_factory=new_id)
    name: str
    position: Position
    visible: bool = True  # 後方互換のため残す（ビュー機能移行後は使わない）


class Connector(CamelModel):
    id: str = Field(default_factory=new_id)
    source: str
    target: str
    source_handle: Optional[str] = None  # JSON: "sourceHandle"
    target_handle: Optional[str] = None  # JSON: "targetHandle"
    arrow: str = "single"                # "single" | "double"
    line_type: str = "bezier"            # JSON: "lineType"
    visible: bool = True


class View(CamelModel):
    id: str = Field(default_factory=new_id)
    name: str = "メインビュー"
    hidden_block_ids: List[str] = []  # JSON: "hiddenBlockIds"
    filter_mode: str = "all"          # JSON: "filterMode"


class Graph(CamelModel):
    blocks: List[Block] = []
    connectors: List[Connector] = []
    views: List[View] = []
