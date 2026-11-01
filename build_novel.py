from pathlib import Path
import json, hashlib, re
root=Path(__file__).parent
base=(root/'bookoasis.js').read_text()
raw='https://raw.githubusercontent.com/SHyoJun/bookoasis-mangayomi-extensions/main/'
entry=json.loads((root/'index.json').read_text())[0].copy()
entry.update(name='BookOasis Novel',id=int(hashlib.sha256(b'SHyoJun.bookoasis.mangayomi.novel').hexdigest()[:7],16),itemType=2,isManga=False,version='0.1.1',sourceCodeUrl=raw+'bookoasis-novel.js',notes='EPUB chapters and UTF-8 TXT via BookOasis. Configure server and account. Text-first; embedded EPUB images and PDF are not supported.')
header='const mangayomiSources = '+json.dumps([entry],ensure_ascii=False,indent=2)+';'
base=re.sub(r'const mangayomiSources = \[.*?\];',lambda m:header,base,count=1,flags=re.S)
base=base.replace('class DefaultExtension extends MProvider','class BookOasisBase extends MProvider',1)
(root/'bookoasis-novel.js').write_text(base+'\n'+(root/'novel-provider.js.inc').read_text())
(root/'novel_index.json').write_text(json.dumps([entry],ensure_ascii=False,indent=2)+'\n')
print('Generated novel source and novel_index.json; source ID',entry['id'])
