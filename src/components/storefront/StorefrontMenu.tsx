import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MenuItem } from '../../types';
import { MenuSection, StorefrontTheme } from '../../types/storefront';
import { radius, spacing, ThemeColors } from '../../theme';
import { imageSource } from '../../utils/storefrontImages';
import { formatPrice, fromPrice, headingFont, isSoldOut, onColor } from '../../utils/storefrontTheme';
import { cartTotals, CartLine } from '../../context/CartContext';
import { DecoratedTitle } from './Decorations';
import EditPen from './editor/EditPen';

const ALL = '__all';

interface Common {
  theme: StorefrontTheme;
  colors: ThemeColors;
}

function Photo({ src, style }: { src?: string; style: object }) {
  const source = imageSource(src);
  return source ? (
    <Image source={source} style={style} resizeMode="cover" />
  ) : (
    <View style={[style, styles.photoPlaceholder]}>
      <Ionicons name="cafe-outline" size={22} color="rgba(0,0,0,0.25)" />
    </View>
  );
}

function SoldOutTag({ colors }: { colors: ThemeColors }) {
  return (
    <View style={[styles.soldOutTag, { backgroundColor: colors.card }]}>
      <Text style={[styles.soldOutText, { color: colors.danger }]}>Sold out today</Text>
    </View>
  );
}

// ── "Popular today" / "Trending Now" / "Our Favorites" row ──────────────
export function FavoritesRow({
  theme,
  colors,
  title,
  items,
  onOpen,
  onSeeAll,
  onEditItem,
}: Common & {
  title?: string;
  items: MenuItem[];
  onOpen: (item: MenuItem) => void;
  onSeeAll: () => void;
  // Edit mode: shows a pencil on each card.
  onEditItem?: (item: MenuItem) => void;
}) {
  if (items.length === 0) return null;
  const heading = headingFont(theme);
  const showDescriptions = theme.hero.style === 'cover';
  // Over a patterned background every section sits on a solid card, so
  // titles and prices never land directly on the pattern.
  const carded = !!theme.background && theme.layout === 'cards';
  return (
    <View style={[styles.favorites, carded && [styles.surface, { backgroundColor: colors.card }]]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <DecoratedTitle theme={theme} placement="section-title-sides">
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: heading }, heading && styles.sectionTitleSerif]}>
              {title ?? theme.sections.favoritesTitle}
            </Text>
          </DecoratedTitle>
        </View>
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all →</Text>
        </Pressable>
      </View>
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.favoritesList}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.favCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onOpen(item)}
          >
            <View>
              <Photo src={item.photo} style={styles.favPhoto} />
              {isSoldOut(item) && <SoldOutTag colors={colors} />}
              {onEditItem && <EditPen onPress={() => onEditItem(item)} style={styles.cardPen} label={`Edit ${item.name}`} />}
            </View>
            <View style={styles.favBody}>
              <Text style={[styles.favName, { color: colors.text, fontFamily: heading }]} numberOfLines={2}>
                {item.name}
              </Text>
              {showDescriptions && item.description ? (
                <Text style={[styles.favDescription, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <Text style={[styles.favPrice, { color: showDescriptions ? colors.primary : colors.text }]}>
                {formatPrice(fromPrice(item))}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

// ── Full menu: section pills + grid or list ─────────────────────────────
export function MenuView({
  theme,
  colors,
  items,
  sections,
  canOrder,
  onOpen,
  onQuickAdd,
  onEditItem,
}: Common & {
  items: MenuItem[];
  sections: MenuSection[];
  canOrder: boolean;
  onOpen: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
  onEditItem?: (item: MenuItem) => void;
}) {
  const { width } = useWindowDimensions();
  // Only sections that have something in them; items with no (or a stale)
  // section land in "More" at the end so nothing silently disappears.
  const usable = useMemo(() => {
    const known = new Set(sections.map((s) => s.id));
    const list = sections.filter((s) => items.some((i) => i.sectionId === s.id));
    if (items.some((i) => !i.sectionId || !known.has(i.sectionId))) {
      list.push({ id: '__more', name: list.length ? 'More' : 'Menu' });
    }
    return list;
  }, [sections, items]);
  // "All" is the default so customers see the whole menu first (starting on
  // one section made shops look like they only had a few items). Items stay
  // grouped under their section headings either way.
  const [activeId, setActiveId] = useState<string>(ALL);
  const itemsOf = (sectionId: string) =>
    items.filter((i) =>
      sectionId === '__more'
        ? !i.sectionId || !sections.some((s) => s.id === i.sectionId)
        : i.sectionId === sectionId,
    );
  const activeSection = usable.find((s) => s.id === activeId);
  const groups = (activeSection ? [activeSection] : usable).map((section) => ({ section, items: itemsOf(section.id) }));
  const pills = usable.length > 1 ? [{ id: ALL, name: 'All' } as MenuSection, ...usable] : [];
  const heading = headingFont(theme);
  const addText = onColor(colors.primary);

  const addButton = (item: MenuItem, full: boolean) => {
    const soldOut = isSoldOut(item);
    const disabled = !canOrder || soldOut;
    return (
      <Pressable
        style={[
          full ? styles.addFull : styles.addPill,
          { backgroundColor: colors.primary },
          disabled && styles.addDisabled,
        ]}
        disabled={disabled}
        onPress={() => (item.options?.length ? onOpen(item) : onQuickAdd(item))}
        hitSlop={6}
      >
        <Text style={[styles.addLabel, { color: addText }]}>{soldOut ? 'Sold out' : 'Add'}</Text>
        {full && !soldOut && <Ionicons name="add" size={15} color={addText} />}
      </Pressable>
    );
  };

  const gridWidth = (width - spacing.md * 2 - spacing.sm) / 2;

  return (
    <View>
      {pills.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
        >
          {pills.map((s) => {
            const on = s.id === (activeSection ? activeSection.id : ALL);
            return (
              <Pressable
                key={s.id}
                onPress={() => setActiveId(s.id)}
                style={[
                  styles.pill,
                  { borderColor: colors.border, backgroundColor: on ? colors.primary : colors.card },
                ]}
              >
                <Text style={[styles.pillText, { color: on ? addText : colors.text }]}>{s.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {groups.map(({ section, items: groupItems }) => (
        <View key={section.id} style={styles.group}>
          {/* A lone "Menu" catch-all doesn't need a heading. */}
          {!(usable.length === 1 && section.id === '__more') && (
            <View style={styles.sectionIntro}>
              <Text
                style={[
                  theme.sections.menuLayout === 'list' ? styles.sectionIntroTitle : styles.sectionHeading,
                  { color: colors.text, fontFamily: heading },
                ]}
              >
                {section.name}
              </Text>
              {section.description ? (
                <Text style={[styles.sectionIntroText, { color: colors.textMuted }]}>{section.description}</Text>
              ) : null}
            </View>
          )}
          {theme.sections.menuLayout === 'list' ? (
            <View style={styles.list}>
              {groupItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.listRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => onOpen(item)}
                >
                  <View>
                    <Photo src={item.photo} style={styles.listPhoto} />
                    {onEditItem && <EditPen onPress={() => onEditItem(item)} style={styles.cardPen} label={`Edit ${item.name}`} />}
                  </View>
                  <View style={styles.listBody}>
                    <Text style={[styles.listName, { color: colors.text, fontFamily: heading }]}>{item.name}</Text>
                    {item.description ? (
                      <Text style={[styles.listDescription, { color: colors.textMuted }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    <View style={styles.listFooter}>
                      <Text style={[styles.listPrice, { color: colors.text }]}>{formatPrice(fromPrice(item))}</Text>
                      {isSoldOut(item) ? (
                        <Text style={[styles.soldOutInline, { color: colors.danger }]}>Sold out today</Text>
                      ) : (
                        addButton(item, false)
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.grid}>
              {groupItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.gridCard, { width: gridWidth, backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => onOpen(item)}
                >
                  <View>
                    <Photo src={item.photo} style={[styles.gridPhoto, { height: gridWidth * 0.78 }]} />
                    {isSoldOut(item) && <SoldOutTag colors={colors} />}
                    {onEditItem && <EditPen onPress={() => onEditItem(item)} style={styles.cardPen} label={`Edit ${item.name}`} />}
                  </View>
                  <View style={styles.gridBody}>
                    <Text style={[styles.gridName, { color: colors.text, fontFamily: heading }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={[styles.gridPrice, { color: colors.text }]}>{formatPrice(fromPrice(item))}</Text>
                    {addButton(item, true)}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ── Floating "View cart" bar ────────────────────────────────────────────
export function CartBar({ colors, lines, onPress }: { colors: ThemeColors; lines: CartLine[]; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const { count, total } = cartTotals(lines);
  if (count === 0) return null;
  const text = onColor(colors.primary);
  return (
    <Pressable
      style={[styles.cartBar, { backgroundColor: colors.primary, bottom: insets.bottom + spacing.sm }]}
      onPress={onPress}
    >
      <View>
        <Ionicons name="bag-handle-outline" size={22} color={text} />
        <View style={[styles.cartBadge, { backgroundColor: text }]}>
          <Text style={[styles.cartBadgeText, { color: colors.primary }]}>{count}</Text>
        </View>
      </View>
      <Text style={[styles.cartText, { color: text }]}>
        View cart · {count} {count === 1 ? 'item' : 'items'} · {formatPrice(total)}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photoPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPen: {
    top: 6,
    right: 6,
  },
  soldOutTag: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  soldOutText: {
    fontSize: 11,
    fontWeight: '800',
  },
  favorites: {
    marginTop: spacing.lg,
  },
  surface: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitleWrap: {
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionTitleSerif: {
    fontSize: 22,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
  },
  favoritesList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  favCard: {
    width: 132,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  favPhoto: {
    width: 132,
    height: 112,
  },
  favBody: {
    padding: spacing.sm,
    gap: 2,
  },
  favName: {
    fontSize: 13,
    fontWeight: '800',
  },
  favDescription: {
    fontSize: 11,
    lineHeight: 14,
  },
  favPrice: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  pills: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  pill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  group: {
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionIntro: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionIntroTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  sectionIntroText: {
    fontSize: 14,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  listRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
  },
  listPhoto: {
    width: 88,
    height: 88,
    borderRadius: radius.sm,
  },
  listBody: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '800',
  },
  listDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  listFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: spacing.xs,
  },
  listPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  soldOutInline: {
    fontSize: 12,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  gridCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  gridPhoto: {
    width: '100%',
  },
  gridBody: {
    padding: spacing.sm,
    gap: 4,
  },
  gridName: {
    fontSize: 14,
    fontWeight: '800',
    minHeight: 36,
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  addPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  addFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingVertical: 8,
    marginTop: 4,
  },
  addDisabled: {
    opacity: 0.4,
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  cartBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 54,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cartText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
  },
});
