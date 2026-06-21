import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { ScanLine, ChevronDown, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useLogoutAndRedirect } from '../../hooks/useLogoutAndRedirect';
import { VitalisShell } from '../../components/vitalis/VitalisShell';
import { CandyCard } from '../../components/dashboard/CandyCard';
import { DF, DashboardPalette } from '../../constants/DashboardColors';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';
import ClinicalGlucosePanel from '../../components/mealAnalyzer/ClinicalGlucosePanel';
import {
  searchUsdaFoods,
  getUsdaFoodDetail,
  predictMealGlucose,
  type USDAFoodHit,
  type MealGlucosePredictResponse,
} from '../../services/clinicalMealService';
import {
  analyzeMeal,
  mediaTypeFromMime,
  normalizeBase64,
} from '../../services/mealAnalyzerService';

const LOADING_MESSAGES = [
  'Validating carbs…',
  'Running glucose direction model…',
  'Applying safety checks…',
];

const PHOTO_LOADING_MESSAGES = [
  'Analyzing meal photo…',
  'Estimating carbohydrates from the image…',
  'Sending carbs and glucose context to the server…',
  'Applying validation…',
];

const DIABETES_KEYS = ['type1', 'type2', 'prediabetes', 'none'] as const;
const DIABETES_LABELS: Record<(typeof DIABETES_KEYS)[number], string> = {
  type1: 'Type 1',
  type2: 'Type 2',
  prediabetes: 'Pre-diabetes',
  none: 'None',
};

const MEAL_KEYS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const MEAL_LABELS: Record<(typeof MEAL_KEYS)[number], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const MEAL_HOUR: Record<(typeof MEAL_KEYS)[number], number> = {
  breakfast: 8,
  lunch: 12,
  dinner: 18,
  snack: 15,
};

type CartLine = {
  key: string;
  fdc_id: number;
  description: string;
  grams: string;
  carbs_per_100g: number | null;
};

export default function MealAnalyzerScreen() {
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const handleLogout = useLogoutAndRedirect();
  const router = useRouter();
  const D = useD();
  const styles = useDashboardStyles(createStyles);
  const { width } = useWindowDimensions();
  const isWide = width >= 760;

  const [currentGlucose, setCurrentGlucose] = useState('110');
  const [mealKey, setMealKey] = useState<(typeof MEAL_KEYS)[number]>('dinner');

  const [usdaQuery, setUsdaQuery] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchHits, setSearchHits] = useState<USDAFoodHit[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [carbsInput, setCarbsInput] = useState('');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [diabetesKey, setDiabetesKey] = useState<(typeof DIABETES_KEYS)[number]>('type2');
  const [diabetesModal, setDiabetesModal] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'manual' | 'photo'>('manual');
  const [photoInsight, setPhotoInsight] = useState<{
    carbsEstimateG: number;
    narrativePreview?: string;
    foods?: Array<{ name: string; portion: string; gi: string }>;
    nutrition?: { carbs: number; calories: number; protein: number; fat: number };
    recommendations?: string[];
  } | null>(null);
  const skipDerivedCarbsSync = useRef(false);

  const [clinicalStarted, setClinicalStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<MealGlucosePredictResponse | null>(null);

  const [mealModal, setMealModal] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const list = loadingPhase === 'photo' ? PHOTO_LOADING_MESSAGES : LOADING_MESSAGES;
    let i = 0;
    setLoadingMessage(list[i]);
    const id = setInterval(() => {
      i = (i + 1) % list.length;
      setLoadingMessage(list[i]);
    }, 2000);
    return () => clearInterval(id);
  }, [isLoading, loadingPhase]);

  const derivedCarbs = useMemo(() => {
    return cart.reduce((sum, line) => {
      const grams = parseFloat(line.grams);
      const g = Number.isFinite(grams) ? grams : 0;
      const c100 = line.carbs_per_100g;
      if (c100 == null || !Number.isFinite(c100)) return sum;
      return sum + (g * c100) / 100;
    }, 0);
  }, [cart]);

  useEffect(() => {
    if (skipDerivedCarbsSync.current) {
      skipDerivedCarbsSync.current = false;
      return;
    }
    if (derivedCarbs > 0) setCarbsInput(derivedCarbs.toFixed(1));
  }, [derivedCarbs]);

  const glucoseNum = useMemo(() => {
    const n = parseFloat(currentGlucose);
    return Number.isFinite(n) ? n : 110;
  }, [currentGlucose]);

  /** Bolus insulin field removed from UI; API + vision prompt always use 0. */
  const insulinUnitsForApi = 0;

  const onSearchUsda = async () => {
    setSearchError(null);
    const q = usdaQuery.trim();
    if (!q) {
      setSearchError('Enter a food search term.');
      setSearchHits([]);
      return;
    }
    setSearchBusy(true);
    try {
      const hits = await searchUsdaFoods(q, 20);
      setSearchHits(Array.isArray(hits) ? hits : []);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : 'USDA search failed.';
      const msg =
        raw.includes('401') || raw.toLowerCase().includes('unauthorized') || raw.includes('Session expired')
          ? 'Session expired. Please log in again from Profile or the login screen.'
          : raw;
      setSearchError(msg);
      setSearchHits([]);
    } finally {
      setSearchBusy(false);
    }
  };

  const onAddHit = async (hit: USDAFoodHit) => {
    try {
      const det = await getUsdaFoodDetail(hit.fdc_id);
      const line: CartLine = {
        key: `${hit.fdc_id}-${Date.now()}`,
        fdc_id: hit.fdc_id,
        description: (det.description || hit.description).slice(0, 200),
        grams: '100',
        carbs_per_100g: det.carbs_g_per_100g,
      };
      setCart((prev) => [...prev, line]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load food detail.';
      Alert.alert('USDA FoodData Central', msg);
    }
  };

  const predictDisabled = isLoading;

  const pickMealPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Photo library access is required.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setImageUri(asset.uri);
      setImageMime(asset.mimeType || 'image/jpeg');
      if (asset.base64) {
        setImageBase64(normalizeBase64(asset.base64));
      } else {
        setImageBase64(null);
        Alert.alert('Could not read image', 'Try another photo.');
      }
      setError(null);
    } catch (e: unknown) {
      console.warn(e);
      Alert.alert('Error', 'Failed to open photo library.');
    }
  };

  const clearMealPhoto = () => {
    setImageUri(null);
    setImageBase64(null);
    setImageMime('image/jpeg');
    setPhotoInsight(null);
  };

  const requireAuthForPredict = () => {
    if (authIsLoading) {
      setError('Checking login status…');
      return false;
    }
    if (!isAuthenticated) {
      setError('Please log in to run glucose predictions.');
      return false;
    }
    return true;
  };

  const handlePredictFromPhoto = async () => {
    setError(null);
    setPrediction(null);
    setPhotoInsight(null);
    setClinicalStarted(true);

    if (!requireAuthForPredict()) return;

    if (!imageBase64) {
      setError('Choose a meal photo first.');
      return;
    }

    setLoadingPhase('photo');
    setIsLoading(true);

    try {
      const vision = await analyzeMeal({
        imageBase64,
        mediaType: mediaTypeFromMime(imageMime),
        currentGlucose: glucoseNum,
        diabetesType: DIABETES_LABELS[diabetesKey],
        mealTime: MEAL_LABELS[mealKey],
        insulinUnits: insulinUnitsForApi,
      });

      let carbs = Number(vision.parsed?.nutrition?.carbs);
      if (!Number.isFinite(carbs) || carbs <= 0) {
        throw new Error(
          'Could not estimate carbs from the photo. Use USDA search below or type carbs manually.'
        );
      }
      carbs = Math.min(Math.max(carbs, 0.5), 400);

      skipDerivedCarbsSync.current = true;
      setCarbsInput(carbs.toFixed(1));

      if (vision.parsed?.foods?.length) {
        const newCart: CartLine[] = vision.parsed.foods.map((food, idx) => {
          const matchedGrams = food.portion.match(/(\d+(?:\.\d+)?)\s*(?:g|gram)/i);
          const grams = matchedGrams ? matchedGrams[1] : '100';
          return {
            key: `ai-${idx}-${Date.now()}`,
            fdc_id: -1,
            description: `${food.name} (${food.portion})`,
            grams: grams,
            carbs_per_100g: null,
          };
        });
        setCart(newCart);
      }

      setPhotoInsight({
        carbsEstimateG: carbs,
        narrativePreview: vision.narrative,
        foods: vision.parsed?.foods,
        nutrition: vision.parsed?.nutrition,
        recommendations: vision.parsed?.recommendations,
      });

      const usdaRef = derivedCarbs > 0 ? derivedCarbs : undefined;

      const out = await predictMealGlucose({
        carbs_g: carbs,
        current_glucose_mg_dl: glucoseNum,
        insulin_units: insulinUnitsForApi,
        meal_hour: MEAL_HOUR[mealKey],
        glucose_readings_mg_dl: [],
        usda_derived_carbs_g: usdaRef,
      });
      setPrediction(out);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Photo prediction failed.';
      setError(msg);
    } finally {
      setIsLoading(false);
      setLoadingPhase('manual');
    }
  };

  const handlePredict = async () => {
    setError(null);
    setPrediction(null);
    setPhotoInsight(null);
    setClinicalStarted(true);
    setLoadingPhase('manual');

    if (!requireAuthForPredict()) return;

    const carbsParsed = parseFloat(carbsInput);
    const carbs_g = Number.isFinite(carbsParsed) ? carbsParsed : derivedCarbs;

    if (!(carbs_g > 0)) {
      setError('Enter meal carbs (grams) or add USDA foods with carbohydrate data.');
      return;
    }

    setIsLoading(true);
    try {
      const out = await predictMealGlucose({
        carbs_g,
        current_glucose_mg_dl: glucoseNum,
        insulin_units: insulinUnitsForApi,
        meal_hour: MEAL_HOUR[mealKey],
        glucose_readings_mg_dl: [],
        usda_derived_carbs_g: derivedCarbs > 0 ? derivedCarbs : undefined,
      });
      setPrediction(out);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Prediction failed.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPickerModal = <T extends string>(
    visible: boolean,
    onClose: () => void,
    keys: readonly T[],
    labels: Record<T, string>,
    current: T,
    onSelect: (k: T) => void,
    title: string
  ) => (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{title}</Text>
          {keys.map((k) => (
            <TouchableOpacity
              key={k}
              style={[styles.modalRow, current === k && styles.modalRowActive]}
              onPress={() => {
                onSelect(k);
                onClose();
              }}
            >
              <Text style={[styles.modalRowText, current === k && styles.modalRowTextActive]}>{labels[k]}</Text>
            </TouchableOpacity>
          ))}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  const inputPanel = (
    <CandyCard style={styles.panel} accent="primary">
      <Text style={styles.panelTitle}>GlucoScan · Photo, USDA, or manual carbs</Text>
      <Text style={styles.panelSub}>
        Upload a meal photo: Gemini estimates carbs from the image, then the server model predicts whether glucose is
        more likely to rise or fall. You can also enter carbs via USDA below. Educational only — not medical advice.
      </Text>

      <Text style={styles.fieldLabel}>Current glucose (mg/dL)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholderTextColor={D.onSurfaceVariant}
        value={currentGlucose}
        onChangeText={setCurrentGlucose}
        editable={!isLoading}
      />

      <Text style={styles.fieldLabel}>Meal time</Text>
      <TouchableOpacity
        style={styles.select}
        onPress={() => !isLoading && setMealModal(true)}
        disabled={isLoading}
      >
        <Text style={styles.selectText}>{MEAL_LABELS[mealKey]}</Text>
        <ChevronDown size={18} color={D.onSurfaceVariant} />
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>Meal photo → AI carbs → glucose direction</Text>
      <Text style={styles.helpMuted}>
        For the vision step only: diabetes type helps the AI wording on the photo summary.
      </Text>
      <TouchableOpacity
        style={styles.select}
        onPress={() => !isLoading && setDiabetesModal(true)}
        disabled={isLoading}
      >
        <Text style={styles.selectText}>{DIABETES_LABELS[diabetesKey]}</Text>
        <ChevronDown size={18} color={D.onSurfaceVariant} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.uploadZone, imageUri ? styles.uploadZoneFilled : undefined]}
        onPress={pickMealPhoto}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        {imageUri ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            <TouchableOpacity onPress={clearMealPhoto} disabled={isLoading}>
              <Text style={styles.uploadRemove}>Remove photo</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.uploadInner}>
            <Upload size={28} color={D.tertiary} />
            <Text style={styles.uploadHint}>Tap to choose a meal photo</Text>
            <Text style={styles.uploadSub}>Uses Gemini to estimate carbs, then XGBoost for up/down</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.photoPredictBtn, (!imageBase64 || isLoading) && styles.analyzeBtnDisabled]}
        onPress={handlePredictFromPhoto}
        disabled={!imageBase64 || isLoading}
      >
        <Text style={[styles.photoPredictBtnText, (!imageBase64 || isLoading) && styles.analyzeBtnTextDisabled]}>
          Predict from photo
        </Text>
      </TouchableOpacity>

      <Text style={styles.fieldLabel}>USDA FoodData Central</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, styles.inputGrow]}
          placeholder="Search food (e.g. rice cooked)"
          placeholderTextColor={D.onSurfaceVariant}
          value={usdaQuery}
          onChangeText={setUsdaQuery}
          editable={!isLoading}
          onSubmitEditing={onSearchUsda}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={onSearchUsda} disabled={searchBusy || isLoading}>
          {searchBusy ? <ActivityIndicator color={D.onPrimary} /> : <Text style={styles.searchBtnText}>Search</Text>}
        </TouchableOpacity>
      </View>
      {searchError ? <Text style={styles.searchErr}>{searchError}</Text> : null}
      {searchHits.length > 0 ? (
        <View style={styles.hitBox}>
          {searchHits.slice(0, 12).map((h, hi) => (
            <TouchableOpacity key={`${h.fdc_id}-${hi}`} style={styles.hitRow} onPress={() => onAddHit(h)}>
              <Text style={styles.hitText} numberOfLines={2}>
                {h.description}
              </Text>
              <Text style={styles.hitAdd}>Add</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <Text style={styles.fieldLabel}>Meal items</Text>
      {cart.length === 0 ? (
        <Text style={styles.helpMuted}>Tap a search result to add portions.</Text>
      ) : (
        cart.map((line, idx) => (
          <View key={line.key} style={styles.cartRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cartTitle} numberOfLines={2}>
                {line.description}
              </Text>
              <Text style={styles.helpMuted}>
                Carbs: {line.carbs_per_100g != null ? `${line.carbs_per_100g.toFixed(1)} g / 100g` : 'n/a'}
              </Text>
            </View>
            <TextInput
              style={styles.gramsInput}
              keyboardType="decimal-pad"
              value={line.grams}
              onChangeText={(t) => {
                setCart((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], grams: t };
                  return next;
                });
              }}
            />
            <Text style={styles.gLabel}>g</Text>
            <TouchableOpacity
              onPress={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.removeLink}>✕</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={styles.fieldLabel}>Total carbs for model (g)</Text>
      <Text style={styles.helpMuted}>Prefilled from USDA portions; edit if you use a different carb count.</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholderTextColor={D.onSurfaceVariant}
        value={carbsInput}
        onChangeText={setCarbsInput}
        editable={!isLoading}
      />

      <TouchableOpacity
        style={[styles.analyzeBtn, predictDisabled && styles.analyzeBtnDisabled]}
        onPress={handlePredict}
        disabled={predictDisabled}
      >
        <Text style={[styles.analyzeBtnText, predictDisabled && styles.analyzeBtnTextDisabled]}>
          Predict direction (typed / USDA carbs)
        </Text>
      </TouchableOpacity>
    </CandyCard>
  );

  return (
    <VitalisShell
      activeNavId="meal-analyzer"
      userName={user?.full_name || 'Patient'}
      onLogout={handleLogout}
      disableScroll
    >
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.pageHead}>
            <View style={styles.pageHeadIcon}>
              <ScanLine size={22} color={D.onPrimary} />
            </View>
            <View style={styles.pageHeadText}>
              <Text style={styles.pageTitle}>GlucoScan AI</Text>
              <Text style={styles.pageSub}>Photo, USDA, or manual carbs → glucose direction</Text>
            </View>
          </View>

          {!authIsLoading && !isAuthenticated ? (
            <CandyCard style={styles.authBanner} accent="orange">
              <Text style={styles.authBannerText}>
                Log in to save predictions and use glucose modeling. USDA food search works without an account.
              </Text>
              <Pressable style={styles.authBannerBtn} onPress={() => router.push('/login')}>
                <Text style={styles.authBannerBtnText}>Go to login</Text>
              </Pressable>
            </CandyCard>
          ) : null}

          <View style={[styles.columns, isWide && styles.columnsWide]}>
            <View style={[styles.col, isWide && styles.colHalf]}>{inputPanel}</View>
            <View style={[styles.col, isWide && styles.colHalf]}>
              <ClinicalGlucosePanel
                started={clinicalStarted}
                isLoading={isLoading}
                loadingMessage={loadingMessage}
                error={error}
                prediction={prediction}
                usdaCarbsDerived={derivedCarbs > 0 ? derivedCarbs : null}
                photoInsight={photoInsight}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderPickerModal(mealModal, () => setMealModal(false), MEAL_KEYS, MEAL_LABELS, mealKey, setMealKey, 'Meal time')}
      {renderPickerModal(
        diabetesModal,
        () => setDiabetesModal(false),
        DIABETES_KEYS,
        DIABETES_LABELS,
        diabetesKey,
        setDiabetesKey,
        'Diabetes type (for photo AI)'
      )}
    </VitalisShell>
  );
}

function createStyles(D: DashboardPalette) {
  return {
    flex1: { flex: 1 },
    scrollContent: { paddingBottom: 24, gap: 16 },
    pageHead: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, marginBottom: 4 },
    pageHeadIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: D.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    pageHeadText: { flex: 1 },
    pageTitle: { fontFamily: DF.bold, fontSize: 22, color: D.onSurface },
    pageSub: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, marginTop: 2 },
    columns: { gap: 16 },
    columnsWide: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 20 },
    col: { flex: 1 },
    colHalf: { flex: 1, minWidth: 0 },
    panel: { padding: 18 },
    panelTitle: { fontFamily: DF.bold, fontSize: 17, color: D.onSurface, marginBottom: 8 },
    panelSub: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, lineHeight: 18, marginBottom: 12 },
    fieldLabel: {
      fontFamily: DF.bold,
      fontSize: 10,
      color: D.onSurfaceVariant,
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
      marginBottom: 6,
      marginTop: 10,
    },
    helpMuted: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, marginBottom: 6, lineHeight: 17 },
    input: {
      borderWidth: 1,
      borderColor: D.borderMedium,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontFamily: DF.medium,
      fontSize: 15,
      color: D.onSurface,
      backgroundColor: D.surfaceContainerLow,
    },
    inputGrow: { flex: 1 },
    select: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      borderWidth: 1,
      borderColor: D.borderMedium,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: D.surfaceContainerLow,
    },
    selectText: { fontFamily: DF.medium, fontSize: 15, color: D.onSurface },
    searchRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
    searchBtn: {
      backgroundColor: D.primary,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minWidth: 88,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    searchBtnText: { fontFamily: DF.bold, color: D.onPrimary, fontSize: 14 },
    searchErr: { fontFamily: DF.medium, color: D.error, fontSize: 13, marginTop: 6 },
    authBanner: { padding: 14, marginBottom: 4 },
    authBannerText: {
      fontFamily: DF.medium,
      color: D.onSurface,
      fontSize: 14,
      marginBottom: 10,
    },
    authBannerBtn: {
      alignSelf: 'flex-start' as const,
      backgroundColor: D.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
    },
    authBannerBtnText: {
      color: D.onPrimary,
      fontFamily: DF.bold,
      fontSize: 14,
    },
    hitBox: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: D.borderSubtle,
      borderRadius: 16,
      maxHeight: 200,
      overflow: 'hidden' as const,
      backgroundColor: D.surfaceContainerLow,
    },
    hitRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: D.borderSubtle,
    },
    hitText: { flex: 1, fontFamily: DF.medium, fontSize: 13, color: D.onSurface, paddingRight: 8 },
    hitAdd: { fontFamily: DF.bold, fontSize: 13, color: D.primary },
    cartRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: D.borderSubtle,
    },
    cartTitle: { fontFamily: DF.bold, fontSize: 14, color: D.onSurface },
    gramsInput: {
      width: 56,
      borderWidth: 1,
      borderColor: D.borderMedium,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 8,
      fontFamily: DF.medium,
      fontSize: 15,
      textAlign: 'center' as const,
      backgroundColor: D.surfaceContainerLow,
      color: D.onSurface,
    },
    gLabel: { fontFamily: DF.medium, fontSize: 13, color: D.onSurfaceVariant, width: 16 },
    removeLink: { fontFamily: DF.bold, fontSize: 16, color: D.error, paddingHorizontal: 4 },
    uploadZone: {
      borderWidth: 2,
      borderStyle: 'dashed' as const,
      borderColor: D.borderMedium,
      borderRadius: 16,
      padding: 14,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 120,
      backgroundColor: D.surfaceContainerLow,
      marginTop: 8,
    },
    uploadZoneFilled: { borderStyle: 'solid' as const },
    uploadInner: { alignItems: 'center' as const, gap: 8 },
    uploadHint: { fontFamily: DF.bold, fontSize: 14, color: D.onSurfaceVariant },
    uploadSub: { fontFamily: DF.medium, fontSize: 12, color: D.onSurfaceVariant, textAlign: 'center' as const },
    preview: { width: '100%' as const, height: 140, borderRadius: 12, marginBottom: 8 },
    uploadRemove: { fontFamily: DF.bold, fontSize: 13, color: D.primary, textDecorationLine: 'underline' as const },
    photoPredictBtn: {
      marginTop: 12,
      backgroundColor: D.secondary,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center' as const,
    },
    photoPredictBtnText: { fontFamily: DF.bold, color: D.onPrimary, fontSize: 16 },
    analyzeBtn: {
      marginTop: 18,
      backgroundColor: D.primary,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center' as const,
    },
    analyzeBtnDisabled: { backgroundColor: D.surfaceContainerHigh },
    analyzeBtnText: { fontFamily: DF.bold, color: D.onPrimary, fontSize: 16 },
    analyzeBtnTextDisabled: { color: D.onSurfaceVariant },
    modalBackdrop: {
      flex: 1,
      backgroundColor: D.overlay,
      justifyContent: 'center' as const,
      padding: 24,
    },
    modalCard: {
      backgroundColor: D.surface,
      borderRadius: 24,
      paddingVertical: 8,
      maxHeight: '70%' as const,
      borderWidth: 1,
      borderColor: D.cardBorder,
    },
    modalTitle: {
      fontFamily: DF.bold,
      fontSize: 16,
      color: D.onSurface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: D.borderSubtle,
    },
    modalRow: { paddingVertical: 14, paddingHorizontal: 16 },
    modalRowActive: { backgroundColor: D.surfaceContainer },
    modalRowText: { fontFamily: DF.medium, fontSize: 16, color: D.onSurfaceVariant },
    modalRowTextActive: { fontFamily: DF.bold, color: D.primary },
  };
}
