export interface FaqItem { q: string; a: string; }
export interface FaqGroup { id: string; title: string; icon: string; items: FaqItem[]; }

/** FAQ content (from kibabucars.com, condensed). Edit freely. */
export const FAQ: FaqGroup[] = [
  {
    id: 'booking', title: 'Booking & payment', icon: 'event_available',
    items: [
      { q: 'How do I book?', a: 'Book online in about 2 minutes, or send us a WhatsApp message with your dates, times, preferred car and pickup location. Online bookings are confirmed instantly when the car is free for your dates.' },
      { q: 'How does payment work?', a: 'You choose when you book: pay the full amount now through a payment link we send you on WhatsApp and email, or pay the full amount when you collect the car.' },
      { q: 'Is there a security deposit on the car?', a: 'No. Nothing extra is held on your card. You only pay the rental price.' },
      { q: 'What payment methods do you accept?', a: 'Paying now: by card through the payment link we send you. Paying at pickup: in cash or by card when you collect the car. We tell you about any card fee before you pay.' },
      { q: 'What is the minimum rental period?', a: 'Two days. Rentals are priced per day; there is no separate monthly rate, but long rentals get the long-term discount automatically.' },
      { q: 'Do you give discounts for longer rentals?', a: 'Yes. Book 7 days or more and every day is $5 cheaper, applied automatically in your quote. The Nissan Juke is the exception: it is already our lowest fixed price.' },
      { q: 'What if I return the car a few hours late?', a: 'Days are counted in 24-hour blocks from pickup. If you go over by 1 to 5 hours, the extra time is free (our grace period). 6 hours or more counts as one more day. The grace period does not apply to the Nissan Juke.' },
      { q: 'Can I change or cancel my booking?', a: 'Yes. Cancellation is free before the scheduled pickup – use “My booking” or contact us. No-shows are non-refundable. Changes depend on availability.' },
      { q: 'What if my flight is delayed?', a: 'Just send us your updated flight details – we adjust the handover to your new arrival time.' },
    ],
  },
  {
    id: 'included', title: 'Prices & what’s included', icon: 'verified',
    items: [
      { q: 'What is included in the price?', a: 'Basic insurance (per the rental agreement), unlimited kilometres, taxes, free delivery and collection at the airport and in Stone Town, and 24/7 support. The Zanzibar driving permit ($25 per driver) is added to every booking.' },
      { q: 'Are there hidden charges?', a: 'No. Any extras (e.g. coastal delivery, driving permit) are shown in your quote before you confirm.' },
      { q: 'What does insurance not cover?', a: 'Tyres and rims, mirrors and glass, keys, underbody damage, negligence or misuse, unauthorised drivers, impaired driving and traffic fines.' },
      { q: 'What is the fuel policy?', a: 'Empty-to-empty: return the car with about the same fuel level as when you received it. No need to fill up.' },
      { q: 'Are baby seats available?', a: 'Yes, free of charge. Just request them when booking.' },
    ],
  },
  {
    id: 'permit', title: 'Zanzibar driving permit', icon: 'badge',
    items: [
      { q: 'Do I need a Zanzibar driving permit?', a: 'Yes. Foreign visitors must have a local Zanzibar driving permit, even with an international licence. You may not drive before you have it.' },
      { q: 'Can you arrange the permit for me?', a: 'Yes, and it is part of every booking: $25 per driver. Every person who drives needs their own permit.' },
      { q: 'What documents do you need for the permit?', a: 'A valid driving licence, a copy of your passport and a passport-size photo. Send them before arrival so the permit is ready when you land.' },
    ],
  },
  {
    id: 'delivery', title: 'Delivery & return', icon: 'local_shipping',
    items: [
      { q: 'Is airport delivery free?', a: 'Yes. Delivery and collection at Zanzibar Airport is free, including late-night flights. When you book an airport pickup we ask for your flight number and passport number, so we can track your arrival and prepare your driving permit.' },
      { q: 'Do you deliver to my hotel?', a: 'Yes. Stone Town is free. Coastal hotels and villas (Nungwi, Kendwa, Paje, Jambiani, etc.) are $20 for delivery and $20 for collection. Share your hotel name when booking.' },
      { q: 'How is a rental day counted?', a: 'In 24-hour periods from your agreed pickup time.' },
      { q: 'Can I return the car somewhere else?', a: 'Usually yes – choose a different return location when booking. A collection fee may apply for coastal areas.' },
      { q: 'Can I return early or extend?', a: 'You can extend subject to availability (tell us before your return time). Early returns are allowed but unused days are not automatically refunded.' },
    ],
  },
  {
    id: 'drivers', title: 'Drivers & driving in Zanzibar', icon: 'person',
    items: [
      { q: 'How old do I need to be?', a: 'At least 18, and you must have held your licence for at least one year.' },
      { q: 'Can more than one person drive?', a: 'Yes. Add extra drivers when booking – each needs their licence and a Zanzibar permit.' },
      { q: 'Which side of the road do you drive on?', a: 'The left. Watch out for pedestrians, cyclists, motorbikes, animals and speed bumps, and take extra care at night.' },
      { q: 'Do I need a 4x4?', a: 'Not always. Main roads are paved, but a 4x4 such as the RAV4 or Escudo is more comfortable on sandy beach roads and village tracks.' },
      { q: 'Can I take the car off the island?', a: 'No, not without written permission. Extreme off-road driving, racing and smoking in the car are not allowed.' },
    ],
  },
  {
    id: 'support', title: 'Breakdowns & support', icon: 'support_agent',
    items: [
      { q: 'What if the car breaks down?', a: 'Call or WhatsApp us immediately – we are available 24/7. If it can’t be fixed on the spot, we bring you another car.' },
      { q: 'What do I do after an accident?', a: 'Make sure everyone is safe, contact the authorities if needed and call us right away. Don’t leave the scene or arrange private settlements.' },
      { q: 'Which car is best for me?', a: 'Couples: Nissan Juke or RAV4 3-door. Families: RAV4 5-door or Vanguard. Large groups: Toyota Alphard. Maximum comfort: Harrier or Land Cruiser Prado.' },
    ],
  },
];
