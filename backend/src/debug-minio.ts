import { config } from 'dotenv';
import * as Minio from 'minio';

config();

async function debugMinioConnection() {
  console.log('\n🔍 MinIO Connection Debug\n');

  const endpoint = process.env.MINIO_ENDPOINT || '';
  const port = parseInt(process.env.MINIO_PORT || '443');
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const accessKey = process.env.MINIO_ROOT_USER || '';
  const secretKey = process.env.MINIO_ROOT_PASSWORD || '';
  const bucketName = process.env.MINIO_BUCKET_NAME || '';

  console.log('📋 Configuration:');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Port: ${port}`);
  console.log(`   Use SSL: ${useSSL}`);
  console.log(`   Access Key: ${accessKey.substring(0, 8)}...`);
  console.log(`   Secret Key: ${secretKey.substring(0, 8)}...`);
  console.log(`   Bucket: ${bucketName}`);
  console.log('');

  try {
    // Teste 1: Criar cliente com a config limpa
    console.log('🔄 Test 1: Creating MinIO client...');
    const minioClient = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });
    console.log('✅ Client created successfully');

    // Teste 2: Listar buckets
    console.log('\n🔄 Test 2: Listing buckets...');
    const buckets = await minioClient.listBuckets();
    console.log(`✅ Found ${buckets.length} bucket(s):`);
    buckets.forEach((bucket) => {
      console.log(
        `   - ${bucket.name} (created: ${String(bucket.creationDate)})`,
      );
    });

    // Teste 3: Verificar se o bucket existe
    console.log(`\n🔄 Test 3: Checking if bucket "${bucketName}" exists...`);
    const exists = await minioClient.bucketExists(bucketName);
    if (exists) {
      console.log(`✅ Bucket "${bucketName}" exists`);
    } else {
      console.log(`⚠️  Bucket "${bucketName}" does not exist`);

      // Teste 4: Criar bucket
      console.log(`\n🔄 Test 4: Creating bucket "${bucketName}"...`);
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`✅ Bucket "${bucketName}" created successfully`);
    }

    console.log('\n🎉 All tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error(
      '\n❌ Error:',
      error instanceof Error ? error.message : String(error),
    );
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

debugMinioConnection().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
