// ===== TOTP生成 =====
function generateTOTP(secret) {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    digits: 6,
    period: 30,
    algorithm: "SHA1",
  });
  return totp.generate();
}

function getTimeRemaining() {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

// ===== 重複チェック =====
async function isDuplicate(secret) {
  const accounts = await getAllAccounts();
  return accounts.some((acc) => acc.secret === secret);
}

// ===== 追加 =====
async function addAccount() {
  const name = document.getElementById("name").value;
  const issuer = document.getElementById("issuer").value;
  const secret = document.getElementById("secret").value;

  if (!name || !secret) return;

  if (await isDuplicate(secret)) {
    alert("同じシークレットは既に登録されています");
    return;
  }

  await addAccountDB({ name, issuer, secret });

  document.getElementById("name").value = "";
  document.getElementById("issuer").value = "";
  document.getElementById("secret").value = "";

  render();
}

// ===== 描画 =====
async function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const accounts = await getAllAccounts();
  const remain = getTimeRemaining();
  const percent = (remain / 30) * 100;

  accounts.forEach((acc) => {
    const code = generateTOTP(acc.secret);

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <div class="row">
        <div class="name">${acc.issuer || ""} ${acc.name}</div>
        <button class="delete" onclick="removeAccount(${acc.id})">削除</button>
      </div>

      <div class="code" onclick="copy('${code}')">${code}</div>

      <div class="bar">
        <div class="fill" style="width:${percent}%"></div>
      </div>
    `;

    list.appendChild(div);
  });
}

async function removeAccount(id) {
  await deleteAccount(id);
  render();
}

function copy(text) {
  navigator.clipboard.writeText(text);
}

// ===== エクスポート =====
async function exportData() {
  const accounts = await getAllAccounts();

  const lines = accounts.map((acc) => {
    const issuer = encodeURIComponent(acc.issuer || "Unknown");
    const name = encodeURIComponent(acc.name);
    return `otpauth://totp/${issuer}:${name}?secret=${acc.secret}&issuer=${issuer}`;
  });

  const text = lines.join("\n");
  document.getElementById("backup").value = text;
  navigator.clipboard.writeText(text);
}

// ===== インポート =====
async function importData() {
  const text = document.getElementById("backup").value;
  if (!text) return;

  const lines = text.split("\n");

  for (const line of lines) {
    try {
      const url = new URL(line.trim());
      if (url.protocol !== "otpauth:") continue;

      const path = decodeURIComponent(url.pathname.slice(1));
      const [issuerFromPath, name] = path.split(":");

      const secret = url.searchParams.get("secret");
      const issuer = url.searchParams.get("issuer") || issuerFromPath;

      if (!secret || !name) continue;
      if (await isDuplicate(secret)) continue;

      await addAccountDB({ name, issuer, secret });
    } catch {}
  }

  render();
}

// 更新ループ
setInterval(render, 1000);

// 初期描画
render();
