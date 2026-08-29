import os
import json
import uuid
import shutil
from typing import List, Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DEFAULT_HOLIDAYS_FILE = os.path.join(DATA_DIR, "school_holidays.json")
TMP_HOLIDAYS_FILE = "/tmp/school_holidays.json"

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
    _in_memory_cache: Optional[List[Dict[str, Any]]] = None

    def __init__(self, data_file: str = DEFAULT_HOLIDAYS_FILE):
        self.default_data_file = data_file
        self.writable_data_file = DEFAULT_HOLIDAYS_FILE
        self._init_storage()

    def _init_storage(self):
        try:
            test_file = os.path.join(os.path.dirname(self.default_data_file), ".write_test_holidays")
            with open(test_file, "w", encoding="utf-8") as f:
                f.write("ok")
            os.remove(test_file)
            self.writable_data_file = self.default_data_file
        except (OSError, PermissionError):
            self.writable_data_file = TMP_HOLIDAYS_FILE
            if not os.path.exists(TMP_HOLIDAYS_FILE) and os.path.exists(self.default_data_file):
                try:
                    shutil.copy2(self.default_data_file, TMP_HOLIDAYS_FILE)
                except Exception as e:
                    print(f"Failed to copy holidays to /tmp: {e}")

    def get_all_holidays(self) -> List[Dict[str, Any]]:
        if HolidaysManager._in_memory_cache is not None:
            return HolidaysManager._in_memory_cache

        for path in [self.writable_data_file, self.default_data_file, TMP_HOLIDAYS_FILE]:
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        holidays = json.load(f)
                        sorted_h = sorted(holidays, key=lambda x: x.get("date", ""))
                        HolidaysManager._in_memory_cache = sorted_h
                        return sorted_h
                except Exception:
                    pass

        HolidaysManager._in_memory_cache = DEFAULT_SCHOOL_HOLIDAYS
        return DEFAULT_SCHOOL_HOLIDAYS

    def get_holiday_by_id(self, holiday_id: str) -> Optional[Dict[str, Any]]:
        holidays = self.get_all_holidays()
        for h in holidays:
            if h.get("id") == holiday_id or h.get("date") == holiday_id:
                return h
        return None

    def save_holiday(self, holiday_data: Dict[str, Any]) -> Dict[str, Any]:
        holidays = list(self.get_all_holidays())
        h_id = holiday_data.get("id")
        h_date = holiday_data.get("date", "").strip()

        if not h_date:
            raise ValueError("휴업일 날짜(date)는 필수 입력 항목입니다.")

        if not h_id:
            h_id = f"sh_{h_date.replace('-', '')}_{uuid.uuid4().hex[:6]}"
            holiday_data["id"] = h_id

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

        holidays = sorted(holidays, key=lambda x: x.get("date", ""))
        HolidaysManager._in_memory_cache = holidays

        for target_path in [self.writable_data_file, self.default_data_file, TMP_HOLIDAYS_FILE]:
            try:
                d_dir = os.path.dirname(target_path)
                if d_dir and not os.path.exists(d_dir):
                    os.makedirs(d_dir, exist_ok=True)
                with open(target_path, "w", encoding="utf-8") as f:
                    json.dump(holidays, f, ensure_ascii=False, indent=2)
                self.writable_data_file = target_path
                break
            except (OSError, PermissionError):
                continue

        return holiday_data

    def delete_holiday(self, holiday_id: str) -> bool:
        holidays = list(self.get_all_holidays())
        initial_len = len(holidays)
        holidays = [h for h in holidays if h.get("id") != holiday_id and h.get("date") != holiday_id]

        if len(holidays) < initial_len:
            HolidaysManager._in_memory_cache = holidays
            for target_path in [self.writable_data_file, self.default_data_file, TMP_HOLIDAYS_FILE]:
                try:
                    with open(target_path, "w", encoding="utf-8") as f:
                        json.dump(holidays, f, ensure_ascii=False, indent=2)
                    break
                except (OSError, PermissionError):
                    continue
            return True
        return False

    def reset_to_defaults(self) -> List[Dict[str, Any]]:
        HolidaysManager._in_memory_cache = DEFAULT_SCHOOL_HOLIDAYS
        for target_path in [self.writable_data_file, self.default_data_file, TMP_HOLIDAYS_FILE]:
            try:
                with open(target_path, "w", encoding="utf-8") as f:
                    json.dump(DEFAULT_SCHOOL_HOLIDAYS, f, ensure_ascii=False, indent=2)
                break
            except (OSError, PermissionError):
                continue
        return DEFAULT_SCHOOL_HOLIDAYS
