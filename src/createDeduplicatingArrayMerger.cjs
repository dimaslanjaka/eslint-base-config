function createDeduplicatingArrayMerger() {
  return (existingItems, incomingItems) => {
    const seenKeys = new Set();
    const mergedItems = [];

    for (const item of [...existingItems, ...incomingItems]) {
      const uniqueKey = item && typeof item === 'object' ? JSON.stringify(item) : item;

      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        mergedItems.push(item);
      }
    }

    return mergedItems;
  };
}

module.exports = createDeduplicatingArrayMerger;
module.exports.default = createDeduplicatingArrayMerger;
