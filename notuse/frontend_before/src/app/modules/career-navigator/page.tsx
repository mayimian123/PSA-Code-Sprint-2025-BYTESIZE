"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CareerNavigatorPayload,
  CareerNavigatorResponse,
  JobSummary,
  analyseCareer,
  fetchEmployee,
  fetchJobs,
} from "@/lib/api";
import { toSimpleMarkdownHtml } from "@/lib/markdown";
import styles from "./careerNavigator.module.css";

type JobWithId = JobSummary & { id: string; category: string };

const DEFAULT_EMPLOYEE_ID = "EMP-20001";

export default function CareerNavigatorPage() {
  const [jobs, setJobs] = useState<JobWithId[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [employeeSkills, setEmployeeSkills] = useState<string[]>([]);
  const [employeeRole, setEmployeeRole] = useState<string>("PSA Employee");
  const [analysis, setAnalysis] = useState<CareerNavigatorResponse | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs()
      .then((response) => {
        const normalised = response.jobs.map((job) => ({
          ...job,
          id: job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          category: job.title.split(",")[0] ?? "Career",
        }));
        setJobs(normalised);
        setSelectedJobId(normalised[0]?.id ?? null);
      })
      .catch((err) => setError((err as Error).message));
  }, []);

  useEffect(() => {
    fetchEmployee(DEFAULT_EMPLOYEE_ID)
      .then((employee) => {
        setEmployeeRole(String(employee.employment_info?.job_title ?? "PSA Employee"));
        const skills = (employee.skills || [])
          .map((skill) => {
            if (typeof skill !== "object" || skill === null) return "";
            const record = skill as Record<string, unknown>;
            const possible =
              record["skill_name"] ?? record["name"] ?? record["Skill"] ?? record["skill"];
            return typeof possible === "string" ? possible : "";
          })
          .filter((item): item is string => Boolean(item))
          .slice(0, 10);
        setEmployeeSkills(skills);
      })
      .catch(() => undefined);
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const handleAnalysis = async () => {
    if (!selectedJob) return;
    setIsAnalysing(true);
    setError(null);
    try {
      const payload: CareerNavigatorPayload = {
        job_information: {
          title: selectedJob.title,
          description: selectedJob.duties,
          requirements: selectedJob.requirements,
        },
        employee_information: {
          current_role: employeeRole,
          skills: employeeSkills.length ? employeeSkills : ["Operations", "Leadership"],
          experience: "Experience across PSA operations and cross-functional projects.",
        },
      };
      const response = await analyseCareer(payload);
      setAnalysis(response);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAnalysing(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <aside className={styles.jobList} aria-label="Career options">
        {jobs.map((job) => {
          const active = job.id === selectedJobId;
          return (
            <button
              key={job.id}
              type="button"
              className={`${styles.jobCard} ${active ? styles.jobCardActive : ""}`}
              onClick={() => {
                setSelectedJobId(job.id);
                setAnalysis(null);
              }}
              aria-pressed={active}
            >
              <span className={styles.jobCategory}>{job.category}</span>
              <span className={styles.jobTitle}>{job.title}</span>
            </button>
          );
        })}
      </aside>

      <section className={styles.detail}>
        {selectedJob ? (
          <>
            <h1>{selectedJob.title}</h1>
            <p className={styles.detailCategory}>{selectedJob.category}</p>
            <p className={styles.summary}>{selectedJob.duties}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.applyButton}>
                Apply
              </button>
              <button
                type="button"
                className={`${styles.analysisButton} ${analysis ? styles.analysisActive : ""}`}
                onClick={handleAnalysis}
                disabled={isAnalysing}
              >
                {isAnalysing ? "Analysing…" : "Analysis"}
              </button>
            </div>
            {analysis && (
              <div className={styles.analysisPanel}>
                <div
                  className={styles.analysisContent}
                  dangerouslySetInnerHTML={toSimpleMarkdownHtml(analysis.narrative)}
                />
                <ul>
                  {analysis.dimension_scores.map((score) => (
                    <li key={score.dimension}>
                      <strong>{score.dimension}</strong>: {score.score.toFixed(1)} — {score.explanation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error && <p className={styles.summary}>{error}</p>}
          </>
        ) : (
          <p className={styles.summary}>Select a role to view details.</p>
        )}
      </section>
    </div>
  );
}
