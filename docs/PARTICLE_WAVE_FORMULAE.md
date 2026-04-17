# Particle “wave / plume” figures — formulae

The reference shapes (horizontal waves, check-marks, S-curves, tapered ribbons) share the same **structure**:

## 1. Spine (skeleton)

Use a **parametric curve** in the plane, usually a **cubic Bézier**:

\[
\mathbf{B}(t) = (1-t)^3\mathbf{P}_0 + 3(1-t)^2 t\,\mathbf{P}_1 + 3(1-t)t^2\,\mathbf{P}_2 + t^3\mathbf{P}_3,\quad t \in [0,1].
\]

The **tangent** (for normals) is \(\mathbf{B}'(t)\). A **unit normal** for offsetting particles across the ribbon is  
\(\hat{\mathbf{n}}(t) = \dfrac{(-B'_y,\, B'_x)}{\|\mathbf{B}'(t)\|}\) (one consistent side of the curve).

Other spines (Catmull–Rom, B-splines, or sampled hand-drawn polylines) work the same way: arc-length parameter \(s\) or \(t\) along the spine, plus a perpendicular direction.

## 2. Thickness — **volume**, not a ribbon

A **1-D** Gaussian only along \(\hat{\mathbf{n}}\) reads as a **thin ribbon**. For stippled “smoke / nebula” shapes, use a **2-D** Gaussian in the local frame \((\hat{\mathbf{T}},\hat{\mathbf{n}})\):

\[
\mathbf{x} = \mathbf{B}(t) + X \,\hat{\mathbf{T}}(t) + Y \,\hat{\mathbf{n}}(t),
\quad
X \sim \mathcal{N}(0,\sigma_T^2),\;
Y \sim \mathcal{N}(0,\sigma_N^2).
\]

Use \(\sigma_T \approx \sigma_N\) (same order) so the cross-section is a **cloud**, not a line. Then add small **isotropic fBm** displacement for ridges and grainy edges.

**Variable width along the stroke** (narrow tips, fat middle — like a brush):

\[
\sigma(t) = \sigma_0 \bigl(\varepsilon + (1-\varepsilon)\,\sin^k(\pi t)\bigr)
\]

with small \(\varepsilon > 0\) so ends don’t collapse to zero width, and \(k \approx 1\)–\(1.5\).

## 3. Density / brightness (stippled core vs mist)

- **Core:** \(|d|\) small → high dot density, “solid” appearance.  
- **Edge:** \(|d|\) large → fewer dots or lower alpha → **feathered** edge.

In code, **size/alpha multipliers** are often driven by a **density field** \( \rho(\mathbf{x}) \), e.g. multi-octave **fBm**:

\[
\rho(\mathbf{x}) = \sum_i a_i \,\text{noise}(2^i \mathbf{x}).
\]

Use \(\rho\) to modulate point size and opacity (additive blending stacks brightness in the core).

## 4. Organic folds (optional)

Add **small turbulent displacement** (Perlin / value noise):

\[
\mathbf{x}' = \mathbf{x} + \delta \,\mathbf{n}_\text{noise}(\mathbf{x})
\]

with low amplitude so the ribbon stays **tightly coupled** but not a perfect tube.

## 5. Implementation in this repo

| Preset | Idea |
|--------|------|
| `splineRibbon` | Cubic Bézier spine + Gaussian normal offset + fBm jitter (`app/lib/splineRibbonScatter.js`). |
| `plume` | fBm-heavy placement + wing bins (`app/lib/plumeClusterScatter.js`). |
| `nucleus` | Uniform-ish disk around center (`randomNucleusNear` in `ParticlePortrait.js`). |

Set `scatterLayoutPreset` in `app/config/particlePortrait.config.js`.

## 6. Silhouette fill (e.g. portrait / wickets)

To fill a **closed region** (Sachin + wickets) with the same stipple:

1. Build a **mask** from the SVG/path or alpha matte.  
2. **Reject** or **re-sample** particle candidates until \(\mathbf{x}\) lies inside the mask.  
3. Optionally bias \(\rho(\mathbf{x})\) by distance to the boundary for a **soft edge** (same Gaussian falloff as above).

---

*This matches the usual workflow for “millions of points along a spline with Gaussian spread” used in stippling, brush simulation, and particle ribbons.*
