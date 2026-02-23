import { Colors } from "@/constants/theme";
import { AntDesign, Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Button } from "@/components/button";
import { FormInput } from "@/components/form-input";
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

export default function App() {
  const palette = Colors.dark;
  const [showPassword, setShowPassword] = useState(false);

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
              <View className="items-center mt-6">
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
                  BoxIt
                </Text>
                <Text
                  className="mt-2 text-sm"
                  style={{ color: palette.textTertiary }}
                >
                  Smart moving & inventory assistant
                </Text>
              </View>

              <View className="mt-12 gap-4">
                <FormInput
                  label="Email Address"
                  placeholder="hello@example.com"
                  leftIcon="mail"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  showDefaultBorder={false}
                />

                <View className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-sm font-medium"
                      style={{ color: palette.textSecondary }}
                    >
                      Password
                    </Text>
                    <Pressable hitSlop={8}>
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: palette.primary }}
                      >
                        Forgot Password?
                      </Text>
                    </Pressable>
                  </View>
                  <FormInput
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
                </View>
              </View>

              <Button
                label="Sign In"
                className="mt-8"
                textClassName="font-bold"
                rightIcon={
                  <Feather name="arrow-right" size={18} color={palette.bgBase} />
                }
              />

              <View className="mt-8 flex-row items-center">
                <View
                  className="flex-1 h-px"
                  style={{ backgroundColor: withAlpha(palette.textTertiary, 0.2) }}
                />
                <Text
                  className="mx-4 text-sm"
                  style={{ color: palette.textTertiary }}
                >
                  Or continue with
                </Text>
                <View
                  className="flex-1 h-px"
                  style={{ backgroundColor: withAlpha(palette.textTertiary, 0.2) }}
                />
              </View>

              <View className="mt-8">
                <Button
                  label="Google"
                  variant="secondary"
                  leftIcon={
                    <AntDesign
                      name="google"
                      size={16}
                      color={palette.textPrimary}
                    />
                  }
                />
              </View>

              <View className="mt-auto pt-10 flex-row items-center justify-center">
                <Text className="text-sm" style={{ color: palette.textTertiary }}>
                  Don&apos;t have an account?{" "}
                </Text>
                <Pressable hitSlop={8}>
                  <Text
                    className="text-sm font-bold"
                    style={{ color: palette.primary }}
                  >
                    Sign Up
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
