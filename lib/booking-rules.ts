export const MINIMUM_BOOKING_AGE = 18;

const UK_POSTCODE_REGEX =
  /^(GIR 0AA|(?:[A-PR-UWYZ][0-9][0-9A-HJKPSTUW]?|[A-PR-UWYZ][A-HK-Y][0-9][0-9ABEHMNPRVWXY]?)[ ]?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

function parseDateOfBirth(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

export function getAgeFromDateOfBirth(value: string, today: Date = new Date()) {
  const parsedDate = parseDateOfBirth(value);
  if (!parsedDate) return null;

  let age = today.getUTCFullYear() - parsedDate.getUTCFullYear();
  const currentMonth = today.getUTCMonth();
  const birthMonth = parsedDate.getUTCMonth();

  if (
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && today.getUTCDate() < parsedDate.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}

export function getAgeValidation(value: string) {
  if (!value) {
    return { age: null, isAdult: false, error: "" };
  }

  const age = getAgeFromDateOfBirth(value);
  if (age === null) {
    return {
      age: null,
      isAdult: false,
      error: "Date of birth must be a valid date in YYYY-MM-DD format.",
    };
  }

  if (age < MINIMUM_BOOKING_AGE) {
    return {
      age,
      isAdult: false,
      error: `You must be at least ${MINIMUM_BOOKING_AGE} years old to book a massage.`,
    };
  }

  return { age, isAdult: true, error: "" };
}

export function normalizePostcode(value: string) {
  const compact = value.trim().toUpperCase().replace(/\s+/g, "");
  if (compact.length <= 3) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function isValidUkPostcode(value: string) {
  if (!value.trim()) return false;
  return UK_POSTCODE_REGEX.test(normalizePostcode(value));
}
