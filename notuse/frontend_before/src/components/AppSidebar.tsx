"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULE_ROUTES } from "@/lib/constants";
import { Logo } from "@/components/Logo";
import styles from "./AppSidebar.module.css";

export function AppSidebar() {
  const pathname = usePathname();
  const primaryRoutes = MODULE_ROUTES.filter((route) => route.key !== "account");
  const accountRoute = MODULE_ROUTES.find((route) => route.key === "account");

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoShell}>
        <Logo href="/home" />
      </div>
      <nav className={styles.nav}>
        {primaryRoutes.map((route) => {
          const active =
            pathname === route.path || pathname?.startsWith(`${route.path}/`);
          return (
            <Link
              key={route.key}
              href={route.path}
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
            >
              <Image
                src={route.image}
                alt={`${route.label} icon`}
                width={28}
                height={28}
                className={styles.navIcon}
              />
              <span>{route.label}</span>
            </Link>
          );
        })}
      </nav>
      {accountRoute ? (
        <div className={styles.account}>
          <Link
            href={accountRoute.path}
            className={`${styles.navItem} ${pathname?.startsWith(accountRoute.path) ? styles.navItemActive : ""}`}
          >
            <Image
              src={accountRoute.image}
              alt={`${accountRoute.label} icon`}
              width={24}
              height={24}
              className={styles.navIcon}
            />
            <span>{accountRoute.label}</span>
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
