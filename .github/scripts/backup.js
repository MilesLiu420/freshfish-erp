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
  console.log(`✅ 備份儲存到 ${filePath}`);

  // 只保留最近 3 天，刪除更舊的備份
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse(); // 由新到舊排列

  const toDelete = files.slice(3); // 保留前3個，刪除其餘
  for (const f of toDelete) {
    fs.unlinkSync(path.join(backupDir, f));
    console.log(`🗑️ 刪除舊備份：${f}`);
  }

  console.log(`\n🎉 備份完成！目前保留最近 ${Math.min(files.length, 3)} 天的備份。`);
}

backup().catch(err => {
  console.error('❌ 備份失敗：', err);
  process.exit(1);
});
