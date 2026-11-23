# Portfolio cassette collection

Editable Blender file: `C:/Users/Ragon/Documents/Blender/PortfolioRecordTape_Complete.blend`.
The recovered source remains at `C:/Users/Ragon/Documents/Blender/PortfolioRecordTape.blend`.

Five collections: clear acrylic with white three-spoke reels, smoked polycarbonate,
ivory ABS with moulded ridges, graphite ABS with champagne label, vermilion polymer.
All use copies of the original cover, hub teeth and tape winding meshes. The original
unmodified objects are also retained in a hidden SOURCE collection in the complete file.

Added geometry includes rear shell, split perimeter and head openings, spindle apertures,
screw bosses and screws, washers, tape guides and rollers, ribbon path, bronze spring,
pressure felt, shield, anchoring ribs, record-protection tabs and replaceable label surfaces.
These are visual low-poly models, not dimensioned manufacturing assemblies.

Objects named `label_front` / `label_back` are the artwork surfaces. The wide surround
labels have a planar `Label Artwork` UV map; strip labels use cube face UVs. Replace the
paper/foil material with an image material for artwork. The small raised text is separate.

To regenerate GLBs and the complete Blender file:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' -b 'C:/Users/Ragon/Documents/Blender/PortfolioRecordTape.blend' -P scripts/build-portfolio-tapes.py
```

The web viewer uses material clones with reduced acrylic opacity to keep nested shells
and internal components readable in WebGL. Source Blender PBR materials remain editable.
GLB geometry is oriented to face +Z, normalized uniformly to 72% of Blender units.

`/portfolio` is handled by both dev and preview middleware. The homepage has a third
glass entry. The gallery renders on demand; only the open inspection view animates.
The inspection view supports orbit, zoom, shell separation, Escape and keyboard focus trapping.
