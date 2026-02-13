import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '@/components/shared/ChatInput';

describe('ChatInput', () => {
  it('calls onSend on Enter with non-empty text', () => {
    const onSend = vi.fn();
    render(<ChatInput value="hello" onChange={vi.fn()} onSend={onSend} />);

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSend).toHaveBeenCalled();
  });

  it('does not call onSend on Enter with empty text', () => {
    const onSend = vi.fn();
    render(<ChatInput value="" onChange={vi.fn()} onSend={onSend} />);

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disabled state prevents interaction', () => {
    render(<ChatInput value="hello" onChange={vi.fn()} onSend={vi.fn()} disabled={true} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('onChange fires on typing', () => {
    const onChange = vi.fn();
    render(<ChatInput value="" onChange={onChange} onSend={vi.fn()} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalledWith('test');
  });
});
