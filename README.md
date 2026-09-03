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

## Data model

- `users/{uid}` — `role` (`customer` | `admin`), `name`, `email`, `idNumber`,
  `mobile`, `number`, `branch`, notification prefs.
- `vehicles/{id}` — fleet vehicle, optionally linked to a driver via
  `driverUid`.
- `submissions/{id}` — one condition check: four photo URLs, optional damage
  report, `status` (`Awaiting Review` → `Reviewed` / `Follow-up Required`).
- `incidents/{id}` — ad-hoc incident reports from drivers.

## Roles

Every account created through **Sign up** is a `customer`. There is no
self-serve path to the `admin` role — that's enforced in `firestore.rules`,
not just in the UI. To make someone an admin:

1. Have them sign up normally (or create the user in the Firebase console).
2. In the Firestore console, open their `users/{uid}` document and set
   `role` to `admin`.

An admin links a vehicle to a driver from **Vehicles → Add vehicle** by
entering the driver's email — the driver must already have an account.
