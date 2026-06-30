const clientToken = decodeURIComponent(window.location.pathname.replace(/^\/studio\//, ""));
const studio = document.querySelector("#clientStudio");
const loadError = document.querySelector("#clientLoadError");
let clientState = null;
const templateCategoryOrder = ["Wedding", "Baptism", "First Communion", "Engagement", "Birthday", "Business", "Other Celebrations", "Custom Design"];
let activeTemplateFilter = "";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

async function clientApi(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}

function apiPath(suffix = "") {
  return `/api/client/invitations/${encodeURIComponent(clientToken)}${suffix}`;
}

function clientEditorPayload() {
  return {
    title: document.querySelector("#clientTitle").value,
    eventType: document.querySelector("#clientEventType").value,
    date: document.querySelector("#clientDate").value,
    venue: document.querySelector("#clientVenue").value,
    mapUrl: document.querySelector("#clientMapUrl").value,
    rsvpDeadline: document.querySelector("#clientRsvpDeadline").value,
    hostNames: document.querySelector("#clientHostNames").value,
    message: document.querySelector("#clientMessage").value,
    customBrief: document.querySelector("#clientCustomBrief").value,
    showRsvp: document.querySelector("#clientShowRsvp").checked,
    templateId: clientState.invitation.templateId
  };
}

async function saveClientDetails(message = "Changes saved.") {
  const status = document.querySelector("#clientEditorMessage");
  status.textContent = "Saving...";
  try {
    const result = await clientApi(apiPath(), {
      method: "PUT",
      body: JSON.stringify(clientEditorPayload())
    });
    clientState.invitation = result.invitation;
    renderClientState({ preserveFields: true });
    status.textContent = message;
    return true;
  } catch (error) {
    status.textContent = error.message;
    return false;
  }
}

function paymentStatus(invitation) {
  return invitation.payment?.status || "unpaid";
}

function renderClientState({ preserveFields = false } = {}) {
  const invitation = clientState.invitation;
  const paid = invitation.paid;
  const status = paymentStatus(invitation);

  document.querySelector("#clientStudioTitle").textContent = invitation.title;
  document.querySelector("#clientPackageName").textContent = invitation.packageName;
  document.querySelector("#clientPackagePrice").textContent = `${invitation.packagePrice} ${invitation.packageCurrency}`;
  const badge = document.querySelector("#clientAccessBadge");
  badge.textContent = paid ? "Full access" : status === "submitted" ? "Payment review" : "Preview access";
  badge.classList.toggle("paid", paid);

  if (!preserveFields) {
    document.querySelector("#clientTitle").value = invitation.title || "";
    document.querySelector("#clientEventType").value = invitation.eventType || "";
    document.querySelector("#clientDate").value = invitation.date || "";
    document.querySelector("#clientVenue").value = invitation.venue || "";
    document.querySelector("#clientMapUrl").value = invitation.mapUrl || "";
    document.querySelector("#clientRsvpDeadline").value = invitation.rsvpDeadline || "";
    document.querySelector("#clientHostNames").value = invitation.hostNames || "";
    document.querySelector("#clientMessage").value = invitation.message || "";
    document.querySelector("#clientCustomBrief").value = invitation.customBrief || "";
  }

  const rsvpToggle = document.querySelector("#clientShowRsvp");
  rsvpToggle.checked = invitation.showRsvp !== false;
  rsvpToggle.disabled = !paid;
  document.querySelector("#customBriefField").hidden = invitation.templateId !== "custom-atelier";
  document.querySelector("#clientPreviewLink").href = invitation.previewUrl;
  const publishButton = document.querySelector("#clientPublish");
  publishButton.disabled = !paid;
  publishButton.textContent = invitation.status === "published" ? "Republish Changes" : "Publish Invitation";
  const liveLink = document.querySelector("#clientLiveLink");
  const qr = document.querySelector("#clientQr");
  liveLink.hidden = !invitation.publicUrl;
  qr.hidden = !invitation.publicUrl;
  if (invitation.publicUrl) {
    liveLink.href = invitation.publicUrl;
    liveLink.textContent = invitation.publicUrl;
    const liveUrl = `${window.location.origin}${invitation.publicUrl}`;
    document.querySelector("#clientQrImage").src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(liveUrl)}`;
  }

  renderTemplateCatalog();
  renderPaymentPanel();
}

function templateSample(template) {
  const samples = {
    Wedding: { kicker: "Together with their families", name: "M & K", date: "18 · 07 · 2026" },
    Engagement: { kicker: "Engagement celebration", name: "M & K", date: "18 · 07 · 2026" },
    Baptism: { kicker: "The Holy Baptism of", name: "Elias", date: "14 · 06 · 2026" },
    "First Communion": { kicker: "First Holy Communion", name: "Maria", date: "24 · 05 · 2026" },
    Birthday: { kicker: "Come celebrate", name: "Nour", date: "12 · 09 · 2026" },
    Business: { kicker: "You are invited", name: "Studio Launch", date: "03 · 10 · 2026" },
    "Other Celebrations": { kicker: "A special celebration", name: "Class of 2026", date: "27 · 06 · 2026" },
    "Custom Design": { kicker: "Created for you", name: "Your Story", date: "Your date" }
  };
  return samples[template.category] || samples["Custom Design"];
}

function templateMiniature(template) {
  const sample = templateSample(template);
  return `<div class="template-miniature ${template.image ? "has-cover" : ""} invite-template-${escapeHtml(template.id)} invite-layout-${escapeHtml(template.layout)}" style="--template-accent:${escapeHtml(template.accent)};--template-canvas:${escapeHtml(template.canvas)};--template-paper:${escapeHtml(template.paper)};--template-image:url('${escapeHtml(template.image || "")}')">
    <span class="mini-kicker">${escapeHtml(sample.kicker)}</span><strong>${escapeHtml(sample.name)}</strong><span class="mini-rule"></span><small>${escapeHtml(sample.date)}</small>
  </div>`;
}

function renderTemplateCatalog() {
  const templates = clientState.templates || [];
  const invitation = clientState.invitation;
  const selectionLocked = invitation.paid || paymentStatus(invitation) === "submitted";
  const selectedTemplate = templates.find((template) => template.id === invitation.templateId);
  const categories = templateCategoryOrder.filter((category) => templates.some((template) => template.category === category));
  if (!activeTemplateFilter || !categories.includes(activeTemplateFilter)) {
    activeTemplateFilter = selectedTemplate?.category || categories[0];
  }
  document.querySelector("#clientTemplateFilter").innerHTML = categories.map((category) => `
    <button type="button" class="template-filter-button ${category === activeTemplateFilter ? "active" : ""}" data-template-filter="${escapeHtml(category)}">${escapeHtml(category)} <span>${templates.filter((template) => template.category === category).length}</span></button>
  `).join("");
  const visible = templates.filter((template) => template.category === activeTemplateFilter);
  document.querySelector("#clientTemplateGrid").innerHTML = visible.map((template) => {
    const selected = template.id === invitation.templateId;
    return `<article class="client-template-card ${selected ? "selected" : ""} ${template.custom ? "custom" : ""}">
      ${templateMiniature(template)}
      <div class="client-template-meta">
        <div><span>${escapeHtml(template.category)} · ${escapeHtml(template.tier)}</span><strong>${escapeHtml(template.name)}</strong></div>
        <b>$${template.price}</b>
      </div>
      <p>${escapeHtml(template.description)}</p>
      <button class="button ${selected ? "primary" : "outline"} full" type="button" data-select-template="${escapeHtml(template.id)}" ${selected || selectionLocked ? "disabled" : ""}>${selected ? "Selected" : selectionLocked ? "Selection locked" : "Choose template"}</button>
    </article>`;
  }).join("");
  document.querySelector("#selectedTemplateSummary").textContent = selectedTemplate ? `${selectedTemplate.name} · $${selectedTemplate.price}` : "";
}

function renderPaymentPanel() {
  const invitation = clientState.invitation;
  const payment = invitation.payment || { status: "unpaid" };
  const panel = document.querySelector("#clientPaymentPanel");
  panel.hidden = invitation.paid;
  if (invitation.paid) return;
  const config = clientState.paymentConfig || {};
  const whatsappLink = `https://wa.me/${String(config.whatsappNumber || "").replace(/\D/g, "")}`;
  document.querySelector("#paymentMethods").innerHTML = `
    <div><strong>Whish Money</strong><span>${escapeHtml(config.whishNumber || "Contact Tony for the Whish recipient")}</span></div>
    <div><strong>Bank transfer</strong><span>${escapeHtml(config.bankDetails || "Contact Tony for bank details")}</span></div>
    <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer">Get payment details on WhatsApp</a>
  `;
  const form = document.querySelector("#paymentClaimForm");
  const message = document.querySelector("#paymentMessage");
  form.hidden = payment.status === "submitted";
  if (payment.status === "submitted") {
    message.textContent = `Payment submitted by ${payment.method === "bank" ? "bank transfer" : "Whish"}. Tony will verify reference ${payment.reference}.`;
  } else if (payment.status === "rejected") {
    message.textContent = "The payment could not be verified. Check the reference and submit again.";
  } else {
    message.textContent = "";
  }
}

async function loadClientStudio() {
  try {
    clientState = await clientApi(apiPath());
    studio.hidden = false;
    loadError.hidden = true;
    renderClientState();
  } catch {
    studio.hidden = true;
    loadError.hidden = false;
  }
}

document.querySelector("#clientEditorForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveClientDetails();
});

document.querySelector("#clientTemplateFilter").addEventListener("click", (event) => {
  const button = event.target.closest("[data-template-filter]");
  if (!button) return;
  activeTemplateFilter = button.dataset.templateFilter;
  renderTemplateCatalog();
});

document.querySelector("#clientTemplateGrid").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-select-template]");
  if (!button || clientState.invitation.paid || paymentStatus(clientState.invitation) === "submitted") return;
  const message = document.querySelector("#clientTemplateMessage");
  message.textContent = "Applying template...";
  try {
    const result = await clientApi(apiPath(), {
      method: "PUT",
      body: JSON.stringify({ ...clientEditorPayload(), templateId: button.dataset.selectTemplate })
    });
    clientState.invitation = result.invitation;
    renderClientState({ preserveFields: true });
    message.textContent = "Template selected. Open the preview to see the complete design.";
  } catch (error) {
    message.textContent = error.message;
  }
});

document.querySelector("#paymentClaimForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.querySelector("#paymentMessage");
  message.textContent = "Submitting payment reference...";
  try {
    const result = await clientApi(apiPath("/payment-claim"), {
      method: "POST",
      body: JSON.stringify({
        method: document.querySelector("#paymentMethod").value,
        reference: document.querySelector("#paymentReference").value
      })
    });
    clientState.invitation = result.invitation;
    renderClientState({ preserveFields: true });
  } catch (error) {
    message.textContent = error.message;
  }
});

document.querySelector("#clientPublish").addEventListener("click", async () => {
  const message = document.querySelector("#clientPublishMessage");
  if (!(await saveClientDetails("Details saved."))) return;
  message.textContent = "Publishing invitation...";
  try {
    const result = await clientApi(apiPath("/publish"), { method: "POST", body: "{}" });
    clientState.invitation = result.invitation;
    renderClientState({ preserveFields: true });
    message.textContent = "Invitation published. Your guest link is ready.";
  } catch (error) {
    message.textContent = error.message;
  }
});

document.querySelector("#refreshClient").addEventListener("click", loadClientStudio);

loadClientStudio();
