import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { type ReactNode } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

type FormInputProps = TextInputProps & {
  containerClassName?: string;
  inputClassName?: string;
  label?: string;
  leftIcon?: keyof typeof Feather.glyphMap;
  rightElement?: ReactNode;
  showDefaultBorder?: boolean;
};

export function FormInput({
  containerClassName = "",
  inputClassName = "",
  label,
  leftIcon,
  rightElement,
  showDefaultBorder = true,
  ...props
}: FormInputProps) {
  const palette = Colors.dark;
  const sharedInputProps = {
    placeholderTextColor: props.placeholderTextColor ?? palette.textSecondary,
    selectionColor: props.selectionColor ?? palette.primary,
    ...props,
  };

  return (
    <View className={`gap-2 ${containerClassName}`}>
      {label ? (
        <Text className="text-sm font-medium text-text-secondary">{label}</Text>
      ) : null}

      {leftIcon || rightElement ? (
        <View className="min-h-[52px] flex-row items-center rounded-control border border-border-strong bg-bg-input px-4">
          {leftIcon ? (
            <Feather
              name={leftIcon}
              size={18}
              color={palette.textSecondary}
              style={{ marginRight: 10 }}
            />
          ) : null}

          <TextInput
            className={`flex-1 py-3 text-base text-text-primary ${inputClassName}`}
            style={props.style}
            {...sharedInputProps}
          />

          {rightElement}
        </View>
      ) : (
        <TextInput
          className={`w-full rounded-control bg-bg-input px-4 py-3 text-base text-text-primary ${showDefaultBorder ? "border border-border-strong" : ""} ${inputClassName}`}
          style={props.style}
          {...sharedInputProps}
        />
      )}
    </View>
  );
}
