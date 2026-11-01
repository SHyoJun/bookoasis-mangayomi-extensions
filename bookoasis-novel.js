// BookOasis for Mangayomi — 0.1.0
// Independent port of the API contract observed in Tachiyomi BookOasis 1.4.34.
// No third-party requests, scanning, progress writes or next-book preloading.
const mangayomiSources = [
  {
    "name": "BookOasis Novel",
    "id": 194159997,
    "baseUrl": "https://bookoasis.invalid",
    "lang": "all",
    "typeSource": "single",
    "iconUrl": "https://raw.githubusercontent.com/SHyoJun/bookoasis-mangayomi-extensions/main/icon.png",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://raw.githubusercontent.com/SHyoJun/bookoasis-mangayomi-extensions/main/bookoasis-novel.js",
    "apiUrl": "",
    "version": "0.1.1",
    "isManga": false,
    "itemType": 2,
    "isFullData": false,
    "appMinVerReq": "",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "notes": "EPUB chapters and UTF-8 TXT via BookOasis. Configure server and account. Text-first; embedded EPUB images and PDF are not supported."
  }
];

class BookOasisBase extends MProvider {
  get supportsLatest() { return true; }

  pref(key, fallback) {
    try {
      const value = new SharedPreferences().get(key);
      return value === null || value === undefined ? fallback : value;
    } catch (_) { return fallback; }
  }

  base() {
    let base = String(this.pref("bo_address", "") || this.source.baseUrl || "").trim().replace(/\/+$/, "");
    if (!base || base === "https://bookoasis.invalid") {
      throw new Error("확장 설정에서 BookOasis 서버 주소를 입력하세요. 외부 접속 포트도 포함해야 합니다.");
    }
    if (!/^https?:\/\/[^\s/?#@]+(?:\/[^\s?#]*)?$/i.test(base)) {
      throw new Error("서버 주소는 http(s)://호스트[:포트] 형식이어야 하며 계정 정보를 포함하면 안 됩니다.");
    }
    if (/^http:/i.test(base) && this.pref("bo_allow_http", false) !== true) {
      throw new Error("HTTP는 비밀번호와 책 내용을 암호화하지 않습니다. 신뢰하는 내부망인 경우에만 설정에서 HTTP를 허용하세요.");
    }
    return base;
  }

  dbType(value) {
    if (value !== "general" && value !== "adult") throw new Error("지원하지 않는 라이브러리 종류입니다.");
    return value;
  }

  types() {
    const value = String(this.pref("bo_type", "general"));
    return value === "both" ? ["general", "adult"] : [this.dbType(value)];
  }

  query(values) {
    return Object.keys(values).map(k => encodeURIComponent(k) + "=" + encodeURIComponent(String(values[k]))).join("&");
  }

  param(path, key) {
    const query = String(path).split("?")[1] || "";
    for (const piece of query.split("&")) {
      const at = piece.indexOf("=");
      if (at >= 0 && decodeURIComponent(piece.slice(0, at)) === key) {
        return decodeURIComponent(piece.slice(at + 1).replace(/\+/g, " "));
      }
    }
    return "";
  }

  relative(path, pattern) {
    const base = this.base();
    path = String(path || "");
    if (path.startsWith(base + "/")) path = path.slice(base.length);
    if (!pattern.test(path) || path.includes("#") || /[\r\n]/.test(path)) {
      throw new Error("잘못된 BookOasis 링크입니다. 다른 서버로 인증 정보를 보내지 않습니다.");
    }
    return path;
  }

  // This is synchronous: Mangayomi calls it while installing the source.
  getHeaders(url) {
    let base;
    try { base = this.base(); } catch (_) { return {}; }
    if (url && String(url) !== base && !String(url).startsWith(base + "/")) return {};
    const headers = { "User-Agent": "BookOasis-Mangayomi/0.1.0", "Referer": base + "/" };
    if (this._cookie && this._sessionBase === base) headers.Cookie = this._cookie;
    return headers;
  }

  client() {
    return new Client({ followRedirects: false, verifyCertificates: true, timeout: 60, connectTimeout: 15 });
  }

  rememberCookie(response) {
    const headers = response.headers || {};
    let value = "";
    for (const key of Object.keys(headers)) if (key.toLowerCase() === "set-cookie") value = headers[key];
    if (Array.isArray(value)) value = value.join(", ");
    // Only Flask's session cookie; never store passwords or tokens in URLs.
    const match = String(value).match(/(?:^|,\s*)session=([^;,\r\n]*)/i);
    if (match && match[1]) {
      this._cookie = "session=" + match[1];
      this._sessionBase = this.base();
    }
  }

  parse(response) {
    let data;
    try { data = JSON.parse(response.body); } catch (_) {
      throw new Error("BookOasis JSON 대신 다른 응답을 받았습니다. 서버 주소·포트와 프록시 설정을 확인하세요.");
    }
    const code = Number(response.statusCode);
    if (code === 403) throw new Error("접근 권한이 없습니다. 계정 권한 또는 기본 비밀번호 변경 필요 여부를 확인하세요.");
    if (code === 401) throw new Error("로그인이 필요합니다. BookOasis 계정 설정을 확인하세요.");
    if (code < 200 || code >= 300 || data.success === false) {
      // Do not echo arbitrary response text (could include credentials/server internals).
      throw new Error("BookOasis 요청 실패 (HTTP " + code + "). 서버 로그와 책 파일 연결 상태를 확인하세요.");
    }
    return data;
  }

  async login() {
    const username = String(this.pref("bo_username", "")).trim();
    const password = String(this.pref("bo_password", ""));
    if (!username || !password) {
      throw new Error("확장 설정에 BookOasis 아이디·비밀번호를 입력하거나 Mangayomi 웹뷰에서 이 서버에 로그인하세요.");
    }
    const base = this.base();
    this._cookie = "";
    this._sessionBase = base;
    const response = await this.client().post(base + "/login", {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "BookOasis-Mangayomi/0.1.0", "Referer": base + "/login"
    }, { username: username, password: password, remember_me: "on" });
    const data = this.parse(response);
    if (data.success !== true) throw new Error("로그인 결과를 확인할 수 없습니다.");
    if (Number(data.is_default_password) === 1) throw new Error("웹에서 기본 비밀번호를 변경한 뒤 다시 시도하세요.");
    this.rememberCookie(response);
    if (!this._cookie) throw new Error("로그인 세션 쿠키가 없습니다. 서버/프록시가 Set-Cookie를 전달하는지 확인하세요.");
  }

  async json(path) {
    const base = this.base();
    if (!path.startsWith("/api/media/") || path.startsWith("//")) throw new Error("지원하지 않는 API 경로입니다.");
    if (this._sessionBase !== base) this._cookie = "";
    let response = await this.client().get(base + path, this.getHeaders(base + path));
    if (Number(response.statusCode) === 401 || [301,302,303,307,308].includes(Number(response.statusCode))) {
      if (!this._loginPromise) this._loginPromise = this.login();
      try { await this._loginPromise; } finally { this._loginPromise = null; }
      response = await this.client().get(base + path, this.getHeaders(base + path));
    }
    this.rememberCookie(response);
    return this.parse(response);
  }

  cover(value) {
    if (!value) return "";
    let path = String(value);
    if (/^https?:\/\//i.test(path)) return path.startsWith(this.base() + "/") ? path : "";
    path = path.replace(/^\/?covers\//, "");
    if (path.startsWith("/") || path.split("/").some(p => p === ".." || p === ".")) return "";
    return this.base() + "/covers/" + path.split("/").map(p => encodeURIComponent(p)).join("/");
  }

  libraryId() {
    const id = String(this.pref("bo_library", "all") || "all").trim();
    if (id !== "all" && !/^\d+$/.test(id)) throw new Error("라이브러리 ID는 all 또는 숫자로 입력하세요.");
    if (id !== "all" && this.types().length > 1) throw new Error("특정 라이브러리 ID를 사용할 때는 종류를 일반 또는 성인 하나로 선택하세요.");
    return id;
  }

  async list(page, search, sort) {
    if (!Number.isInteger(Number(page)) || Number(page) < 1) throw new Error("잘못된 페이지 번호입니다.");
    const library = this.libraryId();
    const result = { list: [], hasNextPage: false };
    // Sequential requests: no background library scan or unbounded parallel I/O.
    for (const type of this.types()) {
      const data = await this.json("/api/media/list?" + this.query({
        type: type, library_id: library, page: page, limit: 30, sort: sort, search: search || ""
      }));
      if (!Array.isArray(data.series)) throw new Error("BookOasis 목록 응답에 series 배열이 없습니다.");
      for (const item of data.series) {
        if (!item.series_name) continue;
        result.list.push({
          name: String(item.series_name), imageUrl: this.cover(item.cover_image),
          link: "/api/media/detail?" + this.query({ type: type, library_id: library, series: item.series_name })
        });
      }
      result.hasNextPage = result.hasNextPage || data.has_more === true;
    }
    return result;
  }

  async getPopular(page) { return this.list(page, "", "asc"); }
  async getLatestUpdates(page) { return this.list(page, "", "desc"); }
  async search(query, page, filters) {
    let sort = "asc";
    const selected = (filters || []).find(x => x.type === "bo_sort");
    if (selected && selected.values && selected.values[selected.state]) {
      sort = selected.values[selected.state].value === "desc" ? "desc" : "asc";
    }
    return this.list(page, query, sort);
  }

  async getDetail(url) {
    const path = this.relative(url, /^\/api\/media\/detail\?/);
    const type = this.dbType(this.param(path, "type"));
    const data = await this.json(path);
    if (!Array.isArray(data.books)) throw new Error("BookOasis 상세 응답에 books 배열이 없습니다.");
    const meta = data.meta || {};
    const books = data.books.filter(b => /^(zip|cbz)$/i.test(String(b.file_format || "")));
    const chapters = books.map(b => {
      if (!/^\d+$/.test(String(b.id))) throw new Error("잘못된 책 ID입니다.");
      return {
        name: String(b.title || "Book " + b.id),
        url: "/api/media/books/" + b.id + "/info?" + this.query({type: type}),
        scanlator: "BookOasis"
      };
    }).reverse();
    let description = String(meta.summary || "");
    if (!chapters.length) description += "\n\n[이 시리즈에 ZIP/CBZ 이미지 책이 없습니다. EPUB/PDF/TXT는 이 확장에서 지원하지 않습니다.]";
    return {
      name: this.param(path, "series"), link: path, imageUrl: this.cover(meta.cover_image),
      description: description.trim(), author: meta.author === "-" ? "" : String(meta.author || ""),
      artist: meta.author === "-" ? "" : String(meta.author || ""), status: 5,
      genre: [meta.genre, meta.tags].filter(Boolean).join(",").split(/[,，]/).map(s => s.trim()).filter(Boolean),
      chapters: chapters
    };
  }

  async getPageList(url) {
    const path = this.relative(url, /^\/api\/media\/books\/\d+\/info\?/);
    const id = path.match(/^\/api\/media\/books\/(\d+)\/info\?/)[1];
    const type = this.dbType(this.param(path, "type"));
    const data = await this.json(path);
    const total = Number(data.total_pages);
    if (!Number.isInteger(total) || total < 1 || total > 50000) {
      throw new Error("페이지 수를 확인할 수 없습니다. 서버에서 해당 책의 스캔/오프셋 상태를 확인하세요. 자동 재스캔은 하지 않습니다.");
    }
    const pages = [];
    for (let i = 0; i < total; i++) {
      const page = this.base() + "/api/media/stream?" + this.query({ db_type: type, book_id: id, page_idx: i });
      pages.push({ url: page, headers: this.getHeaders(page) });
    }
    return pages;
  }

  getFilterList() {
    return [{type_name: "SelectFilter", type: "bo_sort", name: "정렬", state: 0, values: [
      {type_name: "SelectOption", name: "이름순 (서버 asc)", value: "asc"},
      {type_name: "SelectOption", name: "역순 (서버 desc)", value: "desc"}
    ]}];
  }

  getSourcePreferences() {
    const text = (key, title, summary, value) => ({ key: key, editTextPreference: {
      title: title, summary: summary, value: value, dialogTitle: title, dialogMessage: summary
    }});
    return [
      text("bo_address", "서버 주소", "예: https://서버:18443 — 끝의 / 제외. BookOasis 주소를 입력하세요.", ""),
      text("bo_username", "아이디", "BookOasis 로그인 아이디. 웹뷰 로그인 사용 시 비워 둘 수 있습니다.", ""),
      text("bo_password", "비밀번호", "앱 설정/백업에 저장될 수 있습니다. 화면 공유에 주의하세요. 별도 일반 계정을 권장합니다.", ""),
      { key: "bo_type", listPreference: {title: "라이브러리 종류", summary: "접근 권한은 서버가 검사합니다. 둘 다는 종류별 30개씩 표시합니다.", valueIndex: 0,
        entries: ["일반", "성인 (계정 권한 필요)", "둘 다"], entryValues: ["general", "adult", "both"]}},
      text("bo_library", "라이브러리 ID", "전체는 all. 특정 라이브러리는 BookOasis의 숫자 ID를 입력하세요.", "all"),
      {key: "bo_allow_http", switchPreferenceCompat: {title: "암호화되지 않은 HTTP 허용", summary: "신뢰하는 내부망에서만 사용하세요. 기본값은 HTTPS만 허용입니다.", value: false}}
    ];
  }
}

// Novel-only implementation; combined with the shared BookOasis provider at build time.
class DefaultExtension extends BookOasisBase {
  escape(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  cleanHtmlContent(html) {
    // Text-first reader: no scripts, embedded frames, external resources or credentials in URLs.
    let text = String(html || "").replace(/\r\n?|\n|\\r\\n|\\r|\\n/g, " ").replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style|iframe|object|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
    const allowed = /^(p|br|div|h[1-6]|em|strong|b|i|u|s|blockquote|ul|ol|li|hr|sup|sub|ruby|rt|rp)$/i;
    return (text.match(/<[^>]*>|[^<]+|</g) || []).map(token => {
      if (token.startsWith("<")) {
        const tag = token.match(/^<(\/?)([a-z][a-z0-9]*)\b[^>]*>$/i);
        if (!tag || !allowed.test(tag[2])) return "";
        return "<" + tag[1] + tag[2].toLowerCase() + ">";
      }
      // Preserve existing entities, but never allow stripped markup to recombine into tags.
      return token.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }).join("");
  }

  async getDetail(url) {
    const path = this.relative(url, /^\/api\/media\/detail\?/);
    const type = this.dbType(this.param(path, "type"));
    const data = await this.json(path);
    if (!Array.isArray(data.books)) throw new Error("BookOasis 상세 응답에 books 배열이 없습니다.");
    const meta = data.meta || {};
    const books = data.books.filter(b => /^(epub|txt)$/i.test(String(b.file_format || "")));
    const chapters = [];
    for (const book of books) {
      const id = String(book.id);
      if (!/^\d+$/.test(id)) throw new Error("잘못된 책 ID입니다.");
      const params = {db_type: type, book_id: id};
      const title = String(book.title || "Book " + id);
      if (String(book.file_format).toLowerCase() === "txt") {
        chapters.push({name: title + " [TXT]", url: "/api/media/txt?" + this.query(params), scanlator: "BookOasis"});
      } else {
        chapters.push({name: title + " [EPUB]", url: "/api/media/epub?" + this.query(params), scanlator: "BookOasis"});
      }
    }
    let description = String(meta.summary || "");
    if (!chapters.length) description += "\n\n[이 시리즈에는 EPUB/TXT 책이 없습니다. 만화는 BookOasis 만화 소스를 사용하세요.]";
    return {name: this.param(path, "series"), link: path, imageUrl: this.cover(meta.cover_image),
      author: meta.author === "-" ? "" : String(meta.author || ""),
      artist: "", description: description.trim(), status: 5,
      genre: [meta.genre, meta.tags].filter(Boolean).join(",").split(/[,，]/).map(x => x.trim()).filter(Boolean),
      chapters: chapters.reverse()};
  }

  async txt(path) {
    const base = this.base();
    if (this._sessionBase !== base) this._cookie = "";
    let response = await this.client().get(base + path, this.getHeaders(base + path));
    if ([401,301,302,303,307,308].includes(Number(response.statusCode))) {
      await this.login();
      response = await this.client().get(base + path, this.getHeaders(base + path));
    }
    this.rememberCookie(response);
    const status = Number(response.statusCode);
    if (status < 200 || status >= 300) {
      throw new Error("TXT 읽기 실패 (HTTP " + status + "). 계정 권한과 서버 파일 연결을 확인하세요.");
    }
    const headers = response.headers || {};
    const key = Object.keys(headers).find(k => k.toLowerCase() === "content-type");
    if (!key || !/^text\/plain(?:\s*;|$)/i.test(String(headers[key]))) throw new Error("TXT 대신 다른 응답을 받았습니다. 서버 버전과 로그인 상태를 확인하세요.");
    return String(response.body || "");
  }

  async getHtmlContent(name, url) {
    const path = this.relative(url, /^\/api\/media\/(?:txt|epub(?:\/chapter)?)\?/);
    this.dbType(this.param(path, "db_type"));
    if (!/^\d+$/.test(this.param(path, "book_id"))) throw new Error("잘못된 책 ID입니다.");
    if (path.startsWith("/api/media/txt?")) {
      const body = (await this.txt(path)).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
      // BookOasis performs CP949/EUC-KR conversion; never interpret TXT as markup.
      return body.split(/\n\s*\n/).map(p => "<p>" + this.escape(p).replace(/\n/g, "<br>") + "</p>").join("\n");
    }
    if (path.startsWith("/api/media/epub?")) {
      const query = this.query({db_type: this.param(path, "db_type"), book_id: this.param(path, "book_id")});
      const meta = await this.json("/api/media/epub/meta?" + query);
      const count = Number(meta.total_chapters);
      if (!Number.isInteger(count) || count < 1 || count > 50000) throw new Error("EPUB 목차를 읽을 수 없습니다.");
      // Fetch sequentially: do not overload the server or silently skip failed spine entries.
      const parts = [];
      for (let idx = 0; idx < count; idx++) {
        const chapter = await this.json("/api/media/epub/chapter?" + query + "&chapter_idx=" + idx);
        if (typeof chapter.content !== "string") throw new Error("EPUB " + (idx + 1) + "장 본문 누락. 다시 시도하세요.");
        parts.push(this.cleanHtmlContent(chapter.content));
      }
      return parts.join("<hr>");
    }
    if (!/^\d+$/.test(this.param(path, "chapter_idx"))) throw new Error("잘못된 EPUB 장 번호입니다.");
    const data = await this.json(path);
    if (typeof data.content !== "string") throw new Error("EPUB 응답에 본문이 없습니다.");
    return this.cleanHtmlContent(data.content);
  }

  async getPageList() { throw new Error("소설은 Mangayomi 소설 리더에서 열어 주세요."); }
}
