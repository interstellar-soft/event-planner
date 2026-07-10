const content = window.siteContent || {};
const invitationTemplates = window.invitationTemplates || [];
const templateCategoryOrder = ["Wedding", "Baptism", "First Communion", "Engagement", "Birthday", "Business", "Other Celebrations", "Custom Design"];
const templateCategoryDescriptions = {
  Wedding: "Romantic garden, evening, coastal, and destination wedding designs.",
  Baptism: "Luminous, peaceful designs created for church and family celebrations.",
  "First Communion": "Dedicated sacramental designs in ivory, pearl blue, olive, and gold.",
  Engagement: "Intimate and cinematic designs for proposals and engagement celebrations.",
  Birthday: "Colorful, polished party designs for children and adults.",
  Business: "Clear, modern invitations for launches, openings, and corporate events.",
  "Other Celebrations": "Flexible premium designs for graduations, anniversaries, and private events.",
  "Custom Design": "A bespoke design, cover, and optional soundtrack prepared by Tony's studio."
};
const eventTypeByCategory = { Wedding: "Wedding Celebration", Baptism: "Baptism", "First Communion": "First Communion", Engagement: "Engagement", Birthday: "Birthday", Business: "Corporate Event", "Other Celebrations": "Other Celebration" };
const studioStorageKey = "tony-private-invitation-studio";

const templateGrid = document.querySelector("#templateGrid");
const portfolioGrid = document.querySelector("#portfolioGrid");
const photographyPackages = document.querySelector("#photographyPackages");
const bundleGrid = document.querySelector("#bundleGrid");
const invitationPricingGrid = document.querySelector("#invitationPricingGrid");
const orderForm = document.querySelector("#orderForm");
const mediaBookingForm = document.querySelector("#mediaBookingForm");
const storefrontPreviewFrame = document.querySelector("#storefrontPreviewFrame");
let selectedInvitationTemplate = "ivory-garden";
let activeStorefrontCategory = "Wedding";
let previewRefreshTimer = null;

function templateFeatureBadges(template) {
  const badges = [template.tier, template.experience || "Image"];
  if (template.tier === "Premium" || template.tier === "Bespoke") badges.push("Cinematic reveal");
  if (["Wedding", "Engagement", "Business"].includes(template.category)) badges.push("Bilingual ready");
  if (template.tier !== "Essential") badges.push("Guest story");
  return [...new Set(badges)].slice(0, 4);
}

function getPathValue(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function applyContentText() {
  document.title = `${content.studio.name} | Event Packages, RSVP & Media Studio`;
  document.querySelectorAll("[data-content]").forEach((element) => {
    const value = getPathValue(content, element.dataset.content);
    if (value) {
      element.textContent = value;
    }
  });
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

function renderTemplates() {
  const availableCategories = templateCategoryOrder.filter((category) => invitationTemplates.some((template) => template.category === category));
  document.querySelector("#templateCategoryNav").innerHTML = availableCategories.map((category) => `
    <button class="template-category-button ${category === activeStorefrontCategory ? "active" : ""}" type="button" data-storefront-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
  `).join("");
  document.querySelector("#templateCategoryHeading").innerHTML = `<h3>${escapeHtml(activeStorefrontCategory)}</h3><p>${escapeHtml(templateCategoryDescriptions[activeStorefrontCategory] || "")}</p>`;
  templateGrid.innerHTML = invitationTemplates
    .filter((template) => template.category === activeStorefrontCategory)
    .map(
      (template) => {
        const sample = templateSample(template);
        return `
        <article class="template-card tier-${escapeHtml(String(template.tier || "").toLowerCase())}">
          <div class="template-art ${template.image ? "has-cover" : ""} invite-template-${escapeHtml(template.id)} invite-layout-${escapeHtml(template.layout)}" style="--template-accent:${escapeHtml(template.accent)};--template-canvas:${escapeHtml(template.canvas)};--template-paper:${escapeHtml(template.paper)};--template-image:url('${escapeHtml(template.image || "")}')">
            <div><span>${escapeHtml(sample.kicker)}</span><strong>${escapeHtml(sample.name)}</strong><small>${escapeHtml(sample.date)}</small></div>
          </div>
          <footer>
            <span class="template-tier">${escapeHtml(template.category)} · ${escapeHtml(template.tier)} · ${escapeHtml(template.experience || "Image")}</span>
            <h3>${template.name}</h3>
            <p>${escapeHtml(template.description)}</p>
            <div class="template-badges">${templateFeatureBadges(template).map((badge) => `<span>${escapeHtml(badge)}</span>`).join("")}</div>
            <p><strong>$${template.price}</strong></p>
            <div class="template-card-actions">
              <button class="button outline" type="button" data-preview-template="${escapeHtml(template.id)}">Preview reveal</button>
              <button class="button" type="button" data-template="${escapeHtml(template.id)}">Use this design</button>
            </div>
          </footer>
        </article>
      `;
      }
    )
    .join("");
}

function renderPortfolio() {
  portfolioGrid.innerHTML = content.portfolioItems
    .map(
      (item) => `
        <article class="portfolio-card ${item.className}" style="--portfolio-image: url('${escapeHtml(item.image || "")}')">
          <div>
            <p>${escapeHtml(item.type)}</p>
            <h3>${escapeHtml(item.title)}</h3>
          </div>
        </article>
      `
    )
    .join("");
}

function renderPhotographyPackages() {
  photographyPackages.innerHTML = content.photographyPackages
    .map(
      (category) => `
        <article class="package-category-card">
          <p class="package-category-note">${escapeHtml(category.note)}</p>
          <h3>${escapeHtml(category.category)}</h3>
          <div class="package-item-list">
            ${category.items
              .map(
                (item) => `
                  <div class="package-item">
                    <span>${escapeHtml(item.name)}</span>
                    <strong>${escapeHtml(item.price)}</strong>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function renderPriceCards(target, packages, actionType) {
  target.innerHTML = packages
    .map(
      (item) => `
        <article class="price-card ${item.featured ? "featured" : ""}">
          ${item.badge ? `<div class="badge">${escapeHtml(item.badge)}</div>` : ""}
          <h3>${escapeHtml(item.name)}</h3>
          <strong>${escapeHtml(item.price)}</strong>
          <p>${escapeHtml(item.description)}</p>
          <ul>
            ${item.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
          </ul>
          <a class="button card-button ${item.featured ? "dark" : ""}" href="${actionType === "media" ? "#booking" : "#order"}" ${
            actionType === "media" ? `data-media-plan="${escapeHtml(item.name)}"` : `data-plan="${escapeHtml(item.templateId || "ivory-garden")}"`
          }>${actionType === "media" ? "Request Quote" : "Choose Package"}</a>
        </article>
      `
    )
    .join("");
}

function renderPackageSelects() {
  document.querySelector("#packageName").innerHTML = templateCategoryOrder.map((category) => {
    const options = invitationTemplates.filter((item) => item.category === category);
    return options.length ? `<optgroup label="${escapeHtml(category)}">${options.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · $${item.price}</option>`).join("")}</optgroup>` : "";
  }).join("");
  document.querySelector("#mediaPackage").innerHTML = [
    ...content.mediaBundles.map((item) => item.name),
    "Custom crew"
  ]
    .map((name) => `<option>${escapeHtml(name)}</option>`)
    .join("");
}

function renderBusinessContent() {
  applyContentText();
  renderTemplates();
  renderPortfolio();
  renderPhotographyPackages();
  renderPriceCards(bundleGrid, content.mediaBundles, "media");
  renderPriceCards(invitationPricingGrid, content.invitationPackages, "invitation");
  renderPackageSelects();
  renderContactLinks();
}

function renderContactLinks() {
  const links = [];
  if (content.studio.bookingEmail) {
    links.push(`<a href="mailto:${escapeHtml(content.studio.bookingEmail)}">${escapeHtml(content.studio.bookingEmail)}</a>`);
  }
  if (content.studio.instagramUrl) {
    links.push(`<a href="${escapeHtml(content.studio.instagramUrl)}" target="_blank" rel="noopener noreferrer">Instagram portfolio</a>`);
  }
  document.querySelector("#contactLinks").innerHTML = links.join("");
}

function updatePreview() {
  const selectedId = document.querySelector("#packageName")?.value || selectedInvitationTemplate;
  const template = invitationTemplates.find((item) => item.id === selectedId) || invitationTemplates[0];
  const sample = templateSample(template);
  const eventDate = document.querySelector("#eventDate").value;
  const eventTime = document.querySelector("#eventTime").value;
  const formattedDate = eventDate && eventTime ? new Date(`${eventDate}T${eventTime}`).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }) : sample.date;
  const params = new URLSearchParams({
    title: document.querySelector("#eventTitle").value.trim() || sample.name,
    date: formattedDate,
    venue: document.querySelector("#venue").value.trim() || "Your venue",
    eventType: document.querySelector("#inviteEventType").value || eventTypeByCategory[template.category] || "Event Invitation",
    language: getCheckedValues(orderForm).includes("Bilingual Arabic / English") ? "Bilingual" : "English"
  });
  window.clearTimeout(previewRefreshTimer);
  previewRefreshTimer = window.setTimeout(() => {
    storefrontPreviewFrame.src = `/template-preview/${encodeURIComponent(template.id)}?${params}`;
  }, 250);
}

function previewTemplate(templateId) {
  selectedInvitationTemplate = templateId || "ivory-garden";
  document.querySelector("#packageName").value = selectedInvitationTemplate;
  const selected = invitationTemplates.find((template) => template.id === selectedInvitationTemplate);
  if (selected && eventTypeByCategory[selected.category]) document.querySelector("#inviteEventType").value = eventTypeByCategory[selected.category];
  updatePreview();
  document.querySelector("#preview").scrollIntoView({ behavior: "smooth", block: "center" });
}

function showStudioRecovery(clientUrl, message = "Your invitation is already in progress") {
  if (!clientUrl) return;
  const absoluteUrl = new URL(clientUrl, window.location.origin).href;
  const recovery = document.querySelector("#studioRecovery");
  recovery.hidden = false;
  recovery.querySelector("strong").textContent = message;
  document.querySelector("#studioRecoveryLink").href = absoluteUrl;
  document.querySelector("#clientStudioLink").href = absoluteUrl;
  document.querySelector("#studioWhatsappLink").href = buildWhatsappUrl(`Hello ${content.studio.shortName}, please keep my private invitation studio link in this chat:\n${absoluteUrl}`);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

function getCheckedValues(form) {
  return [...form.querySelectorAll("input[type='checkbox']:checked")].map((input) => {
    return input.value || input.parentElement.textContent.trim();
  });
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Request failed.");
  }
  return result;
}

function normalizeWhatsappNumber(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function buildWhatsappUrl(message) {
  const number = normalizeWhatsappNumber(content.studio.whatsappNumber);
  if (!number) {
    return "";
  }
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function openWhatsapp(message, statusElement, inquiry) {
  const url = buildWhatsappUrl(message);
  if (!url) {
    statusElement.textContent = "WhatsApp number is not available yet. Please contact Tony through Instagram.";
    return;
  }
  statusElement.textContent = "Opening WhatsApp quote message...";
  window.open(url, "_blank", "noopener,noreferrer");
}

function invitationQuoteMessage() {
  const addOns = getCheckedValues(orderForm).join(", ") || "No add-ons selected";
  return `Hello ${content.studio.shortName}, I want a quote for a digital invitation.

Event: ${document.querySelector("#eventTitle").value}
Type: ${document.querySelector("#inviteEventType").value}
Date: ${document.querySelector("#eventDate").value}
Venue: ${document.querySelector("#venue").value}
Location: ${document.querySelector("#mapUrl").value || "Not provided"}
Template: ${document.querySelector("#packageName").selectedOptions[0]?.textContent || document.querySelector("#packageName").value}
Add-ons: ${addOns}

Please send me the next steps.`;
}

function mediaQuoteMessage() {
  const coverage = getCheckedValues(mediaBookingForm).join(", ") || "Coverage not selected";
  return `Hello ${content.studio.shortName}, I want a quote for event media coverage.

Client: ${document.querySelector("#mediaClient").value}
Event type: ${document.querySelector("#mediaEventType").value}
Date: ${document.querySelector("#mediaDate").value}
Package: ${document.querySelector("#mediaPackage").value}
Coverage: ${coverage}

Please confirm availability and pricing.`;
}

renderBusinessContent();
updatePreview();
try {
  showStudioRecovery(localStorage.getItem(studioStorageKey));
} catch {}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-plan]");
  if (!button) return;
  document.querySelector("#packageName").value = button.dataset.plan;
  selectedInvitationTemplate = button.dataset.plan;
  const selected = invitationTemplates.find((template) => template.id === selectedInvitationTemplate);
  if (selected && eventTypeByCategory[selected.category]) document.querySelector("#inviteEventType").value = eventTypeByCategory[selected.category];
  updatePreview();
});

document.querySelector("#packageName").addEventListener("change", (event) => {
  selectedInvitationTemplate = event.target.value;
  const selected = invitationTemplates.find((template) => template.id === selectedInvitationTemplate);
  if (selected && eventTypeByCategory[selected.category]) document.querySelector("#inviteEventType").value = eventTypeByCategory[selected.category];
  updatePreview();
});

orderForm.addEventListener("input", updatePreview);

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-media-plan]");
  if (!button) return;
  document.querySelector("#mediaPackage").value = button.dataset.mediaPlan;
});

templateGrid.addEventListener("click", (event) => {
  const previewButton = event.target.closest("[data-preview-template]");
  if (previewButton) {
    previewTemplate(previewButton.dataset.previewTemplate);
    return;
  }
  const button = event.target.closest("[data-template]");
  if (!button) return;
  selectedInvitationTemplate = button.dataset.template || "ivory-garden";
  document.querySelector("#packageName").value = selectedInvitationTemplate;
  const selected = invitationTemplates.find((template) => template.id === selectedInvitationTemplate);
  if (selected && eventTypeByCategory[selected.category]) document.querySelector("#inviteEventType").value = eventTypeByCategory[selected.category];
  updatePreview();
  document.querySelector("#order").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#templateCategoryNav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-storefront-category]");
  if (!button) return;
  activeStorefrontCategory = button.dataset.storefrontCategory;
  renderTemplates();
});

document.querySelector("#heroDemoButton")?.addEventListener("click", () => {
  const screen = document.querySelector("#heroDemoScreen");
  const button = document.querySelector("#heroDemoButton");
  screen.classList.toggle("opened");
  button.textContent = screen.classList.contains("opened") ? "Replay reveal" : "Tap to open";
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#invitationStatus");
  status.textContent = "Sending your invitation request...";
  updatePreview();
  try {
    const result = await postJson("/api/invitations", {
      title: document.querySelector("#eventTitle").value,
      eventType: document.querySelector("#inviteEventType").value,
      eventDate: document.querySelector("#eventDate").value,
      eventTime: document.querySelector("#eventTime").value,
      venue: document.querySelector("#venue").value,
      mapUrl: document.querySelector("#mapUrl").value,
      templateId: document.querySelector("#packageName").value,
      language: getCheckedValues(orderForm).includes("Bilingual Arabic / English") ? "Bilingual" : "English",
      clientName: document.querySelector("#inviteClientName").value,
      clientPhone: document.querySelector("#inviteClientPhone").value,
      packageName: "Digital invitation template"
    });
    document.querySelector("#generatedInviteCard").hidden = false;
    showStudioRecovery(result.clientUrl, "Request received. Your private studio is ready");
    try {
      localStorage.setItem(studioStorageKey, new URL(result.clientUrl, window.location.origin).href);
    } catch {}
    status.textContent = "Request received. Open your private studio to personalize and preview the invitation.";
  } catch (error) {
    status.textContent = error.message;
  }
  document.querySelector("#preview").scrollIntoView({ behavior: "smooth", block: "center" });
});

mediaBookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const client = document.querySelector("#mediaClient").value.trim() || "New client";
  const eventType = document.querySelector("#mediaEventType").value;
  const packageName = document.querySelector("#mediaPackage").value;
  const status = document.querySelector("#mediaStatus");
  document.querySelector("#bookingSummary").textContent = `${packageName} for ${client} (${eventType})`;
  status.textContent = "Saving booking request...";
  try {
    await postJson("/api/bookings", {
      client,
      eventType,
      packageName,
      date: document.querySelector("#mediaDate").value,
      coverage: getCheckedValues(mediaBookingForm)
    });
    status.textContent = "Booking request saved. Use WhatsApp to confirm availability.";
  } catch (error) {
    status.textContent = error.message;
  }
  document.querySelector("#booking").scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelector("#invitationWhatsApp").addEventListener("click", () => {
  const title = document.querySelector("#eventTitle").value;
  openWhatsapp(invitationQuoteMessage(), document.querySelector("#invitationStatus"), {
    type: "Invitation WhatsApp",
    title,
    summary: `${document.querySelector("#packageName").selectedOptions[0]?.textContent || "Invitation template"} quote request`
  });
});

document.querySelector("#mediaWhatsApp").addEventListener("click", () => {
  const client = document.querySelector("#mediaClient").value || "New client";
  openWhatsapp(mediaQuoteMessage(), document.querySelector("#mediaStatus"), {
    type: "Media WhatsApp",
    title: `${document.querySelector("#mediaPackage").value} for ${client}`,
    summary: `${document.querySelector("#mediaEventType").value} quote request`
  });
});

document.querySelector("#heroWhatsApp")?.addEventListener("click", () => {
  openWhatsapp(
    `Hello ${content.studio.shortName}, I want to ask about full event packages with invitations, RSVP, photography, and gallery delivery.`,
    document.querySelector("#contactStatus"),
    {
      type: "General WhatsApp",
      title: "Full event package request",
      summary: "Homepage quote button"
    }
  );
  document.querySelector("#contact").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#photographyWhatsApp")?.addEventListener("click", () => {
  openWhatsapp(
    `Hello ${content.studio.shortName}, I am interested in adding photography or video coverage to my digital invitation.`,
    document.querySelector("#contactStatus"),
    { type: "Photography WhatsApp", title: "Photography coverage request", summary: "Invitation customer photography upgrade" }
  );
});

document.querySelector("#contactWhatsApp").addEventListener("click", () => {
  openWhatsapp(
    `Hello ${content.studio.shortName}, I want to book an event package. Please send me available options and pricing.`,
    document.querySelector("#contactStatus"),
    {
      type: "Contact WhatsApp",
      title: "Contact section request",
      summary: "Client asked for package options"
    }
  );
});

document.querySelector("#contactWhatsAppInline").addEventListener("click", () => {
  openWhatsapp(
    `Hello ${content.studio.shortName}, I want to book an event package. Please send me available options and pricing.`,
    document.querySelector("#contactStatus"),
    {
      type: "Contact WhatsApp",
      title: "Contact section request",
      summary: "Client asked for package options"
    }
  );
});
