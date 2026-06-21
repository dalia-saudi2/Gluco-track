import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Line, Path, Circle, Rect } from 'react-native-svg';
import { LineChart, Plus } from 'lucide-react-native';
import { DF, type DashboardPalette } from '../../constants/DashboardColors';

export type GlucoseDayPoint = {
  day: string;
  value: number | null;
};

type GlucoseTier = 'normal' | 'elevated' | 'high' | 'below' | 'missing';

type Props = {
  days: GlucoseDayPoint[];
  D: DashboardPalette;
  todayDay?: string;
  todayStatus?: string | null;
  onAddReading?: () => void;
  onViewTrend?: () => void;
  onPressCard?: () => void;
  showActions?: boolean;
  compact?: boolean;
};

const Y_MIN = 50;
const Y_MAX = 220;
const CHART_HEIGHT_DEFAULT = 132;
const CHART_HEIGHT_COMPACT = 88;
const THRESHOLD_HIGH = 180;
const THRESHOLD_ELEVATED = 140;
const THRESHOLD_LOW = 70;

function glucoseTier(value: number | null | undefined): GlucoseTier {
  if (value == null || Number.isNaN(value)) return 'missing';
  if (value < THRESHOLD_LOW) return 'below';
  if (value <= THRESHOLD_ELEVATED) return 'normal';
  if (value <= THRESHOLD_HIGH) return 'elevated';
  return 'high';
}

function dotColor(tier: GlucoseTier, D: DashboardPalette): string {
  if (tier === 'elevated') return '#ea580c';
  if (tier === 'high') return '#dc2626';
  if (tier === 'below') return '#2563eb';
  if (tier === 'missing') return '#94a3b8';
  return D.secondary;
}

function tierStatusLabel(tier: GlucoseTier): string {
  if (tier === 'normal') return 'in range';
  if (tier === 'elevated') return 'elevated';
  if (tier === 'high') return 'high';
  if (tier === 'below') return 'below range';
  return 'no data';
}

function serverStatusLabel(status: string | null | undefined): string {
  if (!status) return 'no data';
  if (status === 'normal') return 'in range';
  if (status === 'low') return 'below range';
  return status;
}

function serverStatusTier(status: string | null | undefined): GlucoseTier {
  if (!status) return 'missing';
  if (status === 'normal') return 'normal';
  if (status === 'elevated') return 'elevated';
  if (status === 'high') return 'high';
  if (status === 'low') return 'below';
  return 'missing';
}

function statusDotColor(tier: GlucoseTier): string {
  if (tier === 'normal') return '#22c55e';
  if (tier === 'elevated') return '#ea580c';
  if (tier === 'high') return '#dc2626';
  if (tier === 'below') return '#2563eb';
  return '#94a3b8';
}

function valueToY(value: number, chartHeight: number): number {
  return chartHeight - ((value - Y_MIN) / (Y_MAX - Y_MIN)) * chartHeight;
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={legendStyles.item}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={legendStyles.text}>{label}</Text>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontFamily: DF.medium, fontSize: 9, color: '#64748b' },
});

const DEFAULT_GLUCOSE_DAYS: GlucoseDayPoint[] = [
  { day: 'Mon', value: null },
  { day: 'Tue', value: null },
  { day: 'Wed', value: null },
  { day: 'Thu', value: null },
  { day: 'Fri', value: null },
  { day: 'Sat', value: null },
  { day: 'Sun', value: null },
];

export function GlucoseStabilityCard({
  days,
  D,
  todayDay = 'Thu',
  todayStatus,
  onAddReading,
  onViewTrend,
  onPressCard,
  showActions = true,
  compact = false,
}: Props) {
  const chartHeight = compact ? CHART_HEIGHT_COMPACT : CHART_HEIGHT_DEFAULT;
  const s = useMemo(() => createStyles(D, compact), [D, compact]);
  const displayDays = days.length > 0 ? days : DEFAULT_GLUCOSE_DAYS;

  const layout = useMemo(() => {
    const plotted = displayDays
      .map((d, i) => {
        if (d.value == null) return null;
        const tier = glucoseTier(d.value);
        const x = displayDays.length === 1 ? 50 : (i / (displayDays.length - 1)) * 100;
        const y = valueToY(d.value, chartHeight);
        return { ...d, tier, x, y };
      })
      .filter(Boolean) as Array<GlucoseDayPoint & { tier: GlucoseTier; x: number; y: number }>;

    const linePath = buildSmoothPath(plotted.map((p) => ({ x: p.x, y: p.y })));

    const yHigh = valueToY(THRESHOLD_HIGH, chartHeight);
    const yElevated = valueToY(THRESHOLD_ELEVATED, chartHeight);
    const yLow = valueToY(THRESHOLD_LOW, chartHeight);

    const withValues = displayDays.filter((d) => d.value != null);
    const inRangeCount = withValues.filter((d) => {
      const t = glucoseTier(d.value);
      return t === 'normal' || t === 'elevated';
    }).length;
    const elevatedDays = withValues.filter((d) => glucoseTier(d.value) === 'elevated');
    const highDays = withValues.filter((d) => glucoseTier(d.value) === 'high');

    const todayEntry = displayDays.find((d) => d.day === todayDay);
    const todayValue = todayEntry?.value ?? plotted[plotted.length - 1]?.value ?? null;
    const todayTier = glucoseTier(todayValue);
    const displayTodayTier = todayStatus ? serverStatusTier(todayStatus) : todayTier;
    const displayTodayLabel = todayStatus ? serverStatusLabel(todayStatus) : tierStatusLabel(todayTier);

    return {
      plotted,
      linePath,
      yHigh,
      yElevated,
      yLow,
      inRangeCount,
      elevatedDays,
      highDays,
      todayValue,
      displayTodayTier,
      displayTodayLabel,
    };
  }, [displayDays, todayDay, todayStatus, chartHeight]);

  const yLabels = [220, 180, 140, 70, 50];

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Pressable
          onPress={onPressCard}
          disabled={!onPressCard}
          style={({ pressed }) => [s.headerMain, onPressCard && pressed && s.cardPressed]}
        >
          <Text style={s.sectionLabel}>GLUCOSE STABILITY</Text>
          <Text style={s.mainValue}>
            {layout.todayValue != null ? Math.round(layout.todayValue) : '—'}{' '}
            <Text style={s.unit}>mg/dL</Text>
          </Text>
          <View style={s.todayRow}>
            <View style={[s.todayDot, { backgroundColor: statusDotColor(layout.displayTodayTier) }]} />
            <Text style={s.todayText}>
              Today ({todayDay}) · {layout.displayTodayLabel}
            </Text>
          </View>
          <View style={s.legendRow}>
            <LegendItem color="#22c55e" label="Normal" />
            <LegendItem color="#ea580c" label="Elevated" />
            <LegendItem color="#dc2626" label="High" />
            {!compact ? <LegendItem color="#94a3b8" label="No data" /> : null}
          </View>
        </Pressable>
        {showActions ? (
          <View style={s.headerActions}>
            <Pressable style={[s.iconBtn, s.iconBtnChart]} onPress={onViewTrend ?? onPressCard}>
              <LineChart size={16} color={D.tertiary} />
            </Pressable>
            <Pressable style={[s.iconBtn, s.iconBtnPrimary]} onPress={onAddReading}>
              <Plus size={16} color={D.primary} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={onPressCard}
        disabled={!onPressCard}
        style={({ pressed }) => [s.chartPressable, onPressCard && pressed && s.cardPressed]}
      >
      <View style={s.chartRow}>
        <View style={s.yAxis}>
          {yLabels.map((v) => (
            <Text key={v} style={s.yLabel}>
              {v}
            </Text>
          ))}
        </View>

        <View style={s.chartArea}>
          <Svg width="100%" height={chartHeight} viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none">
            <Rect x={0} y={0} width={100} height={layout.yHigh} fill="rgba(254,226,226,0.45)" />
            <Rect
              x={0}
              y={layout.yHigh}
              width={100}
              height={Math.max(layout.yElevated - layout.yHigh, 0)}
              fill="rgba(254,243,199,0.55)"
            />
            {[THRESHOLD_HIGH, THRESHOLD_ELEVATED, THRESHOLD_LOW].map((threshold) => (
              <Line
                key={threshold}
                x1={0}
                y1={valueToY(threshold, chartHeight)}
                x2={100}
                y2={valueToY(threshold, chartHeight)}
                stroke={threshold === THRESHOLD_HIGH ? 'rgba(220,38,38,0.35)' : threshold === THRESHOLD_ELEVATED ? 'rgba(234,88,12,0.35)' : 'rgba(34,197,94,0.35)'}
                strokeWidth={0.6}
                strokeDasharray="3 3"
              />
            ))}
            {layout.linePath ? (
              <Path
                d={layout.linePath}
                fill="none"
                stroke={D.secondary}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {layout.plotted.map((p) => (
              <Circle
                key={p.day}
                cx={p.x}
                cy={p.y}
                r={p.tier === 'elevated' || p.tier === 'high' ? 4.5 : 4}
                fill={dotColor(p.tier, D)}
                stroke="#fff"
                strokeWidth={1.5}
              />
            ))}
          </Svg>

          <View style={s.valueOverlay} pointerEvents="none">
            {displayDays.map((d, i) => {
              const tier = glucoseTier(d.value);
              const xPct = displayDays.length === 1 ? 50 : (i / (displayDays.length - 1)) * 100;
              return (
                <View key={`${d.day}-val`} style={[s.valueCol, { left: `${xPct}%`, marginLeft: -14 }]}>
                  {d.value != null ? (
                    <Text style={[s.valueText, tier === 'elevated' && s.valueElevated, tier === 'high' && s.valueHigh]}>
                      {Math.round(d.value)}
                      {tier === 'elevated' || tier === 'high' ? '↑' : ''}
                    </Text>
                  ) : (
                    <Text style={s.valueMissing}> </Text>
                  )}
                </View>
              );
            })}
          </View>

          {!compact ? (
            <View style={s.thresholdLabels} pointerEvents="none">
              <Text style={[s.thresholdText, { top: layout.yHigh - 5, color: '#dc2626' }]}>180</Text>
              <Text style={[s.thresholdText, { top: layout.yElevated - 5, color: '#ea580c' }]}>140</Text>
              <Text style={[s.thresholdText, { top: layout.yLow - 5, color: '#22c55e' }]}>70</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={s.dayRow}>
        {displayDays.map((d) => {
          const tier = glucoseTier(d.value);
          const abnormal = tier === 'elevated' || tier === 'high';
          return (
            <View key={d.day} style={s.dayCol}>
              <Text style={[s.dayLabel, abnormal && { color: dotColor(tier, D), fontFamily: DF.bold }]}>
                {d.day}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={s.chipRow}>
        {layout.inRangeCount > 0 ? (
          <View style={s.chipGreen}>
            <Text style={s.chipGreenText}>
              ✓ {layout.inRangeCount} day{layout.inRangeCount === 1 ? '' : 's'} in range
            </Text>
          </View>
        ) : null}
        {layout.elevatedDays.length > 0 ? (
          <View style={s.chipOrange}>
            <Text style={s.chipOrangeText}>
              ⚠ {layout.elevatedDays.length} elevated ({layout.elevatedDays.map((d) => d.day).join(', ')})
            </Text>
          </View>
        ) : null}
        {layout.highDays.length > 0 ? (
          <View style={s.chipRed}>
            <Text style={s.chipRedText}>
              ↑ {layout.highDays.length} high ({layout.highDays.map((d) => d.day).join(', ')})
            </Text>
          </View>
        ) : null}
      </View>
      </Pressable>
    </View>
  );
}

/** @deprecated Use GlucoseStabilityCard */
export function GlucoseTrendChart(props: Props) {
  return <GlucoseStabilityCard {...props} />;
}

function createStyles(D: DashboardPalette, compact: boolean) {
  const chartHeight = compact ? CHART_HEIGHT_COMPACT : CHART_HEIGHT_DEFAULT;
  return StyleSheet.create({
    wrap: { gap: compact ? 2 : 4, width: '100%' },
    chartPressable: { width: '100%', alignSelf: 'stretch' },
    cardPressed: { opacity: 0.92 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: compact ? 2 : 4,
    },
    headerMain: { flex: 1, paddingRight: 8, minWidth: 0 },
    sectionLabel: {
      fontFamily: DF.bold,
      fontSize: compact ? 9 : 10,
      color: D.onSurfaceVariant,
      letterSpacing: compact ? 1.5 : 2,
      textTransform: 'uppercase',
    },
    mainValue: {
      fontFamily: DF.bold,
      fontSize: compact ? 22 : 32,
      color: D.primary,
      marginTop: compact ? 0 : 2,
      lineHeight: compact ? 26 : 36,
    },
    unit: { fontFamily: DF.bold, fontSize: compact ? 11 : 14, color: D.onSurfaceVariant },
    todayRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: compact ? 2 : 4 },
    todayDot: { width: 7, height: 7, borderRadius: 4 },
    todayText: { fontFamily: DF.medium, fontSize: compact ? 10 : 11, color: D.onSurfaceVariant },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 6 : 10, marginTop: compact ? 4 : 8 },
    headerActions: { flexDirection: 'row', gap: compact ? 6 : 8 },
    iconBtn: {
      width: compact ? 28 : 34,
      height: compact ? 28 : 34,
      borderRadius: compact ? 8 : 10,
      borderWidth: 1,
      borderColor: D.cardBorder,
      backgroundColor: D.surfaceContainerLow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnPrimary: { borderColor: 'rgba(224,64,160,0.25)', backgroundColor: 'rgba(224,64,160,0.06)' },
    iconBtnChart: { borderColor: 'rgba(0,150,204,0.3)', backgroundColor: 'rgba(0,150,204,0.08)' },
    chartRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginTop: compact ? 2 : 4,
      width: '100%',
      minHeight: chartHeight,
    },
    yAxis: {
      width: compact ? 22 : 26,
      height: chartHeight,
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    yLabel: { fontFamily: DF.medium, fontSize: compact ? 7 : 8, color: D.onSurfaceVariant, textAlign: 'right' },
    chartArea: { flex: 1, position: 'relative', height: chartHeight },
    valueOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: -2,
      height: 16,
    },
    valueCol: { position: 'absolute', width: 28, alignItems: 'center' },
    valueText: { fontFamily: DF.bold, fontSize: 9, color: D.secondary },
    valueElevated: { color: '#ea580c' },
    valueHigh: { color: '#dc2626' },
    valueMissing: { fontSize: 9 },
    thresholdLabels: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 22,
    },
    thresholdText: {
      position: 'absolute',
      right: 0,
      fontFamily: DF.bold,
      fontSize: 8,
    },
    dayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingLeft: compact ? 22 : 26,
      marginTop: 2,
    },
    dayCol: { flex: 1, alignItems: 'center' },
    dayLabel: {
      fontFamily: DF.medium,
      fontSize: 9,
      color: D.onSurfaceVariant,
      textTransform: 'uppercase',
    },
    chipRow: { flexDirection: 'row', gap: compact ? 6 : 8, marginTop: compact ? 6 : 10, flexWrap: 'wrap', paddingLeft: compact ? 22 : 26 },
    chipGreen: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: '#f0fdf4',
      borderWidth: 1,
      borderColor: '#dcfce7',
    },
    chipGreenText: { fontFamily: DF.bold, fontSize: 9, color: '#16a34a' },
    chipOrange: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: '#fff7ed',
      borderWidth: 1,
      borderColor: '#ffedd5',
    },
    chipOrangeText: { fontFamily: DF.bold, fontSize: 9, color: '#ea580c' },
    chipRed: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: '#fef2f2',
      borderWidth: 1,
      borderColor: '#fecaca',
    },
    chipRedText: { fontFamily: DF.bold, fontSize: 9, color: '#dc2626' },
  });
}
