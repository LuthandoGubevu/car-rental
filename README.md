# Car Care

A monthly vehicle condition check tool for a car rental/lease fleet. Drivers
photograph their vehicle from four angles and flag any new damage; the fleet
team reviews each submission and records a verdict.

Deliberately narrow: this is a condition-check reporting tool, not fleet
management. Leases, billing, and driver contracts live in the company's own
systems — this app only needs enough of a vehicle/driver record to route a
submission to the right person.

## Stack

- React 19 + React Router, built with Vite
- Firebase: Authentication (email/password), Firestore (data), Storage (photos)

## Getting started

```bash
npm install
npm run dev
```

## Firebase project setup

The app is wired to the `stratifyai-d82ce` Firebase project
(`src/firebase.js`). In the [Firebase console](https://console.firebase.google.com/project/stratifyai-d82ce):

1. **Authentication** → Sign-in method → enable **Email/Password**.
2. **Firestore Database** → create a database (production mode is fine; the
   rules below lock it down).
3. **Storage** → set up a default bucket if one doesn't exist yet.
4. Deploy the security rules in this repo:

   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

   (requires the [Firebase CLI](https://firebase.google.com/docs/cli) and
   `firebase use stratifyai-d82ce` once, or pass `--project stratifyai-d82ce`).

## Data model (multi-tenant)

The app is multi-tenant: every fleet company is a separate `companies` doc,
and every operational record carries a `companyId` so one company's admin can
never see another's data. Enforced in `firestore.rules`/`storage.rules`, not
just in the UI.

- `companies/{companyId}` — `name`, `status` (`trial` | `active` | `inactive`),
  `tier`, contact info, `branches`.
- `users/{uid}` — `role` (`driver` | `admin` | `staff`), `companyId` (`null`
  only for `staff`), `name`, `email`, `idNumber`, `mobile`, `number`,
  `branch`, notification prefs.
- `invites/{inviteId}` — the only way an `admin`/`driver` account is ever
  created (see **Roles** below); the document ID is itself the invite link's
  token.
- `vehicles/{id}` — fleet vehicle, `companyId`, optionally linked to a driver
  via `driverUid`.
- `submissions/{id}` — one condition check: `companyId`, four photo URLs,
  optional damage report, `status` (`Awaiting Review` → `Reviewed` /
  `Declined`).
- `incidents/{id}` — ad-hoc incident reports from drivers, `companyId`.
- `demoRequests/{id}` — public leads from the landing page; staff-only, not
  scoped to any company (a prospect isn't a company yet).

## Roles

There is **no public self-serve signup** for any role — every account is
invite-provisioned:

- **`staff`** (Car Care's own team, `/console`) — provisioned by hand via the
  Firebase console or `scripts/migrate-multitenant.mjs`, never through the
  app. This is the one manual step; everything else below is in-app.
- **`admin`** (a fleet company's own team, `/admin`) — a `staff` member
  creates the company from **Console → Companies → Add company**, which also
  creates that company's first admin invite. Copy the generated link
  (`/accept-invite/{inviteId}`) and send it to the customer.
- **`driver`** (`/dashboard`) — an existing company `admin` invites one from
  **Team → Invite a driver**, the same link mechanism.

Whoever holds an invite link visits `/accept-invite/:inviteId`, sets a
password, and their account is created with exactly the role/company the
invite grants — enforced by `firestore.rules`, not the client.

An admin links a vehicle to an existing driver in their own company from
**Vehicles → Add vehicle** by entering the driver's email.

### Migrating existing data

`scripts/migrate-multitenant.mjs` backfills `companyId` onto a single
pre-existing (pre-multi-tenant) company's data and provisions the first
`staff` account. Read the comment at the top of that file before running it
— it uses the Firebase Admin SDK and must be run locally against a rehearsed
dataset first, never blind against production.
