/** Canonical public contact details. Phone and WhatsApp are distinct channels. */
export const CONTACT = {
  email: "support@rocobroker.com",
  phone: {
    e164: "+447401131099",
    display: "+44 7401 131099",
  },
  whatsapp: {
    e164: "+447723179486",
    display: "+44 7723 179486",
    url: "https://api.whatsapp.com/send/?phone=%2B447723179486&text&type=phone_number&app_absent=0",
  },
  telegram: {
    handle: "@RocoBrokersupport",
    url: "https://t.me/RocoBrokersupport",
  },
  social: {
    instagram: "https://www.instagram.com/rocobroker/",
    linkedin: "https://www.linkedin.com/company/rocobroker/",
  },
  offices: [
    "147 Blv Svetog Petra Cetinjskog UI 2 Sp 3 St 5, Podgorica, Montenegro, 81000",
    "Concord Business Center, 334 90th South Street, New Cairo, Egypt",
  ],
  registeredAddress: "Bonovo Road, Fomboni, Island of Mohéli, Comoros Union",
} as const;
