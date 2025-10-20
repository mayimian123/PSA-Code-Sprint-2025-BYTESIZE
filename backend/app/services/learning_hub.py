from __future__ import annotations

import json
from pathlib import Path
from typing import List, Mapping, Sequence

from ..clients import OpenAIClient
from ..models import CourseInformation, EmployeeProfile


class LearningHubService:
    """Service that provides learning recommendations using AI."""

    SECTION_ORDER: Sequence[tuple[str, str]] = (
        ("course_fit_percentage", "【Course Fit Percentage】"),
        ("strengths", "【Your Strengths】"),
        ("weakness", "【Weakness】"),
        ("advice", "【Advice】"),
    )

    def __init__(self, client: OpenAIClient, prompt_path: Path):
        self._client = client
        self._prompt_path = prompt_path

    def recommend(
        self,
        course_information: CourseInformation,
        employee_profile: EmployeeProfile,
    ) -> str:
        """Provide course recommendations based on employee profile."""
        system_prompt = self._prompt_path.read_text(encoding="utf-8")

        request_payload = {
            "course_information": course_information.model_dump(exclude_none=True),
            "employee_profile": employee_profile.model_dump(exclude_none=True),
            "response_schema": {
                "type": "object",
                "properties": {
                    "fit_percentage": {"type": "number"},
                    "sections": {
                        "type": "object",
                        "properties": {
                            "course_fit_percentage": {"type": "string"},
                            "strengths": {"type": "string"},
                            "weakness": {"type": "string"},
                            "advice": {"type": "string"},
                        },
                        "required": [
                            "course_fit_percentage",
                            "strengths",
                            "weakness",
                            "advice",
                        ],
                    },
                },
                "required": ["sections"],
            },
            "instructions": [
                "Act as PSA's AI Learning Advisor. Evaluate the course for the specific employee context.",
                "Respond with JSON following response_schema exactly.",
                "Each section must contain 2-3 sentences, written in encouraging, practical language.",
                "Ensure section labels can be rendered with the required bold markdown format (e.g., **【Course Fit Percentage】**).",
                "Include an estimated fit percentage (0-100).",
                "If information is missing, infer sensibly from similar PSA roles and note assumptions.",
            ],
        }

        response = self._client.create_chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": json.dumps(request_payload, ensure_ascii=False),
                },
            ],
            temperature=0.3,
        )

        return self._parse_response(response)

    def _parse_response(self, raw_response: str) -> str:
        narrative = raw_response.strip()
        try:
            parsed = self._client.to_json(raw_response)
        except ValueError:
            return narrative

        if isinstance(parsed, dict):
            sections = parsed.get("sections")
            if isinstance(sections, Mapping):
                formatted = self._format_sections(sections)
                if formatted:
                    narrative = formatted
            elif "narrative" in parsed:
                narrative = str(parsed.get("narrative") or narrative).strip()
        return narrative

    def _format_sections(self, sections: Mapping[str, object]) -> str:
        parts: List[str] = []
        for key, label in self.SECTION_ORDER:
            raw = sections.get(key)
            if raw is None and key == "course_fit_percentage":
                raw = sections.get("fit_percentage")
            text = str(raw or "").strip()
            if not text:
                continue
            parts.append(f"**{label}**\n{text}")
        return "\n\n".join(parts).strip()
