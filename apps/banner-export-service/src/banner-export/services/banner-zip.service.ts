import { Injectable } from '@nestjs/common';

// adm-zip ships no type declarations and has no @types package, so `import` can't resolve it
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdmZip = require('adm-zip');

@Injectable()
export class BannerZipService {
  createZip(sourceDir: string, zipPath: string) {
    const zip = new AdmZip();

    zip.addLocalFolder(sourceDir);
    zip.writeZip(zipPath);
  }
}
