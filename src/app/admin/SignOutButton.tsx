"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminAuthClient } from "@/lib/admin/auth-client";
import styles from "./admin.module.css";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function signOut() {
    setPending(true);
    await adminAuthClient.signOut();
    router.replace("/admin/sign-in");
    router.refresh();
  }

  return (
    <button className={styles.secondaryButton} type="button" onClick={signOut} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
