# Geographic map

Phone → Map opens a local, north-up geographic map. Region, Main Campus, Giri Junction, Iddo Sarki and Gwagwalada views use latitude/longitude coordinates with a latitude-corrected projection and scale bars. Choose a numbered landmark for its source, coordinate and available game travel/directions.

## Scope and accuracy

- Real imported road lines and campus building outlines are separate from the existing stylised 3D game. The 3D walking layout has **not** been surveyed or relocated.
- Main Campus and Gwagwalada Mini Campus are distinct places. The Faculty of Law source is a Mini Campus reference; it is not presented as a geolocated Main Campus building. It does not change the game's faculty assignment or its fictional Law building.
- Giri means Giri Junction for this map. Iddo means Iddo Sarki. These are reference points, not exhaustive settlement boundaries or verified lodge addresses.
- Landmarks come from public map listings. Source links and classification caveats are displayed for each. They are not survey-grade/current institutional guarantees.
- Blue indicates the player's current **area**, not their exact geographic position or GPS.
- Straight-line distances are not road routing. Keke prices and journey durations remain game estimates. Travel between off-campus areas still requires returning to campus.
- Imported road coverage consists of four bounded areas. The connecting highway corridor outside these boxes is not included. Blank gaps are missing coverage, not evidence of no roads. No invented connecting road has been drawn.
- No internet map iframe or remote tile requests are required for this map after the game has loaded.

## Sources and data licence

University campus classification: https://www.uniabuja.edu.ng/our-location

Main-campus reference/outline: https://mapcarta.com/W1133000152 (OpenStreetMap way 1133000152).

Additional point sources and notes are in `src/map-places.json` and linked in-game.

Road/building geometry: **© OpenStreetMap contributors**, available under the **Open Database License (ODbL) 1.0**: https://www.openstreetmap.org/copyright and https://opendatacommons.org/licenses/odbl/1-0/ . Imported 9 October 2026 through the OpenStreetMap map API. The adapted database is supplied in `src/map-geometry.json` under ODbL 1.0; it is not covered by the application code's ISC licence.

Data boxes (south, west, north, east): Main Campus `(8.967, 7.163, 8.989, 7.190)`; Giri Junction `(8.990, 7.132, 9.016, 7.173)`; Iddo `(8.970, 7.190, 8.997, 7.222)`; Gwagwalada `(8.943, 7.054, 8.965, 7.085)`. Geometry is simplified and coordinates rounded for display.
