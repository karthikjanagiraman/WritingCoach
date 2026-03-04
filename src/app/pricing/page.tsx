"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PricingTable from "@/components/PricingTable";

const FAQ = [
  {
    q: "What happens during the free trial?",
    a: "You get 7 days to explore WriteWise Kids with up to 2 children and 2 complete lessons. Placement assessments are always free. No credit card required to start.",
  },
  {
    q: "Can I switch plans later?",
    a: "Absolutely! You can upgrade from Family to Family Plus anytime. Your children's progress, scores, and writing portfolio are always preserved.",
  },
  {
    q: "What's included in every plan?",
    a: "All plans include unlimited lessons, AI-powered writing coaching, detailed progress reports, skill tracking, achievement badges, and personalized curricula. There are no feature restrictions — the only difference is how many children you can add.",
  },
  {
    q: "How does cancellation work?",
    a: "Cancel anytime from your account settings. You'll keep access through the end of your billing period. Your child's writing portfolio and progress data are preserved even after cancellation.",
  },
  {
    q: "Is there a refund policy?",
    a: "If you're not satisfied within the first 30 days of your paid subscription, contact us for a full refund. No questions asked.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#FFF9F0]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-[#FF6B6B]/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm font-semibold text-[#2D3436]/60 hover:text-[#2D3436] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#128218;</span>
            <span className="text-lg font-extrabold text-[#FF6B6B]">WriteWise Kids</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <section className="text-center py-12 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2D3436] mb-3">
            One subscription. Every writing adventure.
          </h1>
          <p className="text-lg text-[#2D3436]/50 max-w-lg mx-auto">
            No per-lesson charges. No hidden fees. Just unlimited creative writing for your family.
          </p>
        </section>

        {/* Pricing Cards */}
        <section className="animate-fade-in stagger-1">
          <PricingTable />
        </section>

        {/* FAQ */}
        <section className="py-16 animate-fade-in stagger-2">
          <h2 className="text-2xl font-extrabold text-[#2D3436] text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#2D3436]/5 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between"
                >
                  <span className="text-sm font-bold text-[#2D3436] pr-4">{item.q}</span>
                  <svg
                    className={`w-5 h-5 text-[#2D3436]/30 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-[#2D3436]/60 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
