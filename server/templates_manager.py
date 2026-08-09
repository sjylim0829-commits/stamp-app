import os
import json
from typing import List, Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
TEMPLATES_FILE = os.path.join(DATA_DIR, "templates.json")

class TemplateManager:
    def __init__(self, data_file: str = TEMPLATES_FILE):
        self.data_file = data_file
        self.ensure_data_dir()

    def ensure_data_dir(self):
        d_dir = os.path.dirname(self.data_file)
        if not os.path.exists(d_dir):
            os.makedirs(d_dir, exist_ok=True)
        if not os.path.exists(self.data_file):
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump([], f, ensure_ascii=False, indent=2)

    def get_all_templates(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.data_file):
            return []
        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
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

        with open(self.data_file, "w", encoding="utf-8") as f:
            json.dump(templates, f, ensure_ascii=False, indent=2)

        return template_data
