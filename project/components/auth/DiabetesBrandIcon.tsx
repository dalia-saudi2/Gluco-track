import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Path,
  Rect,
  Text as SvgText,
  Ellipse,
} from 'react-native-svg';

const PINK = '#e040a0';
const PURPLE = '#7c52aa';
const YELLOW = '#f5b800';
const DARK = '#2e1a28';

type Props = {
  size?: number;
};

export function DiabetesBrandIcon({ size = 220 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 220 220">
        {/* Outer ring */}
        <Circle
          cx="110"
          cy="110"
          r="98"
          fill="none"
          stroke={PURPLE}
          strokeWidth="3"
          strokeDasharray="220 420"
          strokeDashoffset="-30"
          strokeLinecap="round"
        />
        <Circle
          cx="110"
          cy="110"
          r="98"
          fill="none"
          stroke={YELLOW}
          strokeWidth="3"
          strokeDasharray="220 420"
          strokeDashoffset="-250"
          strokeLinecap="round"
        />

        {/* Hand */}
        <Path
          d="M48 148 C58 132, 72 126, 88 128 C96 129, 104 132, 110 138 C118 146, 128 150, 142 148 C154 146, 164 138, 170 128 C174 122, 176 116, 176 110 L176 168 C176 176, 168 182, 156 184 C132 188, 88 188, 64 184 C52 182, 44 176, 44 168 Z"
          fill={PURPLE}
        />

        {/* Glucometer body */}
        <Rect x="58" y="72" width="62" height="88" rx="10" fill={PURPLE} />
        <Rect x="64" y="78" width="50" height="52" rx="6" fill="#ffffff" />
        <Rect x="72" y="136" width="34" height="10" rx="3" fill={PINK} />

        {/* Reading — kept as requested */}
        <SvgText
          x="89"
          y="104"
          fill={DARK}
          fontSize="22"
          fontWeight="700"
          textAnchor="middle"
          fontFamily="Arial"
        >
          120
        </SvgText>
        <SvgText
          x="89"
          y="120"
          fill={PURPLE}
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
          fontFamily="Arial"
        >
          mg/dL
        </SvgText>

        {/* Blood drop */}
        <Path
          d="M142 88 C142 78, 152 72, 158 82 C166 96, 158 112, 150 118 C144 112, 134 100, 142 88 Z"
          fill={PINK}
        />

        {/* ECG line */}
        <Path
          d="M118 98 H132 L136 88 L140 108 L144 92 L148 98 H168"
          fill="none"
          stroke={YELLOW}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Soft glow */}
        <Ellipse cx="110" cy="110" rx="72" ry="72" fill="rgba(255,214,238,0.18)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
