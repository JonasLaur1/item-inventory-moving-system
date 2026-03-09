import { type ReactNode, useMemo } from "react";
import { type ViewStyle, View } from "react-native";

type CardGridProps<T> = {
  items: T[];
  compact: boolean;
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, contentStyle: ViewStyle, index: number) => ReactNode;
  itemMinHeight?: number;
  className?: string;
  footer?: (contentStyle: ViewStyle) => ReactNode;
};

export function CardGrid<T>({
  items,
  compact,
  keyExtractor,
  renderItem,
  itemMinHeight,
  className = "",
  footer,
}: CardGridProps<T>) {
  const columnStyle = useMemo<ViewStyle>(
    () => ({
      width: compact ? "100%" : "48.5%",
    }),
    [compact],
  );

  const contentStyle = useMemo<ViewStyle>(
    () => ({
      ...(typeof itemMinHeight === "number" ? { minHeight: itemMinHeight } : {}),
    }),
    [itemMinHeight],
  );

  return (
    <View className={`flex-row flex-wrap justify-between gap-y-3 ${className}`}>
      {items.map((item, index) => (
        <View key={keyExtractor(item, index)} style={columnStyle}>
          {renderItem(item, contentStyle, index)}
        </View>
      ))}
      {footer ? <View style={columnStyle}>{footer(contentStyle)}</View> : null}
    </View>
  );
}
