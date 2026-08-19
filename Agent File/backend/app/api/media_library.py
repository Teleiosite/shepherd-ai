"""
Media Library API Endpoints
Manages uploaded media files (PDFs, images, documents) with Supabase Storage integration
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
import base64
import os

from app.database import get_db
from app.dependencies import get_current_active_user
from app.models.user import User
from app.models.media_file import MediaFile

router = APIRouter(prefix="/api/media-library", tags=["Media Library"])


class MediaFileResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    type: str
    mime_type: str
    url: str
    file_name: str
    file_size: int
    upload_date: str


@router.get("/", response_model=List[MediaFileResponse])
async def list_media_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all media files for the user's organization."""
    files = db.query(MediaFile).filter(
        MediaFile.organization_id == current_user.organization_id
    ).order_by(MediaFile.upload_date.desc()).all()

    return [
        MediaFileResponse(
            id=str(f.id),
            organization_id=str(f.organization_id),
            name=f.name,
            description=f.description,
            type=f.type,
            mime_type=f.mime_type,
            url=f.url,
            file_name=f.file_name,
            file_size=f.file_size or 0,
            upload_date=f.upload_date.isoformat() if f.upload_date else datetime.utcnow().isoformat()
        )
        for f in files
    ]


@router.post("/upload", response_model=MediaFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_media_file(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    media_type: Optional[str] = Form("document"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload a file to the organization's media library."""
    contents = await file.read()
    mime_type = file.content_type or "application/octet-stream"
    file_size = len(contents)

    # Supabase Storage Integration (with base64 fallback)
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    public_url = None
    file_key = None

    if supabase_url and supabase_key:
        try:
            from supabase import create_client
            supabase = create_client(supabase_url, supabase_key)
            file_path = f"{current_user.organization_id}/{file.filename}"
            supabase.storage.from_("shepherd-media").upload(
                path=file_path,
                file=contents,
                file_options={"content-type": mime_type, "upsert": "true"}
            )
            public_url = supabase.storage.from_("shepherd-media").get_public_url(file_path)
            file_key = file_path
        except Exception as sup_err:
            print(f"Supabase upload warning: {sup_err}")

    # Fallback to data URL
    if not public_url:
        b64 = base64.b64encode(contents).decode('utf-8')
        public_url = f"data:{mime_type};base64,{b64}"

    record = MediaFile(
        organization_id=current_user.organization_id,
        name=name,
        description=description,
        type=media_type or ("image" if "image" in mime_type else "document"),
        mime_type=mime_type,
        file_key=file_key,
        url=public_url,
        file_name=file.filename or "file",
        file_size=file_size
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return MediaFileResponse(
        id=str(record.id),
        organization_id=str(record.organization_id),
        name=record.name,
        description=record.description,
        type=record.type,
        mime_type=record.mime_type,
        url=record.url,
        file_name=record.file_name,
        file_size=record.file_size,
        upload_date=record.upload_date.isoformat()
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a file from the media library."""
    record = db.query(MediaFile).filter(
        MediaFile.id == UUID(file_id),
        MediaFile.organization_id == current_user.organization_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    db.delete(record)
    db.commit()
    return None
