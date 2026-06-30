/**
 * Stroll — Component Showcase Screen
 * app/_showcase.tsx
 *
 * DEVELOPMENT / TESTING ONLY.
 * This screen is not part of the product. It exists to visually verify
 * every reusable UI component and its variants in one place during
 * Sprint 3. It should be removed (or gated behind a dev-only route)
 * before any production-facing navigation is built.
 *
 * Access during development: navigate to /_showcase manually, e.g.
 *   router.push('/_showcase')
 * or open it directly via the Expo Router dev menu URL bar.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  ScreenContainer,
  Display, H1, H2, H3, H4, H5, BodyLarge, Body, BodySmall, Caption, Tiny,
  Button,
  TextInput,
  Card,
  Avatar,
  Badge,
  Chip,
  Divider,
  Spinner,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  EmptyState,
} from '@/components/ui';
import { theme } from '@/theme';
import {
  Heart,
  Search,
  MapPin,
  Trash2,
  ArrowRight,
  Bookmark,
  Compass,
} from 'lucide-react-native';

// ─── Section Wrapper ───────────────────────────────────────────────────────────
// Local-only helper for this dev screen — not part of the UI library.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <H3 style={styles.sectionTitle}>{title}</H3>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Row({ children, wrap = true }: { children: React.ReactNode; wrap?: boolean }) {
  return <View style={[styles.row, wrap && styles.rowWrap]}>{children}</View>;
}

// ─── Showcase Screen ───────────────────────────────────────────────────────────

export default function ShowcaseScreen() {
  const [chipSelected, setChipSelected] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [loadingDemo, setLoadingDemo] = useState(false);

  return (
    <ScreenContainer scroll avoidKeyboard>
      <Display style={styles.pageTitle}>Stroll UI</Display>
      <Body color={theme.colors.text.secondary} style={styles.pageSubtitle}>
        Internal component showcase — Sprint 3 development reference. Not part of the product.
      </Body>

      <Divider style={styles.topDivider} />

      {/* ── Typography ──────────────────────────────────────────────────── */}
      <Section title="Typography">
        <Display>Display</Display>
        <H1>Heading 1</H1>
        <H2>Heading 2</H2>
        <H3>Heading 3</H3>
        <H4>Heading 4</H4>
        <H5>Heading 5</H5>
        <BodyLarge>Body Large — the quick brown fox jumps over the lazy dog.</BodyLarge>
        <Body>Body — the quick brown fox jumps over the lazy dog.</Body>
        <BodySmall>Body Small — supporting text and metadata.</BodySmall>
        <Caption>Caption — tertiary information.</Caption>
        <Tiny>Tiny — smallest label text.</Tiny>
      </Section>

      {/* ── Buttons ─────────────────────────────────────────────────────── */}
      <Section title="Buttons — Variants">
        <Row>
          <Button label="Primary" variant="primary" onPress={() => {}} />
          <Button label="Secondary" variant="secondary" onPress={() => {}} />
          <Button label="Tertiary" variant="tertiary" onPress={() => {}} />
          <Button label="Destructive" variant="destructive" onPress={() => {}} />
        </Row>
      </Section>

      <Section title="Buttons — States">
        <Row>
          <Button label="Default" onPress={() => {}} />
          <Button label="Disabled" disabled onPress={() => {}} />
          <Button
            label="Loading"
            loading={loadingDemo}
            onPress={() => {
              setLoadingDemo(true);
              setTimeout(() => setLoadingDemo(false), 2000);
            }}
          />
        </Row>
      </Section>

      <Section title="Buttons — Icons & Sizes">
        <Row>
          <Button label="Save" leftIcon={Bookmark} onPress={() => {}} />
          <Button label="Continue" rightIcon={ArrowRight} onPress={() => {}} />
        </Row>
        <Row>
          <Button label="Small" size="sm" onPress={() => {}} />
          <Button label="Medium" size="md" onPress={() => {}} />
          <Button label="Large" size="lg" onPress={() => {}} />
        </Row>
        <Button label="Full Width Button" fullWidth onPress={() => {}} />
      </Section>

      {/* ── Text Input ──────────────────────────────────────────────────── */}
      <Section title="Text Input">
        <View style={styles.stack}>
          <TextInput
            label="Standard"
            placeholder="Enter text"
            value={textValue}
            onChangeText={setTextValue}
            helperText="This is helper text."
          />
          <TextInput
            label="With left icon"
            placeholder="Search experiences"
            leftIcon={Search}
          />
          <TextInput
            label="Password"
            placeholder="Enter password"
            secureTextEntry
            value={passwordValue}
            onChangeText={setPasswordValue}
          />
          <TextInput
            label="Error state"
            placeholder="Email"
            errorText="Please enter a valid email address."
          />
          <TextInput
            label="Success state"
            placeholder="Username"
            success
            helperText="Username is available."
          />
          <TextInput
            label="Disabled"
            placeholder="Can't edit this"
            disabled
          />
        </View>
      </Section>

      {/* ── Cards ───────────────────────────────────────────────────────── */}
      <Section title="Cards">
        <View style={styles.stack}>
          <Card variant="default">
            <Body>Default card — flat, no shadow or border.</Body>
          </Card>
          <Card variant="elevated">
            <Body>Elevated card — Shadow Medium applied.</Body>
          </Card>
          <Card variant="outlined">
            <Body>Outlined card — 1px border, no shadow.</Body>
          </Card>
        </View>
      </Section>

      {/* ── Avatar ──────────────────────────────────────────────────────── */}
      <Section title="Avatar">
        <Row>
          <Avatar name="Ada Obi" size="sm" />
          <Avatar name="Temi Bello" size="md" />
          <Avatar name="Bolu King" size="lg" showOnlineIndicator />
          <Avatar name="Martin" size="xl" />
        </Row>
        <Caption color={theme.colors.text.tertiary} style={{ marginTop: theme.spacing.sm }}>
          Initials fallback shown — no image source provided in this demo.
        </Caption>
      </Section>

      {/* ── Badge ───────────────────────────────────────────────────────── */}
      <Section title="Badge">
        <Row>
          <Badge label="Neutral" variant="neutral" />
          <Badge label="Featured" variant="primary" />
          <Badge label="Verified" variant="success" />
          <Badge label="New" variant="warning" />
          <Badge label="Closed" variant="error" />
        </Row>
      </Section>

      {/* ── Chip ────────────────────────────────────────────────────────── */}
      <Section title="Chip">
        <Row>
          <Chip
            label="Cozy"
            selected={chipSelected}
            onPress={() => setChipSelected((v) => !v)}
          />
          <Chip label="Romantic" onPress={() => {}} />
          <Chip label="Removable" removable onRemove={() => {}} />
          <Chip label="Disabled" disabled />
        </Row>
      </Section>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <Section title="Divider">
        <Body>Above the horizontal divider</Body>
        <Divider style={{ marginVertical: theme.spacing.md }} />
        <Body>Below the horizontal divider</Body>

        <View style={[styles.row, { height: 40, marginTop: theme.spacing.md, alignItems: 'center' }]}>
          <Body>Left</Body>
          <Divider orientation="vertical" spacing={theme.spacing.md} />
          <Body>Right</Body>
        </View>
      </Section>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      <Section title="Loading Indicators">
        <Row>
          <Spinner size="small" />
          <Spinner size="large" />
        </Row>
        <View style={[styles.stack, { marginTop: theme.spacing.md }]}>
          <Row wrap={false}>
            <SkeletonCircle diameter={44} />
            <View style={{ flex: 1, gap: theme.spacing.xs, marginLeft: theme.spacing.sm }}>
              <SkeletonText width="60%" />
              <SkeletonText width="90%" />
            </View>
          </Row>
          <Skeleton height={120} borderRadius={theme.radius.card} />
        </View>
      </Section>

      {/* ── Empty State ─────────────────────────────────────────────────── */}
      <Section title="Empty State">
        <Card variant="outlined" padding={0}>
          <EmptyState
            icon={MapPin}
            title="No saved places yet."
            description="Start exploring and save places you'd love to visit."
            action={{ label: 'Explore Experiences', onPress: () => {}, variant: 'primary' }}
          />
        </Card>
      </Section>

      {/* ── Icons ───────────────────────────────────────────────────────── */}
      <Section title="Icon Wrapper">
        <Row>
          <Heart size={20} color={theme.colors.brand.primary} strokeWidth={2} />
          <Search size={20} color={theme.colors.text.primary} strokeWidth={2} />
          <MapPin size={20} color={theme.colors.semantic.info} strokeWidth={2} />
          <Trash2 size={20} color={theme.colors.semantic.error} strokeWidth={2} />
          <Compass size={20} color={theme.colors.semantic.success} strokeWidth={2} />
        </Row>
        <Caption color={theme.colors.text.tertiary} style={{ marginTop: theme.spacing.sm }}>
          All icons rendered via the Icon wrapper — 2px stroke, theme colors only.
        </Caption>
      </Section>

      <View style={styles.bottomSpacer} />
    </ScreenContainer>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageTitle: {
    marginTop: theme.spacing.lg,
  },
  pageSubtitle: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  topDivider: {
    marginBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  sectionContent: {
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  rowWrap: {
    flexWrap: 'wrap',
  },
  stack: {
    gap: theme.spacing.md,
  },
  bottomSpacer: {
    height: theme.spacing['4xl'],
  },
});
