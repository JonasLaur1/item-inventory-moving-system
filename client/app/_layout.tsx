import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";
import "../global.css";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authService } from "@/lib/auth.service";

const PUBLIC_ONLY_ROUTES = new Set(["index", "register", "forgotpass"]);
const AUTH_REQUIRED_ROUTES = new Set(["(tabs)"]);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const currentRootSegment = segments[0];
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      try {
        const session = await authService.getSession();
        if (isMounted) {
          setHasSession(Boolean(session));
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    void bootstrapSession();

    const {
      data: { subscription },
    } = authService.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;

    const currentRoute = currentRootSegment ?? "index";
    const isPublicOnlyRoute = PUBLIC_ONLY_ROUTES.has(currentRoute);
    const isAuthRequiredRoute = AUTH_REQUIRED_ROUTES.has(currentRoute);

    if (hasSession && isPublicOnlyRoute) {
      router.replace("/(tabs)");
      return;
    }

    if (!hasSession && isAuthRequiredRoute) {
      router.replace("/");
    }
  }, [currentRootSegment, hasSession, isAuthLoading, router]);

  if (isAuthLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-base">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="index">
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgotpass" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="room/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
