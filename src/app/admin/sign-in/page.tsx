import { isAdminAuthConfigured } from "@/lib/admin/auth-config";
import { GoogleSignInButton } from "./GoogleSignInButton";
import styles from "../admin.module.css";

export default function AdminSignInPage() {
  const configured = isAdminAuthConfigured();
  return (
    <main className={styles.panel}>
      <p className={styles.eyebrow}>RocoBroker</p>
      <h1>Admin sign-in</h1>
      <p>Use an approved Google account. Access still requires an active application allowlist entry.</p>
      {configured ? (
        <GoogleSignInButton />
      ) : (
        <p className={styles.notice} role="status">Google sign-in is not configured on this environment.</p>
      )}
    </main>
  );
}
