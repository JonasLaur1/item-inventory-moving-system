import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { TextInput, type TextInputProps, View } from "react-native";

type SearchBarProps = TextInputProps & {
  containerClassName?: string;
  inputClassName?: string;
};

export function SearchBar({
  containerClassName = "",
  inputClassName = "",
  placeholder = "Search",
  placeholderTextColor,
  selectionColor,
  ...props
}: SearchBarProps) {
  return (
    <View
      className={`h-[48px] flex-row items-center rounded-control border border-border-default bg-bg-elevated/70 px-4 ${containerClassName}`}
    >
      <Feather name="search" size={16} color={Colors.dark.textTertiary} />
      <TextInput
        className={`ml-3 flex-1 text-sm text-text-primary ${inputClassName}`}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor ?? Colors.dark.textTertiary}
        selectionColor={selectionColor ?? Colors.dark.primary}
        {...props}
      />
    </View>
  );
}
