from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from typing import List, Optional
from database import get_supabase
from services.extractor import extract_payslip
from middleware.auth import get_current_user
import uuid

router = APIRouter(tags=["extract"])

MAX_FILE_SIZE_MB = 20
ALLOWED_MIME = {"application/pdf"}


def validate_file(file: UploadFile):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail=f"{file.filename} is not a PDF.")


@router.post("/extract")
async def extract_payslips(
    files: List[UploadFile] = File(...),
    project_id: Optional[str] = Form(None),
    user=Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    for f in files:
        validate_file(f)

    supabase = get_supabase()
    session_id = str(uuid.uuid4())

    session_payload = {
        "id": session_id,
        "status": "processing",
        "file_count": len(files),
        "user_id": user["user_id"],
    }
    if project_id:
        session_payload["project_id"] = project_id

    supabase.table("sessions").insert(session_payload).execute()

    results = []
    errors = []

    for file in files:
        try:
            pdf_bytes = await file.read()
            if len(pdf_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
                raise ValueError(f"File exceeds {MAX_FILE_SIZE_MB}MB limit.")

            extracted = await extract_payslip(pdf_bytes, file.filename)

            supabase.table("payslip_rows").insert({
                "session_id": session_id,
                "filename": file.filename,
                "data": extracted,
            }).execute()

            results.append({"filename": file.filename, "data": extracted})

        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})

    final_status = "done" if not errors else ("error" if not results else "partial")
    supabase.table("sessions").update({"status": final_status}).eq("id", session_id).execute()

    return {
        "session_id": session_id,
        "project_id": project_id,
        "status": final_status,
        "processed": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors,
    }
