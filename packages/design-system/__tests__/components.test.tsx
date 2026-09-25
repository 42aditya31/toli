import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  AmountDisplay,
  Banner,
  HoldButton,
  Keypad,
  keypadKeys,
  Money,
  Segmented,
  Stamp,
  Stub,
  StubBanner,
  SyncPill,
  TabBar,
  TearOverlay,
  TicketCard,
  ToastProvider,
  useToast,
} from '../src/index';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const wrap = (ui: React.ReactElement) =>
  render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);

describe('Money (13 §10: every money value has a spoken label)', () => {
  it('formats with the engine and speaks in words', async () => {
    await wrap(<Money amount={120000n} currency="INR" spokenPrefix="Rahul owes" />);
    expect(screen.getByText('₹1,200')).toBeTruthy();
    expect(screen.getByLabelText('Rahul owes one thousand two hundred rupees')).toBeTruthy();
  });
  it('signs with + and a true minus, never by colour alone', async () => {
    await wrap(<Money amount={-120000n} currency="INR" signed />);
    expect(screen.getByText('−₹1,200')).toBeTruthy();
  });
});

describe('TicketCard, Stub, Stamp', () => {
  it('renders both halves of the ticket', async () => {
    await wrap(
      <TicketCard top={<RNText>You are owed</RNText>} bottom={<RNText>Group spent</RNText>} />,
    );
    expect(screen.getByText('You are owed')).toBeTruthy();
    expect(screen.getByText('Group spent')).toBeTruthy();
  });
  it('a stub reads as one element: name and amount', async () => {
    await wrap(<Stub initials="R" name="Rahul" amount="₹1,200" />);
    expect(screen.getByLabelText('Rahul, ₹1,200')).toBeTruthy();
  });
  it('a stamp shows its word', async () => {
    await wrap(<Stamp label="SETTLED" />);
    expect(screen.getByText('SETTLED')).toBeTruthy();
  });
});

describe('Keypad + AmountDisplay (D-013)', () => {
  it('INR has 00; decimal currencies get "."', async () => {
    expect(keypadKeys(false)).toContain('00');
    expect(keypadKeys(true)).toContain('.');
    expect(keypadKeys(true)).not.toContain('00');
  });
  it('reports every key press, with spoken names', async () => {
    const onKey = jest.fn();
    await wrap(<Keypad onKey={onKey} />);
    await fireEvent.press(screen.getByLabelText('7'));
    await fireEvent.press(screen.getByLabelText('Double zero'));
    await fireEvent.press(screen.getByLabelText('Delete'));
    expect(onKey.mock.calls.map((c) => c[0])).toEqual(['7', '00', '⌫']);
  });
  it('keys are at least 48 high', async () => {
    await wrap(<Keypad onKey={() => {}} />);
    const key = screen.getByLabelText('5');
    const flat = Object.assign({}, ...[key.props.style].flat(3));
    expect((flat as { minHeight: number }).minHeight).toBeGreaterThanOrEqual(48);
  });
  it('shows a faded 0 until a key is pressed', async () => {
    await wrap(<AmountDisplay symbol="₹" digits="" spoken="" />);
    expect(screen.getByLabelText('No amount yet')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });
});

describe('HoldButton (D-012)', () => {
  const confirm = { title: 'Send stubs?', action: 'Tear & send' };
  it('releasing early cancels: nothing is sent', async () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    await wrap(
      <HoldButton label="Hold to tear & send stubs" onComplete={onComplete} confirm={confirm} />,
    );
    const btn = screen.getByLabelText('Hold to tear & send stubs');
    await fireEvent(btn, 'pressIn');
    await act(() => {
      jest.advanceTimersByTime(300);
    });
    await fireEvent(btn, 'pressOut');
    await act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onComplete).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
  it('accessible mode: a tap opens the confirm sheet, and confirming completes', async () => {
    const onComplete = jest.fn();
    await wrap(
      <HoldButton
        label="Hold to tear & send stubs"
        onComplete={onComplete}
        confirm={confirm}
        tapInstead
      />,
    );
    await fireEvent.press(screen.getByLabelText('Hold to tear & send stubs'));
    expect(screen.getByText('Send stubs?')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Tear & send'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
  it('shows the disabled reason and never completes', async () => {
    const onComplete = jest.fn();
    await wrap(
      <HoldButton
        label="Hold"
        disabled
        disabledLabel="Needs internet"
        onComplete={onComplete}
        confirm={confirm}
        tapInstead
      />,
    );
    expect(screen.getByText('Needs internet')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Hold'));
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('Segmented, Banner, SyncPill, TabBar', () => {
  it('Segmented reports the picked value and marks the selected tab', async () => {
    const onChange = jest.fn();
    await wrap(
      <Segmented
        options={[
          { value: 'simplified', label: 'Simplified' },
          { value: 'direct', label: 'Direct' },
        ]}
        value="simplified"
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByText('Direct'));
    expect(onChange).toHaveBeenCalledWith('direct');
    expect(screen.getAllByRole('tab')[0]?.props.accessibilityState).toMatchObject({
      selected: true,
    });
  });
  it('a warning banner is an alert with words, not colour alone', async () => {
    await wrap(<Banner tone="warning">1 change couldn't be saved.</Banner>);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText("1 change couldn't be saved.")).toBeTruthy();
  });
  it('SyncPill announces what is syncing', async () => {
    await wrap(<SyncPill label="Syncing Goa Weekend · 3 changes" />);
    expect(screen.getByLabelText('Syncing Goa Weekend · 3 changes')).toBeTruthy();
  });
  it('R1a tab bar: Trip · (+) · Members', async () => {
    const onAdd = jest.fn();
    await wrap(
      <TabBar
        tabs={[
          { key: 'trip', label: 'Trip' },
          { key: 'members', label: 'Members' },
        ]}
        active="trip"
        onTab={() => {}}
        onAdd={onAdd}
      />,
    );
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel)).toEqual([
      'Trip',
      'Members',
    ]);
    await fireEvent.press(screen.getByLabelText('Add expense'));
    expect(onAdd).toHaveBeenCalled();
  });
});

describe('StubBanner (screens/notifications)', () => {
  it('shows the exact stub copy and the Pay via UPI action', async () => {
    const onPay = jest.fn();
    await wrap(
      <StubBanner
        tripName="GOA WEEKEND"
        when="NOW"
        message={['Aditya tore you a stub for ', 'Dinner at Thalassa']}
        amount="₹1,200"
        action={{ label: 'Pay via UPI', icon: 'upi', onPress: onPay }}
      />,
    );
    expect(screen.getByText('TOLI · GOA WEEKEND')).toBeTruthy();
    expect(screen.getByText('₹1,200')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Pay via UPI'));
    expect(onPay).toHaveBeenCalled();
  });
  it('the paid state uses honest copy instead of the button', async () => {
    await wrap(
      <StubBanner
        tripName="GOA WEEKEND"
        when="NOW"
        message={['Aditya tore you a stub']}
        paidNote="✓ Marked as paid · sending when you're online"
        action={{ label: 'Pay via UPI', onPress: () => {} }}
      />,
    );
    expect(screen.getByText("✓ Marked as paid · sending when you're online")).toBeTruthy();
    expect(screen.queryByLabelText('Pay via UPI')).toBeNull();
  });
});

describe('TearOverlay (13 §7.3)', () => {
  const props = {
    label: 'New expense',
    tripName: 'Goa Weekend',
    title: 'Cab to Baga',
    amount: '₹800',
    sub: 'Rahul paid · split 4 ways',
    pieces: [
      { name: 'Aditya', initials: 'A', amount: '₹200' },
      { name: 'Neha', initials: 'N', amount: '₹200' },
    ],
  };
  it('a tap skips it straight to the end', async () => {
    const onDone = jest.fn();
    await wrap(<TearOverlay {...props} onDone={onDone} />);
    await fireEvent.press(screen.getByLabelText('Skip'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
  it('finishes on its own and says STUBS READY, never "sent"', async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    await wrap(<TearOverlay {...props} onDone={onDone} />);
    expect(screen.getByText('TEARING')).toBeTruthy();
    await act(() => {
      jest.advanceTimersByTime(1350 + 780 + 2 * 130 + 10);
    });
    expect(screen.getByText('STUBS READY')).toBeTruthy();
    await act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
  it('Reduce Motion: not shown at all; the caller shows its toast', async () => {
    const reduced = Reanimated.useReducedMotion as jest.Mock;
    reduced.mockReturnValue(true);
    const onDone = jest.fn();
    await wrap(<TearOverlay {...props} onDone={onDone} />);
    expect(screen.queryByText('TEARING')).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
    reduced.mockReturnValue(false);
  });
});

describe('Toast', () => {
  function Shower() {
    const show = useToast();
    return <RNText onPress={() => show('Saved · sending when you’re online')}>go</RNText>;
  }
  it('shows a message from anywhere, then goes away', async () => {
    jest.useFakeTimers();
    await wrap(
      <ToastProvider>
        <Shower />
      </ToastProvider>,
    );
    await fireEvent.press(screen.getByText('go'));
    expect(screen.getByText('Saved · sending when you’re online')).toBeTruthy();
    await act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('Saved · sending when you’re online')).toBeNull();
    jest.useRealTimers();
  });
});
