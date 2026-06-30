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

const templateGrid = document.querySelector("#templateGrid");
const portfolioGrid = document.querySelector("#portfolioGrid");
const photographyPackages = document.querySelector("#photographyPackages");
const bundleGrid = document.querySelector("#bundleGrid");
const invitationPricingGrid = document.querySelector("#invitationPricingGrid");
const orderForm = document.querySelector("#orderForm");
const mediaBookingForm = document.querySelector("#mediaBookingForm");
let selectedInvitationTemplate = "ivory-garden";
let activeStorefrontCategory = "Wedding";

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
        <article class="template-card">
          <div class="template-art ${template.image ? "has-cover" : ""} invite-template-${escapeHtml(template.id)} invite-layout-${escapeHtml(template.layout)}" style="--template-accent:${escapeHtml(template.accent)};--template-canvas:${escapeHtml(template.canvas)};--template-paper:${escapeHtml(template.paper)};--template-image:url('${escapeHtml(template.image || "")}')">
            <div><span>${escapeHtml(sample.kicker)}</span><strong>${escapeHtml(sample.name)}</strong><small>${escapeHtml(sample.date)}</small></div>
          </div>
          <footer>
            <span class="template-tier">${escapeHtml(template.category)} · ${escapeHtml(template.tier)}</span>
            <h3>${template.name}</h3>
            <p>${template.description}</p>
            <p><strong>$${template.price}</strong></p>
            <button class="button" type="button" data-template="${escapeHtml(template.id)}">Choose template</button>
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
  const title = document.querySelector("#eventTitle").value.trim() || "Maya & Karim";
  const date = document.querySelector("#eventDate").value.trim() || "Saturday, 18 July 2026 at 7:30 PM";
  const venue = document.querySelector("#venue").value.trim() || "Sursock Palace Gardens, Beirut";
  document.querySelector("#previewTitle").textContent = title;
  document.querySelector("#previewDate").textContent = date;
  document.querySelector("#previewVenue").textContent = venue;
  const selectedId = document.querySelector("#packageName")?.value || selectedInvitationTemplate;
  const template = invitationTemplates.find((item) => item.id === selectedId) || invitationTemplates[0];
  const previewCard = document.querySelector("#storefrontInviteCard");
  if (template && previewCard) {
    previewCard.className = `invite-card template-preview-card invite-template-${template.id} invite-layout-${template.layout}`;
    previewCard.style.setProperty("--template-accent", template.accent);
    previewCard.style.setProperty("--template-canvas", template.canvas);
    previewCard.style.setProperty("--template-paper", template.paper);
    previewCard.style.setProperty("--template-image", `url('${template.image || ""}')`);
  }
  updateQr(`https://yourdomain.com/invite/${slugify(title)}`);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
}

function updateQr(value) {
  const qrImage = document.querySelector("#qrImage");
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=132x132&data=${encodeURIComponent(value)}`;
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

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-plan]");
  if (!button) return;
  document.querySelector("#packageName").value = button.dataset.plan;
  selectedInvitationTemplate = button.dataset.plan;
});

document.querySelector("#packageName").addEventListener("change", (event) => {
  selectedInvitationTemplate = event.target.value;
  updatePreview();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-media-plan]");
  if (!button) return;
  document.querySelector("#mediaPackage").value = button.dataset.mediaPlan;
});

templateGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-template]");
  if (!button) return;
  selectedInvitationTemplate = button.dataset.template || "ivory-garden";
  document.querySelector("#packageName").value = selectedInvitationTemplate;
  const selected = invitationTemplates.find((template) => template.id === selectedInvitationTemplate);
  const eventTypeByCategory = { Wedding: "Wedding Celebration", Baptism: "Baptism", "First Communion": "First Communion", Engagement: "Engagement", Birthday: "Birthday", Business: "Corporate Event", "Other Celebrations": "Other Celebration" };
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

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#invitationStatus");
  status.textContent = "Sending your invitation request...";
  updatePreview();
  try {
    const result = await postJson("/api/invitations", {
      title: document.querySelector("#eventTitle").value,
      eventType: document.querySelector("#inviteEventType").value,
      date: document.querySelector("#eventDate").value,
      venue: document.querySelector("#venue").value,
      mapUrl: document.querySelector("#mapUrl").value,
      templateId: document.querySelector("#packageName").value,
      language: getCheckedValues(orderForm).includes("Bilingual Arabic / English") ? "Bilingual" : "English",
      clientName: document.querySelector("#inviteClientName").value,
      clientPhone: document.querySelector("#inviteClientPhone").value,
      packageName: "Digital invitation template"
    });
    document.querySelector("#generatedInviteCard").hidden = false;
    document.querySelector("#clientStudioLink").href = result.clientUrl;
    status.textContent = result.message || "Request received. Tony will prepare your invitation preview.";
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

document.querySelector("#heroWhatsApp").addEventListener("click", () => {
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
