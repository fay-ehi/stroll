/**
 * Stroll — Place Components Barrel
 * src/components/places/index.ts
 *
 * Didn't exist before Sprint 4 Prompt 1 — PlaceCardSkeleton.tsx and
 * PlaceImage.tsx (Sprint 1 Prompt 4) were until now imported by their
 * direct file paths. Added now, matching every other domain component
 * folder's convention (experience-detail/index.ts, discover/index.ts),
 * since this sprint brings the Places domain's component count up to
 * where that convention starts paying for itself.
 */

export { PlaceCardSkeleton, PlacesListSkeleton, type PlacesListSkeletonProps } from './PlaceCardSkeleton';
export { PlaceImage, type PlaceImageProps } from './PlaceImage';
export { PlaceMapHero, type PlaceMapHeroProps } from './PlaceMapHero';
export { PlaceMapFallback, MAP_HERO_ASPECT_RATIO, type PlaceMapFallbackProps } from './PlaceMapFallback';
export { PlaceDetailInfo, type PlaceDetailInfoProps } from './PlaceDetailInfo';
export { CollectionsFeaturingPlace } from './CollectionsFeaturingPlace';
export { PlaceDetailSkeleton } from './PlaceDetailSkeleton';
