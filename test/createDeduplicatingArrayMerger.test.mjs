import createDeduplicatingArrayMerger from '../src/createDeduplicatingArrayMerger.cjs';

describe('createDeduplicatingArrayMerger', () => {
  test('should merge and deduplicate primitive arrays', () => {
    const merge = createDeduplicatingArrayMerger();

    const result = merge(['a', 'b', 'c'], ['b', 'c', 'd']);

    expect(result).toEqual(['a', 'b', 'c', 'd']);
  });

  test('should merge and deduplicate object arrays', () => {
    const merge = createDeduplicatingArrayMerger();

    const result = merge([{ a: 1 }, { b: 2 }], [{ a: 1 }, { c: 3 }]);

    expect(result).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  test('should preserve insertion order', () => {
    const merge = createDeduplicatingArrayMerger();

    const result = merge([1, 2], [2, 3, 1, 4]);

    expect(result).toEqual([1, 2, 3, 4]);
  });
});
