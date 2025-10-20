const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type RequestMethod = "GET" | "POST";

function toStringOrUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

async function apiFetch<T>(path: string, method: RequestMethod = "GET", body?: unknown): Promise<T> {
  const init: RequestInit = {
    method,
    cache: "no-store",
    headers: {},
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    let detail = "";
    try {
      const parsed = await response.json();
      detail = parsed?.detail ?? JSON.stringify(parsed);
    } catch {
      detail = await response.text();
    }
    const message = detail || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type ChatHistoryItem = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function fetchRecommendedQuestions(): Promise<string[]> {
  const data = await apiFetch<{ questions: { question: string }[] }>("/api/chatbot/recommended-questions");
  return data.questions.map((item) => item.question);
}

export async function sendChatbotMessage(query: string, history: ChatHistoryItem[]): Promise<string> {
  const payload = { query, history };
  const data = await apiFetch<{ answer: string }>("/api/chatbot", "POST", payload);
  return data.answer;
}

export type CommunityPost = {
  title: string;
  description: string;
  time: string;
  postedBy: string;
};

export async function fetchCommunityPosts(board: string): Promise<CommunityPost[]> {
  const data = await apiFetch<{ items: { title: string; description: string; time: string; posted_by: string }[] }>(
    `/api/community/${board}`,
  );
  return data.items.map((item) => ({
    title: item.title,
    description: item.description,
    time: item.time,
    postedBy: item.posted_by,
  }));
}

export async function polishCommunityContent(content: string, tone: string): Promise<string> {
  const data = await apiFetch<{ polished_content: string }>("/api/community/polish", "POST", {
    content,
    tone,
  });
  return data.polished_content;
}

export type CourseSummary = {
  topic: string;
  name: string;
  description: string;
  field: string;
  whatYouLearn: string[];
  skills: string[];
};

export async function fetchLearningCourses(field?: string): Promise<CourseSummary[]> {
  const query = field ? `?field=${encodeURIComponent(field)}` : "";
  const data = await apiFetch<{ courses: { topic: string; name: string; description: string; field: string; what_you_learn: string[]; skills: string[] }[] }>(
    `/api/learning/courses${query}`,
  );
  return data.courses.map((course) => ({
    topic: course.topic,
    name: course.name,
    description: course.description,
    field: course.field,
    whatYouLearn: course.what_you_learn,
    skills: course.skills,
  }));
}

export type EmployeeProfileRecord = {
  employee_id: string;
  personal_info: Record<string, unknown>;
  employment_info: Record<string, unknown>;
  skills: Record<string, unknown>[];
  competencies: Record<string, unknown>[];
  experiences: Record<string, unknown>[];
  positions_history: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  education: Record<string, unknown>[];
};

export async function fetchEmployeeProfile(employeeId: string): Promise<EmployeeProfileRecord> {
  return apiFetch<EmployeeProfileRecord>(`/api/employees/${employeeId}`);
}

export async function requestLearningRecommendation(
  courseInformation: CourseSummary,
  employeeProfile: Partial<EmployeeProfileRecord> & { employment_info?: Record<string, unknown> },
): Promise<string> {
  const payload = {
    course_information: {
      title: courseInformation.name,
      description: courseInformation.description,
      field: courseInformation.field,
      topic: courseInformation.topic,
      skills: courseInformation.skills,
      what_you_learn: courseInformation.whatYouLearn,
    },
    employee_profile: {
      job_title: toStringOrUndefined(employeeProfile.employment_info?.["job_title"]),
      skills: Array.isArray(employeeProfile.skills)
        ? employeeProfile.skills.map((item) => String(item?.skill_name ?? item)).filter(Boolean)
        : [],
      interests: Array.isArray(employeeProfile.experiences)
        ? employeeProfile.experiences.map((item) => String(item?.focus ?? "")).filter(Boolean)
        : [],
      competencies: Array.isArray(employeeProfile.competencies)
        ? employeeProfile.competencies.map((item) => String(item?.name ?? "")).filter(Boolean)
        : [],
    },
  };
  const data = await apiFetch<{ recommendation: string }>("/api/learning/recommendation", "POST", payload);
  return data.recommendation;
}

export type CareerJob = {
  title: string;
  duties: string;
  requirements?: string;
};

export async function fetchCareerJobs(): Promise<CareerJob[]> {
  const data = await apiFetch<{ jobs: CareerJob[] }>("/api/career/jobs");
  return data.jobs;
}

export type DimensionScore = {
  dimension: string;
  score: number;
  explanation: string;
};

export type CareerAnalysis = {
  fitPercentage: number;
  narrative: string;
  dimensionScores: DimensionScore[];
};

export async function requestCareerAnalysis(
  jobInformation: CareerJob,
  employeeProfile: Partial<EmployeeProfileRecord> & { employment_info?: Record<string, unknown> },
): Promise<CareerAnalysis> {
  const payload = {
    job_information: {
      title: jobInformation.title,
      description: jobInformation.duties,
      requirements: jobInformation.requirements,
    },
    employee_information: {
      current_role: toStringOrUndefined(employeeProfile.employment_info?.["job_title"]),
      skills: Array.isArray(employeeProfile.skills)
        ? employeeProfile.skills.map((item) => String(item?.skill_name ?? item)).filter(Boolean)
        : [],
      experience: Array.isArray(employeeProfile.experiences)
        ? employeeProfile.experiences
            .map((item) => String(item?.focus ?? item?.program ?? ""))
            .filter(Boolean)
            .join("; ")
        : undefined,
      competencies: Array.isArray(employeeProfile.competencies)
        ? employeeProfile.competencies.map((item) => String(item?.name ?? "")).filter(Boolean)
        : [],
      name: toStringOrUndefined(employeeProfile.personal_info?.["name"]),
    },
  };

  const data = await apiFetch<{
    fit_percentage: number;
    narrative: string;
    dimension_scores: DimensionScore[];
  }>("/api/career/navigator", "POST", payload);

  return {
    fitPercentage: data.fit_percentage,
    narrative: data.narrative,
    dimensionScores: data.dimension_scores,
  };
}

export type WellnessEvent = {
  category: string;
  title: string;
  description: string;
  dateTime: string;
  location: string;
};

export async function fetchWellnessEvents(): Promise<WellnessEvent[]> {
  const data = await apiFetch<{ events: { category: string; title: string; description: string; date_time: string; location: string }[] }>(
    "/api/wellness/events",
  );
  return data.events.map((event) => ({
    category: event.category,
    title: event.title,
    description: event.description,
    dateTime: event.date_time,
    location: event.location,
  }));
}
