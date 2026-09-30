import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useAppData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { Spot } from '../../../types';
import { Block, BlockType, StorefrontTheme } from '../../../types/storefront';
import { homeBlocks, resolveStorefront } from '../../../utils/storefrontTheme';
import { pickMediaFromLibrary, uploadMedia } from '../../../lib/mediaUpload';
import { buildDecor, DecorChoices, readDecor } from './decor';

export type EditorSheet =
  | { kind: 'design' }
  | { kind: 'header'; focus: 'text' | 'photo' | 'buttons' }
  | { kind: 'block'; id: string }
  | { kind: 'add'; index: number }
  | { kind: 'arrange' }
  | { kind: 'item'; itemId: string };

let blockSeq = 0;
const newBlockId = () => `b${Date.now().toString(36)}${(blockSeq++).toString(36)}`;

// Everything edit mode needs: the draft design being edited (autosaved to
// storefront_draft), section operations, uploads, publish, and which
// bottom panel is open. Returns null when not editing.
export function useStorefrontEditor(spot: Spot | undefined, enabled: boolean) {
  const { updateSpot } = useAppData();
  const { user } = useAuth();

  const published = useMemo(() => resolveStorefront(spot?.storefront), [spot?.storefront]);
  const [base, setBase] = useState<StorefrontTheme>(() => resolveStorefront(spot?.storefrontDraft ?? spot?.storefront));
  const [decor, setDecor] = useState<DecorChoices>(() => readDecor(base.decorations));
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [uploading, setUploading] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [sheet, setSheet] = useState<EditorSheet | null>(null);

  const theme = useMemo<StorefrontTheme>(() => ({ ...base, decorations: buildDecor(decor, base) }), [base, decor]);
  const latest = useRef(theme);
  latest.current = theme;

  // Autosave the draft, debounced.
  const firstRun = useRef(true);
  useEffect(() => {
    if (!enabled || !spot) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState('saving');
    const timer = setTimeout(() => {
      updateSpot(spot.id, { storefrontDraft: latest.current })
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 700);
    return () => clearTimeout(timer);
  }, [theme, enabled, spot, updateSpot]);

  const flushDraft = useCallback(async () => {
    if (!spot) return;
    setSaveState('saving');
    try {
      await updateSpot(spot.id, { storefrontDraft: latest.current });
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      throw e;
    }
  }, [spot, updateSpot]);

  // ── Theme setters ──────────────────────────────────────────────────────
  const set = (patch: Partial<StorefrontTheme>) => setBase((t) => ({ ...t, ...patch }));
  const setColors = (patch: Partial<StorefrontTheme['colors']>) =>
    setBase((t) => ({ ...t, colors: { ...t.colors, ...patch } }));
  const setHero = (patch: Partial<StorefrontTheme['hero']>) => setBase((t) => ({ ...t, hero: { ...t.hero, ...patch } }));
  const setSections = (patch: Partial<StorefrontTheme['sections']>) =>
    setBase((t) => ({ ...t, sections: { ...t.sections, ...patch } }));
  const setBackground = (patch: Partial<NonNullable<StorefrontTheme['background']>>) =>
    setBase((t) => ({
      ...t,
      background: {
        image: null,
        fit: 'fill',
        size: 60,
        strength: 40,
        fixedWhileScrolling: true,
        ...(t.background ?? {}),
        ...patch,
      },
    }));

  // ── Sections ───────────────────────────────────────────────────────────
  const name = spot?.name ?? '';
  const blocks = homeBlocks(theme, name);
  const setBlocks = (fn: (blocks: Block[]) => Block[]) =>
    setBase((t) => ({ ...t, blocks: fn(homeBlocks(t, name)) }));
  const moveBlock = (index: number, delta: number) =>
    setBlocks((bs) => {
      const to = index + delta;
      if (to < 0 || to >= bs.length) return bs;
      const next = [...bs];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  const updateBlock = (id: string, patch: Partial<Block>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const toggleHidden = (id: string) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b)));
  const duplicateBlock = (id: string) =>
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.id === id);
      if (i < 0) return bs;
      const copy = { ...bs[i], id: newBlockId() };
      return [...bs.slice(0, i + 1), copy, ...bs.slice(i + 1)];
    });
  const removeBlock = (id: string) => setBlocks((bs) => bs.filter((b) => b.id !== id));
  const addBlock = (index: number, type: BlockType, extra: Partial<Block> = {}) => {
    const block: Block = { id: newBlockId(), type, ...extra };
    setBlocks((bs) => [...bs.slice(0, index), block, ...bs.slice(index)]);
    return block;
  };

  // ── Uploads ────────────────────────────────────────────────────────────
  const upload = async (key: string, apply: (url: string) => void) => {
    if (!user) return;
    setUploading(key);
    try {
      const picked = await pickMediaFromLibrary({ allowVideos: false });
      if (!picked) return;
      apply(await uploadMedia(user.id, picked));
    } catch (e: any) {
      Alert.alert("Couldn't upload", e?.message ?? 'Please try again.');
    } finally {
      setUploading(null);
    }
  };

  // ── Publish / reset ────────────────────────────────────────────────────
  const unpublished = !spot?.storefront || JSON.stringify(theme) !== JSON.stringify(published);
  const publish = async () => {
    if (!spot) return false;
    setPublishing(true);
    try {
      await updateSpot(spot.id, { storefront: latest.current, storefrontDraft: latest.current });
      return true;
    } catch (e: any) {
      Alert.alert("Couldn't publish", e?.message ?? 'Please try again.');
      return false;
    } finally {
      setPublishing(false);
    }
  };
  const discardChanges = () => {
    setBase(published);
    setDecor(readDecor(published.decorations));
  };

  if (!enabled || !spot) return null;
  return {
    spot,
    theme,
    base,
    setBase,
    decor,
    setDecor,
    set,
    setColors,
    setHero,
    setSections,
    setBackground,
    blocks,
    moveBlock,
    updateBlock,
    toggleHidden,
    duplicateBlock,
    removeBlock,
    addBlock,
    upload,
    uploading,
    saveState,
    flushDraft,
    unpublished,
    publish,
    publishing,
    discardChanges,
    sheet,
    openSheet: setSheet,
    closeSheet: () => setSheet(null),
  };
}

export type StorefrontEditor = NonNullable<ReturnType<typeof useStorefrontEditor>>;
