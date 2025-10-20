import Image from "next/image";
import Link from "next/link";
import styles from "./Logo.module.css";

type LogoProps = {
  variant?: "psa" | "oPSAra";
  href?: string;
  className?: string;
};

const LOGO_SRC = "/images/logo.svg";
const ALT_COPY: Record<NonNullable<LogoProps["variant"]>, string> = {
  psa: "PSA logo",
  oPSAra: "oPSAra logo",
};

export function Logo({ variant = "oPSAra", href = "/", className }: LogoProps) {
  const logo = (
    <span className={`${styles.logo} ${className ?? ""}`.trim()}>
      <Image
        src={LOGO_SRC}
        alt={ALT_COPY[variant]}
        width={160}
        height={48}
        className={styles.image}
        priority
      />
    </span>
  );

  return href ? <Link href={href}>{logo}</Link> : logo;
}

