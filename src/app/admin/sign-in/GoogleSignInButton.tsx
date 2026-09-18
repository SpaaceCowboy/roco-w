"use client";

import { useState } from "react";
import { adminAuthClient } from "@/lib/admin/auth-client";
import styles from "../admin.module.css";

export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    setError(null);
    const result = await adminAuthClient.signIn.social({ provider: "google", callbackURL: "/admin" });
    if (result.error) {
      setError("Sign-in failed. Confirm that this Google account has been allowlisted.");
      setPending(false);
    }
  }

  return (
    <div className={styles.actions}>
      <button className={styles.primaryButton} type="button" onClick={signIn} disabled={pending}>
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
