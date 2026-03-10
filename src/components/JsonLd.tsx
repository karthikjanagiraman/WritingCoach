export function SoftwareApplicationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "WriteWhiz",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: "https://www.writewhiz.com",
    description:
      "AI-powered creative writing coach for children ages 7-15. Personalized lessons in narrative, persuasive, expository, and descriptive writing.",
    audience: {
      "@type": "EducationalAudience",
      educationalRole: "student",
      suggestedMinAge: 7,
      suggestedMaxAge: 15,
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "7.99",
      priceCurrency: "USD",
      offerCount: 3,
    },
    featureList: [
      "AI writing coach with personalized feedback",
      "Lessons for narrative, persuasive, expository, and descriptive writing",
      "Three-phase teaching: Learn, Practice Together, Write Independently",
      "Placement assessment to match child's skill level",
      "Writing streaks, badges, and celebrations",
      "Parent dashboard with progress tracking",
      "Supports ages 7-15 across three skill tiers",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function FAQPageJsonLd({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
