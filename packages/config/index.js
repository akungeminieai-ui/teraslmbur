// Export path references for workspace package resolving
module.exports = {
  eslint: {
    base: require.resolve('./eslint/base.js'),
    next: require.resolve('./eslint/next.js'),
    nest: require.resolve('./eslint/nest.js'),
  },
};
