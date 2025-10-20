import type { ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import styles from "./modulesLayout.module.css";

export default function ModulesLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <AppSidebar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
