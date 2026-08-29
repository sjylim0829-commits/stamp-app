import os
import json
import shutil
from typing import List, Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DEFAULT_TEMPLATES_FILE = os.path.join(DATA_DIR, "templates.json")
TMP_TEMPLATES_FILE = "/tmp/templates.json"

class TemplateManager:
    _in_memory_cache: Optional[List[Dict[str, Any]]] = None

    def __init__(self, data_file: str = DEFAULT_TEMPLATES_FILE):
        self.default_data_file = data_file
        self.writable_data_file = DEFAULT_TEMPLATES_FILE
        self._init_storage()

    def _init_storage(self):
        # 1. 쓰기 가능한 파일 위치 결정 (Vercel Serverless는 /tmp만 쓰기 가능)
        try:
            # 기본 경로에 쓰기 테스트
            test_file = os.path.join(os.path.dirname(self.default_data_file), ".write_test")
            with open(test_file, "w", encoding="utf-8") as f:
                f.write("ok")
            os.remove(test_file)
            self.writable_data_file = self.default_data_file
        except (OSError, PermissionError):
            # Read-only 환경 (Vercel Lambda 등)인 경우 /tmp/templates.json 사용
            self.writable_data_file = TMP_TEMPLATES_FILE
            if not os.path.exists(TMP_TEMPLATES_FILE) and os.path.exists(self.default_data_file):
                try:
                    shutil.copy2(self.default_data_file, TMP_TEMPLATES_FILE)
                except Exception as e:
                    print(f"Failed to copy templates to /tmp: {e}")

    def get_all_templates(self) -> List[Dict[str, Any]]:
        # 1. 인메모리 캐시 확인
        if TemplateManager._in_memory_cache is not None:
            return TemplateManager._in_memory_cache

        # 2. 쓰기 가능 파일 또는 기본 파일에서 로드
        for path in [self.writable_data_file, self.default_data_file]:
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, list) and len(data) > 0:
                            TemplateManager._in_memory_cache = data
                            return data
                except Exception as e:
                    print(f"Error loading templates from {path}: {e}")

        return []

    def get_template_by_id(self, template_id: str) -> Optional[Dict[str, Any]]:
        templates = self.get_all_templates()
        for t in templates:
            if t.get("id") == template_id:
                return t
        return None

    def save_template(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        templates = self.get_all_templates()
        existing_idx = -1
        t_id = template_data.get("id")

        for idx, t in enumerate(templates):
            if t.get("id") == t_id:
                existing_idx = idx
                break

        if existing_idx >= 0:
            templates[existing_idx] = template_data
        else:
            templates.append(template_data)

        # 1. 인메모리 캐시 즉시 업데이트
        TemplateManager._in_memory_cache = templates

        # 2. 파일 시스템에 영속 저장 (기본 경로 또는 /tmp 경로)
        save_success = False
        for target_path in [self.writable_data_file, self.default_data_file, TMP_TEMPLATES_FILE]:
            try:
                d_dir = os.path.dirname(target_path)
                if d_dir and not os.path.exists(d_dir):
                    os.makedirs(d_dir, exist_ok=True)
                with open(target_path, "w", encoding="utf-8") as f:
                    json.dump(templates, f, ensure_ascii=False, indent=2)
                save_success = True
                self.writable_data_file = target_path
                break
            except (OSError, PermissionError) as pe:
                print(f"Cannot write to {target_path} (read-only or permission): {pe}")
                continue

        if not save_success:
            print("Warning: Could not write to disk, updated in-memory cache only.")

        return template_data
