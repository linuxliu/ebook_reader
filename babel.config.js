module.exports = function (api) {
  api.cache(true);

  const presets = [
    [
      '@babel/preset-env',
      {
        targets: process.env.BABEL_TARGET === 'renderer' 
          ? { electron: '37' }
          : { node: 'current' },
        modules: false,
      },
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
      },
    ],
    '@babel/preset-typescript',
  ];

  return {
    presets,
  };
};