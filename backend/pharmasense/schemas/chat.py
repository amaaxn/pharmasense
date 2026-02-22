"""Chat DTOs (Part 2A §7.2–7.3)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ChatMessageDto(BaseModel):
    sender: str = Field(description="'user'/'patient' or 'model'/'assistant'")
    text: str


class ChatRequest(BaseModel):
    visit_id: str
    message: str = Field(min_length=1)
    history: list[ChatMessageDto] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    visit_id: str
