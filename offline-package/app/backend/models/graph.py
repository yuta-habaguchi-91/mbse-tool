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


# ===== ブロック（業務・作業のマスターデータ） =====

class Revision(CamelModel):
    """改訂履歴の1エントリ"""
    rev_number: str = ""   # JSON: "revNumber"  改訂番号
    rev_date:   str = ""   # JSON: "revDate"    改訂日付 (YYYY-MM-DD)
    note:       str = ""   # 変更内容ノート


class Block(CamelModel):
    """業務・作業の属性情報（配置情報を持たない）"""
    id:         str = Field(default_factory=new_id)
    name:       str
    doc_number: Optional[str] = None   # JSON: "docNumber"  資料番号
    owner:      Optional[str] = None   # 担当者
    contact:    Optional[str] = None   # 連絡先
    revisions:  List[Revision] = []    # 改訂履歴（新しいものを末尾に追加する慣習）


# ===== コネクタ（接続関係のみ。配置情報を持たない） =====

class Connector(CamelModel):
    """ブロック間の接続関係と矢印種別"""
    id:        str = Field(default_factory=new_id)
    source:    str
    target:    str
    arrow:     str = "single"   # "single" | "double"
    line_type: str = "bezier"   # JSON: "lineType"   "bezier" | "smoothstep"


# ===== ビュー（配置情報＝図上の見え方） =====

class BlockLayout(CamelModel):
    """1ビュー内での1ブロックの配置情報"""
    block_id:  str           # JSON: "blockId"
    position:  Position
    visible:   bool = True


class EdgeLayout(CamelModel):
    """1ビュー内での1コネクタの配置情報（接続ハンドルと表示フラグ）"""
    connector_id:  str            # JSON: "connectorId"
    source_handle: Optional[str] = None  # JSON: "sourceHandle"
    target_handle: Optional[str] = None  # JSON: "targetHandle"
    visible:       bool = True


class View(CamelModel):
    id:            str = Field(default_factory=new_id)
    name:          str = "メインビュー"
    filter_mode:   str = "all"              # JSON: "filterMode"
    block_layouts: List[BlockLayout] = []   # JSON: "blockLayouts"
    edge_layouts:  List[EdgeLayout]  = []   # JSON: "edgeLayouts"


class Graph(CamelModel):
    blocks:     List[Block]     = []
    connectors: List[Connector] = []
    views:      List[View]      = []
