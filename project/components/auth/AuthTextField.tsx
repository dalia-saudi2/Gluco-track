import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { AuthColors as C, AuthFont as F } from '../../constants/AuthColors';

type Props = TextInputProps & {
  icon: React.ReactNode;
  idlePlaceholder: string;
};

export function AuthTextField({ icon, idlePlaceholder, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const hasValue = Boolean(rest.value && String(rest.value).length > 0);
  const showPlaceholder = !focused && !hasValue;

  return (
    <View style={styles.inputWrap}>
      {icon}
      <TextInput
        {...rest}
        style={[styles.input, style]}
        placeholder={showPlaceholder ? idlePlaceholder : ''}
        placeholderTextColor={C.onSurfaceVariant}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 15,
    color: C.onSurface,
  },
});
