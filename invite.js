const form = document.querySelector("#publicRsvpForm");
const statusMessage = document.querySelector("#rsvpStatusMessage");

document.querySelector("#enterInvitation")?.addEventListener("click", async () => {
  const entrance = document.querySelector("#inviteEntrance");
  const video = document.querySelector("#inviteHeroVideo");
  const audio = document.querySelector("#inviteAudio");
  entrance?.classList.add("opened");
  document.body.classList.add("invitation-opened");
  try {
    if (video) {
      video.muted = Boolean(audio);
      await video.play();
    }
    if (audio) await audio.play();
  } catch {}
});

const countdown = document.querySelector("[data-event-date]");
if (countdown) {
  const target = new Date(countdown.dataset.eventDate).getTime();
  const updateCountdown = () => {
    const remaining = Math.max(0, target - Date.now());
    const values = {
      days: Math.floor(remaining / 86400000),
      hours: Math.floor((remaining % 86400000) / 3600000),
      minutes: Math.floor((remaining % 3600000) / 60000),
      seconds: Math.floor((remaining % 60000) / 1000)
    };
    Object.entries(values).forEach(([key, value]) => {
      const element = countdown.querySelector(`[data-countdown="${key}"]`);
      if (element) element.textContent = String(value).padStart(2, "0");
    });
  };
  if (Number.isFinite(target)) {
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }
}

form?.addEventListener("submit", async (event) => {
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
