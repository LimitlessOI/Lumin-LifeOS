/**
 * SYNOPSIS: Exports getTraditionProfilesDetail — services/traditionProfilesService.js.
 */
const traditionProfiles = [
  {
    id: 1,
    name: "Catholicism",
    theology: "Roman Catholic theology, based on the Nicene Creed",
    denominationalInterpretations: [
      "Vatican II reforms",
      "Papal infallibility",
      "Sacramental theology"
    ]
  },
  {
    id: 2,
    name: "Protestantism",
    theology: "Protestant theology, emphasizing justification by faith alone",
    denominationalInterpretations: [
      "Lutheran confessions",
      "Reformed theology",
      "Methodist emphasis on social justice"
    ]
  },
  {
    id: 3,
    name: "Orthodoxy",
    theology: "Eastern Orthodox theology, focusing on the Holy Tradition",
    denominationalInterpretations: [
      "Hesychasm",
      "Icon veneration",
      "Theosis"
    ]
  }
];

export function getTraditionProfilesDetail() {
  return traditionProfiles;
}
