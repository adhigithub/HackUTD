import { SymbolView } from 'expo-symbols';
import { useState, type ComponentRef, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldHandle = ComponentRef<typeof TextInput>;

type TextFieldProps = Omit<TextInputProps, 'ref'> & {
  label: string;
  hint?: string;
  ref?: Ref<TextFieldHandle>;
};

const EYE_SIZE = 20;
const EYE_HIT_WIDTH = 44;

export function TextField({ label, hint, style, ref, secureTextEntry, ...rest }: TextFieldProps) {
  const theme = useTheme();
  // Password fields get an eye button that shows/hides what's typed. Starts hidden.
  const [revealed, setRevealed] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View>
        <TextInput
          ref={ref}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={isPassword && !revealed}
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
            isPassword && styles.inputWithEye,
            style,
          ]}
          {...rest}
        />
        {isPassword && (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            style={({ pressed }) => [styles.eye, pressed && { opacity: 0.6 }]}>
            <SymbolView
              name={
                revealed
                  ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                  : { ios: 'eye', android: 'visibility', web: 'visibility' }
              }
              tintColor={theme.textSecondary}
              size={EYE_SIZE}
            />
          </Pressable>
        )}
      </View>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.one },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  // Keep typed text from running underneath the eye button.
  inputWithEye: { paddingRight: EYE_HIT_WIDTH + Spacing.one },
  eye: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: EYE_HIT_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
