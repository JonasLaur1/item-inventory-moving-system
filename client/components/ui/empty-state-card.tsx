import { Text, View } from "react-native";

type EmptyStateCardProps = {
  title: string;
  description?: string;
  containerClassName?: string;
};

export function EmptyStateCard({
  title,
  description,
  containerClassName = "",
}: EmptyStateCardProps) {
  return (
    <View
      className={`rounded-card border border-border-default bg-bg-elevated/70 p-4 ${containerClassName}`}
    >
      <Text className="text-sm font-semibold text-text-primary">{title}</Text>
      {description ? (
        <Text className="mt-1 text-xs text-text-tertiary">{description}</Text>
      ) : null}
    </View>
  );
}
