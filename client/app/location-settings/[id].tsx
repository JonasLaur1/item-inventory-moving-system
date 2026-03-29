import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { AppModal } from "@/components/ui/app-modal";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { RetryErrorCard } from "@/components/ui/retry-error-card";
import { Colors } from "@/constants/theme";
import { useCollaborators } from "@/hooks/use-collaborators";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { type CollaboratorEntry } from "@/lib/collaborator.service";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LocationSettingsScreen() {
  const { resolvedTheme } = useThemePreference();
  const themeColors = Colors[resolvedTheme];

  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const locationId = useMemo(
    () => (Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "")),
    [params.id],
  );
  const locationName = useMemo(
    () => (Array.isArray(params.name) ? (params.name[0] ?? "") : (params.name ?? "")),
    [params.name],
  );

  const {
    collaborators,
    isLoading,
    isRefreshing,
    isAdding,
    isRemoving,
    errorMessage,
    refresh,
    addByEmail,
    remove,
    clearError,
  } = useCollaborators(locationId);

  const [emailInput, setEmailInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [collaboratorToRemove, setCollaboratorToRemove] = useState<CollaboratorEntry | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    const trimmed = emailInput.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setAddError("Enter a valid email address.");
      return;
    }

    setAddError(null);
    Keyboard.dismiss();

    try {
      await addByEmail(trimmed);
      setEmailInput("");
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Failed to add collaborator.");
    }
  }, [addByEmail, emailInput]);

  const openRemoveModal = useCallback((collaborator: CollaboratorEntry) => {
    setRemoveError(null);
    setCollaboratorToRemove(collaborator);
  }, []);

  const closeRemoveModal = useCallback(() => {
    if (isRemoving) return;
    setCollaboratorToRemove(null);
    setRemoveError(null);
  }, [isRemoving]);

  const confirmRemove = useCallback(async () => {
    if (!collaboratorToRemove) return;

    setRemoveError(null);
    try {
      await remove(collaboratorToRemove.collaboratorId);
      setCollaboratorToRemove(null);
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : "Failed to remove collaborator.");
    }
  }, [collaboratorToRemove, remove]);

  const renderCollaborator = useCallback(
    ({ item }: { item: CollaboratorEntry }) => (
      <View className="mb-3 flex-row items-center justify-between rounded-card border border-border-default bg-bg-elevated px-4 py-3.5">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-text-primary">
            {item.displayName ?? "BoxIt user"}
          </Text>
          <Text className="mt-0.5 text-xs text-text-tertiary">
            Added {new Date(item.addedAt).toLocaleDateString()}
          </Text>
        </View>
        <Pressable
          onPress={() => openRemoveModal(item)}
          hitSlop={8}
          disabled={isRemoving}
          className="h-9 w-9 items-center justify-center rounded-full border border-crimson/40 bg-crimson/10"
        >
          <Feather name="user-minus" size={15} color={themeColors.crimson} />
        </Pressable>
      </View>
    ),
    [isRemoving, openRemoveModal, themeColors.crimson],
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-5">
        <View className="flex-row items-center justify-between pt-3 pb-4">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-card border border-border-default bg-bg-elevated"
          >
            <Feather name="arrow-left" size={18} color={themeColors.textPrimary} />
          </Pressable>
          <View className="items-center">
            <Text className="text-base font-semibold text-text-primary">Location Settings</Text>
            {locationName ? (
              <Text className="text-xs text-text-tertiary">{locationName}</Text>
            ) : null}
          </View>
          <View className="h-10 w-10" />
        </View>

        {errorMessage ? (
          <RetryErrorCard
            message={errorMessage}
            isRetrying={isRefreshing}
            retryingLabel="Refreshing..."
            onRetry={() => {
              clearError();
              void refresh();
            }}
            className="mb-4"
          />
        ) : null}

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={collaborators}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} />
            }
            ListHeaderComponent={
              <View className="mb-5">
                <Text className="mb-3 text-sm font-semibold text-text-secondary">
                  People with access
                </Text>
              </View>
            }
            ListEmptyComponent={
              <EmptyStateCard
                title="No collaborators yet"
                description="Add someone below to give them access to this location."
                containerClassName="mb-6"
              />
            }
            ListFooterComponent={
              <View className="mt-2">
                <Text className="mb-3 text-sm font-semibold text-text-secondary">
                  Add collaborator
                </Text>
                <FormInput
                  value={emailInput}
                  onChangeText={(text) => {
                    setEmailInput(text);
                    setAddError(null);
                  }}
                  placeholder="Email address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isAdding}
                />
                {addError ? (
                  <Text className="mt-2 text-xs text-crimson">{addError}</Text>
                ) : null}
                <Button
                  label={isAdding ? "Adding..." : "Add"}
                  onPress={() => void handleAdd()}
                  disabled={isAdding}
                  className={`${addError ? "mt-3" : "mt-4"}`}
                />
              </View>
            }
            renderItem={renderCollaborator}
          />
        )}
      </View>

      <AppModal
        visible={collaboratorToRemove !== null}
        title="Remove collaborator?"
        description={
          collaboratorToRemove
            ? `Remove ${collaboratorToRemove.displayName ?? "this user"} from this location? They will lose access immediately.`
            : "Remove this collaborator?"
        }
        onRequestClose={closeRemoveModal}
        maxWidth={420}
      >
        {removeError ? <Text className="text-xs text-crimson">{removeError}</Text> : null}

        <View className={`${removeError ? "mt-4" : ""} flex-row gap-3`}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={closeRemoveModal}
            disabled={isRemoving}
            className="flex-1"
          />
          <Button
            label={isRemoving ? "Removing..." : "Remove"}
            variant="secondary"
            onPress={() => void confirmRemove()}
            disabled={isRemoving}
            className="flex-1 border-crimson/60 bg-crimson/10"
            textClassName="text-crimson"
          />
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
