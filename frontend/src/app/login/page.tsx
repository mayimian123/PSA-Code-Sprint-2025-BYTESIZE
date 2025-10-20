"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { IMAGE_PATHS } from "@/lib/constants";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/home");
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.background}>
        <Image
          src={IMAGE_PATHS.loginBackground}
          alt="Login background"
          fill
          priority
          className={styles.backgroundImage}
        />
        <div className={styles.backdrop} />
      </div>
      <header className={styles.header}>
        <Logo href="/" />
      </header>
      <main className={styles.main}>
        <motion.form
          className={styles.form}
          onSubmit={handleSubmit}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className={styles.heading}>
            <h1>Sign in</h1>
            <p className={styles.welcomeLine}>
              Welcome to{" "}
              <span className={styles.inlineLogo} aria-hidden="true">
                <Logo className={styles.inlineLogoImage} />
              </span>
              <span className="visually-hidden">oPSAra</span>
            </p>
          </div>
          <label className={styles.label}>
            Username
            <input
              type="email"
              placeholder="your.name@psa.com"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <div className={styles.options}>
            <Link href="#" aria-label="Forgot Password">
              Forgot Password
            </Link>
            <Link href="#" aria-label="Register Account">
              Register Account
            </Link>
          </div>
          <button type="submit" className={styles.submit}>
            Sign in <span aria-hidden="true">-&gt;</span>
          </button>
        </motion.form>
      </main>
    </div>
  );
}
