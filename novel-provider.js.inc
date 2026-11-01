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
