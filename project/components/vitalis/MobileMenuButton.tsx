import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { Menu } from 'lucide-react-native';
import { useD, useDashboardStyles } from '../../hooks/useDashboardTheme';
import type { DashboardPalette } from '../../constants/DashboardColors';
import { VitalisNavId } from './vitalisNav';
import { MobileNavDrawer } from './MobileNavDrawer';

type Props = {
  activeNavId: VitalisNavId;
  userName?: string;
  onLogout?: () => void;
};

export function MobileMenuButton({ activeNavId, userName, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const D = useD();
  const styles = useDashboardStyles(createStyles);

  return (
    <>
      <Pressable
        style={styles.menuBtn}
        onPress={() => setOpen(true)}
        accessibilityLabel="Open navigation menu"
        accessibilityRole="button"
      >
        <Menu size={22} color={D.onSurfaceVariant} />
      </Pressable>
      <MobileNavDrawer
        visible={open}
        onClose={() => setOpen(false)}
        activeNavId={activeNavId}
        userName={userName}
        onLogout={onLogout}
      />
    </>
  );
}

function createStyles(D: DashboardPalette) {
  return {
    menuBtn: {
      padding: 8,
      borderRadius: 999,
      backgroundColor: D.surfaceContainerLow,
      borderWidth: 1,
      borderColor: D.borderMedium,
    },
  };
}
