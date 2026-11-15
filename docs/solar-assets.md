# Solar Command assets, sources, and rendering notes

## NASA 3D planetary and lunar models

The interactive scene loads locally stored GLB assets from `assets/solar-models/`. The Sun and all eight planets come from NASA Science's 3D model library. Earth uses NASA's cloud model. The Moon uses a NASA Scientific Visualization Studio web model built from Lunar Reconnaissance Orbiter terrain imagery. Io, Europa, Ganymede, Callisto, and Titan are representative major moons from NASA Science.

| Body | Project asset | Source |
| --- | --- | --- |
| Sun | `sun.glb` | [NASA Sun 3D Model](https://science.nasa.gov/learn/heat/resource/sun-3d-model/) |
| Mercury | `mercury.glb` | [NASA Mercury 3D Model](https://science.nasa.gov/resource/mercury-3d-model/) |
| Venus | `venus.glb` | [NASA Venus 3D Model](https://science.nasa.gov/resource/venus-3d-model/) |
| Earth and clouds | `earth.glb` | [NASA Earth with Clouds 3D Model](https://science.nasa.gov/resource/earth-with-clouds-3d-model/) |
| Moon | `moon.glb` | [NASA SVS Moon 3D Models for Web, AR, and Animation](https://svs.gsfc.nasa.gov/14959/) |
| Mars | `mars.glb` | [NASA Mars 3D Model](https://science.nasa.gov/resource/planet-mars-3d-model/) |
| Jupiter | `jupiter.glb` | [NASA Jupiter 3D Model](https://science.nasa.gov/resource/jupiter-3d-model/) |
| Io | `io.glb` | [NASA Io 3D Model](https://science.nasa.gov/resource/io-3d-model/) |
| Europa | `europa.glb` | [NASA Europa 3D Model](https://science.nasa.gov/resource/europa-3d-model/) |
| Ganymede | `ganymede.glb` | [NASA Ganymede 3D Model](https://science.nasa.gov/resource/ganymede-3d-model/) |
| Callisto | `callisto.glb` | [NASA Callisto 3D Model](https://science.nasa.gov/resource/callisto-3d-model/) |
| Saturn | `saturn.glb` | [NASA Saturn 3D Model](https://science.nasa.gov/resource/saturn-3d-model/) |
| Titan | `titan.glb` | [NASA Titan 3D Model](https://science.nasa.gov/resource/titan-3d-model/) |
| Uranus | `uranus.glb` | [NASA Uranus 3D Model](https://science.nasa.gov/resource/uranus-3d-model/) |
| Neptune | `neptune.glb` | [NASA Neptune 3D Model](https://science.nasa.gov/resource/neptune-3d-model/) |

NASA provides these models through its public science resources. Review the [NASA image and media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) when redistributing the project; NASA identifiers and logos are not implied as endorsement. The selected models are included in the repository so the scene does not need a third-party asset CDN at runtime.

The 3D models are loaded in the background, one at a time. The small procedural bodies remain visible until a model is ready and serve as a fallback if a file fails to load. Jupiter's four Galilean moons and Saturn's Titan are requested when the matching planet is explored. Successfully fetched files are eligible for the service worker's runtime cache; the large GLBs are intentionally not in the service worker's initial cache manifest.

## Star catalog and Milky Way sky

`hyg-stars.csv` is a 12,000-star visual subset of the [HYG Database v4.1](https://github.com/astronexus/HYG-Database), derived from its `hygdata_v41.csv`. It uses the catalog's Cartesian coordinates in parsecs, visual magnitude, and B–V color index. The subset is sorted by apparent magnitude. Include this attribution when redistributing the derived dataset: **HYG Database v4.1, by David Nash and contributors, CC BY-SA 4.0**. The [HYG license](https://github.com/astronexus/HYG-Database/blob/main/LICENSE) requires attribution and share-alike terms for adapted database material.

The star locations are based on catalog positions, but their distances are compressed logarithmically to fit the interactive scene. The Milky Way background now uses ESO's 6,000 × 3,000 pixel [360-degree photographic panorama](https://www.eso.org/public/images/eso0932a/) (image file `assets/solar-textures/milky-way-eso.jpg`). The panorama presents a projected all-sky view; it is not an external photograph of the Galaxy. ESO's public images are under [CC BY 4.0](https://www.eso.org/public/copyright/). Display the exact visible image credit **ESO/S. Brunier**.

The panorama and catalog stars are displayed together: the image shows the Milky Way's observed sky band, while 1,589 HYG stars brighter than visual magnitude 5 add sparse catalog-based 3D points with compressed distances. Both the panorama and star points share a slow, accelerated display rotation so the galaxy visibly drifts behind the solar system. This is a presentation effect, not an ephemeris. The older Solar System Scope map remains only as a fallback sky image and for fallback planetary/ring effects; it is under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and credited in the page header as **Solar System Scope — Planet textures, CC BY 4.0**.

## Rendering and scientific limits

- Three.js `0.187.0` and its `GLTFLoader` are vendored under `assets/vendor/three/`; the Three.js MIT license is included in that directory.
- The navigation layout compresses planetary distances and body sizes so the full system fits on screen. The apparent scales of satellite orbits are independently compressed.
- Body motion uses illustrative orbital parameters and speed multipliers. It is not a live ephemeris or navigation display.
- HYG catalog directions and color/magnitude metadata are real catalog data; radial positions are compressed and the rendered point size is a visual aid, not a physical stellar diameter or luminosity.
- NASA image models and the starfield are for visual exploration only. They are not medical evidence or mission-operational data.

## Legacy texture maps and fallback

Files in `assets/solar-textures/` include 2K maps from Solar System Scope's texture pack. They remain as local fallbacks where useful for simple generated surfaces, ring/cloud effects, and the Milky Way sky. The pack states that unmapped areas may be filled with fictional terrain and that colors can be adjusted or saturated; these maps are not authoritative planetary analysis products.
