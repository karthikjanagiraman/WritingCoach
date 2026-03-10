import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
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
        Privacy Policy
      </h1>
      <p style={{ color: "#636e72", lineHeight: 1.7, marginBottom: 32 }}>
        Last updated: March 2026
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          1. Information We Collect
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8, marginBottom: 12 }}>
          We collect information you provide when creating an account (name,
          email address, password) and information about your children that you
          enter (name, age, interests). We also collect writing submissions,
          lesson progress, and usage data to personalize the learning experience.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          2. How We Use Your Information
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8, marginBottom: 12 }}>
          We use collected information to provide and improve the WriteWhiz
          service, personalize writing lessons for each child, generate progress
          reports, and communicate with you about your account. We do not sell
          personal information to third parties.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          3. Children&apos;s Privacy (COPPA)
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8, marginBottom: 12 }}>
          WriteWhiz is designed for children ages 7-15 and is operated with
          parental consent. Children do not create their own accounts — parents
          manage all child profiles. We comply with the Children&apos;s Online
          Privacy Protection Act (COPPA) and do not knowingly collect personal
          information from children without parental consent.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          4. AI and Data Processing
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8, marginBottom: 12 }}>
          Writing submissions are processed by AI models to provide personalized
          coaching and feedback. This data is used solely for the educational
          purpose of improving your child&apos;s writing skills. We do not use
          children&apos;s writing to train AI models.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          5. Data Security
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8, marginBottom: 12 }}>
          We implement appropriate security measures to protect personal
          information, including encrypted data transmission, secure password
          hashing, and access controls on our database systems.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
          6. Contact Us
        </h2>
        <p style={{ color: "#636e72", lineHeight: 1.8 }}>
          If you have questions about this privacy policy or your data, please
          contact us at{" "}
          <a
            href="mailto:privacy@writewhiz.com"
            style={{ color: "#6C5CE7", textDecoration: "none" }}
          >
            privacy@writewhiz.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
