// Inner circle: players the super admin trusts to bring people in. The admin sees, for each member, how many
// people they brought and each invitee's wallet and spend; members see only what their invitees spent (never
// their wallets). Members get free boosters and Mapo / Nepo status from the admin, and agree to the rules.

// Money a player has spent on Tap Am (entry fees, plans, store, time, prize top-ups, stakes, ads), less refunds.
const SPEND_TYPES = "'ENTRY_FEE','PLAN','STORE','TIME_BUY','POOL_TOPUP','POOL_PRIZE','STAKE','EMAIL_BLAST','SLIDE_AD'";
export const SPEND_SQL = alias => `(SELECT MAX(0, COALESCE(-SUM(CASE WHEN t.type IN (${SPEND_TYPES}) THEN t.amount_kobo ELSE 0 END),0) - COALESCE(SUM(CASE WHEN t.type='REFUND' THEN t.amount_kobo ELSE 0 END),0)) FROM wallet_transactions t WHERE t.user_id=${alias}.id AND t.status='SUCCESS')`;

export const DEFAULT_RULES = `Welcome to the Tap Am inner circle. These rules keep it working for everybody.

1. Keep it quiet. Don't talk about your inner circle role, your perks or this page with anybody — in public or in private, online or offline.
2. Only market the product. Talk about Tap Am: the games, the pools, the prizes and how to play. Share your invite link and bring people in.
3. Be honest. Never promise anybody money or winnings, never say Tap Am is a way to make money, and never pretend to be Tap Am staff.
4. No spam and no fake accounts. Don't flood groups or DMs, don't buy followers or sign-ups, and never make accounts for other people.
5. Play fair. No bots, scripts, auto-tappers or shared accounts. The anti-cheat rules apply to you like everybody else.
6. Respect people's privacy. You can see what the people you invited have spent, so you can follow up with them — keep it to yourself and never share it.

Your perks: free boosters and Mapo / Nepo status from time to time, given by the Tap Am team.

The Tap Am team can change these rules or remove the role at any time. Breaking them ends the role.`;

export const rulesText = s => String(s?.inner_circle_rules || '').trim() || DEFAULT_RULES;

// The people a player brought in. withWallet: the super admin's view (wallet + winnings too).
export async function invitees(env, userId, { withWallet = false, limit = 200 } = {}) {
  return (await env.DB.prepare(`SELECT u.id, u.username, u.created_at, u.status, ${SPEND_SQL('u')} AS spent${withWallet ? ', COALESCE(w.balance_kobo,0) AS wallet, COALESCE(w.winnings_kobo,0) AS winnings' : ''}
    FROM users u ${withWallet ? 'LEFT JOIN wallets w ON w.user_id=u.id' : ''} WHERE u.referred_by=? ORDER BY u.created_at DESC LIMIT ${Math.max(1, Math.min(500, limit))}`).bind(userId).all()).results;
}

// Admin tab: every member with their totals.
export async function members(env) {
  return (await env.DB.prepare(`SELECT m.id, m.username, m.email, m.whatsapp, m.tier, m.tier_until, m.inner_circle_at,
    (SELECT COUNT(*) FROM users r WHERE r.referred_by=m.id) AS invites,
    (SELECT COALESCE(SUM(COALESCE(w.balance_kobo,0) + COALESCE(w.winnings_kobo,0)),0) FROM users r LEFT JOIN wallets w ON w.user_id=r.id WHERE r.referred_by=m.id) AS wallets,
    (SELECT COALESCE(SUM(${SPEND_SQL('r')}),0) FROM users r WHERE r.referred_by=m.id) AS spent
    FROM users m WHERE m.inner_circle=1 ORDER BY invites DESC, m.inner_circle_at DESC LIMIT 200`).all()).results;
}
