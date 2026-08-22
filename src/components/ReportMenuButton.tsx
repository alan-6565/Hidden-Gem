import React from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ReportTargetType } from '../types';
import { colors } from '../theme';

const REPORT_REASONS = ['Spam', 'Inappropriate', 'Harassment', 'Other'];

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  authorUserId?: string | null;
  authorName?: string;
  color?: string;
  size?: number;
}

export default function ReportMenuButton({
  targetType,
  targetId,
  authorUserId,
  authorName,
  color,
  size,
}: Props) {
  const { user } = useAuth();
  const { reportContent, blockUser } = useAppData();

  const isOwnContent = !!authorUserId && !!user && authorUserId === user.id;
  if (isOwnContent) return null;

  const doReport = async (reason: string) => {
    try {
      await reportContent(targetType, targetId, reason);
      Alert.alert('Reported', "Thanks — we'll take a look.");
    } catch (e: any) {
      Alert.alert("Couldn't submit report", e?.message ?? 'Please try again.');
    }
  };

  const presentReasonPicker = () => {
    Alert.alert(
      'Report',
      'Why are you reporting this?',
      [
        ...REPORT_REASONS.map((reason) => ({ text: reason, onPress: () => doReport(reason) })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const handleBlock = () => {
    if (!authorUserId) return;
    Alert.alert(
      `Block ${authorName ?? 'this user'}?`,
      "You won't see their posts, reviews, or comments anymore.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(authorUserId);
            } catch (e: any) {
              Alert.alert("Couldn't block user", e?.message ?? 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const openMenu = () => {
    const buttons: any[] = [{ text: 'Report', onPress: presentReasonPicker }];
    if (authorUserId) {
      buttons.push({
        text: `Block ${authorName ?? 'user'}`,
        style: 'destructive',
        onPress: handleBlock,
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('More options', undefined, buttons);
  };

  return (
    <Pressable onPress={openMenu} hitSlop={8} style={styles.button}>
      <Ionicons name="ellipsis-horizontal" size={size ?? 16} color={color ?? colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 2,
  },
});
