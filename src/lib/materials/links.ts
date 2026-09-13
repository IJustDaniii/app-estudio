export function topicMaterialsHref(topicId: string) {
  return `/app/materials?topicId=${encodeURIComponent(topicId)}`;
}
