import os
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

from templates_manager import TemplateManager
from pdf_engine import PDFOverlayEngine
from validator import FormValidator

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Stamp PDF Engine API",
    description="학교 각종 서식 자동 입력 및 PDF 오버레이 엔진 백엔드",
    version="1.0.0"
)

# CORS 설정 (Vercel 및 로컬 개발용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

template_manager = TemplateManager()
pdf_engine = PDFOverlayEngine()
validator = FormValidator()

class PDFSubmissionRequest(BaseModel):
    data: Dict[str, Any]

@app.get("/")
def read_root():
    return {"message": "Stamp PDF Generation Server is Running Successfully!"}

@app.get("/api/templates")
def list_templates():
    return template_manager.get_all_templates()

@app.get("/api/templates/{template_id}")
def get_template(template_id: str):
    template = template_manager.get_template_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
    return template

@app.post("/api/templates")
def create_or_update_template(template_data: Dict[str, Any]):
    saved = template_manager.save_template(template_data)
    return {"status": "success", "template": saved}

@app.post("/api/fill-pdf/{template_id}")
def fill_pdf_template(template_id: str, request: PDFSubmissionRequest):
    template = template_manager.get_template_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="지정된 템플릿을 찾을 수 없습니다.")

    submission_data = request.data or {}

    # Validation
    val_result = validator.validate_submission(template, submission_data)
    if not val_result.is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "필수 입력 사항 누락 또는 날짜 순서 위반으로 PDF 출력이 차단되었습니다.",
                "missing_fields": val_result.missing_fields,
                "field_errors": val_result.field_errors
            }
        )

    pdf_filename = template.get("pdf_filename")
    pdf_path = os.path.join(UPLOAD_DIR, pdf_filename)

    if not os.path.exists(pdf_path):
        # Fallback to root or default base pdf
        alt_pdf_path = os.path.join(BASE_DIR, pdf_filename)
        if os.path.exists(alt_pdf_path):
            pdf_path = alt_pdf_path
        else:
            raise HTTPException(status_code=404, detail=f"기본 양식 PDF 파일({pdf_filename})이 서버에 존재하지 않습니다.")

    try:
        output_pdf_bytes = pdf_engine.generate_filled_pdf(pdf_path, template, submission_data)
        return Response(
            content=output_pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Stamp_{template_id}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 생성 처리 중 오류 발생: {str(e)}")
