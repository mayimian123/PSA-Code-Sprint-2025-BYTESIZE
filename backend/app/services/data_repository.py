from __future__ import annotations

import csv
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class DataRepository:
    """Lightweight data repository backed by the static CSV/JSON assets."""

    data_dir: Path
    _community_cache: List[Dict[str, str]] | None = field(default=None, init=False)
    _courses_cache: List[Dict[str, str]] | None = field(default=None, init=False)
    _jobs_cache: List[Dict[str, str]] | None = field(default=None, init=False)
    _employees_cache: Dict[str, Dict[str, Any]] | None = field(default=None, init=False)
    _wellness_cache: List[Dict[str, str]] | None = field(default=None, init=False)

    COMMUNITY_FILE = "Community.csv"
    COURSES_FILE = "Online_course.csv"
    JOBS_FILE = "Job.csv"
    EMPLOYEES_FILE = "Employee_Profiles.json"
    WELLNESS_FILE = "well-being_event.csv"

    COMMUNITY_BOARD_MAP = {
        "psa-events": "formal",
        "alongside": "informal",
    }

    WELLNESS_DEFAULT_SCHEDULE = {
        "music": ("Fridays, 5:30 PM", "Wellness Lounge, Level 3"),
        "health screening": ("Monthly, 9:00 AM", "PSA Medical Centre"),
        "fitness": ("Tuesdays & Thursdays, 6:00 PM", "Harbourfront Gym Studio"),
        "workshops": ("Wednesdays, 4:00 PM", "Learning Hub Theatre"),
        "mindfulness": ("Mondays, 12:30 PM", "Meditation Room, Level 5"),
    }

    def __post_init__(self) -> None:
        if not self.data_dir.exists():
            raise FileNotFoundError(f"Data directory not found: {self.data_dir}")

    def get_community_posts(self, board: str) -> List[Dict[str, Any]]:
        """Return community posts for the requested board key."""
        board_key = board.lower()
        board_type = self.COMMUNITY_BOARD_MAP.get(board_key)
        if board_type is None:
            raise ValueError(f"Unsupported community board: {board}")

        records = self._load_community()
        results: List[Dict[str, Any]] = []
        for entry in records:
            type_value = (
                entry.get("type formal/informal")
                or entry.get("type")
                or entry.get("category")
                or ""
            ).strip()
            if not type_value:
                continue
            if board_type == "formal" and type_value.lower().startswith("formal"):
                results.append(self._normalise_community_entry(entry, board_key))
            if board_type == "informal" and not type_value.lower().startswith("formal"):
                results.append(self._normalise_community_entry(entry, board_key))
        return results

    def get_courses(self, field: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return all courses, optionally filtered by topic/field."""
        records = self._load_courses()
        if not field:
            return [self._normalise_course_entry(item) for item in records]

        target = field.strip().lower()
        return [
            self._normalise_course_entry(item)
            for item in records
            if item.get("Topic", "").strip().lower() == target
        ]

    def get_jobs(self) -> List[Dict[str, Any]]:
        """Return the list of job summaries."""
        records = self._load_jobs()
        return [self._normalise_job_entry(item) for item in records]

    def get_employee_profile(self, employee_id: str) -> Dict[str, Any]:
        """Return an employee profile by identifier."""
        employees = self._load_employees()
        try:
            return employees[employee_id]
        except KeyError as error:
            raise ValueError(f"Employee {employee_id} was not found.") from error

    def list_wellness_events(self) -> List[Dict[str, Any]]:
        """Return the catalogue of wellness events."""
        records = self._load_wellness()
        events: List[Dict[str, Any]] = []

        seen_keys: set[str] = set()
        for entry in records:
            category = entry.get("Category", "").strip()
            title = entry.get("Activity", "").strip()
            if not category or not title:
                continue
            dedupe_key = f"{category.lower()}::{title.lower()}"
            if dedupe_key in seen_keys:
                continue
            seen_keys.add(dedupe_key)

            schedule = self.WELLNESS_DEFAULT_SCHEDULE.get(
                category.lower(), ("Fridays, 5:00 PM", "PSA Experience Centre")
            )
            events.append(
                {
                    "category": category,
                    "title": title,
                    "description": entry.get("Description", "").strip(),
                    "date_time": schedule[0],
                    "location": schedule[1],
                }
            )
        return events

    # Loaders -----------------------------------------------------------------

    def _load_community(self) -> List[Dict[str, str]]:
        if self._community_cache is None:
            self._community_cache = self._read_csv(self.COMMUNITY_FILE)
        return self._community_cache

    def _load_courses(self) -> List[Dict[str, str]]:
        if self._courses_cache is None:
            self._courses_cache = self._read_csv(self.COURSES_FILE)
        return self._courses_cache

    def _load_jobs(self) -> List[Dict[str, str]]:
        if self._jobs_cache is None:
            self._jobs_cache = self._read_csv(self.JOBS_FILE)
        return self._jobs_cache

    def _load_employees(self) -> Dict[str, Dict[str, Any]]:
        if self._employees_cache is None:
            path = self._resolve(self.EMPLOYEES_FILE)
            records = json.loads(path.read_text(encoding="utf-8"))
            self._employees_cache = {
                str(item.get("employee_id")): item for item in records if item.get("employee_id")
            }
        return self._employees_cache

    def _load_wellness(self) -> List[Dict[str, str]]:
        if self._wellness_cache is None:
            self._wellness_cache = self._read_csv(self.WELLNESS_FILE)
        return self._wellness_cache

    # Helpers -----------------------------------------------------------------

    def _read_csv(self, filename: str) -> List[Dict[str, str]]:
        path = self._resolve(filename)
        with path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            return [dict(row) for row in reader]

    def _resolve(self, filename: str) -> Path:
        path = self.data_dir / filename
        if not path.exists():
            raise FileNotFoundError(f"Expected data file at {path}")
        return path

    @staticmethod
    def _normalise_community_entry(entry: Dict[str, str], board: str) -> Dict[str, Any]:
        return {
            "title": entry.get("title", "").strip(),
            "description": entry.get("description", "").strip(),
            "time": entry.get("time", "").strip(),
            "posted_by": entry.get("Posted by", "").strip() or entry.get("posted_by", "").strip(),
            "board": board,
        }

    @staticmethod
    def _clean_list(raw: str) -> List[str]:
        if not raw:
            return []
        parts = (item.strip(" ;\n\r") for item in raw.split(";"))
        return [item for item in parts if item]

    def _normalise_course_entry(self, entry: Dict[str, str]) -> Dict[str, Any]:
        return {
            "topic": entry.get("Topic", "").strip(),
            "name": entry.get("course name", "").strip(),
            "description": entry.get("course description2", "").strip(),
            "field": entry.get("Field", "").strip(),
            "what_you_learn": self._clean_list(entry.get("What you’ll learn", "")),
            "skills": self._clean_list(entry.get("Skills you’ll gain", "")),
        }

    @staticmethod
    def _normalise_job_entry(entry: Dict[str, str]) -> Dict[str, Any]:
        return {
            "title": entry.get("Job name", "").strip(),
            "duties": entry.get("Job duties", "").strip(),
            "requirements": entry.get("Requirements", "").strip(),
        }
