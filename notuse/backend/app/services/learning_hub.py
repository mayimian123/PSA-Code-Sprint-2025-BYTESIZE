from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Dict

from ..llm import LLMClient
from ..repository import DataRepository


class LearningHubService:
    """Generates course recommendations using an LLM prompt."""

    def __init__(self, llm: LLMClient, prompt_path: Path, repository: DataRepository):
        self._llm = llm
        self._prompt_template = prompt_path.read_text(encoding="utf-8")
        self._repository = repository

    def recommend(self, course_information: Dict, employee_profile: Dict) -> str:
        course_payload = course_information.model_dump() if hasattr(course_information, "model_dump") else dict(course_information)
        employee_payload = employee_profile.model_dump() if hasattr(employee_profile, "model_dump") else dict(employee_profile)

        payload = {
            "course": course_payload,
            "employee_profile": employee_payload,
            "catalogue_sample": [asdict(course) for course in self._repository.list_courses()[:6]],
        }

        response = self._llm.chat(
            system_prompt=self._prompt_template,
            user_prompt=json.dumps(payload, ensure_ascii=False, indent=2),
            temperature=0.4,
        )
        return response.strip()
