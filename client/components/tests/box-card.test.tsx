import { render, screen, fireEvent } from '@testing-library/react-native';
import { BoxCard, type InventoryBox } from '@/components/inventory/box-card';

jest.mock('@/hooks/use-theme-preference', () => ({
  useThemePreference: () => ({ resolvedTheme: 'dark' }),
}));

const baseBox: InventoryBox = {
  id: 'box-1',
  label: 'Kitchen Essentials',
  room: 'Kitchen',
  itemsCount: 12,
  isFragile: false,
  status: 'Packed',
  updatedAt: 'Jan 5',
};

describe('BoxCard', () => {
  it('renders box label and room', () => {
    render(<BoxCard box={baseBox} />);
    expect(screen.getByText('Kitchen Essentials')).toBeTruthy();
    expect(screen.getByText('Kitchen')).toBeTruthy();
  });

  it('renders item count text', () => {
    render(<BoxCard box={baseBox} />);
    expect(screen.getByText('12 items')).toBeTruthy();
  });

  it('fires onPressOpen when Open button is pressed', () => {
    const onPressOpen = jest.fn();
    render(<BoxCard box={baseBox} onPressOpen={onPressOpen} />);
    fireEvent.press(screen.getByText('Open'));
    expect(onPressOpen).toHaveBeenCalledWith(baseBox);
  });

  it('fires onPressEdit when Edit button is pressed', () => {
    const onPressEdit = jest.fn();
    render(<BoxCard box={baseBox} onPressEdit={onPressEdit} />);
    fireEvent.press(screen.getByText('Edit'));
    expect(onPressEdit).toHaveBeenCalledWith(baseBox);
  });

  it('Open button has accessibilityLabel including box label', () => {
    render(<BoxCard box={baseBox} />);
    expect(screen.getByLabelText('Open box Kitchen Essentials')).toBeTruthy();
  });
});
