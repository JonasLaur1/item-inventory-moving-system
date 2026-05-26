import { FilterChip } from "@/components/inventory/filter-chip";
import { Text, View } from "react-native";

type FilterGroupProps<T extends string> = {
  label: string;
  options: readonly T[];
  activeValue: T;
  onSelect: (value: T) => void;
  getLabel?: (option: T) => string;
  className?: string;
};

export function FilterGroup<T extends string>({
  label,
  options,
  activeValue,
  onSelect,
  getLabel,
  className = "",
}: FilterGroupProps<T>) {
  return (
    <View className={className}>
      <Text className="text-xs uppercase tracking-[1px] text-text-tertiary">{label}</Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {options.map((option) => (
          <FilterChip
            key={option}
            label={getLabel ? getLabel(option) : option}
            isActive={activeValue === option}
            onPress={() => onSelect(option)}
          />
        ))}
      </View>
    </View>
  );
}
