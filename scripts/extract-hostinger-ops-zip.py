#!/usr/bin/env python3
"""Fail-closed preflight + extract for Hostinger ops prebuilt ZIP archives.

Allows safe internal relative symlinks (pnpm store links). Rejects:
- absolute / backslash / NUL paths
- zip-slip (`..` path segments in member names)
- symlink targets that are absolute, empty, backslash, NUL, or resolve outside root
- non-link members whose path traverses a symlink prefix
- symlink write-through during extraction

Usage:
  python3 scripts/extract-hostinger-ops-zip.py <zip> <dest-dir>
  python3 scripts/extract-hostinger-ops-zip.py self-test
"""

from __future__ import annotations

import os
import stat
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


S_IFMT = 0o170000
S_IFLNK = 0o120000
S_IFDIR = 0o040000


class ZipPreflightError(Exception):
    pass


def _is_symlink_info(info: zipfile.ZipInfo) -> bool:
    return ((info.external_attr >> 16) & S_IFMT) == S_IFLNK


def _is_dir_info(info: zipfile.ZipInfo) -> bool:
    name = info.filename
    if name.endswith("/"):
        return True
    return ((info.external_attr >> 16) & S_IFMT) == S_IFDIR


def normalize_member_name(name: str) -> str:
    if not isinstance(name, str) or name == "":
        raise ZipPreflightError("zip member name must be a non-empty string")
    if "\x00" in name:
        raise ZipPreflightError(f"zip member contains NUL: {name!r}")
    if name.startswith("/") or name.startswith("\\"):
        raise ZipPreflightError(f"zip member path is absolute: {name}")
    if "\\" in name:
        raise ZipPreflightError(f"zip member path uses backslash: {name}")
    # Strip a single trailing slash for directory members.
    stripped = name[:-1] if name.endswith("/") and name != "/" else name
    if stripped == "" or stripped == ".":
        raise ZipPreflightError(f"zip member path is empty/dot: {name}")
    parts = stripped.split("/")
    for part in parts:
        if part == "" or part == "." or part == "..":
            raise ZipPreflightError(
                f"zip member path has unsafe segment: {name}"
            )
    return stripped


def validate_symlink_target_text(target: str) -> str:
    if not isinstance(target, str) or target == "":
        raise ZipPreflightError("symlink target must be a non-empty string")
    if "\x00" in target:
        raise ZipPreflightError("symlink target contains NUL")
    if target.startswith("/") or target.startswith("\\"):
        raise ZipPreflightError(f"symlink target is absolute: {target}")
    if "\\" in target:
        raise ZipPreflightError(f"symlink target uses backslash: {target}")
    # Relative targets may include `..` hops; final containment is checked later.
    # Reject empty segments and lone "." components that confuse join logic.
    parts = PurePosixPath(target).parts
    if not parts:
        raise ZipPreflightError("symlink target is empty after normalize")
    for part in parts:
        if part == "" or part == ".":
            raise ZipPreflightError(
                f"symlink target has unsafe segment: {target}"
            )
    return target


def resolve_link_target(link_posix: str, target: str) -> str:
    """Resolve symlink target against link location as pure posix, no FS."""
    validate_symlink_target_text(target)
    link_parent = str(PurePosixPath(link_posix).parent)
    if link_parent == ".":
        base_parts: list[str] = []
    else:
        base_parts = list(PurePosixPath(link_parent).parts)
    for part in PurePosixPath(target).parts:
        if part == "..":
            if not base_parts:
                raise ZipPreflightError(
                    f"symlink escapes archive root: {link_posix} -> {target}"
                )
            base_parts.pop()
            continue
        if part in ("", "."):
            raise ZipPreflightError(
                f"symlink target has unsafe segment: {target}"
            )
        base_parts.append(part)
    return "/".join(base_parts)


def assert_no_symlink_prefix(
    member_posix: str, symlink_names: set[str]
) -> None:
    parts = member_posix.split("/")
    for i in range(1, len(parts)):
        prefix = "/".join(parts[:i])
        if prefix in symlink_names:
            raise ZipPreflightError(
                f"non-link member traverses symlink prefix: {member_posix} via {prefix}"
            )


def preflight_zip(zf: zipfile.ZipFile) -> dict[str, object]:
    """Validate archive members. Returns metadata for extraction."""
    infos = list(zf.infolist())
    if not infos:
        raise ZipPreflightError("zip archive is empty")

    members: dict[str, zipfile.ZipInfo] = {}
    symlink_targets: dict[str, str] = {}
    nonlink_names: set[str] = set()

    for info in infos:
        name = normalize_member_name(info.filename)
        if name in members:
            # Identical directory markers are fine; conflicting types are not.
            prev = members[name]
            prev_link = _is_symlink_info(prev)
            cur_link = _is_symlink_info(info)
            if prev_link or cur_link or not (_is_dir_info(prev) and _is_dir_info(info)):
                raise ZipPreflightError(f"duplicate zip member: {name}")
            continue
        members[name] = info

        if _is_symlink_info(info):
            raw = zf.read(info.filename)
            try:
                target = raw.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise ZipPreflightError(
                    f"symlink target is not utf-8: {name}"
                ) from exc
            validate_symlink_target_text(target)
            # Pure path resolve must stay inside archive root.
            resolve_link_target(name, target)
            symlink_targets[name] = target
        else:
            nonlink_names.add(name)

    symlink_names = set(symlink_targets)
    for name in nonlink_names:
        assert_no_symlink_prefix(name, symlink_names)

    # Also reject a symlink whose own path traverses another symlink prefix.
    for name in symlink_names:
        assert_no_symlink_prefix(name, symlink_names - {name})

    return {
        "members": members,
        "symlink_targets": symlink_targets,
    }


def _mkdir_safe(dest_root: Path, rel_posix: str, symlink_names: set[str]) -> Path:
    """Create parent directories without following symlinks."""
    dest_root = dest_root.resolve(strict=True)
    parts = rel_posix.split("/") if rel_posix not in ("", ".") else []
    current = dest_root
    built: list[str] = []
    for part in parts:
        if part in ("", ".", ".."):
            raise ZipPreflightError(f"unsafe path segment while mkdir: {rel_posix}")
        built.append(part)
        prefix = "/".join(built)
        if prefix in symlink_names:
            raise ZipPreflightError(
                f"refusing to traverse symlink during extract: {prefix}"
            )
        current = current / part
        if current.is_symlink():
            raise ZipPreflightError(
                f"refusing to traverse existing symlink: {prefix}"
            )
        if current.exists() and not current.is_dir():
            raise ZipPreflightError(
                f"path exists and is not a directory: {prefix}"
            )
        current.mkdir(exist_ok=True)
        # After mkdir, ensure still not a symlink (TOCTOU belt).
        if current.is_symlink():
            raise ZipPreflightError(
                f"directory became symlink during extract: {prefix}"
            )
    return current


def extract_zip(zip_path: str | Path, dest_dir: str | Path) -> dict[str, int]:
    zip_path = Path(zip_path)
    dest_dir = Path(dest_dir)
    if not zip_path.is_file():
        raise ZipPreflightError(f"zip not found: {zip_path}")
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_root = dest_dir.resolve(strict=True)

    with zipfile.ZipFile(zip_path) as zf:
        meta = preflight_zip(zf)
        members: dict[str, zipfile.ZipInfo] = meta["members"]  # type: ignore[assignment]
        symlink_targets: dict[str, str] = meta["symlink_targets"]  # type: ignore[assignment]
        symlink_names = set(symlink_targets)

        # Extract non-symlink members first (dirs + files), never following links.
        for name, info in sorted(members.items(), key=lambda item: item[0]):
            if name in symlink_targets:
                continue
            parent = str(PurePosixPath(name).parent)
            if parent not in ("", "."):
                _mkdir_safe(dest_root, parent, symlink_names)

            target_path = dest_root.joinpath(*name.split("/"))
            # Containment
            try:
                target_path.resolve(strict=False).relative_to(dest_root)
            except ValueError as exc:
                raise ZipPreflightError(
                    f"extract path escapes destination: {name}"
                ) from exc

            cursor = dest_root
            for part in name.split("/")[:-1]:
                cursor = cursor / part
                if cursor.is_symlink():
                    raise ZipPreflightError(
                        f"parent path is symlink during extract: {name}"
                    )

            if _is_dir_info(info):
                _mkdir_safe(dest_root, name, symlink_names)
                continue

            if target_path.exists() or target_path.is_symlink():
                raise ZipPreflightError(f"refusing to overwrite path: {name}")

            # Write file via fd without following final component.
            parent_dir = target_path.parent
            if parent_dir.is_symlink():
                raise ZipPreflightError(f"parent is symlink: {name}")
            data = zf.read(info.filename)
            flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
            if hasattr(os, "O_NOFOLLOW"):
                flags |= os.O_NOFOLLOW
            fd = os.open(str(target_path), flags, 0o644)
            try:
                os.write(fd, data)
            finally:
                os.close(fd)

        # Create symlinks after their parents exist.
        for name, target in sorted(symlink_targets.items()):
            parent = str(PurePosixPath(name).parent)
            if parent not in ("", "."):
                _mkdir_safe(dest_root, parent, symlink_names - {name})
            link_path = dest_root.joinpath(*name.split("/"))
            try:
                link_path.relative_to(dest_root)
            except ValueError as exc:
                raise ZipPreflightError(
                    f"symlink path escapes destination: {name}"
                ) from exc
            if link_path.exists() or link_path.is_symlink():
                raise ZipPreflightError(f"refusing to overwrite path: {name}")
            # Final containment of resolved target on disk layout.
            resolved_rel = resolve_link_target(name, target)
            resolved_abs = dest_root.joinpath(*resolved_rel.split("/")) if resolved_rel else dest_root
            try:
                resolved_abs.resolve(strict=False).relative_to(dest_root)
            except Exception as exc:
                raise ZipPreflightError(
                    f"symlink target resolves outside destination: {name} -> {target}"
                ) from exc
            os.symlink(target, link_path)

        # Post-extract: every symlink chain must resolve inside dest_root to an existing path.
        for dirpath, dirnames, filenames in os.walk(dest_root, followlinks=False):
            for entry_name in dirnames + filenames:
                abs_path = Path(dirpath) / entry_name
                if not abs_path.is_symlink():
                    continue
                rel = abs_path.relative_to(dest_root).as_posix()
                _assert_symlink_chain_inside(dest_root, abs_path, rel)

    return {
        "members": len(members),
        "symlinks": len(symlink_targets),
    }


def _assert_symlink_chain_inside(dest_root: Path, link_path: Path, rel: str) -> None:
    dest_root = dest_root.resolve(strict=True)
    seen: set[str] = set()
    current = link_path
    hops = 0
    while current.is_symlink():
        key = str(current)
        if key in seen:
            raise ZipPreflightError(f"symlink loop at {rel}")
        seen.add(key)
        hops += 1
        if hops > 40:
            raise ZipPreflightError(f"symlink hop limit exceeded at {rel}")
        target = os.readlink(current)
        validate_symlink_target_text(target)
        parent = current.parent
        candidate = (parent / target)
        # Manual normalize without following intermediate links beyond candidate.
        try:
            # Use resolve(strict=False) then containment; also ensure each hop under root.
            resolved = candidate.resolve(strict=False)
        except Exception as exc:
            raise ZipPreflightError(
                f"cannot resolve symlink {rel} -> {target}"
            ) from exc
        try:
            resolved.relative_to(dest_root)
        except ValueError as exc:
            raise ZipPreflightError(
                f"symlink escapes destination: {rel} -> {target}"
            ) from exc
        current = resolved
    if not current.exists():
        raise ZipPreflightError(f"dangling symlink: {rel}")
    try:
        current.resolve(strict=True).relative_to(dest_root)
    except Exception as exc:
        raise ZipPreflightError(f"symlink final target escapes root: {rel}") from exc


def _write_min_zip(path: Path, entries: list[tuple[str, bytes | None, str | None]]) -> None:
    """entries: (name, file_bytes|None for dir, symlink_target|None)."""
    with zipfile.ZipFile(path, "w") as zf:
        for name, data, link_target in entries:
            info = zipfile.ZipInfo(name)
            if link_target is not None:
                info.create_system = 3
                info.external_attr = (S_IFLNK | 0o777) << 16
                zf.writestr(info, link_target.encode("utf-8"))
            elif data is None:
                dir_name = name if name.endswith("/") else name + "/"
                info = zipfile.ZipInfo(dir_name)
                info.create_system = 3
                info.external_attr = (S_IFDIR | 0o755) << 16
                zf.writestr(info, b"")
            else:
                info.create_system = 3
                info.external_attr = (0o100644) << 16
                zf.writestr(info, data)


def self_test() -> None:
    base = Path(tempfile.mkdtemp(prefix="perfume-aura-zip-preflight."))
    try:
        # Safe relative symlink archive
        safe_zip = base / "safe.zip"
        _write_min_zip(
            safe_zip,
            [
                ("package.json", b'{"name":"x"}\n', None),
                ("node_modules/real/package.json", b'{"name":"real"}\n', None),
                ("node_modules/link", None, "real"),
                ("node_modules/nested/up", None, "../real"),
            ],
        )
        safe_dest = base / "safe-out"
        meta = extract_zip(safe_zip, safe_dest)
        assert meta["symlinks"] == 2, meta
        link = safe_dest / "node_modules" / "link"
        assert link.is_symlink()
        assert (safe_dest / "node_modules" / "real" / "package.json").is_file()
        assert os.path.realpath(link).startswith(str(safe_dest.resolve()))

        # Absolute symlink target
        abs_zip = base / "abs.zip"
        _write_min_zip(
            abs_zip,
            [
                ("file.txt", b"x\n", None),
                ("evil", None, "/tmp/evil"),
            ],
        )
        try:
            extract_zip(abs_zip, base / "abs-out")
            raise AssertionError("absolute symlink accepted")
        except ZipPreflightError as exc:
            assert "absolute" in str(exc)

        # Zip-slip member name
        slip_zip = base / "slip.zip"
        _write_min_zip(
            slip_zip,
            [
                ("../outside.txt", b"nope\n", None),
            ],
        )
        try:
            extract_zip(slip_zip, base / "slip-out")
            raise AssertionError("zip-slip accepted")
        except ZipPreflightError as exc:
            assert "unsafe segment" in str(exc)

        # Non-link through symlink prefix
        prefix_zip = base / "prefix.zip"
        _write_min_zip(
            prefix_zip,
            [
                ("real/file.txt", b"ok\n", None),
                ("link", None, "real"),
                ("link/hijack.txt", b"bad\n", None),
            ],
        )
        try:
            extract_zip(prefix_zip, base / "prefix-out")
            raise AssertionError("symlink prefix write accepted")
        except ZipPreflightError as exc:
            assert "symlink prefix" in str(exc)

        # Dangling relative symlink
        dang_zip = base / "dang.zip"
        _write_min_zip(
            dang_zip,
            [
                ("missing-link", None, "nope-target"),
            ],
        )
        try:
            extract_zip(dang_zip, base / "dang-out")
            raise AssertionError("dangling symlink accepted")
        except ZipPreflightError as exc:
            assert "dangling" in str(exc) or "escapes" in str(exc)

        # Symlink escape via .. beyond root
        esc_zip = base / "esc.zip"
        _write_min_zip(
            esc_zip,
            [
                ("a/b", None, "../../outside"),
            ],
        )
        try:
            extract_zip(esc_zip, base / "esc-out")
            raise AssertionError("escape symlink accepted")
        except ZipPreflightError as exc:
            assert "escapes" in str(exc)

        # Backslash path
        bs_zip = base / "bs.zip"
        with zipfile.ZipFile(bs_zip, "w") as zf:
            info = zipfile.ZipInfo("evil\\path.txt")
            info.external_attr = (0o100644) << 16
            zf.writestr(info, b"x")
        try:
            extract_zip(bs_zip, base / "bs-out")
            raise AssertionError("backslash path accepted")
        except ZipPreflightError as exc:
            assert "backslash" in str(exc) or "unsafe" in str(exc)

        print("extract-hostinger-ops-zip self-test ok")
    finally:
        # Best-effort cleanup
        import shutil

        shutil.rmtree(base, ignore_errors=True)


def main(argv: list[str]) -> int:
    if len(argv) == 1 and argv[0] == "self-test":
        self_test()
        return 0
    if len(argv) != 2:
        print(
            "usage: python3 scripts/extract-hostinger-ops-zip.py <zip> <dest-dir>\n"
            "   or: python3 scripts/extract-hostinger-ops-zip.py self-test",
            file=sys.stderr,
        )
        return 2
    try:
        result = extract_zip(argv[0], argv[1])
    except ZipPreflightError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(
        f"extract-hostinger-ops-zip ok members={result['members']} symlinks={result['symlinks']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
