from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd


@dataclass(slots=True)
class CommunityPost:
    title: str
    description: str
    time: str
    posted_by: str
    board: str


@dataclass(slots=True)
class Course:
    topic: str
    name: str
    description: str
    field: str
    what_you_learn: List[str]
    skills: List[str]


@dataclass(slots=True)
class Job:
    title: str
    duties: str
    requirements: str


@dataclass(slots=True)
class WellnessEvent:
    category: str
    title: str
    description: str
    date_time: str
    location: str


class DataRepository:
    """Loads and serves static data assets for the PSA platform."""

    def __init__(self, data_dir: Path):
        self._data_dir = data_dir
        self._community = self._load_community()
        self._courses = self._load_courses()
        self._jobs = self._load_jobs()
        self._employees = self._load_employees()
        self._wellness = self._load_wellness()

    def _load_csv(self, file_name: str) -> pd.DataFrame:
        path = self._data_dir / file_name
        if not path.exists():
            raise FileNotFoundError(f"Expected data file at {path}")
        return pd.read_csv(path, encoding="utf-8-sig").fillna("")

    def _load_community(self) -> Dict[str, List[CommunityPost]]:
        df = self._load_csv("Community.csv")
        column_map = {col: col.strip().lower() for col in df.columns}
        df.rename(columns=column_map, inplace=True)
        board_map = {
            "formal": "psa-events",
            "formal/informal": "psa-events",
            "informal": "alongside",
            "": "psa-events",
        }
        grouped: Dict[str, List[CommunityPost]] = {"psa-events": [], "alongside": []}
        for _, row in df.iterrows():
            board_key = board_map.get(str(row.get("type formal/informal", "")).strip().lower(), "psa-events")
            grouped.setdefault(board_key, []).append(
                CommunityPost(
                    title=str(row.get("title", "")).strip(),
                    description=str(row.get("description", "")).strip(),
                    time=str(row.get("time", "")).strip(),
                    posted_by=str(row.get("posted by", "")).strip(),
                    board=board_key,
                )
            )
        return grouped

    def _split_semicolon_field(self, value: str) -> List[str]:
        return [item.strip() for item in value.split(";") if item.strip()]

    def _load_courses(self) -> List[Course]:
        df = self._load_csv("Online_course.csv")
        column_map = {col: col.strip().lower() for col in df.columns}
        df.rename(columns=column_map, inplace=True)
        courses: List[Course] = []
        for _, row in df.iterrows():
            courses.append(
                Course(
                    topic=str(row.get("topic", "")).strip(),
                    name=str(row.get("course name", "")).strip(),
                    description=str(row.get("course description2", "")).strip(),
                    field=str(row.get("field", "")).strip(),
                    what_you_learn=self._split_semicolon_field(str(row.get("what you’ll learn", ""))),
                    skills=self._split_semicolon_field(str(row.get("skills you’ll gain", ""))),
                )
            )
        return courses

    def _load_jobs(self) -> List[Job]:
        df = self._load_csv("Job.csv")
        column_map = {col: col.strip().lower() for col in df.columns}
        df.rename(columns=column_map, inplace=True)
        jobs: List[Job] = []
        for _, row in df.iterrows():
            jobs.append(
                Job(
                    title=str(row.get("job name", "")).strip(),
                    duties=str(row.get("job duties", "")).strip(),
                    requirements=str(row.get("requirements", "")).strip(),
                )
            )
        return jobs

    def _load_employees(self) -> List[Dict[str, Any]]:
        path = self._data_dir / "Employee_Profiles.json"
        if not path.exists():
            raise FileNotFoundError(f"Employee profile dataset missing at {path}")
        return json.loads(path.read_text(encoding="utf-8"))

    def _load_wellness(self) -> List[WellnessEvent]:
        path = self._data_dir / "wellness_events.csv"
        if not path.exists():
            return []
        df = pd.read_csv(path, encoding="utf-8-sig").fillna("")
        return [
            WellnessEvent(
                category=str(row.get("category", "")).strip(),
                title=str(row.get("title", "")).strip(),
                description=str(row.get("description", "")).strip(),
                date_time=str(row.get("date_time", "")).strip(),
                location=str(row.get("location", "")).strip(),
            )
            for _, row in df.iterrows()
        ]

    # Exposed helpers -------------------------------------------------

    def list_community_posts(self, board: str) -> List[CommunityPost]:
        board = board.lower()
        return list(self._community.get(board, []))

    def list_courses(self, field: Optional[str] = None, search: Optional[str] = None) -> List[Course]:
        courses = self._courses
        if field:
            courses = [course for course in courses if course.topic.lower() == field.lower() or course.field.lower() == field.lower()]
        if search:
            term = search.lower()
            courses = [
                course
                for course in courses
                if term in course.name.lower()
                or term in course.description.lower()
                or any(term in item.lower() for item in (*course.what_you_learn, *course.skills))
            ]
        return courses

    def list_jobs(self) -> List[Job]:
        return self._jobs

    def get_job_by_title(self, title: str) -> Optional[Job]:
        for job in self._jobs:
            if job.title.lower() == title.lower():
                return job
        return None

    def list_employees(self) -> List[Dict[str, Any]]:
        return self._employees

    def get_employee(self, employee_id: str) -> Optional[Dict[str, Any]]:
        for employee in self._employees:
            if employee.get("employee_id") == employee_id:
                return employee
        return None

    def list_wellness_events(self) -> List[WellnessEvent]:
        return self._wellness
