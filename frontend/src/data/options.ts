export interface SelectOption {
  value: string;
  label: string;
}

export const COUNTRIES: SelectOption[] = [
  { value: "NL", label: "The Netherlands" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "PT", label: "Portugal" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States of America" },
];

export const EXPORT_REASONS: SelectOption[] = [
  { value: "commercial_goods", label: "Commercial goods" },
  { value: "gift", label: "Gift" },
  { value: "documents", label: "Documents" },
];

export const CUSTOMS_COUNTRIES = ["GB", "US"];
