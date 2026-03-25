#![deny(clippy::all)]

use napi_derive::napi;
use rayon::prelude::*;
use sha2::{Digest, Sha256};
use std::fs;
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

/// 并行扫描目录，返回所有文件的路径、大小和 hash
/// ignore_patterns: 要忽略的目录/文件名列表（简单前缀/名称匹配）
#[napi]
pub fn scan_dir(dir: String, ignore_patterns: Vec<String>) -> Vec<ScannedFile> {
  let base = Path::new(&dir);

  // 收集所有文件路径
  let entries: Vec<_> = WalkDir::new(base)
    .follow_links(false)
    .into_iter()
    .filter_entry(|e| {
      let name = e.file_name().to_string_lossy();
      // 跳过忽略的目录/文件
      !ignore_patterns.iter().any(|p| name == p.as_str())
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

      let data = fs::read(full_path).ok()?;
      let size = data.len() as i64;
      let hash = format!("{:x}", Sha256::digest(&data));

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
    .filter_map(|tf| {
      match current_map.get(tf.path.as_str()) {
        None => Some(FileDiff {
          path: tf.path.clone(),
          status: "new".to_string(),
        }),
        Some(&cur_hash) if cur_hash != tf.hash => Some(FileDiff {
          path: tf.path.clone(),
          status: "modified".to_string(),
        }),
        _ => None,
      }
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

  diffs
}
