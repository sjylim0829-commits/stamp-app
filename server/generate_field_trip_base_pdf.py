import os
import fitz
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

OUTPUT_PDF_PATH = os.path.join(DATA_DIR, "2026_field_trip_base.pdf")
UPLOAD_PDF_PATH = os.path.join(BASE_DIR, "uploads", "2026_field_trip_base.pdf")
ROOT_DATA_PATH = os.path.join(os.path.dirname(BASE_DIR), "api", "2026_field_trip_base.pdf")

# 폰트 탐색
FONT_CANDIDATES = [
    os.path.join(BASE_DIR, "fonts", "malgun.ttf"),
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
    "C:\\Windows\\Fonts\\malgun.ttf",
    "C:\\Windows\\Fonts\\gulim.ttc",
]

font_registered = False
for fpath in FONT_CANDIDATES:
    if os.path.exists(fpath):
        try:
            pdfmetrics.registerFont(TTFont("KoreanFont", fpath))
            pdfmetrics.registerFont(TTFont("KoreanFontBold", fpath))
            font_registered = True
            break
        except Exception as e:
            print(f"Font registration failed for {fpath}: {e}")

if not font_registered:
    # 기본 Helvetica 대체
    pass

FONT_NAME = "KoreanFont" if font_registered else "Helvetica"
FONT_BOLD = "KoreanFontBold" if font_registered else "Helvetica-Bold"

def draw_domestic_page(c: canvas.Canvas, width, height):
    # 여백: 좌우 50, 상하 50
    # Page 1: 교외 체험학습(국내) 신청서
    
    # 1. 제목
    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(width / 2.0, height - 90, "교외 체험학습(국내) 신청서")

    # 2. 우측 결재란 (결재일, 담임, 학년부장)
    # x: 330 ~ 495 (폭 165, 3등분: 각 55)
    # y: height - 170 (높이 55)
    box_x = 330
    box_y = height - 170
    box_w = 165
    box_h = 55
    col_w = box_w / 3.0 # 55

    c.setLineWidth(0.8)
    c.rect(box_x, box_y, box_w, box_h)
    # 구분선
    c.line(box_x + col_w, box_y, box_x + col_w, box_y + box_h)
    c.line(box_x + col_w * 2, box_y, box_x + col_w * 2, box_y + box_h)
    c.line(box_x, box_y + box_h - 18, box_x + box_w, box_y + box_h - 18)

    c.setFont(FONT_NAME, 9.5)
    c.drawCentredString(box_x + col_w * 0.5, box_y + box_h - 13, "결재일")
    c.drawCentredString(box_x + col_w * 1.5, box_y + box_h - 13, "담  임")
    c.drawCentredString(box_x + col_w * 2.5, box_y + box_h - 13, "학년부장")
    c.drawCentredString(box_x + col_w * 0.5, box_y + (box_h - 18) / 2.0 - 3, "/")

    # 3. 본문 메인 테이블
    # x: 80 ~ 515 (폭 435)
    tbl_x = 80
    tbl_w = 435
    tbl_top = height - 190
    tbl_bottom = 100

    # 행 높이 정의
    # Row 1: 학년반 / 주소 (인적사항) -> 2개 서브행 (각 26pt = 52pt)
    # Row 2: 기간 (28pt)
    # Row 3: 장소 (28pt)
    # Row 4: 학습 계획 (220pt)
    # Row 5: 신청문구 및 서명, 학교장 (나머지 하단 영역)

    r1_h = 52
    r2_h = 28
    r3_h = 28
    r4_h = 225
    r5_h = 190

    total_tbl_h = r1_h + r2_h + r3_h + r4_h + r5_h
    tbl_y = tbl_top - total_tbl_h

    # 외곽 사각형
    c.rect(tbl_x, tbl_y, tbl_w, total_tbl_h)

    # Row 1: 인적사항 (좌측 50pt 병합)
    c.line(tbl_x, tbl_top - r1_h, tbl_x + tbl_w, tbl_top - r1_h)
    c.line(tbl_x + 50, tbl_top, tbl_x + 50, tbl_top - r1_h)
    c.setFont(FONT_NAME, 11)
    c.drawCentredString(tbl_x + 25, tbl_top - 31, "인적사항")

    # 서브행 1: 학년·반 (50) | 학년 반 번 (180) | 성 명 (60) | 이름 (145)
    c.line(tbl_x + 50, tbl_top - 26, tbl_x + tbl_w, tbl_top - 26)
    c.line(tbl_x + 100, tbl_top, tbl_x + 100, tbl_top - 26)
    c.line(tbl_x + 280, tbl_top, tbl_x + 280, tbl_top - 26)
    c.line(tbl_x + 340, tbl_top, tbl_x + 340, tbl_top - 26)

    c.drawCentredString(tbl_x + 75, tbl_top - 17, "학년·반")
    c.drawString(tbl_x + 130, tbl_top - 17, "학년")
    c.drawString(tbl_x + 185, tbl_top - 17, "반")
    c.drawString(tbl_x + 235, tbl_top - 17, "번")
    c.drawCentredString(tbl_x + 310, tbl_top - 17, "성  명")

    # 서브행 2: 주 소 (50) | 주소입력 (180) | 전화번호 (60) | 전화번호입력 (145)
    c.line(tbl_x + 100, tbl_top - 26, tbl_x + 100, tbl_top - 52)
    c.line(tbl_x + 280, tbl_top - 26, tbl_x + 280, tbl_top - 52)
    c.line(tbl_x + 340, tbl_top - 26, tbl_x + 340, tbl_top - 52)

    c.drawCentredString(tbl_x + 75, tbl_top - 43, "주  소")
    c.drawCentredString(tbl_x + 310, tbl_top - 43, "전화번호")

    # Row 2: 기 간 (50) | 2026년 [ ]월 [ ]일 ~ 2026년 [ ]월 [ ]일 ( [ ] ) 일간
    curr_y = tbl_top - r1_h
    c.line(tbl_x, curr_y - r2_h, tbl_x + tbl_w, curr_y - r2_h)
    c.line(tbl_x + 50, curr_y, tbl_x + 50, curr_y - r2_h)
    c.drawCentredString(tbl_x + 25, curr_y - 18, "기  간")

    c.drawString(tbl_x + 60, curr_y - 18, "2026년")
    c.drawString(tbl_x + 120, curr_y - 18, "월")
    c.drawString(tbl_x + 155, curr_y - 18, "일  ~")
    c.drawString(tbl_x + 195, curr_y - 18, "2026년")
    c.drawString(tbl_x + 255, curr_y - 18, "월")
    c.drawString(tbl_x + 290, curr_y - 18, "일  (")
    c.drawString(tbl_x + 340, curr_y - 18, ") 일간")

    # Row 3: 장 소 (50) | [ 장소 입력란 ]
    curr_y = curr_y - r2_h
    c.line(tbl_x, curr_y - r3_h, tbl_x + tbl_w, curr_y - r3_h)
    c.line(tbl_x + 50, curr_y, tbl_x + 50, curr_y - r3_h)
    c.drawCentredString(tbl_x + 25, curr_y - 18, "장  소")

    # Row 4: 학습 계획 (50) | [ 학습 계획 멀티라인 입력란 ]
    curr_y = curr_y - r3_h
    c.line(tbl_x, curr_y - r4_h, tbl_x + tbl_w, curr_y - r4_h)
    c.line(tbl_x + 50, curr_y, tbl_x + 50, curr_y - r4_h)

    c.setFont(FONT_NAME, 10.5)
    c.drawCentredString(tbl_x + 25, curr_y - 30, "학습")
    c.drawCentredString(tbl_x + 25, curr_y - 46, "계획")
    c.setFont(FONT_NAME, 7.5)
    c.drawCentredString(tbl_x + 25, curr_y - 65, "(육하원칙에")
    c.drawCentredString(tbl_x + 25, curr_y - 77, "의해서")
    c.drawCentredString(tbl_x + 25, curr_y - 89, "상세히")
    c.drawCentredString(tbl_x + 25, curr_y - 101, "기록할 것.")
    c.drawCentredString(tbl_x + 25, curr_y - 115, "교육적")
    c.drawCentredString(tbl_x + 25, curr_y - 127, "활동을")
    c.drawCentredString(tbl_x + 25, curr_y - 139, "반드시")
    c.drawCentredString(tbl_x + 25, curr_y - 151, "포함할 것.)")

    # Row 5: 하단 신청 문구 및 서명
    curr_y = curr_y - r4_h
    c.setFont(FONT_NAME, 11)
    c.drawCentredString(tbl_x + tbl_w / 2.0, curr_y - 28, "위와 같이 교외 체험학습을 신청하오니 허락하여 주시기를 바랍니다.")

    c.drawCentredString(tbl_x + tbl_w / 2.0, curr_y - 68, "2026년         월         일")

    c.drawString(tbl_x + 250, curr_y - 105, "학   생  성명:")
    c.drawString(tbl_x + 395, curr_y - 105, "(인)")

    c.drawString(tbl_x + 250, curr_y - 125, "학부모  성명:")
    c.drawString(tbl_x + 395, curr_y - 125, "(인)")

    c.setFont(FONT_BOLD, 15)
    c.drawCentredString(tbl_x + tbl_w / 2.0, curr_y - 165, "영  서  중  학  교  장   귀  하")


def draw_overseas_page(c: canvas.Canvas, width, height):
    # Page 2: 교외 체험학습(해외) 신청서
    
    # 1. 제목
    c.setFont(FONT_BOLD, 22)
    c.drawCentredString(width / 2.0, height - 90, "교외 체험학습(해외) 신청서")

    # 2. 우측 결재란 (결재일, 담임, 학년부장, 교감) -> 4칸!
    # x: 295 ~ 495 (폭 200, 4등분: 각 50)
    # y: height - 170 (높이 55)
    box_x = 295
    box_y = height - 170
    box_w = 200
    box_h = 55
    col_w = box_w / 4.0 # 50

    c.setLineWidth(0.8)
    c.rect(box_x, box_y, box_w, box_h)
    # 구분선
    c.line(box_x + col_w, box_y, box_x + col_w, box_y + box_h)
    c.line(box_x + col_w * 2, box_y, box_x + col_w * 2, box_y + box_h)
    c.line(box_x + col_w * 3, box_y, box_x + col_w * 3, box_y + box_h)
    c.line(box_x, box_y + box_h - 18, box_x + box_w, box_y + box_h - 18)

    c.setFont(FONT_NAME, 9.5)
    c.drawCentredString(box_x + col_w * 0.5, box_y + box_h - 13, "결재일")
    c.drawCentredString(box_x + col_w * 1.5, box_y + box_h - 13, "담  임")
    c.drawCentredString(box_x + col_w * 2.5, box_y + box_h - 13, "학년부장")
    c.drawCentredString(box_x + col_w * 3.5, box_y + box_h - 13, "교  감")
    c.drawCentredString(box_x + col_w * 0.5, box_y + (box_h - 18) / 2.0 - 3, "/")

    # 3. 본문 메인 테이블
    tbl_x = 80
    tbl_w = 435
    tbl_top = height - 190

    r1_h = 52
    r2_h = 28
    r3_h = 28
    r4_h = 225
    r5_h = 190

    total_tbl_h = r1_h + r2_h + r3_h + r4_h + r5_h
    tbl_y = tbl_top - total_tbl_h

    c.rect(tbl_x, tbl_y, tbl_w, total_tbl_h)

    # Row 1: 인적사항
    c.line(tbl_x, tbl_top - r1_h, tbl_x + tbl_w, tbl_top - r1_h)
    c.line(tbl_x + 50, tbl_top, tbl_x + 50, tbl_top - r1_h)
    c.setFont(FONT_NAME, 11)
    c.drawCentredString(tbl_x + 25, tbl_top - 31, "인적사항")

    c.line(tbl_x + 50, tbl_top - 26, tbl_x + tbl_w, tbl_top - 26)
    c.line(tbl_x + 100, tbl_top, tbl_x + 100, tbl_top - 26)
    c.line(tbl_x + 280, tbl_top, tbl_x + 280, tbl_top - 26)
    c.line(tbl_x + 340, tbl_top, tbl_x + 340, tbl_top - 26)

    c.drawCentredString(tbl_x + 75, tbl_top - 17, "학년·반")
    c.drawString(tbl_x + 130, tbl_top - 17, "학년")
    c.drawString(tbl_x + 185, tbl_top - 17, "반")
    c.drawString(tbl_x + 235, tbl_top - 17, "번")
    c.drawCentredString(tbl_x + 310, tbl_top - 17, "성  명")

    c.line(tbl_x + 100, tbl_top - 26, tbl_x + 100, tbl_top - 52)
    c.line(tbl_x + 280, tbl_top - 26, tbl_x + 280, tbl_top - 52)
    c.line(tbl_x + 340, tbl_top - 26, tbl_x + 340, tbl_top - 52)

    c.drawCentredString(tbl_x + 75, tbl_top - 43, "주  소")
    c.drawCentredString(tbl_x + 310, tbl_top - 43, "전화번호")

    # Row 2: 기 간
    curr_y = tbl_top - r1_h
    c.line(tbl_x, curr_y - r2_h, tbl_x + tbl_w, curr_y - r2_h)
    c.line(tbl_x + 50, curr_y, tbl_x + 50, curr_y - r2_h)
    c.drawCentredString(tbl_x + 25, curr_y - 18, "기  간")

    c.drawString(tbl_x + 60, curr_y - 18, "2026년")
    c.drawString(tbl_x + 120, curr_y - 18, "월")
    c.drawString(tbl_x + 155, curr_y - 18, "일  ~")
    c.drawString(tbl_x + 195, curr_y - 18, "2026년")
    c.drawString(tbl_x + 255, curr_y - 18, "월")
    c.drawString(tbl_x + 290, curr_y - 18, "일  (")
    c.drawString(tbl_x + 340, curr_y - 18, ") 일간")

    # Row 3: 장 소
    curr_y = curr_y - r2_h
    c.line(tbl_x, curr_y - r3_h, tbl_x + tbl_w, curr_y - r3_h)
    c.line(tbl_x + 50, curr_y, tbl_x + 50, curr_y - r3_h)
    c.drawCentredString(tbl_x + 25, curr_y - 18, "장  소")

    # Row 4: 학습 계획
    curr_y = curr_y - r3_h
    c.line(tbl_x, curr_y - r4_h, tbl_x + tbl_w, curr_y - r4_h)
    c.line(tbl_x + 50, curr_y, tbl_x + 50, curr_y - r4_h)

    c.setFont(FONT_NAME, 10.5)
    c.drawCentredString(tbl_x + 25, curr_y - 30, "학습")
    c.drawCentredString(tbl_x + 25, curr_y - 46, "계획")
    c.setFont(FONT_NAME, 7.5)
    c.drawCentredString(tbl_x + 25, curr_y - 65, "(육하원칙에")
    c.drawCentredString(tbl_x + 25, curr_y - 77, "의해서")
    c.drawCentredString(tbl_x + 25, curr_y - 89, "상세히")
    c.drawCentredString(tbl_x + 25, curr_y - 101, "기록할 것.")
    c.drawCentredString(tbl_x + 25, curr_y - 115, "교육적")
    c.drawCentredString(tbl_x + 25, curr_y - 127, "활동을")
    c.drawCentredString(tbl_x + 25, curr_y - 139, "반드시")
    c.drawCentredString(tbl_x + 25, curr_y - 151, "포함할 것.)")

    # Row 5: 하단 신청 문구 및 서명
    curr_y = curr_y - r4_h
    c.setFont(FONT_NAME, 11)
    c.drawCentredString(tbl_x + tbl_w / 2.0, curr_y - 28, "위와 같이 교외 체험학습을 신청하오니 허락하여 주시기를 바랍니다.")

    c.drawCentredString(tbl_x + tbl_w / 2.0, curr_y - 68, "2026년         월         일")

    c.drawString(tbl_x + 250, curr_y - 105, "학   생  성명:")
    c.drawString(tbl_x + 395, curr_y - 105, "(인)")

    c.drawString(tbl_x + 250, curr_y - 125, "학부모  성명:")
    c.drawString(tbl_x + 395, curr_y - 125, "(인)")

    c.setFont(FONT_BOLD, 15)
    c.drawCentredString(tbl_x + tbl_w / 2.0, curr_y - 165, "영  서  중  학  교  장   귀  하")


def generate_pdf():
    c = canvas.Canvas(OUTPUT_PDF_PATH, pagesize=A4)
    width, height = A4

    # Page 1: 국내 신청서
    draw_domestic_page(c, width, height)
    c.showPage()

    # Page 2: 해외 신청서
    draw_overseas_page(c, width, height)
    c.showPage()

    c.save()
    print(f"Generated base PDF at: {OUTPUT_PDF_PATH}")

    # Copy to uploads and api directories
    import shutil
    shutil.copy2(OUTPUT_PDF_PATH, UPLOAD_PDF_PATH)
    shutil.copy2(OUTPUT_PDF_PATH, ROOT_DATA_PATH)
    print("Copied base PDF to uploads and api directories.")

if __name__ == "__main__":
    generate_pdf()
