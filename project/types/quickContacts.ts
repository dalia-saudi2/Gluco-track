export type NamedPhoneContact = {
  name: string;
  phone: string;
};

export type QuickContacts = {
  emergency_contacts: NamedPhoneContact[];
  labs: NamedPhoneContact[];
  pharmacies: NamedPhoneContact[];
};

export const EMPTY_QUICK_CONTACTS: QuickContacts = {
  emergency_contacts: [
    { name: '', phone: '' },
    { name: '', phone: '' },
  ],
  labs: [
    { name: '', phone: '' },
    { name: '', phone: '' },
  ],
  pharmacies: [
    { name: '', phone: '' },
    { name: '', phone: '' },
  ],
};
