const loginPanel = document.querySelector("#loginPanel");
const dashboard = document.querySelector("#adminDashboard");
const loginMessage = document.querySelector("#loginMessage");
const editor = document.querySelector("#invitationEditor");
const editorStatus = document.querySelector("#editorMessageStatus");
let adminData = { invitations: [], bookings: [], rsvps: [], generationConfig: {}, templates: [] };
let activeInvitation = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}

function normalizedStatus(invitation) {
  return invitation.status === "live" ? "published" : invitation.status || "draft";
}

async function loadAdmin() {
  try {
    adminData = await api("/api/admin");
    loginPanel.hidden = true;
    dashboard.hidden = false;
    renderAdmin();
  } catch {
    loginPanel.hidden = false;
    dashboard.hidden = true;
  }
}

function renderAdmin() {
  document.querySelector("#adminInviteCount").textContent = adminData.invitations.length;
  document.querySelector("#adminBookingCount").textContent = adminData.bookings.length;
  document.querySelector("#adminRsvpCount").textContent = adminData.rsvps.length;

  document.querySelector("#invitationList").innerHTML =
    adminData.invitations.map((invitation) => {
      const status = normalizedStatus(invitation);
      const payment = invitation.payment?.status || "unpaid";
      const url = `/invite/${invitation.slug}`;
      const rsvps = adminData.rsvps.filter((rsvp) => rsvp.invitationId === invitation.id);
      return `<article class="admin-list-card invitation-row">
        <div>
          <div class="admin-card-heading">
            <strong>${escapeHtml(invitation.title)}</strong>
            <span class="status-pill status-${status}">${escapeHtml(status)}</span>
            <span class="status-pill payment-${payment}">${escapeHtml(payment)}</span>
          </div>
          <p>${escapeHtml(invitation.date)} &middot; ${escapeHtml(invitation.venue)}</p>
          <p>${escapeHtml(invitation.clientName || "Client not provided")} &middot; ${escapeHtml(invitation.clientPhone || "No phone")}</p>
          <p>${rsvps.length} RSVP response${rsvps.length === 1 ? "" : "s"}</p>
          ${status === "published" ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>` : `<span class="draft-note">Not visible to guests</span>`}
        </div>
        <button class="button small" data-edit-invitation="${escapeHtml(invitation.id)}" type="button">Review</button>
      </article>`;
    }).join("") || `<article class="admin-list-card"><strong>No invitation requests yet</strong><p>New client requests will appear here as drafts.</p></article>`;

  document.querySelector("#bookingList").innerHTML =
    adminData.bookings.map((booking) => `<article class="admin-list-card">
      <strong>${escapeHtml(booking.packageName || "Booking request")}</strong>
      <p>${escapeHtml(booking.client)} &middot; ${escapeHtml(booking.eventType)} &middot; ${escapeHtml(booking.date)}</p>
      <p>${escapeHtml((booking.coverage || []).join(", ") || "Coverage not selected")}</p>
      <time>${new Date(booking.createdAt).toLocaleString()}</time>
    </article>`).join("") || `<article class="admin-list-card"><strong>No bookings yet</strong><p>Booking requests will appear here.</p></article>`;

  document.querySelector("#rsvpList").innerHTML =
    adminData.rsvps.map((rsvp) => {
      const invitation = adminData.invitations.find((item) => item.id === rsvp.invitationId);
      return `<article class="admin-list-card">
        <strong>${escapeHtml(rsvp.name)}</strong>
        <p>${escapeHtml(invitation?.title || "Unknown invitation")} &middot; ${escapeHtml(rsvp.status)} &middot; ${escapeHtml(rsvp.count)} guest(s)</p>
        <p>${escapeHtml(rsvp.phone || "No phone")}</p>
        <time>${new Date(rsvp.createdAt).toLocaleString()}</time>
      </article>`;
    }).join("") || `<article class="admin-list-card"><strong>No RSVPs yet</strong><p>Guest responses will appear here.</p></article>`;
}

function openEditor(invitation) {
  activeInvitation = invitation;
  document.querySelector("#editorInviteId").value = invitation.id;
  document.querySelector("#editorHeading").textContent = invitation.title || "Edit invitation";
  document.querySelector("#editorClientSummary").innerHTML = `<strong>${escapeHtml(invitation.clientName || "Client")}</strong><span>${escapeHtml(invitation.clientPhone || "No WhatsApp number")}</span><span>${escapeHtml(invitation.packageName || "No package selected")}</span><a href="/studio/${escapeHtml(invitation.clientToken)}" target="_blank" rel="noopener noreferrer">Open client studio</a>`;
  document.querySelector("#adminInvitationReview").innerHTML = `
    <div><span>Event</span><strong>${escapeHtml(invitation.title || "Untitled")} · ${escapeHtml(invitation.eventType || "")}</strong></div>
    <div><span>Date and time</span><strong>${escapeHtml(invitation.date || "Not chosen")}</strong></div>
    <div><span>Venue</span><strong>${escapeHtml(invitation.venue || "Not provided")}</strong></div>
    <div><span>Language</span><strong>${escapeHtml(invitation.language || "English")}</strong></div>
    <div><span>Media</span><strong>${invitation.videoUrl ? "Hero video · " : ""}${invitation.videoPosterUrl ? "Poster · " : ""}${(invitation.galleryUrls || []).length} gallery photo(s)</strong></div>
    <div><span>Workflow</span><strong>Review payment, preview, approve, then publish</strong></div>`;
  renderAdminPayment(invitation);
  document.querySelector("#editorTitle").value = invitation.title || "";
  document.querySelector("#editorEventType").value = invitation.eventType || "";
  document.querySelector("#editorDate").value = invitation.date || "";
  document.querySelector("#editorVenue").value = invitation.venue || "";
  document.querySelector("#editorMapUrl").value = invitation.mapUrl || "";
  document.querySelector("#editorRsvpDeadline").value = invitation.rsvpDeadline || "";
  document.querySelector("#editorEventDateTime").value = invitation.eventDateTime || "";
  document.querySelector("#editorHostNames").value = invitation.hostNames || "";
  const templateSelect = document.querySelector("#editorTemplate");
  templateSelect.innerHTML = adminData.templates.map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)} · ${escapeHtml(template.experience || "Image")} · $${template.price}</option>`).join("");
  templateSelect.value = invitation.templateId || "ivory-garden";
  renderCustomGenerationPanels();
  document.querySelector("#editorMessage").value = invitation.message || "";
  document.querySelector("#editorTitleAr").value = invitation.titleAr || invitation.title || "";
  document.querySelector("#editorDateAr").value = invitation.dateAr || invitation.date || "";
  document.querySelector("#editorVenueAr").value = invitation.venueAr || invitation.venue || "";
  document.querySelector("#editorHostNamesAr").value = invitation.hostNamesAr || "";
  document.querySelector("#editorMessageAr").value = invitation.messageAr || "";
  document.querySelector("#editorVideoUrl").value = invitation.videoUrl || "";
  document.querySelector("#editorVideoPosterUrl").value = invitation.videoPosterUrl || "";
  document.querySelector("#editorGalleryUrls").value = (invitation.galleryUrls || []).join("\n");
  document.querySelector("#editorAgenda").value = (invitation.agenda || []).map((item) => `${item.time || ""} | ${item.label || ""}`).join("\n");
  document.querySelector("#editorLocations").value = (invitation.locations || []).map((item) => `${item.label || ""} | ${item.venue || ""} | ${item.time || ""} | ${item.mapUrl || ""}`).join("\n");
  document.querySelector("#editorGiftNote").value = invitation.giftNote || "";
  document.querySelector("#editorCoverImage").value = invitation.coverImageUrl || "";
  document.querySelector("#editorMusicUrl").value = invitation.musicUrl || "";
  document.querySelector("#coverPrompt").value = invitation.generatedCovers?.[0]?.prompt || defaultCoverPrompt(invitation);
  document.querySelector("#musicPrompt").value = invitation.generatedTracks?.[0]?.prompt || defaultMusicPrompt(invitation);
  document.querySelector("#editorShowRsvp").checked = invitation.showRsvp !== false;
  document.querySelector("#copyInvitationLink").hidden = normalizedStatus(invitation) !== "published";
  editorStatus.textContent = `Current status: ${normalizedStatus(invitation)}`;
  renderGenerationStudio();
  editor.hidden = false;
  editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCustomGenerationPanels() {
  const selected = adminData.templates.find((template) => template.id === document.querySelector("#editorTemplate").value);
  const custom = Boolean(selected?.custom);
  document.querySelector("#customCoverPanel").hidden = !custom;
  document.querySelector("#customMusicPanel").hidden = !custom;
}

function renderAdminPayment(invitation) {
  const payment = invitation.payment || { status: "unpaid" };
  document.querySelector("#adminPaymentStatus").textContent = payment.status === "paid" ? "Paid" : payment.status === "submitted" ? "Verification requested" : payment.status === "rejected" ? "Rejected" : "Unpaid";
  document.querySelector("#adminPaymentReference").textContent = payment.reference
    ? `${payment.method === "bank" ? "Bank" : "Whish"} · ${payment.reference}`
    : `${invitation.packagePrice || ""} ${invitation.packageCurrency || "USD"}`.trim();
  document.querySelector("#adminPaymentActions").hidden = payment.status !== "submitted";
}

function defaultCoverPrompt(invitation) {
  if (invitation.customBrief) return invitation.customBrief;
  if (invitation.coverDirection) return invitation.coverDirection;
  const directions = {
    "Wedding Celebration": "Romantic evening garden, soft florals, candlelight, refined ivory and gold details",
    Baptism: "Serene daylight, delicate white flowers, pale blue accents, peaceful and luminous",
    Engagement: "Elegant romantic setting, modern florals, warm ambient light, celebratory details",
    Birthday: "Joyful sophisticated celebration, layered color, festive details, polished editorial style",
    "Corporate Event": "Modern architectural setting, crisp lighting, sophisticated brand-neutral details"
  };
  return directions[invitation.eventType] || "Elegant celebration, refined details, warm light, premium editorial style";
}

function defaultMusicPrompt(invitation) {
  if (invitation.musicDirection) return invitation.musicDirection;
  const directions = {
    "Wedding Celebration": "Romantic Lebanese-inspired instrumental with gentle oud, piano, and cinematic strings",
    Baptism: "Peaceful luminous instrumental with piano, soft strings, and delicate acoustic textures",
    Engagement: "Warm romantic instrumental with oud, piano, subtle percussion, and uplifting strings",
    Birthday: "Joyful modern instrumental with elegant percussion, bright piano, and warm celebratory energy",
    "Corporate Event": "Polished modern instrumental with subtle electronic rhythm, piano, and confident energy"
  };
  return directions[invitation.eventType] || "Warm elegant instrumental with piano, strings, and subtle regional acoustic textures";
}

function renderGenerationStudio() {
  if (!activeInvitation) return;
  const config = adminData.generationConfig || {};
  const usage = activeInvitation.generationUsage || { covers: 0, music: 0 };
  const coverRemaining = Math.max(0, (config.maxCoverGenerations || 6) - (usage.covers || 0));
  const musicRemaining = Math.max(0, (config.maxMusicGenerations || 3) - (usage.music || 0));
  const coverState = document.querySelector("#coverGeneratorState");
  const musicState = document.querySelector("#musicGeneratorState");
  coverState.textContent = config.coverEnabled ? `${coverRemaining} generation${coverRemaining === 1 ? "" : "s"} left` : "Needs OpenAI key";
  musicState.textContent = config.musicEnabled ? `${musicRemaining} generation${musicRemaining === 1 ? "" : "s"} left` : "Needs ElevenLabs key";
  coverState.classList.toggle("ready", Boolean(config.coverEnabled));
  musicState.classList.toggle("ready", Boolean(config.musicEnabled));
  document.querySelector("#generateCover").disabled = !config.coverEnabled || coverRemaining === 0;
  document.querySelector("#generateMusic").disabled = !config.musicEnabled || musicRemaining === 0;

  const selectedCover = document.querySelector("#editorCoverImage").value;
  document.querySelector("#generatedCoverList").innerHTML = (activeInvitation.generatedCovers || []).map((asset) => `
    <article class="generated-cover ${asset.url === selectedCover ? "selected" : ""}">
      <img src="${escapeHtml(asset.url)}" alt="Generated invitation cover option" />
      <button class="button small" data-use-cover="${escapeHtml(asset.url)}" type="button">${asset.url === selectedCover ? "Selected" : "Use Cover"}</button>
    </article>
  `).join("") || `<p class="generator-empty">No generated cover yet.</p>`;

  const selectedTrack = document.querySelector("#editorMusicUrl").value;
  document.querySelector("#generatedTrackList").innerHTML = (activeInvitation.generatedTracks || []).map((asset) => `
    <article class="generated-track ${asset.url === selectedTrack ? "selected" : ""}">
      <audio controls preload="none" src="${escapeHtml(asset.url)}"></audio>
      <button class="button small" data-use-music="${escapeHtml(asset.url)}" type="button">${asset.url === selectedTrack ? "Selected" : "Use Soundtrack"}</button>
    </article>
  `).join("") || `<p class="generator-empty">No generated soundtrack yet.</p>`;
}

function syncActiveInvitation(invitation) {
  activeInvitation = invitation;
  const index = adminData.invitations.findIndex((item) => item.id === invitation.id);
  if (index >= 0) adminData.invitations[index] = invitation;
  document.querySelector("#editorCoverImage").value = invitation.coverImageUrl || "";
  document.querySelector("#editorMusicUrl").value = invitation.musicUrl || "";
  renderAdminPayment(invitation);
  renderAdmin();
  renderGenerationStudio();
}

async function reviewPayment(status) {
  if (!activeInvitation) return;
  editorStatus.textContent = status === "paid" ? "Approving payment..." : "Rejecting payment...";
  try {
    const result = await api(`/api/admin/invitations/${encodeURIComponent(activeInvitation.id)}/payment`, {
      method: "POST",
      body: JSON.stringify({ status })
    });
    syncActiveInvitation(result.invitation);
    editorStatus.textContent = status === "paid" ? "Payment approved. The client now has full access." : "Payment rejected. The client can submit a corrected reference.";
  } catch (error) {
    editorStatus.textContent = error.message;
  }
}

async function openPrivatePreview() {
  if (!activeInvitation) return;
  const previewWindow = window.open("about:blank", "_blank");
  const status = normalizedStatus(activeInvitation);
  const result = await saveInvitation(status, "Changes saved. Opening private preview...");
  if (result && previewWindow) {
    previewWindow.opener = null;
    previewWindow.location = result.previewUrl;
  } else if (result) {
    window.location.href = result.previewUrl;
  } else if (previewWindow) {
    previewWindow.close();
  }
}

function editorPayload(status) {
  const lines = (selector) => document.querySelector(selector).value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return {
    title: document.querySelector("#editorTitle").value,
    eventType: document.querySelector("#editorEventType").value,
    date: document.querySelector("#editorDate").value,
    venue: document.querySelector("#editorVenue").value,
    mapUrl: document.querySelector("#editorMapUrl").value,
    rsvpDeadline: document.querySelector("#editorRsvpDeadline").value,
    eventDateTime: document.querySelector("#editorEventDateTime").value,
    hostNames: document.querySelector("#editorHostNames").value,
    templateId: document.querySelector("#editorTemplate").value,
    message: document.querySelector("#editorMessage").value,
    titleAr: document.querySelector("#editorTitleAr").value,
    dateAr: document.querySelector("#editorDateAr").value,
    venueAr: document.querySelector("#editorVenueAr").value,
    hostNamesAr: document.querySelector("#editorHostNamesAr").value,
    messageAr: document.querySelector("#editorMessageAr").value,
    coverImageUrl: document.querySelector("#editorCoverImage").value,
    musicUrl: document.querySelector("#editorMusicUrl").value,
    videoUrl: document.querySelector("#editorVideoUrl").value,
    videoPosterUrl: document.querySelector("#editorVideoPosterUrl").value,
    galleryUrls: lines("#editorGalleryUrls"),
    agenda: lines("#editorAgenda").map((line) => { const [time, ...label] = line.split("|"); return { time: time.trim(), label: label.join("|").trim() }; }),
    locations: lines("#editorLocations").map((line) => { const [label, venue, time, ...mapUrl] = line.split("|"); return { label: label?.trim(), venue: venue?.trim(), time: time?.trim(), mapUrl: mapUrl.join("|").trim() }; }),
    giftNote: document.querySelector("#editorGiftNote").value,
    showRsvp: document.querySelector("#editorShowRsvp").checked,
    status
  };
}

async function saveInvitation(status, successMessage) {
  if (!activeInvitation) return null;
  editorStatus.textContent = "Saving invitation...";
  try {
    const result = await api(`/api/admin/invitations/${encodeURIComponent(activeInvitation.id)}`, {
      method: "PUT",
      body: JSON.stringify(editorPayload(status))
    });
    syncActiveInvitation(result.invitation);
    document.querySelector("#editorHeading").textContent = activeInvitation.title;
    document.querySelector("#copyInvitationLink").hidden = normalizedStatus(activeInvitation) !== "published";
    editorStatus.textContent = successMessage;
    return result;
  } catch (error) {
    editorStatus.textContent = error.message;
    return null;
  }
}

async function generateAsset(kind) {
  if (!activeInvitation) return;
  const isCover = kind === "cover";
  const button = document.querySelector(isCover ? "#generateCover" : "#generateMusic");
  const message = document.querySelector(isCover ? "#coverGeneratorMessage" : "#musicGeneratorMessage");
  const prompt = document.querySelector(isCover ? "#coverPrompt" : "#musicPrompt").value.trim();
  if (prompt.length < 10) {
    message.textContent = "Add a little more creative direction before generating.";
    return;
  }
  const saved = await saveInvitation(normalizedStatus(activeInvitation), "Invitation details saved.");
  if (!saved) return;
  button.disabled = true;
  button.textContent = isCover ? "Generating Cover..." : "Composing Soundtrack...";
  message.textContent = isCover ? "Creating portrait artwork. This can take up to two minutes." : "Composing original instrumental music. This may take a few minutes.";
  try {
    const payload = isCover
      ? { prompt, quality: document.querySelector("#coverQuality").value }
      : { prompt, durationSeconds: Number(document.querySelector("#musicDuration").value) };
    const suffix = isCover ? "generate-cover" : "generate-music";
    const result = await api(`/api/admin/invitations/${encodeURIComponent(activeInvitation.id)}/${suffix}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    syncActiveInvitation(result.invitation);
    message.textContent = `${isCover ? "Cover" : "Soundtrack"} generated and selected. ${result.remaining} generation${result.remaining === 1 ? "" : "s"} left.`;
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.textContent = isCover ? "Generate Cover" : "Generate Soundtrack";
    renderGenerationStudio();
  }
}

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "Signing in...";
  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ password: document.querySelector("#adminPassword").value })
    });
    loginMessage.textContent = "";
    await loadAdmin();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

document.querySelector("#invitationList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-invitation]");
  if (!button) return;
  const invitation = adminData.invitations.find((item) => item.id === button.dataset.editInvitation);
  if (invitation) openEditor(invitation);
});

document.querySelectorAll("[data-save-status]").forEach((button) => {
  button.addEventListener("click", () => {
    const status = button.dataset.saveStatus;
    const messages = {
      draft: "Draft saved. It remains private.",
      approved: "Invitation marked approved. It remains private until published.",
      published: "Invitation published. The live link is ready to share."
    };
    saveInvitation(status, messages[status]);
  });
});

document.querySelector("#generateCover").addEventListener("click", () => generateAsset("cover"));
document.querySelector("#generateMusic").addEventListener("click", () => generateAsset("music"));
document.querySelector("#editorTemplate").addEventListener("change", renderCustomGenerationPanels);
document.querySelector("#approvePayment").addEventListener("click", () => reviewPayment("paid"));
document.querySelector("#rejectPayment").addEventListener("click", () => reviewPayment("rejected"));
document.querySelector("#previewBeforeApproval").addEventListener("click", openPrivatePreview);

document.querySelector("#generatedCoverList").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-use-cover]");
  if (!button) return;
  document.querySelector("#editorCoverImage").value = button.dataset.useCover;
  await saveInvitation(normalizedStatus(activeInvitation), "Cover selected.");
});

document.querySelector("#generatedTrackList").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-use-music]");
  if (!button) return;
  document.querySelector("#editorMusicUrl").value = button.dataset.useMusic;
  await saveInvitation(normalizedStatus(activeInvitation), "Soundtrack selected.");
});

document.querySelector("#previewInvitation").addEventListener("click", openPrivatePreview);

document.querySelector("#copyInvitationLink").addEventListener("click", async () => {
  if (!activeInvitation || normalizedStatus(activeInvitation) !== "published") return;
  const url = `${window.location.origin}/invite/${activeInvitation.slug}`;
  try {
    await navigator.clipboard.writeText(url);
    editorStatus.textContent = "Live invitation link copied.";
  } catch {
    editorStatus.textContent = url;
  }
});

document.querySelector("#closeEditor").addEventListener("click", () => {
  editor.hidden = true;
  activeInvitation = null;
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" });
  loginPanel.hidden = false;
  dashboard.hidden = true;
  editor.hidden = true;
});

document.querySelector("#refreshAdmin").addEventListener("click", loadAdmin);

loadAdmin();
