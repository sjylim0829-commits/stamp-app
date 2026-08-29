import os
import json
import uuid
from typing import List, Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
HOLIDAYS_FILE = os.path.join(DATA_DIR, "school_holidays.json")

# 2026학년도 기본 추천 학교 휴업일 프리셋
DEFAULT_SCHOOL_HOLIDAYS = [
    {
        "id": "sh_20260501",
        "date": "2026-05-01",
        "name": "근로자의 날 / 개교기념일",
        "type": "개교기념일",
        "memo": "학교 지정 휴업일"
    },
    {
        "id": "sh_20260504",
        "date": "2026-05-04",
        "name": "어린이날 징검다리 재량휴업일",
        "type": "재량휴업일",
        "memo": "학사일정 재량휴업일"
    },
    {
        "id": "sh_20260605",
        "date": "2026-06-05",
        "name": "현충일 징검다리 재량휴업일",
        "type": "재량휴업일",
        "memo": "학사일정 재량휴업일"
    },
    {
        "id": "sh_20261002",
        "date": "2026-10-02",
        "name": "개천절 징검다리 재량휴업일",
        "type": "재량휴업일",
        "memo": "학사일정 재량휴업일"
    },
    {
        "id": "sh_20261119",
        "date": "2026-11-19",
        "name": "대학수학능력시험일",
        "type": "수능일",
        "memo": "수능 고사장 운영 휴업"
    }
]

class HolidaysManager:
    def __init__(self, data_file: str = HOLIDAYS_FILE):
        self.data_file = data_file
        self.ensure_data_dir()

    def ensure_data_dir(self):
        d_dir = os.path.dirname(self.data_file)
        if not os.path.exists(d_dir):
            os.makedirs(d_dir, exist_ok=True)
        if not os.path.exists(self.data_file):
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_SCHOOL_HOLIDAYS, f, ensure_ascii=False, indent=2)

    def get_all_holidays(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.data_file):
            return []
        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                holidays = json.load(f)
                # Sort by date ascending
                return sorted(holidays, key=lambda x: x.get("date", ""))
        except Exception:
            return []

    def get_holiday_by_id(self, holiday_id: str) -> Optional[Dict[str, Any]]:
        holidays = self.get_all_holidays()
        for h in holidays:
            if h.get("id") == holiday_id or h.get("date") == holiday_id:
                return h
        return None

    def save_holiday(self, holiday_data: Dict[str, Any]) -> Dict[str, Any]:
        holidays = self.get_all_holidays()
        h_id = holiday_data.get("id")
        h_date = holiday_data.get("date", "").strip()

        if not h_date:
            raise ValueError("휴업일 날짜(date)는 필수 입력 항목입니다.")

        if not h_id:
            # Generate ID based on date
            h_id = f"sh_{h_date.replace('-', '')}_{uuid.uuid4().hex[:6]}"
            holiday_data["id"] = h_id

        # Check existing by ID or same date
        existing_idx = -1
        for idx, h in enumerate(holidays):
            if h.get("id") == h_id or h.get("date") == h_date:
                existing_idx = idx
                holiday_data["id"] = h.get("id", h_id)
                break

        if existing_idx >= 0:
            holidays[existing_idx] = holiday_data
        else:
            holidays.append(holiday_data)

        # Sort by date
        holidays = sorted(holidays, key=lambda x: x.get("date", ""))

        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump(holidays, f, ensure_ascii=False, indent=2)

        return holiday_data

    def delete_holiday(self, holiday_id: str) -> bool:
        holidays = self.get_all_holidays()
        initial_len = len(holidays)
        holidays = [h for h in holidays if h.get("id") != holiday_id and h.get("date") != holiday_id]

        if len(holidays) < initial_len:
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump(holidays, f, ensure_ascii=False, indent=2)
            return True
        return False

    def reset_to_defaults(self) -> List[Dict[str, Any]]:
        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_SCHOOL_HOLIDAYS, f, ensure_ascii=False, indent=2)
        return DEFAULT_SCHOOL_HOLIDAYS
