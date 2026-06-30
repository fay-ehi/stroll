/**
 * Stroll UI — Barrel Exports
 * src/components/ui/index.ts
 *
 * Single import point for the entire reusable UI library.
 *
 * Usage:
 *   import { Button, H2, Body, Card, Avatar, Chip } from '@/components/ui';
 *
 * Architecture note: this barrel re-exports both components and their
 * prop types, so consumers never need to reach into individual files.
 */

// ─── Typography ────────────────────────────────────────────────────────────────
export {
  Display,
  H1,
  H2,
  H3,
  H4,
  H5,
  BodyLarge,
  Body,
  BodyMedium,
  BodySemiBold,
  BodySmall,
  Caption,
  Tiny,
  Label,
  type StrollTextProps,
} from './Typography';

// ─── Icon ──────────────────────────────────────────────────────────────────────
export { Icon, type IconProps, type IconSize } from './Icon';

// ─── Button ────────────────────────────────────────────────────────────────────
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';

// ─── TextInput ─────────────────────────────────────────────────────────────────
export {
  TextInput,
  type TextInputComponentProps,
  type TextInputState,
} from './TextInput';

// ─── Card ──────────────────────────────────────────────────────────────────────
export { Card, type CardProps, type CardVariant } from './Card';

// ─── Avatar ────────────────────────────────────────────────────────────────────
export { Avatar, type AvatarProps, type AvatarSize } from './Avatar';

// ─── Badge ─────────────────────────────────────────────────────────────────────
export { Badge, type BadgeProps, type BadgeVariant } from './Badge';

// ─── Chip ──────────────────────────────────────────────────────────────────────
export { Chip, type ChipProps } from './Chip';

// ─── Divider ───────────────────────────────────────────────────────────────────
export { Divider, type DividerProps } from './Divider';

// ─── Loading ───────────────────────────────────────────────────────────────────
export {
  Spinner,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  FullScreenLoading,
  type SpinnerProps,
  type SpinnerSize,
  type SkeletonProps,
  type FullScreenLoadingProps,
} from './Loading';

// ─── EmptyState ────────────────────────────────────────────────────────────────
export { EmptyState, type EmptyStateProps } from './EmptyState';

// ─── ScreenContainer ───────────────────────────────────────────────────────────
export { ScreenContainer, type ScreenContainerProps } from './ScreenContainer';
