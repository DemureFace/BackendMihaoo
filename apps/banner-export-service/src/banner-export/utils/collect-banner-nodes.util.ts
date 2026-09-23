export function collectBannerNodes(rootNode: any) {
  const banners: any[] = [];

  function walk(node: any) {
    if (!node) return;

    const isExportable =
      ['FRAME', 'COMPONENT', 'INSTANCE'].includes(node.type) &&
      node.absoluteBoundingBox?.width &&
      node.absoluteBoundingBox?.height;

    if (isExportable) {
      banners.push({
        id: node.id,
        name: node.name,
        type: node.type,
        width: Math.round(node.absoluteBoundingBox.width),
        height: Math.round(node.absoluteBoundingBox.height),
      });
    }

    if (node.children?.length) {
      node.children.forEach(walk);
    }
  }

  walk(rootNode);

  return banners;
}
