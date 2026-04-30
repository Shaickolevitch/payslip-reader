from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from database import get_supabase
from middleware.auth import get_current_user
from config import settings
import anthropic
import json

router = APIRouter(tags=["agent"])
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """You are a payroll data analyst assistant. You have access to payslip data extracted from PDFs.
Answer questions clearly and concisely. When doing calculations, show the result prominently.
If asked about specific employees, filter to their data. For aggregations (totals, averages, counts), compute them precisely.
Always respond in the same language the user is writing in (Hebrew or English).
If data is missing or null for a field, mention it rather than ignoring it."""


class ChatMessage(BaseModel):
    message: str
    history: list = []


def build_data_context(rows: list[dict]) -> str:
    if not rows:
        return "No payslip data available for this project."
    payslips = [row["data"] for row in rows]
    return f"PAYSLIP DATA ({len(payslips)} records):\n{json.dumps(payslips, ensure_ascii=False, indent=2)}"


@router.post("/agent/{project_id}/chat")
async def chat(project_id: str, body: ChatMessage, user=Depends(get_current_user)):
    supabase = get_supabase()

    # Verify project belongs to user
    project = (
        supabase.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("user_id", user["user_id"])
        .single()
        .execute()
    )
    if not project.data:
        raise HTTPException(status_code=403, detail="Project not found.")

    sessions_res = (
        supabase.table("sessions")
        .select("id")
        .eq("project_id", project_id)
        .execute()
    )
    if not sessions_res.data:
        raise HTTPException(status_code=404, detail="No data found for this project.")

    session_ids = [s["id"] for s in sessions_res.data]
    all_rows = []
    for sid in session_ids:
        rows_res = supabase.table("payslip_rows").select("*").eq("session_id", sid).execute()
        all_rows.extend(rows_res.data or [])

    data_context = build_data_context(all_rows)

    messages = []
    for h in body.history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": f"{data_context}\n\nQuestion: {body.message}"})

    def stream():
        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=messages,
        ) as s:
            for text in s.text_stream:
                yield text

    return StreamingResponse(stream(), media_type="text/plain")
