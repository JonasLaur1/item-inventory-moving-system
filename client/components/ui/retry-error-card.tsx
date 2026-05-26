import { useTranslation } from "react-i18next";
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
  retryLabel,
  retryingLabel,
  className = "",
}: RetryErrorCardProps) {
  const { t } = useTranslation();
  const resolvedRetryLabel = retryLabel ?? t("common.retry");
  const resolvedRetryingLabel = retryingLabel ?? t("common.retrying");

  return (
    <View className={`rounded-card border border-border-default bg-bg-elevated/80 p-4 ${className}`}>
      <Text className="text-sm font-semibold text-text-primary">{message}</Text>
      <Button
        label={isRetrying ? resolvedRetryingLabel : resolvedRetryLabel}
        variant="secondary"
        onPress={onRetry}
        disabled={isRetrying}
        className="mt-3"
        textClassName="text-sm"
      />
    </View>
  );
}
