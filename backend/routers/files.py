from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from database import get_supabase
from services.excel_generator import generate_excel

router = APIRouter(tags=["files"])

@router.get("/files/{session_id}/excel")
async def download_excel(session_id: str):
    supabase = get_supabase()
    session = supabase.table("sessions").select("*").eq("id", session_id).single().execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.data["status"] not in ("done", "partial"):
        raise HTTPException(status_code=400, detail=f"Session not ready: {session.data['status']}")
    rows_resp = supabase.table("payslip_rows").select("*").eq("session_id", session_id).execute()
    if not rows_resp.data:
        raise HTTPException(status_code=404, detail="No rows found.")
    excel_bytes = generate_excel([row["data"] for row in rows_resp.data])
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=payslips_{session_id[:8]}.xlsx"},
    )