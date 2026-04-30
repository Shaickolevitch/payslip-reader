from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_supabase
from middleware.auth import get_current_user
from typing import Optional

router = APIRouter(tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


@router.get("/projects")
async def list_projects(user=Depends(get_current_user)):
    supabase = get_supabase()
    res = (
        supabase.table("projects")
        .select("*")
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.post("/projects")
async def create_project(body: ProjectCreate, user=Depends(get_current_user)):
    supabase = get_supabase()
    res = supabase.table("projects").insert({
        "name": body.name,
        "description": body.description,
        "user_id": user["user_id"],
    }).execute()
    return res.data[0]


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user=Depends(get_current_user)):
    supabase = get_supabase()
    supabase.table("projects").delete().eq("id", project_id).eq("user_id", user["user_id"]).execute()
    return {"deleted": project_id}


@router.get("/projects/{project_id}/sessions")
async def get_project_sessions(project_id: str, user=Depends(get_current_user)):
    supabase = get_supabase()
    res = (
        supabase.table("sessions")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data
