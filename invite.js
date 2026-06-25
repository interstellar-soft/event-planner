const form = document.querySelector("#publicRsvpForm");
const statusMessage = document.querySelector("#rsvpStatusMessage");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusMessage.textContent = "Sending RSVP...";

  const payload = {
    invitationId: document.querySelector("#inviteId").value,
    name: document.querySelector("#rsvpName").value,
    phone: document.querySelector("#rsvpPhone").value,
    count: Number(document.querySelector("#rsvpCount").value || 0),
    status: document.querySelector("#rsvpStatus").value
  };

  try {
    const response = await fetch("/api/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to save RSVP.");
    form.reset();
    document.querySelector("#rsvpCount").value = 1;
    statusMessage.textContent = "Thank you. Your RSVP has been received.";
  } catch (error) {
    statusMessage.textContent = error.message;
  }
});
