/**
 * A parsed path object generated by path.parse() or consumed by path.format().
 */
export interface ParsedPath {
  /**
   * The root of the path such as '/'
   */
  root: string;
  /**
   * The full directory path such as '/home/user/dir'
   */
  dir: string;
  /**
   * The file name including extension (if any) such as 'index.html'
   */
  base: string;
  /**
   * The file extension (if any) such as '.html'
   */
  ext: string;
  /**
   * The file name without extension (if any) such as 'index'
   */
  name: string;
}

export type FormatInputPathObject = Partial<ParsedPath>;

const pathSplit = (path: string, keepEmpty: boolean = false): Array<string> => {
  const arr = new Array<string>();

  let current = "";
  for (const char of path) {
    if (char === "/" || char === "\\") {
      if (current !== "" || keepEmpty) {
        arr.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.length !== 0) {
    arr.push(current);
  }

  return arr;
};

/**
 * Normalize a string path, reducing '..' and '.' parts.
 * When multiple slashes are found, they're replaced by a single one; when the path contains a trailing slash, it is preserved.
 *
 * @param path string path to normalize.
 */
export const normalize = (path: string): string => {
  const explicitDirectory = path.endsWith("/");
  const absoluteDirectory = isAbsolute(path);
  const arr = pathSplit(path);
  const pathArr = new Array<string>();

  for (const item of arr) {
    switch (item) {
      case ".":
        break;
      case "..":
        if (pathArr.length !== 0) {
          if (pathArr[pathArr.length - 1] === "..") {
            pathArr.push("..");
          } else if (pathArr[pathArr.length - 1] === ".") {
            pathArr[pathArr.length - 1] = "..";
          } else {
            pathArr.pop();
          }
        } else {
          pathArr.push("..");
        }
        break;
      default:
        pathArr.push(item);
        break;
    }
  }

  if (absoluteDirectory) {
    while (
      (pathArr.length !== 0 && pathArr[0] === "..") ||
      pathArr[0] === "."
    ) {
      pathArr.shift();
    }
  }

  if (pathArr.length === 0 && absoluteDirectory) {
    return "/";
  }

  let pathStr = pathArr.join("/") || ".";

  if (explicitDirectory) {
    pathStr += "/";
  }

  if (absoluteDirectory && pathStr[0] !== "/") {
    pathStr = "/" + pathStr;
  }

  return pathStr;
};

/**
 * Join all arguments together and normalize the resulting path.
 * Arguments must be strings.
 *
 * @param paths paths to join.
 */
export const join = (...paths: Array<string>): string => {
  switch (paths.length) {
    case 0:
      return ".";
    case 1:
      return normalize(paths[0]!);
    default:
      return normalize(paths.join("/"));
  }
};

/**
 * The right-most parameter is considered {to}.  Other parameters are considered an array of {from}.
 *
 * Starting from leftmost {from} parameter, resolves {to} to an absolute path.
 *
 * If {to} isn't already absolute, {from} arguments are prepended in right to left order,
 * until an absolute path is found. If after using all {from} paths still no absolute path is found,
 * the current working directory is used as well. The resulting path is normalized,
 * and trailing slashes are removed unless the path gets resolved to the root directory.
 *
 * @param pathSegments string paths to join.
 */
export const resolve = (...pathSegments: Array<string>): string => {
  let absolute = false;
  for (let i = pathSegments.length - 1; i >= 0; i--) {
    if (isAbsolute(pathSegments[i]!)) {
      absolute = true;
      pathSegments = pathSegments.slice(i);
      break;
    }
  }

  const pathArr = pathSplit(
    absolute
      ? join(...pathSegments)
      : join(document.location.pathname, join(...pathSegments))
  );

  while ((pathArr.length !== 0 && pathArr[0] === "..") || pathArr[0] === ".") {
    pathArr.shift();
  }

  return "/" + pathArr.join("/");
};

/**
 * Determines whether {path} is an absolute path. An absolute path will always resolve to the same location, regardless of the working directory.
 *
 * @param path path to test.
 */
export const isAbsolute = (path: string): boolean =>
  path[0] === "/" || path.startsWith(window.location.origin);

/**
 * Solve the relative path from {from} to {to}.
 * At times we have two absolute paths, and we need to derive the relative path from one to the other. This is actually the reverse transform of path.resolve.
 */
export const relative = (from: string, to: string): string => {
  return join(from, to);
};

/**
 * Return the directory name of a path. Similar to the Unix dirname command.
 *
 * @param path the path to evaluate.
 */
export const dirname = (path: string): string => {
  const arr = pathSplit(path, true);

  while (arr[arr.length - 1] === "") {
    arr.pop()!;
  }

  if (arr.length !== 0) {
    arr.pop();
  }

  const pathStr = arr.join("/");
  if (isAbsolute(path)) {
    if (pathStr[0] === "/") {
      return pathStr;
    } else {
      return "/" + pathStr;
    }
  } else {
    return arr.join("/") || ".";
  }
};

/**
 * Return the last portion of a path. Similar to the Unix basename command.
 * Often used to extract the file name from a fully qualified path.
 *
 * @param path the path to evaluate.
 * @param ext optionally, an extension to remove from the result.
 */
export const basename = (path: string, ext?: string): string => {
  let fullSlash = true;
  for (const char of path) {
    if (char !== "/") {
      fullSlash = false;
      break;
    }
  }

  // Weird node behavior
  if (fullSlash) {
    if (!ext || ext == path) {
      return "";
    } else {
      return path;
    }
  }

  const fileName = pathSplit(path).pop() ?? "";
  if (ext && fileName.endsWith(ext) && fileName.length > ext.length) {
    return fileName.substring(0, fileName.length - ext.length);
  }
  return fileName;
};

/**
 * Return the extension of the path, from the last '.' to end of string in the last portion of the path.
 * If there is no '.' in the last portion of the path or the first character of it is '.', then it returns an empty string
 *
 * @param path the path to evaluate.
 */
export const extname = (path: string): string => {
  const fileName = pathSplit(path).pop() ?? "";
  const index = fileName.lastIndexOf(".");

  if (index === -1 || index === 0 || index === fileName.length - 1) {
    return "";
  }
  return fileName.substring(index);
};

/**
 * Returns an object from a path string - the opposite of format().
 *
 * @param path path to evaluate.
 */
export const parse = (path: string): ParsedPath => {
  const root = path.startsWith("/") ? "/" : "";
  const dir = dirname(path);
  const base = basename(path);
  const ext = extname(path);
  const name = basename(path, ext);

  return {
    root,
    dir,
    base,
    ext,
    name,
  };
};

/**
 * Returns a path string from an object - the opposite of parse().
 *
 * @param path path to evaluate.
 */
export const format = (path: FormatInputPathObject): string => {
  const dir = path.dir ?? path.root;
  const base = path.base ?? (path.name ?? "") + (path.ext ?? "");

  if (dir) {
    const joined = dir.endsWith("/") ? dir + base : dir + "/" + base;

    for (const prefix of ["./", "../", "/", "."]) {
      if (dir.startsWith(prefix)) {
        if (!joined.startsWith(prefix)) {
          return prefix + joined;
        }
      }
    }
    return joined;
  } else {
    return base;
  }
};

/**
 * Escapes characters in a path that are not safe to use.
 */
export const escape = (path: string) => encodeURI(path);

/**
 * This wrapper Class provides utilities for working with file and directory paths.
 * Compatible with node path.posix module.
 */
export class Path {
  private readonly _value: string;

  public constructor(path: string | Path) {
    this._value = typeof path === "string" ? path : path._value;
  }

  /**
   * Creates a copy of this Path object.
   */
  public copy(): Path {
    return new Path(this._value);
  }

  valueOf(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  /**
   * @internal
   */
  public toJSON(): string {
    return this._value;
  }

  [Symbol.toPrimitive](): string {
    return this._value;
  }

  [Symbol.toStringTag](): string {
    return this._value;
  }

  [Symbol.iterator](): IterableIterator<string> {
    return pathSplit(this._value)[Symbol.iterator]();
  }

  /**
   * Normalize a string path, reducing '..' and '.' parts.
   * When multiple slashes are found, they're replaced by a single one; when the path contains a trailing slash, it is preserved.
   *
   * @param path string path to normalize.
   */
  public normalize(): Path {
    return new Path(normalize(this._value));
  }

  /**
   * Join all arguments together and normalize the resulting path.
   * Arguments must be strings.
   *
   * @param paths paths to join.
   */
  public join(...other: Array<Path>): Path {
    return new Path(join(this._value, ...other.map((p) => p._value)));
  }

  /**
   * The right-most parameter is considered {to}.  Other parameters are considered an array of {from}.
   *
   * Starting from leftmost {from} parameter, resolves {to} to an absolute path.
   *
   * If {to} isn't already absolute, {from} arguments are prepended in right to left order,
   * until an absolute path is found. If after using all {from} paths still no absolute path is found,
   * the current working directory is used as well. The resulting path is normalized,
   * and trailing slashes are removed unless the path gets resolved to the root directory.
   *
   * @param pathSegments string paths to join.
   */
  public resolve(...other: Array<Path>): Path {
    return new Path(resolve(this._value, ...other.map((p) => p._value)));
  }

  /**
   * Determines whether {path} is an absolute path. An absolute path will always resolve to the same location, regardless of the working directory.
   *
   * @param path path to test.
   */
  public isAbsolute(): boolean {
    return isAbsolute(this._value);
  }

  /**
   * Solve the relative path from {from} to {to}.
   * At times we have two absolute paths, and we need to derive the relative path from one to the other. This is actually the reverse transform of path.resolve.
   */
  public relative(to: Path): Path {
    return new Path(relative(this._value, to._value));
  }

  /**
   * Return the directory name of a path. Similar to the Unix dirname command.
   *
   * @param path the path to evaluate.
   */
  public dirname(): Path {
    return new Path(dirname(this._value));
  }

  /**
   * Return the last portion of a path. Similar to the Unix basename command.
   * Often used to extract the file name from a fully qualified path.
   *
   * @param path the path to evaluate.
   * @param ext optionally, an extension to remove from the result.
   */
  public basename(ext?: string): string {
    return basename(this._value, ext);
  }

  /**
   * Return the extension of the path, from the last '.' to end of string in the last portion of the path.
   * If there is no '.' in the last portion of the path or the first character of it is '.', then it returns an empty string
   *
   * @param path the path to evaluate.
   */
  public extname(): string {
    return extname(this._value);
  }

  /**
   * The platform-specific file separator. '/'.
   */
  public readonly sep: "/" | "\\" = "/";

  /**
   * The platform-specific file delimiter. ':'.
   */
  public readonly delimiter: ":" = ":";

  /**
   * Returns an object from a path string - the opposite of format().
   *
   * @param path path to evaluate.
   */
  public parse(): ParsedPath {
    return parse(this._value);
  }

  /**
   * Returns a path string from an object - the opposite of parse().
   *
   * @param path path to evaluate.
   */
  public static fromParsedPath(path: Partial<ParsedPath>): Path {
    return new Path(format(path));
  }

  public toNamespacedPath(): string {
    return this._value;
  }

  /**
   * Escapes characters in a path that are not safe to use.
   */
  public escape(): Path {
    return new Path(escape(this._value));
  }
}
