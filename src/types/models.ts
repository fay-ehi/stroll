export type VisitType = 'Solo' | 'Date' | 'Friends' | 'Family' | 'Work' | 'Group Event';

export type AmountSpent =
  | 'Under ₦5,000'
  | '₦5,000 – ₦10,000'
  | '₦10,000 – ₦20,000'
  | '₦20,000 – ₦50,000'
  | '₦50,000+';

export type VibTag =
  | 'Quiet' | 'Romantic' | 'Luxury' | 'Budget Friendly' | 'Hidden Gem'
  | 'Lively' | 'Cozy' | 'Instagrammable' | 'Late Night' | 'Date Spot'
  | 'Remote Work Friendly' | 'Family Friendly' | 'Great for Groups';

export type GoodForTag =
  | 'Couples' | 'Families' | 'Remote Workers' | 'Students' | 'Friends' | 'Business Meetings';

export type City = 'Lagos' | 'Abuja' | 'Port Harcourt' | 'Ibadan';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  city: City | null;
  createdAt: string;
  updatedAt: string;
}

export interface Place {
  id: string;
  externalPlaceId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  city: string;
  createdAt: string;
  updatedAt: string;
}

export interface Experience {
  id: string;
  userId: string;
  placeId: string;
  caption: string;
  wouldRecommend: boolean | null;
  amountSpent: AmountSpent | null;
  visitType: VisitType | null;
  vibeTags: VibTag[];
  goodForTags: GoodForTag[];
  photos: ExperiencePhoto[];
  createdAt: string;
  updatedAt: string;
  user?: User;
  place?: Place;
  likeCount?: number;
  commentCount?: number;
  isLikedByCurrentUser?: boolean;
  isSavedByCurrentUser?: boolean;
}

export interface ExperiencePhoto {
  id: string;
  experienceId: string;
  photoUrl: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: User;
  experienceCount?: number;
  followerCount?: number;
  isFollowedByCurrentUser?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
}
