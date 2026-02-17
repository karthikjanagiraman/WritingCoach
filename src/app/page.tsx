"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import styles from "./landing.module.css";

export default function LandingPage() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const navbarRef = useRef<HTMLElement>(null);
  const typingTextRef = useRef<HTMLDivElement>(null);
  const confettiContainerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const engagementRef = useRef<HTMLElement>(null);
  const scoreBarsRef = useRef<HTMLDivElement>(null);

  const storyText =
    "Once upon a time, there was a brave little fox who lived at the top of the tallest mountain. Every morning, she would look down at the valley and wonder what adventures waited below...";

  const typeWriter = useCallback(() => {
    const container = typingTextRef.current;
    if (!container) return;
    container.innerHTML = "";
    const words = storyText.split(" ");
    let html = "";
    words.forEach((word, i) => {
      const delay = i * 0.12;
      html += `<span class="${styles.word}" style="animation-delay: ${delay}s">${word} </span>`;
    });
    html += `<span class="${styles.notebookCursor}"></span>`;
    container.innerHTML = html;
  }, []);

  const createConfetti = useCallback(() => {
    const container = confettiContainerRef.current;
    if (!container) return;
    container.innerHTML = "";
    const confettiColors = [
      "#FF6B6B",
      "#6C5CE7",
      "#4ECDC4",
      "#FFE66D",
      "#FF8A8A",
    ];
    for (let i = 0; i < 20; i++) {
      const dot = document.createElement("div");
      dot.className = styles.confettiDot;
      dot.style.left = Math.random() * 100 + "%";
      dot.style.top = Math.random() * 40 + "%";
      dot.style.background =
        confettiColors[Math.floor(Math.random() * confettiColors.length)];
      dot.style.animationDelay = Math.random() * 2 + "s";
      dot.style.animationDuration = 1.5 + Math.random() + "s";
      const size = 4 + Math.random() * 6 + "px";
      dot.style.width = size;
      dot.style.height = size;
      container.appendChild(dot);
    }
  }, []);

  // Navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Typewriter effect — observe hero section
  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(typeWriter, 600);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, [typeWriter]);

  // Scroll animations
  useEffect(() => {
    const elements = document.querySelectorAll(`.${styles.animateOnScroll}`);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Confetti dots — observe engagement section
  useEffect(() => {
    const engagementEl = engagementRef.current;
    if (!engagementEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            createConfetti();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(engagementEl);
    return () => observer.disconnect();
  }, [createConfetti]);

  // Score bar animation
  useEffect(() => {
    const scoreBarsEl = scoreBarsRef.current;
    if (!scoreBarsEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const fills = entry.target.querySelectorAll(
              `.${styles.scoreBarFill}`
            );
            fills.forEach((fill) => {
              const el = fill as HTMLElement;
              const targetWidth = el.style.width;
              el.style.width = "0%";
              setTimeout(() => {
                el.style.width = targetWidth;
              }, 200);
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(scoreBarsEl);
    return () => observer.disconnect();
  }, []);

  // Smooth scroll for anchor links
  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string
  ) => {
    if (targetId === "#") return;
    e.preventDefault();
    const target = document.querySelector(targetId);
    if (target && navbarRef.current) {
      const navHeight = navbarRef.current.offsetHeight;
      const targetPosition =
        target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
      window.scrollTo({ top: targetPosition, behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className={styles.landing}>
      {/* ===== NAVIGATION ===== */}
      <nav
        ref={navbarRef}
        className={`${styles.navbar}${navScrolled ? ` ${styles.scrolled}` : ""}`}
      >
        <div className={styles.navbarInner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>&#9999;&#65039;</span>
            WriteWise Kids
          </Link>
          <ul
            className={`${styles.navLinks}${mobileMenuOpen ? ` ${styles.navLinksOpen}` : ""}`}
          >
            <li>
              <a
                href="#how-it-works"
                onClick={(e) => handleAnchorClick(e, "#how-it-works")}
              >
                How It Works
              </a>
            </li>
            <li>
              <a
                href="#outcomes"
                onClick={(e) => handleAnchorClick(e, "#outcomes")}
              >
                What They&apos;ll Learn
              </a>
            </li>
            <li>
              <a
                href="#parents"
                onClick={(e) => handleAnchorClick(e, "#parents")}
              >
                For Parents
              </a>
            </li>
            <li>
              <a
                href="#pricing"
                onClick={(e) => handleAnchorClick(e, "#pricing")}
              >
                Pricing
              </a>
            </li>
            <li>
              {session ? (
                <Link href="/dashboard" className={styles.navCta}>
                  Go to Dashboard
                </Link>
              ) : (
                <Link href="/auth/signup" className={styles.navCta}>
                  Free Assessment
                </Link>
              )}
            </li>
          </ul>
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section ref={heroRef} className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <h1>
              Every child has a story worth telling.{" "}
              <span className={styles.highlight}>We help them write it.</span>
            </h1>
            <p className={styles.heroSub}>
              An AI writing coach that teaches, encourages, and adapts — so your
              child discovers the joy of writing.
            </p>
            <div className={styles.heroActions}>
              <Link href="/auth/signup" className={styles.btnPrimary}>
                Discover your child&apos;s writing level
              </Link>
              <a
                href="#how-it-works"
                className={styles.btnSecondaryLink}
                onClick={(e) => handleAnchorClick(e, "#how-it-works")}
              >
                See how it works <span>&#8595;</span>
              </a>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.notebookCard}>
              <div className={styles.notebookHeader}>
                <span className={styles.notebookDot}></span>
                <span className={styles.notebookDot}></span>
                <span className={styles.notebookDot}></span>
                <span className={styles.notebookTitle}>
                  Maya&apos;s Story — Draft 1
                </span>
              </div>
              <div className={styles.notebookBody}>
                <div
                  ref={typingTextRef}
                  className={styles.notebookText}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== OUTCOME SHOWCASE ===== */}
      <section className={styles.outcomes} id="outcomes">
        <div className={styles.container}>
          <div
            className={`${styles.sectionHeader} ${styles.animateOnScroll}`}
          >
            <span className={styles.sectionLabel}>Outcomes by Age</span>
            <h2 className={styles.sectionTitle}>
              What Your Child Will Achieve
            </h2>
            <p className={styles.sectionSubtitle}>
              Real writing skills that grow with them, from first stories to
              analytical essays.
            </p>
          </div>
          <div className={styles.outcomeGrid}>
            <div
              className={`${styles.outcomeCard} ${styles.tier1} ${styles.animateOnScroll} ${styles.delay1}`}
            >
              <span className={styles.outcomeBadge}>Ages 7-9</span>
              <span className={styles.outcomeMascot}>&#129417;</span>
              <h3 className={styles.outcomeTitle}>
                Write complete stories with vivid characters
              </h3>
              <blockquote className={styles.outcomeQuote}>
                &ldquo;The tiny dragon peeked out from behind the cloud. Her
                wings were still too small to fly, but her heart was big enough
                to try.&rdquo;
                <p className={styles.outcomeAttribution}>
                  — Tier 1 student sample
                </p>
              </blockquote>
            </div>
            <div
              className={`${styles.outcomeCard} ${styles.tier2} ${styles.animateOnScroll} ${styles.delay2}`}
            >
              <span className={styles.outcomeBadge}>Ages 10-12</span>
              <span className={styles.outcomeMascot}>&#129418;</span>
              <h3 className={styles.outcomeTitle}>
                Build persuasive arguments with evidence and voice
              </h3>
              <blockquote className={styles.outcomeQuote}>
                &ldquo;Schools should have longer recess because studies show
                that physical activity helps students concentrate better in
                class.&rdquo;
                <p className={styles.outcomeAttribution}>
                  — Tier 2 student sample
                </p>
              </blockquote>
            </div>
            <div
              className={`${styles.outcomeCard} ${styles.tier3} ${styles.animateOnScroll} ${styles.delay3}`}
            >
              <span className={styles.outcomeBadge}>Ages 13-15</span>
              <span className={styles.outcomeMascot}>&#128058;</span>
              <h3 className={styles.outcomeTitle}>
                Craft analytical essays with a clear thesis
              </h3>
              <blockquote className={styles.outcomeQuote}>
                &ldquo;In <em>The Giver</em>, Lowry uses the motif of color to
                represent the community&apos;s suppression of individual
                experience.&rdquo;
                <p className={styles.outcomeAttribution}>
                  — Tier 3 student sample
                </p>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className={styles.howItWorks} id="how-it-works">
        <div className={styles.container}>
          <div
            className={`${styles.sectionHeader} ${styles.animateOnScroll}`}
          >
            <span className={styles.sectionLabel}>The Lesson Flow</span>
            <h2 className={styles.sectionTitle}>
              How a single lesson transforms their writing
            </h2>
          </div>
          <div className={`${styles.timeline} ${styles.animateOnScroll}`}>
            <div className={styles.timelineStep}>
              <div className={styles.stepCircle}>&#128214;</div>
              <h4 className={styles.stepTitle}>Learn</h4>
              <p className={styles.stepDesc}>
                The AI coach teaches the concept with fun, relatable examples
              </p>
            </div>
            <div className={styles.timelineStep}>
              <div className={styles.stepCircle}>&#129309;</div>
              <h4 className={styles.stepTitle}>Practice Together</h4>
              <p className={styles.stepDesc}>
                Guided questions help them apply what they learned — no answers
                given, just smart hints
              </p>
            </div>
            <div className={styles.timelineStep}>
              <div className={styles.stepCircle}>&#9997;&#65039;</div>
              <h4 className={styles.stepTitle}>Write</h4>
              <p className={styles.stepDesc}>
                Independent writing time. The coach steps back. This is their
                moment.
              </p>
            </div>
            <div className={styles.timelineStep}>
              <div className={styles.stepCircle}>&#127775;</div>
              <h4 className={styles.stepTitle}>Grow</h4>
              <p className={styles.stepDesc}>
                Personalized feedback that celebrates strengths and highlights
                one area to improve
              </p>
            </div>
          </div>
          <div
            className={`${styles.lessonMockup} ${styles.animateOnScroll}`}
          >
            <div className={styles.lessonMockupHeader}>
              <span className={styles.lessonMockupTitle}>
                Story Openings — Lesson 3
              </span>
              <div className={styles.lessonMockupPhase}>
                <span
                  className={`${styles.phaseDot} ${styles.phaseDotCompleted}`}
                ></span>
                <span
                  className={`${styles.phaseDot} ${styles.phaseDotActive}`}
                ></span>
                <span className={styles.phaseDot}></span>
              </div>
            </div>
            <div className={styles.lessonMockupBody}>
              <div className={`${styles.chatMsg} ${styles.chatMsgCoach}`}>
                <div className={styles.chatAvatar}>&#129417;</div>
                <div className={styles.chatBubble}>
                  Great job! A story opening should grab the reader&apos;s
                  attention. Let&apos;s look at three ways to do that...
                </div>
              </div>
              <div className={`${styles.chatMsg} ${styles.chatMsgStudent}`}>
                <div className={styles.chatAvatar}>&#128103;</div>
                <div className={styles.chatBubble}>
                  Can I start with a question?
                </div>
              </div>
              <div className={`${styles.chatMsg} ${styles.chatMsgCoach}`}>
                <div className={styles.chatAvatar}>&#129417;</div>
                <div className={styles.chatBubble}>
                  Absolutely! Starting with a question is a fantastic hook. What
                  question would your character ask?
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ENGAGEMENT ===== */}
      <section ref={engagementRef} className={styles.engagement}>
        <div className={styles.container}>
          <div
            className={`${styles.sectionHeader} ${styles.animateOnScroll}`}
          >
            <span className={styles.sectionLabel}>Motivation Built In</span>
            <h2 className={styles.sectionTitle}>
              They&apos;ll ask to write. Really.
            </h2>
          </div>
          <div className={styles.engagementGrid}>
            <div
              className={`${styles.engagementCard} ${styles.animateOnScroll} ${styles.delay1}`}
            >
              <span className={styles.engagementIcon}>&#128293;</span>
              <h3 className={styles.engagementTitle}>Writing Streaks</h3>
              <div className={styles.streakDisplay}>
                <div className={styles.streakCounter}>7</div>
                <div className={styles.streakLabel}>day streak!</div>
                <div className={styles.streakDots}>
                  <div
                    className={`${styles.streakDot} ${styles.streakDotFilled}`}
                  >
                    &#10003;
                  </div>
                  <div
                    className={`${styles.streakDot} ${styles.streakDotFilled}`}
                  >
                    &#10003;
                  </div>
                  <div
                    className={`${styles.streakDot} ${styles.streakDotFilled}`}
                  >
                    &#10003;
                  </div>
                  <div
                    className={`${styles.streakDot} ${styles.streakDotFilled}`}
                  >
                    &#10003;
                  </div>
                  <div
                    className={`${styles.streakDot} ${styles.streakDotFilled}`}
                  >
                    &#10003;
                  </div>
                  <div
                    className={`${styles.streakDot} ${styles.streakDotFilled}`}
                  >
                    &#10003;
                  </div>
                  <div
                    className={`${styles.streakDot} ${styles.streakDotFilled}`}
                  >
                    &#10003;
                  </div>
                </div>
                <div className={styles.streakDayLabels}>
                  <span className={styles.streakDayLabel}>M</span>
                  <span className={styles.streakDayLabel}>T</span>
                  <span className={styles.streakDayLabel}>W</span>
                  <span className={styles.streakDayLabel}>T</span>
                  <span className={styles.streakDayLabel}>F</span>
                  <span className={styles.streakDayLabel}>S</span>
                  <span className={styles.streakDayLabel}>S</span>
                </div>
              </div>
            </div>
            <div
              className={`${styles.engagementCard} ${styles.animateOnScroll} ${styles.delay2}`}
            >
              <span className={styles.engagementIcon}>&#127941;</span>
              <h3 className={styles.engagementTitle}>Badge Collection</h3>
              <div className={styles.badgeCollection}>
                <div className={styles.badgeRow}>
                  <div
                    className={`${styles.badgeCircle} ${styles.badgeCircleEarned}`}
                  >
                    &#127942;
                  </div>
                  <div
                    className={`${styles.badgeCircle} ${styles.badgeCircleEarned}`}
                  >
                    &#128221;
                  </div>
                  <div
                    className={`${styles.badgeCircle} ${styles.badgeCircleEarned}`}
                  >
                    &#11088;
                  </div>
                  <div
                    className={`${styles.badgeCircle} ${styles.badgeCircleEarned}`}
                  >
                    &#127919;
                  </div>
                  <div
                    className={`${styles.badgeCircle} ${styles.badgeCircleEarned}`}
                  >
                    &#128218;
                  </div>
                </div>
                <div className={styles.badgeRow}>
                  <div
                    className={`${styles.badgeCircle} ${styles.badgeCircleEarned}`}
                  >
                    &#127775;
                  </div>
                  <div
                    className={`${styles.badgeCircle} ${styles.badgeCircleEarned}`}
                  >
                    &#10024;
                  </div>
                  <div
                    className={`${styles.badgeCircle} ${styles.badgeCircleLocked}`}
                  >
                    &#128302;
                  </div>
                  <div
                    className={`${styles.badgeCircle} ${styles.badgeCircleLocked}`}
                  >
                    &#128142;
                  </div>
                  <div
                    className={`${styles.badgeCircle} ${styles.badgeCircleLocked}`}
                  >
                    &#128081;
                  </div>
                </div>
                <span className={styles.badgeCount}>12 of 24 earned</span>
              </div>
            </div>
            <div
              className={`${styles.engagementCard} ${styles.animateOnScroll} ${styles.delay3}`}
            >
              <span className={styles.engagementIcon}>&#127881;</span>
              <h3 className={styles.engagementTitle}>Celebrations</h3>
              <div className={styles.celebrationDisplay}>
                <div
                  ref={confettiContainerRef}
                  className={styles.confettiDots}
                ></div>
                <div className={styles.celebrationBadge}>
                  &#127775; New badge unlocked!
                  <br />
                  Story Starter
                </div>
              </div>
            </div>
          </div>
          <p
            className={`${styles.engagementTagline} ${styles.animateOnScroll}`}
          >
            Badges, streaks, and celebrations keep them motivated lesson after
            lesson.
          </p>
        </div>
      </section>

      {/* ===== PARENT INSIGHT ===== */}
      <section className={styles.parentInsight} id="parents">
        <div className={styles.container}>
          <div
            className={`${styles.sectionHeader} ${styles.animateOnScroll}`}
          >
            <span className={styles.sectionLabel}>For Parents</span>
            <h2 className={styles.sectionTitle}>
              See exactly where they&apos;re growing
            </h2>
          </div>
          <div className={styles.insightGrid}>
            <div
              className={`${styles.insightText} ${styles.animateOnScroll}`}
            >
              <h3>
                Deep insight into every dimension of their writing
              </h3>
              <ul className={styles.insightList}>
                <li>
                  <span className={styles.insightCheck}>&#10003;</span>
                  Track skills across narrative, persuasive, expository, and
                  descriptive writing
                </li>
                <li>
                  <span className={styles.insightCheck}>&#10003;</span>
                  Watch their progress over weeks and months
                </li>
                <li>
                  <span className={styles.insightCheck}>&#10003;</span>
                  Read every piece they write with AI-annotated feedback
                </li>
                <li>
                  <span className={styles.insightCheck}>&#10003;</span>
                  Adjust their curriculum to focus on what matters most
                </li>
              </ul>
            </div>
            <div
              className={`${styles.insightDashboard} ${styles.animateOnScroll} ${styles.delay2}`}
            >
              <div className={styles.insightDashboardLabel}>
                Progress Overview
              </div>

              {/* Radar Chart */}
              <div className={styles.radarChart}>
                <svg
                  viewBox="0 0 220 220"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Grid rings */}
                  <polygon
                    points="110,30 190,110 110,190 30,110"
                    fill="none"
                    stroke="#e8e8e8"
                    strokeWidth="1"
                  />
                  <polygon
                    points="110,50 170,110 110,170 50,110"
                    fill="none"
                    stroke="#e8e8e8"
                    strokeWidth="1"
                  />
                  <polygon
                    points="110,70 150,110 110,150 70,110"
                    fill="none"
                    stroke="#e8e8e8"
                    strokeWidth="1"
                  />
                  <polygon
                    points="110,90 130,110 110,130 90,110"
                    fill="none"
                    stroke="#e8e8e8"
                    strokeWidth="1"
                  />
                  {/* Axes */}
                  <line
                    x1="110"
                    y1="30"
                    x2="110"
                    y2="190"
                    stroke="#e8e8e8"
                    strokeWidth="1"
                  />
                  <line
                    x1="30"
                    y1="110"
                    x2="190"
                    y2="110"
                    stroke="#e8e8e8"
                    strokeWidth="1"
                  />
                  {/* Data polygon */}
                  <polygon
                    points="110,42 175,110 110,155 55,110"
                    fill="rgba(108, 92, 231, 0.15)"
                    stroke="var(--purple)"
                    strokeWidth="2.5"
                  />
                  {/* Data dots */}
                  <circle cx="110" cy="42" r="4" fill="var(--purple)" />
                  <circle cx="175" cy="110" r="4" fill="var(--purple)" />
                  <circle cx="110" cy="155" r="4" fill="var(--purple)" />
                  <circle cx="55" cy="110" r="4" fill="var(--purple)" />
                  {/* Labels */}
                  <text
                    x="110"
                    y="20"
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="Nunito, sans-serif"
                    fontWeight="700"
                    fill="#636e72"
                  >
                    Narrative
                  </text>
                  <text
                    x="200"
                    y="114"
                    textAnchor="start"
                    fontSize="11"
                    fontFamily="Nunito, sans-serif"
                    fontWeight="700"
                    fill="#636e72"
                  >
                    Persuasive
                  </text>
                  <text
                    x="110"
                    y="210"
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="Nunito, sans-serif"
                    fontWeight="700"
                    fill="#636e72"
                  >
                    Descriptive
                  </text>
                  <text
                    x="20"
                    y="114"
                    textAnchor="end"
                    fontSize="11"
                    fontFamily="Nunito, sans-serif"
                    fontWeight="700"
                    fill="#636e72"
                  >
                    Expository
                  </text>
                </svg>
              </div>

              {/* Score bars */}
              <div ref={scoreBarsRef} className={styles.scoreBars}>
                <div className={styles.scoreBarsTitle}>Recent Scores</div>
                <div className={styles.scoreBarRow}>
                  <span className={styles.scoreBarLabel}>Narrative</span>
                  <div className={styles.scoreBarTrack}>
                    <div
                      className={styles.scoreBarFill}
                      style={{
                        width: "85%",
                        background: "var(--coral)",
                      }}
                    ></div>
                  </div>
                  <span className={styles.scoreBarValue}>4.2</span>
                </div>
                <div className={styles.scoreBarRow}>
                  <span className={styles.scoreBarLabel}>Persuasive</span>
                  <div className={styles.scoreBarTrack}>
                    <div
                      className={styles.scoreBarFill}
                      style={{
                        width: "72%",
                        background: "var(--purple)",
                      }}
                    ></div>
                  </div>
                  <span className={styles.scoreBarValue}>3.6</span>
                </div>
                <div className={styles.scoreBarRow}>
                  <span className={styles.scoreBarLabel}>Expository</span>
                  <div className={styles.scoreBarTrack}>
                    <div
                      className={styles.scoreBarFill}
                      style={{
                        width: "60%",
                        background: "var(--teal)",
                      }}
                    ></div>
                  </div>
                  <span className={styles.scoreBarValue}>3.0</span>
                </div>
                <div className={styles.scoreBarRow}>
                  <span className={styles.scoreBarLabel}>Descriptive</span>
                  <div className={styles.scoreBarTrack}>
                    <div
                      className={styles.scoreBarFill}
                      style={{
                        width: "78%",
                        background: "var(--yellow)",
                        filter: "brightness(0.85)",
                      }}
                    ></div>
                  </div>
                  <span className={styles.scoreBarValue}>3.9</span>
                </div>
              </div>

              {/* Weekly activity */}
              <div className={styles.weeklyActivity}>
                <div className={styles.weeklyActivityTitle}>This Week</div>
                <div className={styles.weeklySquares}>
                  <div
                    className={`${styles.weeklySquare} ${styles.weeklySquareActive3}`}
                  ></div>
                  <div
                    className={`${styles.weeklySquare} ${styles.weeklySquareActive2}`}
                  ></div>
                  <div
                    className={`${styles.weeklySquare} ${styles.weeklySquareActive3}`}
                  ></div>
                  <div
                    className={`${styles.weeklySquare} ${styles.weeklySquareInactive}`}
                  ></div>
                  <div
                    className={`${styles.weeklySquare} ${styles.weeklySquareActive1}`}
                  ></div>
                  <div
                    className={`${styles.weeklySquare} ${styles.weeklySquareActive3}`}
                  ></div>
                  <div
                    className={`${styles.weeklySquare} ${styles.weeklySquareInactive}`}
                  ></div>
                </div>
                <div className={styles.weeklyLabels}>
                  <span className={styles.weeklyLabel}>M</span>
                  <span className={styles.weeklyLabel}>T</span>
                  <span className={styles.weeklyLabel}>W</span>
                  <span className={styles.weeklyLabel}>T</span>
                  <span className={styles.weeklyLabel}>F</span>
                  <span className={styles.weeklyLabel}>S</span>
                  <span className={styles.weeklyLabel}>S</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== THE METHOD ===== */}
      <section className={styles.method} id="pricing">
        <div className={styles.container}>
          <div className={`${styles.methodText} ${styles.animateOnScroll}`}>
            <p>
              Built on the &ldquo;I Do, We Do, You Do&rdquo; framework — a
              proven teaching method used by educators worldwide.
            </p>
            <p>
              Our AI coach adapts it to your child&apos;s exact level, pace, and
              interests.
            </p>
          </div>
          <div
            className={`${styles.methodVisual} ${styles.animateOnScroll}`}
          >
            <div className={`${styles.methodCircle} ${styles.iDo}`}>
              I Do
              <span className={styles.methodCircleSub}>Coach teaches</span>
            </div>
            <span className={styles.methodArrow}>{"\u2192"}</span>
            <div className={`${styles.methodCircle} ${styles.weDo}`}>
              We Do
              <span className={styles.methodCircleSub}>
                Practice together
              </span>
            </div>
            <span className={styles.methodArrow}>{"\u2192"}</span>
            <div className={`${styles.methodCircle} ${styles.youDo}`}>
              You Do
              <span className={styles.methodCircleSub}>
                Write independently
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className={styles.finalCta} id="cta">
        <div className={styles.container}>
          <h2 className={styles.animateOnScroll}>
            Every great writer started somewhere
          </h2>
          <p
            className={`${styles.finalCtaSub} ${styles.animateOnScroll} ${styles.delay1}`}
          >
            A free 5-minute placement assessment shows you exactly where your
            child is — and where they can go.
          </p>
          <div
            className={`${styles.animateOnScroll} ${styles.delay2}`}
          >
            <Link
              href="/auth/signup"
              className={styles.btnPrimary}
              style={{ fontSize: "19px", padding: "18px 40px" }}
            >
              Start the Free Assessment {"\u2192"}
            </Link>
          </div>
          <p
            className={`${styles.finalCtaNote} ${styles.animateOnScroll} ${styles.delay3}`}
          >
            No credit card required. Takes 5 minutes.
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <span>&#9999;&#65039;</span> WriteWise Kids
          </div>
          <ul className={styles.footerLinks}>
            <li>
              <a href="#">About</a>
            </li>
            <li>
              <a href="#">Privacy</a>
            </li>
            <li>
              <a href="#">Terms</a>
            </li>
            <li>
              <a href="#">Contact</a>
            </li>
          </ul>
          <p className={styles.footerCopy}>
            &copy; 2026 WriteWise Kids. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
