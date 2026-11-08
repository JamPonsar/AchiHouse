// Starting content for the website. The first time the site runs, this is
// copied into the database. After that, all edits happen in /admin.
// All text here is placeholder copy, to be replaced with real wording later.

const p = (n) => `/photos/photo-${String(n).padStart(2, "0")}.jpg`;

const photos = [
  // Our space
  { id: "ph01", src: p(1), caption: "The main hall set up for a gathering", eventId: "", album: "Our Space" },
  { id: "ph27", src: p(27), caption: "The hall during a teaching", eventId: "", album: "Our Space" },
  { id: "ph16", src: p(16), caption: "The shrine at Achi House", eventId: "", album: "Our Space" },
  { id: "ph26", src: p(26), caption: "Outside Achi House", eventId: "", album: "Our Space" },
  // Blessing ceremony
  { id: "ph25", src: p(25), caption: "Community members and visiting lamas", eventId: "ev-blessing", album: "" },
  { id: "ph04", src: p(4), caption: "The shrine prepared for the ceremony", eventId: "ev-blessing", album: "" },
  { id: "ph08", src: p(8), caption: "Lamas leading prayers", eventId: "ev-blessing", album: "" },
  { id: "ph13", src: p(13), caption: "Morning prayers", eventId: "ev-blessing", album: "" },
  { id: "ph11", src: p(11), caption: "Monks at the head table", eventId: "ev-blessing", album: "" },
  { id: "ph18", src: p(18), caption: "Offerings and prayers", eventId: "ev-blessing", album: "" },
  { id: "ph17", src: p(17), caption: "Monks during the ceremony", eventId: "ev-blessing", album: "" },
  // Losar
  { id: "ph10", src: p(10), caption: "Traditional dance performance", eventId: "ev-losar", album: "" },
  { id: "ph03", src: p(3), caption: "Offering khata at the shrine", eventId: "ev-losar", album: "" },
  { id: "ph02", src: p(2), caption: "Families gathered for Losar", eventId: "ev-losar", album: "" },
  { id: "ph12", src: p(12), caption: "Losar celebration", eventId: "ev-losar", album: "" },
  { id: "ph14", src: p(14), caption: "Celebrating the new year together", eventId: "ev-losar", album: "" },
  // Saga Dawa
  { id: "ph06", src: p(6), caption: "Community prayer session", eventId: "ev-sagadawa", album: "" },
  { id: "ph21", src: p(21), caption: "A full hall for Saga Dawa", eventId: "ev-sagadawa", album: "" },
  { id: "ph15", src: p(15), caption: "Saga Dawa gathering", eventId: "ev-sagadawa", album: "" },
  { id: "ph19", src: p(19), caption: "Prayers and recitation", eventId: "ev-sagadawa", album: "" },
  // Graduation
  { id: "ph05", src: p(5), caption: "Graduates with their certificates", eventId: "ev-graduation", album: "" },
  { id: "ph07", src: p(7), caption: "Medals ready for the graduates", eventId: "ev-graduation", album: "" },
  { id: "ph09", src: p(9), caption: "Guests at the ceremony", eventId: "ev-graduation", album: "" },
  { id: "ph20", src: p(20), caption: "Graduation ceremony", eventId: "ev-graduation", album: "" },
  // Unsorted
  { id: "ph22", src: p(22), caption: "", eventId: "", album: "Community" },
  { id: "ph23", src: p(23), caption: "", eventId: "", album: "Community" },
  { id: "ph24", src: p(24), caption: "", eventId: "", album: "Community" },
];

const events = [
  {
    id: "ev-losar",
    title: "Losar: Tibetan New Year Celebration",
    date: "2026-02-18",
    startTime: "11:00",
    endTime: "16:00",
    location: "Achi House, Main Hall",
    summary: "Ring in the Tibetan New Year with prayers, traditional dance, food and family.",
    description:
      "Join us as we welcome the new year together. The day begins with morning prayers and khata offerings, followed by traditional song and dance performances, a community lunch, and activities for children.\n\nEveryone is welcome, so bring your family and friends. Traditional dress is encouraged!",
    coverPhoto: "ph10",
  },
  {
    id: "ev-sagadawa",
    title: "Saga Dawa Prayer Gathering",
    date: "2026-05-31",
    startTime: "09:00",
    endTime: "13:00",
    location: "Achi House, Main Hall",
    summary: "A morning of prayer and recitation for the holiest day of Saga Dawa.",
    description:
      "On Saga Dawa Düchen we gather to recite prayers together and make offerings. Prayer texts are provided. Please arrive a few minutes early to find a seat.\n\nLunch will be served afterward.",
    coverPhoto: "ph21",
  },
  {
    id: "ev-graduation",
    title: "Tibetan Language School Graduation",
    date: "2026-06-20",
    startTime: "14:00",
    endTime: "17:00",
    location: "Achi House, Main Hall",
    summary: "Celebrating this year's Tibetan language students and their teachers.",
    description:
      "Congratulations to all of our students! Join us to celebrate their hard work with a certificate ceremony, student presentations, and refreshments.",
    coverPhoto: "ph05",
  },
  {
    id: "ev-blessing",
    title: "Blessing Ceremony with Visiting Lamas",
    date: "2026-09-12",
    startTime: "10:00",
    endTime: "15:00",
    location: "Achi House, Main Hall",
    summary: "A special blessing ceremony led by visiting lamas.",
    description:
      "We were honored to welcome visiting lamas for a day of prayers and blessings for our community and our center. Thank you to everyone who volunteered, cooked, and helped prepare the shrine.",
    coverPhoto: "ph08",
  },
  {
    id: "ev-class-nov",
    title: "Tibetan Language & Culture Class",
    date: "2026-11-14",
    startTime: "10:00",
    endTime: "12:00",
    location: "Achi House, Classroom",
    summary: "Weekly class for children and beginners: reading, writing, songs and stories.",
    description:
      "Our Saturday class is open to children ages 5 and up and to adult beginners. No experience needed. Please bring a notebook and pencil.",
    coverPhoto: "ph09",
  },
  {
    id: "ev-prayer-nov",
    title: "Monthly Community Prayer",
    date: "2026-11-16",
    startTime: "18:30",
    endTime: "20:00",
    location: "Achi House, Main Hall",
    summary: "Our monthly evening of group prayer, open to all.",
    description:
      "Join us for an evening of group prayer and meditation. Butter tea and light snacks afterward.",
    coverPhoto: "ph06",
  },
  {
    id: "ev-momo",
    title: "Community Momo Night",
    date: "2026-11-21",
    startTime: "17:00",
    endTime: "20:00",
    location: "Achi House, Main Hall",
    summary: "Make momos together, then share a meal. A fundraiser for the center.",
    description:
      "Learn to fold momos from our community's best cooks, then sit down for a shared dinner. Suggested donation $15 per adult, children free. All proceeds support Achi House programs.",
    coverPhoto: "ph02",
  },
  {
    id: "ev-class-dec",
    title: "Tibetan Language & Culture Class",
    date: "2026-12-05",
    startTime: "10:00",
    endTime: "12:00",
    location: "Achi House, Classroom",
    summary: "Weekly class for children and beginners: reading, writing, songs and stories.",
    description:
      "Our Saturday class is open to children ages 5 and up and to adult beginners. No experience needed.",
    coverPhoto: "ph09",
  },
  {
    id: "ev-dec10",
    title: "Human Rights Day Commemoration",
    date: "2026-12-10",
    startTime: "18:00",
    endTime: "20:00",
    location: "Achi House, Main Hall",
    summary: "An evening of reflection, prayer and speakers.",
    description:
      "Join us for an evening of prayers, short talks from community members, and candle lighting.",
    coverPhoto: "ph27",
  },
  {
    id: "ev-youth",
    title: "Winter Youth Program",
    date: "2026-12-19",
    startTime: "13:00",
    endTime: "16:00",
    location: "Achi House",
    summary: "Games, crafts, and Tibetan songs for kids during winter break.",
    description:
      "A fun afternoon for children and teens: arts and crafts, Tibetan songs, games, and snacks. Parents are welcome to stay.",
    coverPhoto: "ph14",
  },
];

export const seedContent = {
  version: 1,
  settings: {
    orgName: "Achi House",
    tagline: "Tibetan Community Center",
    email: "info@achihouse.org",
    phone: "(917) 664-1214\n(929) 394-6359\n(347) 599-3676\n(347) 922-4896",
    address: "79-01 Barnwell Avenue\nElmhurst, NY 11373\nCorner of Barnwell Ave & Queens Blvd, near TD Bank",
    mapQuery: "79-01 Barnwell Avenue, Elmhurst, NY 11373",
    hours: "Saturday – Sunday: 10am – 6pm\nWeekdays: by appointment",
    facebook: "https://www.facebook.com/NorthAmericaDrikungKagyuAssociation",
    instagram: "https://www.instagram.com/northamericadrikungkagyu/",
    footerNote: "Achi House is operated by North America Drikung Kagyu Association Inc, a non-profit organization.",
  },
  home: {
    greeting: "བཀྲ་ཤིས་བདེ་ལེགས། · Tashi Delek",
    heroTitle: "A home for our Tibetan community",
    heroSubtitle:
      "Achi House is a gathering place for prayer, language, culture and celebration, open to everyone.",
    slides: ["ph26", "ph01", "ph21", "ph10", "ph04", "ph27"],
    introHeading: "Welcome to Achi House",
    introText:
      "Achi House is a non-profit Tibetan community center dedicated to preserving and sharing Tibetan culture, language, and spiritual tradition.\n\nWe host prayer gatherings, Tibetan language classes for children and adults, cultural celebrations like Losar, and visits from respected teachers. Our space is also available to the community for weddings, birthdays, memorials, and other gatherings.",
    introPhoto: "ph16",
    highlights: [
      { id: "hl1", title: "Culture & Language", text: "Weekly Tibetan language classes, music, dance, and traditions passed between generations." },
      { id: "hl2", title: "Prayer & Practice", text: "Regular prayer gatherings, special ceremonies, and teachings from visiting lamas." },
      { id: "hl3", title: "A Space for Everyone", text: "Our hall is available for community events, family celebrations, and meetings." },
    ],
  },
  about: {
    missionHeading: "Our Mission",
    missionText:
      "Our mission is to keep Tibetan culture alive and thriving by providing a welcoming home where our community can pray, learn, celebrate, and support one another.\n\nFounded by local Tibetan families, Achi House is run entirely by volunteers and supported by the generosity of our members and friends.",
    missionPhoto: "ph25",
    spaceHeading: "The Space",
    spaceText:
      "Our center features a main hall with a traditional shrine, seating for up to 120 guests, a classroom, and a kitchen for community meals. The hall can be arranged for prayer, presentations, banquets, or performances.",
    spacePhotos: ["ph01", "ph27", "ph16", "ph26"],
    spaceFeatures: [
      "Main hall seats up to 120 guests",
      "Traditional shrine room",
      "Classroom for lessons and meetings",
      "Kitchen for community meals",
      "Tables, chairs and sound system",
    ],
    leadersHeading: "Our Leadership",
    leadersIntro: "Achi House is guided by a volunteer board elected by our members.",
    leaders: [
      { id: "ld1", name: "Phuntsok Topgyal Ponsar", role: "President", phone: "(917) 664-1214", bio: "A short bio about the president goes here: their background, their role in the community, and what they hope for Achi House.", photo: "" },
      { id: "ld2", name: "Jigmet Lama", role: "Vice President", phone: "(646) 624-9262", bio: "A short bio about the vice president goes here.", photo: "" },
      { id: "ld3", name: "Tsering Sonam", role: "Secretary", phone: "(347) 599-3676", bio: "A short bio about the secretary goes here.", photo: "" },
    ],
  },
  events,
  photos,
  booking: {
    heading: "Book the Space",
    intro:
      "Achi House is available to rent for community events, family celebrations, memorials, meetings, and classes. See our rental rates below and check the calendar for open dates, then send us a request. We'll get back to you to confirm.",
    details: [
      "Rental periods include set-up and clean-up time",
      "Special pricing for religious activities and multi-day rentals",
      "Hourly rentals are also available",
    ],
    pricing: {
      heading: "Rental Rates",
      effective: "Effective as of June 2026",
      rows: [
        { id: "pr1", label: "Monday – Sunday Daytime", time: "8:00 AM – 4:00 PM", price: "$600", icon: "day" },
        { id: "pr2", label: "Monday – Thursday Nighttime", time: "5:00 PM – 2:00 AM", price: "$800", icon: "night" },
        { id: "pr3", label: "Friday & Saturday Night", time: "5:00 PM – 2:00 AM", price: "$1,000", icon: "night" },
        { id: "pr4", label: "Sunday Night", time: "5:00 PM – 2:00 AM", price: "$800", icon: "night" },
      ],
      notes: [
        "Rental periods include set-up and clean-up time.",
        "Special pricing is available for religious activities and multi-day rentals.",
      ],
      hourlyTitle: "Hourly Rental",
      hourlyText: "First hour $200. Each additional hour adds $100.",
    },
    blockedDates: [],
  },
  contact: {
    heading: "Contact Us",
    intro: "We'd love to hear from you. Reach out with questions, or stop by during our open hours.",
  },
  donate: {
    heading: "Support Achi House",
    intro:
      "Achi House is run by volunteers and funded entirely by our community. Your gift helps keep our doors open, supports Tibetan language classes for children, and makes our celebrations possible. Thank you for your generosity!",
    methods: [
      { id: "dm-zelle", name: "Zelle", description: "Please call before making a Zelle transaction.", detail: "Jigmet Lama: (646) 624-9262\nPhuntsok Ponsar: (917) 664-1214", link: "", buttonText: "" },
      { id: "dm-wire", name: "Bank Wire Transfer", description: "Send a wire transfer to our TD Bank account.", detail: "Name: North America Drikung Kagyu Assoc Inc\nMailing address: 955 Val Park Ave, Valley Stream, NY 11580\nBank: TD Bank\nABA: 026013673\nChecking account #: 430-8048069", link: "", buttonText: "" },
      { id: "dm-check", name: "Check by Mail", description: "Make checks payable to \"North America Drikung Kagyu Assoc Inc\" and mail to:", detail: "955 Val Park Ave\nValley Stream, NY 11580", link: "", buttonText: "" },
      { id: "dm-person", name: "In Person", description: "Donations are welcome at any event or during open hours.", detail: "", link: "", buttonText: "" },
    ],
    taxNote: "Achi House is operated by North America Drikung Kagyu Association Inc, a non-profit organization.",
    otherWaysHeading: "Other Ways to Help",
    otherWays:
      "Volunteer at an event, help teach a class, cook for a community meal, or share our events with friends. Every bit of help makes a difference. Contact us to get involved.",
  },
};
