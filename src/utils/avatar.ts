/**
 * Premium Avatar Utility — Beautiful, Unique, Gender-Aware Avatars
 *
 * Uses DiceBear v8 API with the highest-quality illustration styles:
 *   - Female: "lorelei"   — gorgeous illustrated portrait with soft shading
 *   - Male:   "notionists" — modern cartoon-realistic style
 *
 * Every avatar is unique (seeded by user ID) and randomises:
 *   skin tone, hair style & color, eye color, background gradient, accessories
 *
 * Usage:
 *   import { getProfileAvatar } from '@/utils/avatar';
 *   const uri = getProfileAvatar(profile.photo, profile.id, profile.gender);
 */

export type Gender = 'M' | 'F' | 'O' | null | undefined;

/**
 * generateAvatarUrl — creates a photorealistic human avatar URL.
 *
 * @param seed   — User ID or any unique identifier string/number
 * @param gender — 'M' | 'F' | 'O' | null | undefined (optional for this source)
 * @returns      — Fully qualified HTTPS PNG URL
 */
export const generateAvatarUrl = (
    seed: string | number,
    gender?: Gender,
): string => {
    // We use i.pravatar.cc which returns high-quality real human photos.
    // By passing a consistent string `u=` parameter, the same user gets the same face.
    return `https://i.pravatar.cc/300?u=${encodeURIComponent(String(seed))}`;
};

/**
 * getProfileAvatar — returns a profile's photo URL or a generated avatar.
 * Never returns null — always has a beautiful fallback.
 */
export const getProfileAvatar = (
    photo: string | null | undefined,
    seed: string | number,
    gender?: Gender,
): string => {
    if (photo && photo.startsWith('http')) return photo;
    if (photo && photo.length > 0) return photo; // relative URL — caller uses getMediaUrl
    return generateAvatarUrl(seed, gender);
};

/**
 * getProfileAvatarFull — combines getMediaUrl + getProfileAvatar.
 * Pass a full profile object and get the best available avatar URL.
 */
export const getProfileAvatarFull = (
    photo: string | null | undefined,
    seed: string | number,
    gender?: Gender,
    mediaBaseUrl?: string | null,
): string => {
    if (photo) {
        if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
        if (mediaBaseUrl) {
            const clean = photo.startsWith('/') ? photo : `/${photo}`;
            return `${mediaBaseUrl}${clean}`;
        }
    }
    return generateAvatarUrl(seed, gender);
};
