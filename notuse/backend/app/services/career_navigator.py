from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..llm import LLMClient
from ..models import DimensionScore
from ..repository import DataRepository, Job


@dataclass(slots=True)
class DimensionTemplate:
    dimension: str
    explanation: str
    weight: float


class CareerNavigatorService:
    """Analyses job fit and generates guidance using an LLM prompt."""

    def __init__(self, llm: LLMClient, prompt_path: Path, repository: DataRepository):
        self._llm = llm
        self._prompt_template = prompt_path.read_text(encoding="utf-8")
        self._repository = repository

    def _similarity_score(self, job_text: str, employee_text: str) -> float:
        vectorizer = TfidfVectorizer(stop_words="english")
        matrix = vectorizer.fit_transform([job_text, employee_text])
        score = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
        return float(score)

    def _skill_overlap(self, job_requirements: str, skills: List[str]) -> float:
        job_tokens = {token.lower() for token in job_requirements.replace("\n", " ").split() if token}
        matches = [skill for skill in skills if any(word in job_tokens for word in skill.lower().split())]
        if not skills:
            return 0.0
        return len(matches) / len(skills)

    def _compose_dimension_scores(
        self,
        fit_percentage: float,
        skill_score: float,
        experience_score: float,
    ) -> List[DimensionScore]:
        templates = [
            DimensionTemplate("Functional Alignment", "Similarity between the employee’s domain and the target role", 0.30),
            DimensionTemplate("Skill Match", "Overlap between required and existing skills", 0.30),
            DimensionTemplate("Competency Readiness", "Leadership, communication, or behavioural fit", 0.20),
            DimensionTemplate("Experience Relevance", "Exposure to similar responsibilities", 0.15),
            DimensionTemplate("Qualification Match", "Education or certification alignment", 0.05),
        ]
        values: List[DimensionScore] = []
        for template in templates:
            if template.dimension == "Functional Alignment":
                score = fit_percentage * template.weight
            elif template.dimension == "Skill Match":
                score = skill_score * 100 * template.weight
            elif template.dimension == "Competency Readiness":
                score = fit_percentage * 0.25
            elif template.dimension == "Experience Relevance":
                score = experience_score * 100 * template.weight
            else:
                score = min(100.0, fit_percentage + 5)
            values.append(
                DimensionScore(
                    dimension=template.dimension,
                    score=round(score, 2),
                    explanation=template.explanation,
                )
            )
        return values

    def _related_roles(self, combined_text: str, current_title: str) -> List[Job]:
        jobs = self._repository.list_jobs()
        vectorizer = TfidfVectorizer(stop_words="english")
        corpus = [combined_text] + [f"{job.title} {job.duties} {job.requirements}" for job in jobs]
        matrix = vectorizer.fit_transform(corpus)
        similarities = cosine_similarity(matrix[0:1], matrix[1:]).flatten()
        ranked = sorted(zip(jobs, similarities), key=lambda item: item[1], reverse=True)
        suggestions: List[Job] = []
        for job, score in ranked:
            if job.title.lower() == current_title.lower():
                continue
            if score <= 0.05:
                break
            suggestions.append(job)
            if len(suggestions) == 2:
                break
        return suggestions

    def analyse(self, job_information: Dict, employee_information: Dict) -> Tuple[float, List[DimensionScore], str]:
        job_text = " ".join(
            filter(
                None,
                [
                    job_information.title,
                    job_information.description,
                    job_information.requirements,
                ],
            )
        )
        employee_text = " ".join(
            filter(
                None,
                [
                    employee_information.current_role,
                    " ".join(employee_information.skills),
                    employee_information.experience or "",
                ],
            )
        )

        similarity = self._similarity_score(job_text, employee_text)
        fit_percentage = max(0.0, min(100.0, round(similarity * 100, 2)))
        skill_overlap = self._skill_overlap(job_information.requirements or "", employee_information.skills)
        experience_score = 0.5 + (similarity * 0.5)

        dimension_scores = self._compose_dimension_scores(fit_percentage, skill_overlap, experience_score)

        suggestions = self._related_roles(job_text, job_information.title)

        payload = {
            "job": job_information.model_dump() if hasattr(job_information, "model_dump") else dict(job_information),
            "employee": employee_information.model_dump() if hasattr(employee_information, "model_dump") else dict(employee_information),
            "computed_metrics": {
                "fit_percentage": fit_percentage,
                "skill_overlap": round(skill_overlap * 100, 2),
                "experience_score": round(experience_score * 100, 2),
            },
            "suggested_roles": [job.title for job in suggestions],
        }

        narrative = self._llm.chat(
            system_prompt=self._prompt_template,
            user_prompt=json.dumps(payload, ensure_ascii=False, indent=2),
            temperature=0.4,
        )

        return fit_percentage, dimension_scores, narrative.strip()
