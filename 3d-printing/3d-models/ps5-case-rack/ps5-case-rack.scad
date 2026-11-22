// === DESCRIPTION ===
// PS5 Game Case Rack: a modular, spine-out shelf rack for PlayStation 5 game
//  cases (the blue Blu-ray-style cases, ~135 x 171 x 14 mm). Each module
//  holds 8 cases standing upright like books, spines facing the front, with
//  a sloped divider between every case so they can't topple. Modules chain
//  side by side with a sliding vertical dovetail: two modules = 16 cases,
//  covering a 10-15 game collection with room to grow.
// Physical context: sits on a desk, shelf or TV unit, indoors. Loads are just
//  the cases' weight (~100 g each) pressing down on the base and leaning
//  sideways on the dividers.
//
// Design decisions:
//   - Modules, not one long rack: 15 cases in one piece is ~265 mm, over the
//     256 mm bed (and the Bambu X1/P1 front-left cutter exclusion leaves only
//     ~220 mm centred). One 8-slot module is ~146 mm wide.
//   - Identical modules: each has a dovetail RAIL on its right end wall and a
//     dovetail SLOT in its left end wall, so you print the same file N times.
//     To join, lower the right-hand module onto the left one's rail; its slot
//     is open at the bottom and closed at the top (the closed top is a stop).
//   - Printed flat on the base: dividers and end walls are vertical walls, the
//     dovetail is a vertical extrusion, and the divider windows are diamonds
//     (45 deg faces), so nothing needs support. Sideways case loads bend the
//     dividers within the layer plane, not across layers.
//   - Divider tops slope up toward the back: low at the front so the spine
//     labels show, tall at the back where the leverage is.
//   - Base depth matches the case depth, with a low back stop so every spine
//     lines up flush with the front edge.
//
// Terminology -> code:
//   "the cases" / "games"   -> case_thick, case_depth, case_height
//   "slots" / "how many"    -> slots_per_module, slot_clear, slot_w
//   "dividers"              -> divider_thick, divider_front_h, divider_back_h, divider()
//   "windows in dividers"   -> window_half, window_y, window_z, divider_window()
//   "end walls"             -> end_front_h, end_back_h, left_wall_thick, right_wall_thick
//   "the base"              -> base_thick, base()
//   "back stop"             -> back_stop_h, back_stop_thick
//   "joint" / "dovetail"    -> dt_neck, dt_head, dt_depth, dt_height, dt_ys, dovetail_2d()
//
// Common modifications:
//   Thicker / thinner cases       -> case_thick (slot_w follows; keep slot_clear >= 1.0)
//   More or fewer per module      -> slots_per_module (module_w must stay <= 220 for the
//                                    stock Bambu bed; 9 slots still fits, 13 is the 256 max)
//   Taller dividers               -> divider_back_h (end_back_h must stay >= it)
//   Joint too tight / loose       -> dt_tol (PLA 0.2 default; 0.3 if your printer over-extrudes)
//   Different printer             -> build_x/y/z, and check module_w and base_depth fit
//
// Overall dimensions: 145.6 W (148.8 incl. dovetail rail) x 139.7 D x 93 H mm per module (fits the Bambu
//  P1S / X1C / A1 256 mm bed, inside the 220 mm X1/P1 cutter exclusion).
// Coordinate system: X = along the row of cases (left to right, facing the
//  spines), Y = front (0) to back, Z = up from the build plate.
// NOTE: Model is in print orientation and use orientation - they are the same.

// === PRINTER ===
// Printer: Bambu Lab P1S / X1C / A1
// Build Volume: 256 x 256 x 256 mm

// === PRINT SETTINGS ===
// Material: PLA - indoor, lightly loaded, best dimensional accuracy for the dovetail.
//   (PETG works too; raise dt_tol to 0.3.)
// Layer Height: 0.2mm
// Walls/Perimeters: 3 (dividers are exactly 4 extrusion widths, so they print solid)
// Infill: 15% gyroid
// Supports: None required (all walls vertical; divider windows are 45 deg diamonds;
//   dovetail rails have 45 deg chamfered undersides - ~56 mm2 of small flank faces sit
//   at ~50 deg, well inside PLA's 60-70 deg capability)
// Orientation: As modeled - base flat on the plate.
// Notes: Print one module per 8 games. Textured PEI plate recommended. To join two
//   modules: lift the right-hand module ~45 mm above the left one's two rails, line its
//   left-wall slots up over them, and lower it straight down until both sit on the table.
//   If the fit is tight, a few strokes of sandpaper on the rails fixes it.

// === PARAMETERS ===
// Printer settings
nozzle_diameter = 0.4;
layer_height = 0.2;
build_x = 256;
build_y = 256;
build_z = 256;
bambu_safe_w = 220;        // usable centred width with the X1/P1 cutter exclusion

// The cases (PS5 standard game case)
case_thick  = 14.0;        // spine thickness
case_depth  = 135.0;       // front-to-back when standing spine-out
case_height = 171.0;       // standing height

// Slots
slots_per_module = 8;
slot_clear = 1.5;          // total side clearance per slot so cases slide in easily

// Base
base_thick = 3.0;
back_stop_h = 12;          // height above the base
back_stop_thick = 2.7;     // 6 extrusion widths

// Dividers (heights measured from the top of the base)
divider_front_h = 35;
divider_back_h  = 75;

// End walls (heights from top of base)
end_front_h = 45;
end_back_h  = 90;

// Divider windows (material saving, diamond = support-free)
window_half = 17;          // half-diagonal of the diamond
window_y_frac = 0.55;      // window centre as a fraction of base depth
window_z = 25;             // window centre height above the base top

// Dovetail joint (rail on the right wall, slot in the left wall)
dt_neck   = 8;             // width where the rail meets the wall
dt_head   = 12;            // width at the rail's outer face
dt_depth  = 3.2;           // how far the rail sticks out
dt_tol    = 0.2;           // clearance per side (PLA)
dt_ys     = [40, 100];     // rail centre positions front-to-back (two rails stop the joint twisting)
dt_top_gap = 0.6;          // slot extends this far above the rail top (vertical play)

// === DERIVED CONSTANTS ===
extrusion_width = nozzle_diameter * 1.125;          // 0.45
divider_thick    = extrusion_width * 4;             // 1.8
right_wall_thick = extrusion_width * 6;             // 2.7
left_wall_thick  = extrusion_width * 14;            // 6.3 - houses the dovetail slot
fudge = 0.01;
tolerance = 0.2;
ef_chamfer = 0.4;
fillet = 1.0;                                       // 45 deg root fillet at divider bases
$fn = $preview ? 32 : 64;

slot_w = case_thick + slot_clear;                   // 15.5
base_depth = case_depth + back_stop_thick + 2;      // case + stop + 2 mm play
module_w = left_wall_thick + slots_per_module * slot_w
         + (slots_per_module - 1) * divider_thick + right_wall_thick;
total_h = base_thick + end_back_h;
dt_height = base_thick + end_front_h - 5;           // rail height from the plate
window_y = base_depth * window_y_frac;

// x position of the left face of slot i (0-based)
function slot_x(i) = left_wall_thick + i * (slot_w + divider_thick);
// divider top height (above base top) at depth y
function divider_h_at(y) = divider_front_h + (divider_back_h - divider_front_h) * y / base_depth;
function end_h_at(y) = end_front_h + (end_back_h - end_front_h) * y / base_depth;

// === CONTRACTS ===
assert(slot_w >= case_thick + 1.0, "slot too tight for a PS5 case");
assert(module_w <= bambu_safe_w, str("module ", module_w, " mm too wide for the Bambu bed"));
assert(base_depth <= bambu_safe_w, "module too deep for the Bambu bed");
assert(total_h <= build_z, "too tall");
assert(divider_front_h >= case_height * 0.2, "dividers too short to hold cases upright");
assert(end_back_h >= divider_back_h, "end walls must be at least as tall as dividers");
assert(base_depth - back_stop_thick >= case_depth, "case doesn't fit in front of the back stop");
// fillet must not stop the case seating: case is lifted by fillet - clear/2 at most
assert(fillet - slot_clear / 2 <= 0.5, "root fillets lift the case too far");
// diamond window stays inside the divider with >= 5 mm of material all round
assert(window_z - window_half >= 5, "window too close to the base");
assert(window_z + window_half <= divider_h_at(window_y) - 5, "window too close to divider top");
assert(window_y - window_half >= 5 && window_y + window_half <= base_depth - 5, "window off the divider");
// dovetail: slot leaves real wall behind it, rail sits inside the end-wall profile
assert(left_wall_thick - (dt_depth + dt_tol) >= 3 * extrusion_width, "wall behind dovetail slot too thin");
assert(dt_head > dt_neck, "dovetail must flare to lock");
assert(dt_ys[0] - dt_head / 2 - dt_tol >= 5, "dovetail too close to the front");
assert(dt_ys[len(dt_ys) - 1] + dt_head / 2 + dt_tol <= base_depth - 5, "dovetail too close to the back");
for (y = dt_ys) assert(dt_height + dt_top_gap <= base_thick + end_h_at(y - dt_head / 2) - 2, "dovetail slot breaks out of the wall top");

echo(module_w = module_w, base_depth = base_depth, total_h = total_h,
     slot_w = slot_w, cases_per_2_modules = 2 * slots_per_module);

// === MODULES ===

// Side profile (in Y-Z) of a wall with a sloped top, extruded along X.
module sloped_wall(x0, thick, front_h, back_h) {
    translate([x0, 0, 0])
        rotate([90, 0, 90])
            linear_extrude(height = thick)
                polygon([[0, 0], [base_depth, 0],
                         [base_depth, base_thick + back_h],
                         [0, base_thick + front_h]]);
}

// Base plate with elephant-foot chamfer on the bottom edges.
module base() {
    hull() {
        translate([ef_chamfer, ef_chamfer, 0])
            cube([module_w - 2 * ef_chamfer, base_depth - 2 * ef_chamfer, fudge]);
        translate([0, 0, ef_chamfer])
            cube([module_w, base_depth, base_thick - ef_chamfer]);
    }
}

module back_stop() {
    translate([0, base_depth - back_stop_thick, base_thick - fudge])
        cube([module_w, back_stop_thick, back_stop_h + fudge]);
}

// Diamond window cutter, axis along X, spanning thickness t.
module divider_window(x0, t) {
    translate([x0 - fudge, window_y, base_thick + window_z])
        rotate([0, 90, 0])
            linear_extrude(height = t + 2 * fudge)
                rotate(45) square(window_half * sqrt(2), center = true);
}

// 45 deg fillet strip along Y at the root of a wall, on one side.
module root_fillet(x_face, dir) {
    // dir = +1 fillet sits at x > x_face, -1 at x < x_face
    translate([x_face, 0, base_thick - fudge])
        rotate([-90, 0, 0])
            linear_extrude(height = base_depth - back_stop_thick + fudge)
                polygon([[-dir * fudge, 0], [dir * fillet, 0], [-dir * fudge, -fillet - fudge]]);
}

module divider(i) {
    x0 = slot_x(i) + slot_w;     // divider sits right of slot i
    difference() {
        sloped_wall(x0, divider_thick, divider_front_h, divider_back_h);
        divider_window(x0, divider_thick);
    }
    root_fillet(x0, -1);
    root_fillet(x0 + divider_thick, +1);
}

// Dovetail cross-section in X-Y; x=0 is the wall face, rail grows toward +x.
module dovetail_2d(grow = 0) {
    offset(delta = grow)
        polygon([[-fudge, -dt_neck / 2], [dt_depth, -dt_head / 2],
                 [dt_depth, dt_head / 2], [-fudge, dt_neck / 2]]);
}

// The rail's underside is a 45 deg chamfer growing out of the wall, so it
// never touches the plate (no first-layer island) and needs no support.
// Its root strip sinks rail_root mm into the right wall so it is properly fused.
rail_root = 1.0;
// width of the buried root: the dovetail flank extended rail_root into the wall,
// so the hull never widens the neck past the slot clearance
rail_root_w = dt_neck - 2 * rail_root * ((dt_head - dt_neck) / 2) / dt_depth;
assert(rail_root_w > 0, "rail root too deep for this dovetail angle");
module dovetail_rail() {
    for (y = dt_ys) translate([module_w, y, 0])
        hull() {
            translate([0, 0, base_thick - rail_root])   // keeps the underside at 45 deg
                linear_extrude(height = fudge)
                    translate([-rail_root, -rail_root_w / 2]) square([rail_root + fudge, rail_root_w]);
            translate([-rail_root, -rail_root_w / 2, base_thick + dt_depth])
                cube([rail_root, rail_root_w, dt_height - base_thick - dt_depth]);
            translate([0, 0, base_thick + dt_depth])
                linear_extrude(height = dt_height - base_thick - dt_depth) dovetail_2d();
        }
}

// Slot cutter in the left wall, open at the bottom, closed at the top.
module dovetail_slot() {
    for (y = dt_ys) translate([0, y, -fudge]) {
        linear_extrude(height = dt_height + dt_top_gap + fudge)
            dovetail_2d(dt_tol);
        // flared mouth so the slot's own elephant foot doesn't bind
        linear_extrude(height = ef_chamfer + fudge)
            dovetail_2d(dt_tol + ef_chamfer);
    }
}

// Envelope whose bottom edges are chamfered 45 deg by ef_chamfer: intersecting
// with it puts elephant-foot compensation on every wall and divider foot.
module ef_envelope() {
    big_w = module_w + dt_depth + 2;
    hull() {
        translate([ef_chamfer, ef_chamfer, 0])
            cube([module_w - 2 * ef_chamfer, base_depth - 2 * ef_chamfer, fudge]);
        translate([-fudge, -fudge, ef_chamfer + fudge])   // rise = run, exactly 45 deg
            cube([big_w, base_depth + 2 * fudge, total_h]);
    }
}

module rack_module() {
    intersection() {
    ef_envelope();
    difference() {
        union() {
            base();
            back_stop();
            sloped_wall(0, left_wall_thick, end_front_h, end_back_h);
            sloped_wall(module_w - right_wall_thick, right_wall_thick, end_front_h, end_back_h);
            root_fillet(left_wall_thick, +1);
            root_fillet(module_w - right_wall_thick, -1);
            for (i = [0 : slots_per_module - 2]) divider(i);
            dovetail_rail();
        }
        dovetail_slot();
    }
    }
}

// Placeholder case for the assembly view.
module ps5_case() {
    color("royalblue", 0.6) cube([case_thick, case_depth, case_height]);
}

module assembly() {
    for (m = [0 : 1]) {
        translate([m * (module_w + fudge), 0, 0]) {
            color("white") rack_module();
            for (i = [0 : slots_per_module - 1])
                if (m * slots_per_module + i < 15)
                    translate([slot_x(i) + slot_clear / 2, 0, base_thick + fudge]) ps5_case();
        }
    }
}

// === ASSEMBLY / RENDER ===
part = "rack_module"; // "all", "rack_module", "clash_joint", "clash_case"
if (part == "all")         assembly();
if (part == "rack_module") rack_module();
// joined pose: second module's left face sits fudge right of the first's right face
if (part == "clash_joint") intersection() {
    rack_module();
    translate([module_w + fudge, 0, 0]) rack_module();
}
// every case clears the rack
if (part == "clash_case") intersection() {
    rack_module();
    for (i = [0 : slots_per_module - 1])
        translate([slot_x(i) + slot_clear / 2, 0, base_thick + fillet]) ps5_case();
}
