import { LegalLayout } from './LegalLayout';

export function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="3 September 2026">
      <p>
        These terms govern your use of FleetCare, a monthly vehicle condition check and incident reporting
        platform. By creating an account or using the app, you agree to these terms.
      </p>

      <h2>1. What FleetCare is</h2>
      <p>
        FleetCare lets drivers submit monthly photo condition checks and incident reports for a vehicle
        assigned to them by a rental or lease company, and lets that company's fleet team review, approve, or
        decline those submissions with feedback.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must provide accurate registration information, including a valid SA ID number, to be linked to the correct vehicle.</li>
        <li>One account per driver. You're responsible for keeping your login credentials confidential and for all activity on your account.</li>
        <li>You must be the person actually operating the assigned vehicle.</li>
      </ul>

      <h2>3. Submitting condition checks</h2>
      <ul>
        <li>Photos must be taken live through the app's camera at the time of submission; uploading photos from your gallery is not supported, by design, so that submissions reflect the vehicle's real, current condition.</li>
        <li>You must submit an honest and complete account of any new damage. Knowingly submitting false or misleading information may be reported to your fleet company and could affect your lease/rental agreement.</li>
      </ul>

      <h2>4. Review process</h2>
      <ul>
        <li>Submissions are reviewed by your fleet company's administrators, not by FleetCare. Approval or decline decisions, and any consequences of a decline (e.g. required resubmission), are between you and your fleet company.</li>
        <li>FleetCare provides the platform; we do not arbitrate disputes about a vehicle's condition, fault, or contractual consequences between you and your fleet company.</li>
      </ul>

      <h2>5. Fleet administrators</h2>
      <ul>
        <li>Administrators may only access data for vehicles and drivers within their own company's fleet.</li>
        <li>Administrators are responsible for reviewing submissions in good faith and providing accurate, specific decline reasons where applicable.</li>
      </ul>

      <h2>6. Acceptable use</h2>
      <p>
        You agree not to: share your account with others, attempt to submit photos of a different vehicle than
        the one assigned to you, interfere with the app's operation, or attempt to access another user's data.
      </p>

      <h2>7. Availability</h2>
      <p>
        We aim to keep FleetCare available at all times but do not guarantee uninterrupted access. We are not
        liable for consequences arising from temporary unavailability (e.g. a missed check deadline caused
        by an outage).
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        FleetCare is a record keeping and review workflow tool. To the maximum extent permitted by law,
        FleetCare is not liable for decisions made by your fleet company based on submissions recorded through the
        platform, for vehicle damage itself, or for indirect or consequential losses arising from use of the
        app.
      </p>

      <h2>9. Termination</h2>
      <p>
        Your account may be suspended or terminated if you breach these terms, or when your lease/rental
        relationship with your fleet company ends. Your fleet company may also request removal of your access.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Continued use of the app after an update means you
        accept the revised terms.
      </p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of the Republic of South Africa.</p>

      <h2>12. Contact us</h2>
      <p><strong>legal@fleetcare.co.za</strong></p>
    </LegalLayout>
  );
}
