import { Stack } from 'expo-router'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { FlipButton } from '../components/FlipButton'
import { COLORS } from '../components/COLORS'

const MESSAGES = Array.from({ length: 20 }, (_, i) => ({
  id: `${i}`,
  sender: ['Ahmed', 'Sara', 'Youssef', 'Layla', 'Omar'][i % 5],
  preview: ['Hey, how are you?', 'Check this out!', 'Meeting at 3?', 'Thanks!', 'See you soon'][i % 5],
}))

export default function MessagesScreen() {
  return (
    <>
      <Stack.Screen options={{ headerLargeTitleEnabled: true, title: 'Messages' }} />
      <FlatList
        data={MESSAGES}
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
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.sender[0]}</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.name}>{item.sender}</Text>
              <Text style={styles.preview}>{item.preview}</Text>
            </View>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.onTint, fontWeight: '700', fontSize: 16 },
  content: { flex: 1, gap: 2 },
  name: { color: COLORS.text, fontSize: 16, fontWeight: '600', textAlign: 'left' },
  preview: { color: COLORS.muted, fontSize: 14, textAlign: 'left' },
})
