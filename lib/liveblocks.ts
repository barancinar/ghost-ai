import { Liveblocks } from "@liveblocks/node";

const globalForLiveblocks = globalThis as unknown as {
  liveblocks?: Liveblocks;
};

/**
 * Lazy getter for the Liveblocks client to prevent module initialization errors
 * during static page generation / build time when environment variables are unset.
 */
export function getLiveblocksClient(): Liveblocks {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY environment variable is required but is unset or empty.");
  }

  if (!globalForLiveblocks.liveblocks) {
    globalForLiveblocks.liveblocks = new Liveblocks({ secret });
  }

  return globalForLiveblocks.liveblocks;
}

// User color palette (vivid colors for dark mode cursors and selections)
export const USER_COLORS = [
  "#52A8FF", // Blue
  "#BF7AF0", // Purple
  "#FF990A", // Orange
  "#FF6166", // Red
  "#F75F8F", // Pink
  "#62C073", // Green
  "#0AC7B4", // Teal
  "#EDEDED"  // Neutral light
];

/**
 * Deterministically maps a user ID to a consistent color from USER_COLORS.
 */
export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index];
}
