module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'Cactus',
    extraResource: ['renderer'],
    ignore: [
      /^\/(src|scripts|test)($|\/)/,
      /^\/renderer($|\/)/,
      /^\/out($|\/)/,
      /^\/tsconfig\.json$/,
    ],
    win32metadata: {
      CompanyName: 'Cactus Team',
      FileDescription: 'Cactus online multiplayer card game',
      InternalName: 'Cactus',
      OriginalFilename: 'Cactus.exe',
      ProductName: 'Cactus',
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'cactus',
        setupExe: 'Cactus-Windows-x64-Setup.exe',
        noMsi: true,
      },
    },
    { name: '@electron-forge/maker-zip', platforms: ['win32'] },
  ],
};
