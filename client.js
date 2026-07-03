const clientToken = decodeURIComponent(window.location.pathname.replace(/^\/studio\//, ""));
const studio = document.querySelector("#clientStudio");
const loadError = document.querySelector("#clientLoadError");
let clientState = null;
const templateCategoryOrder = ["Wedding", "Baptism", "First Communion", "Engagement", "Birthday", "Business", "Other Celebrations", "Custom Design"];
const eventTypeByCategory = { Wedding: "Wedding Celebration", Baptism: "Baptism", "First Communion": "First Communion", Engagement: "Engagement", Birthday: "Birthday", Business: "Corporate Event", "Other Celebrations": "Other Celebration" };
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
    titleAr: document.querySelector("#clientTitleAr").value,
    dateAr: document.querySelector("#clientDateAr").value,
    venueAr: document.querySelector("#clientVenueAr").value,
    hostNamesAr: document.querySelector("#clientHostNamesAr").value,
    messageAr: document.querySelector("#clientMessageAr").value,
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
    document.querySelector("#clientTitleAr").value = invitation.titleAr || invitation.title || "";
    document.querySelector("#clientDateAr").value = invitation.dateAr || invitation.date || "";
    document.querySelector("#clientVenueAr").value = invitation.venueAr || invitation.venue || "";
    document.querySelector("#clientHostNamesAr").value = invitation.hostNamesAr || "";
    document.querySelector("#clientMessageAr").value = invitation.messageAr || "";
    document.querySelector("#clientCustomBrief").value = invitation.customBrief || "";
  }

  const rsvpToggle = document.querySelector("#clientShowRsvp");
  rsvpToggle.checked = invitation.showRsvp !== false;
  rsvpToggle.disabled = !paid;
  document.querySelector("#customBriefField").hidden = invitation.templateId !== "custom-atelier";
  const bilingual = invitation.language === "Bilingual";
  document.querySelector("#clientArabicFields").hidden = !bilingual;
  document.querySelector("#clientLanguageNotice").hidden = !bilingual;
  const publishButton = document.querySelector("#clientPublish");
  publishButton.disabled = !paid;
  publishButton.textContent = invitation.status === "published" ? "Republish Changes" : "Publish Invitation";
  document.querySelector("#clientAccessNote").textContent = paid
    ? "Your invitation is unlocked and ready to publish."
    : status === "submitted"
      ? "Payment is under review. This page updates automatically after Tony approves it."
      : "Publishing unlocks after Tony approves your payment.";
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

  renderPaymentPanel();
  renderRsvpDashboard();
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
        <div><span>${escapeHtml(template.category)} · ${escapeHtml(template.tier)} · ${escapeHtml(template.experience || "Image")}</span><strong>${escapeHtml(template.name)}</strong></div>
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
    message.textContent = `Payment submitted by ${payment.method === "bank" ? "bank transfer" : "Whish"}. Tony will verify reference ${payment.reference}. Checking automatically...`;
  } else if (payment.status === "rejected") {
    message.textContent = "The payment could not be verified. Check the reference and submit again.";
  } else {
    message.textContent = "";
  }
}

function renderRsvpDashboard() {
  const dashboard = document.querySelector("#clientRsvpDashboard");
  const paid = Boolean(clientState?.invitation?.paid);
  dashboard.hidden = !paid;
  if (!paid) return;

  const rsvps = clientState.rsvps || [];
  const query = document.querySelector("#rsvpSearch").value.trim().toLowerCase();
  const visible = rsvps.filter((rsvp) => `${rsvp.name} ${rsvp.phone || ""}`.toLowerCase().includes(query));
  document.querySelector("#rsvpResponseCount").textContent = rsvps.length;
  document.querySelector("#rsvpAttendingCount").textContent = rsvps
    .filter((rsvp) => rsvp.status === "attending")
    .reduce((total, rsvp) => total + Number(rsvp.count || 0), 0);
  document.querySelector("#rsvpDeclinedCount").textContent = rsvps.filter((rsvp) => rsvp.status === "not-attending").length;
  document.querySelector("#clientRsvpList").innerHTML = visible.length ? visible.map((rsvp) => `
    <article class="client-rsvp-row">
      <div><strong>${escapeHtml(rsvp.name)}</strong><span>${escapeHtml(rsvp.phone || "No phone provided")}</span></div>
      <span class="rsvp-status ${rsvp.status === "attending" ? "attending" : "declined"}">${rsvp.status === "attending" ? "Attending" : "Declined"}</span>
      <b>${rsvp.status === "attending" ? `${Number(rsvp.count || 0)} guest${Number(rsvp.count || 0) === 1 ? "" : "s"}` : "-"}</b>
      <time>${new Date(rsvp.createdAt).toLocaleString()}</time>
    </article>
  `).join("") : `<div class="rsvp-empty">${query ? "No guests match your search." : "No responses yet. Guest replies will appear here after you publish."}</div>`;
}

async function refreshClientData({ announce = false } = {}) {
  const latest = await clientApi(apiPath());
  const previousStatus = clientState ? paymentStatus(clientState.invitation) : "";
  clientState = latest;
  if (announce || paymentStatus(latest.invitation) !== previousStatus) renderClientState({ preserveFields: true });
  else renderRsvpDashboard();
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

document.querySelector("#clientPreviewLink").addEventListener("click", async () => {
  const saved = await saveClientDetails("Details saved. Opening preview...");
  if (saved) window.location.href = clientState.invitation.previewUrl;
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
document.querySelector("#refreshRsvps").addEventListener("click", async () => {
  try {
    await refreshClientData({ announce: true });
  } catch {}
});
document.querySelector("#rsvpSearch").addEventListener("input", renderRsvpDashboard);

loadClientStudio();

setInterval(async () => {
  if (!clientState || (paymentStatus(clientState.invitation) !== "submitted" && !clientState.invitation.paid)) return;
  try {
    await refreshClientData();
  } catch {}
}, 10000);
