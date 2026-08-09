import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('File storage is not configured')
  }

  return { accountId, accessKeyId, secretAccessKey, bucket }
}

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID
    && process.env.R2_ACCESS_KEY_ID
    && process.env.R2_SECRET_ACCESS_KEY
    && process.env.R2_BUCKET_NAME
  )
}

export function getR2Client(): { client: S3Client; bucket: string } {
  const config = getR2Config()
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  return { client, bucket: config.bucket }
}

export async function putR2Object(key: string, body: Buffer, contentType: string): Promise<void> {
  const { client, bucket } = getR2Client()
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
}

export async function getR2Object(key: string) {
  const { client, bucket } = getR2Client()
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
}

export async function deleteR2Objects(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  if (!isR2Configured()) throw new Error('File storage is not configured')
  const { client, bucket } = getR2Client()

  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000)
    await client.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: batch.map(Key => ({ Key })), Quiet: true },
    }))
  }
}
