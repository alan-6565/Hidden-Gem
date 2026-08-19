import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../context/DataContext';
import { CURRENT_USER_DISPLAY } from '../constants';
import { colors, radius, spacing } from '../theme';

interface Props {
  postId: string;
  visible: boolean;
  onClose: () => void;
}

export default function CommentsSheet({ postId, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { comments, addComment } = useAppData();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const postComments = useMemo(
    () => comments.filter((c) => c.postId === postId),
    [comments, postId],
  );

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await addComment(postId, trimmed);
      setText('');
    } catch (e: any) {
      Alert.alert("Couldn't post comment", e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          style={styles.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Comments ({postComments.length})</Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <FlatList
            data={postComments}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Be the first to comment.</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
                <View style={styles.commentBody}>
                  <Text style={styles.commentAuthor}>{item.userName}</Text>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>
              </View>
            )}
          />

          <View style={[styles.inputRow, { paddingBottom: insets.bottom + spacing.sm }]}>
            <Image source={{ uri: CURRENT_USER_DISPLAY.avatar }} style={styles.inputAvatar} />
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
            />
            <Pressable
              hitSlop={8}
              onPress={handleSend}
              disabled={submitting || !text.trim()}
            >
              <Ionicons
                name="send"
                size={22}
                color={text.trim() ? colors.primary : colors.textMuted}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    height: '65%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream,
  },
  commentBody: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  commentText: {
    fontSize: 13,
    color: colors.text,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cream,
  },
  input: {
    flex: 1,
    maxHeight: 90,
    fontSize: 14,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
});
