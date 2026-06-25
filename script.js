const defaultTemplates = [
  {
    name: "Ivory Garden",
    price: "$49",
    initials: "M & K",
    description: "Soft florals, ivory paper, and classic wedding details.",
    background: "linear-gradient(145deg, #d9e8df, #f8efe8)",
    card: "linear-gradient(160deg, #ffffff, #f4dfd7)"
  },
  {
    name: "Midnight Oud",
    price: "$89",
    initials: "L & R",
    description: "Charcoal, gold accents, and a formal evening mood.",
    background: "linear-gradient(145deg, #11171b, #6c5b42)",
    card: "linear-gradient(160deg, #202a30, #b58b45)"
  },
  {
    name: "Sage Majlis",
    price: "$129",
    initials: "A & N",
    description: "Bilingual-ready layout for modern regional celebrations.",
    background: "linear-gradient(145deg, #2f7b68, #eee9f4)",
    card: "linear-gradient(160deg, #f9faf4, #cfe0d7)"
  }
];

const content = window.siteContent || {};

const templateGrid = document.querySelector("#templateGrid");
const portfolioGrid = document.querySelector("#portfolioGrid");
const photographyPackages = document.querySelector("#photographyPackages");
const bundleGrid = document.querySelector("#bundleGrid");
const invitationPricingGrid = document.querySelector("#invitationPricingGrid");
const orderForm = document.querySelector("#orderForm");
const mediaBookingForm = document.querySelector("#mediaBookingForm");

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

function renderTemplates() {
  templateGrid.innerHTML = defaultTemplates
    .map(
      (template) => `
        <article class="template-card">
          <div class="template-art" style="background:${template.background}">
            <div style="background:${template.card}">${template.initials}</div>
          </div>
          <footer>
            <h3>${template.name}</h3>
            <p>${template.description}</p>
            <p><strong>${template.price}</strong></p>
            <button class="button" type="button" data-template="${template.name}">Use this style</button>
          </footer>
        </article>
      `
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
            actionType === "media" ? `data-media-plan="${escapeHtml(item.name)}"` : `data-plan="${escapeHtml(item.name)}"`
          }>${actionType === "media" ? "Request Quote" : "Choose Package"}</a>
        </article>
      `
    )
    .join("");
}

function renderPackageSelects() {
  document.querySelector("#packageName").innerHTML = content.invitationPackages
    .map((item) => `<option>${escapeHtml(item.name)}</option>`)
    .join("");
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
Package: ${document.querySelector("#packageName").value}
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
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-media-plan]");
  if (!button) return;
  document.querySelector("#mediaPackage").value = button.dataset.mediaPlan;
});

templateGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-template]");
  if (!button) return;
  document.querySelector("#eventTitle").value = `${button.dataset.template} Celebration`;
  updatePreview();
  document.querySelector("#order").scrollIntoView({ behavior: "smooth" });
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#invitationStatus");
  status.textContent = "Generating invitation link...";
  updatePreview();
  try {
    const result = await postJson("/api/invitations", {
      title: document.querySelector("#eventTitle").value,
      eventType: document.querySelector("#inviteEventType").value,
      date: document.querySelector("#eventDate").value,
      venue: document.querySelector("#venue").value,
      mapUrl: document.querySelector("#mapUrl").value,
      packageName: document.querySelector("#packageName").value,
      language: getCheckedValues(orderForm).includes("Bilingual Arabic / English") ? "Bilingual" : "English"
    });
    const link = document.querySelector("#generatedInviteLink");
    link.href = result.url;
    link.textContent = result.url;
    document.querySelector("#generatedInviteCard").hidden = false;
    status.textContent = "Invitation generated. Open the link to view the live invitation page.";
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
    summary: `${document.querySelector("#packageName").value} quote request`
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
