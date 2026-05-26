import { render, screen } from '@testing-library/react-native';
import { FragilityBadge } from '@/components/ui/fragility-badge';

describe('FragilityBadge', () => {
  it('renders "Fragile" when isFragile is true', () => {
    render(<FragilityBadge isFragile={true} />);
    expect(screen.getByText('Fragile')).toBeTruthy();
  });

  it('renders "Not fragile" when isFragile is false', () => {
    render(<FragilityBadge isFragile={false} />);
    expect(screen.getByText('Not fragile')).toBeTruthy();
  });
});
