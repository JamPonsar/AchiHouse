// The big picture behind the title at the top of each page. Pages can be changed in /admin
// (Header & logo); until then these original pictures are used.
export const BANNER_PAGES = [
  ["about", "About page", "/photos/photo-27.jpg"],
  ["events", "Events page", "/photos/photo-10.jpg"],
  ["photos", "Photos page", "/photos/photo-21.jpg"],
  ["booking", "Renting page", "/photos/photo-01.jpg"],
  ["contact", "Contact page", "/photos/photo-26.jpg"],
  ["donate", "Donate page", "/photos/photo-25.jpg"],
];

export const defaultBanner = (page) => BANNER_PAGES.find(([k]) => k === page)?.[2] || "";
export const bannerFor = (content, page) => content.settings?.banners?.[page] || defaultBanner(page);
