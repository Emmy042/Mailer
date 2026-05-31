const form = document.querySelector("#campaign-form");
const subjectInput = document.querySelector("#subject");
const recipientsInput = document.querySelector("#recipients");
const fallbackBody = document.querySelector("#body-fallback");
const composeModeButton = document.querySelector("#compose-mode-button");
const templateModeButton = document.querySelector("#template-mode-button");
const templatePanel = document.querySelector("#template-panel");
const templateHtmlInput = document.querySelector("#template-html");
const templateNameInput = document.querySelector("#template-name");
const saveTemplateButton = document.querySelector("#save-template");
const savedTemplatesSelect = document.querySelector("#saved-templates");
const loadTemplateButton = document.querySelector("#load-template");
const deleteTemplateButton = document.querySelector("#delete-template");
const templateStatus = document.querySelector("#template-status");
const subjectCount = document.querySelector("#subject-count");
const subjectError = document.querySelector("#subject-error");
const recipientSummary = document.querySelector("#recipient-summary");
const recipientError = document.querySelector("#recipient-error");
const bodySummary = document.querySelector("#body-summary");
const bodyError = document.querySelector("#body-error");
const recipientCount = document.querySelector("#recipient-count");
const subjectPreview = document.querySelector("#subject-preview");
const htmlSize = document.querySelector("#html-size");
const queueEstimate = document.querySelector("#queue-estimate");
const emailPreview = document.querySelector("#email-preview");
const payloadToggle = document.querySelector("#payload-toggle");
const payloadPanel = document.querySelector("#payload-panel");
const payloadPreview = document.querySelector("#payload-preview");
const submitState = document.querySelector("#submit-state");
const clearButton = document.querySelector("#clear-button");
const copyPayload = document.querySelector("#copy-payload");
const apiEndpoint = "http://127.0.0.1:3000/api/campaigns";
const templateStorageKey = "mailer.savedTemplates";

let quill = null;
let bodyMode = "compose";
let lastPayload = {
  recipients: [],
  subject: "",
  html: ""
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initEditor() {
  if (!window.Quill) {
    document.body.classList.add("editor-fallback");
    return;
  }

  quill = new Quill("#editor", {
    modules: {
      toolbar: "#toolbar"
    },
    placeholder: "Compose the HTML message that will be queued for each recipient.",
    theme: "snow"
  });

  quill.on("text-change", updatePreview);
}

function parseRecipients(value) {
  const entries = value
    .split(/[\s,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const unique = [];
  const duplicates = [];
  const invalid = [];
  const seen = new Set();

  for (const entry of entries) {
    const normalized = entry.toLowerCase();

    if (!emailPattern.test(entry)) {
      invalid.push(entry);
      continue;
    }

    if (seen.has(normalized)) {
      duplicates.push(entry);
      continue;
    }

    seen.add(normalized);
    unique.push(entry);
  }

  return { unique, duplicates, invalid };
}

function getEditorHtml() {
  if (bodyMode === "template") {
    return templateHtmlInput.value.trim();
  }

  if (quill) {
    const html = quill.root.innerHTML.trim();
    return html === "<p><br></p>" ? "" : html;
  }

  const text = fallbackBody.value.trim();
  return text ? `<p>${escapeHtml(text).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>")}</p>` : "";
}

function getEditorText() {
  if (bodyMode === "template") {
    return stripHtml(templateHtmlInput.value).trim();
  }

  if (quill) {
    return quill.getText().trim();
  }

  return fallbackBody.value.trim();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(value) {
  const documentPreview = new DOMParser().parseFromString(value, "text/html");
  return documentPreview.body.textContent || "";
}

function formatBytes(value) {
  if (value < 1024) {
    return `${value} bytes`;
  }

  return `${(value / 1024).toFixed(1)} KB`;
}

function updatePreview() {
  const subject = subjectInput.value.trim();
  const parsedRecipients = parseRecipients(recipientsInput.value);
  const html = getEditorHtml();
  const bodyText = getEditorText();
  const hasBody = bodyMode === "template" ? Boolean(html) : Boolean(bodyText);
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;
  const estimatedMinutes = Math.ceil((parsedRecipients.unique.length * 15) / 60);

  lastPayload = {
    recipients: parsedRecipients.unique,
    subject,
    html
  };

  subjectCount.textContent = `${subjectInput.value.length} / 160`;
  subjectPreview.textContent = subject || "Not set";
  recipientCount.textContent = parsedRecipients.unique.length.toString();
  recipientSummary.textContent = `${parsedRecipients.unique.length} valid recipient${parsedRecipients.unique.length === 1 ? "" : "s"}`;
  bodySummary.textContent = bodyMode === "template" && html && !wordCount
    ? "HTML template"
    : `${wordCount} word${wordCount === 1 ? "" : "s"}`;
  htmlSize.textContent = formatBytes(new Blob([html]).size);
  queueEstimate.textContent = parsedRecipients.unique.length ? `${estimatedMinutes} min at 15 sec/email` : "0 min";
  payloadPreview.textContent = JSON.stringify(lastPayload, null, 2);

  subjectError.textContent = subject ? "" : "Required";
  recipientError.textContent = parsedRecipients.invalid.length
    ? `${parsedRecipients.invalid.length} invalid`
    : parsedRecipients.duplicates.length
      ? `${parsedRecipients.duplicates.length} duplicate ignored`
      : "";
  bodyError.textContent = hasBody ? "" : "Required";

  const previewDoc = isFullHtmlDocument(html) ? html : `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { color: #1d2521; font-family: Arial, sans-serif; line-height: 1.55; margin: 18px; }
          img { height: auto; max-width: 100%; }
          a { color: #176b5b; }
        </style>
      </head>
      <body>${html || "<p>Your formatted email preview will appear here.</p>"}</body>
    </html>
  `;
  emailPreview.srcdoc = previewDoc;

  const isReady = Boolean(subject && parsedRecipients.unique.length && hasBody && !parsedRecipients.invalid.length);
  submitState.classList.toggle("ready", isReady);
  submitState.textContent = isReady
    ? "Campaign payload is ready for the API."
    : "Fill out the campaign fields to prepare a backend-ready payload.";
}

function isFullHtmlDocument(value) {
  return /<!doctype html|<html[\s>]/i.test(value);
}

function resetForm() {
  form.reset();
  if (quill) {
    quill.setContents([]);
  } else {
    fallbackBody.value = "";
  }
  templateHtmlInput.value = "";
  templateNameInput.value = "";
  updatePreview();
}

function setBodyMode(nextMode) {
  bodyMode = nextMode;
  const isTemplateMode = bodyMode === "template";

  document.body.classList.toggle("template-mode", isTemplateMode);
  templatePanel.hidden = !isTemplateMode;
  composeModeButton.classList.toggle("active", !isTemplateMode);
  templateModeButton.classList.toggle("active", isTemplateMode);
  composeModeButton.setAttribute("aria-pressed", String(!isTemplateMode));
  templateModeButton.setAttribute("aria-pressed", String(isTemplateMode));
  updatePreview();
}

function getSavedTemplates() {
  try {
    const stored = JSON.parse(localStorage.getItem(templateStorageKey) || "[]");
    return Array.isArray(stored) ? stored.filter(isValidTemplate) : [];
  } catch {
    return [];
  }
}

function isValidTemplate(template) {
  return template
    && typeof template.id === "string"
    && typeof template.name === "string"
    && typeof template.html === "string";
}

function saveTemplates(templates) {
  localStorage.setItem(templateStorageKey, JSON.stringify(templates));
}

function renderSavedTemplates(selectedId = "") {
  const templates = getSavedTemplates();
  savedTemplatesSelect.innerHTML = "";

  if (!templates.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No saved templates";
    savedTemplatesSelect.append(option);
    savedTemplatesSelect.disabled = true;
    loadTemplateButton.disabled = true;
    deleteTemplateButton.disabled = true;
    return;
  }

  for (const template of templates) {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name;
    savedTemplatesSelect.append(option);
  }

  savedTemplatesSelect.disabled = false;
  loadTemplateButton.disabled = false;
  deleteTemplateButton.disabled = false;
  savedTemplatesSelect.value = selectedId || templates[0].id;
}

function saveCurrentTemplate() {
  const html = templateHtmlInput.value.trim();
  const name = templateNameInput.value.trim();

  if (!html || !name) {
    templateStatus.textContent = "Add a template name and HTML before saving.";
    templateStatus.classList.add("error");
    return;
  }

  const templates = getSavedTemplates();
  const existing = templates.find((template) => template.name.toLowerCase() === name.toLowerCase());
  const savedTemplate = {
    id: existing?.id || `template_${Date.now()}`,
    name,
    html,
    updatedAt: new Date().toISOString()
  };
  const nextTemplates = existing
    ? templates.map((template) => template.id === existing.id ? savedTemplate : template)
    : [...templates, savedTemplate];

  saveTemplates(nextTemplates);
  renderSavedTemplates(savedTemplate.id);
  templateStatus.textContent = "Template saved.";
  templateStatus.classList.remove("error");
  window.setTimeout(() => {
    if (templateStatus.textContent === "Template saved.") {
      templateStatus.textContent = "";
    }
  }, 1600);
}

function loadSelectedTemplate() {
  const selected = getSavedTemplates().find((template) => template.id === savedTemplatesSelect.value);

  if (!selected) {
    return;
  }

  templateNameInput.value = selected.name;
  templateHtmlInput.value = selected.html;
  setBodyMode("template");
  templateStatus.textContent = `Loaded "${selected.name}".`;
  templateStatus.classList.remove("error");
}

function deleteSelectedTemplate() {
  const selectedId = savedTemplatesSelect.value;

  if (!selectedId) {
    return;
  }

  const remaining = getSavedTemplates().filter((template) => template.id !== selectedId);
  saveTemplates(remaining);
  renderSavedTemplates();
  templateStatus.textContent = "Template deleted.";
  templateStatus.classList.remove("error");
}

function togglePayloadPanel() {
  const isExpanded = payloadToggle.getAttribute("aria-expanded") === "true";
  const nextExpanded = !isExpanded;

  payloadToggle.setAttribute("aria-expanded", String(nextExpanded));
  payloadPanel.hidden = !nextExpanded;
}

async function copyPayloadToClipboard() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(lastPayload, null, 2));
    copyPayload.textContent = "Copied";
    window.setTimeout(() => {
      copyPayload.textContent = "Copy";
    }, 1400);
  } catch {
    copyPayload.textContent = "Unable";
    window.setTimeout(() => {
      copyPayload.textContent = "Copy";
    }, 1400);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  updatePreview();

  const invalid = !lastPayload.subject || !lastPayload.recipients.length || !lastPayload.html;
  if (invalid) {
    submitState.textContent = "Add a subject, at least one valid recipient, and an email body before continuing.";
    submitState.classList.remove("ready");
    return;
  }

  submitCampaign();
});

async function submitCampaign() {
  submitState.textContent = "Sending payload to API...";
  submitState.classList.add("ready");

  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(lastPayload)
    });
    const data = await response.json();

    if (!response.ok) {
      const errors = Array.isArray(data.errors) ? data.errors.join(" ") : "API rejected the campaign.";
      submitState.textContent = errors;
      submitState.classList.remove("ready");
      return;
    }

    submitState.textContent = `Accepted by API. Campaign ${data.campaign.id} has ${data.campaign.recipientCount} recipient${data.campaign.recipientCount === 1 ? "" : "s"}.`;
  } catch {
    submitState.textContent = "API is not running yet. Start Phase 2 server, then submit again.";
    submitState.classList.remove("ready");
  }
}

subjectInput.addEventListener("input", updatePreview);
recipientsInput.addEventListener("input", updatePreview);
fallbackBody.addEventListener("input", updatePreview);
templateHtmlInput.addEventListener("input", updatePreview);
composeModeButton.addEventListener("click", () => setBodyMode("compose"));
templateModeButton.addEventListener("click", () => setBodyMode("template"));
saveTemplateButton.addEventListener("click", saveCurrentTemplate);
loadTemplateButton.addEventListener("click", loadSelectedTemplate);
deleteTemplateButton.addEventListener("click", deleteSelectedTemplate);
clearButton.addEventListener("click", resetForm);
payloadToggle.addEventListener("click", togglePayloadPanel);
copyPayload.addEventListener("click", copyPayloadToClipboard);

initEditor();
renderSavedTemplates();
updatePreview();
