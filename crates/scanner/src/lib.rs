#![deny(clippy::all)]

use globset::{GlobBuilder, GlobSet, GlobSetBuilder};
use napi_derive::napi;
use rayon::prelude::*;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;
use walkdir::WalkDir;

/// 单个文件的扫描结果
#[napi(object)]
pub struct ScannedFile {
    /// 相对路径（正斜杠）
    pub path: String,
    /// 文件大小（字节）
    pub size: i64,
    /// SHA-256 hash（十六进制）
    pub hash: String,
}

/// 文件差异结果
#[napi(object)]
pub struct FileDiff {
    pub path: String,
    /// "new" | "modified" | "deleted"
    pub status: String,
}

fn compile_ignores(patterns: &[String]) -> GlobSet {
    let mut builder = GlobSetBuilder::new();
    for pattern in patterns {
        if let Ok(glob) = GlobBuilder::new(pattern).literal_separator(true).build() {
            builder.add(glob);
        }
    }
    builder
        .build()
        .unwrap_or_else(|_| GlobSetBuilder::new().build().expect("empty glob set"))
}

fn should_ignore(
    base: &Path,
    path: &Path,
    is_dir: bool,
    patterns: &[String],
    globs: &GlobSet,
) -> bool {
    let Ok(relative) = path.strip_prefix(base) else {
        return false;
    };
    let normalized = relative.to_string_lossy().replace('\\', "/");
    if globs.is_match(&normalized) {
        return true;
    }
    is_dir
        && patterns.iter().any(|pattern| {
            pattern.trim_end_matches('/') == normalized
                || pattern
                    .strip_suffix("/**")
                    .is_some_and(|prefix| prefix == normalized)
        })
}

/// 并行扫描目录，返回所有文件的路径、大小和 hash
/// ignore_patterns: 要忽略的目录/文件名列表（简单前缀/名称匹配）
#[napi]
pub fn scan_dir(dir: String, ignore_patterns: Vec<String>) -> Vec<ScannedFile> {
    let base = Path::new(&dir);
    let globs = compile_ignores(&ignore_patterns);

    // 收集所有文件路径
    let entries: Vec<_> = WalkDir::new(base)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| {
            !should_ignore(
                base,
                entry.path(),
                entry.file_type().is_dir(),
                &ignore_patterns,
                &globs,
            )
        })
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .collect();

    // 并行处理每个文件
    entries
        .par_iter()
        .filter_map(|entry| {
            let full_path = entry.path();
            let rel = full_path.strip_prefix(base).ok()?;
            let rel_str = rel.to_string_lossy().replace('\\', "/");

            let size = entry.metadata().ok()?.len() as i64;
            let mut reader = BufReader::new(File::open(full_path).ok()?);
            let mut digest = Sha256::new();
            let mut buffer = [0_u8; 64 * 1024];
            loop {
                let bytes_read = reader.read(&mut buffer).ok()?;
                if bytes_read == 0 {
                    break;
                }
                digest.update(&buffer[..bytes_read]);
            }
            let hash = digest
                .finalize()
                .iter()
                .map(|byte| format!("{byte:02x}"))
                .collect();

            Some(ScannedFile {
                path: rel_str,
                size,
                hash,
            })
        })
        .collect()
}

/// 并行比较两个目录，返回差异列表
/// template_dir: 模板目录
/// current_dir:  当前项目目录
/// detect_orphans: 是否检测本地独有文件（deleted）
#[napi]
pub fn compare_dirs(
    template_dir: String,
    current_dir: String,
    ignore_patterns: Vec<String>,
    detect_orphans: bool,
) -> Vec<FileDiff> {
    let template_files = scan_dir(template_dir, ignore_patterns.clone());
    let current_files = scan_dir(current_dir, ignore_patterns);

    // 构建 current 的 hash map
    let current_map: std::collections::HashMap<&str, &str> = current_files
        .iter()
        .map(|f| (f.path.as_str(), f.hash.as_str()))
        .collect();

    let template_map: std::collections::HashSet<&str> =
        template_files.iter().map(|f| f.path.as_str()).collect();

    // 并行检测 new / modified
    let mut diffs: Vec<FileDiff> = template_files
        .par_iter()
        .filter_map(|tf| match current_map.get(tf.path.as_str()) {
            None => Some(FileDiff {
                path: tf.path.clone(),
                status: "new".to_string(),
            }),
            Some(&cur_hash) if cur_hash != tf.hash => Some(FileDiff {
                path: tf.path.clone(),
                status: "modified".to_string(),
            }),
            _ => None,
        })
        .collect();

    // 检测 deleted（本地独有）
    if detect_orphans {
        let orphans: Vec<FileDiff> = current_files
            .par_iter()
            .filter(|cf| !template_map.contains(cf.path.as_str()))
            .map(|cf| FileDiff {
                path: cf.path.clone(),
                status: "deleted".to_string(),
            })
            .collect();
        diffs.extend(orphans);
    }

    diffs.sort_by(|left, right| left.path.cmp(&right.path));
    diffs
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ignores_globbed_paths_and_prunes_ignored_directories() {
        let base = Path::new("project");
        let patterns = vec![".cache/**".to_string(), "*.local.*".to_string()];
        let globs = compile_ignores(&patterns);

        assert!(should_ignore(
            base,
            Path::new("project/.cache"),
            true,
            &patterns,
            &globs
        ));
        assert!(should_ignore(
            base,
            Path::new("project/.cache/generated/file.bin"),
            false,
            &patterns,
            &globs
        ));
        assert!(should_ignore(
            base,
            Path::new("project/config.local.yaml"),
            false,
            &patterns,
            &globs
        ));
        assert!(!should_ignore(
            base,
            Path::new("project/config.yaml"),
            false,
            &patterns,
            &globs
        ));
    }
}
