//! Screen capture implemented on top of the `xcap` crate.
//!
//! All region arithmetic lives in the pure [`clamp_region`] helper so it can be
//! unit tested without a display.

use base64::engine::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;

use crate::ipc::{BoundingBox, CapturedSize};

/// Clamp a region to a monitor of `monitor_w` x `monitor_h`.
///
/// Returns `(x, y, width, height)` or `None` when the monitor has no area or
/// the clamped region is empty.
pub fn clamp_region(
    region: &BoundingBox,
    monitor_w: u32,
    monitor_h: u32,
) -> Option<(u32, u32, u32, u32)> {
    if monitor_w == 0 || monitor_h == 0 {
        return None;
    }

    let x = region.x.max(0) as u32;
    let y = region.y.max(0) as u32;
    let x = x.min(monitor_w - 1);
    let y = y.min(monitor_h - 1);

    let width = region.width.max(1).min(monitor_w - x);
    let height = region.height.max(1).min(monitor_h - y);

    if width == 0 || height == 0 {
        return None;
    }

    Some((x, y, width, height))
}

fn primary_monitor() -> Result<xcap::Monitor, String> {
    let monitors =
        xcap::Monitor::all().map_err(|e| format!("failed to capture screen: {e}"))?;
    if monitors.is_empty() {
        return Err("no display monitor available".to_string());
    }

    let mut fallback: Option<xcap::Monitor> = None;
    for monitor in monitors {
        if monitor.is_primary().unwrap_or(false) {
            return Ok(monitor);
        }
        if fallback.is_none() {
            fallback = Some(monitor);
        }
    }

    fallback.ok_or_else(|| "no display monitor available".to_string())
}

/// Best-effort size of the primary monitor, used to fill session metadata.
pub fn primary_monitor_size() -> Option<CapturedSize> {
    let monitor = primary_monitor().ok()?;
    let width = monitor.width().ok()?;
    let height = monitor.height().ok()?;
    if width == 0 || height == 0 {
        return None;
    }
    Some(CapturedSize { width, height })
}

/// Capture the primary monitor (or a clamped region of it) as base64 PNG.
pub fn capture_base64(region: Option<BoundingBox>) -> Result<String, String> {
    let monitor = primary_monitor()?;

    let image = match region {
        Some(bbox) => {
            let monitor_w = monitor
                .width()
                .map_err(|e| format!("failed to capture screen: {e}"))?;
            let monitor_h = monitor
                .height()
                .map_err(|e| format!("failed to capture screen: {e}"))?;
            let (x, y, width, height) = clamp_region(&bbox, monitor_w, monitor_h)
                .ok_or_else(|| "invalid screenshot region".to_string())?;
            monitor.capture_region(x, y, width, height)
        }
        None => monitor.capture_image(),
    }
    .map_err(|e| format!("failed to capture screen: {e}"))?;

    let mut png: Vec<u8> = Vec::new();
    xcap::image::DynamicImage::ImageRgba8(image)
        .write_to(
            &mut std::io::Cursor::new(&mut png),
            xcap::image::ImageFormat::Png,
        )
        .map_err(|e| e.to_string())?;

    Ok(BASE64_STANDARD.encode(&png))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn region(x: i32, y: i32, width: u32, height: u32) -> BoundingBox {
        BoundingBox {
            x,
            y,
            width,
            height,
        }
    }

    #[test]
    fn negative_origin_clamps_to_zero() {
        assert_eq!(
            clamp_region(&region(-50, -20, 10, 10), 1920, 1080),
            Some((0, 0, 10, 10))
        );
    }

    #[test]
    fn oversized_region_is_clipped_to_monitor() {
        assert_eq!(
            clamp_region(&region(0, 0, 5000, 5000), 1920, 1080),
            Some((0, 0, 1920, 1080))
        );
    }

    #[test]
    fn region_starting_inside_is_clipped_to_remaining_area() {
        assert_eq!(
            clamp_region(&region(1900, 1070, 500, 500), 1920, 1080),
            Some((1900, 1070, 20, 10))
        );
    }

    #[test]
    fn bottom_right_corner_one_by_one_is_kept() {
        assert_eq!(
            clamp_region(&region(1919, 1079, 1, 1), 1920, 1080),
            Some((1919, 1079, 1, 1))
        );
    }

    #[test]
    fn zero_sized_region_becomes_one_by_one() {
        assert_eq!(
            clamp_region(&region(10, 10, 0, 0), 100, 100),
            Some((10, 10, 1, 1))
        );
    }

    #[test]
    fn empty_monitor_returns_none() {
        assert_eq!(clamp_region(&region(0, 0, 10, 10), 0, 0), None);
    }
}
