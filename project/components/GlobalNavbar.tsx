import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Home, FileText, Calendar, Bot, User, Activity, ScanLine } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const THEME = {
    navBg: '#0F172A',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    textActive: '#FFFFFF',
};

export default function GlobalNavbar({ activeTab }: { activeTab: string }) {
    const router = useRouter();
    const tabs = [
        { id: 'index', label: 'Dashboard', icon: Home, route: '/(tabs)' },
        { id: 'records', label: 'Records', icon: FileText, route: '/(tabs)/records' },
        { id: 'appointments', label: 'Appointments', icon: Calendar, route: '/(tabs)/appointments' },
        { id: 'chatbot', label: 'AI Assistant', icon: Bot, route: '/(tabs)/chatbot' },
        { id: 'meal-analyzer', label: 'GlucoScan', icon: ScanLine, route: '/(tabs)/meal-analyzer' },
        { id: 'profile', label: 'Profile', icon: User, route: '/(tabs)/profile' },
    ];

    return (
        <View style={navStyles.navbar}>
            <View style={navStyles.navLogo}>
                <Activity size={20} color="#FFF" />
                <Text style={navStyles.logoText}>CarePortal</Text>
            </View>
            <View style={navStyles.navLinks}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        onPress={() => router.push(tab.route as any)}
                        style={[navStyles.navItem, activeTab === tab.id && navStyles.activeNavItem]}
                    >
                        <tab.icon size={16} color={activeTab === tab.id ? THEME.textActive : THEME.textMuted} />
                        <Text style={[navStyles.navLabel, activeTab === tab.id && navStyles.activeNavLabel]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const navStyles = StyleSheet.create({
    navbar: {
        flexDirection: 'row',
        backgroundColor: THEME.navBg,
        paddingHorizontal: 20,
        height: 52,
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
    },
    navLogo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logoText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
    navLinks: { flexDirection: 'row', gap: 4 },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8
    },
    activeNavItem: { backgroundColor: 'rgba(255,255,255,0.1)' },
    navLabel: { color: THEME.textMuted, fontSize: 13, fontWeight: '600' },
    activeNavLabel: { color: THEME.textActive },
});
