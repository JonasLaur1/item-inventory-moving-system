import { Text, View } from "react-native";

import { Button } from "@/components/button";

type RetryErrorCardProps = {
  message: string;
  isRetrying?: boolean;
  onRetry: () => void;
  retryLabel?: string;
  retryingLabel?: string;
  className?: string;
};

export function RetryErrorCard({
  message,
  isRetrying = false,
  onRetry,
  retryLabel = "Retry",
  retryingLabel = "Retrying...",
  className = "",
}: RetryErrorCardProps) {
  return (
    <View className={`rounded-card border border-border-default bg-bg-elevated/80 p-4 ${className}`}>
      <Text className="text-sm font-semibold text-text-primary">{message}</Text>
      <Button
        label={isRetrying ? retryingLabel : retryLabel}
        variant="secondary"
        onPress={onRetry}
        disabled={isRetrying}
        className="mt-3"
        textClassName="text-sm"
      />
    </View>
  );
}
