export interface TermsAndConditions {
  title: string;
  content: string;
  updated_at?: string;
}

const DEFAULT_TERMS_CONTENT = `Please read these terms carefully before confirming your appointment. They are designed to protect both the client and therapist to support a safe and professional mobile massage service.

Last Updated
- 16/09/2026

Client Responsibilities
- You must be 18 years or over to book and receive treatment.
- You must provide accurate and up-to-date personal, health and booking information, including your address and any relevant parking or access information. Please notify MMT at contact@maggsymassagetherapy.com as soon as possible if any booking information changes.
- You must provide a clean, safe, and sufficiently spacious area for the massage table and treatment.
- You must ensure clear and safe access to the property and treatment area.
- You must be available and ready for your appointment at the agreed time. If you are late, your treatment time may be reduced where necessary to accommodate subsequent appointments, with the full appointment fee remaining payable.
- If you are not present or available at the agreed time, the therapist will attempt to contact you. If you cannot be reached within a reasonable period, the appointment may be treated as a no-show, and the full appointment fee may remain payable.

Health Disclosure
- You must disclose any relevant medical conditions, injuries, allergies, pregnancy, recent surgery, medication, or other health concerns before treatment.
- You must inform the therapist of any relevant changes to your health before your appointment.
- The therapist may adapt, postpone, or refuse treatment where they consider it inappropriate or unsafe to proceed.
- Where your needs fall outside the therapist's scope of practice, training or professional competence, you may be advised to seek assessment or treatment from an appropriate sports or healthcare professional.

Booking Confirmation & Address Changes
- Treatment will take place at the address provided during booking.
- You must notify Maggsy MT as soon as possible if your address, access arrangements or other details affecting the appointment change.
- Failure to provide accurate or updated information may result in delays, additional charges where applicable, rescheduling, or cancellation.

Treatment & Results
- Sports massage is intended to support general wellbeing, recovery, mobility, and physical performance. It is not a substitute for medical diagnosis, medical treatment, or other healthcare services.
- Individual responses to treatment vary, and no specific outcome or result is guaranteed.

Therapist Responsibilities
- The therapist will act professionally, maintain appropriate hygiene standards and provide treatment within the limits of their training, qualifications, professional competence, and insurance.
- Client information will be handled confidentially and in accordance with applicable data protection requirements, except where disclosure is required by law or necessary to protect health and safety.
- The therapist may refuse or end treatment where they consider it unsafe, inappropriate or outside their professional scope, or where inappropriate behavior occurs.

Health & Safety
- Treatment will not be provided where the therapist considers it unsafe or inappropriate to proceed, including circumstances involving contagious illness, intoxication, or relevant contraindications.
- Clients must ensure that pets, children, and other household activities or disruptions are appropriately managed during the appointment to allow treatment to be carried out safely and professionally.

Payment Terms
- Payment is required in full at the time of booking, unless an alternative arrangement has been agreed in writing with Maggsy MT.
- The price displayed at the time of booking applies to the treatment selected and confirmed at payment.
- Any additional treatment time or services requested during an appointment will be agreed with the client before being provided and may incur an additional charge.

Cancellations and Changes
- Please provide at least 24 hours' notice to cancel or reschedule an appointment.
- Appointments cancelled or rescheduled with at least 24 hours' notice may be rescheduled or refunded, subject to the terms of the booking.
- Cancellations or rescheduling requests made with less than 24 hours' notice may be subject to a cancellation charge of up to the full booking fee.
- Missed appointments or no shows may be charged up to the full booking fee.
- Cancellation charges and refunds will be applied fairly and proportionately and in accordance with applicable consumer law.
- If Maggsy MT needs to be canceled due to illness, emergency, unsafe travel conditions or circumstances beyond reasonable control, an alternative appointment or full refund will be offered.

Privacy & Record Keeping
- Personal information, including relevant health information, will be collected and stored within applicable data protection requirements.
- Treatment and booking records will be retained for up to 7 years, unless a longer retention period is required by law, professional requirements, or insurance obligations. Records will be stored securely in a password-protected system with access restricted to the therapist.

Complaints
- If you have a concern or complaint about your treatment or service, please contact Maggsy MT as soon as possible using the contact details provided on the website.
- Complaints will be reviewed fairly and reasonably, with the aim of resolving them promptly.
- Where necessary, the therapist may request further information to investigate the complaint.

Client Conduct
- Clients must behave respectfully and professionally towards the therapist.
- Abusive, threatening, discriminatory, sexual, or otherwise inappropriate behavior will not be tolerated.
- The therapist reserves the right to end treatment immediately if inappropriate behavior occurs. The appointment may be charged in full.

Statutory Rights
- Nothing in these Terms & Conditions affects your statutory rights under applicable UK consumer law.`;

export const DEFAULT_TERMS_AND_CONDITIONS: TermsAndConditions = {
  title: "MMT Massage Terms & Conditions",
  content: DEFAULT_TERMS_CONTENT,
};

export const TERMS_AND_CONDITIONS = DEFAULT_TERMS_AND_CONDITIONS;

export const TERMS_ACCEPTANCE_LABEL = "I have read and accept the terms and conditions";

export function normalizeTermsAndConditions(value: unknown): TermsAndConditions | null {
  if (!value || typeof value !== "object") return null;
  const termsRecord = value as Record<string, unknown>;

  const title = typeof termsRecord.title === "string" ? termsRecord.title.trim() : "";
  const content = typeof termsRecord.content === "string" ? termsRecord.content.trim() : "";
  const updated_at = typeof termsRecord.updated_at === "string" && termsRecord.updated_at.trim().length > 0 ? termsRecord.updated_at : undefined;

  if (!title || !content) return null;

  return {
    title,
    content,
    updated_at,
  };
}
