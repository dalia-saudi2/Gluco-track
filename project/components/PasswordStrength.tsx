import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, XCircle } from 'lucide-react-native';

interface PasswordStrengthProps {
  password: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  const strength = useMemo(() => {
    if (!password) return { level: 0, label: '', color: '#9ca3af' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    if (checks.length) score++;
    if (checks.uppercase) score++;
    if (checks.lowercase) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    if (score <= 2) {
      return { level: score, label: 'Weak', color: '#ef4444', checks };
    } else if (score <= 4) {
      return { level: score, label: 'Medium', color: '#f59e0b', checks };
    } else {
      return { level: score, label: 'Strong', color: '#10b981', checks };
    }
  }, [password]);

  if (!password) return null;

  return (
    <View style={styles.container}>
      <View style={styles.strengthBar}>
        <View
          style={[
            styles.strengthFill,
            {
              width: `${(strength.level / 5) * 100}%`,
              backgroundColor: strength.color,
            },
          ]}
        />
      </View>
      <View style={styles.strengthInfo}>
        <Text style={[styles.strengthLabel, { color: strength.color }]}>
          {strength.label}
        </Text>
      </View>
      <View style={styles.requirements}>
        <RequirementItem
          met={strength.checks.length}
          text="At least 8 characters"
        />
        <RequirementItem
          met={strength.checks.uppercase}
          text="One uppercase letter"
        />
        <RequirementItem
          met={strength.checks.lowercase}
          text="One lowercase letter"
        />
        <RequirementItem met={strength.checks.number} text="One number" />
        <RequirementItem
          met={strength.checks.special}
          text="One special character"
        />
      </View>
    </View>
  );
};

const RequirementItem: React.FC<{ met: boolean; text: string }> = ({
  met,
  text,
}) => (
  <View style={styles.requirementItem}>
    {met ? (
      <CheckCircle size={16} color="#10b981" />
    ) : (
      <XCircle size={16} color="#9ca3af" />
    )}
    <Text
      style={[styles.requirementText, met && styles.requirementMet]}
    >
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  strengthInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  strengthLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  requirements: {
    gap: 4,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
  },
  requirementMet: {
    color: '#10b981',
  },
});
