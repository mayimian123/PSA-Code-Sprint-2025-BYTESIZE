"use client";

import { useEffect, useMemo, useState } from "react";
import Markdown from "@/components/Markdown";
import {
  CareerAnalysis,
  CareerJob,
  DimensionScore,
  EmployeeProfileRecord,
  fetchCareerJobs,
  fetchEmployeeProfile,
  requestCareerAnalysis,
} from "@/lib/api";
import styles from "./careerNavigator.module.css";

type Job = CareerJob & { id: string };

const DEFAULT_EMPLOYEE_ID = "EMP-20001";

function normaliseJob(job: CareerJob, index: number): Job {
  const base = job.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return { ...job, id: `${base}-${index}` };
}

export default function CareerNavigatorPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [analysisMap, setAnalysisMap] = useState<Record<string, CareerAnalysis>>({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastAnalysedJobId, setLastAnalysedJobId] = useState<string | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfileRecord | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setJobsLoading(true);
    fetchCareerJobs()
      .then((data) => {
        if (cancelled) return;
        const mapped = data.map(normaliseJob);
        setJobs(mapped);
        setSelectedJobId(mapped[0]?.id ?? null);
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Unable to load career opportunities.";
        setJobsError(message);
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchEmployeeProfile(DEFAULT_EMPLOYEE_ID)
      .then((profile) => {
        if (!cancelled) setEmployeeProfile(profile);
      })
      .catch((error) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Unable to load your employee profile.";
          setProfileError(message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const analysisVisible = selectedJobId === lastAnalysedJobId;
  const analysis = analysisVisible && selectedJobId ? analysisMap[selectedJobId] : null;

  const handleAnalysis = async (job: Job) => {
    if (!employeeProfile) {
      setAnalysisError(profileError || "Your employee profile is still loading.");
      setLastAnalysedJobId(null);
      return;
    }

    const cached = analysisMap[job.id];
    if (cached) {
      setLastAnalysedJobId((current) => (current === job.id ? null : job.id));
      setAnalysisError(null);
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await requestCareerAnalysis(job, employeeProfile);
      setAnalysisMap((prev) => ({ ...prev, [job.id]: result }));
      setLastAnalysedJobId(job.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Sara couldn't complete this analysis right now.";
      setAnalysisError(message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <aside className={styles.jobList} aria-label="Career options">
        {jobsLoading && <p className={styles.statusMessage}>Loading jobs…</p>}
        {jobsError && <p className={styles.statusMessage} role="alert">{jobsError}</p>}
        {!jobsLoading && !jobsError && jobs.map((job) => {
          const active = job.id === selectedJobId;
          return (
            <button
              key={job.id}
              type="button"
              className={`${styles.jobCard} ${active ? styles.jobCardActive : ""}`}
              onClick={() => {
                setSelectedJobId(job.id);
                setLastAnalysedJobId(null);
                setAnalysisError(null);
              }}
            >
              <span className={styles.jobCategory}>{job.requirements ? "Internal Mobility" : "Opportunity"}</span>
              <span className={styles.jobTitle}>{job.title}</span>
            </button>
          );
        })}
      </aside>

      <section className={styles.detail}>
        {selectedJob ? (
          <>
            <h1>{selectedJob.title}</h1>
            <p className={styles.detailCategory}>{selectedJob.requirements || "Requirements shared at assessment stage"}</p>
            <p className={styles.summary}>{selectedJob.duties}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.applyButton}>
                Apply
              </button>
              <button
                type="button"
                className={`${styles.analysisButton} ${analysisVisible ? styles.analysisActive : ""}`}
                onClick={() => void handleAnalysis(selectedJob)}
                disabled={analysisLoading}
              >
                {analysisLoading && !analysisVisible ? "Analysing…" : "Analysis"}
              </button>
            </div>
            {analysisError && (
              <p className={styles.statusMessage} role="alert">{analysisError}</p>
            )}
            {profileError && !employeeProfile && (
              <p className={styles.statusMessage} role="alert">{profileError}</p>
            )}
            {analysisVisible && analysis && (
              <div className={styles.analysisPanel}>
                <Markdown>{analysis.narrative}</Markdown>
                <div className={styles.scoreGrid}>
                  {analysis.dimensionScores.map((score: DimensionScore) => (
                    <div key={score.dimension} className={styles.scoreCard}>
                      <div className={styles.scoreValue}>{Math.round(score.score)}%</div>
                      <div>
                        <h3>{score.dimension}</h3>
                        <p>{score.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className={styles.statusMessage}>Select a job to view details.</p>
        )}
      </section>
    </div>
  );
}
