import os
import fitz  # PyMuPDF
from typing import Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_FONT_PATH = os.path.join(BASE_DIR, "fonts", "malgun.ttf")

DEFAULT_FONT_PATHS = [
    PROJECT_FONT_PATH,
    "C:\\Windows\\Fonts\\malgun.ttf",
    "C:\\Windows\\Fonts\\gulim.ttc",
    "C:\\Windows\\Fonts\\batang.ttc",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/System/Library/Fonts/Supplemental/AppleGothic.ttf"
]

def find_system_korean_font() -> Optional[str]:
    for p in DEFAULT_FONT_PATHS:
        if os.path.exists(p):
            return p
    return None

class PDFOverlayEngine:
    def __init__(self, font_path: Optional[str] = None):
        self.font_path = font_path or find_system_korean_font()

    def generate_filled_pdf(self, pdf_path: str, template: Dict[str, Any], submission_data: Dict[str, Any]) -> bytes:
        if not os.path.isabs(pdf_path):
            pdf_path = os.path.join(BASE_DIR, pdf_path)

        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"기본 양식 PDF 파일을 찾을 수 없습니다: {pdf_path}")

        doc = fitz.open(pdf_path)
        fields = template.get("fields", [])

        fields_by_page = {}
        for f in fields:
            p_num = f.get("page", 0)
            if p_num not in fields_by_page:
                fields_by_page[p_num] = []
            fields_by_page[p_num].append(f)

        for page_idx, page in enumerate(doc):
            if page_idx not in fields_by_page:
                continue

            font_name = "KoreanFont"
            font_loaded = False

            if self.font_path and os.path.exists(self.font_path):
                try:
                    page.insert_font(fontname=font_name, fontfile=self.font_path)
                    font_loaded = True
                except Exception as font_err:
                    print(f"Font loading fallback: {font_err}")

            if not font_loaded:
                font_name = "helv"  # Fallback font in PyMuPDF

            page_fields = fields_by_page[page_idx]
            for field in page_fields:
                field_id = field.get("id")
                color_tag = field.get("color_tag")
                is_green = color_tag == "green" or field.get("handwriting_shading", False)

                x = float(field.get("x", 100))
                y = float(field.get("y", 100))
                font_size = float(field.get("font_size", 11.0))
                width = float(field.get("width", 50))
                height = float(field.get("height", font_size + 6))

                # 초록색 수기작성 반투명 음영 오버레이
                if is_green:
                    rect_shading = fitz.Rect(x, y, x + width, y + height)
                    shape = page.new_shape()
                    shape.draw_rect(rect_shading)
                    shape.finish(fill=(0.82, 0.82, 0.82), fill_opacity=0.30, color=None)
                    shape.commit(overlay=True)
                    continue

                val = submission_data.get(field_id, "")
                if val is None or str(val).strip() == "":
                    continue

                text_val = str(val).strip()

                # 결석구분 (질병 / 인정) 동그라미(○) 글자 위 덧씌우기
                if field_id == "absence_type":
                    if "질병" in text_val:
                        point_circle = fitz.Point(176.5, 214.0)
                        page.insert_text(point_circle, "○", fontsize=17, fontname=font_name, color=(0, 0, 0))
                    elif "인정" in text_val:
                        point_circle = fitz.Point(202.5, 214.0)
                        page.insert_text(point_circle, "○", fontsize=17, fontname=font_name, color=(0, 0, 0))
                    else:
                        rect = fitz.Rect(x, y, x + width, y + height)
                        page.insert_textbox(rect, text_val, fontsize=font_size, fontname=font_name, color=(0, 0, 0))
                    continue

                # 3. 개인정보 및 민감정보 동의 체크박스 (체크 시 [동의: □] 네모 안에 'V' 체크 표시)
                if field_id == "privacy_agree":
                    if text_val in ("V", "v", "true", "True", "Y", "y", "1", "on"):
                        point_v = fitz.Point(270.0, 517.5)
                        page.insert_text(point_v, "V", fontsize=11, fontname="helv", color=(0, 0, 0))
                    continue

                if field_id == "sensitive_agree":
                    if text_val in ("V", "v", "true", "True", "Y", "y", "1", "on"):
                        point_v = fitz.Point(270.0, 590.0)
                        page.insert_text(point_v, "V", fontsize=11, fontname="helv", color=(0, 0, 0))
                    continue

                color_hex = field.get("color", "#000000")
                r = int(color_hex[1:3], 16) / 255.0 if len(color_hex) >= 7 else 0.0
                g = int(color_hex[3:5], 16) / 255.0 if len(color_hex) >= 7 else 0.0
                b = int(color_hex[5:7], 16) / 255.0 if len(color_hex) >= 7 else 0.0
                color_tuple = (r, g, b)

                is_multiline = field.get("multiline", False) or ("\n" in text_val)

                # 사각형 Bounding Box 기반 정밀 렌더링 (캔버스 박스와 100% 일치)
                rect = fitz.Rect(x, y, x + width, y + height)

                if is_multiline:
                    page.insert_textbox(
                        rect,
                        text_val,
                        fontsize=font_size,
                        fontname=font_name,
                        color=color_tuple,
                        align=fitz.TEXT_ALIGN_LEFT
                    )
                else:
                    # 단일 행: 박스 내부 렌더링
                    page.insert_textbox(
                        rect,
                        text_val,
                        fontsize=font_size,
                        fontname=font_name,
                        color=color_tuple,
                        align=fitz.TEXT_ALIGN_LEFT
                    )

        # 템플릿에 지정된 단일 페이지만 추출 (예: 국내 신청서 1페이지, 해외 신청서 1페이지)
        target_page = template.get("page_index")
        if target_page is not None and 0 <= int(target_page) < len(doc):
            doc.select([int(target_page)])
        elif "selected_pages" in template and isinstance(template["selected_pages"], list):
            doc.select(template["selected_pages"])

        output_bytes = doc.tobytes()
        doc.close()
        return output_bytes

    def render_pdf_page_as_png(self, pdf_path: str, page_num: int = 0) -> bytes:
        if not os.path.isabs(pdf_path):
            pdf_path = os.path.join(BASE_DIR, pdf_path)
        doc = fitz.open(pdf_path)
        if page_num >= len(doc):
            page_num = 0
        page = doc[page_num]
        pix = page.get_pixmap(dpi=150)
        png_bytes = pix.tobytes("png")
        doc.close()
        return png_bytes
