import { Colors } from "@/constants/theme";
import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const palette = Colors.dark;
  const strengthSegments = [1, 2, 3, 0];

  const onRegister = (): void => {
    router.push("/(tabs)");
  };

  const onLogin = (): void => {
    router.push("/");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bgBase }}>
      <StatusBar style="light" />
      <View className="flex-1" style={{ backgroundColor: palette.bgBase }}>
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
              <View
                className="items-center mt-6"
              >
                <View
                  className="items-center justify-center rounded-2xl"
                  style={{
                    width: 60,
                    height: 60,
                    backgroundColor: palette.primary,
                    shadowColor: palette.primary,
                    shadowOpacity: 0.35,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 10 },
                    elevation: 10,
                  }}
                >
                  <Feather name="package" size={28} color={palette.textPrimary} />
                </View>

                <Text
                  className="mt-5 text-4xl font-bold"
                  style={{ color: palette.textPrimary }}
                >
                  Create Account
                </Text>
                <Text
                  className="mt-2 text-sm text-center"
                  style={{ color: palette.textTertiary }}
                >
                  Start your smart move today with AI-powered packing.
                </Text>
              </View>

              <View className="mt-12 gap-4">
                <FormInput
                  label="Full Name"
                  placeholder="John Doe"
                  leftIcon="user"
                  autoCapitalize="words"
                  autoCorrect={false}
                  showDefaultBorder={false}
                />

                <FormInput
                  label="Email Address"
                  placeholder="hello@example.com"
                  leftIcon="mail"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  showDefaultBorder={false}
                />

                <FormInput
                  label="Password"
                  placeholder="........"
                  leftIcon="lock"
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
                        color={palette.textTertiary}
                      />
                    </Pressable>
                  }
                />

                <View className="mt-4">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-xs"
                      style={{ color: withAlpha(palette.textTertiary, 0.95) }}
                    >
                      Password Strength
                    </Text>
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: palette.primary }}
                    >
                      Strong
                    </Text>
                  </View>

                  <View className="mt-2 flex-row gap-2">
                    {strengthSegments.map((active, index) => (
                      <View
                        key={index}
                        className="h-1 flex-1 rounded-full"
                        style={{
                          backgroundColor: active
                            ? palette.primary
                            : withAlpha(palette.textTertiary, 0.3),
                        }}
                      />
                    ))}
                  </View>
                </View>

                <Button
                  label="Get Started"
                  className="mt-8"
                  textClassName="font-bold"
                  onPress={onRegister}
                  rightIcon={
                    <Feather name="arrow-right" size={18} color={palette.bgBase} />
                  }
                />

                <View
                  className="mt-6 h-px"
                  style={{ backgroundColor: withAlpha(palette.textTertiary, 0.15) }}
                />

                <View className="mt-4 flex-row items-center justify-center">
                  <Text
                    className="text-sm"
                    style={{ color: withAlpha(palette.textTertiary, 0.95) }}
                  >
                    Already have an account?{" "}
                  </Text>
                  <Pressable hitSlop={8} onPress={onLogin}>
                    <Text className="text-sm font-bold" style={{ color: palette.primary }}>
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
