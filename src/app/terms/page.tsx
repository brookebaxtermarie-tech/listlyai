import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Listly AI',
  description: 'Terms and conditions for using Listly AI.',
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

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-muted">Last updated: {LAST_UPDATED}</p>
        </div>

        <p className="text-sm text-muted leading-relaxed">
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Listly AI, operated by Brooke Baxter
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). By creating an account or using our service, you agree
          to these Terms. If you do not agree, do not use the service.
        </p>

        <Section title="1. What Listly AI is">
          <p>
            Listly AI is a web application that uses artificial intelligence to help secondhand resellers
            create product listings. You upload a photo of an item; our AI analyses it and generates
            structured listing content (title, description, condition, suggested price) formatted for
            multiple resale platforms.
          </p>
          <p>
            Listly AI is a tool to help you <strong className="text-ink">create</strong> listings. We do not
            post to any platform on your behalf (except where Direct Publish is explicitly offered and
            enabled). You are responsible for reviewing AI-generated content before posting it anywhere.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>You must be at least 16 years old to use Listly AI. By creating an account, you confirm you meet this requirement.</p>
        </Section>

        <Section title="3. Your account">
          <p>You are responsible for keeping your account credentials secure. Do not share your password. Notify us immediately at {CONTACT_EMAIL} if you suspect unauthorised access to your account.</p>
          <p>You may only create one account per person. Accounts used to circumvent plan limits or rate limiting may be suspended.</p>
        </Section>

        <Section title="4. Free plan">
          <p>
            We offer a free plan with the following limits: up to 10 AI listings per month, up to 3
            resale platforms per listing, and access to your 3 most recent listings. No payment information
            is required to use the free plan.
          </p>
          <p>We reserve the right to change free plan limits with reasonable notice.</p>
        </Section>

        <Section title="5. Paid plans — subscriptions and billing">
          <p>
            Pro (€8.99/month) and Power (€19/month) plans are available as monthly subscriptions, billed
            through Stripe. Prices are shown inclusive of any applicable taxes where required by law.
          </p>
          <p>
            <strong className="text-ink">Billing:</strong> Your subscription renews automatically on the same
            date each month. You authorise us to charge your payment method on each renewal date.
          </p>
          <p>
            <strong className="text-ink">Cancellation:</strong> You can cancel your subscription at any time
            from within Stripe&apos;s billing portal. Cancellation takes effect at the end of your current
            billing period — you retain access to paid features until then. We do not offer pro-rated
            refunds for partial months.
          </p>
          <p>
            <strong className="text-ink">Refunds:</strong> If you believe you were charged in error, contact
            us at {CONTACT_EMAIL} within 14 days and we will review your case. Under EU consumer law,
            you may have a right of withdrawal within 14 days of your first purchase, unless the service
            has already been provided — by starting to use the service immediately after purchase, you
            acknowledge this right may be limited.
          </p>
          <p>
            <strong className="text-ink">Coming soon features:</strong> The Power plan includes features
            that are still in development (Direct Publish to eBay and Allegro). These will be delivered
            when available. If they are not delivered within a reasonable timeframe, you are entitled to
            cancel with a refund for the portion of your subscription that was for those features.
          </p>
        </Section>

        <Section title="6. Your content and photos">
          <p>You retain ownership of all photos and content you upload to Listly AI. By uploading, you grant us a limited licence to process your photos using our AI pipeline for the purpose of generating listing content for you.</p>
          <p>You confirm that you own or have the right to use any photos you upload, and that the items in the photos are yours to sell.</p>
          <p>We do not sell or share your photos with third parties except as described in our Privacy Policy (specifically: sending to Anthropic for AI processing and storing via Supabase for your listing history).</p>
        </Section>

        <Section title="7. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc list-inside flex flex-col gap-1.5 pl-2">
            <li>Use Listly AI to create listings for counterfeit, illegal, or prohibited items</li>
            <li>Upload photos of items you do not own or have no right to sell</li>
            <li>Attempt to bypass rate limits or plan restrictions (e.g. by creating multiple accounts)</li>
            <li>Use Listly AI to automate bulk posting to any platform in violation of that platform&apos;s terms of service</li>
            <li>Reverse-engineer, scrape, or attempt to extract our AI prompts or system logic</li>
            <li>Use the service in any way that violates applicable law</li>
          </ul>
        </Section>

        <Section title="8. AI-generated content — important disclaimer">
          <p>
            Listly AI uses artificial intelligence to analyse photos and generate listing content.{' '}
            <strong className="text-ink">AI output is not guaranteed to be accurate.</strong> Brand
            identification, condition assessment, price suggestions, and descriptions may contain errors.
          </p>
          <p>You are solely responsible for reviewing AI-generated content before posting it on any platform. Do not post a listing that claims a brand or condition you have not personally verified.</p>
          <p>We are not liable for any losses arising from inaccurate AI output, including listing removals, buyer disputes, or platform penalties.</p>
        </Section>

        <Section title="9. Platform names and logos">
          <p>
            References to eBay, Vinted, Depop, Poshmark, Mercari, Leboncoin, Wallapop, Kleinanzeigen,
            and Allegro are for identification purposes only. All platform names and logos are property of
            their respective owners. Listly AI is not affiliated with, endorsed by, or officially connected
            to any of these platforms.
          </p>
        </Section>

        <Section title="10. Availability and changes">
          <p>We aim to keep Listly AI available at all times, but we do not guarantee uninterrupted access. The service may be unavailable for maintenance, updates, or reasons outside our control.</p>
          <p>We may modify, suspend, or discontinue features of the service. For paid subscribers, we will give reasonable advance notice of significant changes and will not remove core functionality without offering a refund or plan change.</p>
        </Section>

        <Section title="11. Termination">
          <p>You may delete your account at any time by contacting us at {CONTACT_EMAIL}. We will delete your data within 30 days.</p>
          <p>We may suspend or terminate accounts that violate these Terms. For paid subscribers, we will refund any unused prepaid subscription period on termination unless the termination is due to a ToS violation.</p>
        </Section>

        <Section title="12. Limitation of liability">
          <p>
            To the maximum extent permitted by law, Listly AI&apos;s total liability to you for any claim
            arising from use of the service is limited to the amount you paid us in the 3 months preceding
            the claim (or €10 if you are on the free plan).
          </p>
          <p>We are not liable for indirect, incidental, or consequential losses, including lost profits, lost sales on resale platforms, or data loss.</p>
          <p>Nothing in these Terms limits liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded under applicable law.</p>
        </Section>

        <Section title="13. Governing law">
          <p>These Terms are governed by the laws of Belgium. Any disputes will be subject to the exclusive jurisdiction of the courts of Belgium, without prejudice to your rights as a consumer under the law of your country of residence.</p>
        </Section>

        <Section title="14. Changes to these Terms">
          <p>We may update these Terms from time to time. We will notify you of significant changes by email with at least 14 days&apos; notice. Continued use of the service after that notice period constitutes acceptance of the new Terms.</p>
        </Section>

        <Section title="15. Contact">
          <p>
            For any questions about these Terms, email:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <div className="border-t border-line pt-6 flex gap-6 text-sm text-muted">
          <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-ink transition-colors">Back to Listly AI</Link>
        </div>
      </main>
    </div>
  )
}
