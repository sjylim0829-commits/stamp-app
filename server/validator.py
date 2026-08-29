from typing import Dict, Any, List, Tuple
from datetime import date

class FormValidator:
    @staticmethod
    def validate_submission(template: Dict[str, Any], submission_data: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, str]]:
        fields = template.get("fields", [])
        template_id = template.get("id", "")
        missing_labels = []
        field_errors = {}

        # 1. 필수 항목 누락 검사
        for field in fields:
            field_id = field.get("id")
            label = field.get("label", field_id)
            is_required = field.get("required", False) or field.get("color_tag") == "blue"

            # 수기 작성 영역(음영)은 필수 검사 제외
            if field.get("color_tag") == "green" or field.get("handwriting_shading", False):
                continue

            if is_required:
                val = submission_data.get(field_id)
                if val is None or (isinstance(val, str) and len(val.strip()) == 0):
                    missing_labels.append(label)
                    field_errors[field_id] = f"'{label}' 항목은 필수 입력 항목입니다."

        # 2. 날짜 유효성 검사
        try:
            year = int(submission_data.get("submit_year", 2026))
            sm_start = int(submission_data.get("start_month", 0))
            sd_start = int(submission_data.get("start_day", 0))
            em_end = int(submission_data.get("end_month", 0))
            ed_end = int(submission_data.get("end_day", 0))
            sm_sub = int(submission_data.get("submit_month", 0))
            sd_sub = int(submission_data.get("submit_day", 0))

            # 시작일 > 종료일 검사 (공통)
            if sm_start > 0 and sd_start > 0 and em_end > 0 and ed_end > 0:
                start_dt = date(year, sm_start, sd_start)
                end_dt = date(year, em_end, ed_end)
                if start_dt > end_dt:
                    msg = "시작 일자는 종료 일자보다 앞서거나 같아야 합니다!"
                    missing_labels.append("기간 설정 오류 (시작일이 종료일보다 늦음)")
                    field_errors["start_day"] = msg

            # A. 결석신고서 전용 날짜 규칙 (사후 제출 및 담임확인 5일 이내)
            if "absence" in template_id:
                tm = int(submission_data.get("teacher_confirm_month", 0))
                td = int(submission_data.get("teacher_confirm_day", 0))

                if em_end > 0 and ed_end > 0 and sm_sub > 0 and sd_sub > 0:
                    end_dt = date(year, em_end, ed_end)
                    sub_dt = date(year, sm_sub, sd_sub)
                    if sub_dt <= end_dt:
                        msg = "신고서 제출 일자는 결석 종료 일자보다 이후(더 나중) 날짜여야 합니다!"
                        missing_labels.append("신고 제출 일자 (날짜 순서 오류)")
                        field_errors["submit_day"] = msg

                if sm_sub > 0 and sd_sub > 0 and tm > 0 and td > 0:
                    sub_dt = date(year, sm_sub, sd_sub)
                    tch_dt = date(year, tm, td)
                    if tch_dt <= sub_dt:
                        msg = "담임 확인 일자는 신고서 제출 일자보다 이후(더 나중) 날짜여야 합니다!"
                        missing_labels.append("담임 확인 일자 (날짜 순서 오류)")
                        field_errors["teacher_confirm_day"] = msg

                if em_end > 0 and ed_end > 0 and tm > 0 and td > 0:
                    end_dt = date(year, em_end, ed_end)
                    tch_dt = date(year, tm, td)
                    diff_days = (tch_dt - end_dt).days
                    if diff_days > 5:
                        msg = f"담임 확인 일자가 결석 종료일로부터 {diff_days}일 경과했습니다. 5일 이내여야 합니다!"
                        missing_labels.append("담임 확인 일자 (결석종료일로부터 5일 초과)")
                        field_errors["teacher_confirm_day"] = msg

            # B. 교외체험학습 신청서 전용 규칙 (사전 신청 권장)
            elif "field_trip" in template_id:
                # 시작일과 신청일 비교 (사전 신청이므로 제출일이 시작일보다 늦으면 안내)
                if sm_start > 0 and sd_start > 0 and sm_sub > 0 and sd_sub > 0:
                    start_dt = date(year, sm_start, sd_start)
                    sub_dt = date(year, sm_sub, sd_sub)
                    if sub_dt > start_dt:
                        msg = "교외 체험학습 신청서는 체험학습 시작일 이전에 미리 제출해야 합니다!"
                        missing_labels.append("신청 제출 일자 (사전 제출 규칙 위반)")
                        field_errors["submit_day"] = msg

        except (ValueError, TypeError):
            pass

        is_valid = len(missing_labels) == 0
        return is_valid, missing_labels, field_errors
