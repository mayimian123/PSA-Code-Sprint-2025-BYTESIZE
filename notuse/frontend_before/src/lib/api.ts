const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchCommunity(board: string) {
  return apiFetch<{ board: string; items: CommunityPost[] }>(`/api/community/${board}`);
}

export async function polishCommunity(content: string, tone: string) {
  return apiFetch<{ polished_content: string }>("/api/community/polish", {
    method: "POST",
    body: JSON.stringify({ content, tone }),
  });
}

export async function askChatbot(query: string, history?: ChatMessage[]) {
  return apiFetch<{ answer: string; sources: ChatSource[] }>("/api/chatbot", {
    method: "POST",
    body: JSON.stringify({ query, history }),
  });
}

export async function fetchRecommendedQuestions() {
  return apiFetch<{ questions: RecommendedQuestion[] }>("/api/chatbot/recommended-questions");
}

export async function fetchCourses(field?: string) {
  const params = new URLSearchParams();
  if (field) params.set("field", field);
  return apiFetch<{ courses: CourseSummary[] }>(`/api/learning/courses?${params.toString()}`);
}

export async function requestCourseRecommendation(payload: LearningRecommendationPayload) {
  return apiFetch<{ recommendation: string }>("/api/learning/recommendation", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchJobs() {
  return apiFetch<{ jobs: JobSummary[] }>("/api/career/jobs");
}

export async function analyseCareer(payload: CareerNavigatorPayload) {
  return apiFetch<CareerNavigatorResponse>("/api/career/navigator", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchWellnessEvents() {
  return apiFetch<{ events: WellnessEvent[] }>("/api/wellness/events");
}

export async function fetchEmployee(employeeId: string) {
  return apiFetch<EmployeeProfileResponse>(`/api/employees/${employeeId}`);
}

export type CommunityPost = {
  title: string;
  description: string;
  time: string;
  posted_by: string;
  board: string;
};

export type ChatMessage = { role: string; content: string };

export type ChatSource = { content: string; similarity: number };

export type RecommendedQuestion = {
  id: string;
  question: string;
  category?: string | null;
};

export type CourseSummary = {
  topic: string;
  name: string;
  description: string;
  field: string;
  what_you_learn: string[];
  skills: string[];
};

export type LearningRecommendationPayload = {
  course_information: {
    title: string;
    description: string;
    category?: string;
    skills?: string[];
  };
  employee_profile: {
    job_title: string;
    skills: string[];
    interests?: string[];
  };
};

export type JobSummary = {
  title: string;
  duties: string;
  requirements: string;
};

export type CareerNavigatorPayload = {
  job_information: {
    title: string;
    description: string;
    requirements?: string;
  };
  employee_information: {
    current_role: string;
    skills: string[];
    experience?: string;
  };
};

export type CareerNavigatorResponse = {
  fit_percentage: number;
  dimension_scores: { dimension: string; score: number; explanation: string }[];
  narrative: string;
};

export type WellnessEvent = {
  category: string;
  title: string;
  description: string;
  date_time: string;
  location: string;
};

export type EmployeeProfileResponse = {
  employee_id: string;
  personal_info: { name: string; email: string; office_location: string; languages: { language: string; proficiency: string }[] };
  employment_info: Record<string, unknown>;
  skills: Record<string, unknown>[];
  competencies: Record<string, unknown>[];
  experiences: Record<string, unknown>[];
  positions_history: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  education: Record<string, unknown>[];
};

export { apiFetch };
