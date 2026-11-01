# BookOasis for Mangayomi

사용자가 운영하는 BookOasis 서버에 연결하는 비공식 Mangayomi JavaScript 확장입니다.

## 저장소 URL

Mangayomi의 **만화 확장 저장소**에 다음 URL을 추가하세요.

```
https://raw.githubusercontent.com/SHyoJun/bookoasis-mangayomi-extensions/main/index.json
```

확장 목록을 새로고침한 뒤 언어 `all`의 **BookOasis**를 설치합니다.
확장 설정에서 서버 주소(HTTPS, 필요하면 포트 포함), BookOasis 아이디와 비밀번호를 입력하세요.
일반/성인/둘 다 및 라이브러리 ID(all 또는 숫자)를 선택할 수 있습니다.

- `bookoasis.invalid`는 미설정 표시값이며 실제 서버가 아닙니다.
- 내부망 HTTP는 별도 허용 설정을 켜야 합니다. 공용망에서는 사용하지 마세요.
- 아이디/비밀번호는 공개 저장소에 넣지 마세요. 앱 설정/백업과 화면 공유에도 주의하세요.
- 서버 계정 권한을 우회하지 않습니다.

## 소설 확장 (EPUB / TXT)

Mangayomi의 **소설 확장 저장소**에는 아래 URL을 별도로 추가하세요.

```
https://raw.githubusercontent.com/SHyoJun/bookoasis-mangayomi-extensions/main/novel_index.json
```

목록을 새로고침하고 **BookOasis Novel**(언어 all)을 설치한 뒤, 이 확장에도 서버 주소와 계정을 설정합니다. 만화 확장의 설정은 자동으로 공유되지 않습니다.

- EPUB (v0.1.1): 한 권을 하나의 읽기 항목으로 표시합니다. 열 때 spine 순서대로 모든 장을 순차 조회하여 한 본문으로 연결합니다. 장 로딩 실패 시 불완전한 책을 표시하지 않고 오류를 알립니다. 큰 책은 첫 로딩이 오래 걸릴 수 있습니다.
- TXT: BookOasis 서버에서 UTF-8로 변환한 본문을 가져와 문단/줄바꿈을 표시합니다. TXT 한 권은 한 항목이며 본문 전체를 가져옵니다.
- EPUB 본문은 텍스트 중심으로 표시합니다. 삽화·외부 리소스·복잡한 CSS·스크립트는 제외합니다.
- PDF는 아직 지원하지 않습니다.
- 시리즈 상세에서는 본문이나 EPUB 메타데이터를 미리 받지 않습니다. 선택한 권만 열 때 불러옵니다.
- v0.1.0에서 업데이트한 경우 책 상세의 목록을 새로고침하고 `[EPUB]` 항목을 여세요. 기존 장별 항목과 다운로드는 자동으로 합쳐지지 않으며, 기존 읽기 위치도 새 항목으로 자동 이전되지 않습니다.
- 공통 목록 API를 사용하므로 만화 시리즈도 목록에 보일 수 있습니다. EPUB/TXT가 없는 시리즈는 읽을 항목이 없다는 안내를 표시합니다. 필요하면 소설 라이브러리 ID를 설정하세요.

## 지원 범위

기존 BookOasis 만화 소스는 ZIP/CBZ를 그대로 지원하고, BookOasis Novel 소스는 EPUB/TXT를 지원합니다.
시리즈 목록, 이름 검색, 페이지네이션, 표지/작가/설명을 제공합니다.
서버 독서 진행률 동기화, 다음 권 미리읽기 및 자동 재스캔은 하지 않습니다.

## 검증 상태

JavaScript 구문 검사와 합성 데이터를 사용하는 계약 테스트 20개를 통과했습니다.
실제 BookOasis 서버의 비인증 HTTP 401 처리도 확인했습니다.
실제 계정으로 로그인 후 이미지 열람과 Mangayomi 실기기 설치/실행은 아직 미검증입니다.
앱 버전에 따라 설치 호환성을 추가 확인해야 합니다.

## 참고

- https://github.com/kodjodevf/mangayomi
- https://github.com/kodjodevf/mangayomi-extensions
- 사용자 제공 Tachiyomi BookOasis 1.4.34 APK의 API 계약을 조사하여 독립적으로 작성했습니다.
- APK, 서버 계정, 개인 서버 주소, 도서 콘텐츠는 이 저장소에 포함하지 않습니다.
