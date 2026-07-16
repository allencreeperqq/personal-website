// 本機小工具：把 admin 密碼轉成 PBKDF2 hash，之後只需要把輸出的字串貼給
// `wrangler secret put ADMIN_PASSWORD_HASH`，密碼明文不會離開這台電腦。
//
// 用法：node scripts/hash-password.mjs
import { createInterface } from "node:readline";
import { pbkdf2Sync, randomBytes } from "node:crypto";

const ITERATIONS = 100000;

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const lineIterator = rl[Symbol.asyncIterator]();

  let masking = false;
  const originalWrite = rl._writeToOutput?.bind(rl);
  if (originalWrite) {
    rl._writeToOutput = (str) => {
      if (!masking || str.includes("\n") || str.includes("\r")) {
        originalWrite(str);
      } else {
        originalWrite("*".repeat(str.length));
      }
    };
  }

  async function askHidden(promptText) {
    process.stdout.write(promptText);
    masking = true;
    const { value } = await lineIterator.next();
    masking = false;
    process.stdout.write("\n");
    return value ?? "";
  }

  const password = await askHidden("請輸入 admin 密碼（輸入不會顯示明文）：");
  const confirm = await askHidden("再輸入一次確認：");
  rl.close();

  if (!password) {
    console.error("密碼不能為空。");
    process.exitCode = 1;
    return;
  }

  if (password !== confirm) {
    console.error("兩次輸入的密碼不一致，請重新執行。");
    process.exitCode = 1;
    return;
  }

  const salt = randomBytes(16);
  const derived = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
  const hash = `pbkdf2$${ITERATIONS}$${salt.toString("hex")}$${derived.toString("hex")}`;

  console.log("\n產生完成，請把下面這一整行貼給 `wrangler secret put ADMIN_PASSWORD_HASH`：\n");
  console.log(hash);
  console.log("\n（這只是密碼的 hash，看不出原始密碼；不要把它跟明文密碼一起分享出去。）");
}

main();
