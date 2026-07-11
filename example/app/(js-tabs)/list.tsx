import { useState, useEffect } from 'react'
import { FlatList, StyleSheet, Switch, Text, View } from 'react-native'
import { getDirection, onDirectionChanged } from 'react-native-nitro-direction'
import { FlipButton } from '../../components/FlipButton'
import { COLORS } from '../../components/COLORS'
import { ScreenBody, Section } from '../../components/ScreenBody'

const ROWS = Array.from({ length: 40 }, (_, i) => ({ id: `${i}`, title: `Item ${i + 1}` }))
const CARDS = Array.from({ length: 12 }, (_, i) => ({ id: `h${i}`, title: `Card ${i + 1}` }))

export default function JsListTab() {
  const [isRTL, setIsRTL] = useState(getDirection() === 'rtl')
  const [inverted, setInverted] = useState(false)

  useEffect(() => onDirectionChanged((d) => setIsRTL(d === 'rtl')), [])

  return (
    <ScreenBody>
      <FlipButton />

      <Section title="Horizontal FlatList">
        <FlatList
          horizontal
          data={CARDS}
          keyExtractor={(i) => i.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardText}>{item.title}</Text>
            </View>
          )}
        />
      </Section>

      <Section title="Vertical FlatList (inverted + sticky)">
        <View style={styles.row}>
          <Text style={styles.label}>inverted</Text>
          <Switch value={inverted} onValueChange={setInverted} />
        </View>
        <View style={styles.listWrap}>
          <FlatList
            inverted={inverted}
            data={ROWS}
            keyExtractor={(i) => i.id}
            stickyHeaderIndices={[0]}
            style={styles.list}
            renderItem={({ item }) => (
              <View style={[styles.rowItem, item.title.endsWith('1') && styles.sticky]}>
                <Text style={styles.rowText}>{item.title}</Text>
                <Text style={styles.chev}>{isRTL ? '‹' : '›'}</Text>
              </View>
            )}
          />
        </View>
      </Section>
    </ScreenBody>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardText: { color: COLORS.text, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { color: COLORS.text, fontSize: 15, textAlign: 'left' },
  listWrap: { height: 260, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, overflow: 'hidden' },
  list: { backgroundColor: COLORS.card },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  sticky: { backgroundColor: COLORS.tint },
  rowText: { color: COLORS.text, fontSize: 15, textAlign: 'left' },
  chev: { color: COLORS.muted, fontSize: 18 },
})
