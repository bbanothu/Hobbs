module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          chrome: '88',
        },
      },
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'classic',
      },
    ],
  ],
};
