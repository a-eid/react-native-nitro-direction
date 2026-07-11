import { Stack } from 'expo-router'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { FlipButton } from '../components/FlipButton'
import { COLORS } from '../components/COLORS'

const CONTACTS = Array.from({ length: 30 }, (_, i) => ({
  id: `${i}`,
  name: ['Ahmed', 'Sara', 'Youssef', 'Layla', 'Omar', 'Fatima', 'Khalid', 'Nadia', 'Hassan', 'Mona'][i % 10],
}))

export default function ContactsScreen() {
  return (
    <>
      <Stack.Screen options={{ headerLargeTitleEnabled: true, title: 'Contacts' }} />
      <FlatList
        data={CONTACTS}
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
              <Text style={styles.avatarText}>{item.name[0]}</Text>
            </View>
            <Text style={styles.name}>{item.name}</Text>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.onTint, fontWeight: '700', fontSize: 16 },
  name: { color: COLORS.text, fontSize: 17, textAlign: 'left' },
})
