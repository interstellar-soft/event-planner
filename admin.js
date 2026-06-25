const loginPanel = document.querySelector("#loginPanel");
const dashboard = document.querySelector("#adminDashboard");
const loginMessage = document.querySelector("#loginMessage");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
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

async function loadAdmin() {
  try {
    const db = await api("/api/admin");
    loginPanel.hidden = true;
    dashboard.hidden = false;
    renderAdmin(db);
  } catch {
    loginPanel.hidden = false;
    dashboard.hidden = true;
  }
}

function renderAdmin(db) {
  document.querySelector("#adminInviteCount").textContent = db.invitations.length;
  document.querySelector("#adminBookingCount").textContent = db.bookings.length;
  document.querySelector("#adminRsvpCount").textContent = db.rsvps.length;

  document.querySelector("#invitationList").innerHTML =
    db.invitations
      .map((invite) => {
        const url = `/invite/${invite.slug}`;
        const rsvps = db.rsvps.filter((rsvp) => rsvp.invitationId === invite.id);
        return `<article class="admin-list-card">
          <strong>${escapeHtml(invite.title)}</strong>
          <p>${escapeHtml(invite.date)} · ${escapeHtml(invite.venue)}</p>
          <p>${rsvps.length} RSVP response${rsvps.length === 1 ? "" : "s"}</p>
          <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
        </article>`;
      })
      .join("") || `<article class="admin-list-card"><strong>No invitations yet</strong><p>Create one from the public digital invitation form.</p></article>`;

  document.querySelector("#bookingList").innerHTML =
    db.bookings
      .map(
        (booking) => `<article class="admin-list-card">
          <strong>${escapeHtml(booking.packageName || "Booking request")}</strong>
          <p>${escapeHtml(booking.client)} · ${escapeHtml(booking.eventType)} · ${escapeHtml(booking.date)}</p>
          <p>${escapeHtml((booking.coverage || []).join(", ") || "Coverage not selected")}</p>
          <time>${new Date(booking.createdAt).toLocaleString()}</time>
        </article>`
      )
      .join("") || `<article class="admin-list-card"><strong>No bookings yet</strong><p>Booking requests will appear here.</p></article>`;

  document.querySelector("#rsvpList").innerHTML =
    db.rsvps
      .map((rsvp) => {
        const invite = db.invitations.find((item) => item.id === rsvp.invitationId);
        return `<article class="admin-list-card">
          <strong>${escapeHtml(rsvp.name)}</strong>
          <p>${escapeHtml(invite?.title || "Unknown invitation")} · ${escapeHtml(rsvp.status)} · ${escapeHtml(rsvp.count)} guest(s)</p>
          <p>${escapeHtml(rsvp.phone || "No phone")}</p>
          <time>${new Date(rsvp.createdAt).toLocaleString()}</time>
        </article>`;
      })
      .join("") || `<article class="admin-list-card"><strong>No RSVPs yet</strong><p>Guest responses will appear here.</p></article>`;
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

document.querySelector("#logoutButton").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" });
  loginPanel.hidden = false;
  dashboard.hidden = true;
});

document.querySelector("#refreshAdmin").addEventListener("click", loadAdmin);

loadAdmin();
