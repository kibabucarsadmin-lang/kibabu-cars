/** Blog posts. Add a new object to publish a post; it gets its own SEO page at /blog/<slug>. */
export interface BlogBlock { h?: string; p?: string; list?: string[]; tip?: string; }
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO
  minutes: number;
  tag: string;
  cover: { src: string; fallback?: string; alt: string };
  body: BlogBlock[];
}

export const BLOG: BlogPost[] = [
  {
    slug: 'zanzibar-driving-permit',
    title: 'The Zanzibar driving permit, explained',
    excerpt: 'Every visitor who drives in Zanzibar needs a local permit, even with an international licence. Here is what it is, what it costs and how we sort it before you land.',
    date: '2026-11-10', minutes: 4, tag: 'Before you drive',
    cover: { src: 'cars/rav4-3-door.jpg', alt: 'A Kibabu Cars RAV4 ready for pickup' },
    body: [
      { p: 'Zanzibar has its own driving rules, and visitors need a local Zanzibar driving permit to drive here. Your licence from home and an international driving permit are not enough on their own, so it is worth sorting before you arrive.' },
      { h: 'What it costs' },
      { p: 'The permit is $25 per driver. Every person who will drive the car needs their own permit, and it is added to every Kibabu Cars booking automatically, so there is nothing to remember.' },
      { h: 'What we need from you' },
      { list: ['A photo or scan of your driving licence', 'A copy of your passport photo page', 'A passport-size photo', 'For airport pickups, your passport number and flight number in the booking form'] },
      { p: 'Send these on WhatsApp after you book. We prepare the permit so it is ready with the car when you collect it.' },
      { tip: 'You may not drive before the permit is issued, so send your documents a few days before you travel.' },
      { h: 'Carry it with you' },
      { p: 'Police checkpoints are common on the island. Keep your licence, the Zanzibar permit and the rental paperwork in the car at all times.' },
    ],
  },
  {
    slug: 'airport-pickup-what-to-expect',
    title: 'Landing at Zanzibar airport: how car pickup works',
    excerpt: 'From the moment your plane lands to the moment you drive away. A simple walk-through of a Kibabu Cars airport handover.',
    date: '2026-11-03', minutes: 3, tag: 'Arriving',
    cover: { src: 'cars/rav4-new-shape.jpg', alt: 'A Kibabu Cars RAV4 by the Zanzibar seafront' },
    body: [
      { p: 'Airport delivery is free with every rental, day or night. Here is what happens, step by step.' },
      { h: 'Before you fly' },
      { p: 'When you book an airport pickup, the form asks for your flight number and passport number. We use the flight number to follow your arrival time, and the passport number for your driving permit. If your flight is delayed, there is nothing to do: we adjust the handover to your new arrival time.' },
      { h: 'When you land' },
      { list: ['Collect your bags and walk out of arrivals', 'A Kibabu Cars team member meets you outside the terminal', 'Walk around the car together and note any marks', 'Sign the rental agreement, receive your permit and pay the balance in cash or by card'] },
      { tip: 'Fuel works empty-to-empty: return the car with about the same level you received it. No need to fill the tank.' },
      { h: 'Returning the car' },
      { p: 'Dropping off at the airport is free too. Tell us your departure time and we meet you at the car park before check-in.' },
    ],
  },
  {
    slug: 'driving-in-zanzibar-tips',
    title: 'Driving in Zanzibar: 9 tips for your first time',
    excerpt: 'Left-hand traffic, speed bumps, police checkpoints and sandy beach roads. Everything we tell our guests before they set off.',
    date: '2026-10-24', minutes: 5, tag: 'Before you drive',
    cover: { src: 'cars/suzuki-escudo.jpg', alt: 'A Suzuki Escudo parked by the sea in Zanzibar' },
    body: [
      { p: 'Driving yourself is the best way to see Zanzibar at your own pace. The main roads are paved and quiet, but a few things are different from home.' },
      { list: [
        'Drive on the left. Take the first few roundabouts slowly.',
        'Watch for speed bumps, especially when entering villages. Many are not painted.',
        'Share the road with bicycles, motorbikes, pedestrians and the occasional goat.',
        'Police checkpoints are normal. Slow down, smile and have your licence, permit and rental papers ready.',
        'Some roads have speed cameras. Keep to the posted limits.',
        'Night driving is allowed but needs extra care: lighting is limited outside towns.',
        'You don’t always need a 4x4, but it is more comfortable on the sandy tracks to quieter beaches.',
        'Use your phone for navigation; download offline maps before you leave the hotel.',
        'If anything goes wrong, call or WhatsApp us. We are available day and night.',
      ] },
      { tip: 'Traffic fines are the driver’s responsibility. If you receive one, tell us and we will explain what to do.' },
    ],
  },
  {
    slug: 'which-car-for-zanzibar',
    title: 'Which car should you rent in Zanzibar?',
    excerpt: 'A couple on a beach break needs a very different car from a family of six with surfboards. A quick guide to our fleet.',
    date: '2026-10-15', minutes: 4, tag: 'Choosing a car',
    cover: { src: 'cars/toyota-alphard.jpg', alt: 'A Toyota Alphard in Stone Town' },
    body: [
      { p: 'All our cars are automatic with air conditioning. The right one depends on how many of you there are, how much luggage you carry and which roads you plan to drive.' },
      { h: 'Two people, light luggage' },
      { p: 'The Nissan Juke is our lowest fixed price and easy to park in Stone Town. If you want 4x4 for beach tracks, the Toyota RAV4 3-door is the classic island choice.' },
      { h: 'Families of four or five' },
      { p: 'The RAV4 5-door is the most popular car on the island. The Vanguard gives you more room for suitcases, and the RAV4 new shape is the newer, more refined option.' },
      { h: 'Groups of six or seven' },
      { p: 'The Toyota Alphard is a spacious minivan with sliding doors. If you want 4x4 for a big group, choose the Land Cruiser Prado.' },
      { tip: 'Booking 7 days or more? Every car except the Juke is $5 cheaper per day, applied automatically.' },
    ],
  },
  {
    slug: 'one-week-zanzibar-road-trip',
    title: 'A one-week road trip around Zanzibar',
    excerpt: 'Stone Town, Jozani Forest, the east-coast lagoons and the northern beaches. A relaxed seven-day loop with a rental car.',
    date: '2026-10-05', minutes: 6, tag: 'Road trips',
    cover: { src: 'cars/land-cruiser-prado.jpg', alt: 'A Toyota Land Cruiser Prado in Zanzibar' },
    body: [
      { p: 'Unguja, Zanzibar’s main island, is small enough to drive end to end in under two hours. That makes it perfect for a road trip with a few bases rather than daily long drives.' },
      { h: 'Days 1–2: Stone Town' },
      { p: 'Collect your car at the airport, 15 minutes from town. Explore the old town on foot, then drive to the Forodhani night food market at sunset.' },
      { h: 'Day 3: Jozani Forest' },
      { p: 'About 45 minutes from Stone Town. Walk the mangrove boardwalk and look for red colobus monkeys, then continue to the east coast.' },
      { h: 'Days 4–5: Paje and Jambiani' },
      { p: 'Kitesurf lagoons, beach cafés and quiet village beaches. Base yourself here and take short drives along the coast.' },
      { h: 'Days 6–7: Nungwi and Kendwa' },
      { p: 'Drive north for swimming at any tide and sunsets over the water. From Nungwi it is around an hour and a quarter back to the airport.' },
      { tip: 'Staying at a coastal hotel? We can deliver the car there for $20 and collect it for $20.' },
    ],
  },
];
