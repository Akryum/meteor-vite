import { execSync, spawn } from 'child_process';
import Path from 'path';
import FS from 'fs/promises';

// Assuming this is launched from the repository root for now.
const repoPath = process.cwd();
const meteorPackage = {
    releaseName: 'vite-bundler',
    packageJsPath: Path.join(repoPath, './packages/vite-bundler/package.js'),
}

const PACKAGE_VERSION_REGEX = /version:\s*'(?<version>[\d.]+)'\s*,/;

function shell(command, options) {
    console.log(`$ ${command}`);
    if (!options?.async) {
        console.log(execSync(command, options).toString('utf-8'))
        return;
    }
    const [bin, ...args] = command.split(' ');
    spawn(bin, args, {
        ...options,
        stdio: 'inherit',
    });
}

shell('changeset status --output changeset-status.json');
const changesetStatus = FS.readFile('changeset-status.json', 'utf-8').then((content) => {
    return JSON.parse(content);
});

changesetStatus.then(async ({ releases }) => {
    const release = releases.find(({ name }) => meteorPackage.releaseName);

    if (!release) {
        console.log('⚠️  No pending releases found for %s', meteorPackage.releaseName);
        return;
    }

    console.log(`ℹ️  New version ${release.newVersion} for ${meteorPackage.releaseName} detected`);

    let packageJsContent = await FS.readFile(meteorPackage.packageJsPath, 'utf-8');
    const currentVersion = packageJsContent.match(PACKAGE_VERSION_REGEX)?.groups?.version
    if (!currentVersion) {
        throw new Error(`Unable to read version from ${meteorPackage.releaseName} package.js`)
    }
    packageJsContent = packageJsContent.replace(PACKAGE_VERSION_REGEX, `version: '${release.newVersion}',`);
    await FS.writeFile(meteorPackage.packageJsPath, packageJsContent);

    console.log(`✅  Changed version in package.js from v${currentVersion} to v${release.newVersion}\n\n`);

    shell(`git add ${meteorPackage.packageJsPath}`);
    shell(`git commit -m 'Bump ${meteorPackage.releaseName} version to ${release.newVersion}'`);

    console.log(`⚡  Publishing ${meteorPackage.releaseName}...\n`);

    shell('meteor publish', {
        async: true,
        cwd: Path.dirname(meteorPackage.packageJsPath),
        env: {
            METEOR_SESSION_FILE: process.env.METEOR_SESSION_FILE,
            ...process.env,
        }
    })
});
