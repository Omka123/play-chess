export function studyRole(study, userId) {
  if (!study?.members?.includes(userId)) return null;
  return study.ownerId === userId ? "owner" : study.roles?.[userId] === "viewer" ? "viewer" : "editor";
}
export const canEditStudy = (study, userId) => ["owner", "editor"].includes(studyRole(study, userId));
export function studyForMember(study, userId) {
  const copy = structuredClone(study);
  if (study.ownerId !== userId) { delete copy.invite; delete copy.viewInvite; }
  return copy;
}
