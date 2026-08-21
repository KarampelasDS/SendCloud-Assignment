const MAX_SCHEDULE_DAYS = 40;
const MAX_SCHEDULE_MS = MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000;

function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 19);
}

export function initSchedule(form: HTMLFormElement): void {
  const modeRadios = form.querySelectorAll<HTMLInputElement>(
    'input[name="schedule_mode"]',
  );
  const later = form.querySelector<HTMLInputElement>("#schedule_later");
  const fields = form.querySelector<HTMLElement>("#schedule_fields");
  const picker = form.querySelector<HTMLInputElement>("#schedule_datetime");
  const summary = form.querySelector<HTMLElement>("#schedule_summary");
  const message = form.querySelector<HTMLElement>("#schedule_datetime_message");

  if (!later || !fields || !picker || !summary || !message) {
    return;
  }

  const scheduleLater = later;
  const scheduleFields = fields;
  const dateTimePicker = picker;
  const scheduleSummary = summary;
  const dateMessage = message;

  function setMessage(text: string, valid: boolean) {
    dateMessage.textContent = text;
    dateMessage.classList.toggle("field_message_ok", valid);
    dateMessage.classList.toggle("field_message_error", !valid);
    dateTimePicker.setAttribute("aria-invalid", String(!valid));
  }

  function validate() {
    if (!scheduleLater.checked) {
      dateMessage.textContent = "";
      dateMessage.className = "field_message";
      dateTimePicker.setAttribute("aria-invalid", "false");
      return;
    }

    if (!dateTimePicker.value) {
      setMessage("Please select a date and time.", false);
    } else if (new Date(dateTimePicker.value).getTime() <= Date.now()) {
      setMessage("The date must be in the future.", false);
    } else if (
      new Date(dateTimePicker.value).getTime() >
      Date.now() + MAX_SCHEDULE_MS
    ) {
      setMessage(
        `Shipments can be scheduled at most ${MAX_SCHEDULE_DAYS} days ahead.`,
        false,
      );
    } else {
      setMessage("", true);
    }
  }

  function update() {
    const later = scheduleLater.checked;
    scheduleFields.style.display = later ? "flex" : "none";
    dateTimePicker.required = later;
    const now = new Date();
    dateTimePicker.min = toLocalInputValue(now);
    dateTimePicker.max = toLocalInputValue(
      new Date(now.getTime() + MAX_SCHEDULE_MS),
    );
    scheduleSummary.textContent = later
      ? "Your shipment will be sent on the selected date."
      : "Your shipment will be sent immediately.";
    validate();
  }

  modeRadios.forEach((radio) => radio.addEventListener("change", update));
  dateTimePicker.addEventListener("input", validate);
  update();
}
