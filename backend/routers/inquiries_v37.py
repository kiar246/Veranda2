import json
import logging
import os
from typing import List, Optional

from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.inquiries import InquiriesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/inquiries", tags=["inquiries"])

# ===== Resend mail settings =====
NOTIFICATION_RECIPIENT = "veranda@veranda.cn"
RESEND_FROM = "Veranda Website <no-reply@veranda-corp.com>"


# ---------- Pydantic Schemas ----------
class InquiriesData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    email: str
    phone: str
    note: str = None
    email_sent: bool = None


class InquiriesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    note: Optional[str] = None
    email_sent: Optional[bool] = None


class InquiriesResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: str
    email: str
    phone: str
    note: Optional[str] = None
    email_sent: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InquiriesListResponse(BaseModel):
    """List response schema"""
    items: List[InquiriesResponse]
    total: int
    skip: int
    limit: int


class InquiriesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[InquiriesData]


class InquiriesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: InquiriesUpdateData


class InquiriesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[InquiriesBatchUpdateItem]


class InquiriesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Public submit schemas ----------
class InquirySubmitRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=1, max_length=50)
    note: str = Field(default="", max_length=2000)


class InquirySubmitResponse(BaseModel):
    success: bool
    inquiry_id: int
    email_sent: bool
    message: str


# ---------- Resend helpers ----------
def _build_email_html(data: InquirySubmitRequest, inquiry_id: int) -> str:
    note_html = (data.note or "（无备注）").replace("\n", "<br/>")
    return f"""
    <div style="font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; max-width:640px; margin:0 auto; padding:32px; background:#ffffff; color:#111827;">
      <div style="border-bottom:2px solid #111827; padding-bottom:16px; margin-bottom:24px;">
        <div style="font-size:12px; letter-spacing:0.25em; text-transform:uppercase; color:#6b7280;">Guangzhou Veranda · New Inquiry</div>
        <h1 style="font-size:22px; font-weight:400; margin:8px 0 0;">网站收到一条新的在线询价</h1>
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr><td style="padding:10px 0; color:#6b7280; width:120px;">询价编号</td><td style="padding:10px 0;">#{inquiry_id}</td></tr>
        <tr><td style="padding:10px 0; color:#6b7280;">姓名</td><td style="padding:10px 0; font-weight:500;">{data.name}</td></tr>
        <tr><td style="padding:10px 0; color:#6b7280;">邮箱</td><td style="padding:10px 0;"><a href="mailto:{data.email}" style="color:#111827;">{data.email}</a></td></tr>
        <tr><td style="padding:10px 0; color:#6b7280;">电话</td><td style="padding:10px 0;"><a href="tel:{data.phone}" style="color:#111827;">{data.phone}</a></td></tr>
        <tr><td style="padding:10px 0; color:#6b7280; vertical-align:top;">备注</td><td style="padding:10px 0; line-height:1.7;">{note_html}</td></tr>
      </table>
      <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:12px; color:#9ca3af;">
        本邮件由华安达官网在线询价表单自动发送，请尽快与客户联系。
      </div>
    </div>
    """


async def _send_resend_email(subject: str, html: str, reply_to: Optional[str] = None) -> bool:
    logger.warning("start _send_resend_email")

    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.error("RESEND_API_KEY not configured in environment")
        return False

    payload = {
        "from": RESEND_FROM,
        "to": [NOTIFICATION_RECIPIENT],
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            resp = await http_client.post(
                "https://api.resend.com/emails",
                json=payload,
                headers=headers,
            )

        if resp.status_code in (200, 201, 202):
            logger.warning(f"Resend accepted [{resp.status_code}]: {resp.text}")
            return True

        logger.error(f"Resend email failed [{resp.status_code}]: {resp.text}")
        return False
    except Exception as exc:
        logger.exception(f"Resend email exception: {exc}")
        return False


# ---------- Public website submit route (store + email) ----------
@router.post("/submit", response_model=InquirySubmitResponse)
async def submit_inquiry(
    data: InquirySubmitRequest,
    db: AsyncSession = Depends(get_db),
):
    logger.warning("submit_inquiry reached")

    service = InquiriesService(db)

    # 1) Save to DB
    try:
        created = await service.create(
            {
                "name": data.name.strip(),
                "email": str(data.email).strip(),
                "phone": data.phone.strip(),
                "note": (data.note or "").strip(),
                "email_sent": False,
            }
        )
        if not created:
            raise HTTPException(status_code=400, detail="Failed to create inquiry")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Failed to save inquiry: {exc}")
        raise HTTPException(status_code=500, detail="保存询价信息失败，请稍后再试")

    # 2) Send email (best-effort)
    subject = f"[华安达官网] 新询价 #{created.id} · {data.name}"
    html = _build_email_html(data, created.id)
    email_ok = await _send_resend_email(subject, html, reply_to=str(data.email))

    # 3) Update email_sent flag
    if email_ok:
        try:
            await service.update(created.id, {"email_sent": True})
        except Exception as exc:
            logger.warning(f"Failed to update email_sent flag: {exc}")

    return InquirySubmitResponse(
        success=True,
        inquiry_id=created.id,
        email_sent=email_ok,
        message="提交成功，我们会马上与您联系。" if email_ok else "提交成功，我们已收到您的信息。",
    )


# ---------- Routes ----------
@router.get("", response_model=InquiriesListResponse)
async def query_inquiriess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query inquiriess with filtering, sorting, and pagination"""
    logger.debug(f"Querying inquiriess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = InquiriesService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort,
        )
        logger.debug(f"Found {result['total']} inquiriess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying inquiriess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=InquiriesListResponse)
async def query_inquiriess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    logger.debug(f"Querying inquiriess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = InquiriesService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} inquiriess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying inquiriess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=InquiriesResponse)
async def get_inquiries(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single inquiries by ID"""
    logger.debug(f"Fetching inquiries with id: {id}, fields={fields}")

    service = InquiriesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Inquiries with id {id} not found")
            raise HTTPException(status_code=404, detail="Inquiries not found")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching inquiries {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=InquiriesResponse, status_code=201)
async def create_inquiries(
    data: InquiriesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new inquiries"""
    logger.debug(f"Creating new inquiries with data: {data}")

    service = InquiriesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create inquiries")

        logger.info(f"Inquiries created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating inquiries: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating inquiries: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[InquiriesResponse], status_code=201)
async def create_inquiriess_batch(
    request: InquiriesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple inquiriess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} inquiriess")

    service = InquiriesService(db)
    results = []

    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)

        logger.info(f"Batch created {len(results)} inquiriess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[InquiriesResponse])
async def update_inquiriess_batch(
    request: InquiriesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple inquiriess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} inquiriess")

    service = InquiriesService(db)
    results = []

    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)

        logger.info(f"Batch updated {len(results)} inquiriess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=InquiriesResponse)
async def update_inquiries(
    id: int,
    data: InquiriesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing inquiries"""
    logger.debug(f"Updating inquiries {id} with data: {data}")

    service = InquiriesService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Inquiries with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Inquiries not found")

        logger.info(f"Inquiries {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating inquiries {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating inquiries {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_inquiriess_batch(
    request: InquiriesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple inquiriess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} inquiriess")

    service = InquiriesService(db)
    deleted_count = 0

    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1

        logger.info(f"Batch deleted {deleted_count} inquiriess successfully")
        return {"message": f"Successfully deleted {deleted_count} inquiriess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_inquiries(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single inquiries by ID"""
    logger.debug(f"Deleting inquiries with id: {id}")

    service = InquiriesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Inquiries with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Inquiries not found")

        logger.info(f"Inquiries {id} deleted successfully")
        return {"message": "Inquiries deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting inquiries {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")