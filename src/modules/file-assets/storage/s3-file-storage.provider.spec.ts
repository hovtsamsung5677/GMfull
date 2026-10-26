import { InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { S3FileStorageProvider } from "./s3-file-storage.provider";
import { FileStorageProvider, StoreFileInput } from "./file-storage.interface";

jest.mock("@aws-sdk/client-s3", () => {
  const send = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: jest.fn().mockImplementation((args) => args),
    DeleteObjectCommand: jest.fn().mockImplementation((args) => args),
  };
});

jest.mock("@aws-sdk/lib-storage", () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("S3FileStorageProvider", () => {
  function makeConfig(overrides: Record<string, string | undefined> = {}) {
    const base: Record<string, string | undefined> = {
      S3_ACCESS_KEY_ID: "AKIATEST",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET: "test-bucket",
      S3_REGION: "us-east-1",
      S3_ENDPOINT: "https://s3.test",
      S3_FORCE_PATH_STYLE: "true",
      S3_URL_PREFIX: "https://cdn.test",
      S3_MULTIPART_THRESHOLD: "5",
    };
    const configService = {
      get: jest.fn((key: string) =>
        Object.prototype.hasOwnProperty.call(overrides, key)
          ? overrides[key]
          : base[key],
      ),
    } as unknown as ConfigService;
    return configService;
  }

  it("throws when S3 credentials or bucket are missing", () => {
    const configService = makeConfig({
      S3_ACCESS_KEY_ID: undefined,
      S3_SECRET_ACCESS_KEY: undefined,
      S3_BUCKET: undefined,
    });
    expect(() => new S3FileStorageProvider(configService)).toThrow(
      InternalServerErrorException,
    );
  });

  it("constructs an S3Client with resolved configuration", () => {
    new S3FileStorageProvider(makeConfig());

    expect(S3Client).toHaveBeenCalledTimes(1);
    const args = (S3Client as unknown as jest.Mock).mock.calls[0][0];
    expect(args.region).toBe("us-east-1");
    expect(args.endpoint).toBe("https://s3.test");
    expect(args.credentials).toEqual({
      accessKeyId: "AKIATEST",
      secretAccessKey: "secret",
    });
    expect(args.forcePathStyle).toBe(true);
  });

  it("uploads via managed multipart Upload and returns S3 metadata", async () => {
    const provider = new S3FileStorageProvider(makeConfig());
    const input: StoreFileInput = {
      originalName: "banner.gif",
      buffer: Buffer.from("frames"),
      mimeType: "image/gif",
      size: 6,
    };

    const stored = await provider.store(input);

    expect(Upload).toHaveBeenCalledTimes(1);
    const uploadArgs = (Upload as unknown as jest.Mock).mock.calls[0][0];
    expect(uploadArgs.params.Bucket).toBe("test-bucket");
    expect(uploadArgs.params.Key).toBe(stored.filename);
    expect(uploadArgs.params.Body).toBe(input.buffer);
    expect(uploadArgs.params.ContentType).toBe("image/gif");
    expect(uploadArgs.params.ContentLength).toBe(6);

    expect(stored.provider).toBe(FileStorageProvider.S3);
    expect(stored.filename).toMatch(/^\d+-[a-z0-9]+\.gif$/);
    expect(stored.url).toBe(`https://cdn.test/${stored.filename}`);
    expect(stored.path).toBe(stored.filename);
    expect(stored.size).toBe(6);
    expect(stored.mimeType).toBe("image/gif");
  });

  it("builds the canonical S3 URL when no urlPrefix is configured", async () => {
    const provider = new S3FileStorageProvider(
      makeConfig({ S3_URL_PREFIX: undefined }),
    );
    const stored = await provider.store({
      originalName: "icon.png",
      buffer: Buffer.from("i"),
      mimeType: "image/png",
      size: 1,
    });
    expect(stored.url).toBe(
      `https://test-bucket.s3.us-east-1.amazonaws.com/${stored.filename}`,
    );
  });

  it("deletes an object via DeleteObjectCommand", async () => {
    const provider = new S3FileStorageProvider(makeConfig());
    await provider.delete({
      filename: "x.png",
      url: "u",
      path: "x.png",
      size: 1,
      mimeType: "image/png",
      provider: FileStorageProvider.S3,
    });

    expect(DeleteObjectCommand).toHaveBeenCalledTimes(1);
    expect(
      (DeleteObjectCommand as unknown as jest.Mock).mock.calls[0][0],
    ).toEqual({
      Bucket: "test-bucket",
      Key: "x.png",
    });
    const s3Client = (S3Client as unknown as jest.Mock).mock.results[0]
      .value as {
      send: jest.Mock;
    };
    expect(s3Client.send).toHaveBeenCalled();
  });

  it("swallows delete errors instead of throwing", async () => {
    const provider = new S3FileStorageProvider(makeConfig());
    const s3Client = (S3Client as unknown as jest.Mock).mock.results[0]
      .value as {
      send: jest.Mock;
    };
    s3Client.send.mockRejectedValueOnce(new Error("boom"));

    await expect(
      provider.delete({
        filename: "y.png",
        url: "u",
        path: "y.png",
        size: 1,
        mimeType: "image/png",
        provider: FileStorageProvider.S3,
      }),
    ).resolves.toBeUndefined();
  });
});
