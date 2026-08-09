from typing import Dict, Any, List, Tuple
from datetime import date

class FormValidator:
    @staticmethod
    def validate_submission(template: Dict[str, Any], submission_data: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, str]]:
        fields = template.get("fields", [])
        missing_labels = []
        field_errors = {}

        # 1. 필수 항목 누락 검사
        for field in fields:
            field_id = field.get("id")
            label = field.get("label", field_id)
            is_required = field.get("required", False) or field.get("color_tag") == "blue"

            if is_required:
                val = submission_data.get(field_id)
                if val is None or (isinstance(val, str) and len(val.strip()) == 0):
                    missing_labels.append(label)
                    field_errors[field_id] = f"'{label}' 항목은 필수 입력 항목입니다."

        # 2. 날짜 순서 유효성 검사 (결석종료일 < 신고서제출일 < 담임확인일)
        try:
            em = int(submission_data.get("end_month", 0))
            ed = int(submission_data.get("end_day", 0))
            sm = int(submission_data.get("submit_month", 0))
            sd = int(submission_data.get("submit_day", 0))
            tm = int(submission_data.get("teacher_confirm_month", 0))
            td = int(submission_data.get("teacher_confirm_day", 0))

            year = int(submission_data.get("submit_year", 2026))

            if em > 0 and ed > 0 and sm > 0 and sd > 0:
                end_dt = date(year, em, ed)
                sub_dt = date(year, sm, sd)

                # 조건 3: 신고서 제출 일자가 결석 종료 일자와 같거나 빠르면 경고
                if sub_dt <= end_dt:
                    msg = "신고서 제출 일자는 결석 종료 일자보다 이후(더 나중) 날짜여야 합니다!"
                    missing_labels.append("신고 제출 일자 (날짜 순서 오류)")
                    field_errors["submit_day"] = msg

            if sm > 0 and sd > 0 and tm > 0 and td > 0:
                sub_dt = date(year, sm, sd)
                tch_dt = date(year, tm, td)

                # 조건 4: 담임 확인 일자가 신고서 제출 일자와 같거나 빠르면 경고
                if tch_dt <= sub_dt:
                    msg = "담임 확인 일자는 신고서 제출 일자보다 이후(더 나중) 날짜여야 합니다!"
                    missing_labels.append("담임 확인 일자 (날짜 순서 오류)")
                    field_errors["teacher_confirm_day"] = msg

        except (ValueError, TypeError):
            pass  # 날짜 변환 실패 시 필수값 검증에서 처리됨

        is_valid = len(missing_labels) == 0
        return is_valid, missing_labels, field_errors
