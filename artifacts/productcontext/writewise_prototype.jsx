import React, { useState, useEffect, useRef } from 'react';

// Mock data
const lessonData = {
  id: 'N1.1.5',
  title: 'Story Beginnings That Hook',
  tier: 1,
  unit: 'Story Beginnings',
};

const coachMessages = {
  instruction: {
    intro: "Today we're learning about HOOKS — the exciting first sentence that makes readers want to keep reading! 🎣",
    example: `Here's an example of a great hook:\n\n"The door wasn't there yesterday."\n\nSee how this makes you wonder: What door? Why is it there now? You HAVE to keep reading!`,
    question: "What makes the example hook interesting? Why would someone want to keep reading?",
    correct: "Exactly! It creates mystery and makes us curious. That's what great hooks do! Ready to practice together?",
    hint: "Think about how the sentence makes you feel... Do you have questions? Are you curious?"
  },
  guided: {
    exercise: `Let's practice! Here's a boring beginning:\n\n"It was a nice day."\n\nCan you rewrite it to make it a HOOK that makes readers curious?`,
    feedback_good: "Ooh, that's exciting! 🌟 You created curiosity! Can you add one more detail about WHO experiences this?",
    feedback_help: "Good start! But it's still telling us about the day. What if something HAPPENED on this day? Something mysterious or exciting?",
    ready: "Great work on the practice! You're ready for your own story beginning. Click 'Start Writing' when you're ready!"
  },
  assessment: {
    task: "Write your own story beginning with a great hook!",
    requirements: [
      "Include a hook that makes readers curious",
      "Introduce your main character", 
      "Tell us where the story takes place"
    ],
    wordGoal: "50-100 words"
  }
};

// Styles
const styles = {
  container: {
    fontFamily: "'Nunito', -apple-system, sans-serif",
    background: 'linear-gradient(135deg, #FFF9F0 0%, #FFF5E6 100%)',
    minHeight: '100vh',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '24px',
    boxShadow: '0 8px 32px rgba(255, 107, 107, 0.12)',
    maxWidth: '1000px',
    margin: '0 auto',
    overflow: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
    color: 'white',
    padding: '20px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
  },
  headerSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    opacity: 0.9,
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  phaseIndicator: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    background: '#FFFAF5',
    gap: '0',
  },
  phaseLine: {
    height: '4px',
    width: '80px',
    borderRadius: '2px',
    transition: 'background 0.3s ease',
  },
  phaseStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  phaseCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
    transition: 'all 0.3s ease',
    border: '3px solid',
  },
  phaseLabel: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  content: {
    padding: '28px',
  },
  splitView: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    minHeight: '500px',
  },
  chatPanel: {
    display: 'flex',
    flexDirection: 'column',
    background: '#FAFAFA',
    borderRadius: '20px',
    overflow: 'hidden',
  },
  chatHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #EEE',
    fontWeight: 700,
    color: '#FF6B6B',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  coachBubble: {
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
    color: 'white',
    padding: '16px 20px',
    borderRadius: '20px 20px 20px 6px',
    maxWidth: '85%',
    lineHeight: 1.6,
    fontSize: '15px',
    boxShadow: '0 4px 12px rgba(255, 107, 107, 0.25)',
  },
  studentBubble: {
    background: 'white',
    border: '2px solid #4ECDC4',
    padding: '16px 20px',
    borderRadius: '20px 20px 6px 20px',
    maxWidth: '85%',
    marginLeft: 'auto',
    lineHeight: 1.6,
    fontSize: '15px',
    boxShadow: '0 4px 12px rgba(78, 205, 196, 0.15)',
  },
  chatInputArea: {
    padding: '16px',
    borderTop: '1px solid #EEE',
    display: 'flex',
    gap: '12px',
  },
  chatInput: {
    flex: 1,
    padding: '14px 18px',
    borderRadius: '16px',
    border: '2px solid #E8E8E8',
    fontSize: '15px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease',
    outline: 'none',
  },
  sendButton: {
    background: 'linear-gradient(135deg, #4ECDC4 0%, #44B8B0 100%)',
    color: 'white',
    border: 'none',
    padding: '14px 24px',
    borderRadius: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 12px rgba(78, 205, 196, 0.3)',
  },
  writingPanel: {
    display: 'flex',
    flexDirection: 'column',
    background: 'white',
    borderRadius: '20px',
    border: '2px solid #F0F0F0',
    overflow: 'hidden',
  },
  writingHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #EEE',
    fontWeight: 700,
    color: '#2D3436',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  writingArea: {
    flex: 1,
    padding: '24px',
    fontFamily: "'Literata', Georgia, serif",
    fontSize: '17px',
    lineHeight: 1.8,
    border: 'none',
    resize: 'none',
    outline: 'none',
    color: '#2D3436',
  },
  writingFooter: {
    padding: '16px 20px',
    borderTop: '1px solid #EEE',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCount: {
    fontSize: '13px',
    color: '#888',
    fontWeight: 600,
  },
  submitButton: {
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 28px',
    borderRadius: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 16px rgba(255, 107, 107, 0.3)',
  },
  instructionContent: {
    textAlign: 'center',
    maxWidth: '700px',
    margin: '0 auto',
    padding: '20px 0',
  },
  coachAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FFE66D 0%, #FFD93D 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    margin: '0 auto 24px',
    boxShadow: '0 8px 24px rgba(255, 230, 109, 0.4)',
    animation: 'bounce 2s infinite',
  },
  exampleBox: {
    background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
    padding: '24px',
    borderRadius: '16px',
    margin: '24px 0',
    textAlign: 'left',
    borderLeft: '4px solid #4ECDC4',
  },
  exampleQuote: {
    fontFamily: "'Literata', Georgia, serif",
    fontSize: '20px',
    fontStyle: 'italic',
    color: '#2D3436',
    marginBottom: '12px',
  },
  questionBox: {
    background: '#FFF9F0',
    padding: '24px',
    borderRadius: '16px',
    marginTop: '32px',
    border: '2px dashed #FFE66D',
  },
  answerInput: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #E8E8E8',
    fontSize: '16px',
    fontFamily: 'inherit',
    marginTop: '16px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  nextButton: {
    background: 'linear-gradient(135deg, #4ECDC4 0%, #44B8B0 100%)',
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '16px',
    marginTop: '20px',
    transition: 'transform 0.2s ease',
    boxShadow: '0 4px 16px rgba(78, 205, 196, 0.3)',
  },
  feedbackContainer: {
    maxWidth: '700px',
    margin: '0 auto',
  },
  celebrationHeader: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  celebrationEmoji: {
    fontSize: '64px',
    marginBottom: '16px',
    animation: 'bounce 1s ease',
  },
  scoreCard: {
    background: 'linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 100%)',
    borderRadius: '20px',
    padding: '28px',
    marginBottom: '24px',
  },
  scoreStars: {
    textAlign: 'center',
    fontSize: '36px',
    marginBottom: '8px',
    letterSpacing: '4px',
  },
  scoreLabel: {
    textAlign: 'center',
    color: '#4ECDC4',
    fontWeight: 700,
    fontSize: '18px',
    marginBottom: '24px',
  },
  scoreCriterion: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  },
  criterionLabel: {
    width: '100px',
    fontWeight: 600,
    fontSize: '14px',
    color: '#666',
  },
  criterionBar: {
    flex: 1,
    height: '12px',
    background: '#E0E0E0',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  criterionFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 1s ease',
  },
  criterionScore: {
    width: '40px',
    textAlign: 'right',
    fontWeight: 700,
    fontSize: '14px',
    color: '#2D3436',
  },
  feedbackSection: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
  feedbackStrength: {
    background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
    padding: '20px',
    borderRadius: '16px',
    borderLeft: '4px solid #4ECDC4',
    marginBottom: '16px',
  },
  feedbackGrowth: {
    background: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)',
    padding: '20px',
    borderRadius: '16px',
    borderLeft: '4px solid #FFE66D',
    marginBottom: '16px',
  },
  feedbackLabel: {
    fontWeight: 700,
    fontSize: '14px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  feedbackText: {
    fontSize: '15px',
    lineHeight: 1.7,
    color: '#2D3436',
  },
  encouragement: {
    textAlign: 'center',
    padding: '20px',
    fontSize: '17px',
    fontWeight: 600,
    color: '#FF6B6B',
  },
  buttonRow: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    marginTop: '28px',
  },
  secondaryButton: {
    background: 'white',
    color: '#FF6B6B',
    border: '2px solid #FF6B6B',
    padding: '14px 28px',
    borderRadius: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '15px',
    transition: 'all 0.2s ease',
  },
  hintButton: {
    background: 'linear-gradient(135deg, #FFE66D 0%, #FFD93D 100%)',
    color: '#2D3436',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'transform 0.2s ease',
  },
  typingIndicator: {
    display: 'flex',
    gap: '6px',
    padding: '16px 20px',
  },
  typingDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#CCC',
    animation: 'typing 1.4s infinite',
  },
  taskCard: {
    background: 'linear-gradient(135deg, #FFF9F0 0%, #FFE6D0 100%)',
    borderRadius: '20px',
    padding: '28px',
    marginBottom: '24px',
    border: '2px solid #FF6B6B',
  },
  taskTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#FF6B6B',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  requirementsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  requirementItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    fontSize: '15px',
    color: '#2D3436',
  },
  checkIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#4ECDC4',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700',
  },
  wordGoal: {
    marginTop: '16px',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.7)',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#666',
  },
  progressBar: {
    height: '8px',
    background: '#E0E0E0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4ECDC4 0%, #44B8B0 100%)',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
};

// Add keyframes via style tag
const keyframes = `
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes typing {
    0%, 100% { opacity: 0.3; transform: translateY(0); }
    50% { opacity: 1; transform: translateY(-4px); }
  }
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Literata:ital,wght@0,400;1,400&display=swap');
`;

// Typing Indicator Component
const TypingIndicator = () => (
  <div style={styles.coachBubble}>
    <div style={styles.typingIndicator}>
      <div style={{...styles.typingDot, animationDelay: '0s'}}></div>
      <div style={{...styles.typingDot, animationDelay: '0.2s'}}></div>
      <div style={{...styles.typingDot, animationDelay: '0.4s'}}></div>
    </div>
  </div>
);

// Main Component
export default function WriteWiseLesson() {
  const [phase, setPhase] = useState('instruction'); // instruction, guided, assessment, feedback
  const [answer, setAnswer] = useState('');
  const [showCorrect, setShowCorrect] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [writingText, setWritingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [guidedComplete, setGuidedComplete] = useState(false);
  const [scores, setScores] = useState({ hook: 0, character: 0, setting: 0 });
  const messagesEndRef = useRef(null);
  
  const wordCount = writingText.trim().split(/\s+/).filter(w => w).length;

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Initialize guided practice chat
  useEffect(() => {
    if (phase === 'guided' && chatMessages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setChatMessages([{ role: 'coach', content: coachMessages.guided.exercise }]);
        setIsTyping(false);
      }, 1000);
    }
  }, [phase]);

  const handleAnswerSubmit = () => {
    if (answer.trim().length > 10) {
      setShowCorrect(true);
    }
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    
    const newMessages = [...chatMessages, { role: 'student', content: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');
    
    setIsTyping(true);
    setTimeout(() => {
      const isGood = chatInput.length > 20 && (
        chatInput.toLowerCase().includes('!') || 
        chatInput.toLowerCase().includes('suddenly') ||
        chatInput.toLowerCase().includes('mysterious') ||
        chatInput.toLowerCase().includes('heard') ||
        chatInput.toLowerCase().includes('saw')
      );
      
      const response = isGood ? coachMessages.guided.feedback_good : coachMessages.guided.feedback_help;
      setChatMessages([...newMessages, { role: 'coach', content: response }]);
      setIsTyping(false);
      
      if (isGood && !guidedComplete) {
        setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => {
            setChatMessages(prev => [...prev, { role: 'coach', content: coachMessages.guided.ready }]);
            setIsTyping(false);
            setGuidedComplete(true);
          }, 1500);
        }, 2000);
      }
    }, 1500);
  };

  const handleSubmitAssessment = () => {
    if (wordCount >= 30) {
      // Simulate scoring
      const hasHook = writingText.includes('!') || writingText.includes('?') || 
                      writingText.toLowerCase().includes('suddenly') ||
                      writingText.toLowerCase().includes('mysterious');
      const hasCharacter = /\b[A-Z][a-z]+\b/.test(writingText) || 
                          writingText.toLowerCase().includes('she') ||
                          writingText.toLowerCase().includes('he') ||
                          writingText.toLowerCase().includes('i ');
      const hasSetting = writingText.toLowerCase().includes('room') ||
                        writingText.toLowerCase().includes('house') ||
                        writingText.toLowerCase().includes('forest') ||
                        writingText.toLowerCase().includes('school') ||
                        writingText.toLowerCase().includes('outside');
      
      setScores({
        hook: hasHook ? 4 : 2,
        character: hasCharacter ? 3 : 2,
        setting: hasSetting ? 4 : 2
      });
      setPhase('feedback');
    }
  };

  const getPhaseStyle = (p, type) => {
    const phases = ['instruction', 'guided', 'assessment'];
    const currentIndex = phases.indexOf(phase === 'feedback' ? 'assessment' : phase);
    const targetIndex = phases.indexOf(p);
    
    if (type === 'circle') {
      if (targetIndex < currentIndex || (phase === 'feedback' && p === 'assessment')) {
        return { 
          background: '#4ECDC4', 
          borderColor: '#4ECDC4',
          color: 'white' 
        };
      } else if (targetIndex === currentIndex) {
        return { 
          background: '#FF6B6B', 
          borderColor: '#FF6B6B',
          color: 'white' 
        };
      } else {
        return { 
          background: 'white', 
          borderColor: '#E0E0E0',
          color: '#AAA' 
        };
      }
    }
    
    if (type === 'line') {
      if (targetIndex < currentIndex || (phase === 'feedback')) {
        return { background: '#4ECDC4' };
      } else {
        return { background: '#E0E0E0' };
      }
    }
    
    if (type === 'label') {
      if (targetIndex <= currentIndex || phase === 'feedback') {
        return { color: '#2D3436' };
      } else {
        return { color: '#AAA' };
      }
    }
  };

  return (
    <div style={styles.container}>
      <style>{keyframes}</style>
      
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>{lessonData.title}</h1>
            <p style={styles.headerSubtitle}>{lessonData.unit} • Lesson {lessonData.id}</p>
          </div>
          <button style={styles.backButton}>← Back</button>
        </div>

        {/* Phase Indicator */}
        <div style={styles.phaseIndicator}>
          <div style={styles.phaseStep}>
            <div style={{...styles.phaseCircle, ...getPhaseStyle('instruction', 'circle')}}>
              {phase !== 'instruction' ? '✓' : '1'}
            </div>
            <span style={{...styles.phaseLabel, ...getPhaseStyle('instruction', 'label')}}>Learn</span>
          </div>
          
          <div style={{...styles.phaseLine, ...getPhaseStyle('guided', 'line')}}></div>
          
          <div style={styles.phaseStep}>
            <div style={{...styles.phaseCircle, ...getPhaseStyle('guided', 'circle')}}>
              {['assessment', 'feedback'].includes(phase) ? '✓' : '2'}
            </div>
            <span style={{...styles.phaseLabel, ...getPhaseStyle('guided', 'label')}}>Practice</span>
          </div>
          
          <div style={{...styles.phaseLine, ...getPhaseStyle('assessment', 'line')}}></div>
          
          <div style={styles.phaseStep}>
            <div style={{...styles.phaseCircle, ...getPhaseStyle('assessment', 'circle')}}>
              {phase === 'feedback' ? '✓' : '3'}
            </div>
            <span style={{...styles.phaseLabel, ...getPhaseStyle('assessment', 'label')}}>Write</span>
          </div>
        </div>

        {/* Content Area */}
        <div style={styles.content}>
          
          {/* INSTRUCTION PHASE */}
          {phase === 'instruction' && (
            <div style={styles.instructionContent}>
              <div style={styles.coachAvatar}>🦉</div>
              
              <p style={{ fontSize: '18px', lineHeight: 1.7, color: '#2D3436' }}>
                {coachMessages.instruction.intro}
              </p>
              
              <div style={styles.exampleBox}>
                <p style={{ fontWeight: 700, color: '#4ECDC4', marginBottom: '12px', fontSize: '14px' }}>
                  📖 EXAMPLE HOOK
                </p>
                <p style={styles.exampleQuote}>"The door wasn't there yesterday."</p>
                <p style={{ fontSize: '15px', color: '#555', lineHeight: 1.6 }}>
                  See how this makes you wonder: What door? Why is it there now? 
                  You HAVE to keep reading!
                </p>
              </div>
              
              <div style={styles.questionBox}>
                <p style={{ fontWeight: 700, color: '#2D3436', marginBottom: '4px' }}>
                  🤔 Quick Question
                </p>
                <p style={{ color: '#666', fontSize: '15px' }}>
                  {coachMessages.instruction.question}
                </p>
                <input
                  style={styles.answerInput}
                  placeholder="Type your answer here..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAnswerSubmit()}
                />
                
                {!showCorrect && (
                  <button 
                    style={styles.nextButton}
                    onClick={handleAnswerSubmit}
                  >
                    Check Answer →
                  </button>
                )}
                
                {showCorrect && (
                  <div style={{ marginTop: '20px' }}>
                    <div style={{
                      background: '#E8F5E9',
                      padding: '16px',
                      borderRadius: '12px',
                      color: '#2D3436',
                      fontSize: '15px',
                      marginBottom: '16px'
                    }}>
                      ✨ {coachMessages.instruction.correct}
                    </div>
                    <button 
                      style={styles.nextButton}
                      onClick={() => setPhase('guided')}
                    >
                      Start Practicing →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GUIDED PRACTICE PHASE */}
          {phase === 'guided' && (
            <div style={styles.splitView}>
              {/* Chat Panel */}
              <div style={styles.chatPanel}>
                <div style={styles.chatHeader}>
                  <span style={{ fontSize: '20px' }}>🦉</span>
                  Coach Chat
                </div>
                
                <div style={styles.chatMessages}>
                  {chatMessages.map((msg, i) => (
                    <div 
                      key={i} 
                      style={msg.role === 'coach' ? styles.coachBubble : styles.studentBubble}
                    >
                      {msg.content.split('\n').map((line, j) => (
                        <React.Fragment key={j}>
                          {line}
                          {j < msg.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                  ))}
                  {isTyping && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
                
                <div style={styles.chatInputArea}>
                  <input
                    style={styles.chatInput}
                    placeholder="Type your response..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                  />
                  <button style={styles.sendButton} onClick={handleChatSend}>
                    Send
                  </button>
                </div>
              </div>

              {/* Writing Panel */}
              <div style={styles.writingPanel}>
                <div style={styles.writingHeader}>
                  <span>✏️ Your Writing</span>
                  <button style={styles.hintButton}>
                    💡 Hint
                  </button>
                </div>
                
                <textarea
                  style={styles.writingArea}
                  placeholder="Write your hook here..."
                  value={writingText}
                  onChange={(e) => setWritingText(e.target.value)}
                />
                
                <div style={styles.writingFooter}>
                  <span style={styles.wordCount}>
                    {wordCount} words
                  </span>
                  {guidedComplete && (
                    <button 
                      style={styles.submitButton}
                      onClick={() => setPhase('assessment')}
                    >
                      Start Writing →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ASSESSMENT PHASE */}
          {phase === 'assessment' && (
            <div>
              <div style={styles.taskCard}>
                <div style={styles.taskTitle}>
                  📝 Your Turn!
                </div>
                <p style={{ fontSize: '16px', color: '#2D3436', marginBottom: '20px' }}>
                  {coachMessages.assessment.task}
                </p>
                <ul style={styles.requirementsList}>
                  {coachMessages.assessment.requirements.map((req, i) => (
                    <li key={i} style={styles.requirementItem}>
                      <span style={styles.checkIcon}>✓</span>
                      {req}
                    </li>
                  ))}
                </ul>
                <div style={styles.wordGoal}>
                  🎯 Goal: {coachMessages.assessment.wordGoal}
                </div>
              </div>
              
              <div style={{...styles.writingPanel, minHeight: '350px'}}>
                <div style={styles.writingHeader}>
                  ✏️ Write Your Story Beginning
                </div>
                
                <textarea
                  style={{...styles.writingArea, minHeight: '250px'}}
                  placeholder="Start your story with a great hook..."
                  value={writingText}
                  onChange={(e) => setWritingText(e.target.value)}
                />
                
                <div style={styles.writingFooter}>
                  <div>
                    <span style={styles.wordCount}>
                      {wordCount} / 50-100 words
                    </span>
                    <div style={styles.progressBar}>
                      <div 
                        style={{
                          ...styles.progressFill, 
                          width: `${Math.min(100, (wordCount / 50) * 100)}%`,
                          background: wordCount >= 50 ? 'linear-gradient(90deg, #4ECDC4 0%, #44B8B0 100%)' : 'linear-gradient(90deg, #FFE66D 0%, #FFD93D 100%)'
                        }}
                      />
                    </div>
                  </div>
                  <button 
                    style={{
                      ...styles.submitButton,
                      opacity: wordCount >= 30 ? 1 : 0.5,
                      cursor: wordCount >= 30 ? 'pointer' : 'not-allowed'
                    }}
                    onClick={handleSubmitAssessment}
                    disabled={wordCount < 30}
                  >
                    Submit →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FEEDBACK PHASE */}
          {phase === 'feedback' && (
            <div style={styles.feedbackContainer}>
              <div style={styles.celebrationHeader}>
                <div style={styles.celebrationEmoji}>🎉</div>
                <h2 style={{ margin: 0, fontSize: '28px', color: '#2D3436' }}>
                  Great Work!
                </h2>
              </div>
              
              <div style={styles.scoreCard}>
                <div style={styles.scoreStars}>
                  {'⭐'.repeat(Math.round((scores.hook + scores.character + scores.setting) / 3))}
                </div>
                <div style={styles.scoreLabel}>
                  {(scores.hook + scores.character + scores.setting) >= 10 
                    ? 'Exceeds Expectations!' 
                    : 'Great Progress!'}
                </div>
                
                {[
                  { label: 'Hook', score: scores.hook, color: '#FF6B6B' },
                  { label: 'Character', score: scores.character, color: '#4ECDC4' },
                  { label: 'Setting', score: scores.setting, color: '#FFE66D' }
                ].map((criterion, i) => (
                  <div key={i} style={styles.scoreCriterion}>
                    <span style={styles.criterionLabel}>{criterion.label}</span>
                    <div style={styles.criterionBar}>
                      <div 
                        style={{
                          ...styles.criterionFill,
                          width: `${(criterion.score / 4) * 100}%`,
                          background: criterion.color
                        }}
                      />
                    </div>
                    <span style={styles.criterionScore}>{criterion.score}/4</span>
                  </div>
                ))}
              </div>
              
              <div style={styles.feedbackSection}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '32px' }}>🦉</span>
                  <span style={{ fontWeight: 700, fontSize: '18px', color: '#2D3436' }}>
                    Coach Feedback
                  </span>
                </div>
                
                <div style={styles.feedbackStrength}>
                  <div style={styles.feedbackLabel}>
                    ✨ What you did really well:
                  </div>
                  <p style={styles.feedbackText}>
                    Your hook grabbed my attention right away! I immediately wanted to know more about 
                    what was happening. Great job creating mystery and excitement in your opening!
                  </p>
                </div>
                
                <div style={styles.feedbackGrowth}>
                  <div style={styles.feedbackLabel}>
                    📈 One thing to work on:
                  </div>
                  <p style={styles.feedbackText}>
                    I'd love to know a tiny bit more about your main character. What do they look like? 
                    How do they feel? One small detail would help readers picture them better.
                  </p>
                </div>
                
                <div style={styles.encouragement}>
                  Keep writing — you have a gift for creating curiosity! 🌟
                </div>
              </div>
              
              <div style={styles.buttonRow}>
                <button style={styles.secondaryButton}>
                  View My Writing
                </button>
                <button style={styles.submitButton}>
                  Next Lesson →
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
