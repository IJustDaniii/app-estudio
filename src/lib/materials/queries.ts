export function materialOwnershipWhere(id: string, userId: string) {
  return { id, userId };
}

export function materialDuplicateWhere(userId: string, sha256: string) {
  return { userId, sha256 };
}
