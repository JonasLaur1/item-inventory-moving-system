import { render, screen } from '@testing-library/react-native';
import { BoxStatusPill } from '@/components/ui/box-status-pill';
import type { InventoryBoxStatus } from '@/components/inventory/box-card';

describe('BoxStatusPill', () => {
  const statuses: InventoryBoxStatus[] = ['Packed', 'Delivered', 'Unpacked', 'Not packed'];

  statuses.forEach((status) => {
    it(`renders "${status}"`, () => {
      render(<BoxStatusPill status={status} />);
      expect(screen.getByText(status)).toBeTruthy();
    });
  });
});
