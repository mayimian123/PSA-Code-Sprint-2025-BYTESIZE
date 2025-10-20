"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LEARNING_HUB_FIELDS } from "@/lib/constants";
import {
  CourseSummary,
  LearningRecommendationPayload,
  fetchCourses,
  requestCourseRecommendation,
} from "@/lib/api";
import { toSimpleMarkdownHtml } from "@/lib/markdown";
import styles from "./content.module.css";

type LearningHubContentViewProps = {
  initialField: (typeof LEARNING_HUB_FIELDS)[number];
};

type CourseWithId = CourseSummary & { id: string };

const defaultProfile: LearningRecommendationPayload["employee_profile"] = {
  job_title: "PSA Employee",
  skills: ["Operations", "Leadership", "Technology"],
  interests: ["Continuous Learning"],
};

export function LearningHubContentView({ initialField }: LearningHubContentViewProps) {
  const [activeField, setActiveField] =
    useState<(typeof LEARNING_HUB_FIELDS)[number]>(initialField);
  const [courses, setCourses] = useState<CourseWithId[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>();
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [applySuccessId, setApplySuccessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async (field: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchCourses(field);
      const withIds = response.courses.map((course) => ({
        ...course,
        id: `${course.topic}-${course.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      }));
      setCourses(withIds);
      setSelectedCourseId(withIds[0]?.id);
    } catch (err) {
      setError((err as Error).message);
      setCourses([]);
      setSelectedCourseId(undefined);
    } finally {
      setIsLoading(false);
      setAnalysisText(null);
      setApplySuccessId(null);
    }
  }, []);

  useEffect(() => {
    loadCourses(initialField).catch(() => undefined);
  }, [initialField, loadCourses]);

  useEffect(() => {
    setActiveField(initialField);
  }, [initialField]);

  useEffect(() => {
    loadCourses(activeField).catch(() => undefined);
  }, [activeField, loadCourses]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId],
  );

  useEffect(() => {
    if (!applySuccessId) return;
    const timeout = window.setTimeout(() => setApplySuccessId(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [applySuccessId]);

  const handleApply = async () => {
    if (!selectedCourse) return;
    setApplySuccessId(selectedCourse.id);
    setAnalysisText(null);
  };

  const handleAnalysis = async () => {
    if (!selectedCourse) return;
    setAnalysisText(null);
    try {
      const payload: LearningRecommendationPayload = {
        course_information: {
          title: selectedCourse.name,
          description: selectedCourse.description,
          category: selectedCourse.topic,
          skills: selectedCourse.skills,
        },
        employee_profile: {
          ...defaultProfile,
          interests: [...(defaultProfile.interests ?? []), selectedCourse.topic],
        },
      };
      const response = await requestCourseRecommendation(payload);
      setAnalysisText(response.recommendation);
    } catch (err) {
      setAnalysisText((err as Error).message);
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
                  setAnalysisText(null);
                  setApplySuccessId(null);
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
          {isLoading && <p className={styles.emptyState}>Loading courses…</p>}
          {error && <p className={styles.emptyState}>Unable to load courses: {error}</p>}
          {!isLoading && !error &&
            courses.map((course) => {
              const active = course.id === selectedCourseId;
              return (
                <button
                  key={course.id}
                  type="button"
                  className={`${styles.courseItem} ${active ? styles.courseActive : ""}`}
                  onClick={() => {
                    setSelectedCourseId(course.id);
                    setAnalysisText(null);
                    setApplySuccessId(null);
                  }}
                >
                  <span className={styles.courseTitle}>{course.name}</span>
                  <span className={styles.courseField}>{course.topic}</span>
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
                    {selectedCourse.what_you_learn.map((item) => (
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
                <button type="button" className={styles.applyButton} onClick={handleApply}>
                  Apply
                </button>
                <button
                  type="button"
                  className={`${styles.analysisButton} ${analysisText ? styles.analysisActive : ""}`}
                  onClick={handleAnalysis}
                >
                  Analysis
                </button>
              </div>
              {applySuccessId === selectedCourse.id && (
                <div className={styles.applySuccess} role="status" aria-live="polite">
                  Apply Successful
                </div>
              )}
              {analysisText && (
                <div
                  className={styles.analysisPanel}
                  dangerouslySetInnerHTML={toSimpleMarkdownHtml(analysisText)}
                />
              )}
            </>
          ) : (
            <p className={styles.emptyState}>
              {isLoading ? "Loading catalogue…" : "Select a course to view more details."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
