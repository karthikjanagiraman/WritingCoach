"use client";

interface AssessmentIntroProps {
  onComplete: () => void;
}

export function AssessmentIntro({ onComplete }: AssessmentIntroProps) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: "#FFFFFF",
        padding: 32,
        zIndex: 100,
        animation: "fadeIn 0.4s ease-out",
      }}
    >
      {/* Visually hidden h1 for accessibility */}
      <h1 className="sr-only">Writing Assessment</h1>

      <div style={{ maxWidth: 480, textAlign: "center" }}>
        {/* Title label */}
        <p
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "#94A3B8",
            marginBottom: 24,
          }}
        >
          WRITING ASSESSMENT
        </p>

        {/* Body text */}
        <p
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 15,
            fontWeight: 400,
            lineHeight: 1.8,
            color: "#334155",
            textAlign: "left",
            marginBottom: 8,
          }}
        >
          This short assessment has 3 sections. Each one asks you to write a
          different type of piece:
        </p>

        {/* Numbered list */}
        <ol
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 2,
            color: "#334155",
            paddingLeft: 8,
            margin: "16px 0",
            listStyle: "none",
            textAlign: "left",
          }}
        >
          <li>
            <span style={{ fontWeight: 600, color: "#0984E3" }}>1.</span>{" "}
            Narrative{" "}
            <span style={{ fontWeight: 400, color: "#64748B" }}>
              — tell a story
            </span>
          </li>
          <li>
            <span style={{ fontWeight: 600, color: "#0984E3" }}>2.</span>{" "}
            Descriptive{" "}
            <span style={{ fontWeight: 400, color: "#64748B" }}>
              — paint a picture with words
            </span>
          </li>
          <li>
            <span style={{ fontWeight: 600, color: "#0984E3" }}>3.</span>{" "}
            Persuasive{" "}
            <span style={{ fontWeight: 400, color: "#64748B" }}>
              — make an argument
            </span>
          </li>
        </ol>

        {/* Reassurance text */}
        <p
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.8,
            color: "#64748B",
            textAlign: "left",
            marginTop: 16,
          }}
        >
          There are no right or wrong answers. Write naturally and show us your
          voice. This helps us build a curriculum that matches your level.
        </p>

        {/* Time estimate */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 24,
            fontFamily: "'Sora', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: "#94A3B8",
          }}
          aria-label="Estimated time: about 15 to 20 minutes"
        >
          {/* Clock icon */}
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          About 15-20 minutes
        </div>

        {/* Begin button */}
        <div style={{ marginTop: 32 }}>
          <button
            onClick={onComplete}
            style={{
              padding: "14px 40px",
              borderRadius: 8,
              background: "#2D3436",
              color: "#FFFFFF",
              fontFamily: "'Sora', sans-serif",
              fontSize: 15,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              transition: "background 0.2s, transform 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#3D4E50";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2D3436";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Begin Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
