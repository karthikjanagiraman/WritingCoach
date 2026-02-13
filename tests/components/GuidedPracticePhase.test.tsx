import { describe, it, expect, vi, beforeAll } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import GuidedPracticePhase from '@/components/GuidedPracticePhase';
import { renderWithProviders } from '../setup/component-helpers';
import type { Message } from '@/types';

// ChatBubble uses CoachMessage which uses react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));
vi.mock('remark-gfm', () => ({ default: () => {} }));

const mockRouter = { push: vi.fn(), back: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), forward: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

// jsdom doesn't implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function makeMsg(role: 'coach' | 'student', content: string, id?: string): Message {
  return { id: id || `msg-${Math.random().toString(36).slice(2)}`, role, content, timestamp: new Date().toISOString() };
}

describe('GuidedPracticePhase', () => {
  it('renders initial coach messages as chat items', () => {
    const messages: Message[] = [
      makeMsg('coach', 'Let us practice together! What character will your story be about?'),
    ];
    renderWithProviders(
      <GuidedPracticePhase
        onComplete={vi.fn()}
        messages={messages}
      />,
      { tier: 1 }
    );
    expect(screen.getByText('Let us practice together! What character will your story be about?')).toBeInTheDocument();
  });

  it('parses [WRITING_PROMPT: "text"] from coach messages into writing cards', () => {
    const messages: Message[] = [
      makeMsg('coach', 'Great work! Try this:\n\n[WRITING_PROMPT: "Write a sentence about your character."]'),
    ];
    renderWithProviders(
      <GuidedPracticePhase
        onComplete={vi.fn()}
        messages={messages}
      />,
      { tier: 1 }
    );
    // The writing prompt text should appear in a writing card
    expect(screen.getByText('Write a sentence about your character.')).toBeInTheDocument();
    // And the "Your turn to write!" label should be visible
    expect(screen.getByText(/Your turn to write/)).toBeInTheDocument();
  });

  it('creates quick-answer cards when coach message ends with question', () => {
    const messages: Message[] = [
      makeMsg('coach', 'What is your favorite animal?'),
    ];
    renderWithProviders(
      <GuidedPracticePhase
        onComplete={vi.fn()}
        messages={messages}
      />,
      { tier: 1 }
    );
    // Should show an active quick-answer card with a "Type your answer..." placeholder
    expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
  });

  it('submitting a quick answer sends it to onSendMessage', async () => {
    const onSendMessage = vi.fn().mockResolvedValue(
      makeMsg('coach', 'Wonderful choice! Where does the story take place?')
    );
    const messages: Message[] = [
      makeMsg('coach', 'Who is your main character?'),
    ];
    renderWithProviders(
      <GuidedPracticePhase
        onComplete={vi.fn()}
        messages={messages}
        onSendMessage={onSendMessage}
      />,
      { tier: 1 }
    );
    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(input, { target: { value: 'A brave knight' } });
    fireEvent.click(screen.getByText(/Done/));
    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith('A brave knight');
    });
  });

  it('submitting a writing response sends it to onSendMessage', async () => {
    const onSendMessage = vi.fn().mockResolvedValue(
      makeMsg('coach', 'Amazing writing! You are doing great.')
    );
    const messages: Message[] = [
      makeMsg('coach', 'Try this:\n\n[WRITING_PROMPT: "Describe the setting."]'),
    ];
    renderWithProviders(
      <GuidedPracticePhase
        onComplete={vi.fn()}
        messages={messages}
        onSendMessage={onSendMessage}
      />,
      { tier: 1 }
    );
    const textarea = screen.getByPlaceholderText('Start writing here...');
    fireEvent.change(textarea, { target: { value: 'The castle stood tall on the hill.' } });
    fireEvent.click(screen.getByText(/Done/));
    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith('The castle stood tall on the hill.');
    });
  });

  it('shows escape hatch "I\'m ready to write on my own" after 5+ completed exchanges', () => {
    // Build conversation history with 5 completed question-answer exchanges
    const messages: Message[] = [];
    for (let i = 0; i < 5; i++) {
      messages.push(makeMsg('coach', `Question ${i + 1}?`));
      messages.push(makeMsg('student', `Answer ${i + 1}`));
    }
    // End with another question so it's not practice-complete
    messages.push(makeMsg('coach', 'One more question?'));

    renderWithProviders(
      <GuidedPracticePhase
        onComplete={vi.fn()}
        messages={messages}
      />,
      { tier: 1 }
    );
    expect(screen.getByText(/ready to write on my own/)).toBeInTheDocument();
  });

  it('shows "Ready to Write!" button when practice complete', async () => {
    // Provide a coach question, student answer, then onSendMessage returns a wrap-up (no question)
    // This triggers practiceComplete via addCoachMessage path
    const onSendMessage = vi.fn().mockResolvedValue(
      makeMsg('coach', 'Amazing work today. You are ready to write your story!')
    );
    const messages: Message[] = [
      makeMsg('coach', 'What is your favorite part of writing?'),
    ];
    renderWithProviders(
      <GuidedPracticePhase
        onComplete={vi.fn()}
        messages={messages}
        onSendMessage={onSendMessage}
      />,
      { tier: 1 }
    );
    // Submit the quick answer to trigger the coach wrap-up
    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(input, { target: { value: 'I love creating characters' } });
    fireEvent.click(screen.getByText(/Done/));
    await waitFor(() => {
      expect(screen.getByText(/Ready to Write/)).toBeInTheDocument();
    });
  });

  it('calls onComplete when "Ready to Write!" clicked', async () => {
    const onComplete = vi.fn();
    const onSendMessage = vi.fn().mockResolvedValue(
      makeMsg('coach', 'You are ready to write your full story beginning now.')
    );
    const messages: Message[] = [
      makeMsg('coach', 'Tell me about a character you like?'),
    ];
    renderWithProviders(
      <GuidedPracticePhase
        onComplete={onComplete}
        messages={messages}
        onSendMessage={onSendMessage}
      />,
      { tier: 1 }
    );
    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(input, { target: { value: 'A brave explorer' } });
    fireEvent.click(screen.getByText(/Done/));
    await waitFor(() => {
      expect(screen.getByText(/Ready to Write/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Ready to Write/));
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
