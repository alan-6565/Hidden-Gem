import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import SpotPreviewCard from '../components/SpotPreviewCard';
import { spacing, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { TabScreenProps } from '../navigation/types';
import { isPromoted } from '../utils/promotion';

type Props = TabScreenProps<'Map'>;

// Web preview only — react-native-maps has no web implementation, so the
// browser build lists spots instead. The iOS/Android apps use MapScreen.tsx.
export default function MapScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { spots } = useAppData();

  const sorted = useMemo(
    () =>
      [...spots].sort((a, b) => {
        const promoDiff = Number(isPromoted(b)) - Number(isPromoted(a));
        return promoDiff !== 0 ? promoDiff : b.teaScore - a.teaScore;
      }),
    [spots],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.title}>Spots</Text>
      <Text style={styles.hint}>The live map is available in the mobile app.</Text>
      <FlatList
        data={sorted}
        keyExtractor={(spot) => spot.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <SpotPreviewCard spot={item} onPress={() => navigation.navigate('SpotProfile', { spotId: item.id })} />
        )}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      paddingHorizontal: spacing.md,
    },
    hint: {
      fontSize: 12,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      marginTop: 2,
      marginBottom: spacing.sm,
    },
    list: {
      padding: spacing.md,
    },
  });
