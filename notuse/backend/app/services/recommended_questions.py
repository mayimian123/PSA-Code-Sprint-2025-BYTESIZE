"""Service for managing recommended questions."""

from __future__ import annotations

import json
from pathlib import Path
from typing import List

from ..models import RecommendedQuestion


class RecommendedQuestionsService:
    """Service that provides recommended questions for the chatbot."""

    def __init__(self, questions_path: Path):
        self._questions_path = questions_path
        self._questions: List[RecommendedQuestion] | None = None

    def _load_questions(self) -> List[RecommendedQuestion]:
        """Load questions from the markdown file."""
        if self._questions is not None:
            return self._questions

        # Read the markdown file
        content = self._questions_path.read_text(encoding="utf-8")
        
        # Parse questions from markdown
        questions = []
        for line in content.split("\n"):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
                
            # Create a question ID from the text
            question_id = f"q{len(questions) + 1}"
            
            # Determine category if present (can be enhanced based on markdown structure)
            category = None
            
            questions.append(
                RecommendedQuestion(
                    id=question_id,
                    question=line,
                    category=category
                )
            )
        
        self._questions = questions
        return self._questions

    def get_questions(self) -> List[RecommendedQuestion]:
        """Get all recommended questions."""
        return self._load_questions()

    def get_question_by_id(self, question_id: str) -> RecommendedQuestion | None:
        """Get a specific question by ID."""
        questions = self._load_questions()
        for question in questions:
            if question.id == question_id:
                return question
        return None
