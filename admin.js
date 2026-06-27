const loginPanel = document.querySelector("#loginPanel");
const dashboard = document.querySelector("#adminDashboard");
const loginMessage = document.querySelector("#loginMessage");
const editor = document.querySelector("#invitationEditor");
const editorStatus = document.querySelector("#editorMessageStatus");
let adminData = { invitations: [], bookings: [], rsvps: [] };
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
      const url = `/invite/${invitation.slug}`;
      const rsvps = adminData.rsvps.filter((rsvp) => rsvp.invitationId === invitation.id);
      return `<article class="admin-list-card invitation-row">
        <div>
          <div class="admin-card-heading">
            <strong>${escapeHtml(invitation.title)}</strong>
            <span class="status-pill status-${status}">${escapeHtml(status)}</span>
          </div>
          <p>${escapeHtml(invitation.date)} &middot; ${escapeHtml(invitation.venue)}</p>
          <p>${escapeHtml(invitation.clientName || "Client not provided")} &middot; ${escapeHtml(invitation.clientPhone || "No phone")}</p>
          <p>${rsvps.length} RSVP response${rsvps.length === 1 ? "" : "s"}</p>
          ${status === "published" ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>` : `<span class="draft-note">Not visible to guests</span>`}
        </div>
        <button class="button small" data-edit-invitation="${escapeHtml(invitation.id)}" type="button">Edit</button>
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
  document.querySelector("#editorClientSummary").innerHTML = `<strong>${escapeHtml(invitation.clientName || "Client")}</strong><span>${escapeHtml(invitation.clientPhone || "No WhatsApp number")}</span><span>${escapeHtml(invitation.packageName || "No package selected")}</span>`;
  document.querySelector("#editorTitle").value = invitation.title || "";
  document.querySelector("#editorEventType").value = invitation.eventType || "";
  document.querySelector("#editorDate").value = invitation.date || "";
  document.querySelector("#editorVenue").value = invitation.venue || "";
  document.querySelector("#editorMapUrl").value = invitation.mapUrl || "";
  document.querySelector("#editorRsvpDeadline").value = invitation.rsvpDeadline || "";
  document.querySelector("#editorHostNames").value = invitation.hostNames || "";
  document.querySelector("#editorTheme").value = invitation.theme || "ivory";
  document.querySelector("#editorMessage").value = invitation.message || "";
  document.querySelector("#editorCoverImage").value = invitation.coverImageUrl || "";
  document.querySelector("#editorMusicUrl").value = invitation.musicUrl || "";
  document.querySelector("#editorShowRsvp").checked = invitation.showRsvp !== false;
  document.querySelector("#copyInvitationLink").hidden = normalizedStatus(invitation) !== "published";
  editorStatus.textContent = `Current status: ${normalizedStatus(invitation)}`;
  editor.hidden = false;
  editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

function editorPayload(status) {
  return {
    title: document.querySelector("#editorTitle").value,
    eventType: document.querySelector("#editorEventType").value,
    date: document.querySelector("#editorDate").value,
    venue: document.querySelector("#editorVenue").value,
    mapUrl: document.querySelector("#editorMapUrl").value,
    rsvpDeadline: document.querySelector("#editorRsvpDeadline").value,
    hostNames: document.querySelector("#editorHostNames").value,
    theme: document.querySelector("#editorTheme").value,
    message: document.querySelector("#editorMessage").value,
    coverImageUrl: document.querySelector("#editorCoverImage").value,
    musicUrl: document.querySelector("#editorMusicUrl").value,
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
    activeInvitation = result.invitation;
    const index = adminData.invitations.findIndex((item) => item.id === activeInvitation.id);
    if (index >= 0) adminData.invitations[index] = activeInvitation;
    renderAdmin();
    document.querySelector("#editorHeading").textContent = activeInvitation.title;
    document.querySelector("#copyInvitationLink").hidden = normalizedStatus(activeInvitation) !== "published";
    editorStatus.textContent = successMessage;
    return result;
  } catch (error) {
    editorStatus.textContent = error.message;
    return null;
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

document.querySelector("#previewInvitation").addEventListener("click", async () => {
  const status = normalizedStatus(activeInvitation || {});
  const result = await saveInvitation(status, "Changes saved. Opening private preview...");
  if (result) window.open(result.previewUrl, "_blank", "noopener");
});

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
