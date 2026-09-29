import type { Metadata } from "next";
import { LegalPage } from "@/frontend/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Chatlyzer",
  description: "How Chatlyzer collects, uses, stores, and protects account and conversation data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy protocol"
      title="Privacy Policy"
      summary="This policy explains what Chatlyzer processes when you sign in, import a conversation, request an AI analysis, or purchase credits, and the controls available to you."
      sections={[
        {
          title: "Data we collect",
          content: (
            <>
              <p><strong>Account data.</strong> Google Sign-In provides your Google account identifier, name, email address, and profile image. Chatlyzer uses this information to create and secure your account. We never receive your Google password.</p>
              <p><strong>Conversation data.</strong> When you import or paste a chat, we process its title, participants, message content, and timestamps. Standard mode stores the imported chat and resulting analyses. Privacy mode stores the analysis but not the raw messages. Ghost mode stores neither the raw messages nor the analysis after returning the result to you.</p>
              <p><strong>Service data.</strong> We process credit balances, purchase identifiers, sessions, device identifiers, request logs, and basic diagnostic information needed to operate, secure, and troubleshoot the service.</p>
            </>
          ),
        },
        {
          title: "How we use data",
          content: (
            <ul>
              <li>Authenticate you and maintain secure web and mobile sessions.</li>
              <li>Run the analysis you request and display saved results.</li>
              <li>Track credits, prevent duplicate grants, and reconcile purchases.</li>
              <li>Prevent abuse, enforce rate limits, investigate errors, and protect the service.</li>
              <li>Respond to support requests and comply with applicable legal obligations.</li>
            </ul>
          ),
        },
        {
          title: "Service providers",
          content: (
            <p>Chatlyzer sends only the data needed for each function to its providers: Google for authentication, OpenAI for requested conversation analysis, RevenueCat and its configured payment processor for purchases, Neon for managed PostgreSQL storage, and Deno Deploy for application hosting. Optional product analytics may be processed by PostHog when enabled. Each provider handles data under its own terms and privacy policy.</p>
          ),
        },
        {
          title: "Google user data",
          content: (
            <p>Google profile information is used only for sign-in, account display, and account security. Chatlyzer does not sell Google user data, use it for advertising, or transfer it for unrelated purposes. Its use and transfer of information received from Google APIs follows the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
          ),
        },
        {
          title: "Retention and deletion",
          content: (
            <p>Standard account and chat data remains until you delete a chat or your account, except where a limited record must be retained for security, fraud prevention, transaction reconciliation, or legal compliance. Privacy and ghost modes follow the storage behavior described above. You can delete chats in the app and permanently delete your account from the account deletion page.</p>
          ),
        },
        {
          title: "Security and choices",
          content: (
            <p>Chatlyzer uses encrypted HTTPS connections, signed sessions, access controls, and database safeguards. No system can guarantee absolute security. You can choose privacy or ghost mode before analysis, sign out active sessions, delete saved chats, and delete your account. Avoid importing information you do not have permission to process.</p>
          ),
        },
        {
          title: "Contact and changes",
          content: (
            <p>For privacy questions or deletion help, email <a href="mailto:info@chatlyzerai.com">info@chatlyzerai.com</a> or use the <a href="/contact">contact page</a>. We may update this policy as the service changes. Material updates will be reflected by a new effective date on this page.</p>
          ),
        },
      ]}
    />
  );
}
