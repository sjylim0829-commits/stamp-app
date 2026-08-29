from typing import Dict, Any, List, Tuple
from datetime import date, timedelta
import os
import sys

# HolidaysManager 가져오기
try:
    from holidays_manager import HolidaysManager
    holidays_manager = HolidaysManager()
except ImportError:
    holidays_manager = None

HOLIDAYS_2026_SET = {
    "2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18",
    "2026-03-01", "2026-03-02", "2026-05-05", "2026-05-24",
    "2026-05-25", "2026-06-06", "2026-08-15", "2026-08-17",
    "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-28",
    "2026-10-03", "2026-10-05", "2026-10-09", "2026-12-25"
}

def get_school_holiday_set():
    if not holidays_manager:
        return set()
    try:
        h_list = holidays_manager.get_all_holidays()
        return {h.get("date") for h in h_list if h.get("date")}
    except Exception:
        return set()

def calculate_latest_field_trip_submission_deadline(start_dt: date, required_business_days: int = 2) -> date:
    """
    체험학습 시작일(start_dt) 기준, 주말(토/일)과 공휴일, 학교 휴업일을 제외한
    평일 인정일수 기준 최소 required_business_days(2)일 전 제출 마감일(latest valid submission date)을 반환
    """
    school_holidays = get_school_holiday_set()
    count = 0
    cur = start_dt - timedelta(days=1)

    while count < required_business_days:
        day_of_week = cur.weekday()  # 0: Mon, 5: Sat, 6: Sun
        date_str = cur.strftime("%Y-%m-%d")

        is_weekend = day_of_week in (5, 6)
        is_statutory = date_str in HOLIDAYS_2026_SET
        is_school_hol = date_str in school_holidays

        if not is_weekend and not is_statutory and not is_school_hol:
            count += 1
            if count == required_business_days:
                return cur

        cur -= timedelta(days=1)

    return cur

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

            # B. 교외체험학습 신청서 전용 규칙 (체험학습 시작일 기준 평일 2일 전까지 제출)
            elif "field_trip" in template_id:
                if sm_start > 0 and sd_start > 0 and sm_sub > 0 and sd_sub > 0:
                    start_dt = date(year, sm_start, sd_start)
                    sub_dt = date(year, sm_sub, sd_sub)
                    latest_deadline = calculate_latest_field_trip_submission_deadline(start_dt, required_business_days=2)

                    if sub_dt > latest_deadline:
                        deadline_str = f"{latest_deadline.month}월 {latest_deadline.day}일"
                        msg = (
                            f"교외 체험학습 신청서 제출 일자는 체험학습 시작일({sm_start}월 {sd_start}일) 기준 "
                            f"평일 2일 전인 {deadline_str}까지 제출해야 합니다. (주말·공휴일·학교휴업일 제외)"
                        )
                        missing_labels.append(f"신청서 제출 기한 초과 (최대 제출 가능일: {deadline_str})")
                        field_errors["submit_day"] = msg

        except (ValueError, TypeError):
            pass

        is_valid = len(missing_labels) == 0
        return is_valid, missing_labels, field_errors
