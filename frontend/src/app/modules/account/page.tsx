"use client";

import { useEffect, useState } from "react";
import {
  EmployeeProfileRecord,
  fetchEmployeeProfile,
} from "@/lib/api";
import styles from "./account.module.css";

const DEFAULT_EMPLOYEE_ID = "EMP-20001";

type DisplayField = {
  label: string;
  value: string;
};

type UnknownRecord = Record<string, unknown>;

function readString(source: UnknownRecord | undefined, key: string): string {
  const value = source?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function getPrimaryFields(profile: EmployeeProfileRecord | null): DisplayField[] {
  if (!profile) return [];
  const employment = profile.employment_info as UnknownRecord | undefined;
  const personal = profile.personal_info as UnknownRecord | undefined;
  const fields: DisplayField[] = [
    { label: "Employee ID", value: profile.employee_id },
    { label: "Department", value: readString(employment, "department") },
    { label: "Email", value: readString(personal, "email") },
    { label: "Hire Date", value: readString(employment, "hire_date") },
    { label: "Office Location", value: readString(personal, "office_location") },
  ];
  return fields.filter((field) => Boolean(field.value));
}

type LanguageEntry = {
  language?: unknown;
  name?: unknown;
  proficiency?: unknown;
  level?: unknown;
};

function formatLanguages(profile: EmployeeProfileRecord | null): DisplayField[] {
  if (!profile) return [];
  const personal = profile.personal_info as UnknownRecord | undefined;
  const data = personal?.languages;
  const languages = Array.isArray(data) ? (data as LanguageEntry[]) : [];
  return languages
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const labelSource = typeof entry.language === "string" && entry.language.trim()
        ? entry.language
        : typeof entry.name === "string"
          ? entry.name
          : "";
      const label = labelSource.trim();
      if (!label) return null;
      const levelSource = typeof entry.proficiency === "string" && entry.proficiency.trim()
        ? entry.proficiency
        : typeof entry.level === "string"
          ? entry.level
          : "";
      return { label, value: levelSource.trim() };
    })
    .filter((item): item is DisplayField => Boolean(item));
}

export default function AccountPage() {
  const [profile, setProfile] = useState<EmployeeProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEmployeeProfile(DEFAULT_EMPLOYEE_ID)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unable to load profile.";
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const employmentInfo = profile?.employment_info as UnknownRecord | undefined;
  const personalInfo = profile?.personal_info as UnknownRecord | undefined;

  const displayName = readString(personalInfo, "name") || "PSA Employee";
  const jobTitle = readString(employmentInfo, "job_title");
  const languages = formatLanguages(profile);
  const primaryFields = getPrimaryFields(profile);

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>{loading ? "Loading…" : displayName}</h1>
        {jobTitle && <p className={styles.subtitle}>{jobTitle}</p>}
      </header>

      {error && (
        <p className={styles.statusMessage} role="alert">
          {error}
        </p>
      )}

      {!error && loading && <p className={styles.statusMessage}>Loading profile…</p>}

      {!loading && profile && (
        <section className={styles.summary}>
          <dl className={styles.detailList}>
            {primaryFields.map((field) => (
              <div key={field.label} className={styles.row}>
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.languages}>
            <h2>Languages</h2>
            {languages.length ? (
              <ul>
                {languages.map((language) => (
                  <li key={language.label}>
                    <span>{language.label}</span>
                    {language.value && <span className={styles.level}>{language.value}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>No languages recorded.</p>
            )}
          </div>
        </section>
      )}

      <a
        href="/login"
        className={styles.signOut}
        role="button"
        aria-label="Sign out and go to login"
      >
        Sign out
      </a>
    </div>
  );
}
