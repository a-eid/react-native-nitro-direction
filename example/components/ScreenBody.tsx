import { type ReactNode } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { COLORS } from './COLORS'

export function ScreenBody({ children }: { children: ReactNode }) {
  return (
    <FlatList
      data={[null]}
      keyExtractor={() => 'root'}
      renderItem={() => <View style={styles.body}>{children}</View>}
    />
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 24, paddingBottom: 80 },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'left',
  },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 18, textAlign: 'left' },
})
