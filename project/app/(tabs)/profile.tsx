import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { User, Settings, Bell, Shield, HelpCircle, LogOut, Edit3, FileText, Calendar, Bot } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';

export default function ProfileScreen() {
  const [currentTab, setCurrentTab] = useState('profile');
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = React.useMemo(() => {
    if (!pathname) return 'profile';
    if (pathname === '/(tabs)') return 'index';
    if (pathname.startsWith('/(tabs)/records')) return 'records';
    if (pathname.startsWith('/(tabs)/appointments')) return 'appointments';
    // messages removed
    if (pathname.startsWith('/(tabs)/profile')) return 'profile';
    if (pathname.startsWith('/(tabs)/chatbot')) return 'chatbot';
    return 'profile';
  }, [pathname]);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab !== 'profile') {
      switch (tab) {
        case 'index':
          router.push('/(tabs)');
          break;
        case 'records':
          router.push('/(tabs)/records');
          break;
        case 'appointments':
          router.push('/(tabs)/appointments');
          break;
        // messages removed
        case 'chatbot':
          router.push('/(tabs)/chatbot');
          break;
        default:
          break;
      }
    }
  };

  const profileData = {
    name: 'Ahmed mohamed',
    email: 'Ahmedmohamed@email.com',
    phone: '+20 123 456 7890',
    dateOfBirth: '21-11-2004',
    bloodType: 'A+',
    emergencyContact: 'Ahmed Hassan (+20 987 654 3210)',
  };

  const menuItems = [
    { id: 'edit', label: 'Edit Profile', icon: Edit3, color: '#1E3A8A' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: '#8b5cf6' },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, color: '#10b981' },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, color: '#f59e0b' },
    { id: 'settings', label: 'Settings', icon: Settings, color: '#6b7280' },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Integrated Navigation */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.profileSection}>
              <View style={styles.profileImage}>
                <User size={24} color="#1E3A8A" />
              </View>
              <Text style={styles.welcomeText}>Hello Farida</Text>
            </View>
          </View>
          
          {/* Navigation Options */}
          <View style={styles.navigationSection}>
            <TouchableOpacity 
              style={[styles.navButton, activeTab === 'index' && styles.activeNavButton]}
              onPress={() => handleTabChange('index')}
            >
              <User size={16} color={activeTab === 'index' ? '#ffffff' : '#1E3A8A'} />
              <Text style={[styles.navText, activeTab === 'index' && styles.activeNavText]}>Dashboard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navButton, activeTab === 'records' && styles.activeNavButton]}
              onPress={() => handleTabChange('records')}
            >
              <FileText size={16} color={activeTab === 'records' ? '#ffffff' : '#1E3A8A'} />
              <Text style={[styles.navText, activeTab === 'records' && styles.activeNavText]}>Records</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navButton, activeTab === 'appointments' && styles.activeNavButton]}
              onPress={() => handleTabChange('appointments')}
            >
              <Calendar size={16} color={activeTab === 'appointments' ? '#ffffff' : '#1E3A8A'} />
              <Text style={[styles.navText, activeTab === 'appointments' && styles.activeNavText]}>Appointments</Text>
            </TouchableOpacity>
            
            {/* messages removed */}
            
            <TouchableOpacity 
              style={[styles.navButton, activeTab === 'chatbot' && styles.activeNavButton]}
              onPress={() => handleTabChange('chatbot')}
            >
              <Bot size={16} color={activeTab === 'chatbot' ? '#ffffff' : '#1E3A8A'} />
              <Text style={[styles.navText, activeTab === 'chatbot' && styles.activeNavText]}>AI Assistant</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.navButton, activeTab === 'profile' && styles.activeNavButton]}
              onPress={() => handleTabChange('profile')}
            >
              <User size={16} color={activeTab === 'profile' ? '#ffffff' : '#1E3A8A'} />
              <Text style={[styles.navText, activeTab === 'profile' && styles.activeNavText]}>Profile</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.settingsButton}>
              <Settings size={20} color="#1E3A8A" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileImageContainer}>
              <User size={48} color="#1E3A8A" />
            </View>
            <Text style={styles.profileName}>{profileData.name}</Text>
            <Text style={styles.profileEmail}>{profileData.email}</Text>
            <TouchableOpacity style={styles.editButton}>
              <Edit3 size={16} color="#1E3A8A" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{profileData.phone}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>{profileData.dateOfBirth}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Blood Type</Text>
                <Text style={styles.infoValue}>{profileData.bloodType}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Emergency Contact</Text>
                <Text style={styles.infoValue}>{profileData.emergencyContact}</Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <View style={styles.menuList}>
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <TouchableOpacity key={item.id} style={styles.menuItem}>
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                        <IconComponent size={20} color={item.color} />
                      </View>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                    </View>
                    <Text style={styles.menuArrow}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton}>
            <LogOut size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    minWidth: 200,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  navigationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    gap: 6,
  },
  activeNavButton: {
    backgroundColor: '#1E3A8A',
  },
  navText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  activeNavText: {
    color: '#ffffff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCode: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  infoList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  menuList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  menuArrow: {
    fontSize: 20,
    color: '#6b7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#ef4444',
  },
});