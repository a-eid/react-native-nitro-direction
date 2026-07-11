import { Stack } from 'expo-router'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { FlipButton } from '../components/FlipButton'
import { COLORS } from '../components/COLORS'

const ITEMS = Array.from({ length: 25 }, (_, i) => ({
  id: `${i}`,
  title: ['Photos', 'Videos', 'Documents', 'Music', 'Downloads', 'Archives', 'Code'][i % 7],
  count: Math.floor(Math.random() * 200) + 1,
}))

export default function FilesScreen() {
  return (
    <>
      <Stack.Screen options={{ headerLargeTitleEnabled: true, title: 'Files' }} />
      <FlatList
        data={ITEMS}
        keyExtractor={(i) => i.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.body}
        ListHeaderComponent={
          <View style={styles.header}>
            <FlipButton />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.count}>{item.count}</Text>
          </View>
        )}
      />
    </>
  )
}

const styles = StyleSheet.create({
  body: { paddingBottom: 80 },
  header: { padding: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  title: { color: COLORS.text, fontSize: 17, textAlign: 'left' },
  count: { color: COLORS.muted, fontSize: 15 },
})
