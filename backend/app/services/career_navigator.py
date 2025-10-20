from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Mapping, Sequence

from ..clients import OpenAIClient
from ..models import DimensionScore, EmployeeInformation, JobInformation


class CareerNavigatorService:
    """Service that provides career navigation advice using AI."""

    DIMENSION_WEIGHTS: Dict[str, float] = {
        "Functional Alignment": 0.30,
        "Skill Match": 0.30,
        "Competency Readiness": 0.20,
        "Experience Relevance": 0.15,
        "Qualification Match": 0.05,
    }

    SECTION_ORDER: Sequence[tuple[str, str]] = (
        ("fit_percentage", "【Fit Percentage】"),
        ("strengths", "【Strengths】"),
        ("weaknesses", "【Weaknesses】"),
        ("short_term_advice", "【Short-Term Advice】"),
        ("long_term_advice", "【Long-Term Advice】"),
    )

    def __init__(self, client: OpenAIClient, prompt_path: Path):
        self._client = client
        self._prompt_path = prompt_path

    def analyse(
        self,
        job_information: JobInformation,
        employee_information: EmployeeInformation,
    ) -> tuple[float, List[DimensionScore], str]:
        """Analyse job fit and provide recommendations."""
        system_prompt = self._prompt_path.read_text(encoding="utf-8")

        request_payload = {
            "job_information": job_information.model_dump(exclude_none=True),
            "employee_information": employee_information.model_dump(exclude_none=True),
            "dimensions": [
                {"dimension": name, "weight": weight}
                for name, weight in self.DIMENSION_WEIGHTS.items()
            ],
            "response_schema": {
                "type": "object",
                "properties": {
                    "fit_percentage": {"type": "number"},
                    "sections": {
                        "type": "object",
                        "properties": {
                            "fit_percentage": {"type": "string"},
                            "strengths": {"type": "string"},
                            "weaknesses": {"type": "string"},
                            "short_term_advice": {"type": "string"},
                            "long_term_advice": {"type": "string"},
                        },
                        "required": [
                            "fit_percentage",
                            "strengths",
                            "weaknesses",
                            "short_term_advice",
                            "long_term_advice",
                        ],
                    },
                    "dimension_scores": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "dimension": {"type": "string"},
                                "score": {"type": "number"},
                                "explanation": {"type": "string"},
                            },
                            "required": ["dimension", "score", "explanation"],
                        },
                    },
                },
                "required": ["fit_percentage", "sections"],
            },
            "instructions": [
                "Act as PSA's AI Career Advisor. Evaluate the employee's fit using the provided data and dimension weights.",
                "Return a JSON object that follows response_schema exactly.",
                "For each narrative section, write 2-4 sentences in supportive, growth-oriented prose (no bullet points).",
                "Ensure the formatted_sections align with the example in the prompt using the 【Label】 syntax.",
                "Provide dimension scores for every defined dimension with values between 0 and 100 and concise explanations.",
                "Base the overall fit percentage on the weighted dimensions. If information is missing, make a reasonable inference and explain it.",
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
            temperature=0.25,
        )

        return self._parse_response(response)

    def _parse_response(self, raw_response: str) -> tuple[float, List[DimensionScore], str]:
        """Parse the LLM response into structured data with fallbacks."""
        narrative = raw_response.strip()
        fit_percentage = self._extract_fit_percentage(narrative)
        dimension_scores: List[DimensionScore] = []

        try:
            parsed = self._client.to_json(raw_response)
        except ValueError:
            parsed = None

        if isinstance(parsed, dict):
            fit_percentage = self._coerce_percentage(parsed.get("fit_percentage"), fit_percentage)
            sections = parsed.get("sections")
            if isinstance(sections, Mapping):
                formatted = self._format_sections(sections)
                if formatted:
                    narrative = formatted
            dimension_scores = self._build_dimension_scores(parsed.get("dimension_scores"), fit_percentage, narrative)
        else:
            dimension_scores = self._default_dimension_scores(fit_percentage, narrative)

        if not dimension_scores:
            dimension_scores = self._default_dimension_scores(fit_percentage, narrative)

        return round(fit_percentage, 2), dimension_scores, narrative

    def _coerce_percentage(self, value: object, fallback: float) -> float:
        try:
            candidate = float(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return fallback
        if candidate < 0 or candidate > 100:
            return fallback
        return candidate

    def _format_sections(self, sections: Mapping[str, object]) -> str:
        parts: List[str] = []

        for key, label in self.SECTION_ORDER:
            raw = sections.get(key)
            if raw is None:
                # Try alternate key shapes like camelCase
                alt_key = key.replace("_", "")
                raw = sections.get(alt_key)
            if raw is None and key == "fit_percentage":
                raw = sections.get("fit")
            text = str(raw or "").strip()
            if not text:
                continue
            parts.append(f"**{label}**\n{text}")

        return "\n\n".join(parts).strip()

    def _build_dimension_scores(
        self,
        payload: object,
        fit_percentage: float,
        narrative: str,
    ) -> List[DimensionScore]:
        results: Dict[str, DimensionScore] = {}
        if isinstance(payload, list):
            for entry in payload:
                if not isinstance(entry, Mapping):
                    continue
                dimension = str(entry.get("dimension") or "").strip()
                if not dimension:
                    continue
                try:
                    score = float(entry.get("score"))
                except (TypeError, ValueError):
                    score = fit_percentage
                explanation = str(entry.get("explanation") or narrative).strip()
                results[dimension] = DimensionScore(
                    dimension=dimension,
                    score=max(0.0, min(100.0, score)),
                    explanation=explanation,
                )

        aligned: List[DimensionScore] = []
        for dimension, weight in self.DIMENSION_WEIGHTS.items():
            if dimension in results:
                aligned.append(results[dimension])
                continue
            aligned.append(
                DimensionScore(
                    dimension=dimension,
                    score=round(max(0.0, min(100.0, fit_percentage * (0.5 + weight))), 2),
                    explanation=(
                        f"Estimated from overall fit; limited direct data for {dimension.lower()}."
                        if narrative
                        else f"Default weighting applied for {dimension.lower()}."
                    ),
                )
            )
        return aligned

    def _default_dimension_scores(self, fit_percentage: float, narrative: str) -> List[DimensionScore]:
        return [
            DimensionScore(
                dimension=dimension,
                score=round(max(0.0, min(100.0, fit_percentage * (0.5 + weight))), 2),
                explanation=(
                    f"Estimated from narrative insights for {dimension.lower()}."
                    if narrative
                    else f"Default weighting applied for {dimension.lower()}."
                ),
            )
            for dimension, weight in self.DIMENSION_WEIGHTS.items()
        ]

    def _extract_fit_percentage(self, narrative: str) -> float:
        marker = "【Fit Percentage】"
        snippet = ""
        if marker in narrative:
            snippet = narrative.split(marker, 1)[1]
        digits = "".join(ch if ch.isdigit() or ch == "." else " " for ch in snippet)
        try:
            return float(digits.strip().split()[0])
        except (IndexError, ValueError):
            return 70.0
