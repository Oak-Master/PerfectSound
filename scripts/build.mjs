import {packager} from '@electron/packager';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

if(process.platform!=='win32')throw new Error('Build the Windows package on Windows.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const dist=path.join(root,'dist');await fs.mkdir(dist,{recursive:true});
const output=await packager({dir:root,out:path.join(dist,'app'),name:'PerfectSound',platform:'win32',arch:'x64',electronVersion:pkg.devDependencies.electron,appVersion:pkg.version,icon:path.join(root,'icon.ico'),asar:false,prune:false,overwrite:true,ignore:[/^\/\.git(?:\/|$)/,/^\/\.github(?:\/|$)/,/^\/node_modules(?:\/|$)/,/^\/dist(?:\/|$)/,/^\/data(?:\/|$)/,/^\/work(?:\/|$)/,/^\/scripts(?:\/|$)/],win32metadata:{CompanyName:'OAK',ProductName:'PerfectSound',InternalName:'PerfectSound',FileDescription:'PerfectSound — experimental Windows audio hub'}});
const appPath=output[0],file='PerfectSound-'+pkg.version+'-windows-x64.zip',archive=path.join(dist,file);
const from=path.join(appPath,'*').replaceAll("'","''"),to=archive.replaceAll("'","''");
execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; Compress-Archive -Path '"+from+"' -DestinationPath '"+to+"' -Force"],{windowsHide:true,stdio:'inherit'});
const hash=createHash('sha256').update(await fs.readFile(archive)).digest('hex');
await fs.writeFile(path.join(dist,'SHA256SUMS.txt'),hash+'  '+file+'\n');
console.log(archive);
