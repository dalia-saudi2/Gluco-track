import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthColors as C, AuthFont as F } from '../../constants/AuthColors';
import { DiabetesBrandIcon } from './DiabetesBrandIcon';

const YELLOW = '#f5b800';

type Props = {
  compact?: boolean;
};

export function AuthBrandPanel({ compact = false }: Props) {
  const iconSize = compact ? 150 : 220;

  return (
    <LinearGradient
      colors={['#fff4fb', '#f8eeff', '#fff9e8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.panel, compact && styles.panelCompact]}
    >
      <View style={styles.blobPink} />
      <View style={styles.blobPurple} />
      <View style={styles.blobYellow} />

      <View style={styles.content}>
        <View style={[styles.logoFrame, compact && styles.logoFrameCompact]}>
          <DiabetesBrandIcon size={iconSize} />
        </View>

        <View style={styles.brandText}>
          <Text style={[styles.diabetes, compact && styles.diabetesCompact]}>DIABETES</Text>
          <View style={styles.careRow}>
            <View style={[styles.careLine, styles.careLinePurple]} />
            <Text style={styles.careHub}>
              <Text style={styles.careWord}>CARE </Text>
              <Text style={styles.hubWord}>HUB</Text>
            </Text>
            <View style={[styles.careLine, styles.careLineYellow]} />
          </View>
          <Text style={styles.tagline}>SMART CARE. BETTER LIFE.</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 48,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderLeftColor: C.outlineVariant,
  },
  panelCompact: {
    flex: 0,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderLeftWidth: 0,
    borderRadius: 24,
    marginBottom: 8,
  },
  blobPink: {
    position: 'absolute',
    top: -50,
    right: -20,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(224, 64, 160, 0.14)',
  },
  blobPurple: {
    position: 'absolute',
    bottom: -70,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(124, 82, 170, 0.12)',
  },
  blobYellow: {
    position: 'absolute',
    top: '42%',
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 184, 0, 0.12)',
  },
  content: {
    alignItems: 'center',
    gap: 24,
    maxWidth: 420,
    width: '100%',
  },
  logoFrame: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(224, 64, 160, 0.2)',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 6,
  },
  logoFrameCompact: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 22,
  },
  brandText: {
    alignItems: 'center',
    gap: 10,
  },
  diabetes: {
    fontFamily: F.bold,
    fontSize: 34,
    letterSpacing: 2,
    color: C.primary,
  },
  diabetesCompact: {
    fontSize: 24,
    letterSpacing: 1.5,
  },
  careRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  careLine: {
    width: 36,
    height: 2,
    borderRadius: 1,
  },
  careLinePurple: {
    backgroundColor: C.secondary,
  },
  careLineYellow: {
    backgroundColor: YELLOW,
  },
  careHub: {
    fontFamily: F.bold,
    fontSize: 22,
    letterSpacing: 1.5,
  },
  careWord: {
    color: C.secondary,
  },
  hubWord: {
    color: YELLOW,
  },
  tagline: {
    fontFamily: F.medium,
    fontSize: 13,
    letterSpacing: 2,
    color: C.onSurfaceVariant,
    textTransform: 'uppercase',
  },
});
