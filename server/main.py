import os
import json
import uuid
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel

from templates_manager import TemplateManager
from validator import FormValidator
from pdf_engine import PDFOverlayEngine

app = FastAPI(title="Stamp Form Filler API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

template_mgr = TemplateManager()
pdf_engine = PDFOverlayEngine()

class FieldModel(BaseModel):
    id: str
    label: str
    page: int = 0
    x: float
    y: float
    width: float = 200.0
    height: float = 30.0
    font_size: float = 12.0
    required: bool = False
    multiline: bool = False
    placeholder: str = ""

class TemplateModel(BaseModel):
    id: str
    name: str
    description: str = ""
    pdf_filename: str
    page_count: int = 1
    fields: List[FieldModel]

class SubmissionModel(BaseModel):
    data: Dict[str, Any]

@app.get("/api/templates")
def get_templates():
    return template_mgr.get_all_templates()

@app.get("/api/templates/{template_id}")
def get_template(template_id: str):
    t = template_mgr.get_template(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="양식을 찾을 수 없습니다.")
    return t

@app.post("/api/templates/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")

    filename = f"{uuid.uuid4().hex}_{file.filename}"
    content = await file.read()
    filepath = template_mgr.save_pdf_file(content, filename)

    import fitz
    doc = fitz.open(filepath)
    page_count = len(doc)
    doc.close()

    return {
        "pdf_filename": filename,
        "original_filename": file.filename,
        "page_count": page_count
    }

@app.post("/api/templates")
def save_template(template: TemplateModel):
    saved = template_mgr.save_template(template.dict())
    return saved

@app.delete("/api/templates/{template_id}")
def delete_template(template_id: str):
    success = template_mgr.delete_template(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="삭제할 양식을 찾을 수 없습니다.")
    return {"status": "success", "message": "양식이 삭제되었습니다."}

@app.get("/api/templates/{template_id}/preview-image")
def get_template_page_image(template_id: str, page: int = 0):
    t = template_mgr.get_template(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="양식을 찾을 수 없습니다.")

    pdf_path = os.path.join(template_mgr.UPLOADS_DIR, t["pdf_filename"])
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF 파일이 존재하지 않습니다.")

    try:
        png_bytes = pdf_engine.render_pdf_page_as_png(pdf_path, page_num=page)
        return Response(content=png_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 변환 오류: {str(e)}")

@app.post("/api/fill-pdf/{template_id}")
def fill_pdf(template_id: str, submission: SubmissionModel):
    t = template_mgr.get_template(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="양식을 찾을 수 없습니다.")

    sub_data = submission.data

    # 필수 항목 및 날짜 순서 유효성 검사
    is_valid, missing_labels, field_errors = FormValidator.validate_submission(t, sub_data)

    if not is_valid:
        error_msg = f"입력 오류 또는 날짜 순서 오류가 발생했습니다: {', '.join(missing_labels)}"
        raise HTTPException(
            status_code=400,
            detail={
                "message": error_msg,
                "missing_fields": missing_labels,
                "field_errors": field_errors
            }
        )

    pdf_path = os.path.join(template_mgr.UPLOADS_DIR, t["pdf_filename"])
    try:
        filled_bytes = pdf_engine.generate_filled_pdf(pdf_path, t, sub_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 생성 오류: {str(e)}")

    output_filename = f"Stamp_{t['name']}.pdf"
    import urllib.parse
    encoded_filename = urllib.parse.quote(output_filename)

    return Response(
        content=filled_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
        }
    )
