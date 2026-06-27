const clientToken = decodeURIComponent(window.location.pathname.replace(/^\/studio\//, ""));
const studio = document.querySelector("#clientStudio");
const loadError = document.querySelector("#clientLoadError");
let clientState = null;

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
    theme: document.querySelector("#clientTheme").value,
    message: document.querySelector("#clientMessage").value,
    showRsvp: document.querySelector("#clientShowRsvp").checked,
    coverDirection: document.querySelector("#clientCoverPrompt").value,
    musicDirection: document.querySelector("#clientMusicPrompt").value
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
  const config = clientState.generationConfig || {};
  const paid = invitation.paid;
  const status = paymentStatus(invitation);
  const usage = invitation.generationUsage || { covers: 0, music: 0 };
  const coverLimit = paid ? (config.maxCoverGenerations || 6) : 1;
  const coverRemaining = Math.max(0, coverLimit - (usage.covers || 0));
  const musicRemaining = Math.max(0, (config.maxMusicGenerations || 3) - (usage.music || 0));

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
    document.querySelector("#clientTheme").value = invitation.theme || "ivory";
    document.querySelector("#clientMessage").value = invitation.message || "";
    document.querySelector("#clientCoverPrompt").value = invitation.coverDirection || invitation.generatedCovers?.[0]?.prompt || "Elegant floral celebration with warm light and refined details";
    document.querySelector("#clientMusicPrompt").value = invitation.musicDirection || invitation.generatedTracks?.[0]?.prompt || "Warm instrumental with piano, strings, and subtle Lebanese acoustic textures";
  }

  const rsvpToggle = document.querySelector("#clientShowRsvp");
  rsvpToggle.checked = invitation.showRsvp !== false;
  rsvpToggle.disabled = !paid;
  const quality = document.querySelector("#clientCoverQuality");
  quality.disabled = !paid;
  if (!paid) quality.value = "low";

  const coverButton = document.querySelector("#clientGenerateCover");
  coverButton.disabled = !config.coverEnabled || coverRemaining === 0;
  coverButton.textContent = paid ? "Generate Cover" : "Generate Free Preview";
  document.querySelector("#clientCoverState").textContent = config.coverEnabled
    ? `${coverRemaining} generation${coverRemaining === 1 ? "" : "s"} left`
    : "Temporarily unavailable";

  const musicButton = document.querySelector("#clientGenerateMusic");
  musicButton.disabled = !paid || !config.musicEnabled || musicRemaining === 0;
  document.querySelector("#clientMusicState").textContent = !paid
    ? "Unlock after purchase"
    : config.musicEnabled ? `${musicRemaining} generation${musicRemaining === 1 ? "" : "s"} left` : "Temporarily unavailable";

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

  renderClientAssets();
  renderPaymentPanel();
}

function renderClientAssets() {
  const invitation = clientState.invitation;
  document.querySelector("#clientCoverList").innerHTML = (invitation.generatedCovers || []).map((asset, index) => `
    <article class="generated-cover ${index === 0 ? "selected" : ""}">
      <img src="${escapeHtml(asset.url)}" alt="Generated invitation cover option" />
      <span class="generated-asset-label">${asset.preview ? "Preview" : index === 0 ? "Selected" : "Cover"}</span>
    </article>
  `).join("") || `<p class="generator-empty">No cover generated yet.</p>`;

  document.querySelector("#clientTrackList").innerHTML = (invitation.generatedTracks || []).map((asset, index) => `
    <article class="generated-track ${index === 0 ? "selected" : ""}">
      <audio controls preload="none" src="${escapeHtml(asset.url)}"></audio>
      <span>${index === 0 ? "Selected" : "Soundtrack"}</span>
    </article>
  `).join("") || `<p class="generator-empty">Soundtrack unlocks after purchase.</p>`;
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

async function generateClientAsset(kind) {
  const isCover = kind === "cover";
  const message = document.querySelector(isCover ? "#clientCoverMessage" : "#clientMusicMessage");
  const button = document.querySelector(isCover ? "#clientGenerateCover" : "#clientGenerateMusic");
  const prompt = document.querySelector(isCover ? "#clientCoverPrompt" : "#clientMusicPrompt").value.trim();
  if (prompt.length < 10) {
    message.textContent = "Add a little more creative direction.";
    return;
  }
  if (!(await saveClientDetails("Details saved."))) return;
  button.disabled = true;
  button.textContent = isCover ? "Generating..." : "Composing...";
  message.textContent = isCover ? "Creating your invitation artwork..." : "Composing your original soundtrack...";
  try {
    const payload = isCover
      ? { prompt, quality: document.querySelector("#clientCoverQuality").value }
      : { prompt, durationSeconds: Number(document.querySelector("#clientMusicDuration").value) };
    const result = await clientApi(apiPath(isCover ? "/generate-cover" : "/generate-music"), {
      method: "POST",
      body: JSON.stringify(payload)
    });
    clientState.invitation = result.invitation;
    renderClientState({ preserveFields: true });
    message.textContent = `${isCover ? "Cover" : "Soundtrack"} generated. ${result.remaining} generation${result.remaining === 1 ? "" : "s"} left.`;
  } catch (error) {
    message.textContent = error.message;
    renderClientState({ preserveFields: true });
  }
}

document.querySelector("#clientEditorForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveClientDetails();
});

document.querySelector("#clientGenerateCover").addEventListener("click", () => generateClientAsset("cover"));
document.querySelector("#clientGenerateMusic").addEventListener("click", () => generateClientAsset("music"));

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
