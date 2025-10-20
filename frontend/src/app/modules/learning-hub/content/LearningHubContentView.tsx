"use client";

import { useEffect, useMemo, useState } from "react";
import Markdown from "@/components/Markdown";
import { LEARNING_HUB_FIELDS } from "@/lib/constants";
import {
  CourseSummary,
  EmployeeProfileRecord,
  fetchEmployeeProfile,
  fetchLearningCourses,
  requestLearningRecommendation,
} from "@/lib/api";
import styles from "./content.module.css";

type Course = CourseSummary & { id: string };

type LearningHubContentViewProps = {
  initialField: (typeof LEARNING_HUB_FIELDS)[number];
};

const DEFAULT_EMPLOYEE_ID = "EMP-20001";

function createCourseId(course: CourseSummary, index: number) {
  const field = course.field || "course";
  const base = `${field}-${course.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${base}-${index}`;
}

export function LearningHubContentView({ initialField }: LearningHubContentViewProps) {
  const [activeField, setActiveField] =
    useState<(typeof LEARNING_HUB_FIELDS)[number]>(initialField);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [analysisByCourse, setAnalysisByCourse] = useState<Record<string, string>>({});
  const [analysisCourseId, setAnalysisCourseId] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [appliedCourseId, setAppliedCourseId] = useState<string | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfileRecord | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEmployeeProfile(DEFAULT_EMPLOYEE_ID)
      .then((profile) => {
        if (!cancelled) setEmployeeProfile(profile);
      })
      .catch((error) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unable to load employee profile.";
          setProfileError(message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCoursesLoading(true);
    setCoursesError(null);
    fetchLearningCourses(activeField)
      .then((data) => {
        if (cancelled) return;
        const mapped: Course[] = data.map((course, index) => ({
          ...course,
          id: createCourseId(course, index),
        }));
        setCourses(mapped);
        setSelectedCourseId(mapped[0]?.id ?? null);
        setAnalysisCourseId(null);
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Unable to load courses for this field.";
        setCoursesError(message);
        setCourses([]);
        setSelectedCourseId(null);
      })
      .finally(() => {
        if (!cancelled) setCoursesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeField]);

  useEffect(() => {
    setActiveField(initialField);
  }, [initialField]);

  useEffect(() => {
    if (!appliedCourseId) return;
    const timeout = window.setTimeout(() => {
      setAppliedCourseId(null);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [appliedCourseId]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const showAnalysis = analysisCourseId === selectedCourseId;
  const analysisContent = showAnalysis && selectedCourseId ? analysisByCourse[selectedCourseId] : "";
  const showApplySuccess = appliedCourseId === selectedCourseId;

  const requestAnalysis = async (course: Course) => {
    if (!employeeProfile) {
      setAnalysisError(profileError || "Your employee profile is still loading. Try again shortly.");
      return;
    }

    const cached = analysisByCourse[course.id];
    if (cached) {
      setAnalysisCourseId((current) => (current === course.id ? null : course.id));
      setAnalysisError(null);
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const recommendation = await requestLearningRecommendation(course, employeeProfile);
      setAnalysisByCourse((prev) => ({ ...prev, [course.id]: recommendation }));
      setAnalysisCourseId(course.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Sara couldn't analyse this course just now.";
      setAnalysisError(message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.filtersShell}>
        <div className={styles.filters}>
          {LEARNING_HUB_FIELDS.map((field) => {
            const active = activeField === field;
            return (
              <button
                key={field}
                type="button"
                className={`${styles.filterButton} ${active ? styles.filterActive : ""}`}
                onClick={() => {
                  setActiveField(field);
                  setAnalysisError(null);
                  setAppliedCourseId(null);
                }}
              >
                {field}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.content}>
        <aside className={styles.courseList} aria-label="Courses">
          {coursesLoading && <p className={styles.statusMessage}>Loading courses…</p>}
          {coursesError && <p className={styles.statusMessage} role="alert">{coursesError}</p>}
          {!coursesLoading && !coursesError && courses.map((course) => {
            const active = course.id === selectedCourseId;
            return (
              <button
                key={course.id}
                type="button"
                className={`${styles.courseItem} ${active ? styles.courseActive : ""}`}
                onClick={() => {
                  setSelectedCourseId(course.id);
                  setAnalysisCourseId(null);
                  setAppliedCourseId(null);
                  setAnalysisError(null);
                }}
              >
                <span className={styles.courseTitle}>{course.name}</span>
                <span className={styles.courseField}>{course.field}</span>
              </button>
            );
          })}
        </aside>

        <section className={styles.detail}>
          {selectedCourse ? (
            <>
              <div className={styles.courseHeader}>
                <p className={styles.topic}>Topic · {selectedCourse.topic}</p>
                <h1>{selectedCourse.name}</h1>
                <p className={styles.detailField}>Field · {selectedCourse.field}</p>
              </div>
              <p className={styles.description}>{selectedCourse.description}</p>
              <div className={styles.outcomes}>
                <div>
                  <h2>What you&apos;ll learn</h2>
                  <ul className={styles.outcomeList}>
                    {selectedCourse.whatYouLearn.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2>Skills you&apos;ll gain</h2>
                  <ul className={styles.outcomeList}>
                    {selectedCourse.skills.map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.applyButton}
                  onClick={() => setAppliedCourseId(selectedCourse.id)}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className={`${styles.analysisButton} ${showAnalysis ? styles.analysisActive : ""}`}
                  onClick={() => void requestAnalysis(selectedCourse)}
                  disabled={analysisLoading}
                >
                  {analysisLoading && !showAnalysis ? "Analysing…" : "Analysis"}
                </button>
              </div>
              {showApplySuccess && (
                <div className={styles.applySuccess} role="status" aria-live="polite">
                  Apply Successful
                </div>
              )}
              {analysisError && (
                <p className={styles.statusMessage} role="alert">
                  {analysisError}
                </p>
              )}
              {profileError && !employeeProfile && (
                <p className={styles.statusMessage} role="alert">
                  {profileError}
                </p>
              )}
              {showAnalysis && analysisContent && (
                <div className={styles.analysisPanel}>
                  <Markdown>{analysisContent}</Markdown>
                </div>
              )}
            </>
          ) : (
            <p className={styles.emptyState}>Select a course to view more details.</p>
          )}
        </section>
      </div>
    </div>
  );
}
