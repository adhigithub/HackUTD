import { StyleSheet, View } from 'react-native';

import { ComingSoon } from '@/components/coming-soon';
import { RoleBadge } from '@/components/role-picker';
import { ThemedText } from '@/components/themed-text';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/auth-context';

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { user } = useAuth();
  if (!user) return null; // briefly null while signing out

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          BLUEPRINT
        </ThemedText>
        <ThemedText type="title">
          {greeting()}, {user.name.split(' ')[0]}
        </ThemedText>
        <RoleBadge role={user.role} />
      </View>

      <ComingSoon
        title="Portfolio overview"
        description="Total $ at risk across all buildings, alerts ranked by $, and what was auto-fixed overnight."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two, marginTop: Spacing.two },
});
