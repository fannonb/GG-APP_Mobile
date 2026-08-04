module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@gg/shared-types': '../../packages/shared-types/src',
            '@gg/shared-api': '../../packages/shared-api/src',
            '@gg/shared-stores': '../../packages/shared-stores/src',
            '@gg/shared-utils': '../../packages/shared-utils/src',
            '@gg/shared-config': '../../packages/shared-config/src',
            '@gg/shared-hooks': '../../packages/shared-hooks/src',
            '@': './src',
          },
        },
      ],
    ],
  };
};
