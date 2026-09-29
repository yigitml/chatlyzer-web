import type { Metadata } from "next";
import { LegalPage } from "@/frontend/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | Chatlyzer",
  description: "The terms that govern use of Chatlyzer.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Service contract"
      title="Terms of Service"
      summary="These terms govern your access to Chatlyzer. By using the service, you agree to these terms and the Privacy Policy."
      sections={[
        {
          title: "Eligibility and accounts",
          content: (
            <p>You must be legally able to enter into this agreement and must provide accurate account information. You are responsible for activity under your account and for keeping access to your Google account and devices secure. Contact us promptly if you believe your account has been compromised.</p>
          ),
        },
        {
          title: "Permitted use",
          content: (
            <p>You may use Chatlyzer to analyze conversations you own or are authorized to process. You must not upload unlawful content, violate another person&apos;s privacy or intellectual-property rights, probe or disrupt the service, evade rate limits, automate abusive traffic, reverse engineer protected components, or use results to harass, discriminate against, or harm another person.</p>
          ),
        },
        {
          title: "AI results",
          content: (
            <p>Chatlyzer generates probabilistic interpretations that may be inaccurate, incomplete, or biased. Results are for informational and entertainment purposes and are not medical, legal, mental-health, financial, or safety advice. Do not use them as the sole basis for important decisions about another person or relationship.</p>
          ),
        },
        {
          title: "Credits and purchases",
          content: (
            <p>Analyses consume the number of credits shown in the app. Purchased credits are applied after the payment provider confirms the transaction. Except where required by law or stated at checkout, completed credit purchases are non-refundable. Failed analyses may be automatically refunded in credits. Payment processing is handled by RevenueCat and its configured payment processor under their applicable terms.</p>
          ),
        },
        {
          title: "Your content",
          content: (
            <p>You retain your rights in content you submit. You grant Chatlyzer a limited license to host, process, transmit, and transform that content only as needed to provide, secure, and improve the requested service. You represent that you have the necessary rights and permissions to submit it.</p>
          ),
        },
        {
          title: "Availability and changes",
          content: (
            <p>We may change, suspend, or discontinue features and may limit access to protect users or the service. We aim for reliable operation but do not guarantee uninterrupted availability. Free hosting and third-party services may impose quotas, maintenance windows, or outages outside our control.</p>
          ),
        },
        {
          title: "Disclaimer and liability",
          content: (
            <p>The service is provided “as is” and “as available” to the extent permitted by law. We disclaim implied warranties of merchantability, fitness for a particular purpose, and non-infringement. To the extent permitted by law, Chatlyzer will not be liable for indirect, incidental, special, consequential, or punitive damages arising from use of the service.</p>
          ),
        },
        {
          title: "Termination and contact",
          content: (
            <p>You may stop using Chatlyzer and delete your account at any time. We may suspend or terminate access for material violations, abuse, security risk, or legal requirements. Questions about these terms can be sent to <a href="mailto:info@chatlyzerai.com">info@chatlyzerai.com</a> or through the <a href="/contact">contact page</a>.</p>
          ),
        },
      ]}
    />
  );
}
