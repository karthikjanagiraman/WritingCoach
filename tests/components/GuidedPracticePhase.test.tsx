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
      makeMsg('coach', 'Let us practice together! What character will your story be about?\n\n[EXPECTS_RESPONSE]'),
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

  it('creates quick-answer cards when coach message has [EXPECTS_RESPONSE]', () => {
    const messages: Message[] = [
      makeMsg('coach', 'What is your favorite animal?\n\n[EXPECTS_RESPONSE]'),
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
    // The marker text should NOT be visible
    expect(screen.queryByText(/EXPECTS_RESPONSE/)).not.toBeInTheDocument();
  });

  it('submitting a quick answer sends it to onSendMessage', async () => {
    const onSendMessage = vi.fn().mockResolvedValue(
      makeMsg('coach', 'Wonderful choice! Where does the story take place?\n\n[EXPECTS_RESPONSE]')
    );
    const messages: Message[] = [
      makeMsg('coach', 'Who is your main character?\n\n[EXPECTS_RESPONSE]'),
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
      messages.push(makeMsg('coach', `Question ${i + 1}?\n\n[EXPECTS_RESPONSE]`));
      messages.push(makeMsg('student', `Answer ${i + 1}`));
    }
    // End with another question so practice continues
    messages.push(makeMsg('coach', 'One more question?\n\n[EXPECTS_RESPONSE]'));

    renderWithProviders(
      <GuidedPracticePhase
        onComplete={vi.fn()}
        messages={messages}
      />,
      { tier: 1 }
    );
    expect(screen.getByText(/ready to write on my own/)).toBeInTheDocument();
  });

  it('shows Continue button when coach message has no marker', async () => {
    // Coach sends a statement without [EXPECTS_RESPONSE] — should show Continue, not "Ready to Write!"
    const onSendMessage = vi.fn().mockResolvedValue(
      makeMsg('coach', 'Great observation! 🌟')
    );
    const messages: Message[] = [
      makeMsg('coach', 'What is your favorite part of writing?\n\n[EXPECTS_RESPONSE]'),
    ];
    renderWithProviders(
      <GuidedPracticePhase
        onComplete={vi.fn()}
        messages={messages}
        onSendMessage={onSendMessage}
      />,
      { tier: 1 }
    );
    // Submit the quick answer to trigger the coach response (no marker)
    const input = screen.getByPlaceholderText('Type your answer...');
    fireEvent.change(input, { target: { value: 'I love creating characters' } });
    fireEvent.click(screen.getByText(/Done/));
    await waitFor(() => {
      expect(screen.getByText(/Continue/)).toBeInTheDocument();
    });
    // Should NOT show "Ready to Write!" — that's no longer in the component
    expect(screen.queryByText(/Ready to Write/)).not.toBeInTheDocument();
  });

  it('does not prematurely complete practice when question has emoji after ?', async () => {
    // Emoji after ? without [EXPECTS_RESPONSE] should show Continue button, NOT premature exit
    const onSendMessage = vi.fn().mockResolvedValue(
      makeMsg('coach', 'Tell me! 🗺️')
    );
    const messages: Message[] = [
      makeMsg('coach', 'Who is your hero?\n\n[EXPECTS_RESPONSE]'),
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
    fireEvent.change(input, { target: { value: 'A dragon tamer' } });
    fireEvent.click(screen.getByText(/Done/));
    await waitFor(() => {
      expect(screen.getByText(/Continue/)).toBeInTheDocument();
    });
    // Should NOT show "Ready to Write!" — practice is not complete
    expect(screen.queryByText(/Ready to Write/)).not.toBeInTheDocument();
  });

  it('calls onComplete via escape hatch after 5+ exchanges', () => {
    const onComplete = vi.fn();
    const messages: Message[] = [];
    for (let i = 0; i < 5; i++) {
      messages.push(makeMsg('coach', `Question ${i + 1}?\n\n[EXPECTS_RESPONSE]`));
      messages.push(makeMsg('student', `Answer ${i + 1}`));
    }
    messages.push(makeMsg('coach', 'Another question?\n\n[EXPECTS_RESPONSE]'));

    renderWithProviders(
      <GuidedPracticePhase
        onComplete={onComplete}
        messages={messages}
      />,
      { tier: 1 }
    );
    fireEvent.click(screen.getByText(/ready to write on my own/));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('shows loading state when auto-fetching first practice question', () => {
    // Non-question message with no marker → triggers auto-fetch with loading state
    const onSendMessage = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    const messages: Message[] = [
      makeMsg('coach', 'Great job passing the knowledge check! Let us practice together.'),
    ];
    renderWithProviders(
      <GuidedPracticePhase
        onComplete={vi.fn()}
        messages={messages}
        onSendMessage={onSendMessage}
      />,
      { tier: 1 }
    );
    // Should show the loading state with coach name
    expect(screen.getByText(/setting up your practice/)).toBeInTheDocument();
  });
});
