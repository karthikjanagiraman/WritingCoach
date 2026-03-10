import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  isEmailConfigured,
  buildLessonReportHtml,
  generateParentReport,
  sendLessonCompleteEmail,
  type LessonReportEmailData,
} from "@/lib/email";
import type { Message, PhaseState } from "@/types";

// Sample conversation history for testing LLM report generation
const SAMPLE_CONVERSATION: Message[] = [
  {
    id: "1",
    role: "coach",
    content:
      "Hi Maya! Today we're going to learn about building vivid settings in stories. A setting is where and when your story takes place. Let's start by looking at how great authors bring their settings to life. Ready?",
    timestamp: "2026-02-25T10:00:00Z",
  },
  {
    id: "2",
    role: "student",
    content: "Yes! I love writing stories about magical places.",
    timestamp: "2026-02-25T10:00:30Z",
  },
  {
    id: "3",
    role: "coach",
    content:
      'Great! One of the most powerful tools for creating vivid settings is using your five senses. Instead of just telling the reader "the forest was pretty," you can SHOW them by describing what you see, hear, smell, touch, and taste. For example: "The ancient oak trees stretched their gnarled branches toward a sky streaked with orange and pink. A cool breeze carried the sweet scent of pine needles and damp earth." See how that paints a picture?',
    timestamp: "2026-02-25T10:01:00Z",
  },
  {
    id: "4",
    role: "student",
    content: "Oh I see! So you describe what the character can feel and smell, not just what they see?",
    timestamp: "2026-02-25T10:01:30Z",
  },
  {
    id: "5",
    role: "coach",
    content:
      "Exactly! You've got it. Now let me check — can you tell me what the five senses are that we can use to describe a setting?",
    timestamp: "2026-02-25T10:02:00Z",
  },
  {
    id: "6",
    role: "student",
    content: "Sight, hearing, smell, touch, and taste!",
    timestamp: "2026-02-25T10:02:20Z",
  },
  {
    id: "7",
    role: "coach",
    content:
      "Perfect! Now let's practice together. Stage 1: I want you to write just 2-3 sentences describing a beach using at least TWO different senses. Focus on making me feel like I'm there.",
    timestamp: "2026-02-25T10:03:00Z",
  },
  {
    id: "8",
    role: "student",
    content:
      "The waves crashed on the rocks and the sand was warm under my feet. I could smell the salty air.",
    timestamp: "2026-02-25T10:04:00Z",
  },
  {
    id: "9",
    role: "coach",
    content:
      'Nice work! You used hearing ("waves crashed"), touch ("sand was warm"), and smell ("salty air") — three senses in just two sentences! Let\'s try something harder. Stage 2: Now write 3-4 sentences about a magical forest. This time, try to use figurative language too — like a simile or metaphor. For example, instead of "the trees were tall," you could say "the trees stood like ancient guardians."',
    timestamp: "2026-02-25T10:04:30Z",
  },
  {
    id: "10",
    role: "student",
    content:
      "The forest was filled with trees that touched the sky like giant green fingers. Tiny golden lights danced between the branches like fireflies having a party. The air smelled like rain and old books. Under my feet, the moss was soft as a pillow.",
    timestamp: "2026-02-25T10:06:00Z",
  },
  {
    id: "11",
    role: "coach",
    content:
      "Wow, Maya! That's beautiful writing! I especially love \"like giant green fingers\" and \"like fireflies having a party\" — those are creative and original similes. And \"smelled like rain and old books\" is such a specific, interesting detail. You're ready for your assessment. Remember — this time you're writing on your own!",
    timestamp: "2026-02-25T10:06:30Z",
  },
];

const SAMPLE_PHASE_STATE: PhaseState = {
  instructionCompleted: true,
  comprehensionCheckPassed: true,
  phase1Step: 3,
  guidedStage: 3,
  guidedAttempts: 2,
  hintsGiven: 0,
  guidedComplete: true,
};

const SAMPLE_SUBMISSION = `Once upon a time there was a magical forest where the sunlight danced through the leaves like tiny golden fairies. The trees were so tall they seemed to whisper secrets to the clouds.

I walked along a path covered in soft green moss that felt like walking on a fluffy carpet. The air smelled sweet, like honey mixed with flowers, and I could hear birds singing a beautiful song above me.

Suddenly I found a clearing with a sparkling pond. The water was so clear I could see colorful fish swimming in circles. A frog sat on a lily pad, croaking like it was trying to tell me something important. The whole place felt magical and peaceful, like a secret world nobody else knew about.`;

const SAMPLE_DATA: LessonReportEmailData = {
  parentName: "Karthik",
  parentEmail: "karthikjanagiraman@gmail.com",
  childName: "Maya",
  childId: "sample-child-id",
  lessonTitle: "Building Vivid Settings",
  lessonType: "Narrative",
  wordCount: 147,
  scores: {
    story_structure: 3.5,
    character_development: 2.8,
    setting_description: 3.2,
    voice_style: 2.5,
  },
  overallScore: 3.0,
  feedback: {
    strength:
      'Maya did a wonderful job bringing her forest setting to life! Her description of "the sunlight dancing through the leaves like tiny golden fairies" showed real creativity and strong use of figurative language.',
    growth:
      "To make the story even stronger, Maya could add more details about how the setting makes her character feel. For example, instead of just describing what the forest looks like, she could show how the sounds and smells affect her character's mood.",
    encouragement:
      "Maya is becoming a confident storyteller! Her imagination really shines through her writing, and with practice on connecting settings to character emotions, her stories will be even more immersive. Keep up the great work!",
  },
  skills: [
    { category: "narrative", displayName: "Narrative Writing", level: "DEVELOPING", score: 2.6 },
    { category: "persuasive", displayName: "Persuasive Writing", level: "EMERGING", score: 1.2 },
    { category: "expository", displayName: "Expository Writing", level: "EMERGING", score: 0.8 },
    { category: "descriptive", displayName: "Descriptive Writing", level: "DEVELOPING", score: 2.1 },
  ],
  streak: { current: 4, weeklyGoal: 3, weeklyCompleted: 2 },
  totalLessons: 7,
  curriculum: {
    currentWeek: 3,
    totalWeeks: 8,
    currentTheme: "Bringing Stories to Life with Vivid Details",
  },
  newBadges: [
    { name: "Bookworm", emoji: "\u{1F4DA}", description: "Complete 5 lessons" },
  ],
  // New fields for LLM generation
  conversationHistory: SAMPLE_CONVERSATION,
  phaseState: SAMPLE_PHASE_STATE,
  submissionText: SAMPLE_SUBMISSION,
  learningObjectives: [
    "Use sensory details (five senses) to describe settings",
    "Apply figurative language (similes, metaphors) to create vivid imagery",
    "Connect setting descriptions to mood and atmosphere",
  ],
  lessonTemplate: "study_apply",
  childAge: 8,
  childTier: 1,
  learnerProfile: null,
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const previewOnly = body.previewOnly === true;
    const useLLM = body.useLLM !== false; // default true

    // Use logged-in user's email by default, but allow override
    const emailData: LessonReportEmailData = {
      ...SAMPLE_DATA,
      parentName: session.user.name ?? SAMPLE_DATA.parentName,
      parentEmail: body.email ?? session.user.email ?? SAMPLE_DATA.parentEmail,
    };

    // Generate LLM report sections if requested
    let reportSections = null;
    if (useLLM) {
      try {
        reportSections = await generateParentReport(emailData);
      } catch (err) {
        console.error("[Test Email] LLM generation failed:", err);
      }
    }

    if (previewOnly) {
      const html = buildLessonReportHtml(emailData, reportSections);
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const html = buildLessonReportHtml(emailData, reportSections);
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ??
      "WriteWhiz <onboarding@resend.dev>";

    await resend.emails.send({
      from: fromAddress,
      to: emailData.parentEmail,
      subject: `Lesson Report: ${emailData.childName} \u2014 "${emailData.lessonTitle}" (${emailData.overallScore.toFixed(1)}/4)`,
      html,
    });

    return NextResponse.json({
      success: true,
      sentTo: emailData.parentEmail,
      withLLM: !!reportSections,
      message: `Test report email sent to ${emailData.parentEmail}${reportSections ? " (with LLM analysis)" : " (template-only)"}`,
    });
  } catch (error) {
    console.error("POST /api/email/test-report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
