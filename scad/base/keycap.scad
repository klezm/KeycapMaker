include <../presets/stem-nominals.scad>
use <../modules/keycap_shell.scad>
use <../modules/keycap_jis_enter.scad>
use <../modules/keycap_typewriter.scad>
use <../modules/legend_block.scad>
use <../modules/sidewall_legend.scad>
use <../modules/stem_mx.scad>
use <../modules/stem_choc_v1.scad>
use <../modules/stem_choc_v2.scad>
use <../modules/stem_alps.scad>
use <../modules/stem_j_stem_lp01.scad>
use <../modules/homing_bar.scad>

resolved_export_target = is_undef(export_target) ? "preview" : export_target;
function required_param(value, name) =
    assert(!is_undef(value), str(name, " is required"))
    value;
function positive_dimension(value, minimum = 0.1) = max(value, minimum);
function stem_cross_dimension(base_value, margin) =
    positive_dimension(base_value + margin * 2);
function supported_shape_geometry_type(type) =
    type == "shell"
    || type == "jis_enter"
    || type == "typewriter"
    || type == "typewriter_jis_enter";
function typewriter_shape_geometry_type(type) =
    type == "typewriter" || type == "typewriter_jis_enter";
function jis_enter_shape_geometry_type(type) =
    type == "jis_enter" || type == "typewriter_jis_enter";
function supported_top_shape_type(type) =
    type == "flat" || type == "cylindrical" || type == "spherical";
function supported_stem_type(type) =
    type == "none"
    || type == "mx"
    || type == "choc_v1"
    || type == "choc_v2"
    || type == "alps"
    || type == "j_stem_lp01";
function receiver_recess_stem_type(type) =
    type == "j_stem_lp01";
function cross_compatible_stem_type(type) =
    type == "mx" || type == "choc_v2";
function stem_nominal_outer_diameter_for_type(type) =
    type == "mx"
        ? stem_mx_nominal_outer_diameter
        : type == "j_stem_lp01"
            ? max(stem_j_stem_lp01_nominal_plate_width, stem_j_stem_lp01_nominal_plate_depth)
            : stem_choc_v2_nominal_outer_diameter;
function stem_nominal_inset_for_type(type) =
    type == "mx"
        ? stem_mx_nominal_inset
        : type == "choc_v1"
            ? stem_choc_v1_nominal_inset
            : type == "alps"
                ? stem_alps_nominal_inset
                : type == "j_stem_lp01"
                    ? 0
                    : stem_choc_v2_nominal_inset;
function stem_nominal_height_for_type(type) =
    type == "mx"
        ? stem_mx_nominal_height
        : type == "choc_v1"
            ? stem_choc_v1_nominal_height
            : type == "alps"
                ? stem_alps_nominal_height
                : type == "j_stem_lp01"
                    ? stem_j_stem_lp01_nominal_plate_thickness
                    : stem_choc_v2_nominal_height;
function stem_nominal_cross_width_horizontal_for_type(type) =
    type == "mx" ? stem_mx_nominal_cross_width_horizontal : stem_choc_v2_nominal_cross_width_horizontal;
function stem_nominal_cross_length_horizontal_for_type(type) =
    type == "mx" ? stem_mx_nominal_cross_length_horizontal : stem_choc_v2_nominal_cross_length_horizontal;
function stem_nominal_cross_width_vertical_for_type(type) =
    type == "mx" ? stem_mx_nominal_cross_width_vertical : stem_choc_v2_nominal_cross_width_vertical;
function stem_nominal_cross_length_vertical_for_type(type) =
    type == "mx" ? stem_mx_nominal_cross_length_vertical : stem_choc_v2_nominal_cross_length_vertical;
function stem_nominal_cross_chamfer_for_type(type) =
    type == "mx" ? stem_mx_nominal_cross_chamfer : stem_choc_v2_nominal_cross_chamfer;
function stem_plane_slope_magnitude(pitch_deg, roll_deg) =
    sqrt(pow(tan(pitch_deg), 2) + pow(tan(roll_deg), 2));
function mix_value(a, b, amount) = a + (b - a) * amount;
function clamp01(value) = min(max(value, 0), 1);
function vector_dot(a, b) = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function vector_length(v) = sqrt(vector_dot(v, v));
function vector_scale(v, amount) = [v[0] * amount, v[1] * amount, v[2] * amount];
function vector_add(a, b) = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
function vector_sub(a, b) = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
function vector_cross(a, b) = [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
];
function vector_unit(v, fallback = [0, 0, 1]) =
    let(length = vector_length(v))
    length > 0.000001 ? vector_scale(v, 1 / length) : fallback;
function vector_without_axis(v, axis) =
    vector_sub(v, vector_scale(axis, vector_dot(v, axis)));
typewriter_stem_mount_overlap = 0.02;
typewriter_rim_body_clearance = 0.03;
function typewriter_stem_height_from_mount_height(mount_height, top_height) =
    max(mount_height - top_height + typewriter_stem_mount_overlap, 0.6);
function stem_footprint_radius(type, outer_diameter, prong_width, prong_depth, prong_spacing, alps_length, alps_width) =
    type == "mx" || type == "choc_v2"
        ? positive_dimension(outer_diameter) / 2
        : type == "choc_v1"
            ? sqrt(pow(prong_spacing / 2 + prong_width / 2, 2) + pow(prong_depth / 2, 2))
            : type == "alps"
                ? sqrt(pow(alps_length / 2, 2) + pow(alps_width / 2, 2))
                : type == "j_stem_lp01"
                    ? sqrt(
                        pow(stem_j_stem_lp01_nominal_plate_width / 2, 2)
                        + pow(stem_j_stem_lp01_nominal_plate_depth / 2, 2)
                    )
                : 0;

key_width = positive_dimension(required_param(user_key_width, "user_key_width"));
key_depth = positive_dimension(required_param(user_key_depth, "user_key_depth"));
top_center_height = positive_dimension(required_param(user_top_center_height, "user_top_center_height"));
wall_thickness = positive_dimension(required_param(user_wall_thickness, "user_wall_thickness"));
requested_shape_geometry_type = required_param(user_shape_geometry_type, "user_shape_geometry_type");
shape_geometry_type = assert(
    supported_shape_geometry_type(requested_shape_geometry_type),
    str("unsupported user_shape_geometry_type: ", requested_shape_geometry_type)
) requested_shape_geometry_type;
typewriter_mount_height = typewriter_shape_geometry_type(shape_geometry_type)
    ? positive_dimension(required_param(user_typewriter_mount_height, "user_typewriter_mount_height"))
    : 0;
typewriter_corner_radius = max(required_param(user_typewriter_corner_radius, "user_typewriter_corner_radius"), 0);
jis_enter_notch_width = jis_enter_shape_geometry_type(shape_geometry_type)
    ? max(required_param(user_jis_enter_notch_width, "user_jis_enter_notch_width"), 0)
    : 0;
jis_enter_notch_depth = jis_enter_shape_geometry_type(shape_geometry_type)
    ? max(required_param(user_jis_enter_notch_depth, "user_jis_enter_notch_depth"), 0)
    : 0;

profile_front_angle = required_param(user_profile_front_angle, "user_profile_front_angle");
profile_back_angle = required_param(user_profile_back_angle, "user_profile_back_angle");
profile_left_angle = required_param(user_profile_left_angle, "user_profile_left_angle");
profile_right_angle = required_param(user_profile_right_angle, "user_profile_right_angle");

top_thickness = max(required_param(user_top_thickness, "user_top_thickness"), 0.05);
bottom_corner_radius = max(required_param(user_bottom_corner_radius, "user_bottom_corner_radius"), 0);
keycap_shoulder_radius = keycap_top_hat_safe_shoulder_radius(required_param(user_keycap_shoulder_radius, "user_keycap_shoulder_radius"));
keycap_edge_radius = max(required_param(user_keycap_edge_radius, "user_keycap_edge_radius"), 0);
top_corner_radius = max(required_param(user_top_corner_radius, "user_top_corner_radius"), 0);
top_corner_individual_enabled = is_undef(user_top_corner_individual_enabled)
    ? false
    : user_top_corner_individual_enabled;
top_corner_radii_source = top_corner_individual_enabled
    ? required_param(user_top_corner_radii, "user_top_corner_radii")
    : [top_corner_radius, top_corner_radius, top_corner_radius, top_corner_radius];
top_corner_radii = top_corner_individual_enabled
    ? [for (index = [0 : 3]) max(top_corner_radii_source[index], 0)]
    : undef;
dish_radius = positive_dimension(required_param(user_dish_radius, "user_dish_radius"));
requested_dish_depth = required_param(user_dish_depth, "user_dish_depth");
requested_top_shape_type = is_undef(user_top_shape_type)
    ? (abs(requested_dish_depth) > 0.001 ? "spherical" : "flat")
    : user_top_shape_type;
top_shape_type = assert(
    supported_top_shape_type(requested_top_shape_type),
    str("unsupported user_top_shape_type: ", requested_top_shape_type)
) requested_top_shape_type;
dish_limit_base_left = jis_enter_shape_geometry_type(shape_geometry_type)
    ? jis_enter_plan_left(key_width, jis_enter_notch_width)
    : -key_width / 2;
dish_limit_base_right = jis_enter_shape_geometry_type(shape_geometry_type)
    ? jis_enter_plan_right(key_width, jis_enter_notch_width)
    : key_width / 2;
dish_limit_base_front = -key_depth / 2;
dish_limit_base_back = key_depth / 2;
dish_limit_top_left = dish_limit_base_left + top_center_height * tan(profile_left_angle);
dish_limit_top_right = dish_limit_base_right - top_center_height * tan(profile_right_angle);
dish_limit_top_front = dish_limit_base_front + top_center_height * tan(profile_front_angle);
dish_limit_top_back = dish_limit_base_back - top_center_height * tan(profile_back_angle);
dish_depth = top_shape_type == "flat"
    ? 0
    : keycap_clamp_dish_depth(
        top_shape_type,
        requested_dish_depth,
        dish_radius,
        dish_limit_top_left,
        dish_limit_top_right,
        dish_limit_top_front,
        dish_limit_top_back,
        key_width,
        key_depth
    );
top_pitch_deg = required_param(user_top_pitch_deg, "user_top_pitch_deg");
top_roll_deg = required_param(user_top_roll_deg, "user_top_roll_deg");
top_offset_x = required_param(user_top_offset_x, "user_top_offset_x");
top_offset_y = required_param(user_top_offset_y, "user_top_offset_y");
requested_top_hat_enabled = required_param(user_top_hat_enabled, "user_top_hat_enabled");
requested_top_hat_separate_enabled = is_undef(user_top_hat_separate_enabled)
    ? false
    : user_top_hat_separate_enabled;
top_hat_top_width = positive_dimension(required_param(user_top_hat_top_width, "user_top_hat_top_width"));
top_hat_top_depth = positive_dimension(required_param(user_top_hat_top_depth, "user_top_hat_top_depth"));
top_hat_bottom_width = is_undef(user_top_hat_bottom_width) ? undef : positive_dimension(user_top_hat_bottom_width);
top_hat_bottom_depth = is_undef(user_top_hat_bottom_depth) ? undef : positive_dimension(user_top_hat_bottom_depth);
top_hat_inset = max(required_param(user_top_hat_inset, "user_top_hat_inset"), 0);
top_hat_top_radius = max(required_param(user_top_hat_top_radius, "user_top_hat_top_radius"), 0);
top_hat_top_radius_individual_enabled = is_undef(user_top_hat_top_radius_individual_enabled)
    ? false
    : user_top_hat_top_radius_individual_enabled;
top_hat_top_radii_source = top_hat_top_radius_individual_enabled
    ? required_param(user_top_hat_top_radii, "user_top_hat_top_radii")
    : [top_hat_top_radius, top_hat_top_radius, top_hat_top_radius, top_hat_top_radius];
top_hat_top_radii = top_hat_top_radius_individual_enabled
    ? [for (index = [0 : 3]) max(top_hat_top_radii_source[index], 0)]
    : undef;
top_hat_bottom_radius = max(required_param(user_top_hat_bottom_radius, "user_top_hat_bottom_radius"), 0);
top_hat_bottom_radius_individual_enabled = is_undef(user_top_hat_bottom_radius_individual_enabled)
    ? false
    : user_top_hat_bottom_radius_individual_enabled;
top_hat_bottom_radii_source = top_hat_bottom_radius_individual_enabled
    ? required_param(user_top_hat_bottom_radii, "user_top_hat_bottom_radii")
    : [top_hat_bottom_radius, top_hat_bottom_radius, top_hat_bottom_radius, top_hat_bottom_radius];
top_hat_bottom_radii = top_hat_bottom_radius_individual_enabled
    ? [for (index = [0 : 3]) max(top_hat_bottom_radii_source[index], 0)]
    : undef;
requested_top_hat_height = required_param(user_top_hat_height, "user_top_hat_height");
top_hat_recess_limit = max(top_thickness - 0.05, 0);
top_hat_height = requested_top_hat_height < 0
    ? max(requested_top_hat_height, -top_hat_recess_limit)
    : requested_top_hat_height;
top_hat_shoulder_angle = keycap_top_hat_safe_shoulder_angle(required_param(user_top_hat_shoulder_angle, "user_top_hat_shoulder_angle"));
top_hat_shoulder_radius = keycap_top_hat_safe_shoulder_radius(required_param(user_top_hat_shoulder_radius, "user_top_hat_shoulder_radius"));
requested_top_hat_shape_type = is_undef(user_top_hat_shape_type)
    ? "flat"
    : user_top_hat_shape_type;
top_hat_shape_type = assert(
    supported_top_shape_type(requested_top_hat_shape_type),
    str("unsupported user_top_hat_shape_type: ", requested_top_hat_shape_type)
) requested_top_hat_shape_type;
requested_top_hat_dish_depth = is_undef(user_top_hat_dish_depth) ? 0 : user_top_hat_dish_depth;
top_hat_dish_radius = positive_dimension(is_undef(user_top_hat_dish_radius) ? dish_radius : user_top_hat_dish_radius);
top_hat_enabled = (shape_geometry_type == "shell" || shape_geometry_type == "jis_enter")
    && requested_top_hat_enabled
    && abs(top_hat_height) > 0.001;
top_hat_separate_part_enabled = top_hat_enabled
    && requested_top_hat_separate_enabled
    && top_hat_height > 0.001;
function top_hat_body_enabled(include_separate_top_hat) =
    top_hat_enabled && (!top_hat_separate_part_enabled || include_separate_top_hat);
top_hat_surface_z_shift = top_hat_enabled
    ? keycap_dish_surface_offset(
        0,
        0,
        top_shape_type,
        dish_depth,
        dish_radius,
        key_width,
        key_depth
    )
    : 0;
top_hat_reference_left = shape_geometry_type == "jis_enter"
    ? dish_limit_top_left + top_hat_inset
    : -min(top_hat_top_width, dish_limit_top_right - dish_limit_top_left) / 2;
top_hat_reference_right = shape_geometry_type == "jis_enter"
    ? dish_limit_top_right - top_hat_inset
    : min(top_hat_top_width, dish_limit_top_right - dish_limit_top_left) / 2;
top_hat_reference_front = shape_geometry_type == "jis_enter"
    ? dish_limit_top_front + top_hat_inset
    : -min(top_hat_top_depth, dish_limit_top_back - dish_limit_top_front) / 2;
top_hat_reference_back = shape_geometry_type == "jis_enter"
    ? dish_limit_top_back - top_hat_inset
    : min(top_hat_top_depth, dish_limit_top_back - dish_limit_top_front) / 2;
top_hat_reference_width = positive_dimension(top_hat_reference_right - top_hat_reference_left, 0.2);
top_hat_reference_depth = positive_dimension(top_hat_reference_back - top_hat_reference_front, 0.2);
top_hat_dish_depth = top_hat_shape_type == "flat"
    ? 0
    : keycap_clamp_dish_depth(
        top_hat_shape_type,
        requested_top_hat_dish_depth,
        top_hat_dish_radius,
        top_hat_reference_left,
        top_hat_reference_right,
        top_hat_reference_front,
        top_hat_reference_back,
        top_hat_reference_width,
        top_hat_reference_depth
    );
active_top_center_height = top_hat_enabled
    ? top_center_height + top_hat_surface_z_shift + top_hat_height
    : top_center_height;
active_top_shape_type = top_hat_enabled ? top_hat_shape_type : top_shape_type;
active_dish_depth = top_hat_enabled ? top_hat_dish_depth : dish_depth;
active_dish_radius = top_hat_enabled ? top_hat_dish_radius : dish_radius;
active_dish_plan_width = top_hat_enabled ? top_hat_reference_width : key_width;
active_dish_plan_depth = top_hat_enabled ? top_hat_reference_depth : key_depth;
active_dish_start_left = top_hat_enabled ? top_hat_reference_left : dish_limit_top_left;
active_dish_start_right = top_hat_enabled ? top_hat_reference_right : dish_limit_top_right;
active_dish_start_front = top_hat_enabled ? top_hat_reference_front : dish_limit_top_front;
active_dish_start_back = top_hat_enabled ? top_hat_reference_back : dish_limit_top_back;
requested_rim_enabled = required_param(user_rim_enabled, "user_rim_enabled");
rim_width = max(required_param(user_rim_width, "user_rim_width"), 0);
rim_height_up = max(required_param(user_rim_height_up, "user_rim_height_up"), 0);
rim_height_down = max(required_param(user_rim_height_down, "user_rim_height_down"), 0);
rim_enabled = typewriter_shape_geometry_type(shape_geometry_type) && requested_rim_enabled && rim_width > 0.001;

sidewall_base_left = jis_enter_shape_geometry_type(shape_geometry_type)
    ? jis_enter_plan_left(key_width, jis_enter_notch_width)
    : -key_width / 2;
sidewall_base_right = jis_enter_shape_geometry_type(shape_geometry_type)
    ? jis_enter_plan_right(key_width, jis_enter_notch_width)
    : key_width / 2;
sidewall_base_front = -key_depth / 2;
sidewall_base_back = key_depth / 2;
sidewall_top_left_local = sidewall_base_left + top_center_height * tan(profile_left_angle);
sidewall_top_right_local = sidewall_base_right - top_center_height * tan(profile_right_angle);
sidewall_top_front_local = sidewall_base_front + top_center_height * tan(profile_front_angle);
sidewall_top_back_local = sidewall_base_back - top_center_height * tan(profile_back_angle);
sidewall_top_left = sidewall_top_left_local + top_offset_x;
sidewall_top_right = sidewall_top_right_local + top_offset_x;
sidewall_top_front = sidewall_top_front_local + top_offset_y;
sidewall_top_back = sidewall_top_back_local + top_offset_y;

legend_enabled = required_param(user_legend_enabled, "user_legend_enabled");
legend_content_type = required_param(user_legend_content_type, "user_legend_content_type");
legend_text = required_param(user_legend_text, "user_legend_text");
legend_font_name = required_param(user_legend_font_name, "user_legend_font_name");
legend_icon_path = required_param(user_legend_icon_path, "user_legend_icon_path");
legend_underline_enabled = required_param(user_legend_underline_enabled, "user_legend_underline_enabled");
legend_underline_width = max(required_param(user_legend_underline_width, "user_legend_underline_width"), 0);
legend_underline_thickness = max(required_param(user_legend_underline_thickness, "user_legend_underline_thickness"), 0);
legend_underline_offset_y = required_param(user_legend_underline_offset_y, "user_legend_underline_offset_y");
legend_width = positive_dimension(required_param(user_legend_width, "user_legend_width"));
legend_depth = positive_dimension(required_param(user_legend_depth, "user_legend_depth"));
legend_text_size_value = positive_dimension(is_undef(user_legend_text_size) ? legend_depth : user_legend_text_size);
legend_height = required_param(user_legend_height, "user_legend_height");
legend_outline_delta = required_param(user_legend_outline_delta, "user_legend_outline_delta");
legend_offset_x = required_param(user_legend_offset_x, "user_legend_offset_x");
legend_offset_y = required_param(user_legend_offset_y, "user_legend_offset_y");
requested_legend_embed = max(required_param(user_legend_embed, "user_legend_embed"), 0);
legend_shine_through_enabled = is_undef(user_legend_shine_through_enabled) ? false : user_legend_shine_through_enabled;
// Keep a thin body-colored floor under flush legends so the top shell remains continuous.
// Shine-through drops that floor to 0, so the cut pierces the shell and the legend part
// becomes a full-depth insert that lets LED light through.
function legend_bottom_skin_amount(shine_through_enabled) =
    shine_through_enabled ? 0 : min(0.2, max(top_thickness * 0.5, 0.05));
legend_bottom_skin = legend_bottom_skin_amount(legend_shine_through_enabled);
legend_embed = min(max(requested_legend_embed, 0), max(top_thickness - legend_bottom_skin, 0));
// keycap_shell() builds the top face from a 0.01-thick slab, so subtraction must overshoot the surface slightly.
legend_visible_surface_overlap = 0.02;
legend_surface_height = legend_height;
legend_auto_embed = max(legend_embed, max(top_thickness - legend_bottom_skin, 0));
legend_below_surface = legend_surface_height <= 0
    ? max(legend_auto_embed, -legend_surface_height + legend_bottom_skin)
    : legend_embed;
legend_total_height = max(legend_below_surface + legend_surface_height, 0);
top_legend_anchor_width = top_hat_enabled ? active_dish_plan_width : key_width;
top_legend_anchor_depth = top_hat_enabled ? active_dish_plan_depth : key_depth;
// Keep corner legend anchors on the outer reference; defaults can offset inward from here.
top_legend_anchor_offset_ratio = 0.25;
function top_legend_anchor_x(anchor) =
    anchor == "right"
        ? top_legend_anchor_width * top_legend_anchor_offset_ratio
        : anchor == "left"
            ? -top_legend_anchor_width * top_legend_anchor_offset_ratio
            : 0;
function top_legend_anchor_y(anchor) =
    anchor == "top"
        ? top_legend_anchor_depth * top_legend_anchor_offset_ratio
        : anchor == "bottom"
            ? -top_legend_anchor_depth * top_legend_anchor_offset_ratio
            : 0;
function top_legend_auto_embed(embed, bottom_skin) =
    max(embed, max(top_thickness - bottom_skin, 0));
function top_legend_below_surface(surface_height, embed, bottom_skin) =
    surface_height <= 0
        ? max(top_legend_auto_embed(embed, bottom_skin), -surface_height + bottom_skin)
        : embed;
function top_legend_total_height(surface_height, below_surface) =
    max(below_surface + surface_height, 0);
function legend_has_content(label, content_type, icon_path) =
    content_type == "icon" ? len(icon_path) > 0 : len(label) > 0;

top_legend_right_top_enabled = required_param(user_top_legend_right_top_enabled, "user_top_legend_right_top_enabled");
top_legend_right_top_content_type = required_param(user_top_legend_right_top_content_type, "user_top_legend_right_top_content_type");
top_legend_right_top_text = required_param(user_top_legend_right_top_text, "user_top_legend_right_top_text");
top_legend_right_top_font_name = required_param(user_top_legend_right_top_font_name, "user_top_legend_right_top_font_name");
top_legend_right_top_icon_path = required_param(user_top_legend_right_top_icon_path, "user_top_legend_right_top_icon_path");
top_legend_right_top_underline_enabled = required_param(user_top_legend_right_top_underline_enabled, "user_top_legend_right_top_underline_enabled");
top_legend_right_top_underline_width = max(required_param(user_top_legend_right_top_underline_width, "user_top_legend_right_top_underline_width"), 0);
top_legend_right_top_underline_thickness = max(required_param(user_top_legend_right_top_underline_thickness, "user_top_legend_right_top_underline_thickness"), 0);
top_legend_right_top_underline_offset_y = required_param(user_top_legend_right_top_underline_offset_y, "user_top_legend_right_top_underline_offset_y");
top_legend_right_top_width = positive_dimension(required_param(user_top_legend_right_top_width, "user_top_legend_right_top_width"));
top_legend_right_top_depth = positive_dimension(required_param(user_top_legend_right_top_depth, "user_top_legend_right_top_depth"));
top_legend_right_top_text_size_value = positive_dimension(is_undef(user_top_legend_right_top_text_size) ? top_legend_right_top_depth : user_top_legend_right_top_text_size);
top_legend_right_top_height = required_param(user_top_legend_right_top_height, "user_top_legend_right_top_height");
top_legend_right_top_outline_delta = required_param(user_top_legend_right_top_outline_delta, "user_top_legend_right_top_outline_delta");
top_legend_right_top_offset_x = required_param(user_top_legend_right_top_offset_x, "user_top_legend_right_top_offset_x");
top_legend_right_top_offset_y = required_param(user_top_legend_right_top_offset_y, "user_top_legend_right_top_offset_y");
top_legend_right_top_shine_through_enabled = is_undef(user_top_legend_right_top_shine_through_enabled) ? false : user_top_legend_right_top_shine_through_enabled;
top_legend_right_top_bottom_skin = legend_bottom_skin_amount(top_legend_right_top_shine_through_enabled);
top_legend_right_top_embed = min(max(required_param(user_top_legend_right_top_embed, "user_top_legend_right_top_embed"), 0), max(top_thickness - top_legend_right_top_bottom_skin, 0));
top_legend_right_top_surface_height = top_legend_right_top_height;
top_legend_right_top_below_surface = top_legend_below_surface(top_legend_right_top_surface_height, top_legend_right_top_embed, top_legend_right_top_bottom_skin);
top_legend_right_top_total_height = top_legend_total_height(top_legend_right_top_surface_height, top_legend_right_top_below_surface);

top_legend_right_bottom_enabled = required_param(user_top_legend_right_bottom_enabled, "user_top_legend_right_bottom_enabled");
top_legend_right_bottom_content_type = required_param(user_top_legend_right_bottom_content_type, "user_top_legend_right_bottom_content_type");
top_legend_right_bottom_text = required_param(user_top_legend_right_bottom_text, "user_top_legend_right_bottom_text");
top_legend_right_bottom_font_name = required_param(user_top_legend_right_bottom_font_name, "user_top_legend_right_bottom_font_name");
top_legend_right_bottom_icon_path = required_param(user_top_legend_right_bottom_icon_path, "user_top_legend_right_bottom_icon_path");
top_legend_right_bottom_underline_enabled = required_param(user_top_legend_right_bottom_underline_enabled, "user_top_legend_right_bottom_underline_enabled");
top_legend_right_bottom_underline_width = max(required_param(user_top_legend_right_bottom_underline_width, "user_top_legend_right_bottom_underline_width"), 0);
top_legend_right_bottom_underline_thickness = max(required_param(user_top_legend_right_bottom_underline_thickness, "user_top_legend_right_bottom_underline_thickness"), 0);
top_legend_right_bottom_underline_offset_y = required_param(user_top_legend_right_bottom_underline_offset_y, "user_top_legend_right_bottom_underline_offset_y");
top_legend_right_bottom_width = positive_dimension(required_param(user_top_legend_right_bottom_width, "user_top_legend_right_bottom_width"));
top_legend_right_bottom_depth = positive_dimension(required_param(user_top_legend_right_bottom_depth, "user_top_legend_right_bottom_depth"));
top_legend_right_bottom_text_size_value = positive_dimension(is_undef(user_top_legend_right_bottom_text_size) ? top_legend_right_bottom_depth : user_top_legend_right_bottom_text_size);
top_legend_right_bottom_height = required_param(user_top_legend_right_bottom_height, "user_top_legend_right_bottom_height");
top_legend_right_bottom_outline_delta = required_param(user_top_legend_right_bottom_outline_delta, "user_top_legend_right_bottom_outline_delta");
top_legend_right_bottom_offset_x = required_param(user_top_legend_right_bottom_offset_x, "user_top_legend_right_bottom_offset_x");
top_legend_right_bottom_offset_y = required_param(user_top_legend_right_bottom_offset_y, "user_top_legend_right_bottom_offset_y");
top_legend_right_bottom_shine_through_enabled = is_undef(user_top_legend_right_bottom_shine_through_enabled) ? false : user_top_legend_right_bottom_shine_through_enabled;
top_legend_right_bottom_bottom_skin = legend_bottom_skin_amount(top_legend_right_bottom_shine_through_enabled);
top_legend_right_bottom_embed = min(max(required_param(user_top_legend_right_bottom_embed, "user_top_legend_right_bottom_embed"), 0), max(top_thickness - top_legend_right_bottom_bottom_skin, 0));
top_legend_right_bottom_surface_height = top_legend_right_bottom_height;
top_legend_right_bottom_below_surface = top_legend_below_surface(top_legend_right_bottom_surface_height, top_legend_right_bottom_embed, top_legend_right_bottom_bottom_skin);
top_legend_right_bottom_total_height = top_legend_total_height(top_legend_right_bottom_surface_height, top_legend_right_bottom_below_surface);

top_legend_left_top_enabled = required_param(user_top_legend_left_top_enabled, "user_top_legend_left_top_enabled");
top_legend_left_top_content_type = required_param(user_top_legend_left_top_content_type, "user_top_legend_left_top_content_type");
top_legend_left_top_text = required_param(user_top_legend_left_top_text, "user_top_legend_left_top_text");
top_legend_left_top_font_name = required_param(user_top_legend_left_top_font_name, "user_top_legend_left_top_font_name");
top_legend_left_top_icon_path = required_param(user_top_legend_left_top_icon_path, "user_top_legend_left_top_icon_path");
top_legend_left_top_underline_enabled = required_param(user_top_legend_left_top_underline_enabled, "user_top_legend_left_top_underline_enabled");
top_legend_left_top_underline_width = max(required_param(user_top_legend_left_top_underline_width, "user_top_legend_left_top_underline_width"), 0);
top_legend_left_top_underline_thickness = max(required_param(user_top_legend_left_top_underline_thickness, "user_top_legend_left_top_underline_thickness"), 0);
top_legend_left_top_underline_offset_y = required_param(user_top_legend_left_top_underline_offset_y, "user_top_legend_left_top_underline_offset_y");
top_legend_left_top_width = positive_dimension(required_param(user_top_legend_left_top_width, "user_top_legend_left_top_width"));
top_legend_left_top_depth = positive_dimension(required_param(user_top_legend_left_top_depth, "user_top_legend_left_top_depth"));
top_legend_left_top_text_size_value = positive_dimension(is_undef(user_top_legend_left_top_text_size) ? top_legend_left_top_depth : user_top_legend_left_top_text_size);
top_legend_left_top_height = required_param(user_top_legend_left_top_height, "user_top_legend_left_top_height");
top_legend_left_top_outline_delta = required_param(user_top_legend_left_top_outline_delta, "user_top_legend_left_top_outline_delta");
top_legend_left_top_offset_x = required_param(user_top_legend_left_top_offset_x, "user_top_legend_left_top_offset_x");
top_legend_left_top_offset_y = required_param(user_top_legend_left_top_offset_y, "user_top_legend_left_top_offset_y");
top_legend_left_top_shine_through_enabled = is_undef(user_top_legend_left_top_shine_through_enabled) ? false : user_top_legend_left_top_shine_through_enabled;
top_legend_left_top_bottom_skin = legend_bottom_skin_amount(top_legend_left_top_shine_through_enabled);
top_legend_left_top_embed = min(max(required_param(user_top_legend_left_top_embed, "user_top_legend_left_top_embed"), 0), max(top_thickness - top_legend_left_top_bottom_skin, 0));
top_legend_left_top_surface_height = top_legend_left_top_height;
top_legend_left_top_below_surface = top_legend_below_surface(top_legend_left_top_surface_height, top_legend_left_top_embed, top_legend_left_top_bottom_skin);
top_legend_left_top_total_height = top_legend_total_height(top_legend_left_top_surface_height, top_legend_left_top_below_surface);

top_legend_left_bottom_enabled = required_param(user_top_legend_left_bottom_enabled, "user_top_legend_left_bottom_enabled");
top_legend_left_bottom_content_type = required_param(user_top_legend_left_bottom_content_type, "user_top_legend_left_bottom_content_type");
top_legend_left_bottom_text = required_param(user_top_legend_left_bottom_text, "user_top_legend_left_bottom_text");
top_legend_left_bottom_font_name = required_param(user_top_legend_left_bottom_font_name, "user_top_legend_left_bottom_font_name");
top_legend_left_bottom_icon_path = required_param(user_top_legend_left_bottom_icon_path, "user_top_legend_left_bottom_icon_path");
top_legend_left_bottom_underline_enabled = required_param(user_top_legend_left_bottom_underline_enabled, "user_top_legend_left_bottom_underline_enabled");
top_legend_left_bottom_underline_width = max(required_param(user_top_legend_left_bottom_underline_width, "user_top_legend_left_bottom_underline_width"), 0);
top_legend_left_bottom_underline_thickness = max(required_param(user_top_legend_left_bottom_underline_thickness, "user_top_legend_left_bottom_underline_thickness"), 0);
top_legend_left_bottom_underline_offset_y = required_param(user_top_legend_left_bottom_underline_offset_y, "user_top_legend_left_bottom_underline_offset_y");
top_legend_left_bottom_width = positive_dimension(required_param(user_top_legend_left_bottom_width, "user_top_legend_left_bottom_width"));
top_legend_left_bottom_depth = positive_dimension(required_param(user_top_legend_left_bottom_depth, "user_top_legend_left_bottom_depth"));
top_legend_left_bottom_text_size_value = positive_dimension(is_undef(user_top_legend_left_bottom_text_size) ? top_legend_left_bottom_depth : user_top_legend_left_bottom_text_size);
top_legend_left_bottom_height = required_param(user_top_legend_left_bottom_height, "user_top_legend_left_bottom_height");
top_legend_left_bottom_outline_delta = required_param(user_top_legend_left_bottom_outline_delta, "user_top_legend_left_bottom_outline_delta");
top_legend_left_bottom_offset_x = required_param(user_top_legend_left_bottom_offset_x, "user_top_legend_left_bottom_offset_x");
top_legend_left_bottom_offset_y = required_param(user_top_legend_left_bottom_offset_y, "user_top_legend_left_bottom_offset_y");
top_legend_left_bottom_shine_through_enabled = is_undef(user_top_legend_left_bottom_shine_through_enabled) ? false : user_top_legend_left_bottom_shine_through_enabled;
top_legend_left_bottom_bottom_skin = legend_bottom_skin_amount(top_legend_left_bottom_shine_through_enabled);
top_legend_left_bottom_embed = min(max(required_param(user_top_legend_left_bottom_embed, "user_top_legend_left_bottom_embed"), 0), max(top_thickness - top_legend_left_bottom_bottom_skin, 0));
top_legend_left_bottom_surface_height = top_legend_left_bottom_height;
top_legend_left_bottom_below_surface = top_legend_below_surface(top_legend_left_bottom_surface_height, top_legend_left_bottom_embed, top_legend_left_bottom_bottom_skin);
top_legend_left_bottom_total_height = top_legend_total_height(top_legend_left_bottom_surface_height, top_legend_left_bottom_below_surface);

side_legend_front_enabled = required_param(user_side_legend_front_enabled, "user_side_legend_front_enabled");
side_legend_front_content_type = required_param(user_side_legend_front_content_type, "user_side_legend_front_content_type");
side_legend_front_text = required_param(user_side_legend_front_text, "user_side_legend_front_text");
side_legend_front_font_name = required_param(user_side_legend_front_font_name, "user_side_legend_front_font_name");
side_legend_front_icon_path = required_param(user_side_legend_front_icon_path, "user_side_legend_front_icon_path");
side_legend_front_underline_enabled = required_param(user_side_legend_front_underline_enabled, "user_side_legend_front_underline_enabled");
side_legend_front_underline_width = max(required_param(user_side_legend_front_underline_width, "user_side_legend_front_underline_width"), 0);
side_legend_front_underline_thickness = max(required_param(user_side_legend_front_underline_thickness, "user_side_legend_front_underline_thickness"), 0);
side_legend_front_underline_offset_y = required_param(user_side_legend_front_underline_offset_y, "user_side_legend_front_underline_offset_y");
side_legend_front_width = positive_dimension(required_param(user_side_legend_front_width, "user_side_legend_front_width"));
side_legend_front_depth = positive_dimension(required_param(user_side_legend_front_depth, "user_side_legend_front_depth"));
side_legend_front_text_size_value = positive_dimension(is_undef(user_side_legend_front_text_size) ? side_legend_front_depth : user_side_legend_front_text_size);
side_legend_front_height = required_param(user_side_legend_front_height, "user_side_legend_front_height");
side_legend_front_outline_delta = required_param(user_side_legend_front_outline_delta, "user_side_legend_front_outline_delta");
side_legend_front_offset_x = required_param(user_side_legend_front_offset_x, "user_side_legend_front_offset_x");
side_legend_front_offset_y = required_param(user_side_legend_front_offset_y, "user_side_legend_front_offset_y");

side_legend_back_enabled = required_param(user_side_legend_back_enabled, "user_side_legend_back_enabled");
side_legend_back_content_type = required_param(user_side_legend_back_content_type, "user_side_legend_back_content_type");
side_legend_back_text = required_param(user_side_legend_back_text, "user_side_legend_back_text");
side_legend_back_font_name = required_param(user_side_legend_back_font_name, "user_side_legend_back_font_name");
side_legend_back_icon_path = required_param(user_side_legend_back_icon_path, "user_side_legend_back_icon_path");
side_legend_back_underline_enabled = required_param(user_side_legend_back_underline_enabled, "user_side_legend_back_underline_enabled");
side_legend_back_underline_width = max(required_param(user_side_legend_back_underline_width, "user_side_legend_back_underline_width"), 0);
side_legend_back_underline_thickness = max(required_param(user_side_legend_back_underline_thickness, "user_side_legend_back_underline_thickness"), 0);
side_legend_back_underline_offset_y = required_param(user_side_legend_back_underline_offset_y, "user_side_legend_back_underline_offset_y");
side_legend_back_width = positive_dimension(required_param(user_side_legend_back_width, "user_side_legend_back_width"));
side_legend_back_depth = positive_dimension(required_param(user_side_legend_back_depth, "user_side_legend_back_depth"));
side_legend_back_text_size_value = positive_dimension(is_undef(user_side_legend_back_text_size) ? side_legend_back_depth : user_side_legend_back_text_size);
side_legend_back_height = required_param(user_side_legend_back_height, "user_side_legend_back_height");
side_legend_back_outline_delta = required_param(user_side_legend_back_outline_delta, "user_side_legend_back_outline_delta");
side_legend_back_offset_x = required_param(user_side_legend_back_offset_x, "user_side_legend_back_offset_x");
side_legend_back_offset_y = required_param(user_side_legend_back_offset_y, "user_side_legend_back_offset_y");

side_legend_left_enabled = required_param(user_side_legend_left_enabled, "user_side_legend_left_enabled");
side_legend_left_content_type = required_param(user_side_legend_left_content_type, "user_side_legend_left_content_type");
side_legend_left_text = required_param(user_side_legend_left_text, "user_side_legend_left_text");
side_legend_left_font_name = required_param(user_side_legend_left_font_name, "user_side_legend_left_font_name");
side_legend_left_icon_path = required_param(user_side_legend_left_icon_path, "user_side_legend_left_icon_path");
side_legend_left_underline_enabled = required_param(user_side_legend_left_underline_enabled, "user_side_legend_left_underline_enabled");
side_legend_left_underline_width = max(required_param(user_side_legend_left_underline_width, "user_side_legend_left_underline_width"), 0);
side_legend_left_underline_thickness = max(required_param(user_side_legend_left_underline_thickness, "user_side_legend_left_underline_thickness"), 0);
side_legend_left_underline_offset_y = required_param(user_side_legend_left_underline_offset_y, "user_side_legend_left_underline_offset_y");
side_legend_left_width = positive_dimension(required_param(user_side_legend_left_width, "user_side_legend_left_width"));
side_legend_left_depth = positive_dimension(required_param(user_side_legend_left_depth, "user_side_legend_left_depth"));
side_legend_left_text_size_value = positive_dimension(is_undef(user_side_legend_left_text_size) ? side_legend_left_depth : user_side_legend_left_text_size);
side_legend_left_height = required_param(user_side_legend_left_height, "user_side_legend_left_height");
side_legend_left_outline_delta = required_param(user_side_legend_left_outline_delta, "user_side_legend_left_outline_delta");
side_legend_left_offset_x = required_param(user_side_legend_left_offset_x, "user_side_legend_left_offset_x");
side_legend_left_offset_y = required_param(user_side_legend_left_offset_y, "user_side_legend_left_offset_y");

side_legend_right_enabled = required_param(user_side_legend_right_enabled, "user_side_legend_right_enabled");
side_legend_right_content_type = required_param(user_side_legend_right_content_type, "user_side_legend_right_content_type");
side_legend_right_text = required_param(user_side_legend_right_text, "user_side_legend_right_text");
side_legend_right_font_name = required_param(user_side_legend_right_font_name, "user_side_legend_right_font_name");
side_legend_right_icon_path = required_param(user_side_legend_right_icon_path, "user_side_legend_right_icon_path");
side_legend_right_underline_enabled = required_param(user_side_legend_right_underline_enabled, "user_side_legend_right_underline_enabled");
side_legend_right_underline_width = max(required_param(user_side_legend_right_underline_width, "user_side_legend_right_underline_width"), 0);
side_legend_right_underline_thickness = max(required_param(user_side_legend_right_underline_thickness, "user_side_legend_right_underline_thickness"), 0);
side_legend_right_underline_offset_y = required_param(user_side_legend_right_underline_offset_y, "user_side_legend_right_underline_offset_y");
side_legend_right_width = positive_dimension(required_param(user_side_legend_right_width, "user_side_legend_right_width"));
side_legend_right_depth = positive_dimension(required_param(user_side_legend_right_depth, "user_side_legend_right_depth"));
side_legend_right_text_size_value = positive_dimension(is_undef(user_side_legend_right_text_size) ? side_legend_right_depth : user_side_legend_right_text_size);
side_legend_right_height = required_param(user_side_legend_right_height, "user_side_legend_right_height");
side_legend_right_outline_delta = required_param(user_side_legend_right_outline_delta, "user_side_legend_right_outline_delta");
side_legend_right_offset_x = required_param(user_side_legend_right_offset_x, "user_side_legend_right_offset_x");
side_legend_right_offset_y = required_param(user_side_legend_right_offset_y, "user_side_legend_right_offset_y");

side_legend_visible_surface_overlap = 0.02;
side_legend_inner_cut_overlap = 0.05;

requested_stem_type = required_param(user_stem_type, "user_stem_type");
stem_type = assert(
    supported_stem_type(requested_stem_type),
    str("unsupported user_stem_type: ", requested_stem_type)
) requested_stem_type;
stem_enabled = required_param(user_stem_enabled, "user_stem_enabled") && stem_type != "none";
stem_positive_enabled = stem_enabled && !receiver_recess_stem_type(stem_type);
stem_outer_delta = required_param(user_stem_outer_delta, "user_stem_outer_delta");
stem_cross_margin = required_param(user_stem_cross_margin, "user_stem_cross_margin");
stem_inset_delta = required_param(user_stem_inset_delta, "user_stem_inset_delta");
legacy_stem_width = is_undef(user_stem_width) ? legacy_stem_nominal_width : user_stem_width;
legacy_stem_depth = is_undef(user_stem_depth) ? legacy_stem_nominal_depth : user_stem_depth;
stem_outer_diameter = !is_undef(user_stem_outer_diameter)
    ? positive_dimension(user_stem_outer_diameter)
    : (!is_undef(user_stem_width) || !is_undef(user_stem_depth))
        ? positive_dimension(min(legacy_stem_width, legacy_stem_depth))
        : positive_dimension(stem_nominal_outer_diameter_for_type(stem_type) + stem_outer_delta);
stem_inset = is_undef(user_stem_inset)
    ? stem_nominal_inset_for_type(stem_type) + stem_inset_delta
    : user_stem_inset;
stem_cross_width_horizontal = is_undef(user_stem_cross_width_horizontal)
    ? stem_cross_dimension(stem_nominal_cross_width_horizontal_for_type(stem_type), stem_cross_margin)
    : user_stem_cross_width_horizontal;
stem_cross_length_horizontal = is_undef(user_stem_cross_length_horizontal)
    ? stem_cross_dimension(stem_nominal_cross_length_horizontal_for_type(stem_type), stem_cross_margin)
    : user_stem_cross_length_horizontal;
stem_cross_width_vertical = is_undef(user_stem_cross_width_vertical)
    ? stem_cross_dimension(stem_nominal_cross_width_vertical_for_type(stem_type), stem_cross_margin)
    : user_stem_cross_width_vertical;
stem_cross_length_vertical = is_undef(user_stem_cross_length_vertical)
    ? stem_cross_dimension(stem_nominal_cross_length_vertical_for_type(stem_type), stem_cross_margin)
    : user_stem_cross_length_vertical;
stem_cross_chamfer = is_undef(user_stem_cross_chamfer)
    ? stem_nominal_cross_chamfer_for_type(stem_type)
    : user_stem_cross_chamfer;
stem_post_fit_delta = stem_cross_margin * 2;
stem_choc_v1_prong_width = positive_dimension(stem_choc_v1_nominal_prong_width - stem_post_fit_delta);
stem_choc_v1_prong_depth = positive_dimension(stem_choc_v1_nominal_prong_depth - stem_post_fit_delta);
stem_choc_v1_prong_spacing = stem_choc_v1_nominal_prong_spacing;
stem_choc_v1_lead_in = stem_choc_v1_nominal_lead_in;
stem_alps_length = positive_dimension(stem_alps_nominal_length - stem_post_fit_delta);
stem_alps_width = positive_dimension(stem_alps_nominal_width - stem_post_fit_delta);
stem_alps_lead_in = stem_alps_nominal_lead_in;
stem_clip_overlap = 0.05;
stem_clip_bottom_extension = max(1, stem_clip_overlap - stem_inset + 0.02);
stem_safe_radius = stem_footprint_radius(
    stem_type,
    stem_outer_diameter,
    stem_choc_v1_prong_width,
    stem_choc_v1_prong_depth,
    stem_choc_v1_prong_spacing,
    stem_alps_length,
    stem_alps_width
);
stem_auto_contact_height = keycap_inner_height(top_center_height, dish_depth, top_thickness)
    + stem_safe_radius * stem_plane_slope_magnitude(top_pitch_deg, top_roll_deg)
    + abs(top_offset_x * tan(top_roll_deg))
    + abs(top_offset_y * tan(top_pitch_deg))
    - stem_inset
    + stem_clip_overlap;
typewriter_stem_height = typewriter_stem_height_from_mount_height(typewriter_mount_height, top_center_height);
requested_stem_height = is_undef(user_stem_height)
    ? (
        typewriter_shape_geometry_type(shape_geometry_type)
            ? typewriter_stem_height
            : max(stem_nominal_height_for_type(stem_type), stem_auto_contact_height)
    )
    : max(user_stem_height, 0.6);
stem_height = max(requested_stem_height, 0.6);
stem_receiver_mount_z = keycap_inner_height(top_center_height, dish_depth, top_thickness);
stem_receiver_recess_overlap = 0.02;
stem_receiver_recess_depth_limit = max(top_thickness - 0.05, 0.02);
stem_receiver_recess_depth = min(
    max(stem_j_stem_lp01_nominal_plate_thickness + stem_inset_delta, 0.05),
    stem_receiver_recess_depth_limit
);
stem_receiver_recess_height = stem_receiver_recess_depth + stem_receiver_recess_overlap * 2;

homing_bar_enabled = required_param(user_homing_bar_enabled, "user_homing_bar_enabled");
homing_bar_height = max(required_param(user_homing_bar_height, "user_homing_bar_height"), 0);
homing_bar_length = positive_dimension(required_param(user_homing_bar_length, "user_homing_bar_length"));
homing_bar_width = positive_dimension(required_param(user_homing_bar_width, "user_homing_bar_width"));
homing_bar_offset_y = required_param(user_homing_bar_offset_y, "user_homing_bar_offset_y");
homing_bar_base_thickness = 0.35;
homing_bar_chamfer = max(is_undef(user_homing_bar_chamfer) ? 0 : user_homing_bar_chamfer, 0);
homing_bar_anchor_surface_z = keycap_surface_z(
    0,
    homing_bar_offset_y,
    active_top_center_height,
    active_top_shape_type,
    active_dish_depth,
    active_dish_radius,
    top_pitch_deg,
    top_roll_deg,
    active_dish_plan_width,
    active_dish_plan_depth,
    active_dish_start_left,
    active_dish_start_right,
    active_dish_start_front,
    active_dish_start_back
);
homing_bar_anchor_plane_z = keycap_top_plane_height(
    0,
    homing_bar_offset_y,
    active_top_center_height,
    top_pitch_deg,
    top_roll_deg
);
homing_bar_surface_delta = homing_bar_anchor_surface_z - homing_bar_anchor_plane_z;

module keycap_top_legend_flat_block(
    enabled,
    label,
    width,
    depth,
    height,
    anchor_x,
    anchor_y,
    offset_x,
    offset_y,
    below_surface,
    font_name,
    underline_enabled,
    underline_width,
    underline_thickness,
    underline_offset_y,
    content_type,
    icon_path,
    outline_delta,
    text_size,
    quality = "export"
) {
    if (enabled && legend_has_content(label, content_type, icon_path) && height > 0) {
        keycap_top_plane_transform(active_top_center_height, top_pitch_deg, top_roll_deg, top_offset_x, top_offset_y)
            legend_block(
                label = label,
                width = width,
                depth = depth,
                height = height,
                offset_x = anchor_x + offset_x,
                offset_y = anchor_y + offset_y,
                base_z = -below_surface,
                font_name = font_name,
                underline_enabled = underline_enabled,
                underline_width = underline_width,
                underline_thickness = underline_thickness,
                underline_offset_y = underline_offset_y,
                content_type = content_type,
                icon_path = icon_path,
                outline_delta = outline_delta,
                text_size = text_size,
                quality = quality
            );
    }
}

module keycap_top_legend_surface_volume(
    enabled,
    label,
    width,
    depth,
    surface_height,
    below_surface,
    total_height,
    anchor_x,
    anchor_y,
    offset_x,
    offset_y,
    font_name,
    underline_enabled,
    underline_width,
    underline_thickness,
    underline_offset_y,
    content_type,
    icon_path,
    outline_delta,
    text_size,
    top_overlap = 0,
    quality = "export"
) {
    if (enabled && legend_has_content(label, content_type, icon_path) && total_height > 0) {
        center_x = anchor_x + offset_x;
        center_y = anchor_y + offset_y;
        surface_fit_drop = keycap_dish_max_drop(active_top_shape_type, active_dish_depth) + 0.05;
        surface_fit_rise = keycap_dish_max_rise(active_top_shape_type, active_dish_depth);
        effective_surface_height = top_overlap > 0 && surface_height < 0
            ? top_overlap
            : surface_height + top_overlap;
        effective_total_height = below_surface + effective_surface_height;

        intersection() {
            keycap_top_legend_flat_block(
                enabled = enabled,
                label = label,
                width = width,
                depth = depth,
                height = effective_total_height + surface_fit_drop + surface_fit_rise,
                anchor_x = anchor_x,
                anchor_y = anchor_y,
                offset_x = offset_x,
                offset_y = offset_y,
                below_surface = below_surface + surface_fit_drop,
                font_name = font_name,
                underline_enabled = underline_enabled,
                underline_width = underline_width,
                underline_thickness = underline_thickness,
                underline_offset_y = underline_offset_y,
                content_type = content_type,
                icon_path = icon_path,
                outline_delta = outline_delta,
                text_size = text_size,
                quality = quality
            );

            keycap_top_surface_band(
                left = center_x - width / 2,
                right = center_x + width / 2,
                front = center_y - depth / 2,
                back = center_y + depth / 2,
                radius = 0,
                top_center_height = active_top_center_height,
                dish_type = active_top_shape_type,
                dish_depth = active_dish_depth,
                dish_radius = active_dish_radius,
                pitch_deg = top_pitch_deg,
                roll_deg = top_roll_deg,
                dish_plan_width = active_dish_plan_width,
                dish_plan_depth = active_dish_plan_depth,
                dish_start_left = active_dish_start_left,
                dish_start_right = active_dish_start_right,
                dish_start_front = active_dish_start_front,
                dish_start_back = active_dish_start_back,
                quality = quality,
                top_offset_x = top_offset_x,
                top_offset_y = top_offset_y,
                bottom_extra_z = -below_surface,
                top_extra_z = effective_surface_height
            );
        }
    }
}

module keycap_legend_surface_volume(top_overlap = 0, quality = "export") {
    keycap_top_legend_surface_volume(
        enabled = legend_enabled,
        label = legend_text,
        width = legend_width,
        depth = legend_depth,
        surface_height = legend_surface_height,
        below_surface = legend_below_surface,
        total_height = legend_total_height,
        anchor_x = 0,
        anchor_y = 0,
        offset_x = legend_offset_x,
        offset_y = legend_offset_y,
        font_name = legend_font_name,
        underline_enabled = legend_underline_enabled,
        underline_width = legend_underline_width,
        underline_thickness = legend_underline_thickness,
        underline_offset_y = legend_underline_offset_y,
        content_type = legend_content_type,
        icon_path = legend_icon_path,
        outline_delta = legend_outline_delta,
        text_size = legend_text_size_value,
        top_overlap = top_overlap,
        quality = quality
    );
}

module keycap_legend_volume(quality = "export") {
    keycap_legend_surface_volume(0, quality);
}

module keycap_legend_visible_volume(quality = "export") {
    keycap_legend_surface_volume(legend_visible_surface_overlap, quality);
}

module keycap_top_legend_right_top_volume(top_overlap = 0, quality = "export") {
    keycap_top_legend_surface_volume(
        enabled = top_legend_right_top_enabled,
        label = top_legend_right_top_text,
        width = top_legend_right_top_width,
        depth = top_legend_right_top_depth,
        surface_height = top_legend_right_top_surface_height,
        below_surface = top_legend_right_top_below_surface,
        total_height = top_legend_right_top_total_height,
        anchor_x = top_legend_anchor_x("right"),
        anchor_y = top_legend_anchor_y("top"),
        offset_x = top_legend_right_top_offset_x,
        offset_y = top_legend_right_top_offset_y,
        font_name = top_legend_right_top_font_name,
        underline_enabled = top_legend_right_top_underline_enabled,
        underline_width = top_legend_right_top_underline_width,
        underline_thickness = top_legend_right_top_underline_thickness,
        underline_offset_y = top_legend_right_top_underline_offset_y,
        content_type = top_legend_right_top_content_type,
        icon_path = top_legend_right_top_icon_path,
        outline_delta = top_legend_right_top_outline_delta,
        text_size = top_legend_right_top_text_size_value,
        top_overlap = top_overlap,
        quality = quality
    );
}

module keycap_top_legend_right_bottom_volume(top_overlap = 0, quality = "export") {
    keycap_top_legend_surface_volume(
        enabled = top_legend_right_bottom_enabled,
        label = top_legend_right_bottom_text,
        width = top_legend_right_bottom_width,
        depth = top_legend_right_bottom_depth,
        surface_height = top_legend_right_bottom_surface_height,
        below_surface = top_legend_right_bottom_below_surface,
        total_height = top_legend_right_bottom_total_height,
        anchor_x = top_legend_anchor_x("right"),
        anchor_y = top_legend_anchor_y("bottom"),
        offset_x = top_legend_right_bottom_offset_x,
        offset_y = top_legend_right_bottom_offset_y,
        font_name = top_legend_right_bottom_font_name,
        underline_enabled = top_legend_right_bottom_underline_enabled,
        underline_width = top_legend_right_bottom_underline_width,
        underline_thickness = top_legend_right_bottom_underline_thickness,
        underline_offset_y = top_legend_right_bottom_underline_offset_y,
        content_type = top_legend_right_bottom_content_type,
        icon_path = top_legend_right_bottom_icon_path,
        outline_delta = top_legend_right_bottom_outline_delta,
        text_size = top_legend_right_bottom_text_size_value,
        top_overlap = top_overlap,
        quality = quality
    );
}

module keycap_top_legend_left_top_volume(top_overlap = 0, quality = "export") {
    keycap_top_legend_surface_volume(
        enabled = top_legend_left_top_enabled,
        label = top_legend_left_top_text,
        width = top_legend_left_top_width,
        depth = top_legend_left_top_depth,
        surface_height = top_legend_left_top_surface_height,
        below_surface = top_legend_left_top_below_surface,
        total_height = top_legend_left_top_total_height,
        anchor_x = top_legend_anchor_x("left"),
        anchor_y = top_legend_anchor_y("top"),
        offset_x = top_legend_left_top_offset_x,
        offset_y = top_legend_left_top_offset_y,
        font_name = top_legend_left_top_font_name,
        underline_enabled = top_legend_left_top_underline_enabled,
        underline_width = top_legend_left_top_underline_width,
        underline_thickness = top_legend_left_top_underline_thickness,
        underline_offset_y = top_legend_left_top_underline_offset_y,
        content_type = top_legend_left_top_content_type,
        icon_path = top_legend_left_top_icon_path,
        outline_delta = top_legend_left_top_outline_delta,
        text_size = top_legend_left_top_text_size_value,
        top_overlap = top_overlap,
        quality = quality
    );
}

module keycap_top_legend_left_bottom_volume(top_overlap = 0, quality = "export") {
    keycap_top_legend_surface_volume(
        enabled = top_legend_left_bottom_enabled,
        label = top_legend_left_bottom_text,
        width = top_legend_left_bottom_width,
        depth = top_legend_left_bottom_depth,
        surface_height = top_legend_left_bottom_surface_height,
        below_surface = top_legend_left_bottom_below_surface,
        total_height = top_legend_left_bottom_total_height,
        anchor_x = top_legend_anchor_x("left"),
        anchor_y = top_legend_anchor_y("bottom"),
        offset_x = top_legend_left_bottom_offset_x,
        offset_y = top_legend_left_bottom_offset_y,
        font_name = top_legend_left_bottom_font_name,
        underline_enabled = top_legend_left_bottom_underline_enabled,
        underline_width = top_legend_left_bottom_underline_width,
        underline_thickness = top_legend_left_bottom_underline_thickness,
        underline_offset_y = top_legend_left_bottom_underline_offset_y,
        content_type = top_legend_left_bottom_content_type,
        icon_path = top_legend_left_bottom_icon_path,
        outline_delta = top_legend_left_bottom_outline_delta,
        text_size = top_legend_left_bottom_text_size_value,
        top_overlap = top_overlap,
        quality = quality
    );
}

module keycap_top_corner_legends_volume(quality = "export") {
    keycap_top_legend_right_top_volume(0, quality);
    keycap_top_legend_right_bottom_volume(0, quality);
    keycap_top_legend_left_top_volume(0, quality);
    keycap_top_legend_left_bottom_volume(0, quality);
}

module keycap_top_corner_legends_visible_volume(quality = "export") {
    keycap_top_legend_right_top_volume(legend_visible_surface_overlap, quality);
    keycap_top_legend_right_bottom_volume(legend_visible_surface_overlap, quality);
    keycap_top_legend_left_top_volume(legend_visible_surface_overlap, quality);
    keycap_top_legend_left_bottom_volume(legend_visible_surface_overlap, quality);
}

module keycap_top_legends_volume(quality = "export") {
    keycap_trim_stem_receiver_recess(quality) {
        keycap_legend_volume(quality);
        keycap_top_corner_legends_volume(quality);
    }
}

module keycap_top_legends_visible_volume(quality = "export") {
    keycap_trim_stem_receiver_recess(quality) {
        keycap_legend_visible_volume(quality);
        keycap_top_corner_legends_visible_volume(quality);
    }
}

function keycap_sidewall_reference_z(offset_y) =
    min(max(top_center_height / 2 + offset_y, 0), top_center_height);
function keycap_sidewall_reference_t(offset_y) =
    clamp01(keycap_sidewall_reference_z(offset_y) / max(top_center_height, 0.1));
function keycap_sidewall_top_local_x(side) =
    side == "left"
        ? sidewall_top_left_local
        : side == "right"
            ? sidewall_top_right_local
            : 0;
function keycap_sidewall_top_local_y(side) =
    side == "front"
        ? sidewall_top_front_local
        : side == "back"
            ? sidewall_top_back_local
            : 0;
function keycap_sidewall_base_point(side) =
    side == "front"
        ? [0, sidewall_base_front, 0]
        : side == "back"
            ? [0, sidewall_base_back, 0]
            : side == "left"
                ? [sidewall_base_left, 0, 0]
                : [sidewall_base_right, 0, 0];
function keycap_sidewall_top_point(side) =
    let(
        x = keycap_sidewall_top_local_x(side),
        y = keycap_sidewall_top_local_y(side)
    )
    [
        x + top_offset_x,
        y + top_offset_y,
        keycap_top_plane_height(x, y, top_center_height, top_pitch_deg, top_roll_deg)
    ];
function keycap_sidewall_surface_position(side, offset_y) =
    let(
        t = keycap_sidewall_reference_t(offset_y),
        base_point = keycap_sidewall_base_point(side),
        top_point = keycap_sidewall_top_point(side)
    )
    vector_add(base_point, vector_scale(vector_sub(top_point, base_point), t));
function keycap_sidewall_width_axis_hint(side, t) =
    side == "front"
        ? [1, 0, t * tan(top_roll_deg)]
        : side == "back"
            ? [-1, 0, -t * tan(top_roll_deg)]
            : side == "left"
                ? [0, -1, -t * tan(top_pitch_deg)]
                : [0, 1, t * tan(top_pitch_deg)];
function keycap_sidewall_up_axis_hint(side) =
    vector_sub(keycap_sidewall_top_point(side), keycap_sidewall_base_point(side));
function keycap_sidewall_axis_x(side, offset_y) =
    vector_unit(keycap_sidewall_width_axis_hint(side, keycap_sidewall_reference_t(offset_y)));
function keycap_sidewall_axis_y(side, offset_y) =
    let(
        axis_x = keycap_sidewall_axis_x(side, offset_y),
        up_hint = keycap_sidewall_up_axis_hint(side)
    )
    vector_unit(vector_without_axis(up_hint, axis_x), [0, 0, 1]);
function keycap_sidewall_axis_z(side, offset_y) =
    vector_unit(vector_cross(
        keycap_sidewall_axis_x(side, offset_y),
        keycap_sidewall_axis_y(side, offset_y)
    ));
function keycap_sidewall_inner_offset_vector(side) =
    side == "front"
        ? [0, wall_thickness, 0]
        : side == "back"
            ? [0, -wall_thickness, 0]
            : side == "left"
                ? [wall_thickness, 0, 0]
                : [-wall_thickness, 0, 0];
function keycap_sidewall_wall_depth(side, axis_z) =
    max(abs(vector_dot(keycap_sidewall_inner_offset_vector(side), vector_scale(axis_z, -1))), 0.01);

module keycap_sidewall_legend_volume_for_side(
    side,
    enabled,
    label,
    font_name,
    underline_enabled,
    underline_width,
    underline_thickness,
    underline_offset_y,
    content_type,
    icon_path,
    text_size,
    legend_height,
    outline_delta,
    offset_x,
    offset_y,
    top_overlap = 0,
    quality = "export",
    inner_overlap = 0
) {
    surface_position = keycap_sidewall_surface_position(side, offset_y);
    axis_x = keycap_sidewall_axis_x(side, offset_y);
    axis_y = keycap_sidewall_axis_y(side, offset_y);
    axis_z = keycap_sidewall_axis_z(side, offset_y);
    side_legend_floor_thickness = 0.05;
    surface_height = legend_height;
    below_surface = max(
        keycap_sidewall_wall_depth(side, axis_z) + max(inner_overlap, 0),
        surface_height < 0 ? -surface_height + side_legend_floor_thickness : 0
    );
    effective_surface_height = top_overlap > 0 && surface_height < 0
        ? top_overlap
        : surface_height + top_overlap;
    total_height = max(below_surface + effective_surface_height, 0);

    if (enabled && legend_has_content(label, content_type, icon_path) && total_height > 0) {
        sidewall_legend_block(
            side = side,
            label = label,
            height = total_height,
            offset_x = offset_x,
            offset_y = 0,
            base_z = -below_surface,
            origin = surface_position,
            axis_x = axis_x,
            axis_y = axis_y,
            axis_z = axis_z,
            font_name = font_name,
            underline_enabled = underline_enabled,
            underline_width = underline_width,
            underline_thickness = underline_thickness,
            underline_offset_y = underline_offset_y,
            content_type = content_type,
            icon_path = icon_path,
            outline_delta = outline_delta,
            text_size = text_size,
            quality = quality
        );
    }
}

module keycap_side_legend_front_volume(top_overlap = 0, quality = "export", inner_overlap = 0) {
    keycap_sidewall_legend_volume_for_side(
        side = "front",
        enabled = side_legend_front_enabled,
        label = side_legend_front_text,
        font_name = side_legend_front_font_name,
        underline_enabled = side_legend_front_underline_enabled,
        underline_width = side_legend_front_underline_width,
        underline_thickness = side_legend_front_underline_thickness,
        underline_offset_y = side_legend_front_underline_offset_y,
        content_type = side_legend_front_content_type,
        icon_path = side_legend_front_icon_path,
        text_size = side_legend_front_text_size_value,
        legend_height = side_legend_front_height,
        outline_delta = side_legend_front_outline_delta,
        offset_x = side_legend_front_offset_x,
        offset_y = side_legend_front_offset_y,
        top_overlap = top_overlap,
        quality = quality,
        inner_overlap = inner_overlap
    );
}

module keycap_side_legend_back_volume(top_overlap = 0, quality = "export", inner_overlap = 0) {
    keycap_sidewall_legend_volume_for_side(
        side = "back",
        enabled = side_legend_back_enabled,
        label = side_legend_back_text,
        font_name = side_legend_back_font_name,
        underline_enabled = side_legend_back_underline_enabled,
        underline_width = side_legend_back_underline_width,
        underline_thickness = side_legend_back_underline_thickness,
        underline_offset_y = side_legend_back_underline_offset_y,
        content_type = side_legend_back_content_type,
        icon_path = side_legend_back_icon_path,
        text_size = side_legend_back_text_size_value,
        legend_height = side_legend_back_height,
        outline_delta = side_legend_back_outline_delta,
        offset_x = side_legend_back_offset_x,
        offset_y = side_legend_back_offset_y,
        top_overlap = top_overlap,
        quality = quality,
        inner_overlap = inner_overlap
    );
}

module keycap_side_legend_left_volume(top_overlap = 0, quality = "export", inner_overlap = 0) {
    keycap_sidewall_legend_volume_for_side(
        side = "left",
        enabled = side_legend_left_enabled,
        label = side_legend_left_text,
        font_name = side_legend_left_font_name,
        underline_enabled = side_legend_left_underline_enabled,
        underline_width = side_legend_left_underline_width,
        underline_thickness = side_legend_left_underline_thickness,
        underline_offset_y = side_legend_left_underline_offset_y,
        content_type = side_legend_left_content_type,
        icon_path = side_legend_left_icon_path,
        text_size = side_legend_left_text_size_value,
        legend_height = side_legend_left_height,
        outline_delta = side_legend_left_outline_delta,
        offset_x = side_legend_left_offset_x,
        offset_y = side_legend_left_offset_y,
        top_overlap = top_overlap,
        quality = quality,
        inner_overlap = inner_overlap
    );
}

module keycap_side_legend_right_volume(top_overlap = 0, quality = "export", inner_overlap = 0) {
    keycap_sidewall_legend_volume_for_side(
        side = "right",
        enabled = side_legend_right_enabled,
        label = side_legend_right_text,
        font_name = side_legend_right_font_name,
        underline_enabled = side_legend_right_underline_enabled,
        underline_width = side_legend_right_underline_width,
        underline_thickness = side_legend_right_underline_thickness,
        underline_offset_y = side_legend_right_underline_offset_y,
        content_type = side_legend_right_content_type,
        icon_path = side_legend_right_icon_path,
        text_size = side_legend_right_text_size_value,
        legend_height = side_legend_right_height,
        outline_delta = side_legend_right_outline_delta,
        offset_x = side_legend_right_offset_x,
        offset_y = side_legend_right_offset_y,
        top_overlap = top_overlap,
        quality = quality,
        inner_overlap = inner_overlap
    );
}

module keycap_side_legends_volume(quality = "export") {
    keycap_trim_stem_receiver_recess(quality) {
        keycap_side_legend_front_volume(0, quality);
        keycap_side_legend_back_volume(0, quality);
        keycap_side_legend_left_volume(0, quality);
        keycap_side_legend_right_volume(0, quality);
    }
}

module keycap_side_legends_visible_volume(quality = "export") {
    keycap_trim_stem_receiver_recess(quality) {
        keycap_side_legend_front_volume(
            top_overlap = side_legend_visible_surface_overlap,
            quality = quality,
            inner_overlap = side_legend_inner_cut_overlap
        );
        keycap_side_legend_back_volume(
            top_overlap = side_legend_visible_surface_overlap,
            quality = quality,
            inner_overlap = side_legend_inner_cut_overlap
        );
        keycap_side_legend_left_volume(
            top_overlap = side_legend_visible_surface_overlap,
            quality = quality,
            inner_overlap = side_legend_inner_cut_overlap
        );
        keycap_side_legend_right_volume(
            top_overlap = side_legend_visible_surface_overlap,
            quality = quality,
            inner_overlap = side_legend_inner_cut_overlap
        );
    }
}

module keycap_body_shell_positive(quality = "export", include_separate_top_hat = false) {
    if (shape_geometry_type == "typewriter") {
        keycap_typewriter_cap(
            width = key_width,
            depth = key_depth,
            top_center_height = top_center_height,
            corner_radius = typewriter_corner_radius,
            top_shape_type = top_shape_type,
            dish_radius = dish_radius,
            dish_depth = dish_depth,
            pitch_deg = top_pitch_deg,
            roll_deg = top_roll_deg,
            quality = quality,
            top_offset_x = top_offset_x,
            top_offset_y = top_offset_y
        );
    } else if (shape_geometry_type == "typewriter_jis_enter") {
        keycap_jis_enter_typewriter_shell(
            width = key_width,
            depth = key_depth,
            top_center_height = top_center_height,
            notch_width = jis_enter_notch_width,
            notch_depth = jis_enter_notch_depth,
            corner_radius = typewriter_corner_radius,
            top_shape_type = top_shape_type,
            dish_radius = dish_radius,
            dish_depth = dish_depth,
            pitch_deg = top_pitch_deg,
            roll_deg = top_roll_deg,
            quality = quality,
            top_offset_x = top_offset_x,
            top_offset_y = top_offset_y
        );
    } else if (shape_geometry_type == "jis_enter") {
        keycap_jis_enter_shell(
            width = key_width,
            depth = key_depth,
            top_center_height = top_center_height,
            notch_width = jis_enter_notch_width,
            notch_depth = jis_enter_notch_depth,
            wall = wall_thickness,
            top_thickness = top_thickness,
            front_angle = profile_front_angle,
            back_angle = profile_back_angle,
            left_angle = profile_left_angle,
            right_angle = profile_right_angle,
            bottom_corner_radius = bottom_corner_radius,
            keycap_shoulder_radius = keycap_shoulder_radius,
            keycap_edge_radius = keycap_edge_radius,
            top_corner_radius = top_corner_radius,
            top_shape_type = top_shape_type,
            dish_radius = dish_radius,
            dish_depth = dish_depth,
            top_hat_enabled = top_hat_body_enabled(include_separate_top_hat),
            top_hat_inset = top_hat_inset,
            top_hat_top_radius = top_hat_top_radius,
            top_hat_top_radii = top_hat_top_radii,
            top_hat_bottom_radius = top_hat_bottom_radius,
            top_hat_bottom_radii = top_hat_bottom_radii,
            top_hat_height = top_hat_height,
            top_hat_shoulder_angle = top_hat_shoulder_angle,
            top_hat_shoulder_radius = top_hat_shoulder_radius,
            top_hat_shape_type = top_hat_shape_type,
            top_hat_dish_radius = top_hat_dish_radius,
            top_hat_dish_depth = top_hat_dish_depth,
            pitch_deg = top_pitch_deg,
            roll_deg = top_roll_deg,
            quality = quality,
            top_offset_x = top_offset_x,
            top_offset_y = top_offset_y
        );
    } else {
        keycap_shell(
            width = key_width,
            depth = key_depth,
            top_center_height = top_center_height,
            wall = wall_thickness,
            top_thickness = top_thickness,
            front_angle = profile_front_angle,
            back_angle = profile_back_angle,
            left_angle = profile_left_angle,
            right_angle = profile_right_angle,
            bottom_corner_radius = bottom_corner_radius,
            keycap_shoulder_radius = keycap_shoulder_radius,
            keycap_edge_radius = keycap_edge_radius,
            top_corner_radius = top_corner_radius,
            top_shape_type = top_shape_type,
            dish_radius = dish_radius,
            dish_depth = dish_depth,
            top_hat_enabled = top_hat_body_enabled(include_separate_top_hat),
            top_hat_top_width = top_hat_top_width,
            top_hat_top_depth = top_hat_top_depth,
            top_hat_bottom_width = top_hat_bottom_width,
            top_hat_bottom_depth = top_hat_bottom_depth,
            top_hat_top_radius = top_hat_top_radius,
            top_hat_top_radii = top_hat_top_radii,
            top_hat_bottom_radius = top_hat_bottom_radius,
            top_hat_bottom_radii = top_hat_bottom_radii,
            top_hat_height = top_hat_height,
            top_hat_shoulder_angle = top_hat_shoulder_angle,
            top_hat_shoulder_radius = top_hat_shoulder_radius,
            top_hat_shape_type = top_hat_shape_type,
            top_hat_dish_radius = top_hat_dish_radius,
            top_hat_dish_depth = top_hat_dish_depth,
            pitch_deg = top_pitch_deg,
            roll_deg = top_roll_deg,
            quality = quality,
            top_offset_x = top_offset_x,
            top_offset_y = top_offset_y,
            top_corner_radii = top_corner_radii
        );
    }
}

module keycap_top_hat_positive(quality = "export") {
    if (top_hat_separate_part_enabled) {
        if (shape_geometry_type == "jis_enter") {
            keycap_jis_enter_top_hat_cap(
                left = dish_limit_top_left,
                right = dish_limit_top_right,
                front = dish_limit_top_front,
                back = dish_limit_top_back,
                notch_width = jis_enter_notch_width,
                notch_depth = jis_enter_notch_depth,
                top_inset = top_hat_inset,
                top_radius = top_hat_top_radius,
                bottom_radius = top_hat_bottom_radius,
                bottom_corner_radii = top_hat_bottom_radii,
                top_corner_radii = top_hat_top_radii,
                height = top_hat_height,
                shoulder_angle = top_hat_shoulder_angle,
                shoulder_radius = top_hat_shoulder_radius,
                top_shape_type = top_hat_shape_type,
                dish_radius = top_hat_dish_radius,
                dish_depth = top_hat_dish_depth,
                top_center_height = top_center_height,
                pitch_deg = top_pitch_deg,
                roll_deg = top_roll_deg,
                surface_z_shift = top_hat_surface_z_shift,
                quality = quality,
                top_offset_x = top_offset_x,
                top_offset_y = top_offset_y
            );
        } else {
            keycap_top_hat_cap(
                parent_top_width = dish_limit_top_right - dish_limit_top_left,
                parent_top_depth = dish_limit_top_back - dish_limit_top_front,
                top_width = top_hat_top_width,
                top_depth = top_hat_top_depth,
                bottom_width = top_hat_bottom_width,
                bottom_depth = top_hat_bottom_depth,
                top_radius = top_hat_top_radius,
                bottom_radius = top_hat_bottom_radius,
                bottom_corner_radii = top_hat_bottom_radii,
                top_corner_radii = top_hat_top_radii,
                height = top_hat_height,
                shoulder_angle = top_hat_shoulder_angle,
                shoulder_radius = top_hat_shoulder_radius,
                top_shape_type = top_hat_shape_type,
                dish_radius = top_hat_dish_radius,
                dish_depth = top_hat_dish_depth,
                top_center_height = top_center_height,
                pitch_deg = top_pitch_deg,
                roll_deg = top_roll_deg,
                surface_z_shift = top_hat_surface_z_shift,
                quality = quality,
                top_offset_x = top_offset_x,
                top_offset_y = top_offset_y
            );
        }
    }
}

module keycap_top_hat(quality = "export") {
    if (top_hat_separate_part_enabled) {
        difference() {
            keycap_top_hat_positive(quality);
            keycap_top_legends_visible_volume(quality);
        }
    }
}

module keycap_body_shell(quality = "export", include_separate_top_hat = false) {
    difference() {
        keycap_body_shell_mount_cut(quality, include_separate_top_hat);
        keycap_top_legends_visible_volume(quality);
        keycap_side_legends_visible_volume(quality);
        if (rim_enabled) {
            keycap_body_rim_clearance_volume(quality);
        }
    }
}

module keycap_body_shell_mount_cut(quality = "export", include_separate_top_hat = false) {
    difference() {
        keycap_body_shell_positive(quality, include_separate_top_hat);
        keycap_stem_receiver_recess(quality);
    }
}

module keycap_body_rim_clearance_volume(quality = "export") {
    if (rim_enabled) {
        clearance = typewriter_rim_body_clearance;

        if (shape_geometry_type == "typewriter_jis_enter") {
            keycap_jis_enter_typewriter_rim(
                width = key_width + clearance * 2,
                depth = key_depth + clearance * 2,
                top_center_height = top_center_height + clearance,
                notch_width = jis_enter_notch_width,
                notch_depth = jis_enter_notch_depth,
                band_width = rim_width + clearance * 2,
                height_up = rim_height_up + clearance,
                height_down = rim_height_down + clearance,
                corner_radius = typewriter_corner_radius + clearance,
                top_shape_type = top_shape_type,
                dish_radius = dish_radius,
                dish_depth = dish_depth,
                pitch_deg = top_pitch_deg,
                roll_deg = top_roll_deg,
                quality = quality,
                top_offset_x = top_offset_x,
                top_offset_y = top_offset_y
            );
        } else {
            keycap_typewriter_rim(
                width = key_width + clearance * 2,
                depth = key_depth + clearance * 2,
                top_center_height = top_center_height + clearance,
                band_width = rim_width + clearance * 2,
                height_up = rim_height_up + clearance,
                height_down = rim_height_down + clearance,
                corner_radius = typewriter_corner_radius + clearance,
                top_shape_type = top_shape_type,
                dish_radius = dish_radius,
                dish_depth = dish_depth,
                pitch_deg = top_pitch_deg,
                roll_deg = top_roll_deg,
                quality = quality,
                top_offset_x = top_offset_x,
                top_offset_y = top_offset_y
            );
        }
    }
}

module keycap_body_core(quality = "export") {
    union() {
        keycap_body_shell(quality);
        keycap_stem(quality);
    }
}

module keycap_stem_positive(base_clearance = stem_inset, quality = "export") {
    if (stem_type == "mx") {
        stem_mx(
            outer_diameter = stem_outer_diameter,
            stem_height = stem_height,
            base_clearance = base_clearance,
            cross_width_horizontal = stem_cross_width_horizontal,
            cross_length_horizontal = stem_cross_length_horizontal,
            cross_width_vertical = stem_cross_width_vertical,
            cross_length_vertical = stem_cross_length_vertical,
            cross_chamfer = stem_cross_chamfer,
            quality = quality
        );
    } else if (stem_type == "choc_v1") {
        stem_choc_v1(
            prong_width = stem_choc_v1_prong_width,
            prong_depth = stem_choc_v1_prong_depth,
            prong_spacing = stem_choc_v1_prong_spacing,
            stem_height = stem_height,
            base_clearance = base_clearance,
            lead_in = stem_choc_v1_lead_in,
            quality = quality
        );
    } else if (stem_type == "alps") {
        stem_alps(
            stem_length = stem_alps_length,
            stem_width = stem_alps_width,
            stem_height = stem_height,
            base_clearance = base_clearance,
            lead_in = stem_alps_lead_in,
            quality = quality
        );
    } else if (stem_type == "choc_v2") {
        stem_choc_v2(
            outer_diameter = stem_outer_diameter,
            stem_height = stem_height,
            base_clearance = base_clearance,
            cross_width_horizontal = stem_cross_width_horizontal,
            cross_length_horizontal = stem_cross_length_horizontal,
            cross_width_vertical = stem_cross_width_vertical,
            cross_length_vertical = stem_cross_length_vertical,
            cross_chamfer = stem_cross_chamfer,
            quality = quality
        );
    }
}

module keycap_stem_nominal(quality = "export") {
    if (stem_positive_enabled) {
        if (typewriter_shape_geometry_type(shape_geometry_type)) {
            translate([0, 0, typewriter_stem_mount_overlap])
                mirror([0, 0, 1])
                    keycap_stem_positive(base_clearance = 0, quality = quality);
        } else {
            keycap_stem_positive(base_clearance = stem_inset, quality = quality);
        }
    }
}

module keycap_stem_clip_volume(quality = "export") {
    if (stem_positive_enabled) {
        translate([0, 0, stem_clip_overlap])
            if (shape_geometry_type == "jis_enter") {
                keycap_jis_enter_inner_clearance_volume(
                    width = key_width,
                    depth = key_depth,
                    top_center_height = top_center_height,
                    notch_width = jis_enter_notch_width,
                    notch_depth = jis_enter_notch_depth,
                    wall = wall_thickness,
                    top_thickness = top_thickness,
                    dish_depth = dish_depth,
                    front_angle = profile_front_angle,
                    back_angle = profile_back_angle,
                    left_angle = profile_left_angle,
                    right_angle = profile_right_angle,
                    bottom_corner_radius = bottom_corner_radius,
                    top_corner_radius = top_corner_radius,
                    pitch_deg = top_pitch_deg,
                    roll_deg = top_roll_deg,
                    quality = quality,
                    top_offset_x = top_offset_x,
                    top_offset_y = top_offset_y,
                    bottom_extension = stem_clip_bottom_extension,
                    shoulder_radius = keycap_shoulder_radius
                );
            } else {
                keycap_inner_clearance_volume(
                    width = key_width,
                    depth = key_depth,
                    top_center_height = top_center_height,
                    wall = wall_thickness,
                    top_thickness = top_thickness,
                    dish_depth = dish_depth,
                    front_angle = profile_front_angle,
                    back_angle = profile_back_angle,
                    left_angle = profile_left_angle,
                    right_angle = profile_right_angle,
                    bottom_corner_radius = bottom_corner_radius,
                    top_corner_radius = top_corner_radius,
                    pitch_deg = top_pitch_deg,
                    roll_deg = top_roll_deg,
                    quality = quality,
                    top_offset_x = top_offset_x,
                    top_offset_y = top_offset_y,
                    bottom_extension = stem_clip_bottom_extension,
                    top_corner_radii = top_corner_radii,
                    shoulder_radius = keycap_shoulder_radius
                );
            }
    }
}

module keycap_stem(quality = "export") {
    if (stem_positive_enabled) {
        if (typewriter_shape_geometry_type(shape_geometry_type)) {
            keycap_stem_nominal(quality);
        } else {
            intersection() {
                keycap_stem_nominal(quality);
                keycap_stem_clip_volume(quality);
            }
        }
    }
}

module keycap_stem_receiver_recess(quality = "export") {
    if (stem_enabled && receiver_recess_stem_type(stem_type)) {
        keycap_top_plane_transform(stem_receiver_mount_z, top_pitch_deg, top_roll_deg, top_offset_x, top_offset_y)
            translate([0, 0, -stem_receiver_recess_overlap])
                j_stem_lp01_receiver_recess(
                    hole_pitch_x = stem_j_stem_lp01_nominal_hole_pitch_x,
                    plate_height = stem_j_stem_lp01_nominal_plate_depth,
                    hole_pitch_y = stem_j_stem_lp01_nominal_hole_pitch_y,
                    hole_diameter = stem_j_stem_lp01_nominal_hole_diameter,
                    height = stem_receiver_recess_height,
                    clearance = stem_j_stem_lp01_nominal_recess_clearance + stem_cross_margin + stem_outer_delta,
                    quality = quality
                );
    }
}

module keycap_trim_stem_receiver_recess(quality = "export") {
    if (stem_enabled && receiver_recess_stem_type(stem_type)) {
        difference() {
            children();
            keycap_stem_receiver_recess(quality);
        }
    } else {
        children();
    }
}

module keycap_j_stem_lp01_reference(quality = "export") {
    if (stem_enabled && receiver_recess_stem_type(stem_type)) {
        keycap_top_plane_transform(stem_receiver_mount_z, top_pitch_deg, top_roll_deg, top_offset_x, top_offset_y)
            j_stem_lp01_model(
                hole_pitch_x = stem_j_stem_lp01_nominal_hole_pitch_x,
                plate_height = stem_j_stem_lp01_nominal_plate_depth,
                plate_thickness = stem_j_stem_lp01_nominal_plate_thickness,
                hole_pitch_y = stem_j_stem_lp01_nominal_hole_pitch_y,
                hole_diameter = stem_j_stem_lp01_nominal_hole_diameter,
                post_diameter = stem_j_stem_lp01_nominal_post_diameter,
                post_height = stem_j_stem_lp01_nominal_post_height,
                cross_width_horizontal = stem_j_stem_lp01_nominal_cross_width_horizontal,
                cross_width_vertical = stem_j_stem_lp01_nominal_cross_width_vertical,
                quality = quality
            );
    }
}

module keycap_homing_bar(quality = "export") {
    if (homing_bar_enabled) {
        keycap_top_plane_transform(active_top_center_height, top_pitch_deg, top_roll_deg, top_offset_x, top_offset_y)
            homing_bar_blank(
                length = homing_bar_length,
                width = homing_bar_width,
                height = homing_bar_height,
                base_thickness = homing_bar_base_thickness,
                offset_y = homing_bar_offset_y,
                base_z = homing_bar_surface_delta - homing_bar_base_thickness,
                chamfer = homing_bar_chamfer,
                quality = quality
            );
    }
}

module keycap_rim_positive(quality = "export") {
    if (rim_enabled) {
        if (shape_geometry_type == "typewriter_jis_enter") {
            keycap_jis_enter_typewriter_rim(
                width = key_width,
                depth = key_depth,
                top_center_height = top_center_height,
                notch_width = jis_enter_notch_width,
                notch_depth = jis_enter_notch_depth,
                band_width = rim_width,
                height_up = rim_height_up,
                height_down = rim_height_down,
                corner_radius = typewriter_corner_radius,
                top_shape_type = top_shape_type,
                dish_radius = dish_radius,
                dish_depth = dish_depth,
                pitch_deg = top_pitch_deg,
                roll_deg = top_roll_deg,
                quality = quality,
                top_offset_x = top_offset_x,
                top_offset_y = top_offset_y
            );
        } else {
            keycap_typewriter_rim(
                width = key_width,
                depth = key_depth,
                top_center_height = top_center_height,
                band_width = rim_width,
                height_up = rim_height_up,
                height_down = rim_height_down,
                corner_radius = typewriter_corner_radius,
                top_shape_type = top_shape_type,
                dish_radius = dish_radius,
                dish_depth = dish_depth,
                pitch_deg = top_pitch_deg,
                roll_deg = top_roll_deg,
                quality = quality,
                top_offset_x = top_offset_x,
                top_offset_y = top_offset_y
            );
        }
    }
}

module keycap_rim(quality = "export") {
    if (rim_enabled) {
        difference() {
            keycap_rim_positive(quality);
            keycap_top_legends_visible_volume(quality);
            keycap_side_legends_visible_volume(quality);
        }
    }
}

module keycap_body(quality = "export") {
    union() {
        keycap_body_core(quality);
        keycap_homing_bar(quality);
    }
}

module keycap_single_material_shape(quality = "export") {
    union() {
        keycap_body_shell_mount_cut(quality, include_separate_top_hat = true);
        keycap_stem(quality);
        keycap_homing_bar(quality);
        keycap_rim_positive(quality);
    }
}

module keycap_legend(quality = "export") {
    keycap_trim_stem_receiver_recess(quality)
        keycap_legend_volume(quality);
}

module keycap_top_legend_right_top(quality = "export") {
    keycap_trim_stem_receiver_recess(quality)
        keycap_top_legend_right_top_volume(0, quality);
}

module keycap_top_legend_right_bottom(quality = "export") {
    keycap_trim_stem_receiver_recess(quality)
        keycap_top_legend_right_bottom_volume(0, quality);
}

module keycap_top_legend_left_top(quality = "export") {
    keycap_trim_stem_receiver_recess(quality)
        keycap_top_legend_left_top_volume(0, quality);
}

module keycap_top_legend_left_bottom(quality = "export") {
    keycap_trim_stem_receiver_recess(quality)
        keycap_top_legend_left_bottom_volume(0, quality);
}

module keycap_side_legend_front(quality = "export") {
    keycap_trim_stem_receiver_recess(quality)
        keycap_side_legend_front_volume(0, quality);
}

module keycap_side_legend_back(quality = "export") {
    keycap_trim_stem_receiver_recess(quality)
        keycap_side_legend_back_volume(0, quality);
}

module keycap_side_legend_left(quality = "export") {
    keycap_trim_stem_receiver_recess(quality)
        keycap_side_legend_left_volume(0, quality);
}

module keycap_side_legend_right(quality = "export") {
    keycap_trim_stem_receiver_recess(quality)
        keycap_side_legend_right_volume(0, quality);
}

module export_body() {
    keycap_body("export");
}

module export_body_core() {
    keycap_body_core("export");
}

module export_homing() {
    keycap_homing_bar("export");
}

module export_top_hat() {
    keycap_top_hat("export");
}

module export_rim() {
    keycap_rim("export");
}

module export_legend() {
    keycap_legend("export");
}

module export_top_legend_right_top() {
    keycap_top_legend_right_top("export");
}

module export_top_legend_right_bottom() {
    keycap_top_legend_right_bottom("export");
}

module export_top_legend_left_top() {
    keycap_top_legend_left_top("export");
}

module export_top_legend_left_bottom() {
    keycap_top_legend_left_bottom("export");
}

module export_side_legend_front() {
    keycap_side_legend_front("export");
}

module export_side_legend_back() {
    keycap_side_legend_back("export");
}

module export_side_legend_left() {
    keycap_side_legend_left("export");
}

module export_side_legend_right() {
    keycap_side_legend_right("export");
}

module export_single_material_shape() {
    keycap_single_material_shape("export");
}

module export_j_stem_lp01_reference() {
    keycap_j_stem_lp01_reference("export");
}

module preview_model() {
    union() {
        keycap_body("preview");
        keycap_top_hat("preview");
        keycap_rim("preview");
        keycap_top_legends_volume("preview");
        keycap_side_legends_volume("preview");
    }
}

if (resolved_export_target == "body") {
    export_body();
} else if (resolved_export_target == "body_core") {
    export_body_core();
} else if (resolved_export_target == "homing") {
    export_homing();
} else if (resolved_export_target == "top_hat") {
    export_top_hat();
} else if (resolved_export_target == "rim") {
    export_rim();
} else if (resolved_export_target == "legend") {
    export_legend();
} else if (resolved_export_target == "top_legend_right_top") {
    export_top_legend_right_top();
} else if (resolved_export_target == "top_legend_right_bottom") {
    export_top_legend_right_bottom();
} else if (resolved_export_target == "top_legend_left_top") {
    export_top_legend_left_top();
} else if (resolved_export_target == "top_legend_left_bottom") {
    export_top_legend_left_bottom();
} else if (resolved_export_target == "side_legend_front") {
    export_side_legend_front();
} else if (resolved_export_target == "side_legend_back") {
    export_side_legend_back();
} else if (resolved_export_target == "side_legend_left") {
    export_side_legend_left();
} else if (resolved_export_target == "side_legend_right") {
    export_side_legend_right();
} else if (resolved_export_target == "single_material_shape") {
    export_single_material_shape();
} else if (resolved_export_target == "j_stem_lp01_reference") {
    export_j_stem_lp01_reference();
} else {
    preview_model();
}
