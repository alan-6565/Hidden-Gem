import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { pickMediaFromLibrary, PickedMedia } from '../lib/mediaUpload';
import { colors, radius, spacing } from '../theme';

interface Props {
  onCaptured: (media: PickedMedia) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCaptured, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const wasLongPress = useRef(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  React.useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!micPermission?.granted) requestMicPermission();
  }, []);

  const handleTakePhoto = async () => {
    if (wasLongPress.current) {
      wasLongPress.current = false;
      return;
    }
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        onCaptured({ uri: photo.uri, isVideo: false, fileExtension: 'jpg' });
      }
    } catch (e: any) {
      Alert.alert("Couldn't take photo", e?.message ?? 'Please try again.');
    }
  };

  const handleStartRecording = async () => {
    wasLongPress.current = true;
    setIsRecording(true);
    try {
      const video = await cameraRef.current?.recordAsync({ maxDuration: 60 });
      if (video?.uri) {
        onCaptured({ uri: video.uri, isVideo: true, fileExtension: 'mov' });
      }
    } catch (e: any) {
      Alert.alert(
        "Couldn't record video",
        e?.message?.includes('SimulatorNotSupported')
          ? 'Video recording only works on a real device, not the simulator.'
          : e?.message ?? 'Please try again.',
      );
    } finally {
      setIsRecording(false);
    }
  };

  const handlePressOut = () => {
    if (isRecording) {
      cameraRef.current?.stopRecording();
    }
  };

  const handleChooseFromLibrary = async () => {
    const picked = await pickMediaFromLibrary({ allowVideos: true });
    if (picked) onCaptured(picked);
  };

  if (!cameraPermission || !micPermission) {
    return <View style={styles.container} />;
  }

  if (!cameraPermission.granted) {
    return (
      <View style={[styles.container, styles.permissionCenter, { paddingTop: insets.top }]}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.permissionText}>
          Camera access is needed to record a post.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="video" />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable style={styles.topButton} onPress={onClose}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <Pressable
          style={styles.topButton}
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
        >
          <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
        </Pressable>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable style={styles.galleryButton} onPress={handleChooseFromLibrary}>
          <Ionicons name="images" size={20} color="#fff" />
        </Pressable>

        <Pressable
          style={[styles.shutter, isRecording && styles.shutterRecording]}
          onPress={handleTakePhoto}
          onLongPress={handleStartRecording}
          onPressOut={handlePressOut}
          delayLongPress={250}
        >
          {isRecording && <View style={styles.shutterInnerRecording} />}
        </Pressable>

        <View style={styles.galleryButtonSpacer} />
      </View>

      {!isRecording && <Text style={styles.hint}>Tap for photo · Hold for video</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  permissionCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  permissionText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  topButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryButtonSpacer: {
    width: 44,
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRecording: {
    borderColor: colors.primary,
  },
  shutterInnerRecording: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  hint: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
});
