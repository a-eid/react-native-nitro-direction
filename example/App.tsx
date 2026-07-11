import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'

import {
  setRTL,
  toggleDirection,
  isRTLLocale,
  layoutDirection,
} from 'react-native-nitro-direction'

type Row = { id: string; title: string }

const ROWS: Row[] = Array.from({ length: 40 }, (_, i) => ({
  id: `${i}`,
  title: `Item ${i + 1}`,
}))

const HORIZONTAL: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: `h${i}`,
  title: `Card ${i + 1}`,
}))

export default function App() {
  const [isRTL, setIsRTL] = useState(layoutDirection.isRTL)
  const [modalOpen, setModalOpen] = useState(false)
  const [text, setText] = useState('Type here — cursor should stay sane on flip')
  const [switchOn, setSwitchOn] = useState(true)
  const [invertedList, setInvertedList] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const [offset, setOffset] = useState(0)

  // Subscribe to native direction changes (so flipping from outside JS — e.g.
  // a future device-language-change hook — keeps the readout honest).
  useEffect(() => {
    layoutDirection.onDirectionChanged = (rtl: boolean) => setIsRTL(rtl)
    return () => {
      layoutDirection.onDirectionChanged = undefined
    }
  }, [])

  const flip = useCallback(async () => {
    await toggleDirection()
    setIsRTL(layoutDirection.isRTL)
  }, [])

  return (
    <View style={styles.root}>
      {/* Header + the one big button */}
      <View style={styles.header}>
        <Text style={styles.h1}>react-native-nitro-direction</Text>
        <Text style={styles.readout}>
          direction: <Text style={styles.bold}>{isRTL ? 'RTL →' : '← LTR'}</Text>
        </Text>
        <Pressable style={styles.flipBtn} onPress={flip}>
          <Text style={styles.flipBtnText}>Flip to {isRTL ? 'LTR' : 'RTL'}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={(e) => setOffset(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={160}
        contentContainerStyle={styles.body}
      >
        {/* 1. TextInput — cursor, selection, placeholder alignment */}
        <Section title="1 · TextInput">
          <TextInput
            value={text}
            onChangeText={setText}
            style={styles.input}
            placeholder="Placeholder should flip side"
            multiline
          />
          <Text style={styles.muted}>scroll offset preserved across flip: {Math.round(offset)}</Text>
        </Section>

        {/* 2. FlatList — horizontal */}
        <Section title="2 · FlatList (horizontal)">
          <FlatList
            horizontal
            data={HORIZONTAL}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardText}>{item.title}</Text>
              </View>
            )}
          />
        </Section>

        {/* 3. FlatList — inverted toggle + sticky headers */}
        <Section title="3 · FlatList (inverted + sticky header)">
          <View style={styles.row}>
            <Text style={styles.label}>inverted</Text>
            <Switch value={invertedList} onValueChange={setInvertedList} />
          </View>
          <View style={styles.listWrap}>
            <FlatList
              inverted={invertedList}
              data={ROWS}
              keyExtractor={(item) => item.id}
              stickyHeaderIndices={[0]}
              style={styles.list}
              renderItem={({ item }) => (
                <View style={[styles.rowItem, item.title.endsWith('0') && styles.sticky]}>
                  <Text style={styles.rowText}>{item.title}</Text>
                  <Text style={styles.chev}>{isRTL ? '‹' : '›'}</Text>
                </View>
              )}
            />
          </View>
        </Section>

        {/* 4. Modal — flip while open, and open after flip */}
        <Section title="4 · Modal">
          <Pressable style={styles.btn} onPress={() => setModalOpen(true)}>
            <Text style={styles.btnText}>Open modal</Text>
          </Pressable>
          <Text style={styles.muted}>Open it, then hit Flip — modal should re-mirror in place.</Text>
        </Section>

        {/* 5. Locale helper smoke test */}
        <Section title="5 · applyLocaleDirection">
          <View style={styles.row}>
            <Pressable
              style={styles.btn}
              onPress={async () => {
                await setRTL(isRTLLocale('ar'))
                setIsRTL(layoutDirection.isRTL)
              }}>
              <Text style={styles.btnText}>ar → RTL</Text>
            </Pressable>
            <Pressable
              style={styles.btn}
              onPress={async () => {
                await setRTL(isRTLLocale('en'))
                setIsRTL(layoutDirection.isRTL)
              }}>
              <Text style={styles.btnText}>en → LTR</Text>
            </Pressable>
          </View>
        </Section>

        <Text style={styles.muted}>
          This screen is a stability torture-test: flip repeatedly, in every
          state (modal open, keyboard up, mid-scroll). Nothing should restart,
          remount, or lose state.
        </Text>
      </ScrollView>

      {/* The modal that must survive a flip while open */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Modal open during flip</Text>
            <Text style={styles.muted}>
              Press Flip on the header button without dismissing — the modal
              chrome and its content should mirror without closing.
            </Text>
            <Pressable style={styles.btn} onPress={() => setModalOpen(false)}>
              <Text style={styles.btnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

const COLORS = {
  bg: '#0b0d10',
  card: '#161a1f',
  border: '#262c34',
  text: '#e8eaed',
  muted: '#8b939e',
  tint: '#5b8cff',
  onTint: '#ffffff',
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  h1: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'left' },
  readout: { fontSize: 14, color: COLORS.muted, textAlign: 'left' },
  bold: { color: COLORS.tint, fontWeight: '700' },
  flipBtn: {
    backgroundColor: COLORS.tint,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  flipBtnText: { color: COLORS.onTint, fontWeight: '700', fontSize: 15 },
  body: { padding: 20, gap: 24, paddingBottom: 80 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'left' },
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'left',
  },
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
  btn: {
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    alignItems: 'center',
  },
  btnText: { color: COLORS.text, fontWeight: '600' },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 18, textAlign: 'left' },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700', textAlign: 'left' },
})
