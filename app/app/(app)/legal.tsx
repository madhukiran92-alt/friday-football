import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { C } from '../../src/lib/theme';

type Tab = 'privacy' | 'terms';

const LAST_UPDATED = '7 June 2026';
const CONTACT_EMAIL = 'hello@pitchapp.net';
const COMPANY_NAME = 'Nila';

export default function LegalScreen() {
  const [tab, setTab] = useState<Tab>('privacy');

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.headerSafe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Legal</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'privacy' && s.tabBtnActive]}
            onPress={() => setTab('privacy')}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, tab === 'privacy' && s.tabTextActive]}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'terms' && s.tabBtnActive]}
            onPress={() => setTab('terms')}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, tab === 'terms' && s.tabTextActive]}>Terms of Service</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {tab === 'privacy' ? <PrivacyPolicy /> : <TermsOfService />}
        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

function PrivacyPolicy() {
  return (
    <Doc title="Privacy Policy" updated={LAST_UPDATED}>
      <Section title="Overview">
        {COMPANY_NAME} ("we", "us", "our") operates the Pitch app and is committed to protecting
        your privacy. This policy explains what personal information we collect, how we use it,
        and your rights over that information.
      </Section>

      <Section title="Information we collect">
        <BulletList items={[
          'Mobile phone number — used to verify your identity and sign you in.',
          'Display name — shown to other players in game lists.',
          'Device push token — used to send you game notifications (optional, only collected if you grant permission).',
        ]} />
      </Section>

      <Section title="How we use your information">
        <BulletList items={[
          'To let you sign in and use the app.',
          'To display your name to other players in games you join.',
          'To send you push notifications about games you are registered in.',
          'Admins who organise your games can see your phone number to coordinate logistics.',
        ]} />
        We do not sell, rent, or share your information with third parties for marketing purposes.
      </Section>

      <Section title="What other users can see">
        Other players can see your display name in game player lists. Your phone number and email
        address are not visible to other players — only to admins in games you join.
      </Section>

      <Section title="Data retention">
        Your data is stored for as long as your account exists. You can request deletion of your
        account and all associated data by emailing us at {CONTACT_EMAIL}.
      </Section>

      <Section title="Third-party services">
        <BulletList items={[
          'Supabase — database and authentication provider. Data is stored in Australia.',
          'Expo — push notification delivery service.',
        ]} />
      </Section>

      <Section title="Your rights">
        You have the right to access, correct, or delete your personal information at any time.
        To exercise these rights, contact us at {CONTACT_EMAIL}.
      </Section>

      <Section title="Contact">
        Questions about this policy? Email us at {CONTACT_EMAIL}.
      </Section>
    </Doc>
  );
}

function TermsOfService() {
  return (
    <Doc title="Terms of Service" updated={LAST_UPDATED}>
      <Section title="Acceptance">
        By creating an account and using the Pitch app, you agree to these Terms of Service.
        If you do not agree, please do not use the app.
      </Section>

      <Section title="What Pitch does">
        Pitch is a product of {COMPANY_NAME}. It is a platform that lets people organise and join
        recreational sports games. We provide the tools — organisers and players are responsible
        for the activities they arrange.
      </Section>

      <Section title="Your account">
        <BulletList items={[
          'You must provide accurate information when creating your account.',
          'You are responsible for all activity that occurs under your account.',
          'You must be at least 16 years old to use Pitch.',
          'Admin access is granted via invite only. You must not share or misuse invite codes.',
        ]} />
      </Section>

      <Section title="Acceptable use">
        You agree not to:
        <BulletList items={[
          'Use the app for any unlawful purpose.',
          'Harass, impersonate, or harm other users.',
          'Attempt to gain unauthorised access to other users\' data.',
          'Abuse the waitlist or registration system.',
        ]} />
      </Section>

      <Section title="Disclaimer of warranties">
        The Pitch app is provided "as is" without warranties of any kind. We do not guarantee
        uninterrupted or error-free service. We are not responsible for any injuries, losses,
        or damages arising from activities organised through the app.
      </Section>

      <Section title="Limitation of liability">
        To the fullest extent permitted by law, {COMPANY_NAME} and its operators shall not be
        liable for any indirect, incidental, or consequential damages arising out of your use
        of the app.
      </Section>

      <Section title="Changes to these terms">
        We may update these terms from time to time. Continued use of the app after changes
        constitutes acceptance of the updated terms. We will notify users of material changes
        via the app or email.
      </Section>

      <Section title="Contact">
        Questions about these terms? Email us at {CONTACT_EMAIL}.
      </Section>
    </Doc>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Doc({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={s.docTitle}>{title}</Text>
      <Text style={s.docUpdated}>Last updated: {updated}</Text>
      {children}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={s.body}>{children}</Text>
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={s.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bullet}>•</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  headerSafe: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.separator,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  back: { fontSize: 15, color: C.green, fontWeight: '600', width: 50 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: C.rMd,
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  tabBtnActive: { backgroundColor: C.greenUltra },
  tabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.greenDeep },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  docTitle: {
    fontSize: 24, fontWeight: '800', color: C.ink, letterSpacing: -0.4,
    marginBottom: 4,
  },
  docUpdated: {
    fontSize: 12, color: C.subtle, marginBottom: 24,
  },

  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 14, fontWeight: '800', color: C.ink,
    textTransform: 'uppercase', letterSpacing: 0.4,
    marginBottom: 6,
  },
  body: { fontSize: 14, color: C.inkSoft, lineHeight: 22 },

  bulletList: { marginTop: 6 },
  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bullet: { fontSize: 14, color: C.muted, lineHeight: 22 },
  bulletText: { flex: 1, fontSize: 14, color: C.inkSoft, lineHeight: 22 },
});
