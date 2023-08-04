import { exec } from "@actions/exec";
import { find, cacheDir, downloadTool, extractZip } from "@actions/tool-cache";
import { which, mv } from "@actions/io";
import * as path from 'path';
import { _filterVersion, _readFile } from './util';

const IS_WINDOWS: boolean = process.platform === "win32" ? true : false;

export class DownloadExtractInstall {
    private readonly downloadUrl: string;
    private readonly fileType: string;

    public constructor(downloadUrl: string) {
        this.downloadUrl = downloadUrl;
        this.fileType = this.downloadUrl.substring(-4);
    }

    public async isAlreadyInstalled(tooName: string): Promise<boolean | string> {
        const cachePath = await find(tooName, '*');
        const systemPath = await which(tooName);
        if (cachePath) return cachePath;
        if (systemPath) {
            return systemPath;
        }
        return false;
    }
    private async _getCommandOutput(commandStr: string, args: string[]): Promise<string> {
        const logFile = path.join(__dirname, 'log.txt')
        let stdErr = ''
        let stdOut = ''
        const options = {
            windowsVerbatimArguments: false,
            listeners: {
                stderr: (data: Buffer) => { // AWS cli --version goes to stderr: https://stackoverflow.com/a/43284161
                    stdErr += data.toString()
                },
                stdout: (data: Buffer) => {
                    stdOut += data.toString()
                }
            }
        }

        if (IS_WINDOWS) {
            args.push('>', logFile)
            args.unshift(commandStr)
            args.unshift('/c')
            commandStr = 'cmd'
            await exec(commandStr, args, options)
            return await _readFile(logFile, {})
        } else {
            await exec(commandStr, args, options)
            if (stdOut === '') return stdErr
            return stdOut
        }
    }

    private async _getVersion(installBinary: string): Promise<string> {
        const versionCommandOutput = await this._getCommandOutput(installBinary, ['--version']);
        const installedVersion = _filterVersion(versionCommandOutput);

        return installedVersion;
    }

    public async downloadFile(): Promise<string> {
        const filePath = await downloadTool(this.downloadUrl);
        const destPath = `${filePath}${this.fileType}`;

        await mv(filePath, destPath);
        return destPath;
    }

    public async extractFile(filePath: string): Promise<string> {
        const extractDir = path.dirname(filePath);
        if (process.platform === 'linux') {
            await exec(`unzip ${filePath}`, ['-d', extractDir]);
            return extractDir
        }
        return await extractZip(filePath, extractDir);
    }

    public async cacheTool(installedBinary: string): Promise<string> {
        const installedVersion = await this._getVersion(installedBinary)
        const cachedPath = await cacheDir(path.parse(installedBinary).dir, 'aws', installedVersion)
        return cachedPath
    }

    public async installPackage(installCommand: string, installArgs: string[]): Promise<number> {
        return await exec(installCommand, installArgs);
    }
}