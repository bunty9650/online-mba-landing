const crmLeadEndpoint = "https://3092a01d-31a6-46a0-a092-11aa63948adc.neodove.com/integration/custom/7998e1da-c784-42b5-8967-02aa22f0447d/leads";

function scrollToTarget(selector) {
  const target = document.querySelector(selector);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function normalizePhone(phone) {
  return phone.replace(/\D/g, "").replace(/^91/, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendLeadToCrm(lead) {
  const payload = {
    name: lead.name,
    mobile: Number(lead.phone),
    email: lead.email,
    detail1: lead.source || "Landing Page Form",
    detail2: [
      `Lead ID: ${lead.id}`,
      lead.program && `Program: ${lead.program}`,
      lead.university && `Interest: ${lead.university}`,
      lead.qualification && `Qualification: ${lead.qualification}`,
      `Submitted: ${lead.submittedAt}`,
      "Website: onlinembaadmission.com"
    ].filter(Boolean).join(" | ")
  };

  const response = await fetch(crmLeadEndpoint, {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const responseText = await response.text();
  console.info("CRM response:", response.status, responseText);

  if (!response.ok) {
    throw new Error(`CRM request failed with status ${response.status}: ${responseText}`);
  }

  return responseText;
}

const modal = document.querySelector("#lead-modal");
const modalForm = modal ? modal.querySelector(".modal-form") : null;
const modalClose = modal ? modal.querySelector(".modal-close") : null;

/* =========================
   OPEN / CLOSE MODAL
========================= */

function openLeadModal(university = "", source = "CTA Popup Form") {
  if (!modal) return;

  if (modalForm) {
    modalForm.dataset.source = source;
    const universityInput = modalForm.querySelector('input[name="university"]');
    if (universityInput) {
      universityInput.value = university;
    }
  }

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  const firstInput = modal.querySelector('input[name="name"]');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 80);
  }
}

function closeLeadModal() {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

/* =========================
   INTRO POPUP (ONCE)
========================= */

window.addEventListener("load", function () {
  if (!localStorage.getItem("introPopupShown")) {
    setTimeout(() => {
      openLeadModal("", "Intro Popup Form");
      localStorage.setItem("introPopupShown", "true");
    }, 3000); // 3 sec delay
  }
});

/* =========================
   EXIT INTENT POPUP (ONCE)
========================= */

document.addEventListener("mouseout", function (e) {
  if (e.clientY < 10) {
    if (!localStorage.getItem("exitPopupShown")) {
      openLeadModal("", "Exit Intent Popup");
      localStorage.setItem("exitPopupShown", "true");
    }
  }
});

/* =========================
   CTA BUTTON HANDLING
========================= */

document.querySelectorAll("[data-scroll]").forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();

    const university = trigger.dataset.university;
    if (university) {
      document.querySelectorAll('input[name="university"]').forEach((input) => {
        input.value = university;
      });
    }

    openLeadModal(university || "", "CTA Popup Form");
  });
});

/* =========================
   CLOSE EVENTS
========================= */

if (modalClose) {
  modalClose.addEventListener("click", closeLeadModal);
}

if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeLeadModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLeadModal();
  }
});

/* =========================
   FORM SUBMIT
========================= */

document.querySelectorAll(".lead-form").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = form.querySelector(".form-message");
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    const name = String(formData.get("name") || "").trim();
    const phone = normalizePhone(String(formData.get("phone") || ""));
    const email = String(formData.get("email") || "").trim();
    const program = String(formData.get("program") || "").trim();
    const university = String(formData.get("university") || "").trim();
    const qualification = String(formData.get("qualification") || "").trim();
    const source = form.dataset.source || "Landing Page Form";

    message.className = "form-message";

    if (name.length < 2) {
      message.textContent = "Please enter your full name.";
      message.classList.add("error");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      message.textContent = "Please enter a valid 10-digit Indian mobile number.";
      message.classList.add("error");
      return;
    }

    if (!isValidEmail(email)) {
      message.textContent = "Please enter a valid email address.";
      message.classList.add("error");
      return;
    }

    const lead = {
      id: `MBA-${Date.now()}`,
      source,
      name,
      phone,
      email,
      program,
      university,
      qualification,
      submittedAt: new Date().toISOString()
    };

    const existingLeads = JSON.parse(localStorage.getItem("onlineMbaLeads") || "[]");
    existingLeads.push(lead);
    localStorage.setItem("onlineMbaLeads", JSON.stringify(existingLeads));

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    message.textContent = "Thank you. Submitting your details...";
    message.classList.add("success");

    try {
      await sendLeadToCrm(lead);
      message.textContent = "Thank you. Your details have been submitted. Our counselor will contact you soon.";
    } catch (error) {
      console.error("CRM lead submission failed:", error);
      message.textContent = "Sorry, submission failed. Please try again in a moment.";
      message.classList.remove("success");
      message.classList.add("error");
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.defaultText || "Submit";
      }
      return;
    }

    form.reset();

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = submitButton.dataset.defaultText || submitButton.textContent.replace("Submitting...", "Submit");
    }

    if (form.classList.contains("modal-form")) {
      setTimeout(closeLeadModal, 800);
    }
  });
});

document.querySelectorAll('.lead-form button[type="submit"]').forEach((button) => {
  button.dataset.defaultText = button.textContent;
});
