# Solar Command assets and licenses

## Planet and star maps

Files in `assets/solar-textures/` are 2K equirectangular maps and ring/cloud maps from [Solar System Scope's texture pack](https://www.solarsystemscope.com/textures/). The pack page says it is distributed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) and that the maps are based on NASA elevation/imagery data and spacecraft/Hubble imagery. Required attribution in the application footer: **Solar System Scope — Planet textures, CC BY 4.0**.

The pack also states that unmapped areas may be filled with fictional terrain and colors can be adjusted/saturated. Therefore the maps are used only for visual orientation. They are not authoritative planetary imagery, scientific analysis products, operational navigation, or VALMED health evidence.

Included files: Sun, Mercury, Venus surface, Earth day map and clouds, Moon, Mars, Jupiter, Saturn, Saturn ring alpha, Uranus, Neptune, and Milky Way star field. The solar-system scene loads detailed maps progressively; it starts with locally generated procedural surfaces and keeps those if a local image cannot load.

## Rendering software

- Three.js `0.187.0` is vendored under `assets/vendor/three/` from npm. Its MIT license is included at `assets/vendor/three/LICENSE`.
- `GLTFLoader`, `OrbitControls`, `MeshoptDecoder`, `BufferGeometryUtils`, and `SkeletonUtils` are vendored from the same Three.js release under `assets/vendor/three/examples/jsm/` and are covered by the included Three.js license.
- Orbital spacing and motion rates are deliberately compressed/illustrative for screen composition. They are not ephemerides or scale-model distances.
- The solar scene uses no downloaded 3D planet models; it renders spheres with the listed maps. The separate human anatomy model retains its existing project/source attribution on the Anatomy page.
