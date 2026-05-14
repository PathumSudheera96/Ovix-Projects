# InvoiceFlow

Production-oriented invoice app built with Next.js App Router, TypeScript, Prisma, PostgreSQL, Tailwind, and Auth.js.

## Security Features

- Credentials authentication with Auth.js (`JWT` session strategy in `httpOnly` cookies).
- Password hashing with `bcrypt` (`bcryptjs` implementation).
- No token storage in `localStorage`.
- Route protection in middleware for dashboard and admin routes.
- Role-based authorization (`USER`, `ADMIN`).
- Forgot/reset password token flow with short-lived hashed reset tokens.
- Login and forgot-password rate limiting.
- CSRF protection for server actions with double-submit token.
- Input validation with Zod for auth and invoice writes.
- Secure cookie settings (`httpOnly`, `secure` in production, `sameSite=lax`).
- Security headers in `next.config.ts`.

## Architecture

- `auth.ts`: Auth.js core configuration.
- `middleware.ts`: authentication and RBAC route guards.
- `app/api/auth/[...nextauth]/route.ts`: Auth.js route handler.
- `app/(auth)/*`: login/register/forgot/reset pages.
- `app/actions/*`: secure server actions.
- `lib/auth/*`: auth helpers (hashing, rate-limit, CSRF, validation, session guards).
- `lib/invoices.ts`: user-scoped invoice CRUD and dashboard data access.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Fill required values in `.env`:

- `DATABASE_URL`
- `AUTH_SECRET` (minimum 32 chars)
- `APP_URL` (for local: `http://localhost:3000`)

4. Run migrations and generate Prisma client:

```bash
npx prisma migrate deploy
npm run db:generate
```

5. Start development server:

```bash
npm run dev
```

## Auth Flow Notes

- Register: creates user with hashed password and `USER` role.
- Login: Credentials provider with rate limiting and password hash verification.
- Logout: server action with Auth.js `signOut`.
- Forgot password: always returns a generic message; reset links are emitted to server logs unless SMTP is integrated.
- Reset password: validates token hash and expiry, updates hash, marks token as used.

## OWASP-Oriented Decisions

- Generic auth failure responses to reduce account enumeration risk.
- Password reset tokens are hashed at rest.
- Validation is enforced server-side even when client forms exist.
- Auth and authorization checks are applied in both middleware and server boundaries.
- Prisma typed queries prevent raw SQL injection vectors in normal CRUD paths.

## Production Hardening Checklist

1. Configure SMTP and send reset links through a trusted mail provider.
2. Move rate limiting from in-memory to Redis for distributed environments.
3. Add audit/event logging for auth-sensitive actions.
4. Set up strict CSP with nonces if your deployment environment supports it.
5. Run dependency vulnerability scans in CI.
