export function initSchedule(form: HTMLFormElement): void {
  const scheduleLater = form.querySelector<HTMLInputElement>("#schedule_later");
  const scheduleFields = form.querySelector<HTMLElement>("#schedule_fields");
  const modeRadios = form.querySelectorAll<HTMLInputElement>(
    'input[name="schedule_mode"]',
  );
  const dateTimePicker =
    form.querySelector<HTMLInputElement>("#schedule_datetime");
  const scheduleSummary = form.querySelector<HTMLElement>("#schedule_summary");
  const dateMessage = form.querySelector<HTMLElement>(
    "#schedule_datetime_message",
  );

  if (
    !scheduleLater ||
    !scheduleFields ||
    !dateTimePicker ||
    !scheduleSummary ||
    !dateMessage
  ) {
    return;
  }

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
    } else {
      setMessage("", true);
    }
  }

  function update() {
    const later = scheduleLater.checked;
    scheduleFields.style.display = later ? "flex" : "none";
    dateTimePicker.required = later;
    scheduleSummary.textContent = later
      ? "Your shipment will be sent on the selected date."
      : "Your shipment will be sent immediately.";
    validate();
  }

  modeRadios.forEach((radio) => radio.addEventListener("change", update));
  dateTimePicker.addEventListener("input", validate);
  update();
}
