const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const pkg = require('pkg');
const { promisify } = require('util');
const extract = promisify(require('tar').extract);

const steamcmdFolderPath = '~/SteamCMD';
const steamworksSdkPath = '~/SteamworksSDK';
const appBuildVdfPath = '~../scripts/simple_app_build.vdf';
const steamUsername = process.env.STEAM_USERNAME; // github secret
const steamPassword = process.env.STEAM_PASSWORD; // github secret


async function installSteamCMD() {
  if (!fs.existsSync(steamcmdFolderPath)) {
    fs.mkdirSync(steamcmdFolderPath, { recursive: true });
  }

  let steamcmdUrl;
  switch (process.platform) {
    case 'win32':
      steamcmdUrl = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip';
      break;
    case 'darwin':
      steamcmdUrl = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz';
      break;
    case 'linux':
      steamcmdUrl = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz';
    default:
      steamcmdUrl = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz';
  }

  const downloadPath = path.join(steamcmdFolderPath, path.basename(steamcmdUrl));

  console.log(`Downloading SteamCMD from ${steamcmdUrl}...`);
  execSync(`curl -L -o "${downloadPath}" "${steamcmdUrl}"`);

  console.log('Extracting SteamCMD...');
  if (process.platform === 'win32') {
    execSync(`powershell -command "Expand-Archive -Path '${downloadPath}' -DestinationPath '${steamcmdFolderPath}'"`);
  } else {
    await extract({ file: downloadPath, cwd: steamcmdFolderPath });
  }

  console.log('SteamCMD installed successfully.');
}

async function run() { // must be async!!!
  // Install SteamCMD
  await installSteamCMD();

  // In this part, the app should already be `npm installed``

  // Package app into an executable using pkg
  try {
    await pkg.exec(['.', '--target', 'host', '--output', 'dist/app']);
    console.log('Packaging complete');
  } catch (err) {
    console.error('Error while packaging:', err);
    process.exit(1);
  }

  // Deploy the game to Steam
  const steamcmdExecutable = path.join(steamcmdFolderPath, process.platform === 'win32' ? 'steamcmd.exe' : 'steamcmd.sh');
  const deployCommand = `${steamcmdExecutable} +login ${steamUsername} ${steamPassword} +run_app_build_http ${appBuildVdfPath} +quit`;

  try {
    execSync(deployCommand, { stdio: 'inherit' });
    console.log('Deployment complete');
  } catch (err) {
    console.error('Error while deploying:', err);
    process.exit(1);
  }
}

run();
