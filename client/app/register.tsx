import { Colors } from "@/constants/theme";
import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { authService } from "@/lib/auth.service";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const strengthSegments = [1, 2, 3, 0];

  const onRegister = async (): Promise<void> => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername || !trimmedEmail || !password.trim()) {
      setErrorMessage("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await authService.signUp(trimmedUsername, trimmedEmail, password);
      router.replace("/(tabs)");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create account";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onLogin = (): void => {
    router.replace("/");
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
            <View className="flex-1 px-6 pt-8 pb-6">
              <View className="items-center mt-6">
                <View className="h-[60px] w-[60px] items-center justify-center rounded-card bg-primary shadow-card">
                  <Feather name="package" size={28} color={Colors.dark.textPrimary} />
                </View>

                <Text className="mt-5 text-4xl font-bold text-text-primary">
                  Create Account
                </Text>
                <Text className="mt-2 text-center text-sm text-text-tertiary">
                  Start your smart move today with AI-powered packing.
                </Text>
              </View>

              <View className="mt-12 gap-4">
                <FormInput
                  label="Username"
                  placeholder="John Doe"
                  leftIcon="user"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="words"
                  autoCorrect={false}
                  showDefaultBorder={false}
                />

                <FormInput
                  label="Email Address"
                  placeholder="hello@example.com"
                  leftIcon="mail"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  showDefaultBorder={false}
                />

                <FormInput
                  label="Password"
                  placeholder="........"
                  leftIcon="lock"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  showDefaultBorder={false}
                  rightElement={
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={8}
                    >
                      <Feather
                        name={showPassword ? "eye" : "eye-off"}
                        size={18}
                        color={Colors.dark.textTertiary}
                      />
                    </Pressable>
                  }
                />

                <View className="mt-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-text-tertiary">Password Strength</Text>
                    <Text className="text-xs font-semibold text-text-link">Strong</Text>
                  </View>

                  <View className="mt-2 flex-row gap-2">
                    {strengthSegments.map((active, index) => (
                      <View
                        key={index}
                        className={`h-1 flex-1 rounded-full ${active ? "bg-primary" : "bg-text-tertiary/30"}`}
                      />
                    ))}
                  </View>
                </View>

                {errorMessage ? (
                  <Text className="text-sm text-red-400">{errorMessage}</Text>
                ) : null}

                <Button
                  label={isSubmitting ? "Creating account..." : "Get Started"}
                  className="mt-8"
                  textClassName="font-bold"
                  onPress={onRegister}
                  disabled={isSubmitting}
                  rightIcon={
                    isSubmitting ? (
                      <ActivityIndicator
                        size="small"
                        color={Colors.dark.bgBase}
                      />
                    ) : (
                      <Feather
                        name="arrow-right"
                        size={18}
                        color={Colors.dark.bgBase}
                      />
                    )
                  }
                />

                <View className="mt-6 h-px bg-text-tertiary/15" />

                <View className="mt-4 flex-row items-center justify-center">
                  <Text className="text-sm text-text-tertiary">
                    Already have an account?{" "}
                  </Text>
                  <Pressable hitSlop={8} onPress={onLogin}>
                    <Text className="text-sm font-bold text-text-link">
                      Log In
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
