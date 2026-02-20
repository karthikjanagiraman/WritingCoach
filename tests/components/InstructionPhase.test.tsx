import { describe, it, expect, vi, beforeAll } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import InstructionPhase from '@/components/InstructionPhase';
import { renderWithProviders } from '../setup/component-helpers';
import type { Message } from '@/types';

// CoachMessage uses react-markdown; ChatBubble uses CoachMessage; InstructionPhase uses ChatBubble
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));
vi.mock('remark-gfm', () => ({ default: () => {} }));

// jsdom doesn't implement scrollTo or scrollIntoView
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function makeCoachMessage(content: string, id = 'coach-1'): Message {
  return { id, role: 'coach', content, timestamp: new Date().toISOString() };
}

function makeStudentMessage(content: string, id = 'student-1'): Message {
  return { id, role: 'student', content, timestamp: new Date().toISOString() };
}

describe('InstructionPhase', () => {
  it('renders step progress bar with 3 step dots', () => {
    const messages: Message[] = [
      makeCoachMessage('[STEP: 1] Welcome! Today we are learning about hooks. What is a great first line you remember?'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );
    // Should show step indicator "Step 1 of 3"
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    // Should have the "Learn" label for step 1
    expect(screen.getByText('Learn')).toBeInTheDocument();
  });

  it('parses [STEP: N] from coach messages and creates step dividers', () => {
    const messages: Message[] = [
      makeCoachMessage('[STEP: 1] Welcome to hooks! What is your favorite first line?'),
      makeStudentMessage('I like "It was a dark and stormy night"'),
      makeCoachMessage('[STEP: 2] Great! Let me teach you four types of hooks. First up: The Question Hook.'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );
    // Should show step 2 as current
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    // Step divider should appear
    expect(screen.getByText('Step 2: Practice')).toBeInTheDocument();
  });

  it('strips [STEP: N] from displayed coach message text', () => {
    const messages: Message[] = [
      makeCoachMessage('[STEP: 1] Welcome to our lesson on hooks!'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );
    // The marker should be stripped from the rendered text
    expect(screen.getByText('Welcome to our lesson on hooks!')).toBeInTheDocument();
    expect(screen.queryByText(/\[STEP/)).not.toBeInTheDocument();
  });

  it('shows quick-answer card when coach message has [EXPECTS_RESPONSE]', () => {
    const messages: Message[] = [
      makeCoachMessage('[STEP: 1] Today we learn about hooks! What is the best first line you remember?\n\n[EXPECTS_RESPONSE]'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );
    // Should show the quick-answer input
    expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
  });

  it('submitting answer calls onSendMessage and shows coach response', async () => {
    const onSendMessage = vi.fn().mockResolvedValue({
      id: 'coach-reply',
      role: 'coach',
      content: 'Great choice! That opening works because it creates curiosity. Now, let me show you the techniques.',
      timestamp: new Date().toISOString(),
    });
    const messages: Message[] = [
      makeCoachMessage('[STEP: 1] What is the best first line of a book you remember?\n\n[EXPECTS_RESPONSE]'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onSendMessage={onSendMessage}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );

    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(input, { target: { value: 'It was a dark and stormy night' } });
    fireEvent.click(screen.getByText('Done ✓'));

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith('It was a dark and stormy night');
    });

    await waitFor(() => {
      expect(screen.getByText(/Great choice!/)).toBeInTheDocument();
    });
  });

  it('updates step progress when new [STEP: N] received in response', async () => {
    const onSendMessage = vi.fn().mockResolvedValue({
      id: 'coach-reply',
      role: 'coach',
      content: '[STEP: 2] Now let me teach you the four hook types. First: the Question Hook. Can you think of a question that would make someone want to keep reading?\n\n[EXPECTS_RESPONSE]',
      timestamp: new Date().toISOString(),
    });
    const messages: Message[] = [
      makeCoachMessage('[STEP: 1] What is the best first line you remember?\n\n[EXPECTS_RESPONSE]'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onSendMessage={onSendMessage}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );

    // Start at step 1
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();

    // Submit answer
    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(input, { target: { value: 'My answer' } });
    fireEvent.click(screen.getByText('Done ✓'));

    // After response, step should advance to 2
    await waitFor(() => {
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    });
  });

  it('reconstructs current step from message history on session resume', () => {
    const messages: Message[] = [
      makeCoachMessage('[STEP: 1] Welcome! What is a great hook?', 'c1'),
      makeStudentMessage('A hook grabs your attention', 's1'),
      makeCoachMessage('[STEP: 2] Let me teach you four techniques. The Question Hook starts with a curious question. Can you think of one?', 'c2'),
      makeStudentMessage('What if dogs could talk?', 's2'),
      makeCoachMessage('[STEP: 3] Here is a real example of a hook in action. Which technique did the writer use?', 'c3'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );
    // Should be on step 3 after resuming
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    // Step dividers should exist for steps 2 and 3
    expect(screen.getByText('Step 2: Practice')).toBeInTheDocument();
    expect(screen.getByText('Step 3: Check')).toBeInTheDocument();
  });

  it('"Ask" button opens free-form chat input', () => {
    // Message without a question → no active QuickAnswerCard → shows Continue + Ask
    const messages: Message[] = [
      makeCoachMessage('[STEP: 1] Welcome! Today we learn about hooks.'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onSendMessage={vi.fn().mockResolvedValue(null)}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );

    // Click "Ask" (shortened label next to Continue button)
    fireEvent.click(screen.getByText('Ask'));

    // Should show the question input with coach name
    expect(screen.getByPlaceholderText(/Ask Ollie a question/)).toBeInTheDocument();
    // Should show Send and Cancel buttons
    expect(screen.getByText('Send')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows typing indicator while waiting for response', async () => {
    let resolveResponse: (value: Message) => void;
    const responsePromise = new Promise<Message>((resolve) => {
      resolveResponse = resolve;
    });
    const onSendMessage = vi.fn().mockReturnValue(responsePromise);

    const messages: Message[] = [
      makeCoachMessage('[STEP: 1] What is the best opening line you know?\n\n[EXPECTS_RESPONSE]'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onSendMessage={onSendMessage}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );

    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(input, { target: { value: 'My answer' } });
    fireEvent.click(screen.getByText('Done ✓'));

    // Typing indicator should appear
    await waitFor(() => {
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    });

    // Resolve the response
    resolveResponse!({
      id: 'coach-reply',
      role: 'coach',
      content: 'That is wonderful!',
      timestamp: new Date().toISOString(),
    });

    // Typing indicator should disappear
    await waitFor(() => {
      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
    });
  });

  it('renders multiple coach/student messages in order', () => {
    const messages: Message[] = [
      makeCoachMessage('[STEP: 1] Welcome! What do you know about hooks?', 'c1'),
      makeStudentMessage('They grab attention!', 's1'),
      makeCoachMessage('That is right! Hooks make readers curious. Ready to learn the four types?', 'c2'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );
    // All messages should be rendered
    expect(screen.getByText('Welcome! What do you know about hooks?')).toBeInTheDocument();
    expect(screen.getByText('They grab attention!')).toBeInTheDocument();
    expect(screen.getByText(/That is right!/)).toBeInTheDocument();
  });
});
