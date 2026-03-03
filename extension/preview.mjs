const statusNode = document.querySelector("#status");
const formCard = document.querySelector("#formCard");
const titleInput = document.querySelector("#title");
const contentInput = document.querySelector("#content");
const categorySelect = document.querySelector("#category");
const imageList = document.querySelector("#imageList");
const imageCountNode = document.querySelector("#imageCount");
const sourceInfoNode = document.querySelector("#sourceInfo");
const saveButton = document.querySelector("#saveBtn");
const submitButton = document.querySelector("#submitBtn");
const loginButton = document.querySelector("#loginBtn");
const openOptionsLink = document.querySelector("#openOptionsLink");

let draftState = null;
let platformBaseUrl = "http://localhost:3000";

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

function getRuntimeError() {
  return chrome.runtime?.lastError ? new Error(chrome.runtime.lastError.message) : null;
}

function requestPermissions(origins) {
  return new Promise((resolve, reject) => {
    chrome.permissions.request({ origins }, (granted) => {
      const error = getRuntimeError();
      if (error) {
        reject(error);
        return;
      }

      resolve(Boolean(granted));
    });
  });
}

function toOriginPattern(baseUrl) {
  if (typeof baseUrl !== "string" || !baseUrl.trim()) {
    return "";
  }

  try {
    return `${new URL(baseUrl.trim()).origin}/*`;
  } catch {
    return "";
  }
}

async function ensurePlatformPermissionByGesture() {
  const originPattern = toOriginPattern(platformBaseUrl);

  if (!originPattern) {
    return {
      ok: false,
      error: "平台地址不合法，请先在设置页修正"
    };
  }

  const granted = await requestPermissions([originPattern]);
  if (!granted) {
    return {
      ok: false,
      error: "你拒绝了平台访问授权，请允许后再提交"
    };
  }

  return {
    ok: true
  };
}

function normalizeDraft(draft) {
  return {
    sourcePlatform: draft?.sourcePlatform || "xiaohongshu",
    sourceUrl: draft?.sourceUrl || "",
    title: draft?.title || "",
    content: draft?.content || "",
    category: draft?.category || "同人创作",
    images: Array.isArray(draft?.images)
      ? draft.images.map((item, index) => ({
          url: typeof item?.url === "string" ? item.url : "",
          selected: item?.selected !== false,
          order: typeof item?.order === "number" ? item.order : index
        }))
      : [],
    updatedAt: draft?.updatedAt || new Date().toISOString()
  };
}

function readFormToState() {
  if (!draftState) {
    return;
  }

  draftState.title = titleInput.value.trim();
  draftState.content = contentInput.value.trim();
  draftState.category = categorySelect.value;
}

function renderImages() {
  imageList.innerHTML = "";

  const items = draftState.images
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));

  draftState.images = items;

  items.forEach((image, index) => {
    const row = document.createElement("div");
    row.className = "image-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = image.selected;
    checkbox.addEventListener("change", () => {
      draftState.images[index].selected = checkbox.checked;
      renderImageCount();
    });

    const thumb = document.createElement("img");
    thumb.src = image.url;
    thumb.alt = `image-${index + 1}`;

    const url = document.createElement("div");
    url.className = "url";
    url.textContent = image.url;

    const actions = document.createElement("div");
    actions.className = "actions";

    const upButton = document.createElement("button");
    upButton.type = "button";
    upButton.className = "secondary";
    upButton.textContent = "上移";
    upButton.disabled = index === 0;
    upButton.addEventListener("click", () => {
      const prev = draftState.images[index - 1];
      draftState.images[index - 1] = draftState.images[index];
      draftState.images[index] = prev;
      renderImages();
    });

    const downButton = document.createElement("button");
    downButton.type = "button";
    downButton.className = "secondary";
    downButton.textContent = "下移";
    downButton.disabled = index === draftState.images.length - 1;
    downButton.addEventListener("click", () => {
      const next = draftState.images[index + 1];
      draftState.images[index + 1] = draftState.images[index];
      draftState.images[index] = next;
      renderImages();
    });

    actions.append(upButton, downButton);
    row.append(checkbox, thumb, url, actions);
    imageList.appendChild(row);
  });

  renderImageCount();
}

function renderImageCount() {
  const total = draftState.images.length;
  const selected = draftState.images.filter((item) => item.selected).length;
  imageCountNode.textContent = `已选 ${selected} / ${total}`;
}

function renderForm() {
  titleInput.value = draftState.title;
  contentInput.value = draftState.content;
  categorySelect.value = draftState.category;

  renderImages();

  sourceInfoNode.textContent = draftState.sourceUrl ? `来源：${draftState.sourceUrl}` : "来源：未知";

  formCard.hidden = false;
}

async function saveDraft() {
  readFormToState();
  draftState.updatedAt = new Date().toISOString();

  const result = await sendMessage({
    type: "save-draft",
    draft: draftState
  });

  if (!result?.ok) {
    throw new Error(result?.error || "保存失败");
  }

  setStatus("草稿已保存", "success");
}

async function submitDraft() {
  readFormToState();

  const selectedCount = draftState.images.filter((item) => item.selected).length;
  if (selectedCount === 0) {
    throw new Error("请至少勾选一张图片");
  }

  const permissionResult = await ensurePlatformPermissionByGesture();
  if (!permissionResult.ok) {
    throw new Error(permissionResult.error);
  }

  const result = await sendMessage({
    type: "submit-draft",
    draft: draftState
  });

  if (!result?.ok) {
    if (result?.code === "AUTH_REQUIRED") {
      loginButton.hidden = false;
    }

    throw new Error(result?.error || "提交失败");
  }

  loginButton.hidden = true;
  setStatus(result.id ? `提交成功，ID: ${result.id}` : "提交成功", "success");
}

async function bootstrap() {
  try {
    const [draftResult, settingsResult] = await Promise.all([
      sendMessage({ type: "get-draft" }),
      sendMessage({ type: "get-settings" })
    ]);

    if (settingsResult?.ok && settingsResult?.settings?.platformBaseUrl) {
      platformBaseUrl = settingsResult.settings.platformBaseUrl;
    }

    if (!draftResult?.ok || !draftResult?.draft) {
      setStatus("没有可用草稿，请先在小红书帖子页点击“一键采集”", "error");
      return;
    }

    draftState = normalizeDraft(draftResult.draft);
    renderForm();
    setStatus("请确认内容后提交", "");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "加载草稿失败", "error");
  }
}

saveButton.addEventListener("click", async () => {
  saveButton.disabled = true;

  try {
    await saveDraft();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "保存失败", "error");
  } finally {
    saveButton.disabled = false;
  }
});

submitButton.addEventListener("click", async () => {
  submitButton.disabled = true;

  try {
    await submitDraft();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "提交失败", "error");
  } finally {
    submitButton.disabled = false;
  }
});

loginButton.addEventListener("click", async () => {
  try {
    const permissionResult = await ensurePlatformPermissionByGesture();
    if (!permissionResult.ok) {
      throw new Error(permissionResult.error);
    }

    const result = await sendMessage({ type: "open-login" });
    if (!result?.ok) {
      throw new Error(result?.error || "打开登录页失败");
    }

    setStatus("已打开登录页，登录后请回到本页重试提交", "");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "打开登录页失败", "error");
  }
});

openOptionsLink.addEventListener("click", (event) => {
  event.preventDefault();
  chrome.runtime.openOptionsPage();
});

void bootstrap();
