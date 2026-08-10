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
                font_size = float(field.get("font_size", 12.0))
                width = float(field.get("width", 50))
                height = float(field.get("height", 14))

                # 초록색 수기작성 반투명 음영 오버레이
                if is_green:
                    rect_shading = fitz.Rect(x - 2, y - 2, x + width + 2, y + font_size + 2)
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
                        point_circle = fitz.Point(177, 214)
                        page.insert_text(point_circle, "○", fontsize=18, fontname=font_name, color=(0, 0, 0))
                    elif "인정" in text_val:
                        point_circle = fitz.Point(203, 214)
                        page.insert_text(point_circle, "○", fontsize=18, fontname=font_name, color=(0, 0, 0))
                    else:
                        point = fitz.Point(x, y + font_size)
                        page.insert_text(point, text_val, fontsize=font_size, fontname=font_name, color=(0, 0, 0))
                    continue

                color_hex = field.get("color", "#000000")
                r = int(color_hex[1:3], 16) / 255.0 if len(color_hex) >= 7 else 0.0
                g = int(color_hex[3:5], 16) / 255.0 if len(color_hex) >= 7 else 0.0
                b = int(color_hex[5:7], 16) / 255.0 if len(color_hex) >= 7 else 0.0
                color_tuple = (r, g, b)

                is_multiline = field.get("multiline", False) or ("\n" in text_val)

                if is_multiline:
                    rect = fitz.Rect(x, y, x + width, y + height)
                    page.insert_textbox(
                        rect,
                        text_val,
                        fontsize=font_size,
                        fontname=font_name,
                        color=color_tuple,
                        align=fitz.TEXT_ALIGN_LEFT
                    )
                else:
                    point = fitz.Point(x, y + font_size)
                    page.insert_text(
                        point,
                        text_val,
                        fontsize=font_size,
                        fontname=font_name,
                        color=color_tuple
                    )

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
