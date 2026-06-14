import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'dashboard' | 'profile';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'card',
  count = 1,
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <SkeletonPlaceholder>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar} />
                <View style={styles.cardContent}>
                  <View style={styles.title} />
                  <View style={styles.subtitle} />
                </View>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.line} />
                <View style={[styles.line, { width: '60%' }]} />
              </View>
            </View>
          </SkeletonPlaceholder>
        );
      case 'list':
        return (
          <SkeletonPlaceholder>
            <View style={styles.listItem}>
              <View style={styles.listIcon} />
              <View style={styles.listContent}>
                <View style={styles.listTitle} />
                <View style={styles.listSubtitle} />
              </View>
            </View>
          </SkeletonPlaceholder>
        );
      case 'dashboard':
        return (
          <SkeletonPlaceholder>
            <View style={styles.dashboard}>
              <View style={styles.metricRow}>
                <View style={styles.metricCard} />
                <View style={styles.metricCard} />
                <View style={styles.metricCard} />
              </View>
              <View style={styles.section}>
                <View style={styles.sectionTitle} />
                <View style={styles.card} />
                <View style={styles.card} />
              </View>
            </View>
          </SkeletonPlaceholder>
        );
      case 'profile':
        return (
          <SkeletonPlaceholder>
            <View style={styles.profile}>
              <View style={styles.profileHeader}>
                <View style={styles.profileAvatar} />
                <View style={styles.profileInfo}>
                  <View style={styles.profileName} />
                  <View style={styles.profileEmail} />
                </View>
              </View>
              <View style={styles.profileSection}>
                <View style={styles.profileItem} />
                <View style={styles.profileItem} />
                <View style={styles.profileItem} />
              </View>
            </View>
          </SkeletonPlaceholder>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={index > 0 ? styles.spacing : undefined}>
          {renderSkeleton()}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  spacing: {
    marginTop: 12,
  },
  // Card skeleton
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  title: {
    width: '70%',
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitle: {
    width: '50%',
    height: 12,
    borderRadius: 4,
  },
  cardBody: {
    gap: 8,
  },
  line: {
    width: '100%',
    height: 12,
    borderRadius: 4,
  },
  // List skeleton
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    width: '60%',
    height: 14,
    borderRadius: 4,
    marginBottom: 6,
  },
  listSubtitle: {
    width: '40%',
    height: 12,
    borderRadius: 4,
  },
  // Dashboard skeleton
  dashboard: {
    padding: 16,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    height: 80,
    borderRadius: 12,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    width: '40%',
    height: 20,
    borderRadius: 4,
    marginBottom: 16,
  },
  // Profile skeleton
  profile: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    width: '60%',
    height: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  profileEmail: {
    width: '80%',
    height: 16,
    borderRadius: 4,
  },
  profileSection: {
    gap: 12,
  },
  profileItem: {
    width: '100%',
    height: 56,
    borderRadius: 12,
  },
});
