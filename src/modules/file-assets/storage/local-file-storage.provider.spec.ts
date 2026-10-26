import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { FileStorageProvider, StoreFileInput } from './file-storage.interface';
import { LocalFileStorageProvider } from './local-file-storage.provider';

describe('LocalFileStorageProvider', () => {
  const dirName = `tmp-test-uploads-${process.pid}-${Date.now()}`;
  let configService: ConfigService;

  function makeProvider(prefix?: string, uploadsDir = dirName): LocalFileStorageProvider {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'UPLOADS_DIR') return uploadsDir;
        if (key === 'UPLOADS_PATH_PREFIX') return prefix;
        return undefined;
      }),
    } as unknown as ConfigService;
    return new LocalFileStorageProvider(configService);
  }

  afterAll(() => {
    const candidates = [join(process.cwd(), dirName), join(process.cwd(), `${dirName}-prefix`)];
    for (const fullPath of candidates) {
      if (existsSync(fullPath)) {
        rmSync(fullPath, { recursive: true, force: true });
      }
    }
  });

  it('creates the uploads directory on construction when missing', () => {
    const target = `${dirName}-mkdir`;
    expect(existsSync(join(process.cwd(), target))).toBe(false);
    makeProvider(undefined, target);
    expect(existsSync(join(process.cwd(), target))).toBe(true);
  });

  it('stores a file and returns local metadata with /uploads url prefix', async () => {
    const provider = makeProvider();
    const input: StoreFileInput = {
      originalName: 'photo.JPG',
      buffer: Buffer.from('hello'),
      mimeType: 'image/jpeg',
      size: 5,
    };

    const stored = await provider.store(input);

    expect(stored.provider).toBe(FileStorageProvider.LOCAL);
    expect(stored.filename).toMatch(/^\d+-[a-z0-9]+\.jpg$/);
    expect(stored.url).toBe(`/uploads/${stored.filename}`);
    expect(stored.path).toBe(stored.filename);
    expect(stored.size).toBe(5);
    expect(stored.mimeType).toBe('image/jpeg');
    expect(existsSync(join(process.cwd(), dirName, stored.filename))).toBe(true);
  });

  it('drops the file extension when the original name has no dot', async () => {
    const provider = makeProvider();
    const stored = await provider.store({
      originalName: 'noextension',
      buffer: Buffer.from('x'),
      mimeType: 'application/octet-stream',
      size: 1,
    });
    expect(stored.filename).not.toMatch(/\./);
  });

  it('deletes an existing stored file and resolves quietly for missing files', async () => {
    const provider = makeProvider();
    const stored = await provider.store({
      originalName: 'delete-me.png',
      buffer: Buffer.from('data'),
      mimeType: 'image/png',
      size: 4,
    });
    const fullPath = join(process.cwd(), dirName, stored.filename);
    expect(existsSync(fullPath)).toBe(true);

    await provider.delete(stored);
    expect(existsSync(fullPath)).toBe(false);

    await expect(
      provider.delete({ ...stored, filename: 'no-such-file.png' }),
    ).resolves.toBeUndefined();
  });

  it('honors a custom UPLOADS_PATH_PREFIX for the url', async () => {
    const provider = makeProvider('https://cdn.test/uploads');
    const stored = await provider.store({
      originalName: 'pic.jpg',
      buffer: Buffer.from('p'),
      mimeType: 'image/jpeg',
      size: 1,
    });
    expect(stored.url).toMatch(/^https:\/\/cdn\.test\/uploads\//);
  });
});
