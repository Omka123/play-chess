import { promises as fs } from "node:fs";
import path from "node:path";
import { communityTransaction } from "./communityStore.js";
import { command, useRedis } from "./roomStore.js";
export async function deleteAccountData(user, confirmation) {
  if (!user?.id || !/^[a-zA-Z0-9-]{1,100}$/.test(user.id)) throw Object.assign(new Error("Sign in to delete your account."), { status: 401 });
  if (confirmation !== "DELETE") throw Object.assign(new Error("Type DELETE to confirm account deletion."), { status: 400 });
  await communityTransaction((state) => {
    const me = state.players[user.id];
    if (me && !me.deleted && (state.matches[user.id] || Object.values(me.activeGames || {}).some((game) => game.expires > Date.now()))) throw Object.assign(new Error("Finish or resign your active games before deleting your account."), { status: 409 });
    if (Object.values(state.tournaments || {}).some((event) => event.ownerId === user.id && event.status === "running")) throw Object.assign(new Error("Finish your running tournaments before deleting your account."), { status: 409 });
    for (const player of Object.values(state.players)) { player.friends = (player.friends || []).filter((id) => id !== user.id); player.requests = (player.requests || []).filter((id) => id !== user.id); }
    for (const collection of ["queue", "matches"]) delete state[collection][user.id];
    for (const collection of ["challenges", "dailyInvites", "practiceInvites"]) for (const [id, invite] of Object.entries(state[collection] || {})) if (invite.from === user.id || invite.to === user.id) delete state[collection][id];
    for (const [id, study] of Object.entries(state.sharedStudies || {})) { if (study.ownerId === user.id) delete state.sharedStudies[id]; else { study.members = study.members.filter((id) => id !== user.id); for (const node of study.nodes) if (node.author === user.id) { node.comment = ""; node.author = "deleted"; } study.version++; } }
    for (const [id, club] of Object.entries(state.clubs || {})) { if (club.ownerId === user.id) delete state.clubs[id]; else club.members = club.members.filter((id) => id !== user.id); }
    for (const [id, event] of Object.entries(state.tournaments || {})) { if (event.ownerId === user.id && event.status === "scheduled") delete state.tournaments[id]; else if (event.status === "scheduled") event.members = event.members.filter((id) => id !== user.id); }
    for (const booking of Object.values(state.bookings || {})) if ([booking.studentId, booking.coachId].includes(user.id)) { booking.topic = ""; booking.status = "cancelled"; }
    for (const [id, battle] of Object.entries(state.puzzleBattles || {})) if (battle.players.includes(user.id)) delete state.puzzleBattles[id];
    state.hiddenReplays ||= {}; for (const [id, owner] of Object.entries(state.replayOwners || {})) if (owner === user.id) { state.hiddenReplays[id] = { at: Date.now(), reason: "Account deleted" }; delete state.replayOwners[id]; }
    state.players[user.id] = { id: user.id, deleted: true, deletionPending: true, name: "Deleted player", username: `deleted_${user.id.slice(0, 10)}`, avatar: "pawn", ratings: { bullet: 200, blitz: 200, rapid: 200 }, ratingHistory: [], ratedCount: 0, friends: [], requests: [], lastSeen: 0 };
  });
  if (useRedis()) { await command(["DEL", `gambit:user:${user.id}`, `gambit:history:${user.id}`]); }
  else {
    const root = path.resolve(process.env.GAMBIT_DATA_DIRECTORY || process.cwd());
    const folder = path.resolve(root, ".gambit-history", user.id);
    if (!folder.startsWith(root + path.sep)) throw new Error("Invalid account data path.");
    let files = []; try { files = await fs.readdir(folder); } catch (error) { if (error.code !== "ENOENT") throw error; }
    for (const file of files) if (/^[a-zA-Z0-9-]+\.json$/.test(file)) await fs.unlink(path.join(folder, file));
    try { await fs.rmdir(folder); } catch (error) { if (error.code !== "ENOENT") throw error; }
    try { await fs.unlink(path.join(root, ".gambit-users", `${user.id}.json`)); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  await communityTransaction((state) => { if (state.players[user.id]?.deleted) state.players[user.id].deletionPending = false; });
  return { deleted: true };
}
