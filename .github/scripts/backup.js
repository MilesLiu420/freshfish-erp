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
  projectId: 'freshfish-erp'
});

const db = admin.firestore();

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

  // 存到 repo 的 backups 資料夾
  const backupDir = path.join('backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const filePath = path.join(backupDir, `${today}.json`);
  fs.writeFileSync(filePath, JSON.stringify(allData, null, 2), 'utf8');

  console.log(`\n🎉 備份完成！已儲存到 ${filePath}`);
}

backup().catch(err => {
  console.error('❌ 備份失敗：', err);
  process.exit(1);
});
