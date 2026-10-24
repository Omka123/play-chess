import { randomBytes } from "node:crypto";
import { communityTransaction } from "./communityStore.js";

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export function isModerator(user) {
  const emails = (process.env.MODERATOR_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return Boolean(user?.id && user?.email && emails.includes(user.email.toLowerCase()));
}
export function requireModerator(user) { if (!isModerator(user)) fail("Moderator access required.", 403); }
export function checkActive(player) {
  if (player?.deleted) fail("This account has been deleted.", 403);
  if (player?.suspended) fail("Your account is suspended from online play and community actions. Visit Contact to appeal.", 403);
}
export async function assertAccountActive(user) {
  if (!user?.id) return;
  return communityTransaction((state) => { const player = state.players[user.id]; checkActive(player); return player ? { name: player.name } : null; }, { readOnly: true });
}
export async function isReplayHidden(id) {
  return communityTransaction((state) => Boolean(state.hiddenReplays?.[id]), { readOnly: true });
}
export async function submitReport(user, input) {
  if (!user?.id) fail("Sign in to report a problem.", 401);
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Invalid report.");
  if (!["player", "game", "replay"].includes(input.type)) fail("Choose a report type.");
  if (!["harassment", "cheating", "inappropriate-name", "spam", "other"].includes(input.reason)) fail("Choose a report reason.");
  const details = typeof input.details === "string" ? input.details.trim() : "";
  if (details.length < 20 || details.length > 2000) fail("Please describe the issue in 20–2000 characters.");
  const rawTarget = typeof input.target === "string" ? input.target.trim() : "";
  const target = input.type === "player" ? rawTarget.replace(/^@/, "").toLowerCase() : rawTarget;
  if (!target || target.length > 500) fail("Enter a valid report target.");
  let evidence = null;
  if (input.type === "game") {
    if (!/^[a-f0-9]{24}$/.test(target)) fail("Enter a valid game ID.");
    const { updateRoom } = await import("./roomStore.js");
    try {
      evidence = await updateRoom(target, (room) => {
        if (!Object.values(room.users || {}).includes(user.id)) fail("You can only report games you participated in.", 403);
        return { names: room.names, moves: room.moves, result: room.result, opponentId: Object.values(room.users || {}).find((id) => id !== user.id) || null };
      }, { readOnly: true });
    } catch (error) {
      if (error.status !== 404 && error.status !== 410) throw error;
      const { listGames } = await import("./gameHistory.js");
      const game = (await listGames(user.id)).find((game) => game.id === `friend-${target}`);
      if (!game) fail("This game is not in your account history.", 403);
      evidence = { names: game.names, moves: game.moves, result: game.result, opponentId: game.opponentId || null };
    }
  } else if (input.type === "replay") {
    if (!/^[a-f0-9]{48}$/.test(target)) fail("Enter the replay ID from its shared link.");
    const { sharedGame } = await import("./gameHistory.js");
    const replay = await sharedGame(target);
    if (!replay) fail("Shared replay not found.", 404);
    evidence = { names: replay.names, moves: replay.moves, result: replay.result };
  }
  return communityTransaction((state) => {
    state.reports ||= {};
    const reports = Object.values(state.reports);
    const open = reports.find((report) => report.reporterId === user.id && report.type === input.type && report.target === target && report.status === "open");
    if (open) return { id: open.id, duplicate: true };
    if (reports.filter((report) => report.reporterId === user.id && report.createdAt > Date.now() - 86400000).length >= 5) fail("You can submit up to five reports per day. Contact support for urgent follow-up.", 429);
    let targetUserId = evidence?.opponentId || (input.type === "replay" ? state.replayOwners?.[target] : null) || null;
    if (input.type === "player") {
      const player = Object.values(state.players).find((player) => player.username === target.toLowerCase());
      if (!player || player.id === user.id) fail("Enter another player's username.", 404);
      targetUserId = player.id;
    }
    const id = randomBytes(12).toString("hex");
    state.reports[id] = { id, reporterId: user.id, type: input.type, target, targetUserId, reason: input.reason, details, evidence,
      status: "open", createdAt: Date.now(), updatedAt: Date.now() };
    return { id };
  });
}
export async function moderationOverview(user) {
  requireModerator(user);
  return communityTransaction((state) => ({
    players: Object.values(state.players).map((player) => ({ id: player.id, username: player.username, name: player.name, suspended: Boolean(player.suspended), suspensionReason: player.suspensionReason || "", staff: Boolean(player.staff), ratedCount: player.ratedCount })),
    reports: Object.values(state.reports || {}).sort((a, b) => b.createdAt - a.createdAt),
    audit: (state.moderationAudit || []).slice(-100).reverse(),
    hiddenReplays: Object.keys(state.hiddenReplays || {}),
  }), { readOnly: true });
}
export async function moderationAction(user, input) {
  requireModerator(user);
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Invalid moderation action.");
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length < 5 || note.length > 500) fail("Add a moderation note of 5–500 characters.");
  return communityTransaction((state) => {
    if (["suspend", "restore", "resetProfile"].includes(input.type)) {
      const player = Object.hasOwn(state.players, input.userId) ? state.players[input.userId] : null;
      if (!player) fail("Player not found.", 404);
      if (player.id === user.id || player.staff) fail("Moderator accounts cannot be changed here.", 403);
      if (input.type === "suspend") {
        player.suspended = true; player.suspensionReason = note;
        delete state.queue[player.id];
        for (const [id, challenge] of Object.entries(state.challenges)) if (challenge.from === player.id || challenge.to === player.id) delete state.challenges[id];
      } else if (input.type === "restore") { player.suspended = false; player.suspensionReason = ""; }
      else {
        let username;
        do { username = `reset_${randomBytes(6).toString("hex")}`; } while (Object.values(state.players).some((entry) => entry.username === username));
        player.name = "Chess player"; player.username = username; player.avatar = "knight";
      }
    } else if (input.type === "resolve" || input.type === "dismiss") {
      const report = Object.hasOwn(state.reports || {}, input.reportId) ? state.reports[input.reportId] : null;
      if (!report) fail("Report not found.", 404);
      report.status = input.type === "resolve" ? "resolved" : "dismissed";
      report.updatedAt = Date.now(); report.moderatorId = user.id; report.moderatorNote = note;
    } else if (input.type === "hideReplay" || input.type === "restoreReplay") {
      if (!/^[a-f0-9]{48}$/.test(input.replayId)) fail("Enter a valid replay ID.");
      state.hiddenReplays ||= {};
      if (input.type === "hideReplay") state.hiddenReplays[input.replayId] = { at: Date.now(), moderatorId: user.id, note };
      else delete state.hiddenReplays[input.replayId];
    } else fail("Unknown moderation action.");
    state.moderationAudit ||= [];
    state.moderationAudit.push({ id: randomBytes(12).toString("hex"), action: input.type, target: input.userId || input.reportId || input.replayId, moderatorId: user.id, note, at: Date.now() });
    return { updated: true };
  });
}
