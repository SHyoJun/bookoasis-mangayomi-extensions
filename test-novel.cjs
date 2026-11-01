const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const code = fs.readFileSync(__dirname+'/bookoasis-novel.js','utf8');
function make(handler){
 const calls=[];
 const prefs={bo_address:'https://books.example',bo_type:'general',bo_library:'all'};
 const context=vm.createContext({MProvider:class{get source(){return {baseUrl:'https://bookoasis.invalid'};}},SharedPreferences:class{get(k){return prefs[k];}},Client:class{
 async get(url,headers){calls.push({url,headers});return handler(url,headers);}
 }});
 vm.runInContext(code+';globalThis.ext=new DefaultExtension()',context);return {ext:context.ext,calls};
}
const json=(data)=>({statusCode:200,headers:{'content-type':'application/json'},body:JSON.stringify(data)});
const detail='/api/media/detail?type=general&library_id=all&series=test';
test('EPUB metadata creates all spine chapters including entries missing from TOC',async()=>{
 const {ext,calls}=make(url=>url.includes('/detail?')?json({meta:{},books:[{id:1,title:'Book',file_format:'epub'},{id:2,title:'Comic',file_format:'cbz'}]}):json({total_chapters:3,toc:[{title:'Opening',chapter_idx:0},{title:'Nested duplicate',chapter_idx:0},{title:'Bad link',chapter_idx:-1}]}));
 const d=await ext.getDetail(detail);assert.equal(d.chapters.length,3);assert.equal(d.chapters[2].name,'Book — Opening');assert.match(d.chapters[0].url,/chapter_idx=2/);assert.equal(calls.length,2);
});
test('TXT-only detail does not fetch text before opening',async()=>{
 const {ext,calls}=make(()=>json({books:[{id:2,title:'Text',file_format:'TXT'}]}));const d=await ext.getDetail(detail);assert.match(d.chapters[0].url,/\/txt\?/);assert.equal(calls.length,1);
});
test('TXT escapes markup and keeps Korean paragraphs/newlines',async()=>{
 const {ext}=make(()=>({statusCode:200,headers:{'Content-Type':'text/plain; charset=utf-8'},body:'\uFEFF한글 <script>alert(1)</script>\r\n다음 줄\r\n\r\n다음 문단'}));
 const html=await ext.getHtmlContent('x','/api/media/txt?db_type=general&book_id=2');assert.match(html,/&lt;script&gt;/);assert.match(html,/<br>/);assert.equal((html.match(/<p>/g)||[]).length,2);assert.ok(!html.includes('<script>'));
});
test('EPUB reads only requested chapter and strips active markup/resources',async()=>{
 const {ext,calls}=make(()=>json({content:'<p onclick="x()">본문 <em>강조</em></p><script>bad()</script><img src="https://example.org/a"><iframe>evil</iframe>'}));
 const html=await ext.getHtmlContent('x','/api/media/epub/chapter?db_type=general&book_id=1&chapter_idx=3');assert.equal(html,'<p>본문 <em>강조</em></p>');assert.equal(calls.length,1);
});
test('stripped nested markup cannot recombine into executable tags',()=>{
 const {ext}=make(()=>{});const result=ext.cleanHtmlContent('<scr<script>ipt>alert(1)</scr</script>ipt>');assert.ok(!/<script\b/i.test(result));
});
test('forbidden/HTML TXT responses are errors, not novel text',async()=>{
 for(const response of [{statusCode:403,body:'denied',headers:{}},{statusCode:200,body:'<html>Login</html>',headers:{'content-type':'text/html'}}]){
 const {ext}=make(()=>response);await assert.rejects(()=>ext.getHtmlContent('x','/api/media/txt?db_type=general&book_id=1'));
 }
});
test('external URLs and malformed chapter IDs never make requests',async()=>{
 const {ext,calls}=make(()=>{});
 for(const path of ['https://evil.example/api/media/txt?db_type=general&book_id=1','/api/media/epub/chapter?db_type=general&book_id=1&chapter_idx=-1','/api/media/txt?db_type=general&book_id=bad'])await assert.rejects(()=>ext.getHtmlContent('x',path));
 assert.equal(calls.length,0);
});
test('empty/invalid EPUB metadata fails visibly',async()=>{
 const {ext}=make(url=>url.includes('detail?')?json({books:[{id:1,title:'Book',file_format:'epub'}]}):json({total_chapters:0}));await assert.rejects(()=>ext.getDetail(detail),/목차/);
});
if(process.env.BOOKOASIS_REAL_META && process.env.BOOKOASIS_REAL_CHAPTER){
 test('real server EPUB parser output maps to Mangayomi chapters and readable HTML',async()=>{
 const m=JSON.parse(fs.readFileSync(process.env.BOOKOASIS_REAL_META,'utf8'));const c=JSON.parse(fs.readFileSync(process.env.BOOKOASIS_REAL_CHAPTER,'utf8'));
 assert.equal(m.error,null);assert.equal(c.error,null);
 const {ext}=make(url=>url.includes('/detail?')?json({books:[{id:1,title:'Real EPUB parser fixture',file_format:'epub'}]}):url.includes('/meta?')?json(m.meta):json(c.chapter));
 const d=await ext.getDetail(detail);assert.equal(d.chapters.length,m.meta.total_chapters);
 const html=await ext.getHtmlContent('x','/api/media/epub/chapter?db_type=general&book_id=1&chapter_idx=3');assert.ok(html.length>0);assert.ok(!/<(?:script|img|iframe)\b/i.test(html));
 console.log('Real EPUB:',d.chapters.length,'chapters; rendered chapter characters:',html.length);
 });
}
