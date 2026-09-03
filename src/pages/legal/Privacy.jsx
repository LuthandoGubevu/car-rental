import { LegalLayout } from './LegalLayout';

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="3 September 2026">
      <p>
        Car Care ("we", "us", "our") provides a monthly vehicle condition-check platform used by rental and
        lease fleet companies and their drivers. This policy explains what personal information we collect,
        why, and what rights you have over it under South Africa's Protection of Personal Information Act
        (POPIA).
      </p>

      <h2>1. Who this applies to</h2>
      <p>
        This policy covers drivers/customers who use the Car Care app, and fleet administrators who manage
        vehicles and reviews on it.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li><strong>Account information</strong> — name, surname, SA ID number, mobile number, email address, branch, and customer/contract number (drivers); name and email (admins).</li>
        <li><strong>Vehicle condition data</strong> — photos taken directly through the app's camera at each monthly check, damage descriptions, and timestamps.</li>
        <li><strong>Incident reports</strong> — type, date, and description of any accident, breakdown, theft, or damage you report.</li>
        <li><strong>Usage data</strong> — login timestamps and basic device/browser information needed to operate the app securely.</li>
      </ul>
      <p>
        We do not collect payment information, location tracking, or any data beyond what's needed to run the
        condition-check and incident-reporting service.
      </p>

      <h2>3. Why we collect it</h2>
      <ul>
        <li>To verify your identity and link you to the correct leased/rented vehicle.</li>
        <li>To let your fleet team review and act on monthly condition checks and incident reports.</li>
        <li>To maintain a verifiable, time-stamped record that protects both drivers and fleet operators in disputes about vehicle condition.</li>
        <li>To notify you (email/SMS, per your preferences) when a check is due or a submission has been reviewed.</li>
      </ul>

      <h2>4. Who can see your information</h2>
      <ul>
        <li>Your fleet company's administrators can see your submissions, vehicle details, and incident reports — that's the purpose of the service.</li>
        <li>Car Care staff may access data only to provide support or maintain the platform, never to sell or share it with third parties for marketing.</li>
        <li>We do not sell personal information to anyone.</li>
      </ul>

      <h2>5. Where your information is stored</h2>
      <p>
        Data is stored using Google Firebase/Firestore infrastructure, with industry-standard encryption in
        transit and at rest. Photos are stored in Firebase Cloud Storage under access-controlled rules — only
        you and your fleet's administrators can view them.
      </p>

      <h2>6. How long we keep it</h2>
      <p>
        We retain condition-check and incident records for the duration of your active lease/rental
        relationship, after which they are deleted or anonymised on request, subject to any longer retention
        period your fleet operator's own contract with you requires.
      </p>

      <h2>7. Your rights under POPIA</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Request a copy of the personal information we hold about you.</li>
        <li>Request correction of inaccurate information.</li>
        <li>Request deletion of your information, subject to our legal/contractual obligation to retain condition-check records during an active lease.</li>
        <li>Object to processing or lodge a complaint with the Information Regulator of South Africa (enquiries@inforegulator.org.za) if you believe your information has been mishandled.</li>
      </ul>
      <p>To exercise any of these rights, contact us at <strong>privacy@carcare.co.za</strong>.</p>

      <h2>8. Security</h2>
      <p>
        We use role-based access control so drivers can only see their own vehicle and submissions, and
        admins only see their own fleet's data. Passwords are never stored in plain text.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We'll update the "last updated" date above whenever this policy changes, and notify active users of
        material changes.
      </p>

      <h2>10. Contact us</h2>
      <p>Questions about this policy: <strong>privacy@carcare.co.za</strong></p>
    </LegalLayout>
  );
}
