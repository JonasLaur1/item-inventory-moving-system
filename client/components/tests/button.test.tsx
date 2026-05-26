import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Button } from '@/components/button';

jest.mock('@/hooks/use-theme-preference', () => ({
  useThemePreference: () => ({ resolvedTheme: 'dark' }),
}));

describe('Button', () => {
  it('renders the label text', () => {
    render(<Button label="Submit" />);
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('renders without crashing with variant="primary"', () => {
    render(<Button label="Primary" variant="primary" />);
    expect(screen.getByText('Primary')).toBeTruthy();
  });

  it('renders without crashing with variant="secondary"', () => {
    render(<Button label="Secondary" variant="secondary" />);
    expect(screen.getByText('Secondary')).toBeTruthy();
  });

  it('fires onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button label="Press me" onPress={onPress} />);
    fireEvent.press(screen.getByText('Press me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Disabled" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders leftIcon when provided', () => {
    render(<Button label="With Left" leftIcon={<Text testID="left-icon">L</Text>} />);
    expect(screen.getByTestId('left-icon')).toBeTruthy();
  });

  it('renders rightIcon when provided', () => {
    render(<Button label="With Right" rightIcon={<Text testID="right-icon">R</Text>} />);
    expect(screen.getByTestId('right-icon')).toBeTruthy();
  });
});
