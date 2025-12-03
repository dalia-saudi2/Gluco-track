import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Home, FileText, Calendar, MessageCircle, User, Menu, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface TopNavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, route: 'index' },
  { id: 'records', label: 'Records', icon: FileText, route: 'records' },
  { id: 'appointments', label: 'Appointments', icon: Calendar, route: 'appointments' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, route: 'messages' },
  { id: 'profile', label: 'Profile', icon: User, route: 'profile' },
];

export default function TopNavigation({ currentTab, onTabChange }: TopNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-300));

  const toggleMenu = () => {
    if (isMenuOpen) {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    setIsMenuOpen(!isMenuOpen);
  };

  const handleTabPress = (item: any) => {
    onTabChange(item.route);
    if (isMenuOpen) {
      toggleMenu();
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Navigation Bar */}
      <View style={styles.navBar}>
        {/* Mobile Menu Button */}
        <TouchableOpacity style={responsiveStyles.menuButton} onPress={toggleMenu}>
          {isMenuOpen ? <X size={24} color="#1E3A8A" /> : <Menu size={24} color="#1E3A8A" />}
        </TouchableOpacity>

        {/* Desktop Navigation Items */}
        <View style={responsiveStyles.desktopNav}>
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.route;
            
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.navItem, isActive && styles.activeNavItem]}
                onPress={() => handleTabPress(item)}
              >
                <IconComponent 
                  size={20} 
                  color={isActive ? '#ffffff' : '#1E3A8A'} 
                  strokeWidth={2}
                />
                <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Mobile Slide-out Menu */}
      <Animated.View style={[styles.mobileMenu, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.mobileMenuContent}>
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.route;
            
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.mobileNavItem, isActive && styles.activeMobileNavItem]}
                onPress={() => handleTabPress(item)}
              >
                <IconComponent 
                  size={24} 
                  color={isActive ? '#ffffff' : '#1E3A8A'} 
                  strokeWidth={2}
                />
                <Text style={[styles.mobileNavLabel, isActive && styles.activeMobileNavLabel]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <TouchableOpacity 
          style={styles.overlay} 
          onPress={toggleMenu}
          activeOpacity={1}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  desktopNav: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
    gap: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  activeNavItem: {
    backgroundColor: '#1E3A8A',
  },
  navLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  activeNavLabel: {
    color: '#ffffff',
  },
  mobileMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 280,
    height: '100vh',
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  mobileMenuContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    gap: 8,
  },
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
    gap: 12,
  },
  activeMobileNavItem: {
    backgroundColor: '#1E3A8A',
  },
  mobileNavLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E3A8A',
  },
  activeMobileNavLabel: {
    color: '#ffffff',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
});

// Responsive styles
const isMobile = width < 768;

const responsiveStyles = StyleSheet.create({
  menuButton: {
    display: isMobile ? 'flex' : 'none',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  desktopNav: {
    display: isMobile ? 'none' : 'flex',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
});
