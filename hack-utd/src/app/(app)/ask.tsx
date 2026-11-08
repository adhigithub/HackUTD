import { Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLiveReportEntries } from '@/features/alerts/report-bridge';
import { ask, type ChatMessage } from '@/lib/ai/ask-client';
import { SUGGESTED_QUESTIONS } from '@/lib/ai/suggestions';
import { ASK_LIMITS } from '@/lib/ai/types';
import { useAuth } from '@/lib/auth/auth-context';
import { formatShortDate } from '@/lib/portfolio/format';
import { buildReport, isReportPeriod, type ReportPeriod } from '@/lib/portfolio/report';

let nextId = 0;
const newId = () => `m${Date.now()}-${nextId++}`;

export default function AskScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const params = useLocalSearchParams<{ q?: string; period?: string }>();
  const periodParam = Number(params.period);
  const period: ReportPeriod = isReportPeriod(periodParam) ? periodParam : 30;

  // Live fixes / open alerts, so Ask AI's answers match the Report and Home.
  const live = useLiveReportEntries();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const sentInitial = useRef(false);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || pending || !user) return;
      const question: ChatMessage = { id: newId(), role: 'user', text };
      const history = [...messages, question];
      setMessages(history);
      setDraft('');
      setPending(true);
      try {
        const reply = await ask(history, user.role, period, live);
        setMessages((prev) => [...prev, { id: newId(), role: 'assistant', ...reply }]);
      } finally {
        setPending(false);
      }
    },
    [messages, pending, period, user, live]
  );

  // A suggestion tapped on the Report screen arrives as ?q=… and is sent once.
  useEffect(() => {
    if (params.q && !sentInitial.current) {
      sentInitial.current = true;
      send(params.q);
    }
  }, [params.q, send]);

  if (!user) return null;

  const report = buildReport(period, new Date(), live);
  const range = `${formatShortDate(report.startISO)} – ${formatShortDate(report.endISO)}`;
  const canSend = draft.trim().length > 0 && !pending;

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
      style={[styles.flex, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Ask AI',
          headerRight: messages.length
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  disabled={pending}
                  onPress={() => setMessages([])}
                  hitSlop={8}
                  style={styles.headerButton}>
                  <ThemedText type="smallBold" themeColor={pending ? 'textSecondary' : 'primary'}>
                    Clear
                  </ThemedText>
                </Pressable>
              )
            : undefined,
        }}
      />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        style={styles.flex}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => <Bubble message={item} />}
        ListHeaderComponent={
          <View style={styles.intro}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {`Ask me anything about your 3 buildings (${range}). I only use your building data, so I won’t make things up.`}
            </ThemedText>
          </View>
        }
        ListEmptyComponent={
          pending ? undefined : (
            <View style={styles.suggestions}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                TRY ASKING
              </ThemedText>
              {SUGGESTED_QUESTIONS[user.role].map((q) => (
                <Pressable
                  key={q}
                  accessibilityRole="button"
                  onPress={() => send(q)}
                  style={({ pressed }) => [
                    styles.suggestion,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small">{q}</ThemedText>
                </Pressable>
              ))}
            </View>
          )
        }
        ListFooterComponent={
          pending ? (
            <View
              accessibilityLiveRegion="polite"
              accessibilityLabel="Ask AI is thinking"
              style={[styles.bubble, styles.assistant, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={styles.thinking}>
                <ActivityIndicator size="small" color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Looking at your buildings…
                </ThemedText>
              </View>
            </View>
          ) : undefined
        }
      />

      <SafeAreaView edges={['bottom', 'left', 'right']} style={{ backgroundColor: theme.backgroundElement }}>
        <View style={[styles.composer, { borderTopColor: theme.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about savings, risks, or a building…"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Question for Ask AI"
            multiline
            maxLength={ASK_LIMITS.maxCharsPerTurn}
            submitBehavior="submit"
            returnKeyType="send"
            onSubmitEditing={() => send(draft)}
            onKeyPress={(e) => {
              // Web: a multiline input won't submit on Enter by itself. Enter sends, Shift+Enter adds a line.
              if (Platform.OS !== 'web') return;
              const { key, shiftKey } = e.nativeEvent as typeof e.nativeEvent & { shiftKey?: boolean };
              if (key === 'Enter' && !shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={() => send(draft)}
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: canSend ? theme.primary : theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
              tintColor={canSend ? theme.primaryText : theme.textSecondary}
              size={20}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const theme = useTheme();
  const mine = message.role === 'user';
  return (
    <View
      style={[
        styles.bubble,
        mine
          ? [styles.user, { backgroundColor: theme.primary, borderColor: theme.primary }]
          : [styles.assistant, { backgroundColor: theme.backgroundElement, borderColor: theme.border }],
      ]}>
      {!mine && message.note ? (
        <ThemedText type="small" themeColor="warning" style={styles.noteText}>
          {message.note}
        </ThemedText>
      ) : null}
      <ThemedText selectable type="small" style={[styles.bubbleText, mine && { color: theme.primaryText }]}>
        {message.text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  headerButton: { paddingHorizontal: Spacing.three },
  listContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  intro: { paddingBottom: Spacing.two },
  suggestions: { gap: Spacing.two, paddingTop: Spacing.two },
  suggestion: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  bubble: {
    maxWidth: '88%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  user: { alignSelf: 'flex-end', borderBottomRightRadius: Radius.sm / 2 },
  assistant: { alignSelf: 'flex-start', borderBottomLeftRadius: Radius.sm / 2 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  noteText: { fontSize: 12, lineHeight: 16 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
