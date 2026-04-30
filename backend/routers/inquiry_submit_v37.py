# @File: backend/routers/inquiry_submit.py
# @Desc: Public inquiry submission endpoint — saves to DB and sends notification email to veranda@veranda.cn via Resend.
import logging
import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.inquiries import Inquiries

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/inquiry", tags=["inquiry"])

NOTIFICATION_RECIPIENT = "veranda@veranda.cn"
RESEND_FROM = os.environ.get(
    "RESEND_FROM",
    "Veranda Website <no-reply@veranda-corp.com>",
)

# Last Resend error captured (for debug exposure via API response).
_LAST_RESEND_ERROR: str = ""


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


async def _send_resend_email(subject: str, html: str) -> bool:
    """Send email via Resend REST API. Returns True on success."""
    global _LAST_RESEND_ERROR
    _LAST_RESEND_ERROR = ""

    logger.warning("start _send_resend_email")
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        _LAST_RESEND_ERROR = "RESEND_API_KEY_NOT_SET: 后端环境变量里没有配置 RESEND_API_KEY"
        logger.error(_LAST_RESEND_ERROR)
        return False

    payload = {
        "from": RESEND_FROM,
        "to": [NOTIFICATION_RECIPIENT],
        "subject": subject,
        "html": html,
    }
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

        _LAST_RESEND_ERROR = f"HTTP {resp.status_code}: {resp.text} | from={RESEND_FROM} to={NOTIFICATION_RECIPIENT}"
        logger.error(f"Resend email failed [{resp.status_code}]: {resp.text}")
        return False
    except Exception as exc:
        _LAST_RESEND_ERROR = f"EXCEPTION: {type(exc).__name__}: {exc}"
        logger.exception(f"Resend email exception: {exc}")
        return False


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


@router.post("/submit", response_model=InquirySubmitResponse)
async def submit_inquiry(
    data: InquirySubmitRequest,
    db: AsyncSession = Depends(get_db),
):
    logger.warning("submit_inquiry reached")

    # 1. Persist to database
    try:
        inquiry = Inquiries(
            name=data.name.strip(),
            email=str(data.email).strip(),
            phone=data.phone.strip(),
            note=(data.note or "").strip(),
            email_sent=False,
        )
        db.add(inquiry)
        await db.commit()
        await db.refresh(inquiry)
    except Exception as exc:
        logger.exception(f"Failed to save inquiry: {exc}")
        raise HTTPException(status_code=500, detail="保存询价信息失败，请稍后再试")

    # 2. Send notification email (best-effort — do not fail the request if email fails)
    subject = f"[华安达官网] 新询价 #{inquiry.id} · {data.name}"
    html = _build_email_html(data, inquiry.id)
    email_ok = await _send_resend_email(subject, html)

    # 3. Update email_sent flag
    if email_ok:
        try:
            inquiry.email_sent = True
            await db.commit()
        except Exception as exc:
            logger.warning(f"Failed to update email_sent flag: {exc}")

    if email_ok:
        msg = f"已保存询价 #{inquiry.id}，邮件发送成功"
    else:
        # Expose the real Resend error so we can diagnose from the client side.
        msg = f"已保存询价 #{inquiry.id}，邮件发送失败 -> {_LAST_RESEND_ERROR or '未知错误'}"

    return InquirySubmitResponse(
        success=True,
        inquiry_id=inquiry.id,
        email_sent=email_ok,
        message=msg,
    )