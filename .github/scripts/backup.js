const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  console.error('❌ 找不到 FIREBASE_SERVICE_ACCOUNT 環境變數');
  process.exit(1);
}

const serviceAccount = JSON.parse(raw);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'freshfish-erp.firebasestorage.app'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const COLLECTIONS = [
  'purchases', 'sales', 'products', 'customers',
  'suppliers', 'warehouses', 'categories', 'transfers'
];

async function backup() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`📦 開始備份 ${today}...`);

  const allData = {};
  for (const col of COLLECTIONS) {
    const snapshot = await db.collection(col).get();
    const data = {};
    snapshot.forEach(doc => { data[doc.id] = doc.data(); });
    allData[col] = data;
    console.log(`✅ ${col}：${Object.keys(data).length} 筆`);
  }

  // 上傳到 Firebase Storage
  const fileName = `backups/${today}.json`;
  const tmpFile = '/tmp/backup.json';
  fs.writeFileSync(tmpFile, JSON.stringify(allData, null, 2), 'utf8');

  await bucket.upload(tmpFile, {
    destination: fileName,
    metadata: { contentType: 'application/json' }
  });

  console.log(`\n🎉 備份完成！已上傳到 Firebase Storage：${fileName}`);
}

backup().catch(err => {
  console.error('❌ 備份失敗：', err);
  process.exit(1);
});
