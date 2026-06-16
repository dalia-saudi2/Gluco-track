import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { ArrowLeft, HelpCircle, Venus, Mars, ChevronDown } from 'lucide-react-native';
import { apiClient } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { showToast } from '../../components/ToastProvider';
import { DatePicker } from '../../components/DatePicker';
import {
  OnboardingColors as C,
  OnboardingTypography as T,
  ETHNICITY_OPTIONS,
  EMPLOYMENT_OPTIONS,
  INCOME_OPTIONS,
  GENDER_OPTIONS,
} from '../../constants/OnboardingColors';
import {
  DEGREE_OPTIONS,
  getDobBounds,
  getMajorGroupsForDegree,
  getMajorOptionsForDegree,
  validateDateOfBirth,
  validateDegree,
  validateMajor,
  clampIsoDateToBounds,
  type MajorSchoolGroup,
} from '../../utils/onboardingValidation';
import {
  LANGUAGE_OPTIONS,
  MARITAL_OPTIONS,
  toApiEmployment,
  toApiEthnicity,
  toApiGender,
} from '../../utils/featureEnums';
import { resolveOnboardingRoute } from '../../utils/resolveOnboardingRoute';
import { useOnboardingNav } from '../../utils/useOnboardingNav';

const DESKTOP_BREAKPOINT = 768;
const HEADER_HEIGHT = 64;
const PROGRESS_HEIGHT = 8;

const FONT = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
};

const { min: minDob, max: maxDob } = getDobBounds();

type SelectFieldProps = {
  label: string;
  value: string | null;
  options?: readonly string[];
  groups?: readonly MajorSchoolGroup[];
  onChange: (value: string) => void;
  hint: string;
  desktop?: boolean;
  menuMaxHeight?: number;
};

function SelectField({
  label,
  value,
  options,
  groups,
  onChange,
  hint,
  desktop = false,
  menuMaxHeight,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);

  const renderOption = (option: string) => {
    const selected = value === option;
    return (
      <Pressable
        key={option}
        onPress={() => {
          onChange(option);
          setOpen(false);
        }}
        style={({ pressed }) => [
          styles.selectOption,
          desktop && styles.selectOptionDesktop,
          groups && styles.selectOptionGrouped,
          selected && styles.selectOptionSelected,
          pressed && styles.pillPressed,
        ]}
      >
        <Text style={[styles.selectOptionText, selected && styles.selectOptionTextSelected]}>
          {option}
        </Text>
      </Pressable>
    );
  };

  const optionNodes = groups
    ? groups.flatMap((group) => [
        <Text
          key={`${group.school}-header`}
          style={[styles.selectGroupHeader, desktop && styles.selectGroupHeaderDesktop]}
        >
          {group.school}
        </Text>,
        ...group.majors.map((major) => renderOption(major)),
      ])
    : (options ?? []).map((option) => renderOption(option));

  return (
    <View style={styles.selectWrap}>
      <Text style={[styles.sectionLabel, desktop && styles.sectionLabelDesktop]}>{label}</Text>
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        style={({ pressed }) => [
          styles.selectField,
          desktop && styles.selectFieldDesktop,
          open && styles.selectFieldActive,
          pressed && styles.pillPressed,
        ]}
      >
        <Text style={[styles.selectValue, !value && styles.selectValueEmpty]}>
          {value ?? ''}
        </Text>
        <ChevronDown size={desktop ? 16 : 20} color={C.onSurfaceVariant} />
      </Pressable>
      {!value ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {open ? (
        <View style={[styles.selectMenu, desktop && styles.selectMenuDesktop]}>
          {menuMaxHeight ? (
            <ScrollView
              style={[styles.selectMenuScroll, { maxHeight: menuMaxHeight }]}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {optionNodes}
            </ScrollView>
          ) : (
            optionNodes
          )}
        </View>
      ) : null}
    </View>
  );
}

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
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isWeb = Platform.OS === 'web';

  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [ethnicity, setEthnicity] = useState<string | null>(null);
  const [degree, setDegree] = useState<string | null>(null);
  const [major, setMajor] = useState<string | null>(null);
  const [employment, setEmployment] = useState<string | null>(null);
  const [income, setIncome] = useState<string | null>(null);
  const [nationality, setNationality] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ar'>('en');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [dobError, setDobError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { goBack, canGoBack, stepInfo } = useOnboardingNav('demographics');

  const majorGroups = useMemo(() => getMajorGroupsForDegree(degree), [degree]);

  const progressPercent = stepInfo.percent;

  const handleDegreeChange = (value: string) => {
    setDegree(value);
    if (major && !getMajorOptionsForDegree(value).includes(major)) {
      setMajor(null);
    }
  };

  const handleDobChange = (iso: string) => {
    const clamped = clampIsoDateToBounds(iso);
    if (!clamped) {
      setDateOfBirth(null);
      setDobError('Please enter a valid calendar date.');
      return;
    }
    setDateOfBirth(clamped);
    setDobError(validateDateOfBirth(clamped));
  };

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
    const dobValidation = dateOfBirth ? validateDateOfBirth(dateOfBirth) : 'Please select your date of birth.';
    if (dobValidation) {
      setDobError(dobValidation);
      showToast.error('Validation', dobValidation);
      return;
    }
    setDobError(null);

    const degreeValidation = validateDegree(degree);
    if (degreeValidation) {
      showToast.error('Validation', degreeValidation);
      return;
    }

    const majorValidation = validateMajor(major ?? '', degree);
    if (majorValidation) {
      showToast.error('Validation', majorValidation);
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
        date_of_birth: dateOfBirth,
        gender: toApiGender(gender),
        ethnicity: toApiEthnicity(ethnicity),
        education_level: degree,
        education_major: major!,
        employment_status: toApiEmployment(employment),
        income_level: income,
        nationality: nationality.trim() || undefined,
        marital_status: maritalStatus ?? undefined,
        caregiver_name: caregiverName.trim() || undefined,
        caregiver_phone: caregiverPhone.trim() || undefined,
        preferred_language: preferredLanguage,
        onboarding_completed: false,
      });
      await refreshUser();
      showToast.success('Profile saved', 'Next: tell us about your diabetes path.');
      const user = await authService.getCurrentUser();
      router.replace(await resolveOnboardingRoute(user));
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

  const dobBlock = (
    <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
      <DatePicker
        variant="onboarding"
        label="Date of Birth"
        value={dateOfBirth}
        onChange={handleDobChange}
        placeholder=""
        hint="Please enter your date of birth"
        maximumDate={maxDob}
        minimumDate={minDob}
        desktop={isDesktop}
        error={dobError ?? undefined}
      />
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
    <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
      <SelectField
        label="Degree"
        value={degree}
        options={DEGREE_OPTIONS}
        onChange={handleDegreeChange}
        hint="Please select your education degree"
        desktop={isDesktop}
      />
      <SelectField
        label="Major"
        value={major}
        groups={majorGroups}
        onChange={setMajor}
        hint="Please select your major or field of study"
        desktop={isDesktop}
        menuMaxHeight={isDesktop ? 360 : 400}
      />
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

  const emrBlock = (
    <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
      <Text style={[styles.sectionLabel, isDesktop && styles.sectionLabelDesktop]}>Additional (EMR)</Text>
      <Text style={styles.fieldHint}>Optional — helps your clinical record.</Text>
      <Text style={styles.sectionLabel}>Nationality</Text>
      <TextInput
        style={styles.textInput}
        value={nationality}
        onChangeText={setNationality}
        placeholder="e.g. Egyptian"
        placeholderTextColor={C.onSurfaceVariant}
      />
      <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Marital status</Text>
      <View style={styles.wrapRow}>
        {MARITAL_OPTIONS.map((opt) => (
          <PillChip
            key={opt.value}
            label={opt.label}
            selected={maritalStatus === opt.value}
            onPress={() => setMaritalStatus(opt.value)}
            compact
            desktop={isDesktop}
          />
        ))}
      </View>
      <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Preferred language</Text>
      <View style={styles.wrapRow}>
        {LANGUAGE_OPTIONS.map((opt) => (
          <PillChip
            key={opt.value}
            label={opt.label}
            selected={preferredLanguage === opt.value}
            onPress={() => setPreferredLanguage(opt.value)}
            compact
            desktop={isDesktop}
          />
        ))}
      </View>
      <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Caregiver / emergency contact</Text>
      <TextInput
        style={styles.textInput}
        value={caregiverName}
        onChangeText={setCaregiverName}
        placeholder="Name (optional)"
        placeholderTextColor={C.onSurfaceVariant}
      />
      <TextInput
        style={[styles.textInput, { marginTop: 8 }]}
        value={caregiverPhone}
        onChangeText={setCaregiverPhone}
        placeholder="Phone (optional)"
        placeholderTextColor={C.onSurfaceVariant}
        keyboardType="phone-pad"
      />
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
      {dobBlock}
      {genderBlock}
      {ethnicityBlock}
      {educationBlock}
      {employmentBlock}
      {incomeBlock}
      {emrBlock}
      {continueBlock}
    </View>
  );

  const desktopForm = (
    <View style={styles.desktopCard}>
      <View style={styles.desktopCol}>
        {heroBlock}
        {dobBlock}
        {genderBlock}
        {ethnicityBlock}
      </View>
      <View style={styles.desktopCol}>
        {educationBlock}
        {employmentBlock}
        {incomeBlock}
        {emrBlock}
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
            {canGoBack ? (
              <TouchableOpacity style={styles.headerIconBtn} onPress={goBack} activeOpacity={0.8}>
                <ArrowLeft size={22} color={C.primary} strokeWidth={2.5} />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerIconBtn} />
            )}
            <Text style={styles.stepText}>{stepInfo.label}</Text>
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
          <ScrollView
            style={styles.desktopScroll}
            contentContainerStyle={styles.desktopScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {desktopForm}
          </ScrollView>
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
  desktopScroll: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' ? ({ overflowY: 'auto' } as object) : {}),
  },
  desktopScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 16,
    paddingBottom: 40,
    minHeight: '100%',
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
  },
  desktopCol: {
    flex: 1,
    justifyContent: 'flex-start',
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
  ageInput: {
    ...T.bodyLg,
    fontFamily: FONT.bold,
    color: C.onSurface,
    padding: 0,
    width: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  ageInputDesktop: { fontSize: 16, lineHeight: 22 },
  ageInputFloated: { paddingTop: 2 },
  selectWrap: { gap: 12, zIndex: 20 },
  selectField: {
    minHeight: 56,
    borderWidth: 2,
    borderColor: C.surfaceContainerHighest,
    borderRadius: 999,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surfaceContainerLowest,
  },
  selectFieldDesktop: { minHeight: 44 },
  selectFieldActive: { borderColor: C.primary },
  selectValue: { ...T.bodyLg, fontFamily: FONT.bold, color: C.onSurface, flex: 1 },
  selectValueEmpty: { color: C.onSurface },
  fieldHint: {
    fontFamily: FONT.medium,
    fontSize: 13,
    color: C.onSurfaceVariant,
    paddingLeft: 4,
    marginTop: 6,
  },
  selectPlaceholder: { color: C.onSurfaceVariant, fontFamily: FONT.medium, fontWeight: '500' },
  selectMenu: {
    borderWidth: 2,
    borderColor: C.surfaceContainerHighest,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerLowest,
    overflow: 'hidden',
  },
  selectMenuDesktop: { borderRadius: 14 },
  selectMenuScroll: {
    ...(Platform.OS === 'web'
      ? ({ overflowY: 'auto' } as object)
      : {}),
  },
  selectOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceContainer,
  },
  selectOptionDesktop: { paddingVertical: 10, paddingHorizontal: 16 },
  selectOptionGrouped: { paddingLeft: 20 },
  selectOptionSelected: { backgroundColor: C.primaryFixed },
  selectOptionText: { ...T.labelMd, fontFamily: FONT.bold, color: C.onSurface },
  selectOptionTextSelected: { color: C.primary },
  selectGroupHeader: {
    ...T.labelSm,
    fontFamily: FONT.bold,
    color: C.onSurfaceVariant,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: C.surfaceContainerLow,
  },
  selectGroupHeaderDesktop: { paddingHorizontal: 16, paddingTop: 12 },
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
  textInput: {
    borderWidth: 2,
    borderColor: C.surfaceContainerHighest,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: FONT.medium,
    fontSize: 15,
    color: C.onSurface,
  },
});
