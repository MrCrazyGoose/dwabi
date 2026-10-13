// Montgomery County Public Schools grouped by high school cluster, plus
// neighborhood options for students who prefer to compete by area.
// Cluster assignments for middle schools are approximate (some middle schools
// feed more than one high school).

export const SCHOOLS = [
  // Downcounty Consortium
  { id: 'blair-hs', name: 'Montgomery Blair High School', level: 'high', cluster: 'Downcounty Consortium' },
  { id: 'einstein-hs', name: 'Albert Einstein High School', level: 'high', cluster: 'Downcounty Consortium' },
  { id: 'kennedy-hs', name: 'John F. Kennedy High School', level: 'high', cluster: 'Downcounty Consortium' },
  { id: 'northwood-hs', name: 'Northwood High School', level: 'high', cluster: 'Downcounty Consortium' },
  { id: 'wheaton-hs', name: 'Wheaton High School', level: 'high', cluster: 'Downcounty Consortium' },
  { id: 'takoma-park-ms', name: 'Takoma Park Middle School', level: 'middle', cluster: 'Downcounty Consortium' },
  { id: 'eastern-ms', name: 'Eastern Middle School', level: 'middle', cluster: 'Downcounty Consortium' },
  { id: 'ssims', name: 'Silver Spring International Middle School', level: 'middle', cluster: 'Downcounty Consortium' },
  { id: 'sligo-ms', name: 'Sligo Middle School', level: 'middle', cluster: 'Downcounty Consortium' },
  { id: 'argyle-ms', name: 'Argyle Middle School', level: 'middle', cluster: 'Downcounty Consortium' },
  { id: 'loiederman-ms', name: 'A. Mario Loiederman Middle School', level: 'middle', cluster: 'Downcounty Consortium' },
  { id: 'parkland-ms', name: 'Parkland Middle School', level: 'middle', cluster: 'Downcounty Consortium' },
  { id: 'newport-mill-ms', name: 'Newport Mill Middle School', level: 'middle', cluster: 'Downcounty Consortium' },

  // Bethesda-Chevy Chase
  { id: 'bcc-hs', name: 'Bethesda-Chevy Chase High School', level: 'high', cluster: 'Bethesda-Chevy Chase' },
  { id: 'westland-ms', name: 'Westland Middle School', level: 'middle', cluster: 'Bethesda-Chevy Chase' },
  { id: 'silver-creek-ms', name: 'Silver Creek Middle School', level: 'middle', cluster: 'Bethesda-Chevy Chase' },

  // Richard Montgomery / Rockville
  { id: 'rm-hs', name: 'Richard Montgomery High School', level: 'high', cluster: 'Richard Montgomery' },
  { id: 'julius-west-ms', name: 'Julius West Middle School', level: 'middle', cluster: 'Richard Montgomery' },
  { id: 'rockville-hs', name: 'Rockville High School', level: 'high', cluster: 'Rockville' },
  { id: 'wood-ms', name: 'Earle B. Wood Middle School', level: 'middle', cluster: 'Rockville' },

  // Walt Whitman / Walter Johnson / Churchill / Wootton
  { id: 'whitman-hs', name: 'Walt Whitman High School', level: 'high', cluster: 'Walt Whitman' },
  { id: 'pyle-ms', name: 'Thomas W. Pyle Middle School', level: 'middle', cluster: 'Walt Whitman' },
  { id: 'wj-hs', name: 'Walter Johnson High School', level: 'high', cluster: 'Walter Johnson' },
  { id: 'north-bethesda-ms', name: 'North Bethesda Middle School', level: 'middle', cluster: 'Walter Johnson' },
  { id: 'tilden-ms', name: 'Tilden Middle School', level: 'middle', cluster: 'Walter Johnson' },
  { id: 'churchill-hs', name: 'Winston Churchill High School', level: 'high', cluster: 'Winston Churchill' },
  { id: 'cabin-john-ms', name: 'Cabin John Middle School', level: 'middle', cluster: 'Winston Churchill' },
  { id: 'hoover-ms', name: 'Herbert Hoover Middle School', level: 'middle', cluster: 'Winston Churchill' },
  { id: 'wootton-hs', name: 'Thomas S. Wootton High School', level: 'high', cluster: 'Thomas S. Wootton' },
  { id: 'frost-ms', name: 'Robert Frost Middle School', level: 'middle', cluster: 'Thomas S. Wootton' },

  // Upcounty
  { id: 'magruder-hs', name: 'Col. Zadok Magruder High School', level: 'high', cluster: 'Magruder' },
  { id: 'shady-grove-ms', name: 'Shady Grove Middle School', level: 'middle', cluster: 'Magruder' },
  { id: 'redland-ms', name: 'Redland Middle School', level: 'middle', cluster: 'Magruder' },
  { id: 'gaithersburg-hs', name: 'Gaithersburg High School', level: 'high', cluster: 'Gaithersburg' },
  { id: 'gaithersburg-ms', name: 'Gaithersburg Middle School', level: 'middle', cluster: 'Gaithersburg' },
  { id: 'forest-oak-ms', name: 'Forest Oak Middle School', level: 'middle', cluster: 'Gaithersburg' },
  { id: 'quince-orchard-hs', name: 'Quince Orchard High School', level: 'high', cluster: 'Quince Orchard' },
  { id: 'lakelands-park-ms', name: 'Lakelands Park Middle School', level: 'middle', cluster: 'Quince Orchard' },
  { id: 'ridgeview-ms', name: 'Ridgeview Middle School', level: 'middle', cluster: 'Quince Orchard' },
  { id: 'northwest-hs', name: 'Northwest High School', level: 'high', cluster: 'Northwest' },
  { id: 'kingsview-ms', name: 'Kingsview Middle School', level: 'middle', cluster: 'Northwest' },
  { id: 'clemente-ms', name: 'Roberto W. Clemente Middle School', level: 'middle', cluster: 'Northwest' },
  { id: 'clarksburg-hs', name: 'Clarksburg High School', level: 'high', cluster: 'Clarksburg' },
  { id: 'rocky-hill-ms', name: 'Rocky Hill Middle School', level: 'middle', cluster: 'Clarksburg' },
  { id: 'hallie-wells-ms', name: 'Hallie Wells Middle School', level: 'middle', cluster: 'Clarksburg' },
  { id: 'damascus-hs', name: 'Damascus High School', level: 'high', cluster: 'Damascus' },
  { id: 'baker-ms', name: 'John T. Baker Middle School', level: 'middle', cluster: 'Damascus' },
  { id: 'poolesville-hs', name: 'Poolesville High School', level: 'high', cluster: 'Poolesville' },
  { id: 'poole-ms', name: 'John Poole Middle School', level: 'middle', cluster: 'Poolesville' },
  { id: 'seneca-valley-hs', name: 'Seneca Valley High School', level: 'high', cluster: 'Seneca Valley' },
  { id: 'mlk-ms', name: 'Martin Luther King, Jr. Middle School', level: 'middle', cluster: 'Seneca Valley' },
  { id: 'watkins-mill-hs', name: 'Watkins Mill High School', level: 'high', cluster: 'Watkins Mill' },
  { id: 'montgomery-village-ms', name: 'Montgomery Village Middle School', level: 'middle', cluster: 'Watkins Mill' },
  { id: 'neelsville-ms', name: 'Neelsville Middle School', level: 'middle', cluster: 'Watkins Mill' },

  // Eastern county
  { id: 'sherwood-hs', name: 'Sherwood High School', level: 'high', cluster: 'Sherwood' },
  { id: 'rosa-parks-ms', name: 'Rosa M. Parks Middle School', level: 'middle', cluster: 'Sherwood' },
  { id: 'farquhar-ms', name: 'William H. Farquhar Middle School', level: 'middle', cluster: 'Sherwood' },
  { id: 'blake-hs', name: 'James Hubert Blake High School', level: 'high', cluster: 'Northeast Consortium' },
  { id: 'paint-branch-hs', name: 'Paint Branch High School', level: 'high', cluster: 'Northeast Consortium' },
  { id: 'springbrook-hs', name: 'Springbrook High School', level: 'high', cluster: 'Northeast Consortium' },
  { id: 'briggs-chaney-ms', name: 'Briggs Chaney Middle School', level: 'middle', cluster: 'Northeast Consortium' },
  { id: 'banneker-ms', name: 'Benjamin Banneker Middle School', level: 'middle', cluster: 'Northeast Consortium' },
  { id: 'white-oak-ms', name: 'White Oak Middle School', level: 'middle', cluster: 'Northeast Consortium' },
  { id: 'key-ms', name: 'Francis Scott Key Middle School', level: 'middle', cluster: 'Northeast Consortium' },

  // Countywide
  { id: 'edison-hs', name: 'Thomas Edison High School of Technology', level: 'high', cluster: 'Countywide Programs' },

  // Neighborhood clusters (for students who are homeschooled, attend private
  // school, or prefer to represent their neighborhood)
  { id: 'nbhd-silver-spring', name: 'Silver Spring / Takoma Park neighborhoods', level: 'neighborhood', cluster: 'Neighborhoods' },
  { id: 'nbhd-bethesda', name: 'Bethesda / Chevy Chase neighborhoods', level: 'neighborhood', cluster: 'Neighborhoods' },
  { id: 'nbhd-rockville', name: 'Rockville / North Bethesda neighborhoods', level: 'neighborhood', cluster: 'Neighborhoods' },
  { id: 'nbhd-wheaton', name: 'Wheaton / Kensington neighborhoods', level: 'neighborhood', cluster: 'Neighborhoods' },
  { id: 'nbhd-gaithersburg', name: 'Gaithersburg / Germantown neighborhoods', level: 'neighborhood', cluster: 'Neighborhoods' },
  { id: 'nbhd-olney', name: 'Olney / Burtonsville / Colesville neighborhoods', level: 'neighborhood', cluster: 'Neighborhoods' },
  { id: 'nbhd-upcounty', name: 'Clarksburg / Damascus / Poolesville neighborhoods', level: 'neighborhood', cluster: 'Neighborhoods' },
];

const BY_ID = new Map(SCHOOLS.map((s) => [s.id, s]));

export function getSchool(id) {
  return BY_ID.get(id) || null;
}
