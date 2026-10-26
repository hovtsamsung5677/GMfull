export enum FileStorageProvider {
  LOCAL = "LOCAL",
  S3 = "S3",
}

export interface StoreFileInput {
  originalName: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
}

export interface StoredFile {
  filename: string;
  url: string;
  path: string;
  size: number;
  mimeType: string;
  provider: FileStorageProvider;
}

export interface FileStorageProviderInstance {
  store(input: StoreFileInput): Promise<StoredFile>;
  delete(stored: StoredFile): Promise<void>;
}

export const FILE_STORAGE_PROVIDER = Symbol("FILE_STORAGE_PROVIDER");
