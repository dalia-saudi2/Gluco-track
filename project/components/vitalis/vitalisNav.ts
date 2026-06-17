import {
  LayoutDashboard,
  Calendar,
  ScanLine,
  FolderOpen,
  Bot,
  User,
  Heart,
} from 'lucide-react-native';

export const VITALIS_NAV = [
  { id: 'index', label: 'Dashboard', icon: LayoutDashboard, route: '/(tabs)' },
  { id: 'appointments', label: 'Appointment', icon: Calendar, route: '/(tabs)/appointments' },
  { id: 'meal-analyzer', label: 'GlucoScan AI', icon: ScanLine, route: '/(tabs)/meal-analyzer' },
  { id: 'health', label: 'Health Sync', icon: Heart, route: '/(tabs)/health' },
  { id: 'records', label: 'Records', icon: FolderOpen, route: '/(tabs)/records' },
  { id: 'chatbot', label: 'AI Assistant', icon: Bot, route: '/(tabs)/chatbot' },
  { id: 'profile', label: 'Profile', icon: User, route: '/(tabs)/profile' },
] as const;

export type VitalisNavId = (typeof VITALIS_NAV)[number]['id'];
