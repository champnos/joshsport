create table if not exists terms_and_conditions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  intro text not null,
  sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into terms_and_conditions (id, title, intro, sections)
values (
  '11111111-1111-1111-1111-111111111111',
  $title$MMT Massage Terms & Conditions$title$,
  $intro$Please read these terms carefully before confirming your appointment. They are designed to protect both the client and therapist to support a safe and professional mobile massage service.$intro$,
  jsonb_build_array(
      jsonb_build_object(
        'title', $s0$Last Updated$s0$,
        'bullets', jsonb_build_array(
        $b0_0$16/09/2026$b0_0$
        )
      ),
      jsonb_build_object(
        'title', $s1$Client Responsibilities$s1$,
        'bullets', jsonb_build_array(
        $b1_0$You must be 18 years or over to book and receive treatment.$b1_0$,
        $b1_1$You must provide accurate and up-to-date personal, health and booking information, including your address and any relevant parking or access information. Please notify MMT at contact@maggsymassagetherapy.com as soon as possible if any booking information changes.$b1_1$,
        $b1_2$You must provide a clean, safe, and sufficiently spacious area for the massage table and treatment.$b1_2$,
        $b1_3$You must ensure clear and safe access to the property and treatment area.$b1_3$,
        $b1_4$You must be available and ready for your appointment at the agreed time. If you are late, your treatment time may be reduced where necessary to accommodate subsequent appointments, with the full appointment fee remaining payable.$b1_4$,
        $b1_5$If you are not present or available at the agreed time, the therapist will attempt to contact you. If you cannot be reached within a reasonable period, the appointment may be treated as a no-show, and the full appointment fee may remain payable.$b1_5$
        )
      ),
      jsonb_build_object(
        'title', $s2$Health Disclosure$s2$,
        'bullets', jsonb_build_array(
        $b2_0$You must disclose any relevant medical conditions, injuries, allergies, pregnancy, recent surgery, medication, or other health concerns before treatment.$b2_0$,
        $b2_1$You must inform the therapist of any relevant changes to your health before your appointment.$b2_1$,
        $b2_2$The therapist may adapt, postpone, or refuse treatment where they consider it inappropriate or unsafe to proceed.$b2_2$,
        $b2_3$Where your needs fall outside the therapist's scope of practice, training or professional competence, you may be advised to seek assessment or treatment from an appropriate sports or healthcare professional.$b2_3$
        )
      ),
      jsonb_build_object(
        'title', $s3$Booking Confirmation & Address Changes$s3$,
        'bullets', jsonb_build_array(
        $b3_0$Treatment will take place at the address provided during booking.$b3_0$,
        $b3_1$You must notify Maggsy MT as soon as possible if your address, access arrangements or other details affecting the appointment change.$b3_1$,
        $b3_2$Failure to provide accurate or updated information may result in delays, additional charges where applicable, rescheduling, or cancellation.$b3_2$
        )
      ),
      jsonb_build_object(
        'title', $s4$Treatment & Results$s4$,
        'bullets', jsonb_build_array(
        $b4_0$Sports massage is intended to support general wellbeing, recovery, mobility, and physical performance. It is not a substitute for medical diagnosis, medical treatment, or other healthcare services.$b4_0$,
        $b4_1$Individual responses to treatment vary, and no specific outcome or result is guaranteed.$b4_1$
        )
      ),
      jsonb_build_object(
        'title', $s5$Therapist Responsibilities$s5$,
        'bullets', jsonb_build_array(
        $b5_0$The therapist will act professionally, maintain appropriate hygiene standards and provide treatment within the limits of their training, qualifications, professional competence, and insurance.$b5_0$,
        $b5_1$Client information will be handled confidentially and in accordance with applicable data protection requirements, except where disclosure is required by law or necessary to protect health and safety.$b5_1$,
        $b5_2$The therapist may refuse or end treatment where they consider it unsafe, inappropriate or outside their professional scope, or where inappropriate behavior occurs.$b5_2$
        )
      ),
      jsonb_build_object(
        'title', $s6$Health & Safety$s6$,
        'bullets', jsonb_build_array(
        $b6_0$Treatment will not be provided where the therapist considers it unsafe or inappropriate to proceed, including circumstances involving contagious illness, intoxication, or relevant contraindications.$b6_0$,
        $b6_1$Clients must ensure that pets, children, and other household activities or disruptions are appropriately managed during the appointment to allow treatment to be carried out safely and professionally.$b6_1$
        )
      ),
      jsonb_build_object(
        'title', $s7$Payment Terms$s7$,
        'bullets', jsonb_build_array(
        $b7_0$Payment is required in full at the time of booking, unless an alternative arrangement has been agreed in writing with Maggsy MT.$b7_0$,
        $b7_1$The price displayed at the time of booking applies to the treatment selected and confirmed at payment.$b7_1$,
        $b7_2$Any additional treatment time or services requested during an appointment will be agreed with the client before being provided and may incur an additional charge.$b7_2$
        )
      ),
      jsonb_build_object(
        'title', $s8$Cancellations and Changes$s8$,
        'bullets', jsonb_build_array(
        $b8_0$Please provide at least 24 hours' notice to cancel or reschedule an appointment.$b8_0$,
        $b8_1$Appointments cancelled or rescheduled with at least 24 hours' notice may be rescheduled or refunded, subject to the terms of the booking.$b8_1$,
        $b8_2$Cancellations or rescheduling requests made with less than 24 hours' notice may be subject to a cancellation charge of up to the full booking fee.$b8_2$,
        $b8_3$Missed appointments or no shows may be charged up to the full booking fee.$b8_3$,
        $b8_4$Cancellation charges and refunds will be applied fairly and proportionately and in accordance with applicable consumer law.$b8_4$,
        $b8_5$If Maggsy MT needs to be canceled due to illness, emergency, unsafe travel conditions or circumstances beyond reasonable control, an alternative appointment or full refund will be offered.$b8_5$
        )
      ),
      jsonb_build_object(
        'title', $s9$Privacy & Record Keeping$s9$,
        'bullets', jsonb_build_array(
        $b9_0$Personal information, including relevant health information, will be collected and stored within applicable data protection requirements.$b9_0$,
        $b9_1$Treatment and booking records will be retained for up to 7 years, unless a longer retention period is required by law, professional requirements, or insurance obligations. Records will be stored securely in a password-protected system with access restricted to the therapist.$b9_1$
        )
      ),
      jsonb_build_object(
        'title', $s10$Complaints$s10$,
        'bullets', jsonb_build_array(
        $b10_0$If you have a concern or complaint about your treatment or service, please contact Maggsy MT as soon as possible using the contact details provided on the website.$b10_0$,
        $b10_1$Complaints will be reviewed fairly and reasonably, with the aim of resolving them promptly.$b10_1$,
        $b10_2$Where necessary, the therapist may request further information to investigate the complaint.$b10_2$
        )
      ),
      jsonb_build_object(
        'title', $s11$Client Conduct$s11$,
        'bullets', jsonb_build_array(
        $b11_0$Clients must behave respectfully and professionally towards the therapist.$b11_0$,
        $b11_1$Abusive, threatening, discriminatory, sexual, or otherwise inappropriate behavior will not be tolerated.$b11_1$,
        $b11_2$The therapist reserves the right to end treatment immediately if inappropriate behavior occurs. The appointment may be charged in full.$b11_2$
        )
      ),
      jsonb_build_object(
        'title', $s12$Statutory Rights$s12$,
        'bullets', jsonb_build_array(
        $b12_0$Nothing in these Terms & Conditions affects your statutory rights under applicable UK consumer law.$b12_0$
        )
      )
  )
)
on conflict (id) do nothing;
