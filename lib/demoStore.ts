export type Booster = {
  id: string;
  name: string;
  multiplier: number;
  tapLimit: number;
  price: number;
  megaOnly: boolean;
  icon: string;
};

export type PoolMember = {
  taps: number;
  rawTaps: number;
  joinedAt: number;
  leftAt?: number;
  activeBooster?: { boosterId: string; remaining: number };
};

export type Pool = {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  startAt: number;
  endAt: number;
  entryFee: number;
  prizePool: number;
  boostersAllowed: boolean;
  members: Record<string, PoolMember>;
};

export type DemoUser = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  plan: "free" | "mega";
  verified: boolean;
  profileColor: string;
  tapSkin: string;
  sound: boolean;
  orientation: "center" | "left" | "right" | "wide";
  funded: number;
  earned: number;
  lifetimeTaps: number;
  rawLifetimeTaps: number;
  referralCode: string;
  referredBy?: string;
  boosters: Record<string, number>;
  createdAt: number;
};

export type Ad = { id: string; title: string; body: string; link?: string };
export type SpaceMessage = { id: string; userId: string; message: string; createdAt: number };
export type TapEvent = { userId: string; poolId: string; raw: number; credited: number; createdAt: number };

export type DemoState = {
  users: DemoUser[];
  pools: Pool[];
  boosters: Booster[];
  ads: Ad[];
  spaceMessages: SpaceMessage[];
  tapEvents: TapEvent[];
  currentUserId?: string;
  admin?: { email: string; passwordHash: string };
};

const KEY = "tap-am-demo-state-v1";
const now = () => Date.now();
const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const seeded: DemoState = {
  users: [],
  pools: [],
  boosters: [
    { id: "invite-spark", name: "Invite Spark", multiplier: 1.5, tapLimit: 80, price: 0, megaOnly: false, icon: "⚡" },
    { id: "double-trouble", name: "Double Trouble", multiplier: 2, tapLimit: 120, price: 900, megaOnly: false, icon: "🔥" },
    { id: "mega-rush", name: "Mega Rush", multiplier: 4, tapLimit: 160, price: 2200, megaOnly: true, icon: "💎" },
  ],
  ads: [{ id: "ad_1", title: "Your brand here", body: "Free accounts see sponsored cards here." }],
  spaceMessages: [],
  tapEvents: [],
};

export function loadState(): DemoState {
  if (typeof window === "undefined") return structuredClone(seeded);
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const state = structuredClone(seeded);
    localStorage.setItem(KEY, JSON.stringify(state));
    return state;
  }
  try {
    return JSON.parse(raw) as DemoState;
  } catch {
    return structuredClone(seeded);
  }
}

export function saveState(state: DemoState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export async function hashPassword(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function makeUser(input: { username: string; email: string; passwordHash: string; ref?: string }): DemoUser {
  const state = loadState();
  const inviter = input.ref ? state.users.find((u) => u.referralCode === input.ref) : undefined;
  return {
    id: id("usr"), username: input.username, email: input.email.toLowerCase(), passwordHash: input.passwordHash,
    plan: "free", verified: false, profileColor: "#FFD400", tapSkin: "danfo", sound: true, orientation: "center",
    funded: 0, earned: 0, lifetimeTaps: 0, rawLifetimeTaps: 0, referralCode: Math.random().toString(36).slice(2, 9).toUpperCase(),
    referredBy: inviter?.id, boosters: {}, createdAt: now(),
  };
}

export function rankFor(taps: number) {
  if (taps >= 250000) return "Tap Don";
  if (taps >= 100000) return "Tap Legend";
  if (taps >= 50000) return "Tap Machine";
  if (taps >= 10000) return "Grinder";
  if (taps >= 1000) return "Tapper";
  return "Rookie";
}

export function createPool(state: DemoState, creatorId: string, data: Omit<Pool, "id" | "creatorId" | "members">) {
  const pool: Pool = { ...data, id: id("pool"), creatorId, members: {} };
  state.pools.unshift(pool);
  return pool;
}

export function getCurrentUser(state: DemoState) {
  return state.users.find((u) => u.id === state.currentUserId);
}

export function tapperOfPeriod(state: DemoState, sinceMs: number) {
  const totals = new Map<string, number>();
  for (const e of state.tapEvents) if (e.createdAt >= sinceMs) totals.set(e.userId, (totals.get(e.userId) || 0) + e.credited);
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted[0]) return undefined;
  return { user: state.users.find((u) => u.id === sorted[0][0]), taps: sorted[0][1] };
}

export function uid(prefix = "id") { return id(prefix); }
