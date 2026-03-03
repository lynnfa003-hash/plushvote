function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

const pageInfoNode = document.querySelector("#pageInfo");
const platformInfoNode = document.querySelector("#platformInfo");
const collectButton = document.querySelector("#collectBtn");
const openOptionsButton = document.querySelector("#openOptionsBtn");

function setStatus(text, variant = "") {
  pageInfoNode.textContent = text;
  pageInfoNode.className = `status ${variant}`.trim();
}

async function bootstrap() {
  try {
    const result = await sendMessage({ type: "inspect-active-tab" });

    if (!result?.ok) {
      setStatus(result?.error || "读取页面信息失败", "error");
      collectButton.disabled = true;
      return;
    }

    const platformBaseUrl = result?.settings?.platformBaseUrl || "http://localhost:3000";
    platformInfoNode.textContent = `提交目标：${platformBaseUrl}`;

    if (result.supported) {
      setStatus(`已识别为${result.platformLabel}可采集页面`, "success");
      collectButton.disabled = false;
    } else {
      setStatus("当前页面不支持采集（仅支持小红书帖子页）", "error");
      collectButton.disabled = true;
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "初始化失败", "error");
    collectButton.disabled = true;
  }
}

collectButton.addEventListener("click", async () => {
  collectButton.disabled = true;
  setStatus("正在采集并打开预览...", "");

  try {
    const result = await sendMessage({ type: "collect-current-page" });
    if (!result?.ok) {
      setStatus(result?.error || "采集失败", "error");
      collectButton.disabled = false;
      return;
    }

    setStatus("采集完成，已打开预览页面", "success");
    window.close();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "采集失败", "error");
    collectButton.disabled = false;
  }
});

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

void bootstrap();
