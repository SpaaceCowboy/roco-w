# Staff account management

Run these commands in an interactive SSH terminal on the **main website VPS** as root. The shared login serves both `scc.rocobroker.com` dashboards. Replace example email addresses and names before running a command.

The existing management script is `scripts/staff-user.ts`. Passwords are entered twice at hidden prompts and must be 12–128 characters. Do not put passwords in command arguments, shell variables, this repository, or chat. No application restart is needed.

## Change a password

```bash
cd /opt/rocobroker-next
runuser -u rocoweb -- /opt/rocobroker-node/bin/node \
  --env-file=.env.production --import tsx scripts/staff-user.ts \
  reset-password --email you@example.com
```

This changes an existing staff account's password and revokes its sessions and pending sign-in challenges for both dashboards. Its authenticator, role and SEO actor link remain unchanged. The user signs in again with the new password and their existing authenticator.

## Add a user

```bash
cd /opt/rocobroker-next
runuser -u rocoweb -- /opt/rocobroker-node/bin/node \
  --env-file=.env.production --import tsx scripts/staff-user.ts \
  create --email new-user@example.com --role editor --name "New Editor"
```

Choose the required content role:

- `editor`: read, create, edit and delete content; manage media and categories; view/export campaign leads.
- `reviewer`: editor permissions plus review, publish, archive and read audit records.
- `admin`: all content permissions, including user management.

The new user signs in at [SCC sign-in](https://scc.rocobroker.com/admin/sign-in), confirms their password to start enrollment, scans the QR code with their own authenticator, saves their recovery codes, and enters the six-digit code to finish. The manual setup key is also available.

This example creates a content account without SEO workflow access. SEO access requires a distinct HUMAN actor and the appropriate SEO permission-registry configuration, followed by linking that actor with `--seo-actor-id` when creating the account. Do not reuse another person's actor UUID: it shares their permissions and audit identity. The website script does not provision SEO actors or their permissions.

`create` refuses to replace a password already attached to an account. Use `reset-password` for an existing password account.

## Recover a lost authenticator

Use a saved recovery code first. If the authenticator is lost and recovery codes are unavailable, verify the person's identity before resetting MFA:

```bash
cd /opt/rocobroker-next
runuser -u rocoweb -- /opt/rocobroker-node/bin/node \
  --env-file=.env.production --import tsx scripts/staff-user.ts \
  reset-mfa --email you@example.com
```

This revokes sessions and challenges, invalidates the previous authenticator and recovery codes, and requires enrollment again. It preserves the password and permissions.

## Disable a user

```bash
cd /opt/rocobroker-next
runuser -u rocoweb -- /opt/rocobroker-node/bin/node \
  --env-file=.env.production --import tsx scripts/staff-user.ts \
  disable --email former-user@example.com
```

This disables shared browser access and revokes sessions and challenges. It does not delete content or audit history, or revoke separate SEO service credentials.

For deployment and rollback details, see [SCC staff deployment](scc-staff-deployment.md).
