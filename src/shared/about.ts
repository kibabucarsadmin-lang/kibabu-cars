/** About page text (editable in Admin → About). */
export interface AboutContent {
  heroTitle: string;
  storyTitle: string;
  story: string[]; // paragraphs
  valuesTitle: string;
  values: { t: string; d: string }[];
}

export const ABOUT: AboutContent = {
  heroTitle: 'A Stone Town business, run by people who live here.',
  storyTitle: '13 years of handing over keys',
  story: [
    'Kibabu Cars was started in Stone Town by a young Zanzibari with a simple idea: run a rental company the way visitors expect one to run, with clear prices, cars that are looked after, and someone who answers the phone.',
    'Today we have more than 50 vehicles and have completed over 1,000 rentals for guests from all over the world. We are not a booking platform. We are the people who meet you at arrivals, arrange your driving permit, and come out at night if you get a flat tyre.',
  ],
  valuesTitle: 'What you can count on',
  values: [
    { t: 'Honest prices', d: 'Insurance, unlimited km and airport delivery in the daily rate. Extras are shown before you book.' },
    { t: 'Cars that are looked after', d: 'Every car is cleaned and checked between rentals. If one breaks down, we bring another.' },
    { t: 'Your permit, sorted', d: 'We prepare your Zanzibar driving permit before you land, so you can drive straight away.' },
    { t: 'Someone always answers', d: 'Call or WhatsApp us day or night, for anything from directions to a flat tyre.' },
  ],
};
