import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { ArrowLeft, HelpCircle, Venus, Mars } from 'lucide-react-native';
import { apiClient } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../components/ToastProvider';
import {
  OnboardingColors as C,
  OnboardingTypography as T,
  EDUCATION_LEVELS,
  EDUCATION_TICKS,
  ETHNICITY_OPTIONS,
  EMPLOYMENT_OPTIONS,
  INCOME_OPTIONS,
  GENDER_OPTIONS,
} from '../../constants/OnboardingColors';

const DESKTOP_BREAKPOINT = 768;
const HEADER_HEIGHT = 64;
const PROGRESS_HEIGHT = 8;

const FONT = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
};

type PillChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
  compact?: boolean;
  desktop?: boolean;
};

function PillChip({ label, selected, onPress, icon, compact = false, desktop = false }: PillChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.pillCompact : styles.pill,
        desktop && compact && styles.pillCompactDesktop,
        desktop && !compact && styles.pillDesktop,
        selected && styles.pillSelected,
        pressed && styles.pillPressed,
        !compact && { flex: 1 },
      ]}
    >
      {icon}
      <Text
        style={[
          styles.pillText,
          compact && styles.pillTextCompact,
          desktop && compact && styles.pillTextDesktop,
          selected && styles.pillTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function DemographicsOnboardingScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isWeb = Platform.OS === 'web';

  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [ethnicity, setEthnicity] = useState<string | null>(null);
  const [educationIndex, setEducationIndex] = useState(1);
  const [employment, setEmployment] = useState<string | null>(null);
  const [income, setIncome] = useState<string | null>(null);
  const [ageFocused, setAgeFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const progressPercent = useMemo(() => (1 / 3) * 100, []);
  const showAgeLabel = ageFocused || age.length > 0;

  const desktopBodyHeight = useMemo(() => {
    const chrome = HEADER_HEIGHT + PROGRESS_HEIGHT + (isWeb ? 0 : 24);
    return Math.max(height - chrome, 520);
  }, [height, isWeb]);

  useEffect(() => {
    if (!isWeb || !isDesktop) return;
    const html = typeof document !== 'undefined' ? document.documentElement : null;
    const body = typeof document !== 'undefined' ? document.body : null;
    if (!html || !body) return;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [isWeb, isDesktop]);

  const handleContinue = async () => {
    const ageNum = parseInt(age, 10);
    if (!age || !Number.isFinite(ageNum) || ageNum < 1 || ageNum > 120) {
      showToast.error('Validation', 'Please enter a valid age.');
      return;
    }
    if (!gender) {
      showToast.error('Validation', 'Please select gender.');
      return;
    }
    if (!ethnicity) {
      showToast.error('Validation', 'Please select ethnicity.');
      return;
    }
    if (!employment) {
      showToast.error('Validation', 'Please select employment status.');
      return;
    }
    if (!income) {
      showToast.error('Validation', 'Please select income level.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.updateOnboardingDemographics({
        age: ageNum,
        gender,
        ethnicity,
        education_level: EDUCATION_LEVELS[educationIndex],
        employment_status: employment,
        income_level: income,
        onboarding_completed: false,
      });
      await refreshUser();
      showToast.success('Profile saved', 'Tell us about your lab results next.');
      router.replace('/onboarding/lab-choice');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save demographics.';
      showToast.error('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const heroBlock = (
    <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
      <Text style={[styles.title, isDesktop && styles.titleDesktop]}>Tell us about you</Text>
      <Text style={[styles.subtitle, isDesktop && styles.subtitleDesktop]}>
        This information helps us personalize your healthcare experience.
      </Text>
    </View>
  );

  const ageBlock = (
    <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
      <View style={[styles.ageField, isDesktop && styles.ageFieldDesktop, showAgeLabel && styles.ageFieldActive]}>
        {showAgeLabel ? <Text style={styles.ageLabel}>Age</Text> : null}
        <TextInput
          style={[styles.ageInput, showAgeLabel && styles.ageInputFloated, isDesktop && styles.ageInputDesktop]}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          placeholder={showAgeLabel ? '' : 'Age'}
          placeholderTextColor={C.onSurfaceVariant}
          onFocus={() => setAgeFocused(true)}
          onBlur={() => setAgeFocused(false)}
          maxLength={3}
        />
      </View>
    </View>
  );

  const genderBlock = (
    <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
      <Text style={[styles.sectionLabel, isDesktop && styles.sectionLabelDesktop]}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDER_OPTIONS.map((g) => (
          <PillChip
            key={g}
            label={g}
            selected={gender === g}
            onPress={() => setGender(g)}
            desktop={isDesktop}
            icon={
              g === 'Male' ? (
                <Mars
                  size={isDesktop ? 16 : 20}
                  color={gender === g ? C.onPrimary : C.primary}
                  style={styles.genderIcon}
                />
              ) : (
                <Venus
                  size={isDesktop ? 16 : 20}
                  color={gender === g ? C.onPrimary : C.primary}
                  style={styles.genderIcon}
                />
              )
            }
          />
        ))}
      </View>
    </View>
  );

  const ethnicityBlock = (
    <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
      <Text style={[styles.sectionLabel, isDesktop && styles.sectionLabelDesktop]}>Ethnicity</Text>
      <View style={[styles.ethnicityGrid, isDesktop && styles.ethnicityGridDesktop]}>
        {ETHNICITY_OPTIONS.map((option) => {
          const selected = ethnicity === option;
          const isOther = option === 'Other';
          return (
            <Pressable
              key={option}
              onPress={() => setEthnicity(option)}
              style={({ pressed }) => [
                styles.ethnicityItem,
                isDesktop && styles.ethnicityItemDesktop,
                isDesktop && !isOther && styles.ethnicityItemDesktopCol,
                isOther && !isDesktop && styles.ethnicityItemOther,
                isOther && isDesktop && styles.ethnicityItemOtherDesktop,
                selected && styles.ethnicityItemSelected,
                pressed && styles.pillPressed,
              ]}
            >
              <Text
                style={[
                  styles.ethnicityText,
                  isDesktop && styles.ethnicityTextDesktop,
                  selected && styles.ethnicityTextSelected,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const educationBlock = (
    <View style={[styles.section, styles.eduSection, isDesktop && styles.sectionDesktop, isDesktop && styles.eduSectionDesktop]}>
      <View style={styles.eduHeader}>
        <Text style={[styles.sectionLabel, isDesktop && styles.sectionLabelDesktop]}>Education Level</Text>
        <View style={[styles.eduBadge, isDesktop && styles.eduBadgeDesktop]}>
          <Text style={[styles.eduBadgeText, isDesktop && styles.eduBadgeTextDesktop]}>
            {EDUCATION_LEVELS[educationIndex]}
          </Text>
        </View>
      </View>
      <View style={[styles.sliderWrap, isDesktop && styles.sliderWrapDesktop]}>
        <Slider
          style={[styles.slider, isDesktop && styles.sliderDesktop]}
          minimumValue={0}
          maximumValue={4}
          step={1}
          value={educationIndex}
          onValueChange={(v) => setEducationIndex(Math.round(v))}
          minimumTrackTintColor={C.primary}
          maximumTrackTintColor={C.sliderTrack}
          thumbTintColor={C.primary}
        />
        <View style={styles.sliderTicks}>
          {EDUCATION_TICKS.map((tick) => (
            <Text key={tick} style={[styles.sliderTickText, isDesktop && styles.sliderTickTextDesktop]}>
              {tick}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );

  const employmentBlock = (
    <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
      <Text style={[styles.sectionLabel, isDesktop && styles.sectionLabelDesktop]}>Employment Status</Text>
      <View style={styles.wrapRow}>
        {EMPLOYMENT_OPTIONS.map((option) => (
          <PillChip
            key={option}
            label={option}
            selected={employment === option}
            onPress={() => setEmployment(option)}
            compact
            desktop={isDesktop}
          />
        ))}
      </View>
    </View>
  );

  const incomeBlock = (
    <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
      <Text style={[styles.sectionLabel, isDesktop && styles.sectionLabelDesktop]}>Income Level</Text>
      <View style={styles.wrapRow}>
        {INCOME_OPTIONS.map((option) => (
          <PillChip
            key={option}
            label={option}
            selected={income === option}
            onPress={() => setIncome(option)}
            compact
            desktop={isDesktop}
          />
        ))}
      </View>
    </View>
  );

  const continueBlock = (
    <Pressable
      style={({ pressed }) => [
        styles.continueBtn,
        isDesktop && styles.continueBtnDesktop,
        submitting && styles.continueBtnDisabled,
        pressed && styles.continueBtnPressed,
      ]}
      onPress={handleContinue}
      disabled={submitting}
    >
      {submitting ? (
        <ActivityIndicator color={C.onPrimary} />
      ) : (
        <Text style={[styles.continueText, isDesktop && styles.continueTextDesktop]}>Continue</Text>
      )}
    </Pressable>
  );

  const footerBlock = (
    <Text style={[styles.footerNote, isDesktop && styles.footerNoteDesktop]}>
      Your data is stored securely and encrypted in compliance with healthcare regulations.
    </Text>
  );

  const mobileForm = (
    <View style={styles.card}>
      {heroBlock}
      {ageBlock}
      {genderBlock}
      {ethnicityBlock}
      {educationBlock}
      {employmentBlock}
      {incomeBlock}
      {continueBlock}
    </View>
  );

  const desktopForm = (
    <View style={styles.desktopCard}>
      <View style={styles.desktopCol}>
        {heroBlock}
        {ageBlock}
        {genderBlock}
        {ethnicityBlock}
      </View>
      <View style={styles.desktopCol}>
        {educationBlock}
        {employmentBlock}
        {incomeBlock}
        {continueBlock}
        {footerBlock}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, isDesktop && styles.safeDesktop]}
      edges={isDesktop ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
    >
      <View style={[styles.headerWrap, isDesktop && styles.headerWrapDesktop]}>
        {!isWeb && <BlurView intensity={72} tint="light" style={StyleSheet.absoluteFill} />}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <ArrowLeft size={22} color={C.primary} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.stepText}>Step 1 of 3</Text>
          </View>
          <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.8}>
            <HelpCircle size={22} color={C.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={[styles.flex, isDesktop && styles.flexDesktop]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isDesktop ? (
          <View style={[styles.desktopMain, { height: desktopBodyHeight }]}>
            {desktopForm}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {mobileForm}
            {footerBlock}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  safeDesktop: {
    ...(Platform.OS === 'web'
      ? ({ height: '100vh', maxHeight: '100vh', overflow: 'hidden' } as object)
      : { overflow: 'hidden' }),
  },
  flex: { flex: 1 },
  flexDesktop: { overflow: 'hidden' },
  headerWrap: {
    height: HEADER_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceContainerHighest,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,249,252,0.92)',
  },
  headerWrapDesktop: {
    flexShrink: 0,
  },
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    ...T.labelMd,
    fontFamily: FONT.bold,
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: -0.3,
  },
  progressTrack: { height: PROGRESS_HEIGHT, backgroundColor: C.surfaceContainer, flexShrink: 0 },
  progressFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48, alignItems: 'center' },
  desktopMain: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  card: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: C.cardBorder,
    padding: 24,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    gap: 32,
  },
  desktopCard: {
    width: '100%',
    maxWidth: 1080,
    maxHeight: '100%',
    flexDirection: 'row',
    gap: 20,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: C.cardBorder,
    paddingHorizontal: 28,
    paddingVertical: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  desktopCol: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 10,
    minWidth: 0,
  },
  hero: { alignItems: 'center', gap: 12 },
  heroDesktop: { alignItems: 'flex-start', gap: 4, marginBottom: 2 },
  title: {
    ...T.headlineLgMobile,
    fontFamily: FONT.bold,
    color: C.onSurface,
    textAlign: 'center',
  },
  titleDesktop: {
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'left',
  },
  subtitle: {
    ...T.bodyMd,
    fontFamily: FONT.medium,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 280,
  },
  subtitleDesktop: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
    maxWidth: 320,
  },
  section: { gap: 12 },
  sectionDesktop: { gap: 6 },
  sectionLabel: {
    ...T.labelSm,
    fontFamily: FONT.bold,
    color: C.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 2,
    paddingLeft: 4,
  },
  sectionLabelDesktop: {
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: -2,
  },
  ageField: {
    borderWidth: 2,
    borderColor: C.surfaceContainerHighest,
    borderRadius: 999,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  ageFieldDesktop: { minHeight: 44 },
  ageFieldActive: { borderColor: C.primary, paddingTop: 14 },
  ageLabel: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: C.surfaceContainerLowest,
    paddingHorizontal: 8,
    fontSize: 12,
    fontFamily: FONT.bold,
    color: C.primary,
  },
  ageInput: { ...T.bodyLg, fontFamily: FONT.bold, color: C.onSurface, padding: 0 },
  ageInputDesktop: { fontSize: 16, lineHeight: 22 },
  ageInputFloated: { paddingTop: 2 },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderIcon: { marginRight: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.surfaceContainerHighest,
    backgroundColor: C.surfaceContainerLowest,
  },
  pillDesktop: { paddingVertical: 10, paddingHorizontal: 12 },
  pillCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.surfaceContainerHighest,
    backgroundColor: C.surfaceContainerLowest,
  },
  pillCompactDesktop: {
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  pillSelected: {
    backgroundColor: C.primary,
    borderColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  pillPressed: { transform: [{ scale: 0.97 }] },
  pillText: { ...T.labelMd, fontFamily: FONT.bold, color: C.onSurface },
  pillTextCompact: { fontSize: 14 },
  pillTextDesktop: { fontSize: 12 },
  pillTextSelected: { color: C.onPrimary },
  ethnicityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: C.surfaceContainer,
    borderRadius: 16,
    padding: 8,
  },
  ethnicityGridDesktop: {
    gap: 6,
    padding: 6,
    borderRadius: 14,
  },
  ethnicityItem: {
    width: '47.5%',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ethnicityItemDesktop: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  ethnicityItemDesktopCol: { width: '31%' },
  ethnicityItemOther: { width: '100%' },
  ethnicityItemOtherDesktop: { width: '31%' },
  ethnicityItemSelected: {
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: 'rgba(224, 64, 160, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  ethnicityText: { ...T.labelMd, fontFamily: FONT.bold, color: C.onSurfaceVariant, textAlign: 'center' },
  ethnicityTextDesktop: { fontSize: 12 },
  ethnicityTextSelected: { color: C.primary },
  eduSection: { paddingVertical: 8 },
  eduSectionDesktop: { paddingVertical: 0 },
  eduHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eduBadge: {
    backgroundColor: C.primaryFixed,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  eduBadgeDesktop: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  eduBadgeText: { ...T.labelMd, fontFamily: FONT.bold, color: C.primary },
  eduBadgeTextDesktop: { fontSize: 12 },
  sliderWrap: { paddingHorizontal: 8, gap: 16 },
  sliderWrapDesktop: { gap: 8, paddingHorizontal: 4 },
  slider: { width: '100%', height: 40 },
  sliderDesktop: { height: 28 },
  sliderTicks: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  sliderTickText: {
    ...T.sliderTick,
    fontFamily: FONT.bold,
    color: C.onSurfaceVariant,
    opacity: 0.8,
    textTransform: 'uppercase',
  },
  sliderTickTextDesktop: { fontSize: 9 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  continueBtn: {
    height: 56,
    borderRadius: 999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  continueBtnDesktop: {
    height: 44,
    marginTop: 4,
  },
  continueBtnDisabled: { opacity: 0.75 },
  continueBtnPressed: { transform: [{ scale: 0.96 }] },
  continueText: {
    ...T.labelMd,
    fontFamily: FONT.bold,
    color: C.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  continueTextDesktop: { fontSize: 13, letterSpacing: 1.5 },
  footerNote: {
    ...T.labelSm,
    fontFamily: FONT.bold,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    opacity: 0.6,
    lineHeight: 18,
    maxWidth: 320,
    marginTop: 32,
    paddingHorizontal: 32,
  },
  footerNoteDesktop: {
    marginTop: 0,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'left',
    paddingHorizontal: 0,
    maxWidth: '100%',
  },
});
