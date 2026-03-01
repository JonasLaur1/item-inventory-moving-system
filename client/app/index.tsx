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
import { router } from "expo-router";

const onLogin = (): void => {
  router.push("/(tabs)");
};

const onForgot = (): void => {
  router.push("/forgotpass");
};

const onRegister = (): void => {
  router.push("/register");
};
export default function App() {
  const [showPassword, setShowPassword] = useState(false);

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

                <Text className="mt-5 text-4xl font-bold text-text-primary">BoxIt</Text>
                <Text className="mt-2 text-sm text-text-tertiary">
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
                    <Text className="text-sm font-medium text-text-secondary">Password</Text>
                    <Pressable hitSlop={8} onPress={onForgot}>
                      <Text className="text-xs font-semibold text-text-link">Forgot Password?</Text>
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
                          color={Colors.dark.textTertiary}
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
                onPress={onLogin}
                rightIcon={
                  <Feather name="arrow-right" size={18} color={Colors.dark.bgBase} />
                }
              />

              <View className="mt-8 flex-row items-center">
                <View className="h-px flex-1 bg-text-tertiary/20" />
                <Text className="mx-4 text-sm text-text-tertiary">Or continue with</Text>
                <View className="h-px flex-1 bg-text-tertiary/20" />
              </View>

              <View className="mt-8">
                <Button
                  label="Google"
                  variant="secondary"
                  leftIcon={
                    <AntDesign
                      name="google"
                      size={16}
                      color={Colors.dark.textPrimary}
                    />
                  }
                />
              </View>

              <View className="mt-auto pt-10 flex-row items-center justify-center">
                <Text className="text-sm text-text-tertiary">
                  Don&apos;t have an account?{" "}
                </Text>
                <Pressable hitSlop={8} onPress={onRegister}>
                  <Text className="text-sm font-bold text-text-link">Sign Up</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
