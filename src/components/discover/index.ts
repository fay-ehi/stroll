/**
 * Stroll — Discover Components Barrel
 * src/components/discover/index.ts
 *
 * Single import point for the Discover feed's presentational components,
 * mirroring the pattern set by src/components/ui/index.ts.
 */

export {
  ExperienceCard,
  type ExperienceCardProps,
  type ExperienceCardVariant,
} from './ExperienceCard';
export {
  ExperienceCardSkeleton,
  ExperienceFeedSkeleton,
  type ExperienceCardSkeletonProps,
  type ExperienceFeedSkeletonProps,
} from './ExperienceCardSkeleton';
export { FeaturedCarousel, type FeaturedCarouselProps } from './FeaturedCarousel';
export { FeaturedCarouselSkeleton } from './FeaturedCarouselSkeleton';
export { CategoriesRow, type CategoriesRowProps } from './CategoriesRow';
export { CategoriesRowSkeleton } from './CategoriesRowSkeleton';
export { DiscoverHeader, type DiscoverHeaderProps } from './DiscoverHeader';
