import { collectBannerNodes } from './collect-banner-nodes.util';

describe('collectBannerNodes', () => {
  it('collects an exportable top-level frame', () => {
    const root = {
      id: '1:1',
      name: 'banner_300x250',
      type: 'FRAME',
      absoluteBoundingBox: { width: 300.4, height: 249.6 },
    };

    expect(collectBannerNodes(root)).toEqual([
      {
        id: '1:1',
        name: 'banner_300x250',
        type: 'FRAME',
        width: 300,
        height: 250,
      },
    ]);
  });

  it('rounds fractional Figma dimensions to whole pixels', () => {
    const root = {
      id: '1:1',
      name: 'banner',
      type: 'COMPONENT',
      absoluteBoundingBox: { width: 727.5, height: 89.5 },
    };

    expect(collectBannerNodes(root)[0]).toMatchObject({
      width: 728,
      height: 90,
    });
  });

  it('walks into children and collects every exportable descendant', () => {
    const root = {
      id: 'root',
      type: 'GROUP',
      children: [
        {
          id: 'a',
          name: 'banner_a',
          type: 'FRAME',
          absoluteBoundingBox: { width: 300, height: 250 },
        },
        {
          id: 'b',
          type: 'GROUP',
          children: [
            {
              id: 'c',
              name: 'banner_c',
              type: 'INSTANCE',
              absoluteBoundingBox: { width: 728, height: 90 },
            },
          ],
        },
      ],
    };

    expect(collectBannerNodes(root).map((n) => n.id)).toEqual(['a', 'c']);
  });

  it('skips node types that are not FRAME/COMPONENT/INSTANCE', () => {
    const root = {
      id: 'a',
      name: 'not-a-banner',
      type: 'TEXT',
      absoluteBoundingBox: { width: 300, height: 250 },
    };

    expect(collectBannerNodes(root)).toEqual([]);
  });

  it('skips an exportable-typed node with no bounding box', () => {
    const root = { id: 'a', name: 'empty-frame', type: 'FRAME' };

    expect(collectBannerNodes(root)).toEqual([]);
  });

  it('skips a bounding box with a zero dimension (falsy width/height)', () => {
    const root = {
      id: 'a',
      name: 'zero-width',
      type: 'FRAME',
      absoluteBoundingBox: { width: 0, height: 250 },
    };

    expect(collectBannerNodes(root)).toEqual([]);
  });

  it('returns an empty array for a null/undefined root', () => {
    expect(collectBannerNodes(null)).toEqual([]);
    expect(collectBannerNodes(undefined)).toEqual([]);
  });

  it('returns an empty array when nothing in the tree is exportable', () => {
    const root = {
      id: 'root',
      type: 'GROUP',
      children: [
        {
          id: 'a',
          type: 'TEXT',
          absoluteBoundingBox: { width: 10, height: 10 },
        },
      ],
    };

    expect(collectBannerNodes(root)).toEqual([]);
  });
});
