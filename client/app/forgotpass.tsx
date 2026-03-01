import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPass() {
  const onBack = (): void => {
    router.push("/");
  };

  const onSendResetLink = (): void => {
    // Placeholder action until API flow is wired.
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <StatusBar style="light" />
      <View className="flex-1 bg-bg-base">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View className="flex-1 px-6 pt-4 pb-6">
              <Pressable
                onPress={onBack}
                hitSlop={8}
                className="self-start p-2 -ml-2"
              >
                <Feather
                  name="arrow-left"
                  size={22}
                  color={Colors.dark.textPrimary}
                />
              </Pressable>

              <View className="items-center mt-10">
                <View className="h-[60px] w-[60px] items-center justify-center rounded-card bg-primary shadow-card">
                  <Feather name="lock" size={28} color={Colors.dark.textPrimary} />
                </View>

                <Text className="mt-12 text-center text-3xl font-bold text-text-primary">
                  Forgot Password?
                </Text>

                <Text className="mt-3 px-4 text-center text-sm leading-5 text-text-tertiary">
                  Enter your email address to receive a password reset link
                </Text>
              </View>

              <View className="mt-12">
                <FormInput
                  label="Email Address"
                  placeholder="name@example.com"
                  leftIcon="mail"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  showDefaultBorder={false}
                />

                <Button
                  label="Send Reset Link"
                  className="mt-6 shadow-card"
                  textClassName="font-bold"
                  onPress={onSendResetLink}
                  rightIcon={
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={Colors.dark.bgBase}
                    />
                  }
                />
              </View>

              <View className="mt-auto pt-12 items-center">
                <Pressable
                  onPress={onBack}
                  hitSlop={8}
                  className="flex-row items-center gap-2"
                >
                  <Feather
                    name="chevron-left"
                    size={16}
                    color={Colors.dark.primary}
                  />
                  <Text className="text-sm font-medium text-text-link">
                    Return to Login
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
