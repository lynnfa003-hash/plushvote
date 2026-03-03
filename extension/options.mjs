const platformInput = document.querySelector("#platformBaseUrl");
const saveButton = document.querySelector("#saveBtn");
const statusNode = document.querySelector("#status");

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

function setStatus(text, variant = "") {
  statusNode.textContent = text;
  statusNode.className = `status ${variant}`.trim();
}

async function bootstrap() {
  try {
    const result = await sendMessage({ type: "get-settings" });

    if (!result?.ok) {
      setStatus(result?.error || "加载设置失败", "error");
      return;
    }

    platformInput.value = result.settings.platformBaseUrl || "http://localhost:3000";
    setStatus("设置已加载", "");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "加载设置失败", "error");
  }
}

saveButton.addEventListener("click", async () => {
  const value = platformInput.value.trim();

  if (!value) {
    setStatus("请输入平台地址", "error");
    return;
  }

  saveButton.disabled = true;

  try {
    const result = await sendMessage({
      type: "save-settings",
      settings: {
        platformBaseUrl: value
      }
    });

    if (!result?.ok) {
      setStatus(result?.error || "保存失败", "error");
      return;
    }

    platformInput.value = result.settings.platformBaseUrl;
    setStatus("设置已保存", "success");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "保存失败", "error");
  } finally {
    saveButton.disabled = false;
  }
});

void bootstrap();
