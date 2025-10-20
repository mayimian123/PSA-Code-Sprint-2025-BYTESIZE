"use client";

import { useEffect, useState } from "react";
import { EmployeeProfileResponse, fetchEmployee } from "@/lib/api";
import styles from "./account.module.css";

const EMPLOYEE_ID = "EMP-20001";

type PrimaryField = { label: string; value: string };

export default function AccountPage() {
  const [profile, setProfile] = useState<EmployeeProfileResponse | null>(null);
  const [primaryFields, setPrimaryFields] = useState<PrimaryField[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployee(EMPLOYEE_ID)
      .then((employee) => {
        setProfile(employee);
        setPrimaryFields([
          { label: "Employee ID", value: employee.employee_id },
          { label: "Department", value: String(employee.employment_info?.department ?? "-") },
          { label: "Email", value: String(employee.personal_info?.email ?? "-") },
          { label: "Hire Date", value: String(employee.employment_info?.hire_date ?? "-") },
          { label: "Office Location", value: String(employee.personal_info?.office_location ?? "-") },
        ]);
      })
      .catch((err) => setError((err as Error).message));
  }, []);

  if (error) {
    return <p className={styles.subtitle}>Unable to load profile: {error}</p>;
  }

  if (!profile) {
    return <p className={styles.subtitle}>Loading profile…</p>;
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1>{profile.personal_info?.name ?? "PSA Employee"}</h1>
        <p className={styles.subtitle}>
          {String(profile.employment_info?.job_title ?? "Team Member")}
        </p>
      </header>
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
          <ul>
            {(profile.personal_info?.languages ?? []).map((language) => (
              <li key={`${language.language}-${language.proficiency}`}>
                <span>{language.language}</span>
                <span className={styles.level}>{language.proficiency}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <button type="button" className={styles.signOut}>
        Sign out
      </button>
    </div>
  );
}
