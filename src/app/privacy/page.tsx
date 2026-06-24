import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Listly AI',
  description: 'How Listly AI collects, uses, and protects your personal data.',
}

const CONTACT_EMAIL = 'listlyai.contact@gmail.com'
const LAST_UPDATED = '24 June 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="flex flex-col gap-2 text-muted text-sm leading-relaxed">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-page" style={{ fontFamily: 'var(--font-sans)' }}>
      <nav className="border-b border-line bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-ink tracking-tight"
            style={{ fontFamily: 'var(--font-header)' }}
          >
            Listly AI
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-ink transition-colors">
            ← Back
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-ink" style={{ fontFamily: 'var(--font-header)' }}>
            Privacy Policy
          </h1>
          <p className="text-sm text-muted">Last updated: {LAST_UPDATED}</p>
        </div>

        <p className="text-sm text-muted leading-relaxed">
          This Privacy Policy explains how Listly AI (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects,
          uses, and protects your personal data when you use our service at listlyai-photo.vercel.app.
          We are subject to the General Data Protection Regulation (GDPR) as we operate from Belgium and
          serve users in the European Union.
        </p>

        <Section title="1. Who we are">
          <p>
            Listly AI is operated by Brooke Baxter, based in Belgium. We are the data controller for the
            personal data described in this policy. If you have any questions, contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>.
          </p>
          <p>
            We will update this policy with a registered company name and number once our legal entity is
            established.
          </p>
        </Section>

        <Section title="2. What data we collect">
          <p><strong className="text-ink">Account data:</strong> When you sign up, we collect your email address and a hashed password. We never store your password in plain text.</p>
          <p><strong className="text-ink">Photos you upload:</strong> When you use the listing feature, you upload photos of items. These photos are processed by our AI provider (Anthropic, see Section 5) and stored in our database to power your listing history.</p>
          <p><strong className="text-ink">Usage data:</strong> We record how many listings you create per day and per hour in order to enforce your plan limits. We store timestamps of API calls for rate limiting purposes.</p>
          <p><strong className="text-ink">Listing data:</strong> The AI-extracted listing information (brand, condition, descriptions, etc.) is saved to your account so you can access your history and re-list items.</p>
          <p><strong className="text-ink">Payment data:</strong> If you upgrade to a paid plan, payment is handled directly by Stripe. We do not receive or store your card number. We receive confirmation of your subscription status from Stripe.</p>
          <p><strong className="text-ink">Browser storage:</strong> We use your browser&apos;s localStorage and sessionStorage to store your current session state (selected platforms, listing in progress, sidebar preferences). This data stays on your device and is not transmitted to our servers.</p>
        </Section>

        <Section title="3. Why we process your data (lawful basis)">
          <p><strong className="text-ink">To provide the service (contract):</strong> Your email, photos, and listing data are processed because they are necessary to deliver the service you signed up for.</p>
          <p><strong className="text-ink">Legitimate interests:</strong> Usage data (rate limiting, daily counters) is processed to protect the service from abuse and to enforce fair use limits.</p>
          <p><strong className="text-ink">Legal obligation:</strong> We may retain certain records if required by applicable law.</p>
        </Section>

        <Section title="4. How long we keep your data">
          <p>Your account data and listings are kept for as long as your account is active. If you delete your account, we delete your personal data within 30 days.</p>
          <p>Hourly rate-limit log entries are automatically deleted after 25 hours. Daily usage counters are kept for up to 90 days for billing and support purposes.</p>
          <p>Stripe retains payment records for its own legal and regulatory purposes, independently of us.</p>
        </Section>

        <Section title="5. Who we share your data with">
          <p>We do not sell your data. We share data only with the following service providers, who process it on our behalf:</p>
          <ul className="list-disc list-inside flex flex-col gap-1.5 pl-2">
            <li>
              <strong className="text-ink">Anthropic</strong> — your uploaded photos and prompts are sent to Anthropic&apos;s Claude API for AI-powered listing extraction. Anthropic may retain inputs and outputs for up to 30 days for safety purposes, after which they are deleted. Anthropic does not use your inputs to train their models. See Anthropic&apos;s privacy policy at anthropic.com/privacy.
            </li>
            <li>
              <strong className="text-ink">Supabase</strong> — our database and file storage provider. Your account data, listing data, and uploaded images are stored on Supabase infrastructure (hosted on AWS in the EU where possible). See supabase.com/privacy.
            </li>
            <li>
              <strong className="text-ink">Stripe</strong> — payment processing for Pro and Power plan subscriptions. See stripe.com/privacy.
            </li>
            <li>
              <strong className="text-ink">Vercel</strong> — our hosting provider. Request logs may be retained by Vercel for a limited period. See vercel.com/legal/privacy-policy.
            </li>
          </ul>
          <p>All providers are contractually required to process your data only as instructed by us and to maintain appropriate security measures.</p>
        </Section>

        <Section title="6. Your rights under GDPR">
          <p>If you are in the European Economic Area or UK, you have the following rights:</p>
          <ul className="list-disc list-inside flex flex-col gap-1.5 pl-2">
            <li><strong className="text-ink">Access:</strong> request a copy of the personal data we hold about you</li>
            <li><strong className="text-ink">Rectification:</strong> ask us to correct inaccurate data</li>
            <li><strong className="text-ink">Erasure:</strong> ask us to delete your personal data (&ldquo;right to be forgotten&rdquo;)</li>
            <li><strong className="text-ink">Portability:</strong> receive your data in a structured, machine-readable format</li>
            <li><strong className="text-ink">Restriction:</strong> ask us to pause processing of your data in certain circumstances</li>
            <li><strong className="text-ink">Objection:</strong> object to processing based on legitimate interests</li>
          </ul>
          <p>
            To exercise any of these rights, email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>. We will respond within 30 days.
          </p>
          <p>
            You also have the right to lodge a complaint with the Belgian data protection authority:{' '}
            <strong className="text-ink">Autorité de protection des données (APD)</strong>, gegevensbeschermingsautoriteit.be.
          </p>
        </Section>

        <Section title="7. Data security">
          <p>We use industry-standard security measures: HTTPS everywhere, hashed passwords, row-level security on our database (so users can only access their own data), and authentication checks on every API route. No system is perfectly secure, but we take reasonable precautions.</p>
        </Section>

        <Section title="8. Children">
          <p>Listly AI is not directed at children under 16. We do not knowingly collect personal data from anyone under 16. If you believe a child has provided us with personal data, contact us and we will delete it promptly.</p>
        </Section>

        <Section title="9. Changes to this policy">
          <p>We may update this policy from time to time. When we make significant changes, we will update the &ldquo;Last updated&rdquo; date at the top and notify active users by email where required by law.</p>
        </Section>

        <Section title="10. Contact">
          <p>
            For any privacy questions or data requests, email:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <div className="border-t border-line pt-6 flex gap-6 text-sm text-muted">
          <Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-ink transition-colors">Back to Listly AI</Link>
        </div>
      </main>
    </div>
  )
}
