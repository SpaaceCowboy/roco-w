"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminAuthClient } from "@/lib/admin/auth-client";
import styles from "./admin.module.css";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function signOut() {
    setPending(true);
    setError("");
    try {
      const result = await adminAuthClient.signOut();
      if (result.error) throw new Error("Sign-out failed");
      router.replace("/admin/sign-in");
      router.refresh();
    } catch {
      setError("Sign-out failed. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <><button className={styles.secondaryButton} type="button" onClick={signOut} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </button>{error && <p className={styles.error} role="alert">{error}</p>}</>
  );
}
