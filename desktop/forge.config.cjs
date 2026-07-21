module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'Cactus',
    extraResource: ['renderer'],
    ignore: [/^\/src($|\/)/, /^\/renderer($|\/)/, /^\/out($|\/)/],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: { name: 'cactus', setupExe: 'Cactus-Setup.exe' },
    },
    { name: '@electron-forge/maker-zip', platforms: ['win32'] },
  ],
};
