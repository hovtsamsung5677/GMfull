import { ConfigService } from "@nestjs/config";
import {
  FILE_STORAGE_PROVIDER,
  FileStorageProvider,
} from "./file-storage.interface";
import { fileStorageProviderFactory } from "./file-storage.module";
import { LocalFileStorageProvider } from "./local-file-storage.provider";
import { S3FileStorageProvider } from "./s3-file-storage.provider";

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock("@aws-sdk/lib-storage", () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("fileStorageProviderFactory", () => {
  function makeConfig(provider?: string): ConfigService {
    return {
      get: jest.fn((key: string) =>
        key === "FILE_STORAGE_PROVIDER" ? provider : undefined,
      ),
    } as unknown as ConfigService;
  }

  it("provides the local provider by default when FILE_STORAGE_PROVIDER is unset", () => {
    const instance = fileStorageProviderFactory.useFactory(makeConfig());

    expect(instance).toBeInstanceOf(LocalFileStorageProvider);
    expect(fileStorageProviderFactory.provide).toBe(FILE_STORAGE_PROVIDER);
    expect(fileStorageProviderFactory.inject).toEqual([ConfigService]);
  });

  it("selects the local provider when FILE_STORAGE_PROVIDER is LOCAL", () => {
    const instance = fileStorageProviderFactory.useFactory(makeConfig("LOCAL"));
    expect(instance).toBeInstanceOf(LocalFileStorageProvider);
  });

  it("selects the S3 provider when FILE_STORAGE_PROVIDER is S3", () => {
    const config = {
      get: jest.fn((key: string) => {
        const map: Record<string, string | undefined> = {
          FILE_STORAGE_PROVIDER: FileStorageProvider.S3,
          S3_ACCESS_KEY_ID: "AKIATEST",
          S3_SECRET_ACCESS_KEY: "secret",
          S3_BUCKET: "test-bucket",
          S3_REGION: "us-east-1",
        };
        return map[key];
      }),
    } as unknown as ConfigService;

    const instance = fileStorageProviderFactory.useFactory(config);

    expect(instance).toBeInstanceOf(S3FileStorageProvider);
  });
});
