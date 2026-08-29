import json
import os

TEMPLATES_FILE = "/home/ubuntu/workspace/Stamp/server/data/templates.json"

with open(TEMPLATES_FILE, "r", encoding="utf-8") as f:
    templates = json.load(f)

# Existing IDs
existing_ids = [t["id"] for t in templates]

# 1. 교외 체험학습(국내) 신청서 템플릿
domestic_template = {
    "id": "2026_field_trip_domestic",
    "name": "2026학년도 교외 체험학습(국내) 신청서",
    "description": "교외 체험학습(국내) 신청서 - 담임, 학년부장 결재란 표준 서식",
    "pdf_filename": "2026_field_trip_base.pdf",
    "page_count": 1,
    "page_index": 0,
    "fields": [
        {"id": "grade", "label": "학년", "page": 0, "x": 160.0, "y": 196.0, "width": 20.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "2"},
        {"id": "class_num", "label": "반", "page": 0, "x": 215.0, "y": 196.0, "width": 20.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "3"},
        {"id": "student_num", "label": "번", "page": 0, "x": 265.0, "y": 196.0, "width": 20.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "14"},
        {"id": "student_name", "label": "성명", "page": 0, "x": 420.0, "y": 196.0, "width": 90.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "홍길동"},
        {"id": "address", "label": "주소", "page": 0, "x": 185.0, "y": 222.0, "width": 170.0, "font_size": 10.0, "required": True, "color_tag": "blue", "placeholder": "서울시 구로구 구로동"},
        {"id": "phone", "label": "전화번호", "page": 0, "x": 420.0, "y": 222.0, "width": 90.0, "font_size": 10.0, "required": True, "color_tag": "blue", "placeholder": "010-1234-5678"},
        {"id": "start_month", "label": "시작 월", "page": 0, "x": 180.0, "y": 248.0, "width": 18.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "5"},
        {"id": "start_day", "label": "시작 일", "page": 0, "x": 215.0, "y": 248.0, "width": 18.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "1"},
        {"id": "end_month", "label": "종료 월", "page": 0, "x": 315.0, "y": 248.0, "width": 18.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "5"},
        {"id": "end_day", "label": "종료 일", "page": 0, "x": 350.0, "y": 248.0, "width": 18.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "4"},
        {"id": "days_count", "label": "체험학습 일수", "page": 0, "x": 395.0, "y": 248.0, "width": 24.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "2"},
        {"id": "location", "label": "체험학습 장소", "page": 0, "x": 140.0, "y": 275.0, "width": 370.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "제주도 일대 (성산일출봉, 국립제주박물관 등)"},
        {"id": "study_plan", "label": "학습 계획", "page": 0, "x": 140.0, "y": 305.0, "width": 370.0, "height": 210.0, "font_size": 10.5, "multiline": True, "required": True, "color_tag": "blue", "placeholder": "1. 제주의 화산 지형과 자연유산 탐방\n2. 제주 역사문화 유적지 방문 및 보고서 작성\n3. 현지 생태 환경 관찰 및 체험 활동"},
        {"id": "submit_month", "label": "신청 제출 월", "page": 0, "x": 280.0, "y": 580.0, "width": 20.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "4"},
        {"id": "submit_day", "label": "신청 제출 일", "page": 0, "x": 325.0, "y": 580.0, "width": 20.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "25"},
        {"id": "student_name_sign", "label": "학생 성명 서명", "page": 0, "x": 415.0, "y": 617.0, "width": 80.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "홍길동"},
        {"id": "student_sign_shading", "label": "학생 서명 음영", "page": 0, "x": 475.0, "y": 617.0, "width": 30.0, "font_size": 11.0, "required": False, "color_tag": "green", "handwriting_shading": True},
        {"id": "parent_name_sign", "label": "학부모 성명 서명", "page": 0, "x": 415.0, "y": 637.0, "width": 80.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "홍판서"},
        {"id": "parent_sign_shading", "label": "학부모 서명 음영", "page": 0, "x": 475.0, "y": 637.0, "width": 30.0, "font_size": 11.0, "required": False, "color_tag": "green", "handwriting_shading": True}
    ]
}

# 2. 교외 체험학습(해외) 신청서 템플릿
overseas_template = {
    "id": "2026_field_trip_overseas",
    "name": "2026학년도 교외 체험학습(해외) 신청서",
    "description": "교외 체험학습(해외) 신청서 - 담임, 학년부장, 교감 결재란 표준 서식",
    "pdf_filename": "2026_field_trip_base.pdf",
    "page_count": 1,
    "page_index": 1,
    "fields": [
        {"id": "grade", "label": "학년", "page": 1, "x": 160.0, "y": 196.0, "width": 20.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "2"},
        {"id": "class_num", "label": "반", "page": 1, "x": 215.0, "y": 196.0, "width": 20.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "3"},
        {"id": "student_num", "label": "번", "page": 1, "x": 265.0, "y": 196.0, "width": 20.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "14"},
        {"id": "student_name", "label": "성명", "page": 1, "x": 420.0, "y": 196.0, "width": 90.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "홍길동"},
        {"id": "address", "label": "주소", "page": 1, "x": 185.0, "y": 222.0, "width": 170.0, "font_size": 10.0, "required": True, "color_tag": "blue", "placeholder": "서울시 구로구 구로동"},
        {"id": "phone", "label": "전화번호", "page": 1, "x": 420.0, "y": 222.0, "width": 90.0, "font_size": 10.0, "required": True, "color_tag": "blue", "placeholder": "010-1234-5678"},
        {"id": "start_month", "label": "시작 월", "page": 1, "x": 180.0, "y": 248.0, "width": 18.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "7"},
        {"id": "start_day", "label": "시작 일", "page": 1, "x": 215.0, "y": 248.0, "width": 18.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "15"},
        {"id": "end_month", "label": "종료 월", "page": 1, "x": 315.0, "y": 248.0, "width": 18.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "7"},
        {"id": "end_day", "label": "종료 일", "page": 1, "x": 350.0, "y": 248.0, "width": 18.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "20"},
        {"id": "days_count", "label": "체험학습 일수", "page": 1, "x": 395.0, "y": 248.0, "width": 24.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "4"},
        {"id": "location", "label": "체험학습 장소(해외 국가 및 도시)", "page": 1, "x": 140.0, "y": 275.0, "width": 370.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "일본 오사카 및 교토 일대"},
        {"id": "study_plan", "label": "학습 계획", "page": 1, "x": 140.0, "y": 305.0, "width": 370.0, "height": 210.0, "font_size": 10.5, "multiline": True, "required": True, "color_tag": "blue", "placeholder": "1. 일본 역사 유적지(오사카성, 금각사) 탐방 및 전통 문화 체험\n2. 해외 과학관 및 현대 건축 기술 견학\n3. 글로벌 다문화 이해 및 언어 소통 역량 함양"},
        {"id": "submit_month", "label": "신청 제출 월", "page": 1, "x": 280.0, "y": 580.0, "width": 20.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "7"},
        {"id": "submit_day", "label": "신청 제출 일", "page": 1, "x": 325.0, "y": 580.0, "width": 20.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "8"},
        {"id": "student_name_sign", "label": "학생 성명 서명", "page": 1, "x": 415.0, "y": 617.0, "width": 80.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "홍길동"},
        {"id": "student_sign_shading", "label": "학생 서명 음영", "page": 1, "x": 475.0, "y": 617.0, "width": 30.0, "font_size": 11.0, "required": False, "color_tag": "green", "handwriting_shading": True},
        {"id": "parent_name_sign", "label": "학부모 성명 서명", "page": 1, "x": 415.0, "y": 637.0, "width": 80.0, "font_size": 11.0, "required": True, "color_tag": "blue", "placeholder": "홍판서"},
        {"id": "parent_sign_shading", "label": "학부모 서명 음영", "page": 1, "x": 475.0, "y": 637.0, "width": 30.0, "font_size": 11.0, "required": False, "color_tag": "green", "handwriting_shading": True}
    ]
}

# Update or insert
for new_t in [domestic_template, overseas_template]:
    idx = -1
    for i, t in enumerate(templates):
        if t["id"] == new_t["id"]:
            idx = i
            break
    if idx >= 0:
        templates[idx] = new_t
    else:
        templates.append(new_t)

with open(TEMPLATES_FILE, "w", encoding="utf-8") as f:
    json.dump(templates, f, ensure_ascii=False, indent=2)

print("Updated templates.json successfully! Total templates count:", len(templates))
