console.log("JS LOADED ✅");

/* =========================
   CRM ENDPOINT
========================= */
const crmLeadEndpoint = "https://3092a01d-31a6-46a0-a092-11aa63948adc.neodove.com/integration/custom/7998e1da-c784-42b5-8967-02aa22f0447d/leads";

/* =========================
   HELPERS
========================= */
function normalizePhone(phone) {
  return phone.replace(/\D/g, "").replace(/^91/, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =========================
   SEND LEAD TO CRM
========================= */
async function sendLeadToCrm(lead) {

  const payload = {
    name: lead.name,
    mobile: lead.phone, // ⚠️ number मत बना, string ही रख
    email: lead.email,
    detail1: lead.source || "Landing Page",
    detail2: `Program: ${lead.program || ""} | University: ${lead.university || ""} | Time: ${lead.submittedAt}`
  };

  console.log("📤 Sending to CRM:", payload);

  try {
    const response = await fetch(crmLeadEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log("✅ CRM RESPONSE:", response.status, text);

    if (!response.ok) {
      throw new Error("CRM failed");
    }

    return true;

  } catch (error) {
    console.error("❌ CRM ERROR:", error);
    throw error;
  }
}

/* =========================
   FORM HANDLING
========================= */

document.querySelectorAll("form").forEach((form) => {

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    console.log("FORM TRIGGERED ✅");

    const name = form.querySelector('[name="name"]')?.value.trim();
    const phone = normalizePhone(form.querySelector('[name="phone"]')?.value || "");
    const email = form.querySelector('[name="email"]')?.value.trim();
    const program = form.querySelector('[name="program"]')?.value || "";
    const university = form.querySelector('[name="university"]')?.value || "";

    if (!name || name.length < 2) {
      alert("Enter valid name");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      alert("Enter valid phone");
      return;
    }

    if (!isValidEmail(email)) {
      alert("Enter valid email");
      return;
    }

    const lead = {
      name,
      phone,
      email,
      program,
      university,
      source: "Website",
      submittedAt: new Date().toISOString()
    };

    try {
      await sendLeadToCrm(lead);

      alert("✅ Submitted Successfully!");

      /* 🔥 WhatsApp Redirect */
      window.location.href = `https://wa.me/91XXXXXXXXXX?text=Hi, I am interested in MBA. Name: ${name}, Phone: ${phone}`;

      form.reset();

    } catch (error) {

      alert("⚠️ Submission failed. Try again.");

    }
  });

});
