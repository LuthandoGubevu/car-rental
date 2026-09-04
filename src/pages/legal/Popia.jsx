import { LegalLayout } from './LegalLayout';

export function Popia() {
  return (
    <LegalLayout title="POPIA Compliance" updated="3 September 2026">
      <p>
        FleetCare is committed to protecting your personal information in line with the Protection of Personal
        Information Act, 2013 (POPIA).
      </p>

      <h2>Responsible party</h2>
      <p>FleetCare (Pty) Ltd, South Africa.</p>

      <h2>What we process</h2>
      <p>
        Driver identity details (name, ID number, contact details), vehicle condition photos, and incident
        reports; see our full <a href="/privacy">Privacy Policy</a> for detail.
      </p>

      <h2>Lawful basis</h2>
      <p>
        Processing is necessary to perform our contract with your fleet company and to pursue our legitimate
        interest in enabling accurate, disputable vehicle condition records.
      </p>

      <h2>Minimal collection</h2>
      <p>
        We only collect what's needed to identify you, link you to your vehicle, and record condition checks,
        with no location tracking and no marketing profiling.
      </p>

      <h2>Your rights</h2>
      <p>
        Access, correction, and deletion requests (subject to lease related retention needs) can be sent to{' '}
        <strong>privacy@fleetcare.co.za</strong>.
      </p>

      <h2>Regulator</h2>
      <p>
        If you're unsatisfied with our response, you may contact the Information Regulator of South Africa at{' '}
        <strong>enquiries@inforegulator.org.za</strong> or <strong>www.justice.gov.za/inforeg</strong>.
      </p>

      <h2>Information Officer</h2>
      <p><strong>privacy@fleetcare.co.za</strong></p>
    </LegalLayout>
  );
}
