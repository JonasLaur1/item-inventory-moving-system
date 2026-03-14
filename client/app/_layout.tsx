import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { vars } from "nativewind";
import "react-native-reanimated";
import "../global.css";
import { ColorPalettes } from "@/constants/theme";
import { ThemePreferenceProvider, useThemePreference } from "@/hooks/use-theme-preference";
import { authService } from "@/lib/auth.service";

const PUBLIC_ONLY_ROUTES = new Set(["index", "register", "forgotpass"]);
const AUTH_REQUIRED_ROUTES = new Set(["(tabs)", "room", "box"]);

function hexToRgbTriplet(hex: string) {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function buildThemeVars(theme: typeof ColorPalettes.light) {
  return vars({
    "--color-bg-base": hexToRgbTriplet(theme.bgBase),
    "--color-bg-elevated": hexToRgbTriplet(theme.bgElevated),
    "--color-bg-input": hexToRgbTriplet(theme.bgInput),
    "--color-bg-disabled": hexToRgbTriplet(theme.bgDisabled),
    "--color-border-default": hexToRgbTriplet(theme.borderDefault),
    "--color-border-subtle": hexToRgbTriplet(theme.borderSubtle),
    "--color-border-strong": hexToRgbTriplet(theme.borderStrong),
    "--color-text-primary": hexToRgbTriplet(theme.textPrimary),
    "--color-text-secondary": hexToRgbTriplet(theme.textSecondary),
    "--color-text-tertiary": hexToRgbTriplet(theme.textTertiary),
    "--color-text-disabled": hexToRgbTriplet(theme.textDisabled),
    "--color-text-link": hexToRgbTriplet(theme.textLink),
  });
}

const themeVars = {
  light: buildThemeVars(ColorPalettes.light),
  dark: buildThemeVars(ColorPalettes.dark),
};

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <RootLayoutContent />
    </ThemePreferenceProvider>
  );
}

function RootLayoutContent() {
  const { resolvedTheme } = useThemePreference();
  const activeThemeVars = resolvedTheme === "dark" ? themeVars.dark : themeVars.light;
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
      <View style={activeThemeVars} className="flex-1 items-center justify-center bg-bg-base">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ThemeProvider value={resolvedTheme === "dark" ? DarkTheme : DefaultTheme}>
      <View style={activeThemeVars} className="flex-1 bg-bg-base">
        <Stack initialRouteName="index">
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="forgotpass" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="room/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="box/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      </View>
    </ThemeProvider>
  );
}
