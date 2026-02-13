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

describe('InstructionPhase', () => {
  it('splits content by ## headings into multiple cards', () => {
    const messages: Message[] = [
      makeCoachMessage('## Introduction\nWelcome to writing!\n\n## Examples\nHere are examples.'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );
    // Should show step indicator "Step 1 of 2"
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });

  it('single card when no ## headings in content', () => {
    const messages: Message[] = [
      makeCoachMessage('This is a simple lesson without any headings at all.'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );
    expect(screen.getByText('Step 1 of 1')).toBeInTheDocument();
  });

  it('shows step indicator with correct total', () => {
    const messages: Message[] = [
      makeCoachMessage('## Part 1\nContent 1\n\n## Part 2\nContent 2\n\n## Part 3\nContent 3'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('Previous button disabled on first step', () => {
    const messages: Message[] = [
      makeCoachMessage('## Part 1\nContent 1\n\n## Part 2\nContent 2'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );
    const prevButton = screen.getByText('Previous').closest('button')!;
    expect(prevButton).toBeDisabled();
  });

  it('Next button advances to next step', () => {
    const messages: Message[] = [
      makeCoachMessage('## Part 1\nContent 1\n\n## Part 2\nContent 2'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
  });

  it('on last step, shows "Let\u2019s Practice!" button text', () => {
    const messages: Message[] = [
      makeCoachMessage('## Part 1\nContent 1\n\n## Part 2\nContent 2'),
    ];
    renderWithProviders(
      <InstructionPhase
        lessonTitle="Test Lesson"
        messages={messages}
        onComplete={vi.fn()}
      />,
      { tier: 1 }
    );
    // Navigate to last step
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText(/Let\u2019s Practice!/)).toBeInTheDocument();
  });

  it('after clicking "Let\u2019s Practice!", sends readiness message via onSendMessage', async () => {
    const onSendMessage = vi.fn().mockResolvedValue({
      id: 'coach-reply',
      role: 'coach',
      content: 'Great, let me check your understanding!',
      timestamp: new Date().toISOString(),
    });
    const messages: Message[] = [
      makeCoachMessage('## Part 1\nContent 1\n\n## Part 2\nContent 2'),
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
    // Navigate to last step
    fireEvent.click(screen.getByText('Next'));
    // Click "Let's Practice!"
    fireEvent.click(screen.getByText(/Let\u2019s Practice!/));
    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith(
        "I\u2019ve finished reading the lesson and I\u2019m ready to practice!"
      );
    });
  });

  it('button disabled after readySent=true (shows "Answer above \u2191")', async () => {
    const onSendMessage = vi.fn().mockResolvedValue({
      id: 'coach-reply',
      role: 'coach',
      content: 'Answer this question first!',
      timestamp: new Date().toISOString(),
    });
    const messages: Message[] = [
      makeCoachMessage('## Part 1\nContent 1\n\n## Part 2\nContent 2'),
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
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText(/Let\u2019s Practice!/));
    await waitFor(() => {
      expect(screen.getByText(/Answer above/)).toBeInTheDocument();
    });
    const answerButton = screen.getByText(/Answer above/).closest('button')!;
    expect(answerButton).toBeDisabled();
  });

  it('chat input renders and sends messages via onSendMessage', async () => {
    const onSendMessage = vi.fn().mockResolvedValue({
      id: 'coach-reply',
      role: 'coach',
      content: 'Good answer!',
      timestamp: new Date().toISOString(),
    });
    const messages: Message[] = [
      makeCoachMessage('Simple lesson content without headings.'),
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
    // The chat input should have the placeholder with Ollie (tier 1 coach)
    const input = screen.getByPlaceholderText(/Tell Ollie what you think/);
    expect(input).toBeInTheDocument();
    // Type and send
    fireEvent.change(input, { target: { value: 'I understand!' } });
    fireEvent.click(screen.getByLabelText('Send message'));
    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith('I understand!');
    });
  });

  it('displays coach responses in chat area', async () => {
    const onSendMessage = vi.fn().mockResolvedValue({
      id: 'coach-reply',
      role: 'coach',
      content: 'That is a wonderful thought!',
      timestamp: new Date().toISOString(),
    });
    const messages: Message[] = [
      makeCoachMessage('Lesson content here.'),
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
    const input = screen.getByPlaceholderText(/Tell Ollie what you think/);
    fireEvent.change(input, { target: { value: 'My answer' } });
    fireEvent.click(screen.getByLabelText('Send message'));
    await waitFor(() => {
      expect(screen.getByText('That is a wonderful thought!')).toBeInTheDocument();
    });
  });
});
