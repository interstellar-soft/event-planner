const form = document.querySelector("#publicRsvpForm");
const statusMessage = document.querySelector("#rsvpStatusMessage");

document.querySelector("#enterInvitation")?.addEventListener("click", async (event) => {
  const entrance = document.querySelector("#inviteEntrance");
  const video = document.querySelector("#inviteHeroVideo");
  const audio = document.querySelector("#inviteAudio");
  event.currentTarget.disabled = true;
  entrance?.classList.add("opening");
  document.body.classList.add("invitation-opened");
  window.setTimeout(() => entrance?.classList.add("opened"), 1250);
  window.setTimeout(() => entrance?.setAttribute("hidden", ""), 1900);
  try {
    if (video) {
      video.muted = Boolean(audio);
      await video.play();
    }
    if (audio) await audio.play();
  } catch {}
});

const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.14 });
  document.querySelectorAll(".invite-story-section").forEach((section) => revealObserver.observe(section));
}

document.querySelector("#inviteLanguageToggle")?.addEventListener("click", (event) => {
  const button = event.currentTarget;
  const showArabic = !document.body.classList.contains("language-ar");
  document.body.classList.toggle("language-ar", showArabic);
  document.documentElement.lang = showArabic ? "ar" : "en";
  document.documentElement.dir = showArabic ? "rtl" : "ltr";
  document.querySelectorAll("[data-language-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.languagePanel !== (showArabic ? "ar" : "en");
  });
  button.textContent = showArabic ? "EN" : "AR";
  button.setAttribute("aria-label", showArabic ? "Show English version" : "عرض النسخة العربية");
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
