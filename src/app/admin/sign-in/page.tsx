import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminAuthConfigured } from "@/lib/admin/auth-config";
import { isLocalDevAdminRequest } from "@/lib/admin/local-dev-policy";
import { GoogleSignInButton } from "./GoogleSignInButton";
import styles from "../admin.module.css";
import { StaffSignInForm } from "./StaffSignInForm";
import { staffMode, staffReturnPath } from "@/lib/admin/staff-policy";

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  if (isLocalDevAdminRequest(await headers())) redirect("/admin");
  const configured = isAdminAuthConfigured();
  const staff = staffMode();
  const returnTo = staffReturnPath((await searchParams).returnTo);
  return (
    <main className={styles.panel}>
      <p className={styles.eyebrow}>RocoBroker</p>
      <h1>Admin sign-in</h1>
      <p>
        {staff
          ? "Sign in to the RocoBroker staff workspace."
          : "Use an approved Google account. Access still requires an active application allowlist entry."}
      </p>
      {configured ? (
        staff ? (
          <StaffSignInForm returnTo={returnTo} />
        ) : (
          <GoogleSignInButton />
        )
      ) : (
        <p className={styles.notice} role="status">
          Sign-in is not configured on this environment.
        </p>
      )}
    </main>
  );
}
