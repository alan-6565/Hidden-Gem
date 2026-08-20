import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export interface PickedMedia {
  uri: string;
  isVideo: boolean;
  fileExtension: string;
}

export async function pickMediaFromLibrary(
  options: { allowVideos?: boolean } = {},
): Promise<PickedMedia | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library access is required to attach media.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: options.allowVideos ? ['images', 'videos'] : ['images'],
    quality: 0.7,
    videoMaxDuration: 60,
  });

  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const isVideo = asset.type === 'video';
  const fileExtension = asset.uri.split('.').pop()?.toLowerCase() ?? (isVideo ? 'mp4' : 'jpg');

  return { uri: asset.uri, isVideo, fileExtension };
}

export async function uploadMedia(userId: string, media: PickedMedia): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(media.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const path = `${userId}/${Date.now()}.${media.fileExtension}`;
  const contentType = media.isVideo ? `video/${media.fileExtension}` : `image/${media.fileExtension}`;

  const { error } = await supabase.storage
    .from('media')
    .upload(path, decode(base64), { contentType });
  if (error) throw error;

  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

// Verification photos (ID, business/storefront) go to a private bucket, not
// the public `media` bucket used above — they're never publicly readable,
// only viewable by the uploader or an admin via a signed URL. Returns the
// storage path (not a URL), since there's no public URL for a private object.
export async function uploadVerificationDoc(userId: string, media: PickedMedia): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(media.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const path = `${userId}/${Date.now()}.${media.fileExtension}`;
  const contentType = `image/${media.fileExtension}`;

  const { error } = await supabase.storage
    .from('verification-docs')
    .upload(path, decode(base64), { contentType });
  if (error) throw error;

  return path;
}
