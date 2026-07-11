import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text } from 'react-native'
import { FlipButton } from '../components/FlipButton'
import { COLORS } from '../components/COLORS'
import { ScreenBody, Section } from '../components/ScreenBody'

const demos = [
  { label: 'Native Tab Bar', description: 'iOS/Android native tabs (3 tabs)', route: '/(native-tabs)' as const },
  { label: 'JS Tab Bar', description: 'React Navigation bottom tabs (3 tabs)', route: '/(js-tabs)' as const },
  { label: 'Drawer Navigator', description: 'Nested drawer — swipe from edge', route: '/(drawer)/home' as const },
  { label: 'Messages', description: 'Pushed — headerLargeTitleEnabled', route: '/messages' as const },
  { label: 'Files', description: 'Pushed — headerLargeTitleEnabled', route: '/files' as const },
  { label: 'Contacts', description: 'Pushed — headerLargeTitleEnabled', route: '/contacts' as const },
  { label: 'Standalone Modal', description: 'Modal presentation', route: '/standalone-modal' as const },
]

export default function HubScreen() {
  const router = useRouter()

  return (
    <ScreenBody>
      <FlipButton />

      <Section title="Navigation Demos">
        {demos.map((demo) => (
          <Pressable
            key={demo.label}
            style={styles.card}
            onPress={() => router.push(demo.route as any)}
          >
            <Text style={styles.cardTitle}>{demo.label}</Text>
            <Text style={styles.cardDesc}>{demo.description}</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: { color: COLORS.text, fontWeight: '600', fontSize: 15, flex: 1, textAlign: 'left' },
  cardDesc: { color: COLORS.muted, fontSize: 12, flex: 2, textAlign: 'left' },
  chev: { color: COLORS.muted, fontSize: 20 },
})
