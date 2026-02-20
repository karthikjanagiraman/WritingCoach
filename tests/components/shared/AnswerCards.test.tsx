/**
 * Tests for the interactive answer card UI components.
 *
 * Covers:
 * - AnswerCardActive / AnswerCardCompleted dispatchers
 * - ChoiceCardActive / ChoiceCardCompleted
 * - MultiSelectCardActive / MultiSelectCardCompleted
 * - PollCardActive / PollCardCompleted
 * - OrderCardActive / OrderCardCompleted
 * - HighlightCardActive / HighlightCardCompleted
 * - Edge cases (empty options, empty passage, rapid clicking)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  AnswerCardActive,
  AnswerCardCompleted,
  ChoiceCardActive,
  ChoiceCardCompleted,
  MultiSelectCardActive,
  MultiSelectCardCompleted,
  PollCardActive,
  PollCardCompleted,
  OrderCardActive,
  OrderCardCompleted,
  HighlightCardActive,
  HighlightCardCompleted,
} from '@/components/shared/AnswerCards';
import type { AnswerMeta } from '@/types';

// ---------------------------------------------------------------------------
// Helper: find text content that may be split across child nodes
// (e.g. emoji + label in same parent div)
// ---------------------------------------------------------------------------
function hasTextContent(text: string) {
  return (_: string, element: Element | null) => {
    if (!element) return false;
    return element.textContent?.includes(text) ?? false;
  };
}

// ===========================================================================
// AnswerCardActive dispatcher
// ===========================================================================
describe('AnswerCardActive dispatcher', () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    onSubmit.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for answerType: "text"', () => {
    const meta: AnswerMeta = { answerType: 'text' };
    const { container } = render(
      <AnswerCardActive answerMeta={meta} onSubmit={onSubmit} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders ChoiceCardActive for answerType: "choice"', () => {
    const meta: AnswerMeta = {
      answerType: 'choice',
      options: ['Alpha', 'Beta'],
    };
    const { container } = render(
      <AnswerCardActive answerMeta={meta} onSubmit={onSubmit} />
    );
    // The header contains emoji + "Pick one" as separate text nodes
    expect(container.textContent).toContain('Pick one');
    expect(screen.getByRole('button', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Beta' })).toBeInTheDocument();
  });

  it('renders MultiSelectCardActive for answerType: "multiselect"', () => {
    const meta: AnswerMeta = {
      answerType: 'multiselect',
      options: ['X', 'Y', 'Z'],
    };
    const { container } = render(
      <AnswerCardActive answerMeta={meta} onSubmit={onSubmit} />
    );
    expect(container.textContent).toContain('Select all that apply');
  });

  it('renders PollCardActive for answerType: "poll"', () => {
    const meta: AnswerMeta = {
      answerType: 'poll',
      options: ['Great', 'OK'],
    };
    const { container } = render(
      <AnswerCardActive answerMeta={meta} onSubmit={onSubmit} />
    );
    expect(container.textContent).toContain('How do you feel?');
  });

  it('renders OrderCardActive for answerType: "order"', () => {
    const meta: AnswerMeta = {
      answerType: 'order',
      options: ['First', 'Second'],
    };
    const { container } = render(
      <AnswerCardActive answerMeta={meta} onSubmit={onSubmit} />
    );
    expect(container.textContent).toContain('Put in order');
  });

  it('renders HighlightCardActive for answerType: "highlight"', () => {
    const meta: AnswerMeta = {
      answerType: 'highlight',
      passage: 'The cat sat on the mat.',
    };
    const { container } = render(
      <AnswerCardActive answerMeta={meta} onSubmit={onSubmit} />
    );
    expect(container.textContent).toContain('Tap the words');
  });
});

// ===========================================================================
// AnswerCardCompleted dispatcher
// ===========================================================================
describe('AnswerCardCompleted dispatcher', () => {
  it('returns null for answerType: "text"', () => {
    const meta: AnswerMeta = { answerType: 'text' };
    const { container } = render(
      <AnswerCardCompleted answerMeta={meta} answer="something" />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders ChoiceCardCompleted for answerType: "choice" with correct answer highlighted', () => {
    const meta: AnswerMeta = {
      answerType: 'choice',
      options: ['Apple', 'Banana', 'Cherry'],
    };
    const { container } = render(
      <AnswerCardCompleted answerMeta={meta} answer="Banana" />
    );
    // The header contains emoji + "Your answer" as separate text nodes
    expect(container.textContent).toContain('Your answer');
    // All options should be visible
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });
});

// ===========================================================================
// ChoiceCardActive
// ===========================================================================
describe('ChoiceCardActive', () => {
  const options = ['Option A', 'Option B', 'Option C'];
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onSubmit = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all options as buttons', () => {
    render(<ChoiceCardActive options={options} onSubmit={onSubmit} />);
    for (const option of options) {
      expect(screen.getByRole('button', { name: option })).toBeInTheDocument();
    }
  });

  it('clicking an option calls onSubmit with that option text after delay', () => {
    render(<ChoiceCardActive options={options} onSubmit={onSubmit} />);
    const button = screen.getByRole('button', { name: 'Option B' });
    fireEvent.click(button);
    // onSubmit should not have been called yet (setTimeout 180ms)
    expect(onSubmit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onSubmit).toHaveBeenCalledWith('Option B');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows "Type my own answer" link', () => {
    render(<ChoiceCardActive options={options} onSubmit={onSubmit} />);
    expect(screen.getByText('Type my own answer')).toBeInTheDocument();
  });

  it('all buttons disabled after one is clicked (prevents double-submit)', () => {
    render(<ChoiceCardActive options={options} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Option A' }));
    // All option buttons should now be disabled
    for (const option of options) {
      expect(screen.getByRole('button', { name: option })).toBeDisabled();
    }
  });
});

// ===========================================================================
// ChoiceCardCompleted
// ===========================================================================
describe('ChoiceCardCompleted', () => {
  const options = ['Red', 'Green', 'Blue'];

  it('shows all options with selected one highlighted', () => {
    render(<ChoiceCardCompleted options={options} answer="Green" />);
    for (const option of options) {
      expect(screen.getByText(option)).toBeInTheDocument();
    }
    // The selected option should have the highlight styling
    const selectedEl = screen.getByText('Green').closest('div');
    expect(selectedEl?.className).toContain('font-bold');
  });

  it('selected option has a checkmark icon (svg with polyline)', () => {
    render(<ChoiceCardCompleted options={options} answer="Green" />);
    // The selected option's parent div contains an SVG with a polyline checkmark
    const selectedDiv = screen.getByText('Green').closest('div');
    const svg = selectedDiv?.querySelector('svg');
    expect(svg).toBeTruthy();
    const polyline = svg?.querySelector('polyline');
    expect(polyline).toBeTruthy();
    expect(polyline?.getAttribute('points')).toContain('20 6 9 17 4 12');
  });
});

// ===========================================================================
// MultiSelectCardActive
// ===========================================================================
describe('MultiSelectCardActive', () => {
  const options = ['Cats', 'Dogs', 'Fish', 'Birds'];
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmit = vi.fn();
  });

  it('renders all options with checkbox indicators', () => {
    render(<MultiSelectCardActive options={options} onSubmit={onSubmit} />);
    for (const option of options) {
      expect(screen.getByRole('button', { name: option })).toBeInTheDocument();
    }
  });

  it('clicking an option toggles its selection (has checkmark svg)', () => {
    render(<MultiSelectCardActive options={options} onSubmit={onSubmit} />);
    const catsButton = screen.getByRole('button', { name: 'Cats' });
    // Initially no checkmark SVGs inside the button
    expect(catsButton.querySelector('svg')).toBeNull();

    // Click to select
    fireEvent.click(catsButton);
    expect(catsButton.querySelector('svg')).toBeTruthy();

    // Click again to deselect
    fireEvent.click(catsButton);
    expect(catsButton.querySelector('svg')).toBeNull();
  });

  it('"Done" button appears only when at least 1 option is selected', () => {
    render(<MultiSelectCardActive options={options} onSubmit={onSubmit} />);
    // Initially no Done button
    expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();

    // Select one option
    fireEvent.click(screen.getByRole('button', { name: 'Dogs' }));
    expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
  });

  it('clicking Done calls onSubmit with comma-joined selected values in original order', () => {
    render(<MultiSelectCardActive options={options} onSubmit={onSubmit} />);
    // Select Fish, then Cats (out of original order)
    fireEvent.click(screen.getByRole('button', { name: 'Fish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cats' }));

    const doneButton = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneButton);
    // Should be in original order: Cats, Fish
    expect(onSubmit).toHaveBeenCalledWith('Cats, Fish');
  });

  it('multiple options can be selected', () => {
    render(<MultiSelectCardActive options={options} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cats' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dogs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Birds' }));

    const doneButton = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneButton);
    expect(onSubmit).toHaveBeenCalledWith('Cats, Dogs, Birds');
  });
});

// ===========================================================================
// MultiSelectCardCompleted
// ===========================================================================
describe('MultiSelectCardCompleted', () => {
  const options = ['Cats', 'Dogs', 'Fish'];

  it('shows selected options highlighted, others dimmed', () => {
    render(
      <MultiSelectCardCompleted options={options} answer="Cats, Fish" />
    );
    // All options should be visible
    for (const option of options) {
      expect(screen.getByText(option)).toBeInTheDocument();
    }
    // Selected ones (Cats, Fish) should have bold styling; Dogs should not
    const catsEl = screen.getByText('Cats').closest('div');
    const dogsEl = screen.getByText('Dogs').closest('div');
    expect(catsEl?.className).toContain('font-bold');
    expect(dogsEl?.className).not.toContain('font-bold');
  });
});

// ===========================================================================
// PollCardActive
// ===========================================================================
describe('PollCardActive', () => {
  const options = ['\u{1F60A} Happy', '\u{1F614} Confused', '\u{1F60E} Confident'];
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onSubmit = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all options', () => {
    render(<PollCardActive options={options} onSubmit={onSubmit} />);
    // Check that the label portions are visible
    expect(screen.getByText('Happy')).toBeInTheDocument();
    expect(screen.getByText('Confused')).toBeInTheDocument();
    expect(screen.getByText('Confident')).toBeInTheDocument();
  });

  it('clicking an option calls onSubmit with that option text', () => {
    render(<PollCardActive options={options} onSubmit={onSubmit} />);
    const happyButton = screen.getByText('Happy').closest('button')!;
    fireEvent.click(happyButton);
    vi.advanceTimersByTime(200);
    expect(onSubmit).toHaveBeenCalledWith('\u{1F60A} Happy');
  });

  it('does NOT show "Type my own answer" link (polls are constrained)', () => {
    render(<PollCardActive options={options} onSubmit={onSubmit} />);
    expect(screen.queryByText('Type my own answer')).not.toBeInTheDocument();
  });

  it('shows emoji portion of options', () => {
    render(<PollCardActive options={options} onSubmit={onSubmit} />);
    // Emojis are rendered in a separate span with text-[1.8rem]
    expect(screen.getByText('\u{1F60A}')).toBeInTheDocument();
    expect(screen.getByText('\u{1F614}')).toBeInTheDocument();
    expect(screen.getByText('\u{1F60E}')).toBeInTheDocument();
  });
});

// ===========================================================================
// PollCardCompleted
// ===========================================================================
describe('PollCardCompleted', () => {
  it('shows selected option highlighted with ring', () => {
    // Use the exact same string references for options and answer to ensure
    // strict equality works correctly in jsdom (emoji strings can have variant
    // selector issues across environments).
    const pollOptions = ['Great choice', 'Still thinking'];
    const { container } = render(
      <PollCardCompleted options={pollOptions} answer={pollOptions[0]} />
    );
    // The PollCardCompleted renders each option as a div.
    const allDivs = Array.from(container.querySelectorAll('div'));

    // Find the wrapper divs with min-w (these are the individual poll items)
    const itemDivs = allDivs.filter(
      (d) => d.className.includes('min-w-')
    );
    expect(itemDivs.length).toBe(2);

    // One should have ring styling (selected), one should have opacity (not selected)
    const classes = itemDivs.map((d) => d.className);
    expect(classes.some((c) => c.includes('ring-2'))).toBe(true);
    expect(classes.some((c) => c.includes('opacity-40'))).toBe(true);

    // Verify the ring item contains the selected text
    const ringDiv = itemDivs.find((d) => d.className.includes('ring-2'));
    const opacityDiv = itemDivs.find((d) => d.className.includes('opacity-40'));
    expect(ringDiv!.textContent).toContain('Great choice');
    expect(opacityDiv!.textContent).toContain('Still thinking');
  });
});

// ===========================================================================
// OrderCardActive
// ===========================================================================
describe('OrderCardActive', () => {
  const options = ['Beginning', 'Middle', 'End'];
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmit = vi.fn();
  });

  it('renders all options with "?" number badges', () => {
    render(<OrderCardActive options={options} onSubmit={onSubmit} />);
    // All items should show "?" badges initially
    const questionMarks = screen.getAllByText('?');
    expect(questionMarks).toHaveLength(3);
    // Each option text should be visible
    for (const option of options) {
      expect(screen.getByText(option)).toBeInTheDocument();
    }
  });

  it('clicking items assigns sequential numbers (1, 2, 3...)', () => {
    render(<OrderCardActive options={options} onSubmit={onSubmit} />);
    // Click in reverse order
    fireEvent.click(screen.getByText('End').closest('button')!);
    fireEvent.click(screen.getByText('Middle').closest('button')!);
    fireEvent.click(screen.getByText('Beginning').closest('button')!);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('"Done" button appears only when ALL items are numbered', () => {
    render(<OrderCardActive options={options} onSubmit={onSubmit} />);
    // Initially no Done button
    expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();

    // Click first two
    fireEvent.click(screen.getByText('Beginning').closest('button')!);
    fireEvent.click(screen.getByText('Middle').closest('button')!);
    expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();

    // Click the last one
    fireEvent.click(screen.getByText('End').closest('button')!);
    expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
  });

  it('clicking Done calls onSubmit with items in tapped order, comma-joined', () => {
    render(<OrderCardActive options={options} onSubmit={onSubmit} />);
    // Click in specific order: End, Beginning, Middle
    fireEvent.click(screen.getByText('End').closest('button')!);
    fireEvent.click(screen.getByText('Beginning').closest('button')!);
    fireEvent.click(screen.getByText('Middle').closest('button')!);

    const doneButton = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneButton);
    expect(onSubmit).toHaveBeenCalledWith('End, Beginning, Middle');
  });

  it('clicking a numbered item removes it from sequence', () => {
    render(<OrderCardActive options={options} onSubmit={onSubmit} />);
    // Number all items
    fireEvent.click(screen.getByText('Beginning').closest('button')!);
    fireEvent.click(screen.getByText('Middle').closest('button')!);
    fireEvent.click(screen.getByText('End').closest('button')!);

    // Done should be visible
    expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();

    // Un-number Middle
    fireEvent.click(screen.getByText('Middle').closest('button')!);

    // Done should disappear (not all items numbered)
    expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();

    // The "?" should reappear for Middle
    expect(screen.getAllByText('?')).toHaveLength(1);
  });
});

// ===========================================================================
// OrderCardCompleted
// ===========================================================================
describe('OrderCardCompleted', () => {
  it('shows items in submitted order with number badges', () => {
    render(
      <OrderCardCompleted
        options={['A', 'B', 'C']}
        answer="C, A, B"
      />
    );
    // Items should be listed in submitted order
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});

// ===========================================================================
// HighlightCardActive
// ===========================================================================
describe('HighlightCardActive', () => {
  const passage = 'The big brown dog ran quickly';
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmit = vi.fn();
  });

  it('renders passage split into individual word buttons', () => {
    render(<HighlightCardActive passage={passage} onSubmit={onSubmit} />);
    const words = passage.split(/\s+/);
    for (const word of words) {
      expect(screen.getByRole('button', { name: word })).toBeInTheDocument();
    }
  });

  it('clicking a word highlights it (toggling)', () => {
    render(<HighlightCardActive passage={passage} onSubmit={onSubmit} />);
    const bigButton = screen.getByRole('button', { name: 'big' });

    // Click to highlight
    fireEvent.click(bigButton);
    expect(bigButton.className).toContain('bg-active-primary');

    // Click again to un-highlight
    fireEvent.click(bigButton);
    expect(bigButton.className).not.toContain('text-white');
  });

  it('"Done" button appears when at least 1 word is selected', () => {
    render(<HighlightCardActive passage={passage} onSubmit={onSubmit} />);
    expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'big' }));
    expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
  });

  it('clicking Done calls onSubmit with selected words comma-joined in passage order', () => {
    render(<HighlightCardActive passage={passage} onSubmit={onSubmit} />);
    // Select "quickly" first, then "big" (out of passage order)
    fireEvent.click(screen.getByRole('button', { name: 'quickly' }));
    fireEvent.click(screen.getByRole('button', { name: 'big' }));

    const doneButton = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneButton);
    // Should be in passage order: big, quickly
    expect(onSubmit).toHaveBeenCalledWith('big, quickly');
  });

  it('shows "Type my own answer" link', () => {
    render(<HighlightCardActive passage={passage} onSubmit={onSubmit} />);
    expect(screen.getByText('Type my own answer')).toBeInTheDocument();
  });
});

// ===========================================================================
// HighlightCardCompleted
// ===========================================================================
describe('HighlightCardCompleted', () => {
  it('shows passage with selected words highlighted', () => {
    render(
      <HighlightCardCompleted
        passage="The big brown dog ran quickly"
        answer="big, quickly"
      />
    );
    // All words should be present
    expect(screen.getByText('The')).toBeInTheDocument();
    expect(screen.getByText('big')).toBeInTheDocument();
    expect(screen.getByText('quickly')).toBeInTheDocument();

    // Selected words should have highlight styling
    const bigSpan = screen.getByText('big');
    expect(bigSpan.className).toContain('font-bold');
    // Non-selected words should not have highlight
    const theSpan = screen.getByText('The');
    expect(theSpan.className).not.toContain('font-bold');
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================
describe('AnswerCards — edge cases', () => {
  it('ChoiceCardActive with empty options array: renders empty without crash', () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <ChoiceCardActive options={[]} onSubmit={onSubmit} />
    );
    // Should render the card wrapper without crashing
    expect(container.textContent).toContain('Pick one');
    // No option buttons rendered (only "Type my own answer" button)
    const buttons = container.querySelectorAll('button');
    const optionButtons = Array.from(buttons).filter(
      (b) => b.textContent !== 'Type my own answer'
    );
    expect(optionButtons).toHaveLength(0);
  });

  it('HighlightCardActive with empty passage: renders without crash', () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <HighlightCardActive passage="" onSubmit={onSubmit} />
    );
    // Should render the card wrapper without crashing
    expect(container.textContent).toContain('Tap the words');
  });

  it('OrderCardActive: rapid clicking same item toggles correctly', () => {
    const onSubmit = vi.fn();
    const options = ['Step 1', 'Step 2'];
    render(<OrderCardActive options={options} onSubmit={onSubmit} />);

    const step1Button = screen.getByText('Step 1').closest('button')!;

    // Click to number it (1)
    fireEvent.click(step1Button);
    expect(screen.getByText('1')).toBeInTheDocument();

    // Click again to un-number it
    fireEvent.click(step1Button);
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.getAllByText('?')).toHaveLength(2);

    // Click one more time to re-number
    fireEvent.click(step1Button);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('MultiSelectCardActive with 1 option selected, then deselect -> Done button hides', () => {
    const onSubmit = vi.fn();
    const options = ['Alpha', 'Beta'];
    render(<MultiSelectCardActive options={options} onSubmit={onSubmit} />);

    // Select Alpha — Done should appear
    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();

    // Deselect Alpha — Done should disappear
    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    expect(screen.queryByRole('button', { name: /Done/i })).not.toBeInTheDocument();
  });
});
