/**
 * Canonical legal and regulatory details used across the website.
 *
 * Keep identifiers out of translations and components. Any future compliance
 * change should be made here once it has been approved and verified.
 */
export const COMPLIANCE = {
  companyName: "Roco Broker LTD",
  registrationNumber: "HT01024109",
  licenseNumber: "BFX2024190",
  regulatorName: "Mwali International Services Authority (MISA)",
  regulatorShortName: "MISA",
  registryUrl:
    "https://mwaliregistrar.com/list_of_entities/authorised_brokerage_companies.html",
} as const;

/** Values shared by next-intl messages containing regulatory placeholders. */
export const COMPLIANCE_MESSAGE_VALUES = {
  companyName: COMPLIANCE.companyName,
  registrationNumber: COMPLIANCE.registrationNumber,
  licenseNumber: COMPLIANCE.licenseNumber,
  regulatorName: COMPLIANCE.regulatorName,
  regulatorShortName: COMPLIANCE.regulatorShortName,
};
