/**
 * Asset manifest (#79).
 *
 * A typed, central map of every image "slot" the marketing/auth surfaces use.
 * Components reference a slot by key via <AssetImage slot="heroBackground" />
 * instead of hard-coding paths, so swapping artwork (or wiring real photography
 * later) is a one-line change here.
 *
 * `src` is a local web path under `frontend/public/` (e.g. '/photos/hero.jpg').
 * When a slot has no artwork yet, leave `src` undefined and <AssetImage>
 * renders a graceful tinted placeholder instead of a broken image.
 *
 * Every slot now points at the NGO's own /public assets — there is no remote
 * image dependency, so next.config.js no longer needs a remote allow-list.
 */

export interface AssetSlot {
  /** Local /public path; undefined = placeholder. */
  src?: string;
  /** Bilingual alt text. Falls back to `en` when a locale is missing. */
  alt: { he: string; en: string };
  /** Intrinsic aspect ratio "w / h" — reserves space to avoid layout shift. */
  ratio?: string;
}

// The closed set of valid slot keys. Adding artwork = add a key here + an
// entry in assetManifest; the Record type below forces both to stay in sync.
export type AssetSlotKey =
  | 'authAside'
  | 'volunteerInvite'
  | 'heroBackground'
  | 'story1'
  | 'storyWisdomLetter';

// Single source of truth. Keyed by AssetSlotKey so the type system guarantees
// every key has exactly one slot (no missing or stray entries).
export const assetManifest: Record<AssetSlotKey, AssetSlot> = {
  authAside: {
    src: '/logo.jpg',
    alt: { he: 'דחיפה להגשמה', en: 'Push for Fulfillment' },
    ratio: '1 / 1',
  },
  volunteerInvite: {
    // Real volunteers photo for the homepage volunteers section.
    src: '/photos/volunteers-team.webp',
    alt: {
      he: 'מתנדבים של דחיפה להגשמה מרימים אגודל',
      en: 'Push for Fulfillment volunteers giving a thumbs up',
    },
    ratio: '4 / 5',
  },
  heroBackground: {
    // The NGO's own full-bleed hero artwork (a hand reaching out to the
    // community). Local /public path resolves immediately.
    src: '/photos/hero-community.jpg',
    alt: {
      he: 'יד מושטת לקהילה — סיוע והגשמה',
      en: 'A hand reaching out to the community',
    },
    ratio: '16 / 9',
  },
  story1: {
    // The NGO's real success story: the 7 students it sponsors at Wisdom
    // Academy (Mekelle, Ethiopia). Local /public path.
    src: '/photos/story-wisdom-academy.jpg',
    alt: {
      he: 'התלמידים שדחיפה להגשמה תומכת בהם באקדמיית Wisdom',
      en: 'The students sponsored by Push for Fulfillment at Wisdom Academy',
    },
    ratio: '4 / 5',
  },
  storyWisdomLetter: {
    // Scanned letter of appreciation from Wisdom Academy — shown as a small
    // proof figure within the success-stories section. Local /public path.
    src: '/photos/story-wisdom-academy-letter.jpg',
    alt: {
      he: 'מכתב הוקרה מאקדמיית Wisdom',
      en: 'Letter of appreciation from Wisdom Academy',
    },
    ratio: '3 / 4',
  },
};

// Typed accessor used by <AssetImage>. The key type makes a missing slot a
// compile error, so the lookup always returns a defined slot.
export function getAssetSlot(key: AssetSlotKey): AssetSlot {
  return assetManifest[key];
}
