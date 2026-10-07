import { StyleSheet } from 'react-native';

import { FontAwesome6, Pressable, TextInput, View } from '@/components/scoped';
import { cardSurface, Radius } from '@/constants/theme';
import { useBaseTheme } from '@/hooks/use-theme';

// Raised white search pill with a leading icon and a clear button, for screens on the brand gradient.
export function SearchBar({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  const theme = useBaseTheme();
  return (
    <View style={[styles.bar, cardSurface(theme)]}>
      <FontAwesome6 name="magnifying-glass" size={15} color="#6366F1" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search">
          <FontAwesome6 name="circle-xmark" size={16} color="#9CA3AF" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: Radius.lg,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0, backgroundColor: 'transparent' },
});
