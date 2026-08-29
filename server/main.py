import os
import shutil
import traceback
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

from templates_manager import TemplateManager
from pdf_engine import PDFOverlayEngine
from validator import FormValidator
from holidays_manager import HolidaysManager

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Stamp PDF Engine API",
    description="학교 각종 서식 자동 입력 및 PDF 오버레이 엔진 백엔드",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

template_manager = TemplateManager()
holidays_manager = HolidaysManager()
pdf_engine = PDFOverlayEngine()
validator = FormValidator()

class PDFSubmissionRequest(BaseModel):
    data: Dict[str, Any]

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print("=== SERVER EXCEPTION CAUGHT ===")
    print(tb)
    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "message": f"서버 오버레이 처리 예외: {str(exc)}",
                "traceback": tb
            }
        }
    )

def find_pdf_file(pdf_filename: str) -> str:
    candidate_paths = [
        os.path.join(UPLOAD_DIR, pdf_filename),
        os.path.join(BASE_DIR, pdf_filename),
        os.path.join(BASE_DIR, "data", pdf_filename),
        os.path.join(ROOT_DIR, pdf_filename),
        os.path.join(ROOT_DIR, "api", pdf_filename),
        os.path.join(os.getcwd(), pdf_filename),
        os.path.join(os.getcwd(), "server", "uploads", pdf_filename),
        os.path.join(os.getcwd(), "server", pdf_filename),
        os.path.join(os.getcwd(), "server", "data", pdf_filename),
    ]
    for path in candidate_paths:
        if os.path.exists(path):
            return path
    raise FileNotFoundError(f"기본 양식 PDF 파일({pdf_filename})을 서버 경로에서 찾을 수 없습니다.")

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

@app.get("/api/templates/{template_id}/preview-image")
def get_template_preview_image(template_id: str):
    template = template_manager.get_template_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="지정된 템플릿을 찾을 수 없습니다.")

    pdf_filename = template.get("pdf_filename", "2026_absence_report_base.pdf")
    page_num = int(template.get("page_index", 0))

    try:
        pdf_path = find_pdf_file(pdf_filename)
    except FileNotFoundError as fnf_err:
        raise HTTPException(status_code=404, detail=str(fnf_err))

    try:
        png_bytes = pdf_engine.render_pdf_page_as_png(pdf_path, page_num=page_num)
        return Response(content=png_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"미리보기 이미지 생성 실패: {str(e)}")

@app.post("/api/templates")
def create_or_update_template(template_data: Dict[str, Any]):
    saved = template_manager.save_template(template_data)
    return {"status": "success", "template": saved}

@app.get("/api/school-holidays")
def list_school_holidays():
    return holidays_manager.get_all_holidays()

@app.post("/api/school-holidays")
def save_school_holiday(holiday_data: Dict[str, Any]):
    try:
        saved = holidays_manager.save_holiday(holiday_data)
        return {"status": "success", "holiday": saved, "holidays": holidays_manager.get_all_holidays()}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"휴업일 저장 실패: {str(e)}")

@app.delete("/api/school-holidays/{holiday_id}")
def delete_school_holiday(holiday_id: str):
    deleted = holidays_manager.delete_holiday(holiday_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="삭제할 휴업일을 찾을 수 없습니다.")
    return {"status": "success", "message": "휴업일이 삭제되었습니다.", "holidays": holidays_manager.get_all_holidays()}

@app.post("/api/school-holidays/reset")
def reset_school_holidays():
    defaults = holidays_manager.reset_to_defaults()
    return {"status": "success", "message": "기본 추천 휴업일로 초기화되었습니다.", "holidays": defaults}

@app.post("/api/fill-pdf/{template_id}")
def fill_pdf_template(template_id: str, request: PDFSubmissionRequest):
    template = template_manager.get_template_by_id(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="지정된 템플릿을 찾을 수 없습니다.")

    submission_data = request.data or {}

    # Validation
    is_valid, missing_fields, field_errors = validator.validate_submission(template, submission_data)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "필수 입력 사항 누락 또는 날짜 순서 위반으로 PDF 출력이 차단되었습니다.",
                "missing_fields": missing_fields,
                "field_errors": field_errors
            }
        )

    pdf_filename = template.get("pdf_filename", "2026_absence_report_base.pdf")
    
    try:
        pdf_path = find_pdf_file(pdf_filename)
    except FileNotFoundError as fnf_err:
        raise HTTPException(status_code=404, detail=str(fnf_err))

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
        tb_str = traceback.format_exc()
        raise HTTPException(status_code=500, detail={"message": f"PDF 렌더링 중 오류 발생: {str(e)}", "traceback": tb_str})

class TestPrintRequest(BaseModel):
    template: Dict[str, Any]
    sample_data: Optional[Dict[str, Any]] = None

@app.post("/api/test-print-pdf")
def test_print_pdf(request: TestPrintRequest):
    template = request.template
    if not template:
        raise HTTPException(status_code=400, detail="템플릿 정보가 필요합니다.")

    pdf_filename = template.get("pdf_filename", "2026_absence_report_base.pdf")
    try:
        pdf_path = find_pdf_file(pdf_filename)
    except FileNotFoundError as fnf_err:
        raise HTTPException(status_code=404, detail=str(fnf_err))

    sample_data = request.sample_data or {}

    try:
        output_pdf_bytes = pdf_engine.generate_filled_pdf(pdf_path, template, sample_data)
        return Response(
            content=output_pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=Test_Print_{template.get('id', 'custom')}.pdf"
            }
        )
    except Exception as e:
        tb_str = traceback.format_exc()
        raise HTTPException(status_code=500, detail={"message": f"시험 페이지 출력 중 오류: {str(e)}", "traceback": tb_str})
