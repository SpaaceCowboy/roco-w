"use client";

import { useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import styles from "../admin.module.css";

async function authRequest(path: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "Too many attempts. Wait before trying again."
        : response.status >= 500
          ? "Sign-in is temporarily unavailable. Try again shortly."
          : "Sign-in failed. Check your credentials or code.",
    );
  return data;
}

export function StaffSignInForm({ returnTo }: { returnTo: string }) {
  const [stage, setStage] = useState<"password" | "enroll" | "verify">(
    "password",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [setup, setSetup] = useState<{
    uri: string;
    key: string;
    codes: string[];
  } | null>(null);
  const [recovery, setRecovery] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      fields = new FormData(form);
    setBusy(true);
    setError("");
    try {
      if (stage === "password") {
        const result = await authRequest("/sign-in/email", {
          email: fields.get("email"),
          password: fields.get("password"),
          rememberMe: true,
        });
        form.reset();
        setStage(result.twoFactorRedirect ? "verify" : "enroll");
      } else if (stage === "enroll" && !setup) {
        const result = await authRequest("/two-factor/enable", {
          password: fields.get("password"),
          method: "totp",
        });
        form.reset();
        setSetup({
          uri: result.totpURI,
          key: new URL(result.totpURI).searchParams.get("secret") ?? "",
          codes: result.backupCodes,
        });
      } else {
        await authRequest(
          recovery
            ? "/two-factor/verify-backup-code"
            : "/two-factor/verify-totp",
          { code: fields.get("code"), trustDevice: false },
        );
        form.reset();
        setSetup(null);
        window.location.assign(returnTo);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={styles.staffLogin}
      onSubmit={(event) => {
        void submit(event);
      }}
      aria-busy={busy}
    >
      {stage === "password" ? (
        <>
          <label htmlFor="staff-email">Email</label>
          <input
            id="staff-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
          />
          <label htmlFor="staff-password">Password</label>
          <input
            id="staff-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={12}
            maxLength={128}
          />
        </>
      ) : stage === "enroll" && !setup ? (
        <>
          <p>
            Set up your authenticator before accessing either dashboard. Confirm
            your password to continue.
          </p>
          <label htmlFor="setup-password">Password</label>
          <input
            id="setup-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </>
      ) : (
        <>
          {setup && (
            <section aria-label="Authenticator setup">
              <p>
                In your authenticator app, add an account and scan this QR code.
                Then enter the six-digit code below to finish setup.
              </p>
              <QRCodeSVG
                value={setup.uri}
                size={240}
                level="M"
                marginSize={4}
                title="Scan with your authenticator app to set up your account"
                role="img"
                className={styles.authenticatorQr}
              />
              <p>
                Can’t scan? Add an account manually, choose a time-based code,
                and enter this setup key.
              </p>
              <label htmlFor="authenticator-key">Setup key</label>
              <input
                id="authenticator-key"
                value={setup.key}
                readOnly
                dir="ltr"
              />
              <p>
                Save these single-use recovery codes in your password manager.
                They will not be shown again.
              </p>
              <ul dir="ltr">
                {setup.codes.map((code) => (
                  <li key={code}>
                    <code>{code}</code>
                  </li>
                ))}
              </ul>
              <label>
                <input type="checkbox" required /> I saved my recovery codes
              </label>
            </section>
          )}
          <label htmlFor="staff-code">
            {recovery ? "Recovery code" : "Authenticator code"}
          </label>
          <input
            id="staff-code"
            name="code"
            autoComplete="one-time-code"
            inputMode={recovery ? "text" : "numeric"}
            pattern={recovery ? undefined : "[0-9]{6}"}
            required
            dir="ltr"
          />
          {!setup && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                setRecovery(!recovery);
                setError("");
              }}
            >
              {recovery ? "Use authenticator instead" : "Use a recovery code"}
            </button>
          )}
        </>
      )}
      <button type="submit" className={styles.primaryButton} disabled={busy}>
        {busy
          ? "Please wait…"
          : stage === "enroll" && !setup
            ? "Set up authenticator"
            : stage === "password"
              ? "Continue"
              : "Verify and sign in"}
      </button>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <p>Accounts and password resets are managed by the administrator.</p>
    </form>
  );
}
