import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "80px 24px",
        fontFamily: "'Nunito', sans-serif",
        color: "#2D3436",
      }}
    >
      <Link
        href="/"
        style={{
          color: "#6C5CE7",
          fontWeight: 600,
          display: "inline-block",
          marginBottom: 32,
          textDecoration: "none",
        }}
      >
        &larr; Back to WriteWhiz
      </Link>
      <h1
        style={{
          fontSize: 36,
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        Terms of Service
      </h1>
      <p style={{ color: "#636e72", lineHeight: 1.7, marginBottom: 32 }}>
        Last updated: March 2026
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          1. Acceptance of Terms
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8, marginBottom: 12 }}>
          By accessing or using WriteWhiz, you agree to be bound by these Terms
          of Service. If you are a parent or guardian creating an account for
          your child, you accept these terms on behalf of your child.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          2. Service Description
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8, marginBottom: 12 }}>
          WriteWhiz is an AI-powered writing coach for children ages 7-15. The
          service provides personalized writing lessons, AI-generated feedback,
          progress tracking, and curriculum management. The AI coach is designed
          to teach and guide — it never writes or completes work for students.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          3. User Accounts
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8, marginBottom: 12 }}>
          Parents or guardians must create an account to use WriteWhiz. You are
          responsible for maintaining the security of your account credentials.
          Child profiles are managed by the parent account and do not have
          independent login access.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          4. Content Ownership
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8, marginBottom: 12 }}>
          All writing produced by your child through WriteWhiz remains the
          intellectual property of your child and family. We retain a limited
          license to process and store this content solely for the purpose of
          providing the educational service.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          5. Acceptable Use
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8, marginBottom: 12 }}>
          You agree to use WriteWhiz only for its intended educational purpose.
          You may not attempt to circumvent security measures, reverse-engineer
          the AI system, or use the service for any unlawful purpose.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          6. Subscription and Billing
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8, marginBottom: 12 }}>
          WriteWhiz offers free and paid subscription plans. Paid subscriptions
          are billed monthly or annually. You may cancel your subscription at
          any time, and your access will continue until the end of the current
          billing period.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          7. Contact
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8 }}>
          For questions about these terms, please contact us at{" "}
          <a
            href="mailto:support@writewhiz.com"
            style={{ color: "#6C5CE7", textDecoration: "none" }}
          >
            support@writewhiz.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
