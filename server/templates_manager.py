import json
import os
import shutil
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
TEMPLATES_FILE = os.path.join(DATA_DIR, "templates.json")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

class TemplateManager:
    def __init__(self):
        self.DATA_DIR = DATA_DIR
        self.UPLOADS_DIR = UPLOADS_DIR
        self._ensure_storage()

    def _ensure_storage(self):
        if not os.path.exists(TEMPLATES_FILE):
            with open(TEMPLATES_FILE, "w", encoding="utf-8") as f:
                json.dump([], f, ensure_ascii=False, indent=2)

    def get_all_templates(self) -> List[Dict[str, Any]]:
        with open(TEMPLATES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        templates = self.get_all_templates()
        for t in templates:
            if t["id"] == template_id:
                return t
        return None

    def save_template(self, template_data: Dict[str, Any]) -> Dict[str, Any]:
        templates = self.get_all_templates()
        existing_idx = None
        for idx, t in enumerate(templates):
            if t["id"] == template_data["id"]:
                existing_idx = idx
                break

        if existing_idx is not None:
            templates[existing_idx] = template_data
        else:
            templates.append(template_data)

        with open(TEMPLATES_FILE, "w", encoding="utf-8") as f:
            json.dump(templates, f, ensure_ascii=False, indent=2)
        
        return template_data

    def delete_template(self, template_id: str) -> bool:
        templates = self.get_all_templates()
        target = self.get_template(template_id)
        if not target:
            return False

        updated = [t for t in templates if t["id"] != template_id]
        with open(TEMPLATES_FILE, "w", encoding="utf-8") as f:
            json.dump(updated, f, ensure_ascii=False, indent=2)

        # PDF 파일 삭제
        pdf_path = os.path.join(UPLOADS_DIR, target.get("pdf_filename", ""))
        if os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
            except OSError:
                pass
        return True

    def save_pdf_file(self, file_bytes: bytes, filename: str) -> str:
        filepath = os.path.join(UPLOADS_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(file_bytes)
        return filepath
