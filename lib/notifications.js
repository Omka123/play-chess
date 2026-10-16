export function notify(state, userId, title, href = "/hub") {
  const player = state.players[userId];
  if (!player || player.deleted) return;
  player.notifications ||= [];
  player.notifications.unshift({ id: `${Date.now()}-${player.notifications.length}`, title, href, at: Date.now(), read: false });
  player.notifications = player.notifications.slice(0, 100);
}
export const blocked = (state, a, b) => Boolean(state.players[a]?.blocked?.includes(b) || state.players[b]?.blocked?.includes(a));
