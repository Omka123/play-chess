import { requireAdmin } from "./adminAccess.js";
import { communityTransaction } from "./communityStore.js";
import { command, useRedis } from "./roomStore.js";
import { useMongo, mongoDatabase } from "./mongoStore.js";
import { serviceMetrics } from "./operations.js";
import { moderationAction, assertAccountActive } from "./moderation.js";

export async function adminOverview(user, { search = "", page = 1 } = {}) {
  requireAdmin(user);
  await assertAccountActive(user);
  const query = typeof search === "string" ? search.trim().slice(0, 100) : "";
  const requestedPage = Math.max(1, Math.min(100000, Number.parseInt(page, 10) || 1)), size = 25;
  const snapshot = await communityTransaction(state => {
    const players = Object.values(state.players || {});
    const events = Object.values(state.tournaments || {});
    return {
      players: structuredClone(players),
      stats: {
        players: players.filter(p => !p.deleted).length,
        suspended: players.filter(p => p.suspended && !p.deleted).length,
        openReports: Object.values(state.reports || {}).filter(r => r.status === "open").length,
        studies: Object.keys(state.sharedStudies || {}).length,
        runningEvents: events.filter(e => e.status === "running").length,
      },
    };
  }, { readOnly: true });
  const profiles = new Map(snapshot.players.map(p => [p.id, p]));
  let accounts, total, totalAccounts, currentPage;
  if (useMongo()) {
    const db = await mongoDatabase(), collection = db.collection("users");
    const expression = { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    const matchingIds = snapshot.players.filter(p => `${p.name || ""} ${p.username || ""} ${p.id}`.toLowerCase().includes(query.toLowerCase())).map(p => p.id);
    const filter = query ? { $or: [{ name: expression }, { email: expression }, { id: expression }, { _id: { $in: matchingIds } }] } : {};
    [total, totalAccounts] = await Promise.all([collection.countDocuments(filter), collection.countDocuments({})]);
    currentPage = Math.min(requestedPage, Math.max(1, Math.ceil(total / size)));
    accounts = await collection.find(filter).project({ id: 1, name: 1, email: 1, createdAt: 1 }).sort({ createdAt: -1, _id: 1 }).skip((currentPage - 1) * size).limit(size).toArray();
  } else {
    // The admin panel remains usable on legacy Redis/local installations.
    const candidates = snapshot.players.filter(p => !p.deleted && `${p.name || ""} ${p.username || ""} ${p.id}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.id.localeCompare(b.id));
    total = candidates.length; totalAccounts = snapshot.stats.players;
    currentPage = Math.min(requestedPage, Math.max(1, Math.ceil(total / size)));
    accounts = await Promise.all(candidates.slice((currentPage - 1) * size, currentPage * size).map(async p => {
      const raw = useRedis() ? await command(["GET", `gambit:user:${p.id}`]) : null;
      return raw ? JSON.parse(raw) : { id: p.id, name: p.name };
    }));
  }
  return {
    stats: { ...snapshot.stats, accounts: totalAccounts },
    users: accounts.map(account => {
      const profile = profiles.get(account.id || account._id);
      return { id: account.id || account._id, name: profile?.name || account.name || "Chess player", email: account.email || "", createdAt: account.createdAt || null,
        username: profile?.username || "", suspended: Boolean(profile?.suspended), deleted: Boolean(profile?.deleted), staff: Boolean(profile?.staff),
        ratings: profile?.ratings ? { bullet: profile.ratings.bullet, blitz: profile.ratings.blitz, rapid: profile.ratings.rapid } : null,
        ratedCount: profile?.ratedCount || 0, isOwner: (account.id || account._id) === user.id };
    }),
    pagination: { page: currentPage, pages: Math.max(1, Math.ceil(total / size)), total, size },
    storage: useMongo() ? "MongoDB" : useRedis() ? "Redis" : "Local files",
    metrics: serviceMetrics(),
    checkedAt: Date.now(),
    searchHint: useMongo() ? "Search name, username, email or user ID" : "Search name, username or user ID",
  };
}

export async function adminAction(user, input) {
  requireAdmin(user);
  await assertAccountActive(user);
  // Reuse existing validated actions and their immutable audit entries.
  return moderationAction(user, input);
}
