import React, { useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spot } from '../../types';
import { CanvasItem, ElementStyle, StorefrontTheme } from '../../types/storefront';
import { ThemeColors } from '../../theme';
import { imageSource } from '../../utils/storefrontImages';
import { onColor } from '../../utils/storefrontTheme';
import {
  canvasAspect,
  canvasItems,
  defaultItem,
  DESIGN_WIDTH,
  fontFamily,
  HEADER_ELEMENTS,
  photoBand,
  resolveElement,
} from '../../utils/headerLayout';
import { CornerDecorations, DecoratedTitle } from './Decorations';
import EditPen from './editor/EditPen';

// Edit-mode hooks for the canvas. Absent for customers.
export interface CanvasEditing {
  selectedId: string | null;
  zoom: number;
  onSelect: (id: string | null) => void;
  onMove: (id: string, patch: Pick<ElementStyle, 'x' | 'y'>) => void;
  onEdit: (id: string) => void;
  onHide: (id: string) => void;
  onDragChange: (dragging: boolean) => void;
}

interface Frame {
  width: number; // canvas width (px)
  height: number; // canvas content height (px)
  top: number; // px above the content area (status bar etc.)
  scale: number; // px per design point
}

// ── One draggable element ────────────────────────────────────────────────
function CanvasElement({
  id,
  el,
  frame,
  editing,
  label,
  onGuide,
  children,
}: {
  id: string;
  el: ElementStyle;
  frame: Frame;
  editing?: CanvasEditing;
  label: string;
  onGuide: (show: boolean) => void;
  children: React.ReactNode;
}) {
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const x = el.x ?? 50;
  const y = el.y ?? 0;
  const w = el.w ?? 60;
  const width = (w / 100) * frame.width;
  const left = (x / 100) * frame.width - width / 2;
  const top = frame.top + (y / 100) * frame.height;
  const selected = editing?.selectedId === id;

  // The responder is created once; read the latest values through a ref.
  const live = useRef({ editing, x, y, w, frame, selected, moved: false, snapped: false });
  live.current = { ...live.current, editing, x, y, w, frame, selected };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!live.current.editing,
      onMoveShouldSetPanResponder: () => !!live.current.editing,
      // Don't let the page's ScrollView steal a drag in progress.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        live.current.moved = false;
        live.current.editing?.onDragChange(true);
      },
      onPanResponderMove: (_, g) => {
        const L = live.current;
        const zoom = L.editing?.zoom ?? 1;
        let dx = g.dx / zoom;
        const dy = g.dy / zoom;
        if (Math.abs(dx) + Math.abs(dy) > 4) L.moved = true;
        // Snap to the horizontal center.
        const centerX = (L.x / 100) * L.frame.width + dx;
        const snapped = Math.abs(centerX - L.frame.width / 2) < L.frame.width * 0.025;
        if (snapped) dx = L.frame.width / 2 - (L.x / 100) * L.frame.width;
        if (snapped !== L.snapped) {
          L.snapped = snapped;
          onGuide(snapped);
        }
        setDrag({ dx, dy });
      },
      onPanResponderRelease: (_, g) => {
        const L = live.current;
        const ed = L.editing;
        ed?.onDragChange(false);
        onGuide(false);
        L.snapped = false;
        setDrag(null);
        if (!ed) return;
        if (!L.moved) {
          // Tap: select, or open the panel if it's already selected.
          if (L.selected) ed.onEdit(id);
          else ed.onSelect(id);
          return;
        }
        const zoom = ed.zoom;
        let dx = g.dx / zoom;
        const dy = g.dy / zoom;
        const centerX = (L.x / 100) * L.frame.width + dx;
        if (Math.abs(centerX - L.frame.width / 2) < L.frame.width * 0.025) {
          dx = L.frame.width / 2 - (L.x / 100) * L.frame.width;
        }
        const half = L.w / 2;
        const nextX = Math.min(100 - half + 20, Math.max(half - 20, L.x + (dx / L.frame.width) * 100));
        const nextY = Math.min(98, Math.max(-6, L.y + (dy / L.frame.height) * 100));
        ed.onSelect(id);
        ed.onMove(id, { x: Math.round(nextX * 10) / 10, y: Math.round(nextY * 10) / 10 });
      },
      onPanResponderTerminate: () => {
        live.current.editing?.onDragChange(false);
        onGuide(false);
        setDrag(null);
      },
    }),
  ).current;

  return (
    <View
      {...(editing ? responder.panHandlers : {})}
      accessibilityLabel={editing ? `${label}: tap to select, drag to move` : undefined}
      style={[
        styles.element,
        { left: left + (drag?.dx ?? 0), top: top + (drag?.dy ?? 0), width },
        editing && styles.elementEditable,
        selected && styles.elementSelected,
      ]}
    >
      {/* In edit mode the element is a drag handle; its buttons don't fire. */}
      <View pointerEvents={editing ? 'none' : 'auto'}>{children}</View>
      {selected && editing && !drag && (
        <View style={styles.handles}>
          <Pressable style={styles.handle} onPress={() => editing.onEdit(id)} hitSlop={6} accessibilityLabel={`Edit ${label}`}>
            <Ionicons name="pencil" size={13} color="#EE4C6A" />
          </Pressable>
          <Pressable style={styles.handle} onPress={() => editing.onHide(id)} hitSlop={6} accessibilityLabel={`Remove ${label}`}>
            <Ionicons name="trash-outline" size={13} color="#5E4B52" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Text and buttons as they render inside elements ──────────────────────
function ElementText({ el, text, scale, weight, spaced }: { el: ElementStyle; text: string; scale: number; weight: '500' | '700' | '800'; spaced?: boolean }) {
  const size = (el.size ?? 16) * scale;
  const family = fontFamily(el.font);
  return (
    <Text
      style={{
        color: el.color,
        fontSize: size,
        lineHeight: size * (el.font === 'script' || el.font === 'handwritten' ? 1.05 : 1.18),
        textAlign: el.align ?? 'center',
        fontFamily: family,
        fontWeight: family ? undefined : weight,
        letterSpacing: spaced ? 3 : undefined,
      }}
    >
      {text}
    </Text>
  );
}

export function ElementButton({
  el,
  label,
  icon,
  colors,
  onPhoto,
  onPress,
}: {
  el: ElementStyle;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  colors: ThemeColors;
  onPhoto?: boolean;
  onPress?: () => void;
}) {
  const filled = el.variant !== 'outline';
  const fill = el.fill ?? colors.primary;
  const textColor = el.textColor ?? (filled ? onColor(fill) : onPhoto ? '#FFFFFF' : colors.text);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        filled
          ? { backgroundColor: fill }
          : { borderWidth: 1.5, borderColor: el.fill ?? textColor, backgroundColor: onPhoto ? 'rgba(0,0,0,0.15)' : colors.card },
      ]}
    >
      {icon && <Ionicons name={icon} size={15} color={textColor} />}
      <Text style={[styles.buttonText, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// Canvas items: owner-added text and stickers.
function ItemContent({ item, el, scale }: { item: CanvasItem; el: ElementStyle; scale: number }) {
  if (item.kind === 'sticker') {
    const src = imageSource(item.image);
    return src ? <Image source={src} style={{ width: '100%', aspectRatio: 1 }} resizeMode="contain" /> : null;
  }
  return <ElementText el={el} text={item.text ?? ''} scale={scale} weight="700" />;
}

// ── The canvas (Big title and Full photo headers) ─────────────────────────
export default function HeaderCanvas({
  spot,
  theme,
  colors,
  editing,
  onPrimary,
  onSecondary,
}: {
  spot: Spot;
  theme: StorefrontTheme;
  colors: ThemeColors;
  editing?: CanvasEditing;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [guide, setGuide] = useState(false);
  const style = theme.hero.style;
  const photoStyle = style === 'photo';
  const frame: Frame = {
    width,
    height: width * canvasAspect(style),
    top: insets.top + (photoStyle ? 44 : 50),
    scale: width / DESIGN_WIDTH,
  };
  const total = frame.top + frame.height;
  const photo = imageSource(theme.hero.image ?? spot.photos[0] ?? null);
  const band = photoBand(style);
  const iconsOnly = { ...theme, decorations: theme.decorations.filter((d) => d.kind === 'icon') };

  const texts: Record<string, string | null | undefined> = {
    eyebrow: photoStyle ? theme.hero.eyebrow : null,
    name: theme.hero.headline ?? spot.name,
    tagline: theme.hero.tagline,
    intro: theme.hero.subtext,
  };

  const renderBuiltIn = (id: string) => {
    const el = resolveElement(theme, id);
    if (el.hidden) return null;
    if (id === 'primaryButton' || id === 'secondaryButton') {
      const primary = id === 'primaryButton';
      const label = primary ? theme.hero.primaryCta : theme.hero.secondaryCta;
      const icon: keyof typeof Ionicons.glyphMap | undefined = primary
        ? photoStyle
          ? 'arrow-forward'
          : undefined
        : theme.hero.secondaryAction === 'directions'
          ? 'location-outline'
          : undefined;
      return (
        <CanvasElement key={id} id={id} el={el} frame={frame} editing={editing} label={primary ? 'Main button' : 'Second button'} onGuide={setGuide}>
          <ElementButton el={el} label={label} icon={icon} colors={colors} onPhoto={photoStyle} onPress={primary ? onPrimary : onSecondary} />
        </CanvasElement>
      );
    }
    // Empty texts are invisible to customers, but in edit mode they show as
    // faded placeholders so the owner has something to tap and fill in.
    const PLACEHOLDERS: Record<string, string> = {
      eyebrow: 'Add a small label',
      tagline: 'Add a tagline',
      intro: 'Add a short intro',
    };
    const text = texts[id] || (editing && id in PLACEHOLDERS && !(id === 'eyebrow' && !photoStyle) ? PLACEHOLDERS[id] : null);
    if (!text) return null;
    const placeholder = !texts[id];
    const node = (
      <View style={placeholder ? styles.placeholder : undefined}>
        <ElementText el={el} text={text} scale={frame.scale} weight={id === 'name' ? '800' : id === 'eyebrow' ? '700' : '500'} spaced={id === 'eyebrow'} />
      </View>
    );
    return (
      <CanvasElement key={id} id={id} el={el} frame={frame} editing={editing} label={id === 'name' ? 'Name' : id === 'tagline' ? 'Tagline' : id === 'intro' ? 'Intro' : 'Label'} onGuide={setGuide}>
        {id === 'name' ? (
          <DecoratedTitle theme={theme} placement="title-sides">
            {node}
          </DecoratedTitle>
        ) : (
          node
        )}
      </CanvasElement>
    );
  };

  return (
    <View
      style={{ height: total, backgroundColor: photoStyle ? colors.text : colors.background }}
    >
      {!photoStyle && (
        <LinearGradient colors={[colors.blush, colors.background]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      )}
      {/* Tap empty canvas to deselect (below the photo pencil and elements). */}
      {editing && <Pressable style={StyleSheet.absoluteFill} onPress={() => editing.onSelect(null)} />}
      {photo && (
        <View
          pointerEvents="box-none"
          style={
            photoStyle
              ? [StyleSheet.absoluteFill, styles.clip]
              : {
                  overflow: 'hidden',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: frame.top + (band.top / 100) * frame.height,
                  height: ((band.bottom - band.top) / 100) * frame.height,
                }
          }
        >
          <Image source={photo} style={styles.fill} resizeMode="cover" />
          {photoStyle ? (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.78)']}
              locations={[0.25, 0.5, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          ) : (
            <>
              <LinearGradient colors={[colors.background, 'transparent']} style={styles.fadeTop} pointerEvents="none" />
              <LinearGradient colors={['transparent', colors.background]} style={styles.fadeBottom} pointerEvents="none" />
            </>
          )}
          <CornerDecorations theme={iconsOnly} />
          {editing && (
            <EditPen onPress={() => editing.onEdit('photo')} style={{ top: 10, right: 14 }} label="Change header photo" />
          )}
        </View>
      )}
      {editing && !photo && (
        <Pressable style={[styles.addPhoto, { top: frame.top + (band.top / 100) * frame.height + 20 }]} onPress={() => editing.onEdit('photo')}>
          <Ionicons name="image-outline" size={18} color="#EE4C6A" />
          <Text style={styles.addPhotoText}>Add a header photo</Text>
        </Pressable>
      )}

      {HEADER_ELEMENTS.map(renderBuiltIn)}
      {canvasItems(theme).map((item, i) => {
        const el = resolveElement(theme, item.id, defaultItem(theme, item, i));
        if (el.hidden) return null;
        return (
          <CanvasElement key={item.id} id={item.id} el={el} frame={frame} editing={editing} label={item.kind === 'sticker' ? 'Sticker' : 'Text'} onGuide={setGuide}>
            <ItemContent item={item} el={el} scale={frame.scale} />
          </CanvasElement>
        );
      })}

      {guide && <View pointerEvents="none" style={[styles.guide, { left: width / 2 - 0.5 }]} />}
    </View>
  );
}

// The cover header's band only holds owner-added items (text, stickers).
export function CoverCanvasItems({
  theme,
  height,
  top,
  editing,
}: {
  theme: StorefrontTheme;
  height: number;
  top: number;
  editing?: CanvasEditing;
}) {
  const { width } = useWindowDimensions();
  const [guide, setGuide] = useState(false);
  const frame: Frame = { width, height, top, scale: width / DESIGN_WIDTH };
  return (
    <>
      {canvasItems(theme).map((item, i) => {
        const el = resolveElement(theme, item.id, defaultItem(theme, item, i));
        if (el.hidden) return null;
        return (
          <CanvasElement key={item.id} id={item.id} el={el} frame={frame} editing={editing} label={item.kind === 'sticker' ? 'Sticker' : 'Text'} onGuide={setGuide}>
            <ItemContent item={item} el={el} scale={frame.scale} />
          </CanvasElement>
        );
      })}
      {guide && <View pointerEvents="none" style={[styles.guide, { left: width / 2 - 0.5, top: 0, bottom: 0 }]} />}
    </>
  );
}

const styles = StyleSheet.create({
  element: {
    position: 'absolute',
    zIndex: 2,
  },
  elementEditable: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(238,76,106,0.5)',
    borderRadius: 8,
  },
  elementSelected: {
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#EE4C6A',
    zIndex: 4,
  },
  handles: {
    position: 'absolute',
    top: -16,
    right: -6,
    flexDirection: 'row',
    gap: 4,
  },
  handle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAD9DC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  button: {
    height: 46,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  // Images drawn with resizeMode "cover" can spill past their box; keep
  // the header photo inside it.
  placeholder: {
    opacity: 0.4,
  },
  clip: {
    overflow: 'hidden',
  },
  // Explicit size: with only absolute edges the image was laid out at its
  // own larger size and showed zoomed in.
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  guide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#EE4C6A',
    zIndex: 10,
  },
  addPhoto: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#EE4C6A',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 1,
  },
  addPhotoText: {
    color: '#EE4C6A',
    fontWeight: '800',
    fontSize: 13,
  },
});
