/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const packageJsonPath = path.join(path.dirname(__filename), 'package.json');

const getPackageVersion = () => {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version;
    console.log(JSON.stringify({ version }));
  } catch (error) {
    console.log(JSON.stringify({ version: '0' }));
    console.error('Erro ao ler o arquivo package.json:', error);
    return null;
  }
};

getPackageVersion();
